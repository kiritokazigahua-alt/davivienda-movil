import { useAccount, useTransactions } from "@/hooks/use-accounts";
import { useRoute } from "wouter";
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Download, Calendar } from "lucide-react";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";
import { CurrencyCode } from "@/types";
import { formatCurrency } from "@/lib/utils";

const formatDate = (dateString: string | null) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("es-CO", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
};

export default function AccountDetails() {
  const [match, params] = useRoute("/account/:id");
  const id = parseInt(params?.id || "0");
  
  const { data: account, isLoading: isAccountLoading } = useAccount(id);
  const { data: transactions, isLoading: isTransactionsLoading } = useTransactions(id);

  if (isAccountLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-[#ED1C24] animate-spin" />
      </div>
    );
  }

  if (!account) return <div>Cuenta no encontrada</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 pt-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Navigation */}
        <Link href="/dashboard" className="inline-flex items-center text-gray-500 hover:text-[#ED1C24] font-medium mb-6 transition">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Volver a mis productos
        </Link>

        {/* Account Header */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 rounded-full -mr-32 -mt-32 pointer-events-none opacity-50" />
          
          <div className="relative z-10">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{account.type}</h1>
            <p className="text-gray-500 font-mono text-lg mb-6">No. {account.accountNumber}</p>
            
            <div className="flex flex-col sm:flex-row justify-between items-end gap-4 border-t border-gray-100 pt-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Saldo total</p>
                <p className="text-4xl font-bold text-gray-900 tracking-tight" data-testid="text-account-balance">
                  {formatCurrency(account.balance, account.currency as CurrencyCode)}<span className="text-lg ml-1 opacity-60">{account.currency || 'COP'}</span>
                </p>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition">
                  <Download className="w-4 h-4" />
                  Extractos
                </button>
                <button className="px-6 py-2 bg-[#ED1C24] hover:bg-[#C4151C] text-white rounded-lg text-sm font-bold shadow-lg shadow-red-500/20 transition">
                  Transferir
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-900">Movimientos recientes</h2>
            <button className="text-sm text-[#ED1C24] font-medium hover:underline">Ver todos</button>
          </div>

          <div className="divide-y divide-gray-100">
            {isTransactionsLoading ? (
              <div className="p-8 text-center text-gray-500">Cargando movimientos...</div>
            ) : transactions?.length === 0 ? (
              <div className="p-12 text-center text-gray-400">No hay movimientos recientes</div>
            ) : (
              transactions?.map((tx) => (
                <div key={tx.id} className="p-5 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.type === 'Credit' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {tx.type === 'Credit' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 group-hover:text-[#ED1C24] transition-colors">
                        {tx.description}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <p className="text-xs text-gray-500">{formatDate(tx.date?.toString() || null)}</p>
                      </div>
                    </div>
                  </div>
                  <span className={`font-mono font-medium ${
                    tx.type === 'Credit' ? 'text-green-600' : 'text-gray-900'
                  }`}>
                    {tx.type === 'Credit' ? '+' : '-'} {formatCurrency(tx.amount, account.currency as CurrencyCode)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
