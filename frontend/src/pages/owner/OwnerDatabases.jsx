import React, { useState, useEffect } from 'react';
import { 
  Database, Server, RefreshCw, CheckCircle2, AlertTriangle, 
  Clock, ShieldCheck, Plus, Terminal, Key, Cpu, ExternalLink,
  Layers, HardDrive, ArrowRight, Lock
} from 'lucide-react';
import { adminApi } from '../../api/admin';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function OwnerDatabases() {
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Registration modal state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regForm, setRegForm] = useState({ seller_id: '', seller_email: '', provider: 'Neon PostgreSQL', notes: '' });

  // Configuration modal state
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedDb, setSelectedDb] = useState(null);
  const [configForm, setConfigForm] = useState({ connection_url: '', secret_reference: '' });

  useEffect(() => {
    loadDatabases();
  }, []);

  const loadDatabases = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await adminApi.getDatabases();
      if (res?.databases) {
        setDatabases(res.databases);
      }
    } catch (err) {
      console.error('Failed to load database registry:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to retrieve multi-database registry.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (databaseId) => {
    setActionLoading(prev => ({ ...prev, [databaseId]: 'verifying' }));
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await adminApi.verifyDatabase(databaseId);
      if (res?.success) {
        setSuccessMsg(`Database ${databaseId}: ${res.message}`);
      } else {
        setErrorMsg(`Database ${databaseId}: ${res.message}`);
      }
      await loadDatabases();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || `Failed to verify database ${databaseId}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [databaseId]: null }));
    }
  };

  const handleMigrate = async (databaseId) => {
    if (!window.confirm(`Initialize or verify schema on ${databaseId}? Existing data will not be overwritten.`)) {
      return;
    }
    setActionLoading(prev => ({ ...prev, [databaseId]: 'migrating' }));
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await adminApi.migrateDatabase(databaseId);
      if (res?.success) {
        setSuccessMsg(`Schema Migration ${databaseId}: ${res.message}`);
      } else {
        setErrorMsg(`Schema Migration ${databaseId}: ${res.message}`);
      }
      await loadDatabases();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || `Schema migration failed for ${databaseId}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [databaseId]: null }));
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regForm.seller_id) {
      setErrorMsg('Seller ID is required');
      return;
    }
    setActionLoading(prev => ({ ...prev, register: true }));
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await adminApi.registerDatabase(regForm);
      setSuccessMsg(res.message || 'Seller database allocated successfully.');
      setShowRegisterModal(false);
      setRegForm({ seller_id: '', seller_email: '', provider: 'Neon PostgreSQL', notes: '' });
      await loadDatabases();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to register seller database.');
    } finally {
      setActionLoading(prev => ({ ...prev, register: false }));
    }
  };

  const handleConfigSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDb) return;
    setActionLoading(prev => ({ ...prev, config: true }));
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await adminApi.configureDatabase(selectedDb.database_id, configForm);
      setSuccessMsg(res.message || `Database ${selectedDb.database_id} configured successfully.`);
      setShowConfigModal(false);
      setConfigForm({ connection_url: '', secret_reference: '' });
      await loadDatabases();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || `Failed to configure ${selectedDb.database_id}.`);
    } finally {
      setActionLoading(prev => ({ ...prev, config: false }));
    }
  };

  const getConnectionBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'connected') {
      return (
        <span style={{ 
          display: 'inline-flex', alignItems: 'center', gap: '6px', 
          backgroundColor: '#E8F5E9', color: '#2E7D32', 
          padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 
        }}>
          <CheckCircle2 size={13} /> Connected
        </span>
      );
    }
    if (s === 'pending_configuration') {
      return (
        <span style={{ 
          display: 'inline-flex', alignItems: 'center', gap: '6px', 
          backgroundColor: '#FFF8E1', color: '#F57F17', 
          padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 
        }}>
          <Clock size={13} /> Pending Configuration
        </span>
      );
    }
    return (
      <span style={{ 
        display: 'inline-flex', alignItems: 'center', gap: '6px', 
        backgroundColor: '#FFEBEE', color: '#C62828', 
        padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 
      }}>
        <AlertTriangle size={13} /> {status ? status.replace('_', ' ').toUpperCase() : 'NOT CONFIGURED'}
      </span>
    );
  };

  const getSchemaBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'active' || s === 'ready') {
      return (
        <span style={{ 
          display: 'inline-flex', alignItems: 'center', gap: '6px', 
          backgroundColor: '#E3F2FD', color: '#1565C0', 
          padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 
        }}>
          <ShieldCheck size={13} /> Active (v1.0)
        </span>
      );
    }
    if (s === 'pending') {
      return (
        <span style={{ 
          display: 'inline-flex', alignItems: 'center', gap: '6px', 
          backgroundColor: '#FFF8E1', color: '#F57F17', 
          padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 
        }}>
          <Clock size={13} /> Pending
        </span>
      );
    }
    return (
      <span style={{ 
        display: 'inline-flex', alignItems: 'center', gap: '6px', 
        backgroundColor: '#F5F5F5', color: '#757575', 
        padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 
      }}>
        Not Initialized
      </span>
    );
  };

  return (
    <DashboardLayout role="owner" activeNav="databases">
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header Banner */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '8px',
                backgroundColor: 'var(--color-primary-terracotta)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff'
              }}>
                <Database size={20} />
              </div>
              <h1 style={{ 
                fontFamily: 'Playfair Display, serif', fontSize: '1.875rem', 
                color: 'var(--color-text-primary)', margin: 0 
              }}>
                Dynamic Multi-Database Architecture
              </h1>
            </div>
            <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.95rem' }}>
              Isolated database instances per artisan workshop. DB1 governs the platform registry; DB2+ hold seller products and orders.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={loadDatabases}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '9px 16px', borderRadius: 'var(--radius-md)',
                backgroundColor: '#fff', border: '1px solid var(--color-border)',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 600, color: 'var(--color-text-primary)',
                fontSize: '0.875rem'
              }}
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>

            <button
              onClick={() => setShowRegisterModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '9px 18px', borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-primary-terracotta)',
                border: 'none', color: '#fff', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.875rem',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <Plus size={16} />
              Register Seller Database
            </button>
          </div>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '14px 18px', borderRadius: 'var(--radius-md)',
            backgroundColor: '#FFEBEE', border: '1px solid #FFCDD2',
            color: '#C62828', marginBottom: '20px', fontSize: '0.9rem'
          }}>
            <AlertTriangle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '14px 18px', borderRadius: 'var(--radius-md)',
            backgroundColor: '#E8F5E9', border: '1px solid #C8E6C9',
            color: '#2E7D32', marginBottom: '20px', fontSize: '0.9rem'
          }}>
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Quick Architecture Info Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
          marginBottom: '28px'
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: 'var(--radius-lg)', padding: '20px',
            border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <Server size={18} color="var(--color-primary-terracotta)" />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                DB1: Platform Core
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              Holds platform authentication, global registry, owner governance, and secret references. Never acts as fallback for seller data.
            </p>
          </div>

          <div style={{
            backgroundColor: '#fff', borderRadius: 'var(--radius-lg)', padding: '20px',
            border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <HardDrive size={18} color="#D97706" />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                DB2: Seller A Space
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              Dedicated Neon PostgreSQL database space ready for Seller A. Connects automatically via <code>SELLER_DATABASE_URL_2</code>.
            </p>
          </div>

          <div style={{
            backgroundColor: '#fff', borderRadius: 'var(--radius-lg)', padding: '20px',
            border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <Layers size={18} color="#2563EB" />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                DB3, DB4... Dynamic Scaling
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              Unlimited horizontal database provisioning. Each registered artisan gets an independent database catalog with connection pooling.
            </p>
          </div>
        </div>

        {/* Database Management Registry Table */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
          marginBottom: '32px'
        }}>
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#FAFAF9'
          }}>
            <div>
              <h2 style={{ 
                fontFamily: 'Playfair Display, serif', fontSize: '1.25rem', 
                color: 'var(--color-text-primary)', margin: '0 0 4px 0' 
              }}>
                Database Registry & Live Health
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                Real-time connection verification and schema synchronization from DB1 registry
              </p>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
              {databases.length} Registered Database{databases.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '40px' }}>
              <LoadingSpinner text="Querying database registry..." />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#FDFBF7', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '14px 20px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Database ID
                    </th>
                    <th style={{ padding: '14px 20px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Assigned Entity / Purpose
                    </th>
                    <th style={{ padding: '14px 20px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Provider & Secret Ref
                    </th>
                    <th style={{ padding: '14px 20px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Connection Status
                    </th>
                    <th style={{ padding: '14px 20px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Schema Status
                    </th>
                    <th style={{ padding: '14px 20px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {databases.map((dbItem) => {
                    const isOwnerDb = dbItem.database_id === 'DB1' || dbItem.is_owner_database;
                    const isVerifying = actionLoading[dbItem.database_id] === 'verifying';
                    const isMigrating = actionLoading[dbItem.database_id] === 'migrating';

                    return (
                      <tr 
                        key={dbItem.database_id}
                        style={{ borderBottom: '1px solid #F0ECE8', transition: 'background-color 0.15s ease' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFFBF7'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {/* Database ID */}
                        <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              fontWeight: 700, fontSize: '0.95rem',
                              fontFamily: 'monospace',
                              backgroundColor: isOwnerDb ? '#EFEBE9' : '#FFF3E0',
                              color: isOwnerDb ? '#4E342E' : '#E65100',
                              padding: '3px 8px', borderRadius: '6px'
                            }}>
                              {dbItem.database_id}
                            </span>
                            {isOwnerDb && (
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary-terracotta)' }}>
                                [MASTER]
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Assigned Entity */}
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.9rem' }}>
                            {dbItem.assigned_to || (isOwnerDb ? 'Main Owner Platform' : 'Unassigned')}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                            {dbItem.purpose || (isOwnerDb ? 'Owner & Platform Registry' : 'Artisan Catalog & Inventory')}
                          </div>
                        </td>

                        {/* Provider & Secret */}
                        <td style={{ padding: '16px 20px', fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-primary)' }}>
                            <Cpu size={14} color="#8D6E63" />
                            <span>{dbItem.provider ? String(dbItem.provider).toUpperCase() : 'NEON POSTGRESQL'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-secondary)', fontSize: '0.75rem', marginTop: '2px', fontFamily: 'monospace' }}>
                            <Lock size={11} />
                            <span>{dbItem.secret_reference || 'ENCRYPTED_VAULT'}</span>
                          </div>
                        </td>

                        {/* Connection Status */}
                        <td style={{ padding: '16px 20px' }}>
                          {getConnectionBadge(dbItem.connection_status)}
                        </td>

                        {/* Schema Status */}
                        <td style={{ padding: '16px 20px' }}>
                          {getSchemaBadge(dbItem.schema_status)}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '16px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            {/* Test Connection Button */}
                            <button
                              onClick={() => handleVerify(dbItem.database_id)}
                              disabled={isVerifying || isMigrating}
                              title="Test database connectivity"
                              style={{
                                padding: '6px 12px', borderRadius: '6px',
                                backgroundColor: '#fff', border: '1px solid var(--color-border)',
                                fontSize: '0.78rem', fontWeight: 600,
                                color: 'var(--color-text-primary)', cursor: 'pointer',
                                display: 'inline-flex', alignItems: 'center', gap: '4px'
                              }}
                            >
                              <RefreshCw size={12} className={isVerifying ? 'animate-spin' : ''} />
                              {isVerifying ? 'Testing...' : 'Verify'}
                            </button>

                            {/* Schema Migrate Button */}
                            {!isOwnerDb && (
                              <button
                                onClick={() => handleMigrate(dbItem.database_id)}
                                disabled={isMigrating || isVerifying || dbItem.connection_status !== 'connected'}
                                title="Run schema synchronization"
                                style={{
                                  padding: '6px 12px', borderRadius: '6px',
                                  backgroundColor: dbItem.connection_status === 'connected' ? '#E3F2FD' : '#F5F5F5',
                                  border: '1px solid',
                                  borderColor: dbItem.connection_status === 'connected' ? '#90CAF9' : '#E0E0E0',
                                  fontSize: '0.78rem', fontWeight: 600,
                                  color: dbItem.connection_status === 'connected' ? '#1565C0' : '#9E9E9E',
                                  cursor: dbItem.connection_status === 'connected' ? 'pointer' : 'not-allowed',
                                  display: 'inline-flex', alignItems: 'center', gap: '4px'
                                }}
                              >
                                <Terminal size={12} />
                                {isMigrating ? 'Migrating...' : 'Migrate'}
                              </button>
                            )}

                            {/* Configure Credentials Button */}
                            {!isOwnerDb && (
                              <button
                                onClick={() => {
                                  setSelectedDb(dbItem);
                                  setShowConfigModal(true);
                                }}
                                title="Configure Connection String / Secret"
                                style={{
                                  padding: '6px 12px', borderRadius: '6px',
                                  backgroundColor: '#FFF8E1',
                                  border: '1px solid #FFE082',
                                  fontSize: '0.78rem', fontWeight: 600,
                                  color: '#F57F17', cursor: 'pointer',
                                  display: 'inline-flex', alignItems: 'center', gap: '4px'
                                }}
                              >
                                <Key size={12} />
                                Config
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Security & Isolation Architecture Notice */}
        <div style={{
          backgroundColor: '#FFFDF9',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid #E6D8CC',
          padding: '24px',
          display: 'flex',
          gap: '16px',
          alignItems: 'flex-start'
        }}>
          <ShieldCheck size={24} color="var(--color-primary-terracotta)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Strict Data Isolation & Security Safeguards Active
            </h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              • Database URLs and passwords are encrypted server-side and never exposed to the client.<br />
              • Seller databases are strictly partitioned: Seller A cannot access Seller B's database.<br />
              • Disconnected seller databases do NOT cause fallback writes into DB1.<br />
              • All schema migrations are non-destructive and preserve existing tables and artisan catalog items.
            </p>
          </div>
        </div>

      </div>

      {/* REGISTER SELLER MODAL */}
      {showRegisterModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: 'var(--radius-lg)',
            width: '100%', maxWidth: '520px', padding: '28px',
            boxShadow: 'var(--shadow-xl)', border: '1px solid var(--color-border)'
          }}>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.35rem', margin: '0 0 8px 0', color: 'var(--color-text-primary)' }}>
              Register Seller Database
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', margin: '0 0 20px 0' }}>
              Allocates a unique logical database identifier (e.g. DB2, DB3, DB4...) in the Main Owner DB1 registry.
            </p>

            <form onSubmit={handleRegisterSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-primary)' }}>
                  Seller User ID *
                </label>
                <input
                  type="number"
                  placeholder="e.g. 2"
                  value={regForm.seller_id}
                  onChange={(e) => setRegForm({ ...regForm, seller_id: e.target.value })}
                  required
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)', fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-primary)' }}>
                  Seller Email (Optional reference)
                </label>
                <input
                  type="email"
                  placeholder="e.g. artisan@craftnest.in"
                  value={regForm.seller_email}
                  onChange={(e) => setRegForm({ ...regForm, seller_email: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)', fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-primary)' }}>
                  Database Provider
                </label>
                <select
                  value={regForm.provider}
                  onChange={(e) => setRegForm({ ...regForm, provider: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)', fontSize: '0.9rem'
                  }}
                >
                  <option value="Neon PostgreSQL">Neon PostgreSQL (Serverless)</option>
                  <option value="PostgreSQL">Standard PostgreSQL</option>
                  <option value="AWS Aurora">AWS Aurora PostgreSQL</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  style={{
                    padding: '9px 16px', borderRadius: 'var(--radius-md)',
                    backgroundColor: '#fff', border: '1px solid var(--color-border)',
                    cursor: 'pointer', fontWeight: 600
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading.register}
                  style={{
                    padding: '9px 20px', borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-primary-terracotta)', color: '#fff',
                    border: 'none', cursor: 'pointer', fontWeight: 600
                  }}
                >
                  {actionLoading.register ? 'Registering...' : 'Assign Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIGURE CREDENTIALS MODAL */}
      {showConfigModal && selectedDb && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: 'var(--radius-lg)',
            width: '100%', maxWidth: '560px', padding: '28px',
            boxShadow: 'var(--shadow-xl)', border: '1px solid var(--color-border)'
          }}>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.35rem', margin: '0 0 8px 0', color: 'var(--color-text-primary)' }}>
              Configure Credentials for {selectedDb.database_id}
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', margin: '0 0 20px 0' }}>
              Provide the connection string for this seller database. All strings are encrypted at rest using AES-256 and never logged or exposed.
            </p>

            <form onSubmit={handleConfigSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-primary)' }}>
                  Neon PostgreSQL Connection URL
                </label>
                <input
                  type="password"
                  placeholder="postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require"
                  value={configForm.connection_url}
                  onChange={(e) => setConfigForm({ ...configForm, connection_url: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)', fontSize: '0.9rem'
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block', marginTop: '4px' }}>
                  Leave empty if you are referencing an environment variable instead.
                </span>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-primary)' }}>
                  Or Environment Secret Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. SELLER_DATABASE_URL_2"
                  value={configForm.secret_reference}
                  onChange={(e) => setConfigForm({ ...configForm, secret_reference: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)', fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  style={{
                    padding: '9px 16px', borderRadius: 'var(--radius-md)',
                    backgroundColor: '#fff', border: '1px solid var(--color-border)',
                    cursor: 'pointer', fontWeight: 600
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading.config}
                  style={{
                    padding: '9px 20px', borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-primary-terracotta)', color: '#fff',
                    border: 'none', cursor: 'pointer', fontWeight: 600
                  }}
                >
                  {actionLoading.config ? 'Saving & Verifying...' : 'Save & Verify'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
