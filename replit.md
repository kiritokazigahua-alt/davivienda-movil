# Davivienda Móvil - Banking Application

## Overview

This is a full-stack mobile-first banking application that simulates the Davivienda banking experience. The application provides core banking functionalities including account management, money transfers, payments, transaction history, and administrative tools. It's built with a modern tech stack featuring React/TypeScript frontend, Express.js backend, and PostgreSQL database with Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety
- **Styling**: Tailwind CSS with shadcn/ui components for consistent design
- **State Management**: Zustand for global state management
- **Routing**: Wouter for lightweight client-side routing (optimized route config array pattern in App.tsx)
- **Data Fetching**: TanStack React Query with 30s staleTime and refetchOnWindowFocus enabled
- **Mobile-First Design**: PWA-ready with responsive design, pull-to-refresh, haptic feedback, gesture navigation
- **Idle Timeout**: Auto-logout after 25min inactivity with 5min warning dialog (IdleTimeout component)

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for type safety across the stack
- **Session Management**: Express-session with PostgreSQL store in production (connect-pg-simple), 7-day cookie timeout
- **API Design**: RESTful API with JSON responses and proper error handling
- **Build System**: ESBuild for production bundling, tsx for development
- **Security**: Helmet headers, rate limiting, bcrypt password hashing, brute force protection

### Data Layer
- **Database**: PostgreSQL as the primary database
- **ORM**: Drizzle ORM for type-safe database operations
- **Connection**: Neon serverless PostgreSQL with connection pooling
- **Schema**: Well-defined relational schema with proper foreign key constraints
- **Tables**: users, accounts, transactions, beneficiaries, services, cards, card_notifications, account_charges, app_settings, user_sessions, audit_logs

### Key Features
- **Authentication**: Session-based authentication with login/logout/register functionality
- **Account Management**: Balance viewing, account details, transaction history
- **Money Transfers**: Internal and external bank transfers with validation
- **Bill Payments**: Utility payments (electricity, water, etc.) with service integration
- **QR Code**: QR-based money transfers and payments
- **Mobile Recharges**: Cellular and transport card top-ups
- **Card Management**: Users can request new cards or register existing cards (pending admin approval)
- **Admin Panel**: Administrative interface with tabs: Dashboard, Usuarios, Cuentas, Tarjetas, Transacciones, Sesiones, Notificaciones, Alertas, Cobros & Accesos, Registro de Actividad, Configuración. Includes: Copy Template button per account (exact Davivienda format with emojis), Download Clients CSV (complete with all fields), 20 toggleable features split into Basic (10) and Advanced (10)
- **Admin Feature Toggles - Basic**: certificates, transfer limits, messages, identity verification, promotions, insurance, loyalty points, statements, scheduled payments, priority support
- **Admin Feature Toggles - Advanced**: document upload, support tickets, transaction receipts, beneficiary management, fraud alerts, account freeze, multi-currency, scheduled reports, two-factor auth, wire transfers
- **Chatbot**: FAQ chatbot with live WhatsApp support number sync - fetches admin-configured number every 10s, shows WhatsApp button when user requests advisor contact
- **WhatsApp Support Number**: Global support phone stored in app_settings, synced every 15s across all pages (use-support-phone.ts). Admin can also assign custom per-user numbers. Chatbot fetches fresh number on each advisor request via ref pattern to avoid stale state.
- **Comprehensive Audit Logging**: All user and admin operations are tracked in the audit_logs table
- **Real-time Updates**: WebSocket integration for live notifications
- **Pull-to-Refresh**: Native-like pull gesture to refresh data on any page
- **Haptic Feedback**: Vibration API on navigation button clicks

### Audit Logging System
- Table: `audit_logs` in PostgreSQL
- Tracks: login, logout, login_failed, login_blocked, register, transfer, payment, deposit, withdrawal, card_request, card_register, card_approved, card_rejected, admin_balance_adjust, admin_status_change, admin_user_update, admin_charge_created, settings_change, suspicious_transaction, suspicious_activity
- Each entry stores: userId, action, details, ipAddress, userAgent, entityType, entityId, createdAt
- Admin viewer: "Registro de Actividad" tab with filters by action type, user, date range
- API: `GET /api/admin/audit-logs` (admin only)

### Support Phone Number
- Default/current: `+573208646620`
- Managed via `useSupportPhone` hook in all pages (home, profile, transfers, retirar, login)
- Admin can update globally via Settings tab or per-user via Cobros & Accesos tab
- Users see updated number within 30 seconds (polling interval)

### Account Charges System
- Table: `account_charges` in PostgreSQL
- Types: multa, cobro, promo, descuento, acceso_especial
- Features: amount, currency, interest rate, discount percent, scheduled dates, expiry
- `applyToBalance=true` auto-deducts (cobro/multa) or adds (promo/descuento) to account balance
- API: `GET/POST /api/admin/charges`, `DELETE /api/admin/charges/:id`, `GET /api/charges` (user)

### Currency Display System
- `formatCurrency(amount, code)` - Shows `$1,000.00` with proper locale per currency
- `formatCurrencyWithCode(amount, code)` - Shows `$1,000.00 USD` with code suffix
- Balance displays show symbol at start + currency code in smaller text at end
- USD uses en-US locale (comma thousands), EUR uses de-DE locale (dot thousands), COP uses es-CO locale
- USD/EUR/GBP/BRL show 2 decimal places; COP shows 0 decimals

### PWA Mobile App (Banca Móvil)
- Manifest.json configured for standalone display with shortcuts (Transferencias, Pagos, QR)
- Service worker (`client/public/sw.js`) for PWA install capability and basic offline caching
- Service worker registered in `client/index.html` at page load
- PWA icons: `icon-192x192.png` and `icon-512x512.png` in `client/public/`
- Apple mobile web app capable with viewport-fit=cover
- Hidden scrollbars for native app feel
- Safe area insets for notched devices
- Portrait orientation lock
- Pull-to-refresh with visual indicator
- Haptic feedback on navigation actions
- **Install Button**: Shown on login welcome screen only when admin activates it
  - Admin toggle in Settings tab → "Banca Móvil (PWA)" section
  - Setting stored as `mobile_app_enabled` in `app_settings` table
  - Public endpoint: `GET /api/settings/mobile_app_enabled` returns `{enabled: boolean}`
  - Uses browser `beforeinstallprompt` event for native install prompt
  - Falls back to instructions if prompt not available

### Security Implementation
- **Password Hashing**: bcrypt with 10 rounds, auto-migrates plaintext passwords on login
- **Rate Limiting**: Global (500/15min), auth (10/15min), transactions (10/min)
- **Brute Force Protection**: Account locks after 5 failed login attempts for 15 minutes
- **Security Headers**: Helmet middleware with CSP enabled (HSTS, X-Content-Type-Options, X-Frame-Options, CSP, etc.)
- **Origin Validation**: Server-side origin/referer check on state-changing requests (POST/PUT/PATCH/DELETE) with proxy header support
- **Session Security**: HTTP-only cookies, 30min rolling timeout, secure in production, PostgreSQL-backed sessions in production (connect-pg-simple)
- **Idle Timeout**: Frontend auto-logout after 25min inactivity with 5min warning dialog
- **Transaction Limits**: Max $50,000,000 per transaction, max 5 transactions per minute
- **Suspicious Activity Detection**: Rapid transaction and large amount alerts to admin
- **Self-Transfer Prevention**: Cannot transfer to own account
- **Input Validation**: Zod schema validation for all API inputs
- **Session Expiry Awareness**: Frontend auto-redirects to login on 401 responses
- **Error Handling**: Centralized error handling, no stack traces in production
- **Authentication Guards**: Route protection for authenticated and admin users
- **Admin Route Protection**: All `/api/admin/*` routes protected with `isAdmin` middleware
- **Audit Trail**: Complete audit logging of all significant operations including security events
- **Secure Randomness**: crypto.randomInt() used for account numbers, withdrawal codes, card numbers

### Admin Dashboard Metrics
- Total users, active/blocked accounts, active sessions
- Total system balance, transactions today, transaction volume
- Pending/paid charges counters
- Security alerts feed (failed logins, blocked accounts, suspicious transactions)
- Real-time activity feed with color-coded notifications

## External Dependencies

### Core Infrastructure
- **Database**: PostgreSQL (Neon serverless)
- **Session Store**: PostgreSQL (connect-pg-simple) in production, in-memory for development

### Third-party Services
- **QR Code Generation**: QR Server API for generating QR codes
- **UI Components**: Radix UI primitives for accessible component foundation
- **Date Handling**: date-fns for Spanish locale date formatting

### Development Tools
- **Build Tools**: Vite for development and bundling, ESBuild for server compilation
- **Code Quality**: TypeScript for static typing, Prettier for code formatting
- **Development Environment**: Replit-specific plugins for runtime error handling

### Payment Processing
- **Stripe Integration**: Real payment processing via Stripe Checkout
  - `server/stripeClient.ts`: Stripe client using Replit connection API for credentials
  - `server/webhookHandlers.ts`: Webhook processing for Stripe events via stripe-replit-sync
  - Checkout sessions created for charges marked with `requireStripePayment`
  - Webhook route registered BEFORE `express.json()` middleware in `server/index.ts`
  - `stripe-replit-sync` handles schema migrations, webhook management, and data sync
  - Payment pages: `/payment/success` and `/payment/cancel`
  - `account_charges` table has `stripeSessionId`, `stripePaymentUrl`, `stripePaymentIntentId` fields
- **Custom Payment Links (Takenos / External)**: Admin can paste any external payment link (e.g., Takenos TakeLink URL) when creating a charge
  - Stored in `stripePaymentUrl` field alongside Stripe-generated URLs
  - Charge gets `pending_payment` status; admin must manually mark as paid when external payment is confirmed
  - Payment method selector in admin charge form: "Link de pago (Takenos / otro)" (default), "Stripe (genera link automático)", "Sin pasarela de pago"
  - Backend validates custom URLs (must be valid https:// URLs)
- **Branded Checkout Page**: Intermediary page (`/checkout/:chargeId`) between the app and external payment links
  - Hides Takenos/external link owner's real name behind custom branding
  - Shows order ID, charge details, amount, and branded header
  - Admin configures brand name, tagline, and owner name to hide via Settings tab (`checkout_brand_name`, `checkout_brand_tagline`, `checkout_owner_name`)
  - User clicks "Pagar Ahora" → embedded payment view with server-side proxy that strips owner name
  - Server-side proxy (`/api/payment-proxy/:chargeId`): fetches external payment HTML, replaces owner name with brand name, serves modified content in iframe
  - Fallback: if iframe fails to load, shows branded fallback with external link option
  - API endpoints: `GET /api/checkout/:chargeId`, `GET /api/payment-proxy/:chargeId` (authenticated, owner-only access)

### Security Packages
- **helmet**: Security headers middleware
- **express-rate-limit**: Request rate limiting
- **bcryptjs**: Password hashing (bcrypt algorithm)

### Optional Integrations
- **WebSocket**: For real-time admin notifications and updates
- **PWA Features**: Service worker ready for offline functionality
- **Mobile Scanning**: HTML5 QR code scanning capabilities
