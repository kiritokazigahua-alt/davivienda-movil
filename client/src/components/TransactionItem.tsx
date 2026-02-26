import { Transaction, CurrencyCode } from '@/types';
import { 
  SquareSplitHorizontal, 
  ArrowDown, 
  ArrowUp, 
  CreditCard, 
  ShoppingCart, 
  Home, 
  Droplets 
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TransactionItemProps {
  transaction: Transaction;
  currency?: CurrencyCode;
}

const TransactionItem = ({ transaction, currency }: TransactionItemProps) => {
  const getIcon = () => {
    if (transaction.type === 'transfer') {
      return <SquareSplitHorizontal className="text-neutral" size={20} />;
    } else if (transaction.type === 'deposit') {
      return <ArrowDown className="text-success" size={20} />;
    } else if (transaction.type === 'withdrawal') {
      return <ArrowUp className="text-neutral" size={20} />;
    } else if (transaction.type === 'payment') {
      if (transaction.description.toLowerCase().includes('enel') || 
          transaction.description.toLowerCase().includes('electricidad')) {
        return <CreditCard className="text-neutral" size={20} />;
      } else if (transaction.description.toLowerCase().includes('agua')) {
        return <Droplets className="text-neutral" size={20} />;
      } else if (transaction.description.toLowerCase().includes('arriendo')) {
        return <Home className="text-neutral" size={20} />;
      } else {
        return <CreditCard className="text-neutral" size={20} />;
      }
    } else {
      return <ShoppingCart className="text-neutral" size={20} />;
    }
  };

  const formatTransactionDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'd MMM, h:mm a', { locale: es });
  };

  const getTypeLabel = () => {
    switch (transaction.type) {
      case 'transfer':
        return 'Transferencia';
      case 'deposit':
        return 'Depósito';
      case 'withdrawal':
        return 'Retiro';
      case 'payment':
        return 'Pago de servicio';
      default:
        return 'Transacción';
    }
  };

  return (
    <div className="transaction-item py-3 border-b last:border-b-0" data-testid={`transaction-item-${transaction.id}`}>
      <div className="flex items-center">
        <div className="bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center mr-3">
          {getIcon()}
        </div>
        <div className="flex-1">
          <p className="font-medium text-sm">{transaction.description}</p>
          <p className="text-xs text-gray-500">{formatTransactionDate(transaction.date)}</p>
        </div>
        <div className="text-right">
          <p className={`font-medium text-sm ${transaction.amount < 0 ? 'text-red-600' : 'text-success'}`}>
            {transaction.amount < 0 ? '' : '+'}{formatCurrency(transaction.amount, currency)}
            {currency && <span className="text-[10px] ml-0.5 opacity-60">{currency}</span>}
          </p>
          <p className="text-xs text-gray-500">{getTypeLabel()}</p>
        </div>
      </div>
    </div>
  );
};

export default TransactionItem;
