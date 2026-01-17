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
- **Real-time Updates**: WebSocket integration for live notifications

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