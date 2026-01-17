import { 
  users, User, InsertUser,
  accounts, Account, InsertAccount,
  transactions, Transaction, InsertTransaction,
  beneficiaries, Beneficiary, InsertBeneficiary,
  services, Service, InsertService,
  userSessions, UserSession, InsertUserSession,
  cards, Card, InsertCard,
  cardNotifications, CardNotification, InsertCardNotification,
  appSettings, AppSetting, InsertAppSetting
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastLogin(id: number): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
  setUserStatus(id: number, status: string): Promise<User | undefined>;

  // Account operations
  getAccountByUserId(userId: number): Promise<Account | undefined>;
  getAccountById(id: number): Promise<Account | undefined>;
  getAccountByNumber(accountNumber: string): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccountBalance(id: number, amount: number): Promise<Account | undefined>;
  updateAccountStatus(id: number, status: string, statusMessage?: string): Promise<Account | undefined>;
  updateAccount(id: number, accountData: Partial<InsertAccount>): Promise<Account | undefined>;
  deleteAccount(id: number): Promise<boolean>;
  getAllAccounts(): Promise<Account[]>;

  // Transaction operations
  getTransactionsByAccountId(accountId: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, transactionData: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  getAllTransactions(): Promise<Transaction[]>;

  // Beneficiary operations
  getBeneficiariesByUserId(userId: number): Promise<Beneficiary[]>;
  createBeneficiary(beneficiary: InsertBeneficiary): Promise<Beneficiary>;

  // Service operations
  getAllServices(): Promise<Service[]>;
  getServicesByCategory(category: string): Promise<Service[]>;
  getServiceById(id: number): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  
  // Session operations
  createSession(session: InsertUserSession): Promise<UserSession>;
  updateSessionLogout(id: number, logoutTime: Date): Promise<UserSession | undefined>;
  getSessionsByUserId(userId: number): Promise<UserSession[]>;
  getAllSessions(): Promise<UserSession[]>;
  
  // Card operations
  getCardsByUserId(userId: number): Promise<Card[]>;
  getCardById(id: number): Promise<Card | undefined>;
  createCard(card: InsertCard): Promise<Card>;
  updateCard(id: number, cardData: Partial<Card>): Promise<Card | undefined>;
  updateCardStatus(id: number, status: string): Promise<Card | undefined>;
  updateCardBalance(id: number, balance: number): Promise<Card | undefined>;
  updateCardBalanceStatus(id: number, balanceStatus: string): Promise<Card | undefined>;
  getAllCards(): Promise<Card[]>;
  getPendingCards(): Promise<Card[]>;
  approveCard(id: number, adminId: number): Promise<Card | undefined>;
  rejectCard(id: number): Promise<Card | undefined>;
  
  // Card notification operations
  createCardNotification(notification: InsertCardNotification): Promise<CardNotification>;
  getCardNotificationsByUserId(userId: number): Promise<CardNotification[]>;
  getUnreadCardNotifications(): Promise<CardNotification[]>;
  markCardNotificationAsRead(id: number): Promise<CardNotification | undefined>;
  getAllCardNotifications(): Promise<CardNotification[]>;
  
  // App settings operations
  getSetting(key: string): Promise<AppSetting | undefined>;
  setSetting(key: string, value: string, description?: string, updatedBy?: number): Promise<AppSetting>;
  getAllSettings(): Promise<AppSetting[]>;
  
  // Initialization
  initializeDefaultData(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values({
      ...insertUser,
      lastLogin: new Date(),
      isAdmin: insertUser.isAdmin || 0
    }).returning();
    return result[0];
  }

  async updateUserLastLogin(id: number): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }
  
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const result = await db.update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }
  
  async setUserStatus(id: number, status: string): Promise<User | undefined> {
    // In this data model, user status would need to be added as a column
    // For now, we're not storing user status but returning the user
    // This maintains compatibility with the interface
    return this.getUser(id);
  }

  // Account operations
  async getAccountByUserId(userId: number): Promise<Account | undefined> {
    const result = await db.select().from(accounts).where(eq(accounts.userId, userId));
    return result[0];
  }

  async getAccountById(id: number): Promise<Account | undefined> {
    const result = await db.select().from(accounts).where(eq(accounts.id, id));
    return result[0];
  }

  async getAccountByNumber(accountNumber: string): Promise<Account | undefined> {
    const result = await db.select().from(accounts).where(eq(accounts.accountNumber, accountNumber));
    return result[0];
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    const result = await db.insert(accounts).values({
      ...account,
      balance: account.balance ?? 0,
      status: account.status ?? null,
      statusMessage: account.statusMessage ?? null,
      currency: account.currency ?? "COP"
    }).returning();
    return result[0];
  }

  async updateAccountBalance(id: number, amount: number): Promise<Account | undefined> {
    const account = await this.getAccountById(id);
    if (!account) return undefined;
    
    const result = await db.update(accounts)
      .set({ balance: account.balance + amount })
      .where(eq(accounts.id, id))
      .returning();
    return result[0];
  }
  
  async updateAccountStatus(id: number, status: string, statusMessage?: string): Promise<Account | undefined> {
    const updateData: any = { status };
    if (statusMessage !== undefined) {
      updateData.statusMessage = statusMessage;
    }
    
    const result = await db.update(accounts)
      .set(updateData)
      .where(eq(accounts.id, id))
      .returning();
    return result[0];
  }

  async updateAccount(id: number, accountData: Partial<InsertAccount>): Promise<Account | undefined> {
    const result = await db.update(accounts)
      .set(accountData)
      .where(eq(accounts.id, id))
      .returning();
    return result[0];
  }

  async deleteAccount(id: number): Promise<boolean> {
    const account = await this.getAccountById(id);
    if (!account) return false;
    
    // Delete all related transactions first
    await db.delete(transactions).where(eq(transactions.accountId, id));
    
    // Delete the account
    await db.delete(accounts).where(eq(accounts.id, id));
    return true;
  }
  
  async getAllAccounts(): Promise<Account[]> {
    return await db.select().from(accounts);
  }

  // Transaction operations
  async getTransactionsByAccountId(accountId: number): Promise<Transaction[]> {
    return await db.select()
      .from(transactions)
      .where(eq(transactions.accountId, accountId))
      .orderBy(desc(transactions.date));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const result = await db.insert(transactions).values({
      ...transaction,
      date: transaction.date || new Date(),
      reference: transaction.reference ?? null,
      recipientId: transaction.recipientId ?? null
    }).returning();
    return result[0];
  }
  
  async updateTransaction(id: number, transactionData: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const result = await db.update(transactions)
      .set(transactionData)
      .where(eq(transactions.id, id))
      .returning();
    return result[0];
  }
  
  async getAllTransactions(): Promise<Transaction[]> {
    return await db.select()
      .from(transactions)
      .orderBy(desc(transactions.date));
  }

  // Beneficiary operations
  async getBeneficiariesByUserId(userId: number): Promise<Beneficiary[]> {
    return await db.select()
      .from(beneficiaries)
      .where(eq(beneficiaries.userId, userId));
  }

  async createBeneficiary(beneficiary: InsertBeneficiary): Promise<Beneficiary> {
    const result = await db.insert(beneficiaries).values(beneficiary).returning();
    return result[0];
  }

  // Service operations
  async getAllServices(): Promise<Service[]> {
    return await db.select().from(services);
  }

  async getServicesByCategory(category: string): Promise<Service[]> {
    return await db.select()
      .from(services)
      .where(eq(services.category, category));
  }

  async getServiceById(id: number): Promise<Service | undefined> {
    const result = await db.select().from(services).where(eq(services.id, id));
    return result[0];
  }

  async createService(service: InsertService): Promise<Service> {
    const result = await db.insert(services).values({
      ...service,
      description: service.description ?? null
    }).returning();
    return result[0];
  }
  
  // Session operations
  async createSession(session: InsertUserSession): Promise<UserSession> {
    const result = await db.insert(userSessions).values({
      userId: session.userId,
      loginTime: session.loginTime || new Date(),
      logoutTime: null,
      ipAddress: session.ipAddress || null,
      userAgent: session.userAgent || null,
      sessionDuration: null
    }).returning();
    return result[0];
  }
  
  async updateSessionLogout(id: number, logoutTime: Date): Promise<UserSession | undefined> {
    const session = await db.select().from(userSessions).where(eq(userSessions.id, id));
    if (!session[0]) return undefined;
    
    const loginTime = new Date(session[0].loginTime);
    const duration = Math.floor((logoutTime.getTime() - loginTime.getTime()) / 1000);
    
    const result = await db.update(userSessions)
      .set({
        logoutTime,
        sessionDuration: duration
      })
      .where(eq(userSessions.id, id))
      .returning();
    
    return result[0];
  }
  
  async getSessionsByUserId(userId: number): Promise<UserSession[]> {
    return await db.select()
      .from(userSessions)
      .where(eq(userSessions.userId, userId))
      .orderBy(desc(userSessions.loginTime));
  }
  
  async getAllSessions(): Promise<UserSession[]> {
    return await db.select()
      .from(userSessions)
      .orderBy(desc(userSessions.loginTime));
  }
  
  // Card operations
  async getCardsByUserId(userId: number): Promise<Card[]> {
    return await db.select()
      .from(cards)
      .where(eq(cards.userId, userId))
      .orderBy(desc(cards.requestDate));
  }
  
  async getCardById(id: number): Promise<Card | undefined> {
    const result = await db.select().from(cards).where(eq(cards.id, id));
    return result[0];
  }
  
  async createCard(card: InsertCard): Promise<Card> {
    const result = await db.insert(cards).values({
      ...card,
      requestDate: new Date(),
      status: card.status || 'pending',
      balance: card.balance || 0,
      balanceStatus: card.balanceStatus || 'active'
    }).returning();
    return result[0];
  }
  
  async updateCard(id: number, cardData: Partial<Card>): Promise<Card | undefined> {
    const result = await db.update(cards)
      .set(cardData)
      .where(eq(cards.id, id))
      .returning();
    return result[0];
  }
  
  async updateCardStatus(id: number, status: string): Promise<Card | undefined> {
    const result = await db.update(cards)
      .set({ status })
      .where(eq(cards.id, id))
      .returning();
    return result[0];
  }
  
  async updateCardBalance(id: number, balance: number): Promise<Card | undefined> {
    const result = await db.update(cards)
      .set({ balance })
      .where(eq(cards.id, id))
      .returning();
    return result[0];
  }
  
  async updateCardBalanceStatus(id: number, balanceStatus: string): Promise<Card | undefined> {
    const result = await db.update(cards)
      .set({ balanceStatus })
      .where(eq(cards.id, id))
      .returning();
    return result[0];
  }
  
  async getAllCards(): Promise<Card[]> {
    return await db.select()
      .from(cards)
      .orderBy(desc(cards.requestDate));
  }
  
  async getPendingCards(): Promise<Card[]> {
    return await db.select()
      .from(cards)
      .where(eq(cards.status, 'pending'))
      .orderBy(desc(cards.requestDate));
  }
  
  async approveCard(id: number, adminId: number): Promise<Card | undefined> {
    const result = await db.update(cards)
      .set({ 
        status: 'active',
        approvedDate: new Date(),
        approvedBy: adminId
      })
      .where(eq(cards.id, id))
      .returning();
    return result[0];
  }
  
  async rejectCard(id: number): Promise<Card | undefined> {
    const result = await db.update(cards)
      .set({ status: 'rejected' })
      .where(eq(cards.id, id))
      .returning();
    return result[0];
  }
  
  // Card notification operations
  async createCardNotification(notification: InsertCardNotification): Promise<CardNotification> {
    const result = await db.insert(cardNotifications).values({
      ...notification,
      createdAt: new Date(),
      read: 0
    }).returning();
    return result[0];
  }
  
  async getCardNotificationsByUserId(userId: number): Promise<CardNotification[]> {
    return await db.select()
      .from(cardNotifications)
      .where(eq(cardNotifications.userId, userId))
      .orderBy(desc(cardNotifications.createdAt));
  }
  
  async getUnreadCardNotifications(): Promise<CardNotification[]> {
    return await db.select()
      .from(cardNotifications)
      .where(eq(cardNotifications.read, 0))
      .orderBy(desc(cardNotifications.createdAt));
  }
  
  async markCardNotificationAsRead(id: number): Promise<CardNotification | undefined> {
    const result = await db.update(cardNotifications)
      .set({ read: 1 })
      .where(eq(cardNotifications.id, id))
      .returning();
    return result[0];
  }
  
  async getAllCardNotifications(): Promise<CardNotification[]> {
    return await db.select()
      .from(cardNotifications)
      .orderBy(desc(cardNotifications.createdAt));
  }
  
  // App settings operations
  async getSetting(key: string): Promise<AppSetting | undefined> {
    const result = await db.select()
      .from(appSettings)
      .where(eq(appSettings.key, key));
    return result[0];
  }
  
  async setSetting(key: string, value: string, description?: string, updatedBy?: number): Promise<AppSetting> {
    // Check if setting already exists
    const existingSetting = await this.getSetting(key);
    
    if (existingSetting) {
      // Update existing setting
      const result = await db.update(appSettings)
        .set({ 
          value, 
          description: description || existingSetting.description,
          updatedAt: new Date(),
          updatedBy: updatedBy || existingSetting.updatedBy
        })
        .where(eq(appSettings.key, key))
        .returning();
      return result[0];
    } else {
      // Create new setting
      const result = await db.insert(appSettings).values({
        key,
        value,
        description,
        updatedBy
      }).returning();
      return result[0];
    }
  }
  
  async getAllSettings(): Promise<AppSetting[]> {
    return await db.select().from(appSettings);
  }
  
  // Initialize default data if database is empty
  async initializeDefaultData(): Promise<void> {
    // Check if admin user exists
    const adminExists = await this.getUserByUsername("admin");
    if (adminExists) {
      console.log("Default data already initialized");
      return;
    }
    
    console.log("Initializing default data...");
    
    // Create admin user
    const adminUser = await this.createUser({
      username: "admin",
      password: "admin2025",
      name: "Administrador Davivienda",
      email: "admin@davivienda.com",
      document: "1000000001",
      phone: "3209876543",
      isAdmin: 1
    });
    
    // Create admin account
    await this.createAccount({
      userId: adminUser.id,
      accountNumber: "999-000-000-01",
      accountType: "Administrativa",
      balance: 100000000000,
      status: "ACTIVA",
      statusMessage: null,
      currency: "COP"
    });
    
    // Create test user Coljuegos
    const testUser = await this.createUser({
      username: "1083838423",
      password: "1083",
      name: "Coljuegos S.A.S",
      email: "coljuegos@ejemplo.com",
      document: "1083838423",
      phone: "3001234567",
      isAdmin: 0
    });
    
    // Create test account
    const testAccount = await this.createAccount({
      userId: testUser.id,
      accountNumber: "1234567890",
      accountType: "Ahorros",
      balance: 4600000000,
      status: null,
      statusMessage: null,
      currency: "COP"
    });
    
    // Create José Nevares user
    const joseNevares = await this.createUser({
      username: "0551774416",
      password: "7416",
      name: "JOSE NEVARES",
      email: "josenevarez0551@gmail.com",
      document: "0551774416",
      phone: "+1 (912) 237-6412",
      isAdmin: 0
    });
    
    // Create José Nevares account
    const joseAccount = await this.createAccount({
      userId: joseNevares.id,
      accountNumber: "977-895-707-25",
      accountType: "Ahorros",
      balance: 4252500000,
      status: "BLOQUEADA",
      statusMessage: "Fondos retenidos hasta levantar bloqueo y retenciones",
      currency: "USD"
    });
    
    // Create Yolanda user
    const yolandaUser = await this.createUser({
      username: "@yolandapablojeronimo",
      password: "261688",
      name: "Yolanda Jeronimo Pablo",
      email: "yolanda.pablo@ejemplo.com",
      document: "YJP12345",
      phone: "+52 9981234567",
      isAdmin: 0
    });
    
    // Create Yolanda account
    const yolandaAccount = await this.createAccount({
      userId: yolandaUser.id,
      accountNumber: "912-456-029-09",
      accountType: "Ahorros",
      balance: 557026,
      status: "ACTIVA",
      statusMessage: null,
      currency: "COP"
    });
    
    // Create sample transactions for test account
    await this.createTransaction({
      accountId: testAccount.id,
      amount: 500000,
      description: "Nómina",
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      type: "deposit",
      reference: `REF-${Math.floor(Math.random() * 1000000)}`,
      recipientId: null
    });
    
    await this.createTransaction({
      accountId: testAccount.id,
      amount: 120000,
      description: "Pago Netflix",
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      type: "withdrawal",
      reference: `REF-${Math.floor(Math.random() * 1000000)}`,
      recipientId: null
    });
    
    await this.createTransaction({
      accountId: testAccount.id,
      amount: 300000,
      description: "Transferencia a Juan Pérez",
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      type: "transfer",
      reference: `REF-${Math.floor(Math.random() * 1000000)}`,
      recipientId: 2
    });
    
    // Create transaction for José Nevares
    await this.createTransaction({
      accountId: joseAccount.id,
      amount: 4252500000,
      description: "Consignación recibida - COLJUEGOS S.A.S",
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      type: "deposit",
      reference: `REF-${Math.floor(Math.random() * 1000000)}`,
      recipientId: null
    });
    
    // Create transactions for Yolanda
    await this.createTransaction({
      accountId: yolandaAccount.id,
      amount: 320000,
      description: "INDEMNIZACION",
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      type: "deposit",
      reference: "REF-IND-20250327",
      recipientId: null
    });
    
    await this.createTransaction({
      accountId: yolandaAccount.id,
      amount: 237026,
      description: "DEVOLUCION-INDEMNIZACION",
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      type: "deposit",
      reference: "REF-DEV-20250430",
      recipientId: null
    });
    
    // Create default services
    const defaultServices = [
      { name: "ENEL", category: "electricity", description: "Servicio de electricidad" },
      { name: "EPM", category: "electricity", description: "Empresas Públicas de Medellín" },
      { name: "ESSA", category: "electricity", description: "Electrificadora de Santander" },
      { name: "Aguas de Bogotá", category: "water", description: "Servicio de agua en Bogotá" },
      { name: "Emcali", category: "water", description: "Servicios públicos de Cali" },
      { name: "Claro", category: "phone", description: "Servicio de telefonía móvil" },
      { name: "Movistar", category: "phone", description: "Servicio de telefonía e internet" },
      { name: "ETB", category: "internet", description: "Empresa de Telecomunicaciones de Bogotá" },
      { name: "DirecTV", category: "tv", description: "Servicio de televisión" },
    ];
    
    for (const service of defaultServices) {
      await this.createService(service);
    }
    
    // Create default beneficiaries for test user
    const defaultBeneficiaries = [
      { userId: testUser.id, name: "Beneficiario Bancolombia", bank: "Bancolombia", accountNumber: "9876543210", accountType: "Ahorros" },
      { userId: testUser.id, name: "Beneficiario BBVA", bank: "BBVA Colombia", accountNumber: "5678901234", accountType: "Corriente" },
      { userId: testUser.id, name: "Beneficiario Occidente", bank: "Banco de Occidente", accountNumber: "2468013579", accountType: "Ahorros" },
      { userId: testUser.id, name: "Beneficiario Banco Popular", bank: "Banco Popular", accountNumber: "1357924680", accountType: "Corriente" },
      { userId: testUser.id, name: "Beneficiario Caja Social", bank: "Banco Caja Social", accountNumber: "3141592653", accountType: "Ahorros" },
    ];
    
    for (const beneficiary of defaultBeneficiaries) {
      await this.createBeneficiary(beneficiary);
    }
    
    // Create default app settings
    await this.setSetting("support_phone", "+573181527700", "Número de WhatsApp de soporte al cliente", adminUser.id);
    
    console.log("Default data initialized successfully");
  }
}

// Create and export an instance of the storage
export const storage = new DatabaseStorage();
