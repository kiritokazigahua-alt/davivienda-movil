import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Copy } from 'lucide-react';
import { LoadingOverlay } from '../LoadingOverlay';
import { apiRequest, queryClient } from '@/lib/queryClient';

export const WithdrawalCodeDialog = ({ 
  isOpen, 
  onClose, 
  code, 
  method, 
  instructions 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  code: string, 
  method: string, 
  instructions: string 
}) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      (err) => {
        
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="bg-[#D50000] text-white p-4 rounded-t-lg">
          <DialogTitle className="text-center text-white">Código de Retiro Generado</DialogTitle>
        </DialogHeader>
        <div className="p-6">
          <div className="text-center py-4">
            <h4 className="text-xl font-bold mb-4">Retiro por {method}</h4>
            <div className="bg-gray-50 border border-dashed border-[#D50000] p-6 rounded-lg mb-6 relative">
              <p className="text-3xl font-bold text-[#D50000] tracking-widest">{code}</p>
              <button 
                onClick={copyToClipboard}
                className="absolute top-2 right-2 text-[#D50000] hover:text-[#BF0000]"
                title="Copiar código"
              >
                {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
              </button>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
              <p className="font-medium mb-2">Instrucciones:</p>
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {instructions}
              </p>
            </div>
            
            <div className="flex space-x-2 justify-center">
              <Button 
                onClick={onClose} 
                className="bg-[#D50000] hover:bg-[#BF0000] text-white px-6"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const WithdrawMoneyModal = () => {
  const { isWithdrawMoneyModalOpen, setWithdrawMoneyModalOpen } = useStore();
  const { toast } = useToast();
  const [showLoading, setShowLoading] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<string>('cajero');
  const [withdrawType, setWithdrawType] = useState<string>('tarjeta');
  const [showCode, setShowCode] = useState(false);
  const [withdrawalCode, setWithdrawalCode] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Genera un código aleatorio de 6 dígitos
  const generateSixDigitCode = () => {
    return Array(6).fill(0).map(() => Math.floor(Math.random() * 10)).join('');
  };
  
  // Reset when modal opens
  useEffect(() => {
    if (isWithdrawMoneyModalOpen) {
      setShowCode(false);
      setMethod('cajero');
      setWithdrawType('tarjeta');
      setAmount('');
      setCopied(false);
      setWithdrawalCode('');
    }
  }, [isWithdrawMoneyModalOpen]);
  
  const withdrawMutation = useMutation({
    mutationFn: async (withdrawMethod: string) => {
      if (!amount) {
        throw new Error('Por favor ingrese un monto');
      }
      
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Por favor ingrese un monto válido');
      }
      
      const res = await apiRequest('POST', '/api/transactions/withdrawal', {
        amount: parsedAmount,
        method: withdrawMethod
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/account'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      setShowLoading(false);
      
      // Establecer el código de retiro y mostrar la pantalla correspondiente
      setWithdrawalCode(data.withdrawalCode || generateSixDigitCode());
      setShowCode(true);
    },
    onError: (error) => {
      setShowLoading(false);
      toast({
        title: "Error al retirar",
        description: error instanceof Error ? error.message : "Ocurrió un error inesperado",
        variant: "destructive",
      });
    }
  });

  const copyToClipboard = () => {
    navigator.clipboard.writeText(withdrawalCode).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      (err) => {
        
      }
    );
  };

  const handleWithdraw = () => {
    let withdrawMethod = '';
    
    if (method === 'cajero') {
      withdrawMethod = withdrawType === 'tarjeta' ? 'cajero_tarjeta' : 'cajero_codigo';
    } else {
      withdrawMethod = method;
    }
    
    setShowLoading(true);
    withdrawMutation.mutate(withdrawMethod);
  };
  
  const handleClose = () => {
    setWithdrawMoneyModalOpen(false);
    setAmount('');
    setShowCode(false);
  };

  return (
    <>
      {showLoading && <LoadingOverlay text="Procesando retiro..." isVisible={true} />}
      <Dialog open={isWithdrawMoneyModalOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="bg-[#D50000] text-white p-4 rounded-t-lg">
            <DialogTitle className="text-center text-white">Retirar dinero</DialogTitle>
          </DialogHeader>
          <div className="p-6">
            {!showCode ? (
              <div className="mb-6">
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
                        className="w-full pl-8 pr-3 py-2 border border-gray-200 focus:border-[#D50000] focus:ring-[#D50000]" 
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">
                      Método de retiro
                    </Label>
                    <RadioGroup value={method} onValueChange={setMethod} className="mt-2">
                      <div className="flex items-center space-x-2 border border-gray-200 p-3 rounded-lg mb-2">
                        <RadioGroupItem value="cajero" id="cajero" />
                        <Label htmlFor="cajero" className="cursor-pointer">Cajero Automático</Label>
                      </div>
                      <div className="flex items-center space-x-2 border border-gray-200 p-3 rounded-lg mb-2">
                        <RadioGroupItem value="sucursal" id="sucursal" />
                        <Label htmlFor="sucursal" className="cursor-pointer">Sucursal Davivienda</Label>
                      </div>
                      <div className="flex items-center space-x-2 border border-gray-200 p-3 rounded-lg">
                        <RadioGroupItem value="punto" id="punto" />
                        <Label htmlFor="punto" className="cursor-pointer">Punto Físico</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  {method === 'cajero' && (
                    <div>
                      <Label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de retiro en cajero
                      </Label>
                      <RadioGroup value={withdrawType} onValueChange={setWithdrawType} className="space-y-2">
                        <div className="flex items-center space-x-2 border border-gray-200 p-3 rounded-lg">
                          <RadioGroupItem value="tarjeta" id="tarjeta" />
                          <Label htmlFor="tarjeta" className="cursor-pointer">Retirar con tarjeta</Label>
                        </div>
                        <div className="flex items-center space-x-2 border border-gray-200 p-3 rounded-lg">
                          <RadioGroupItem value="codigo" id="codigo" />
                          <Label htmlFor="codigo" className="cursor-pointer">Retirar con código</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}

                  <div className="pt-4">
                    <Button 
                      type="submit" 
                      className="w-full bg-[#D50000] hover:bg-[#BF0000] text-white"
                      disabled={!amount || parseFloat(amount) <= 0}
                    >
                      Generar código de retiro
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="text-center py-4">
                <h4 className="text-xl font-bold mb-4">Código de retiro generado</h4>
                <div className="bg-gray-50 border border-dashed border-[#D50000] p-6 rounded-lg mb-6 relative">
                  <p className="text-3xl font-bold text-[#D50000] tracking-widest">{withdrawalCode}</p>
                  <button 
                    onClick={copyToClipboard}
                    className="absolute top-2 right-2 text-[#D50000] hover:text-[#BF0000]"
                    title="Copiar código"
                  >
                    {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                  </button>
                </div>
                
                {method === 'cajero' && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
                    <p className="font-medium mb-2">Instrucciones:</p>
                    {withdrawType === 'tarjeta' ? (
                      <p className="text-sm text-gray-600">
                        Dirígete a un cajero Davivienda, inserta tu tarjeta, ingresa tu clave y selecciona la opción "Retiros".
                        <br/>Sigue las instrucciones en pantalla para completar tu retiro.
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600">
                        Dirígete a un cajero Davivienda, selecciona "Retiro sin tarjeta" e ingresa el código {withdrawalCode}.
                        <br/>Este código es válido por 24 horas.
                      </p>
                    )}
                  </div>
                )}
                
                {method === 'sucursal' && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
                    <p className="font-medium mb-2">Instrucciones:</p>
                    <p className="text-sm text-gray-600">
                      Preséntate en cualquier oficina Davivienda con tu documento de identidad.
                      <br/>Proporciona el código {withdrawalCode} al cajero para retirar tu dinero.
                      <br/>Este código es válido por 24 horas.
                    </p>
                  </div>
                )}
                
                {method === 'punto' && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
                    <p className="font-medium mb-2">Instrucciones:</p>
                    <p className="text-sm text-gray-600">
                      Acércate a cualquier punto Davivienda autorizado con tu documento de identidad.
                      <br/>Facilita el código {withdrawalCode} al asesor para efectuar tu retiro.
                      <br/>Este código es válido por 24 horas.
                    </p>
                  </div>
                )}
                
                <div className="flex space-x-2 justify-center">
                  <Button 
                    onClick={handleClose} 
                    className="bg-[#D50000] hover:bg-[#BF0000] text-white px-6"
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};