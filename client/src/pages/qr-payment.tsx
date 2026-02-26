import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { Account } from '@/types';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, CircleCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const QrPaymentPage = () => {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [recipientInfo, setRecipientInfo] = useState<{
    accountNumber: string;
    accountType: string;
    userName: string;
  } | null>(null);

  // Obtener los parámetros de la URL
  const params = new URLSearchParams(window.location.search);
  const encodedData = params.get('data');
  
  // Obtener la información de la cuenta del usuario actual
  const { data: account } = useQuery<Account>({
    queryKey: ['/api/account'],
  });
  
  // Decodificar los datos del QR escaneado
  useEffect(() => {
    if (encodedData) {
      try {
        const decodedData = JSON.parse(decodeURIComponent(encodedData));
        setRecipientInfo(decodedData);
      } catch (error) {
        toast({
          title: "Error al procesar el código QR",
          description: "El código QR no contiene información válida",
          variant: "destructive",
        });
        navigate('/qr');
      }
    } else {
      // Si no hay datos, redirigir a la página de QR
      navigate('/qr');
    }
  }, [encodedData, navigate, toast]);
  
  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!amount || !recipientInfo) {
        throw new Error('Por favor ingrese un monto válido');
      }
      
      const parsedAmount = parseFloat(amount.replace(/,/g, ''));
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Por favor ingrese un monto válido');
      }
      
      if (account?.balance && parsedAmount > account.balance) {
        throw new Error('Fondos insuficientes para realizar la transferencia');
      }
      
      // Realizar la transferencia a través de la API
      const res = await apiRequest('POST', '/api/transactions/transfer', {
        recipientAccount: recipientInfo.accountNumber,
        recipientBank: 'Davivienda',
        recipientName: recipientInfo.userName,
        accountType: recipientInfo.accountType,
        amount: parsedAmount,
        description: 'Pago por QR'
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/account'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      setShowSuccessDialog(true);
      setAmount('');
    },
    onError: (error) => {
      toast({
        title: "Error en la transferencia",
        description: error instanceof Error ? error.message : "Ocurrió un error inesperado",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsLoading(false);
    }
  });
  
  const handleTransfer = () => {
    setIsLoading(true);
    transferMutation.mutate();
  };
  
  const handleSuccessClose = () => {
    setShowSuccessDialog(false);
    navigate('/home');
  };

  // Formatear el monto para visualización
  const formatAmount = (value: string) => {
    // Eliminar no numéricos excepto puntos y comas
    const cleaned = value.replace(/[^\d,.]/g, '');
    // Convertir a número y formatear
    const number = parseFloat(cleaned.replace(/,/g, ''));
    if (isNaN(number)) return '';
    return number.toLocaleString('es-CO');
  };

  return (
    <div className="flex flex-col h-full">
      {isLoading && <LoadingOverlay text="Procesando pago..." />}
      
      {/* Header */}
      <div className="bg-primary text-white p-4">
        <div className="flex items-center">
          <button 
            onClick={() => navigate('/qr')} 
            className="mr-2 text-white hover:bg-red-700 p-1 rounded"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-semibold">Confirmar pago QR</h1>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4 bg-gray-100">
        {/* Información del destinatario */}
        {recipientInfo && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <h3 className="font-medium mb-3 text-primary">Datos del Destinatario</h3>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">Nombre</p>
                <p className="font-medium">{recipientInfo.userName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Número de cuenta</p>
                <p className="font-medium">{recipientInfo.accountNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tipo de cuenta</p>
                <p className="font-medium">{recipientInfo.accountType}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Balance del usuario */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <p className="text-sm text-gray-600">Tu saldo disponible</p>
          <p className="text-xl font-bold">
            {account ? `$${account.balance.toLocaleString('es-CO')}` : 'Cargando...'}
          </p>
        </div>
        
        {/* Formulario de transferencia */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h3 className="font-medium mb-4 text-gray-800">Ingresa el valor a transferir</h3>
          
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleTransfer(); }}>
            <div>
              <Label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Valor
              </Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                <Input
                  id="amount"
                  type="text"
                  className="w-full pl-8"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(formatAmount(e.target.value))}
                  required
                />
              </div>
              
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[20000, 50000, 100000, 200000].map(value => (
                  <Button 
                    key={value}
                    type="button"
                    variant="outline"
                    className="text-sm"
                    onClick={() => setAmount(value.toLocaleString('es-CO'))}
                  >
                    ${value.toLocaleString('es-CO')}
                  </Button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white"
                disabled={!amount || isLoading}
              >
                Confirmar y pagar
              </Button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Diálogo de éxito */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pago exitoso</DialogTitle>
          </DialogHeader>
          
          <div className="p-6 flex flex-col items-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CircleCheck size={32} className="text-green-600" />
            </div>
            <p className="text-center mb-4">
              Has realizado un pago exitoso de <span className="font-bold">${amount}</span> a {recipientInfo?.userName}.
            </p>
            <Button 
              className="w-full bg-primary hover:bg-primary/90 text-white"
              onClick={handleSuccessClose}
            >
              Volver al inicio
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QrPaymentPage;