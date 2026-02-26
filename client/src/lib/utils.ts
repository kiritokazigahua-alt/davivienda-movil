import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import { CURRENCIES, CurrencyCode } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LOCALE_MAP: Record<string, string> = {
  COP: 'es-CO',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  BRL: 'pt-BR',
};

const DECIMAL_CURRENCIES = new Set(['USD', 'EUR', 'GBP', 'BRL']);

export function formatCurrency(amount: number, currencyCode?: CurrencyCode): string {
  const currency = currencyCode || 'COP';
  const currencyInfo = CURRENCIES[currency] || CURRENCIES.COP;
  const locale = LOCALE_MAP[currency] || 'es-CO';
  const useDecimals = DECIMAL_CURRENCIES.has(currency);

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: useDecimals ? 2 : 0,
    maximumFractionDigits: useDecimals ? 2 : 0,
  }).format(amount);

  return `${currencyInfo.symbol}${formatted}`;
}

export function formatCurrencyWithCode(amount: number, currencyCode?: CurrencyCode): string {
  const currency = currencyCode || 'COP';
  const base = formatCurrency(amount, currency as CurrencyCode);
  return `${base} ${currency}`;
}

export function getCurrencySymbol(currencyCode?: CurrencyCode): string {
  const currency = currencyCode || 'COP';
  return CURRENCIES[currency]?.symbol || CURRENCIES.COP.symbol;
}

export function formatToLocaleMonth(month: number, year: number): string {
  const date = new Date(year, month, 1);
  return format(date, 'MMMM yyyy', { locale: es });
}

export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber || accountNumber.length < 4) return '****';
  return `**** ${accountNumber.slice(-4)}`;
}

export function getTransactionIcon(type: string, description: string = '') {
  return 'swap_horiz';
}

export function formatDateTime(isoDate: string, showTime: boolean = true): string {
  const date = new Date(isoDate);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday && showTime) {
    return `Hoy, ${format(date, 'h:mm a', { locale: es })}`;
  } else if (showTime) {
    return format(date, "d MMM, h:mm a", { locale: es });
  } else {
    return format(date, "d MMM yyyy", { locale: es });
  }
}
