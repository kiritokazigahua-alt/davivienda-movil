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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Phone, Train, CreditCard } from 'lucide-react';
import { Account } from '@/types';

const RecargasPage = () => {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [operator, setOperator] = useState('');
  const [recargaType, setRecargaType] = useState('celular');
  const [isLoading, setIsLoading] = useState(false);
  
  const { data: account } = useQuery<Account>({
    queryKey: ['/api/account'],
  });
  
  const recargaMutation = useMutation({
    mutationFn: async () => {
      if (recargaType === 'celular' && (!phoneNumber || !operator || !amount)) {
        throw new Error('Por favor complete todos los campos requeridos');
      }
      
      if (recargaType === 'transporte' && !amount) {
        throw new Error('Por favor ingrese el monto de la recarga');
      }
      
      const parsedAmount = parseFloat(amount.replace(/,/g, ''));
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Por favor ingrese un monto válido');
      }
      
      const res = await apiRequest('POST', '/api/transactions/payment', {
        type: recargaType,
        phoneNumber: recargaType === 'celular' ? phoneNumber : '',
        operator: recargaType === 'celular' ? operator : '',
        amount: parsedAmount,
        description: `Recarga ${recargaType === 'celular' ? 'celular' : 'transporte'}`
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/account'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      toast({
        title: "Recarga exitosa",
        description: `Se ha realizado la recarga de ${parseFloat(amount).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })} exitosamente.`,
      });
      setAmount('');
      setPhoneNumber('');
      setOperator('');
      navigate('/home');
    },
    onError: (error) => {
      toast({
        title: "Error en la recarga",
        description: error instanceof Error ? error.message : "Ocurrió un error inesperado",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsLoading(false);
    }
  });

  const handleRecarga = () => {
    setIsLoading(true);
    recargaMutation.mutate();
  };

  const operatorOptions = [
    { value: "claro", label: "Claro" },
    { value: "movistar", label: "Movistar" },
    { value: "tigo", label: "Tigo" },
    { value: "virgin", label: "Virgin Mobile" },
    { value: "wom", label: "WOM" },
    { value: "etb", label: "ETB" },
    { value: "flash", label: "Flash Mobile" }
  ];

  const recargaTypeOptions = [
    { value: "celular", label: "Celular", icon: <Phone className="h-4 w-4 mr-2" /> },
    { value: "transporte", label: "Tarjeta de Transporte", icon: <Train className="h-4 w-4 mr-2" /> },
    { value: "prepago", label: "Tarjeta Prepago", icon: <CreditCard className="h-4 w-4 mr-2" /> }
  ];

  return (
    <div className="flex flex-col h-full">
      {isLoading && <LoadingOverlay text="Procesando recarga..." />}
      
      {/* Header */}
      <div className="bg-primary text-white p-4">
        <div className="flex items-center">
          <button 
            onClick={() => navigate('/home')} 
            className="mr-2 text-white hover:bg-red-700 p-1 rounded"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-semibold">Recargas</h1>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4 bg-gray-100">
        {/* Balance Card */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <p className="text-sm text-gray-600">Saldo disponible</p>
          <p className="text-2xl font-bold">
            {account ? `$${account.balance.toLocaleString('es-CO')}` : 'Cargando...'}
          </p>
        </div>
        
        {/* Recarga Form */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h3 className="font-medium mb-4 text-primary">Realizar Recarga</h3>
          
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleRecarga(); }}>
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Recarga
              </Label>
              <Select value={recargaType} onValueChange={setRecargaType}>
                <SelectTrigger id="recarga-type">
                  <SelectValue placeholder="Seleccionar tipo de recarga" />
                </SelectTrigger>
                <SelectContent>
                  {recargaTypeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center">
                        {option.icon}
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {recargaType === 'celular' && (
              <>
                <div>
                  <Label htmlFor="phone-number" className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Celular
                  </Label>
                  <Input
                    id="phone-number"
                    type="tel"
                    className="w-full"
                    placeholder="Ingrese el número de celular"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">
                    Operador
                  </Label>
                  <Select value={operator} onValueChange={setOperator} required>
                    <SelectTrigger id="operator">
                      <SelectValue placeholder="Seleccionar operador" />
                    </SelectTrigger>
                    <SelectContent>
                      {operatorOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div>
              <Label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Monto de Recarga
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
              
              {recargaType === 'celular' && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[5000, 10000, 20000, 50000].map(value => (
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
              )}
              
              {recargaType === 'transporte' && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[2000, 5000, 10000, 20000].map(value => (
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
              )}
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white"
                disabled={
                  recargaType === 'celular' ? (!phoneNumber || !operator || !amount) : !amount
                }
              >
                Recargar
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RecargasPage;