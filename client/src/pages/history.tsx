import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { ArrowLeft, Calendar, Download, Search } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Transaction, CurrencyCode } from '@/types';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const HistoryPage = () => {
  const [_, navigate] = useLocation();
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const account = useStore((state) => state.account);
  const acctCurrency = (account?.currency as CurrencyCode) || 'COP';

  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });

  useEffect(() => {
    if (transactions) {
      let filtered = [...transactions];
      
      // Filtrar por tipo
      if (filter !== 'all') {
        filtered = filtered.filter(t => t.type === filter);
      }
      
      // Filtrar por término de búsqueda
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(t => 
          t.description.toLowerCase().includes(term) ||
          (t.reference && t.reference.toLowerCase().includes(term))
        );
      }

      setFilteredTransactions(filtered);
    }
  }, [transactions, filter, searchTerm]);

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'text-green-600';
      case 'withdrawal':
      case 'transfer':
      case 'payment':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTransactionSign = (type: string) => {
    return type === 'deposit' ? '+' : '-';
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'Depósito';
      case 'withdrawal':
        return 'Retiro';
      case 'transfer':
        return 'Transferencia';
      case 'payment':
        return 'Pago';
      default:
        return type;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-[#D50000] text-white p-4">
        <div className="flex items-center">
          <button 
            onClick={() => navigate('/home')} 
            className="mr-2 text-white hover:bg-[#BF0000] p-1 rounded"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-semibold">Historial de Movimientos</h1>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4 bg-gray-100">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Buscar por descripción o referencia"
                  className="w-full pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="filter" className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de transacción
              </Label>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger id="filter">
                  <SelectValue placeholder="Todos los movimientos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los movimientos</SelectItem>
                  <SelectItem value="deposit">Depósitos</SelectItem>
                  <SelectItem value="withdrawal">Retiros</SelectItem>
                  <SelectItem value="transfer">Transferencias</SelectItem>
                  <SelectItem value="payment">Pagos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button variant="outline" className="w-full flex items-center">
                <Download className="mr-2 h-4 w-4" />
                <span>Exportar movimientos</span>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Transactions List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
            <h3 className="font-medium">Listado de movimientos</h3>
          </div>
          
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-[#D50000] border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-500">Cargando movimientos...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No se encontraron movimientos</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Calendar className="h-3.5 w-3.5 mr-1" />
                        <span>{formatDateTime(transaction.date, true)}</span>
                      </div>
                      {transaction.reference && (
                        <p className="text-xs text-gray-500 mt-1">Ref: {transaction.reference}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${getTransactionColor(transaction.type)}`}>
                        {getTransactionSign(transaction.type)} {formatCurrency(transaction.amount, acctCurrency)}<span className="text-[10px] ml-0.5 opacity-60">{acctCurrency}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {getTransactionTypeLabel(transaction.type)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;