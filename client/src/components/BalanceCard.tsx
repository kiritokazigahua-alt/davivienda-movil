import { Eye, FileText, Share2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import { CurrencyCode } from '@/types';

const BalanceCard = () => {
  const setAccount = useStore((state) => state.setAccount);

  const { data: account, isLoading } = useQuery({
    queryKey: ['/api/account'],
    onSuccess: (data) => {
      setAccount(data);
    },
  });

  const formatAccountNumber = (accountNumber?: string) => {
    if (!accountNumber) return '**** 0000';
    return `**** ${accountNumber.slice(-4)}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
      <div className="bg-primary text-white p-4">
        <h2 className="text-sm font-medium">{account?.accountType || 'Cuenta de Ahorros'}</h2>
        <p className="text-xs opacity-80">{formatAccountNumber(account?.accountNumber)}</p>
        <div className="mt-2">
          <p className="text-sm">Saldo disponible</p>
          <p className="text-2xl font-bold" data-testid="text-card-balance">
            {isLoading ? 'Cargando...' : (
              <>{formatCurrency(account?.balance || 0, account?.currency as CurrencyCode)}<span className="text-sm ml-1 opacity-70">{account?.currency || 'COP'}</span></>
            )}
          </p>
        </div>
      </div>
      <div className="p-4 flex justify-between">
        <button className="text-primary text-sm font-medium flex flex-col items-center">
          <Eye className="mb-1 h-5 w-5" />
          <span>Ver detalles</span>
        </button>
        <button className="text-primary text-sm font-medium flex flex-col items-center">
          <FileText className="mb-1 h-5 w-5" />
          <span>Extractos</span>
        </button>
        <button className="text-primary text-sm font-medium flex flex-col items-center">
          <Share2 className="mb-1 h-5 w-5" />
          <span>Compartir</span>
        </button>
      </div>
    </div>
  );
};

export default BalanceCard;
