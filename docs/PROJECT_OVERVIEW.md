# CraftNest — Complete Project Overview

## 1. Executive Summary

**CraftNest** is an enterprise-class, multi-role digital commerce and supply ecosystem dedicated to authentic Indian and regional handicrafts, artisanal goods, cultural creations, and heritage merchandise (such as Jaipur Blue Pottery, Tanjore 24K Gold Paintings, Brassware, Handwoven Textiles, and Fine Jewelry).

CraftNest bridges the technological and commercial divide between traditional regional craftspeople (sellers/artisans) and global patrons by providing a unified digital storefront backed by robust seller management, order tracking, real-time inventory synchronization, multilingual presentation, and enterprise-grade data protection.

---

## 2. Problem Statement

Traditional artisan craft sectors face substantial friction in contemporary e-commerce:

1. **Intermediary Exploitation & Margin Dilution**:
   - Artisans frequently sell their goods to multiple layers of middlemen at low margins, lacking direct access to customer demand and price transparency.
2. **Technological Complexity**:
   - Small guilds and independent master artisans struggle with convoluted multi-vendor software, complex onboarding, and disjointed inventory portals.
3. **Data Privacy & Counterfeiting Vulnerabilities**:
   - E-commerce platforms regularly store customer addresses and artisan records in plaintext, exposing patron PII and exposing craft lineage to data scraping.
4. **Disjointed Multi-Vendor Order Handling**:
   - When a patron purchases products originating from multiple workshops or independent artisans in a single basket, traditional platforms fail to segregate order items, creating logistical confusion and communication breakdowns.
5. **Lack of Tiered Administrative Governance**:
   - Marketplace founders often lack granular control to supervise artisan catalogs, approve or modify listings, enforce minimum stock levels, and review platform-wide financial health without disrupting artisan autonomy.

---

## 3. Core Objectives of CraftNest

- **Artisan Empowerment**: Provide verified craftspeople with an intuitive portal to list handcrafted products, monitor inventory depletion, track fulfillments, and review artisan-specific financial earnings.
- **Patron Assurance & Trust**: Offer buyers an authentic, high-aesthetic shopping experience with verified artisan attributions, transparent pricing, responsive order tracking, secure delivery management, and real-time support.
- **Relational Multi-Tenant Architecture**: Ensure strict operational isolation so artisans can only view and manage their own inventory and assigned order items, while marketplace owners retain overarching supervisory control over the unified catalog.
- **Zero-Friction Role Unified Authentication**: Deliver a single, secure login gateway where backend credentials dynamically resolve the user's role and dispatch them directly to their dedicated interface.
- **Enterprise-Grade Data Confidentiality**: Safeguard customer names, email addresses, contact numbers, and delivery physical locations using deterministic AES-256-CBC field-level database encryption.

---

## 4. Target User Personas

| Persona | Primary Needs & Responsibilities | Key Platform Interfaces |
| :--- | :--- | :--- |
| **Main Owner (Super Administrator)** | Complete operational, financial, and catalog governance. Oversees all sellers, products, system banners, platform maintenance, transactions, categories, collections, and audit logs. | `/owner/dashboard`, `/owner/products`, `/owner/sellers`, `/owner/orders`, `/owner/control`, `/owner/reports` |
| **Sub-Owner (Operations Manager)** | Delegated supervisory duties including stock audits, operational reports, order fulfillment monitoring, and seller coordination without full financial super-rights. | `/sub-owner/dashboard`, `/sub-owner/products`, `/sub-owner/orders`, `/sub-owner/reports` |
| **Seller (Artisan / Guild Master)** | Creation and lifecycle management of artisanal listings, stock replenishment, processing assigned orders, managing artisan profiles, and monitoring product reviews. | `/seller/dashboard`, `/seller/products`, `/seller/orders`, `/seller/profile`, `/seller/reviews`, `/seller/settings` |
| **Customer (Patron / Buyer)** | Catalog exploration, multi-lingual browsing (English/Hindi), cart management, checkout with verified address storage, order tracking, returns, wishlist curation, and ticket submission. | Storefront (`/`, `/products`, `/categories`), `/cart`, `/checkout`, `/account/*`, `/orders/*`, `/contact` |

---

## 5. Major Platform Functionalities

### 5.1 Storefront & Discovery
- **Hero & Dynamic Banners**: Centralized dynamic banners with video overlays and category-specific promotional campaigns.
- **Curated Collections & Lookbooks**: Themed aesthetic groupings (e.g., Bridal, Heritage, Festival) with custom styling tips, highlight reels, and direct product linkages.
- **Category & Attribute Navigation**: Hierarchical browsing with faceted attributes, live search, and sorting by price, discount, and ratings.
- **Dual-Language Localization**: Full English and Hindi support across product titles, descriptions, and site navigation.

### 5.2 Product Lifecycle & Cataloging
- **Artisan Attributed Listings**: Every product maintains a `seller_id` foreign key. Products can also be created directly by the Main Owner (`seller_id = NULL`).
- **Inventory & Stock History**: Automated logging of stock adjustments across orders, manual overrides, and buy-request fulfillment with full audit records (`stock_histories`).
- **High-Resolution Media Gallery**: Multi-image ordering via `product_images` with Cloudinary CDN integration and static fallback caching.
- **Buy-Request Pipeline**: Specialized mechanism allowing customers to express high-demand purchase intent for exclusive or out-of-stock artisanal pieces (`buy_requests`).

### 5.3 Order Lifecycle & Fulfillment
- **Unified Cart with Multi-Seller Split**: Patrons can place an order containing items from multiple distinct artisans in a single checkout.
- **Granular Seller Item Attribution**: The system splits order lines into `order_items` tagged with each artisan's `seller_id`.
- **Artisan Order Isolation**: Sellers query orders via `/api/orders` or `/api/orders/seller`, retrieving only the items originating from their workshop.
- **Milestone Tracking Engine**: Multi-stage order fulfillment statuses (`Pending`, `Confirmed`, `Packed`, `Shipped`, `Out for Delivery`, `Delivered`, `Cancelled`) complete with carrier names, tracking identifiers, tracking URLs, and append-only tracking histories.

### 5.4 Identity, Security & Operations
- **Single-Door Authentication**: Unified `/api/auth/login` endpoint supporting email, username, or phone number with dynamic role dispatch.
- **OTP Verification Engine**: 6-digit registration and password reset verification sent via Gmail SMTP or fallback simulation modes.
- **Brute-Force & Attack Throttling**: Progressive failed-attempt tracking in `user_attempts` with automatic 15-minute account locks upon reaching retry thresholds.
- **System Maintenance Gatekeeper**: Global maintenance switch toggleable by administrators to gracefully take the marketplace offline with friendly maintenance screens while preserving admin access.

---

## 6. How the Complete Platform Works (End-to-End Walkthrough)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 CRAFTNEST LIFECYCLE                                    │
└────────────────────────────────────────────────────────────────────────────────────────┘

 [1. ONBOARDING & SETUP]
    Owner sets up marketplace ──► Registers Artisans (Sellers) via Owner Dashboard or Seed
                                └──► Artisans receive credentials and log in at /login

 [2. INVENTORY CURATION]
    Artisan uploads listing ────► Backend validates JWT role ("seller")
                                └──► Injects authenticated user ID as seller_id
                                └──► Product appears on public storefront tagged with Artisan

 [3. PATRON JOURNEY]
    Customer explores catalog ──► Adds artisan products to Cart
                                └──► Enters encrypted delivery address
                                └──► Agrees to terms & conditions and places order

 [4. TRANSACTION & SPLIT]
    Backend atomic execution ───► Verifies stock availability with row-level locks
                                └──► Decrements product inventory & logs stock history
                                └──► Generates order (e.g. SS-849201)
                                └──► Injects individual seller_id into each OrderItem

 [5. SELLER FULFILLMENT]
    Artisan opens Dashboard ────► Queries /api/orders (filtered by seller_id in DB)
                                └──► Views assigned order items, quantities, and patron name
                                └──► Packs craft and flags items for fulfillment

 [6. OWNER SUPERVISION]
    Owner views marketplace ────► Accesses /api/orders/all and /api/admin/stats
                                └──► Audits overall GMV, platform orders, and artisan health
                                └──► Modifies tracking URL, carrier, or resolves return requests
```
