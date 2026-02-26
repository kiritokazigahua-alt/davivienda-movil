import { useAuth } from "@/hooks/use-auth";
import { useAccounts } from "@/hooks/use-accounts";
import { Link, useLocation } from "wouter";
import { 
  ArrowRight, 
  Wallet, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  MoreHorizontal,
  DollarSign,
  Shield
} from "lucide-react";
import { Loader2 } from "lucide-react";
import { CURRENCIES, CurrencyCode } from "@/types";

import { formatCurrency } from "@/lib/utils";

// Mask account number
const maskAccount = (num: string) => `****${num.slice(-4)}`;

export default function Dashboard() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { data: accounts, isLoading: isAccountsLoading } = useAccounts();
  const [, setLocation] = useLocation();

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-[#ED1C24] animate-spin" />
      </div>
    );
  }

  if (!user) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white pb-24 pt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold">
                Hola, {user.fullName?.split(" ")[0]}
              </h1>
              <p className="text-gray-400 mt-1 text-sm">
                Último ingreso: {new Date().toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-3">
              <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition backdrop-blur-sm flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Seguridad
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Transferir", icon: ArrowUpRight, color: "bg-red-50 text-red-600" },
            { label: "Pagar", icon: CreditCard, color: "bg-blue-50 text-blue-600" },
            { label: "Retiros", icon: DollarSign, color: "bg-green-50 text-green-600" },
            { label: "Más", icon: MoreHorizontal, color: "bg-purple-50 text-purple-600" },
          ].map((action, i) => (
            <button 
              key={i}
              className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 flex flex-col items-center justify-center gap-3 group"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${action.color} group-hover:scale-110 transition-transform`}>
                <action.icon className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-gray-700">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Accounts List */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#ED1C24]" />
            Mis Productos
          </h2>

          {isAccountsLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="h-40 bg-white rounded-2xl shadow-sm animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {accounts?.map((account) => (
                <div 
                  key={account.id}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-[#ED1C24]/20 transition-all duration-300 group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <div>
                      <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">
                        {account.type}
                      </p>
                      <p className="text-lg font-mono font-bold text-gray-800 mt-1">
                        {maskAccount(account.accountNumber)}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#ED1C24] transition-colors duration-300">
                      <Wallet className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                    </div>
                  </div>

                  <div className="mb-6 relative z-10">
                    <p className="text-xs text-gray-400 mb-1">Saldo disponible</p>
                    <p className="text-3xl font-bold text-gray-900 tracking-tight" data-testid={`text-balance-${account.id}`}>
                      {formatCurrency(account.balance, account.currency as CurrencyCode)}<span className="text-sm ml-1 opacity-60">{account.currency || 'COP'}</span>
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-50 relative z-10">
                    <Link 
                      href={`/account/${account.id}`}
                      className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 group/btn"
                    >
                      Ver movimientos
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover/btn:text-[#ED1C24] group-hover/btn:translate-x-0.5 transition-all" />
                    </Link>
                    <button className="flex-1 bg-[#ED1C24] hover:bg-[#C4151C] text-white py-2.5 rounded-lg text-sm font-medium transition shadow-lg shadow-red-500/20">
                      Transferir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Marketing Banner */}
        <div className="mt-10 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          <div className="relative z-10 max-w-lg">
            <h3 className="text-2xl font-bold font-display mb-2">Abra su inversión virtual</h3>
            <p className="text-blue-100 mb-6">Incremente su rentabilidad con tasas preferenciales desde la comodidad de su casa.</p>
            <button className="bg-white text-blue-700 px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-blue-50 transition shadow-lg">
              Conocer más
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
