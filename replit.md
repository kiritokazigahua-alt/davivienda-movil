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
- **Routing**: Wouter for lightweight client-side routing
- **Data Fetching**: TanStack React Query for server state management and caching
- **Mobile-First Design**: PWA-ready with responsive design optimized for mobile devices

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for type safety across the stack
- **Session Management**: Express-session with memory store for user authentication
- **API Design**: RESTful API with JSON responses and proper error handling
- **Build System**: ESBuild for production bundling, tsx for development

### Data Layer
- **Database**: PostgreSQL as the primary database
- **ORM**: Drizzle ORM for type-safe database operations
- **Connection**: Neon serverless PostgreSQL with connection pooling
- **Schema**: Well-defined relational schema with proper foreign key constraints

### Key Features
- **Authentication**: Session-based authentication with login/logout functionality
- **Account Management**: Balance viewing, account details, transaction history
- **Money Transfers**: Internal and external bank transfers with validation
- **Bill Payments**: Utility payments (electricity, water, etc.) with service integration
- **QR Code**: QR-based money transfers and payments
- **Mobile Recharges**: Cellular and transport card top-ups
- **Card Management**: Users can request new cards or register existing cards (pending admin approval). Cards can be debit/credit, Visa/Mastercard with status tracking (pending, active, blocked, frozen, rejected)
- **Admin Panel**: Administrative interface for user, transaction, and card management including card approval/rejection, status changes, and balance control
- **Admin Settings**: Configurable application settings including support phone number
- **Admin Card Management**: Direct card creation and editing capabilities for administrators
- **Admin Cobros & Accesos**: Panel for managing charges (multas, cobros, promos, descuentos, accesos especiales) with amount, currency, interest rates, scheduled discounts and expiry dates
- **Per-User Support Phone**: Admin can assign individual support WhatsApp numbers to users; falls back to global number
- **Activity Log**: Session-based activity tracking displayed in admin dashboard
- **Real-time Updates**: WebSocket integration for live notifications
- **Support Phone Hook**: `useSupportPhone` hook (client/src/hooks/use-support-phone.ts) provides reactive support phone fetching with 30s polling, user-specific override support, and WhatsApp/call helpers

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
- Currency-based bank selection: USD shows US banks, EUR shows EU banks by country, etc.

### PWA Mobile App
- Manifest.json configured for standalone display
- Apple mobile web app capable with viewport-fit=cover
- Hidden scrollbars for native app feel
- Safe area insets for notched devices
- Portrait orientation lock

### Recent Changes (February 2026)
- Updated support phone to +573208646620
- Fixed support phone sync: useSupportPhone hook now polls every 30s so admin updates reflect to users
- Added per-user support phone assignment (admin can set customSupportPhone per user)
- Added Cobros & Accesos admin tab with full charge creation dialog
- Added account_charges table with CRUD operations
- Removed all hardcoded phone numbers across the app
- Improved currency formatting: symbol at start, currency code at end (e.g., $1,000.00 USD)
- Added proper locale-based number formatting per currency
- Added decimals for USD/EUR/GBP/BRL currencies
- Added manifest.json link to HTML for PWA install support

### Security Implementation
- **Session Security**: HTTP-only cookies with secure session management
- **Input Validation**: Zod schema validation for all API inputs
- **Error Handling**: Centralized error handling with proper status codes
- **Authentication Guards**: Route protection for authenticated and admin users

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
