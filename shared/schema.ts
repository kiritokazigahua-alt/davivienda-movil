import { pgTable, text, serial, integer, timestamp, doublePrecision, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User Schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  document: text("document").notNull(),
  phone: text("phone").notNull(),
  lastLogin: timestamp("last_login"),
  isAdmin: integer("is_admin").default(0).notNull(),
  role: text("role").default("user"),
  customSupportPhone: text("custom_support_phone"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  lastLogin: true,
});

// Account Schema
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  accountNumber: text("account_number").notNull().unique(),
  accountType: text("account_type").notNull(),
  balance: doublePrecision("balance").notNull().default(0),
  status: text("status"),
  statusMessage: text("status_message"),
  currency: text("currency").notNull().default("COP"),
});

// Currency options with symbols
export const CURRENCIES = {
  USD: { code: "USD", symbol: "$", name: "Dólar estadounidense" },
  EUR: { code: "EUR", symbol: "€", name: "Euro" },
  COP: { code: "COP", symbol: "$", name: "Peso colombiano" },
  GBP: { code: "GBP", symbol: "£", name: "Libra esterlina" },
  BRL: { code: "BRL", symbol: "R$", name: "Real brasileño" },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
});

// Transaction Schema
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => accounts.id),
  amount: doublePrecision("amount").notNull(),
  description: text("description").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  type: text("type").notNull(), // deposit, withdrawal, transfer, payment
  reference: text("reference"),
  recipientId: integer("recipient_id").references(() => accounts.id),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
});

// User Documents Schema
export const userDocuments = pgTable("user_documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // cedula, comprobante, apelacion, inscripcion, otro
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  data: text("data").notNull(), // base64
  description: text("description"),
  status: text("status").notNull().default("pendiente"), // pendiente, revisado, aprobado, rechazado
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserDocumentSchema = createInsertSchema(userDocuments).omit({
  id: true,
  createdAt: true,
});
export type InsertUserDocument = z.infer<typeof insertUserDocumentSchema>;
export type UserDocument = typeof userDocuments.$inferSelect;

// Beneficiary Schema
export const beneficiaries = pgTable("beneficiaries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  bank: text("bank").notNull(),
  accountNumber: text("account_number").notNull(),
  accountType: text("account_type").notNull(),
  phone: text("phone"),
  email: text("email"),
});

export const insertBeneficiarySchema = createInsertSchema(beneficiaries).omit({
  id: true,
});

// Service Schema for Bill Payments
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // electricity, water, phone, etc.
  description: text("description"),
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
});

// Card Schema
export const cards = pgTable("cards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  cardNumber: text("card_number").notNull(),
  cardType: text("card_type").notNull(), // debit, credit
  cardBrand: text("card_brand").notNull(), // visa, mastercard
  expirationDate: text("expiration_date").notNull(),
  cvv: text("cvv"),
  status: text("status").notNull().default("pending"), // pending, active, blocked, frozen, rejected
  balance: doublePrecision("balance").notNull().default(0),
  balanceStatus: text("balance_status").default("active"), // active, blocked, frozen
  requestType: text("request_type").notNull(), // request, register
  requestDate: timestamp("request_date").notNull().defaultNow(),
  approvedDate: timestamp("approved_date"),
  approvedBy: integer("approved_by").references(() => users.id),
});

export const insertCardSchema = createInsertSchema(cards).omit({
  id: true,
  requestDate: true,
  approvedDate: true,
  approvedBy: true,
});

// Card Request Notifications Schema
export const cardNotifications = pgTable("card_notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  cardId: integer("card_id").references(() => cards.id),
  type: text("type").notNull(), // card_request, card_register, card_approved, card_rejected
  message: text("message").notNull(),
  read: integer("read").default(0).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCardNotificationSchema = createInsertSchema(cardNotifications).omit({
  id: true,
  createdAt: true,
});

// Account Charges Schema (Cobros, Multas, Accesos Especiales, Promos, Descuentos)
export const accountCharges = pgTable("account_charges", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => accounts.id),
  type: text("type").notNull(), // multa, cobro, acceso_especial, promo, descuento
  reason: text("reason").notNull(),
  description: text("description"),
  amount: doublePrecision("amount").notNull().default(0),
  currency: text("currency").notNull().default("COP"),
  interestRate: doublePrecision("interest_rate").default(0),
  discountPercent: doublePrecision("discount_percent").default(0),
  scheduledDate: timestamp("scheduled_date"),
  expiresAt: timestamp("expires_at"),
  status: text("status").notNull().default("active"), // active, paid, cancelled, expired, pending_payment
  appliedBy: integer("applied_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  paidAt: timestamp("paid_at"),
  notifyUser: integer("notify_user").default(1),
  stripeSessionId: text("stripe_session_id"),
  stripePaymentUrl: text("stripe_payment_url"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
});

export const insertAccountChargeSchema = createInsertSchema(accountCharges).omit({
  id: true,
  createdAt: true,
  paidAt: true,
});

// App Settings Schema for Admin configurable settings
export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: integer("updated_by").references(() => users.id),
});

export const insertAppSettingSchema = createInsertSchema(appSettings).omit({
  id: true,
  updatedAt: true,
});

// User Session Schema for Admin Panel
export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  loginTime: timestamp("login_time").notNull().defaultNow(),
  logoutTime: timestamp("logout_time"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  sessionDuration: integer("session_duration"),
});

export const insertSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  sessionDuration: true,
  logoutTime: true,
}).extend({
  ipAddress: z.string().nullable().optional().default(null),
  userAgent: z.string().nullable().optional().default(null)
});

// Audit Log Schema
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  details: text("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

// Assistant Permissions Schema
export const assistantPermissions = pgTable("assistant_permissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  permissions: text("permissions").notNull().default("[]"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAssistantPermissionSchema = createInsertSchema(assistantPermissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Visitor Logs Schema
export const visitorLogs = pgTable("visitor_logs", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  country: text("country"),
  city: text("city"),
  action: text("action").notNull(),
  page: text("page"),
  referrer: text("referrer"),
  deviceType: text("device_type"),
  browser: text("browser"),
  os: text("os"),
  userId: integer("user_id").references(() => users.id),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVisitorLogSchema = createInsertSchema(visitorLogs).omit({
  id: true,
  createdAt: true,
});

// Type declarations
export type InsertAssistantPermission = z.infer<typeof insertAssistantPermissionSchema>;
export type AssistantPermission = typeof assistantPermissions.$inferSelect;

export type InsertVisitorLog = z.infer<typeof insertVisitorLogSchema>;
export type VisitorLog = typeof visitorLogs.$inferSelect;

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export type InsertBeneficiary = z.infer<typeof insertBeneficiarySchema>;
export type Beneficiary = typeof beneficiaries.$inferSelect;

export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

export type InsertUserSession = z.infer<typeof insertSessionSchema>;
export type UserSession = typeof userSessions.$inferSelect;

export type InsertCard = z.infer<typeof insertCardSchema>;
export type Card = typeof cards.$inferSelect;

export type InsertCardNotification = z.infer<typeof insertCardNotificationSchema>;
export type CardNotification = typeof cardNotifications.$inferSelect;

export type InsertAppSetting = z.infer<typeof insertAppSettingSchema>;
export type AppSetting = typeof appSettings.$inferSelect;

export type InsertAccountCharge = z.infer<typeof insertAccountChargeSchema>;
export type AccountCharge = typeof accountCharges.$inferSelect;
