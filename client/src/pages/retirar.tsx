import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Copy, AlertCircle, MessageCircleIcon } from 'lucide-react';
import { useSupportPhone } from '@/hooks/use-support-phone';
import { useStore } from '@/lib/store';
import { Account } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

const RetirarPage = () => {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useStore();
  const { openWhatsApp } = useSupportPhone((user as any)?.customSupportPhone);
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [withdrawalCode, setWithdrawalCode] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const { data: account } = useQuery<Account>({
    queryKey: ['/api/account'],
  });
  
  const withdrawMutation = useMutation({
    mutationFn: async () => {
      if (!amount) {
        throw new Error('Por favor ingrese un monto válido');
      }
      
      const parsedAmount = parseFloat(amount.replace(/,/g, ''));
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Por favor ingrese un monto válido');
      }
      
      try {
        const res = await apiRequest('POST', '/api/transactions/withdrawal', {
          amount: parsedAmount,
          method: 'código',
          description: 'Retiro sin tarjeta'
        });
        
        // Verificar si la respuesta es exitosa (2xx)
        if (!res.ok) {
          const errorData = await res.json();
          if (errorData.error_code === "4004") {
            throw { 
              response: errorData,
              message: errorData.message || "No puede realizar retiros. Cuenta bloqueada por retenciones pendientes."
            };
          }
          throw new Error(errorData.message || 'Error en el retiro');
        }
        
        return res.json();
      } catch (error) {
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/account'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      // Generar un código aleatorio de 6 dígitos
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setWithdrawalCode(code);
      setShowCodeDialog(true);
      setAmount('');
    },
    onError: (error: any) => {
      // Comprobar si el error contiene el código 4004 (cuenta bloqueada)
      if (error?.response?.error_code === "4004" || 
          (typeof error.message === 'string' && error.message.includes('4004'))) {
        setErrorCode("4004");
        setErrorMessage(error?.response?.message || "No puede realizar retiros. Cuenta bloqueada por retenciones pendientes.");
      } else {
        toast({
          title: "Error en el retiro",
          description: error instanceof Error ? error.message : "Ocurrió un error inesperado",
          variant: "destructive",
        });
      }
    },
    onSettled: () => {
      setIsLoading(false);
    }
  });

  const handleWithdraw = () => {
    setIsLoading(true);
    setErrorCode(null);
    setErrorMessage(null);
    withdrawMutation.mutate();
  };
  
  const handleContactSupport = () => {
    openWhatsApp("Hola, necesito ayuda con mi cuenta. Tengo un error #4004");
  };

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(withdrawalCode);
    toast({
      title: "Código copiado",
      description: "El código ha sido copiado al portapapeles",
    });
  };

  return (
    <div className="flex flex-col h-full">
      {isLoading && <LoadingOverlay text="Procesando retiro..." />}
      
      {/* Header */}
      <div className="bg-red-600 text-white p-4">
        <div className="flex items-center">
          <button 
            onClick={() => navigate('/home')} 
            className="mr-2 text-white hover:bg-red-700 p-1 rounded"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-semibold">Retirar sin tarjeta</h1>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4 bg-gray-100">
        {/* Error de cuenta bloqueada */}
        {errorCode === "4004" && (
          <Alert className="mb-4 border-yellow-500 bg-yellow-50">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
              <AlertDescription className="text-black font-medium">{errorMessage}</AlertDescription>
            </div>
            <div className="mt-3">
              <Button 
                className="bg-red-600 hover:bg-red-700 text-white flex items-center"
                onClick={handleContactSupport}
              >
                <MessageCircleIcon className="h-4 w-4 mr-2" />
                Contactar soporte
              </Button>
            </div>
          </Alert>
        )}
        
        {/* Alerta si la cuenta ya está bloqueada */}
        {account?.status === "BLOQUEADA" && !errorCode && (
          <Alert className="mb-4 border-yellow-500 bg-yellow-50">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
              <AlertDescription className="text-black font-medium">
                Su cuenta se encuentra bloqueada. No podrá realizar retiros hasta resolver las retenciones pendientes.
              </AlertDescription>
            </div>
            <div className="mt-3">
              <Button 
                className="bg-red-600 hover:bg-red-700 text-white flex items-center"
                onClick={handleContactSupport}
              >
                <MessageCircleIcon className="h-4 w-4 mr-2" />
                Contactar soporte
              </Button>
            </div>
          </Alert>
        )}
        
        {/* Balance Card */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <p className="text-sm text-gray-600">Saldo disponible</p>
          <p className="text-2xl font-bold">
            {account ? `$${account.balance.toLocaleString('es-CO')}` : 'Cargando...'}
          </p>
        </div>
        
        {/* Withdrawal Info */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h3 className="font-medium mb-2 text-gray-800">¿Cómo funciona?</h3>
          <p className="text-sm text-gray-600 mb-4">
            1. Ingresa el monto que deseas retirar y presiona "Generar código".<br />
            2. Recibirás un código de retiro de 6 dígitos.<br />
            3. Ve a cualquier cajero Davivienda y selecciona "Retiro sin tarjeta".<br />
            4. Ingresa el código de retiro y retira tu dinero.
          </p>
          <p className="text-xs text-gray-500 italic">
            El código de retiro tiene una validez de 24 horas.
          </p>
        </div>
        
        {/* Withdraw Form */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h3 className="font-medium mb-4 text-red-600">Generar código de retiro</h3>
          
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleWithdraw(); }}>
            <div>
              <Label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Monto a retirar
              </Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                <Input
                  id="amount"
                  type="text"
                  className="w-full pl-8"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[50000, 100000, 200000, 500000].map(value => (
                  <Button 
                    key={value}
                    type="button"
                    variant="outline"
                    className="text-sm"
                    onClick={() => setAmount(value.toString())}
                  >
                    ${value.toLocaleString()}
                  </Button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                disabled={!amount}
              >
                Generar código
              </Button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Código de retiro Dialog */}
      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Código de retiro generado</DialogTitle>
            <DialogDescription>
              Usa este código para retirar tu dinero en cualquier cajero Davivienda.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-6">
            <div className="text-center mb-6">
              <p className="text-sm text-gray-600 mb-2">Tu código de retiro es:</p>
              <div className="bg-gray-100 p-4 rounded-md flex items-center justify-center">
                <span className="text-3xl font-mono tracking-wider">{withdrawalCode}</span>
                <button 
                  className="ml-2 p-2 hover:bg-gray-200 rounded-full"
                  onClick={copyCodeToClipboard}
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
            
            <div className="bg-yellow-50 p-3 rounded-md text-sm text-yellow-800 mb-4">
              <p className="font-medium">¡Importante!</p>
              <p>Este código tiene una validez de 24 horas. Por seguridad, no lo compartas con nadie.</p>
            </div>
            
            <div className="text-center">
              <Button 
                variant="outline" 
                onClick={() => navigate('/home')}
                className="w-full"
              >
                Volver al inicio
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RetirarPage;