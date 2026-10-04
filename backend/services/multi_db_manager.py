"""
Centralized Multi-Database Connection Manager
--------------------------------------------
Orchestrates connections across:
- DB1: Main Owner Database (Platform governance & central registry)
- DB2: Seller A Database (Independent isolated Neon PostgreSQL database)
- DB3, DB4, DB5... DBn: Future seller databases

Features:
- Dynamic connection resolution (env variables, secret references, encrypted connection strings)
- Managed connection pools (pool_pre_ping, recycle, max pool size per DB)
- Explicit failure boundaries (NO silent fallback to DB1)
- Reusable schema initialization & verification
"""

import os
import logging
from typing import Dict, Optional, Tuple, List
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.engine import Engine

from backend.config import Config, OWNER_DATABASE_URL, get_seller_database_url_from_env
from backend.utils.security import encrypt, decrypt
from backend.models.seller_schema import apply_seller_schema, SELLER_SCHEMA_VERSION

logger = logging.getLogger(__name__)


class DatabaseNotConfiguredError(Exception):
    """Raised when an operation targets a seller database that lacks connection credentials."""
    pass


class DatabaseConnectionError(Exception):
    """Raised when an isolated database is unreachable or fails connectivity check."""
    pass


class MultiDatabaseManager:
    _instance = None
    _engines: Dict[str, Engine] = {}
    _session_factories: Dict[str, sessionmaker] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MultiDatabaseManager, cls).__new__(cls)
            cls._instance._engines = {}
            cls._instance._session_factories = {}
        return cls._instance

    def _normalize_uri(self, uri: str) -> str:
        if not uri:
            return uri
        clean = str(uri).strip().strip("'\"")
        if clean.startswith("psql "):
            clean = clean[5:].strip().strip("'\"")
        if clean.startswith("postgres://"):
            clean = "postgresql+psycopg2://" + clean[11:]
        elif clean.startswith("postgresql://"):
            clean = "postgresql+psycopg2://" + clean[13:]
        return clean

    def get_connection_url(self, database_id: str) -> Optional[str]:
        """
        Dynamically resolve connection URL for any database identifier (DB1, DB2, DB3...).
        DB1 always points to Main Owner database.
        Seller databases (DB2+) look up:
        1. Environment variable (e.g. SELLER_DATABASE_URL_2, SELLER_DATABASE_URL_3)
        2. Database registry in DB1 (connection_secret_reference or encrypted_connection_url)
        Returns None if not configured. Never falls back to DB1.
        """
        db_id = str(database_id or "DB1").strip().upper()

        # DB1 is the Main Owner Database
        if db_id in ("DB1", "OWNER", "MAIN", "DEFAULT"):
            return self._normalize_uri(OWNER_DATABASE_URL or Config.SQLALCHEMY_DATABASE_URI)

        # 1. Check environment variable first
        env_url = get_seller_database_url_from_env(db_id)
        if env_url:
            return self._normalize_uri(env_url)

        # 2. Check SellerDatabaseRegistry in DB1
        try:
            from backend.models.database_registry import SellerDatabaseRegistry
            record = SellerDatabaseRegistry.query.filter_by(database_id=db_id).first()
            if record:
                if record.connection_secret_reference:
                    ref_url = os.environ.get(record.connection_secret_reference)
                    if ref_url and str(ref_url).strip():
                        return self._normalize_uri(ref_url)
                if record.encrypted_connection_url:
                    decrypted = decrypt(record.encrypted_connection_url)
                    if decrypted:
                        decrypted_clean = str(decrypted).strip()
                        if decrypted_clean.startswith("postgresql://") or decrypted_clean.startswith("postgres://") or decrypted_clean.startswith("sqlite://"):
                            return self._normalize_uri(decrypted_clean)
        except Exception as e:
            logger.warning("Error querying SellerDatabaseRegistry for %s: %s", db_id, e)

        return None

    def get_engine(self, database_id: str) -> Engine:
        """
        Retrieve or initialize a connection-pooled SQLAlchemy engine for the given database.
        """
        db_id = str(database_id or "DB1").strip().upper()

        if db_id in self._engines:
            return self._engines[db_id]

        conn_url = self.get_connection_url(db_id)
        if not conn_url:
            raise DatabaseNotConfiguredError(
                f"Database '{db_id}' is not configured with connection credentials. "
                f"Please set SELLER_DATABASE_URL_{db_id.replace('DB', '')} or configure it in DB1 registry."
            )

        # Build connection-pooled engine with safe enterprise limits
        is_sqlite = conn_url.startswith("sqlite")
        engine_args = {
            "pool_pre_ping": True,
            "echo": Config.IS_DEV and db_id == "DB1",
        }
        if not is_sqlite:
            engine_args.update({
                "pool_size": 5,
                "max_overflow": 2,
                "pool_recycle": 280,
                "pool_timeout": 15,
            })

        try:
            engine = create_engine(conn_url, **engine_args)
            self._engines[db_id] = engine
            self._session_factories[db_id] = sessionmaker(bind=engine, autoflush=False, autocommit=False)
            return engine
        except Exception as e:
            logger.error("Failed to initialize engine for %s: %s", db_id, e)
            raise DatabaseConnectionError(f"Failed to create connection pool for {db_id}: {str(e)}")

    def get_session(self, database_id: str):
        """
        Returns a scoped or standalone SQLAlchemy session for a specific database.
        """
        db_id = str(database_id or "DB1").strip().upper()
        if db_id not in self._session_factories:
            self.get_engine(db_id)
        return self._session_factories[db_id]()

    def test_connection(self, database_id: str) -> Tuple[bool, str]:
        """
        Verify database connectivity with a live ping (SELECT 1).
        Does NOT fall back to DB1 if DB2 fails.
        """
        db_id = str(database_id or "DB1").strip().upper()
        conn_url = self.get_connection_url(db_id)
        if not conn_url:
            return False, "Not Configured (Missing connection credentials)"

        try:
            engine = self.get_engine(db_id)
            with engine.connect() as conn:
                res = conn.execute(text("SELECT 1")).scalar()
                if res == 1:
                    return True, "Connected (Liveness ping succeeded)"
                return False, f"Unexpected response: {res}"
        except DatabaseNotConfiguredError as ne:
            return False, str(ne)
        except Exception as e:
            # Mask sensitive parts of error
            err_msg = str(e)
            if "@" in err_msg:
                # Mask credentials
                err_msg = err_msg.split("@")[-1]
            return False, f"Connection Failed: {err_msg}"

    def verify_and_update_status(self, database_id: str) -> dict:
        """
        Verifies connectivity and updates the database registry record in DB1.
        """
        db_id = str(database_id or "DB1").strip().upper()
        success, message = self.test_connection(db_id)

        status_str = "connected" if success else ("not_configured" if "Not Configured" in message else "unreachable")

        if db_id != "DB1":
            try:
                from backend.models.database_registry import SellerDatabaseRegistry
                from backend.extensions import db as main_db
                record = SellerDatabaseRegistry.query.filter_by(database_id=db_id).first()
                if record:
                    record.connection_status = status_str
                    record.last_verified_at = datetime.utcnow()
                    main_db.session.commit()
            except Exception as ex:
                logger.warning("Could not persist verification status to DB1: %s", ex)

        return {
            "database_id": db_id,
            "connected": success,
            "connection_status": status_str,
            "message": message,
            "verified_at": datetime.utcnow().isoformat()
        }

    def initialize_seller_schema(self, database_id: str) -> Tuple[bool, str]:
        """
        Executes idempotent non-destructive migrations to initialize seller tables on a seller database.
        """
        db_id = str(database_id).strip().upper()
        if db_id == "DB1":
            return False, "Cannot apply seller schema to DB1 (Main Owner database)."

        conn_url = self.get_connection_url(db_id)
        if not conn_url:
            return False, f"Cannot initialize schema: Database '{db_id}' is not configured."

        try:
            engine = self.get_engine(db_id)
            success, msg = apply_seller_schema(engine)

            if success:
                # Update registry in DB1
                try:
                    from backend.models.database_registry import SellerDatabaseRegistry
                    from backend.extensions import db as main_db
                    record = SellerDatabaseRegistry.query.filter_by(database_id=db_id).first()
                    if record:
                        record.schema_version = SELLER_SCHEMA_VERSION
                        record.provisioning_status = "ready"
                        record.connection_status = "connected"
                        record.last_verified_at = datetime.utcnow()
                        main_db.session.commit()
                except Exception as db_err:
                    logger.warning("Failed to record schema status in DB1: %s", db_err)

            return success, msg
        except Exception as e:
            return False, f"Migration failed on {db_id}: {str(e)}"

    def get_seller_database_id(self, seller_id: int) -> Optional[str]:
        """
        Finds which database ID (e.g. DB2, DB3) is assigned to a seller.
        """
        try:
            from flask import has_app_context
            if not has_app_context():
                from backend.app import app
                with app.app_context():
                    from backend.models.database_registry import SellerDatabaseRegistry
                    record = SellerDatabaseRegistry.query.filter_by(seller_id=int(seller_id)).first()
                    if record:
                        return record.database_id
                    return None

            from backend.models.database_registry import SellerDatabaseRegistry
            record = SellerDatabaseRegistry.query.filter_by(seller_id=int(seller_id)).first()
            if record:
                return record.database_id
        except Exception as e:
            logger.warning("Error fetching database_id for seller %s: %s", seller_id, e)
        return None

    def get_next_database_id(self) -> str:
        """
        Calculates the next available logical database identifier (e.g. DB2, DB3, DB4...)
        """
        from backend.models.database_registry import SellerDatabaseRegistry
        all_registries = SellerDatabaseRegistry.query.all()
        max_num = 1  # DB1 is owner
        for r in all_registries:
            did = str(r.database_id).upper().replace("DB", "")
            if did.isdigit() and int(did) > max_num:
                max_num = int(did)
        return f"DB{max_num + 1}"

    def register_seller(self, seller_id: int, seller_email: str = None, provider: str = "neon", custom_database_id: str = None, notes: str = None, database_id: str = None, connection_url: str = None, provisioning_status: str = None, database_provider: str = None) -> dict:
        """
        Registers a seller in DB1's database registry with the next logical database ID (DB2, DB3, etc.)
        """
        from backend.models.database_registry import SellerDatabaseRegistry
        from backend.extensions import db as main_db

        existing = SellerDatabaseRegistry.query.filter_by(seller_id=int(seller_id)).first()
        if existing:
            if connection_url:
                existing.encrypted_connection_url = encrypt(connection_url)
                if provisioning_status:
                    existing.provisioning_status = provisioning_status
                main_db.session.commit()
                self._engines.pop(existing.database_id, None)
                self._session_factories.pop(existing.database_id, None)
            return existing.to_dict()

        target_db_id = database_id or custom_database_id
        if target_db_id:
            assigned_id = str(target_db_id).strip().upper()
        else:
            assigned_id = self.get_next_database_id()

        target_provider = database_provider or provider or "neon"
        secret_ref = f"SELLER_DATABASE_URL_{assigned_id.replace('DB', '')}"
        
        # Check if environment already defines this URL
        env_url = os.environ.get(secret_ref)
        initial_status = "connected" if (env_url or connection_url) else "not_configured"
        prov_status = provisioning_status or ("ready" if (env_url or connection_url) else "pending_configuration")

        enc_url = encrypt(connection_url) if connection_url else None

        registry_entry = SellerDatabaseRegistry(
            seller_id=int(seller_id),
            database_id=assigned_id,
            database_provider=target_provider,
            connection_secret_reference=secret_ref if not enc_url else None,
            encrypted_connection_url=enc_url,
            connection_status=initial_status,
            provisioning_status=prov_status,
            schema_version="1.0.0" if (env_url or connection_url) else "pending"
        )
        main_db.session.add(registry_entry)
        main_db.session.commit()

        # If connection URL is available, test it
        if env_url or connection_url:
            self.verify_and_update_status(assigned_id)

        return registry_entry.to_dict()

    def configure_seller_database(self, database_id: str, connection_url: str, secret_reference: str = None) -> Tuple[bool, str]:
        """
        Configures connection string for a seller database, encrypts it, and verifies connectivity.
        """
        db_id = str(database_id).strip().upper()
        if db_id == "DB1":
            return False, "Cannot modify DB1 connection string through seller configuration API."

        clean_url = self._normalize_uri(connection_url)
        if not clean_url:
            return False, "Connection URL cannot be empty."

        # Safety Check First: Prevent reusing DB1 credentials for any seller database
        if clean_url == OWNER_DATABASE_URL or clean_url == Config.SQLALCHEMY_DATABASE_URI:
            return False, "Security Error: Cannot assign Main Owner (DB1) connection string to a seller database."

        from backend.models.database_registry import SellerDatabaseRegistry
        from backend.extensions import db as main_db

        record = SellerDatabaseRegistry.query.filter_by(database_id=db_id).first()
        if not record:
            return False, f"Database registry record for '{db_id}' not found."

        # Encrypt connection URL before storing
        record.encrypted_connection_url = encrypt(clean_url)
        if secret_reference:
            record.connection_secret_reference = secret_reference

        # Invalidate any cached engine so new URL is picked up
        if db_id in self._engines:
            try:
                self._engines[db_id].dispose()
            except Exception:
                pass
            del self._engines[db_id]
        if db_id in self._session_factories:
            del self._session_factories[db_id]

        main_db.session.commit()

        # Immediately test connectivity
        success, msg = self.test_connection(db_id)
        record.connection_status = "connected" if success else "unreachable"
        record.last_verified_at = datetime.utcnow()
        main_db.session.commit()

        if success:
            # Auto-initialize schema if not yet ready
            if record.provisioning_status != "ready":
                self.initialize_seller_schema(db_id)

        return success, f"Configuration saved. {msg}"

    def list_all_databases(self) -> List[dict]:
        """
        Returns full list of all databases in the system:
        - DB1: Main Owner Database
        - DB2: Seller A Database
        - DB3+: Future Seller Databases
        Never exposes database passwords or complete connection strings.
        """
        results = []

        # 1. DB1 - Main Owner Database
        db1_status, _ = self.test_connection("DB1")
        results.append({
            "database_id": "DB1",
            "purpose": "Main Owner Platform Database",
            "assigned_to": "Main Owner (Platform Superadmin)",
            "seller_id": None,
            "provider": "neon" if (OWNER_DATABASE_URL and "neon.tech" in OWNER_DATABASE_URL) else "sqlite",
            "connection_status": "connected" if db1_status else "unreachable",
            "schema_status": "active",
            "schema_version": "1.0.0",
            "is_configured": True,
            "is_owner_database": True,
            "secret_reference": "OWNER_DATABASE_URL",
            "last_verified_at": datetime.utcnow().isoformat()
        })

        # 2. Registered Seller Databases from DB1
        try:
            from backend.models.database_registry import SellerDatabaseRegistry
            seller_dbs = SellerDatabaseRegistry.query.order_by(SellerDatabaseRegistry.database_id.asc()).all()

            # Ensure DB2 is present in the list even if no seller has registered yet
            has_db2 = any(r.database_id == "DB2" for r in seller_dbs)
            if not has_db2:
                # Add DB2 virtual placeholder
                db2_env = get_seller_database_url_from_env("DB2")
                results.append({
                    "database_id": "DB2",
                    "purpose": "Seller A Database (First Artisan Workshop)",
                    "assigned_to": "Pending Seller Assignment",
                    "seller_id": None,
                    "provider": "neon",
                    "connection_status": "connected" if db2_env else "pending_configuration",
                    "schema_status": "ready" if db2_env else "not_initialized",
                    "schema_version": "1.0.0" if db2_env else "pending",
                    "is_configured": bool(db2_env),
                    "is_owner_database": False,
                    "secret_reference": "SELLER_DATABASE_URL_2",
                    "last_verified_at": None
                })

            for s_db in seller_dbs:
                data = s_db.to_dict()
                data["purpose"] = f"Artisan Database ({data['seller_name']})"
                data["assigned_to"] = f"{data['seller_name']} ({data['seller_email']})"
                data["is_owner_database"] = False
                data["schema_status"] = "active" if s_db.provisioning_status == "ready" else "not_initialized"
                results.append(data)

        except Exception as e:
            logger.error("Failed to query database registry in DB1: %s", e)

        return results


# Global singleton manager instance
multi_db = MultiDatabaseManager()
