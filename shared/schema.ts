import { pgTable, text, serial, integer, timestamp, doublePrecision } from "drizzle-orm/pg-core";
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

// Beneficiary Schema
export const beneficiaries = pgTable("beneficiaries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  bank: text("bank").notNull(),
  accountNumber: text("account_number").notNull(),
  accountType: text("account_type").notNull(),
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

// Type declarations
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
