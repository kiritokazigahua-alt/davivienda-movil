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

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for type safety across the stack
- **Session Management**: Express-session with memory store for user authentication
- **API Design**: RESTful API with JSON responses and proper error handling
- **Build System**: ESBuild for production bundling, tsx for development
- **Security**: All admin routes protected with `isAdmin` middleware

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
- **Admin Panel**: Administrative interface with tabs: Dashboard, Usuarios, Cuentas, Tarjetas, Transacciones, Sesiones, Notificaciones, Alertas, Cobros & Accesos, Registro de Actividad, Configuración
- **Comprehensive Audit Logging**: All user and admin operations are tracked in the audit_logs table
- **Real-time Updates**: WebSocket integration for live notifications
- **Pull-to-Refresh**: Native-like pull gesture to refresh data on any page
- **Haptic Feedback**: Vibration API on navigation button clicks

### Audit Logging System
- Table: `audit_logs` in PostgreSQL
- Tracks: login, logout, register, transfer, payment, deposit, withdrawal, card_request, card_register, card_approved, card_rejected, admin_balance_adjust, admin_status_change, admin_user_update, admin_charge_created, settings_change
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

### PWA Mobile App
- Manifest.json configured for standalone display with shortcuts (Transferencias, Pagos, QR)
- Apple mobile web app capable with viewport-fit=cover
- Hidden scrollbars for native app feel
- Safe area insets for notched devices
- Portrait orientation lock
- Pull-to-refresh with visual indicator
- Haptic feedback on navigation actions

### Recent Changes (February 2026)
- Added comprehensive audit logging system (audit_logs table, all operations tracked)
- Added "Registro de Actividad" admin tab with filterable audit log viewer
- Fixed user registration to call real API instead of simulating
- Fixed login response to include isAdmin field
- Secured all admin routes with isAdmin middleware
- Optimized App.tsx route definitions (array config pattern, reduced duplication)
- Improved query cache: staleTime 30s, refetchOnWindowFocus enabled
- Added pull-to-refresh gesture support in AppLayout
- Added haptic feedback (Vibration API) on navigation buttons
- Enhanced PWA manifest with shortcuts, categories, scope
- Added data-testid attributes to interactive elements
- Cleaned up dead files (Dashboard.tsx, AccountDetails.tsx, Login.tsx, use-auth.ts)
- Fixed CURRENCIES.map crash in admin Cobros dialog (was treating object as array)
- Fixed support phone polling spam: only polls when page visible, reduced to 2min interval
- Fixed server error handler re-throwing causing crashes
- Replaced Math.random() with crypto.randomInt() for secure randomness
- Removed all console.log/error from client-side code
- Standardized colors: bg-red-600 → bg-primary across pages
- Fixed incomplete setUserStatus storage method to actually persist status
- Removed duplicate navigation bar from HomePage (was conflicting with AppLayout BottomNavBar)
- Deleted unused files: MobileNavigation.tsx, duplicate Input.tsx, temp_zip/ directory, redundant build scripts

### Security Implementation
- **Session Security**: HTTP-only cookies with secure session management
- **Input Validation**: Zod schema validation for all API inputs
- **Error Handling**: Centralized error handling with proper status codes
- **Authentication Guards**: Route protection for authenticated and admin users
- **Admin Route Protection**: All `/api/admin/*` routes protected with `isAdmin` middleware
- **Audit Trail**: Complete audit logging of all significant operations
- **Secure Randomness**: crypto.randomInt() used for account numbers, withdrawal codes, card numbers

## External Dependencies

### Core Infrastructure
- **Database**: PostgreSQL (Neon serverless)
- **Session Store**: In-memory session storage (production-ready alternatives available)

### Third-party Services
- **QR Code Generation**: QR Server API for generating QR codes
- **UI Components**: Radix UI primitives for accessible component foundation
- **Date Handling**: date-fns for Spanish locale date formatting

### Development Tools
- **Build Tools**: Vite for development and bundling, ESBuild for server compilation
- **Code Quality**: TypeScript for static typing, Prettier for code formatting
- **Development Environment**: Replit-specific plugins for runtime error handling

### Optional Integrations
- **WebSocket**: For real-time admin notifications and updates
- **PWA Features**: Service worker ready for offline functionality
- **Mobile Scanning**: HTML5 QR code scanning capabilities
