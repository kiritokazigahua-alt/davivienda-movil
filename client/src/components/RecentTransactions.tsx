import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '@/lib/store';
import TransactionItem from '@/components/TransactionItem';
import { CurrencyCode } from '@/types';

const RecentTransactions = () => {
  const [_, navigate] = useLocation();
  const setTransactions = useStore((state) => state.setTransactions);
  const account = useStore((state) => state.account);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['/api/transactions'],
    onSuccess: (data) => {
      setTransactions(data);
    },
  });

  const navigateToHistory = () => {
    navigate('/history');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium">Movimientos recientes</h3>
        <button 
          className="text-primary text-sm"
          onClick={navigateToHistory}
        >
          Ver todos
        </button>
      </div>
      
      {isLoading ? (
        <div className="py-8 text-center text-gray-500">Cargando transacciones...</div>
      ) : transactions && transactions.length > 0 ? (
        transactions.slice(0, 4).map((transaction) => (
          <TransactionItem key={transaction.id} transaction={transaction} currency={account?.currency as CurrencyCode} />
        ))
      ) : (
        <div className="py-8 text-center text-gray-500">No hay transacciones recientes</div>
      )}
    </div>
  );
};

export default RecentTransactions;
