// User types
export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  document: string;
  phone: string;
  lastLogin: string;
  isAdmin?: number;
}

export interface UserSession {
  id: number;
  userId: number;
  loginTime: string;
  logoutTime: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  sessionDuration: number | null;
}

// Currency types
export const CURRENCIES = {
  USD: { code: "USD", symbol: "$", name: "Dólar estadounidense" },
  EUR: { code: "EUR", symbol: "€", name: "Euro" },
  COP: { code: "COP", symbol: "$", name: "Peso colombiano" },
  GBP: { code: "GBP", symbol: "£", name: "Libra esterlina" },
  BRL: { code: "BRL", symbol: "R$", name: "Real brasileño" },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

// Account types
export interface Account {
  id: number;
  userId: number;
  accountNumber: string;
  accountType: string;
  balance: number;
  status?: string;
  statusMessage?: string;
  currency?: CurrencyCode;
}

// Transaction types
export interface Transaction {
  id: number;
  accountId: number;
  amount: number;
  description: string;
  date: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'payment';
  reference?: string;
  recipientId?: number | null;
}

// Beneficiary types
export interface Beneficiary {
  id: number;
  userId: number;
  name: string;
  bank: string;
  accountNumber: string;
  accountType: string;
  phone?: string | null;
  email?: string | null;
}

// Service types
export interface Service {
  id: number;
  name: string;
  category: 'electricity' | 'water' | 'phone' | 'internet' | 'tv';
  description?: string;
}

// Card types
export type CardStatus = 'pending' | 'active' | 'blocked' | 'frozen' | 'rejected';
export type BalanceStatus = 'active' | 'blocked' | 'frozen';
export type CardRequestType = 'request' | 'register';

export interface Card {
  id: number;
  userId: number;
  cardNumber: string;
  cardType: string;
  cardBrand: string;
  expirationDate: string;
  cvv?: string;
  status: CardStatus;
  balance: number;
  balanceStatus: BalanceStatus;
  requestType: CardRequestType;
  requestDate: string;
  approvedDate?: string;
  approvedBy?: number;
}

export interface CardNotification {
  id: number;
  userId: number;
  cardId?: number;
  type: string;
  message: string;
  read: number;
  createdAt: string;
}
