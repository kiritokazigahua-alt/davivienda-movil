import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useStore } from '@/lib/store';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, MessageCircleIcon, AlertCircle } from 'lucide-react';
import { useSupportPhone } from '@/hooks/use-support-phone';
import { useStore } from '@/lib/store';
import { Account } from '@/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CURRENCIES, CurrencyCode } from '@shared/schema';

const TransfersPage = () => {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useStore();
  const { openWhatsApp } = useSupportPhone((user as any)?.customSupportPhone);
  const [amount, setAmount] = useState('');
  const [bank, setBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState('');
  const [concept, setConcept] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const { data: account } = useQuery<Account>({
    queryKey: ['/api/account'],
  });
  
  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!bank || !accountNumber || !accountType || !amount) {
        throw new Error('Por favor complete todos los campos requeridos');
      }
      
      const parsedAmount = parseFloat(amount.replace(/,/g, ''));
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Por favor ingrese un monto válido');
      }
      
      try {
        const res = await apiRequest('POST', '/api/transactions/transfer', {
          bank,
          recipientAccountNumber: accountNumber,
          accountType,
          amount: parsedAmount,
          description: concept || 'Transferencia'
        });
        
        // Verificar si la respuesta es exitosa (2xx)
        if (!res.ok) {
          const errorData = await res.json();
          if (errorData.error_code === "4004") {
            throw { 
              response: errorData,
              message: errorData.message || "No puede realizar transferencias. Cuenta bloqueada por retenciones pendientes."
            };
          }
          throw new Error(errorData.message || 'Error en la transferencia');
        }
        
        return res.json();
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/account'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      const currency = account?.currency || "COP";
      const localeMap: Record<string, string> = {
        COP: "es-CO",
        USD: "en-US",
        EUR: "de-DE",
        GBP: "en-GB",
        BRL: "pt-BR"
      };
      const locale = localeMap[currency] || "es-CO";
      const formattedAmount = new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency
      }).format(parseFloat(amount));
      toast({
        title: "Transferencia exitosa",
        description: `Se ha transferido ${formattedAmount} exitosamente.`,
      });
      setAmount('');
      setBank('');
      setAccountNumber('');
      setAccountType('');
      setConcept('');
      navigate('/home');
    },
    onError: (error: any) => {
      // Comprobar si el error contiene el código 4004 (cuenta bloqueada)
      if (error?.response?.error_code === "4004" || 
          (typeof error.message === 'string' && error.message.includes('4004'))) {
        setErrorCode("4004");
        setErrorMessage(error?.response?.message || "No puede realizar transferencias. Cuenta bloqueada por retenciones pendientes.");
      } else {
        toast({
          title: "Error en la transferencia",
          description: error instanceof Error ? error.message : "Ocurrió un error inesperado",
          variant: "destructive",
        });
      }
    },
    onSettled: () => {
      setIsLoading(false);
    }
  });

  const handleTransfer = () => {
    setIsLoading(true);
    setErrorCode(null);
    setErrorMessage(null);
    transferMutation.mutate();
  };
  
  const handleContactSupport = () => {
    openWhatsApp("Hola, necesito ayuda con mi cuenta. Tengo un error #4004");
  };

  // Banks organized by currency
  const banksByCurrency: Record<string, Array<{ value: string; label: string; country?: string }>> = {
    // Colombian Peso - Colombian banks
    COP: [
      { value: "davivienda", label: "Davivienda", country: "Colombia" },
      { value: "bancolombia", label: "Bancolombia", country: "Colombia" },
      { value: "bbva-colombia", label: "BBVA Colombia", country: "Colombia" },
      { value: "occidente", label: "Banco de Occidente", country: "Colombia" },
      { value: "bogota", label: "Banco de Bogotá", country: "Colombia" },
      { value: "popular", label: "Banco Popular", country: "Colombia" },
      { value: "avvillas", label: "Banco AV Villas", country: "Colombia" },
      { value: "caja-social", label: "Banco Caja Social", country: "Colombia" },
      { value: "colpatria", label: "Scotiabank Colpatria", country: "Colombia" },
      { value: "falabella", label: "Banco Falabella", country: "Colombia" },
      { value: "nequi", label: "Nequi", country: "Colombia" },
      { value: "daviplata", label: "DaviPlata", country: "Colombia" }
    ],
    // US Dollar - US banks and fintechs
    USD: [
      { value: "chase", label: "JPMorgan Chase", country: "Estados Unidos" },
      { value: "bank-of-america", label: "Bank of America", country: "Estados Unidos" },
      { value: "wells-fargo", label: "Wells Fargo", country: "Estados Unidos" },
      { value: "citibank", label: "Citibank", country: "Estados Unidos" },
      { value: "us-bank", label: "U.S. Bank", country: "Estados Unidos" },
      { value: "pnc", label: "PNC Bank", country: "Estados Unidos" },
      { value: "capital-one", label: "Capital One", country: "Estados Unidos" },
      { value: "td-bank", label: "TD Bank", country: "Estados Unidos" },
      { value: "truist", label: "Truist Bank", country: "Estados Unidos" },
      { value: "charles-schwab", label: "Charles Schwab", country: "Estados Unidos" },
      { value: "zelle", label: "Zelle", country: "Estados Unidos" },
      { value: "venmo", label: "Venmo", country: "Estados Unidos" },
      { value: "paypal", label: "PayPal", country: "Estados Unidos" },
      { value: "cash-app", label: "Cash App", country: "Estados Unidos" },
      { value: "chime", label: "Chime", country: "Estados Unidos" },
      { value: "wise-usd", label: "Wise (USD)", country: "Estados Unidos" }
    ],
    // Euro - European banks (Spain, Germany, France, Italy, etc.)
    EUR: [
      // Spain
      { value: "santander", label: "Banco Santander", country: "España" },
      { value: "bbva-espana", label: "BBVA España", country: "España" },
      { value: "caixabank", label: "CaixaBank", country: "España" },
      { value: "sabadell", label: "Banco Sabadell", country: "España" },
      { value: "bankinter", label: "Bankinter", country: "España" },
      { value: "ing-espana", label: "ING España", country: "España" },
      { value: "openbank", label: "Openbank", country: "España" },
      { value: "evo-banco", label: "EVO Banco", country: "España" },
      // Germany
      { value: "deutsche-bank", label: "Deutsche Bank", country: "Alemania" },
      { value: "commerzbank", label: "Commerzbank", country: "Alemania" },
      { value: "ing-germany", label: "ING Germany", country: "Alemania" },
      { value: "n26", label: "N26", country: "Alemania" },
      { value: "dkb", label: "DKB", country: "Alemania" },
      // France
      { value: "bnp-paribas", label: "BNP Paribas", country: "Francia" },
      { value: "credit-agricole", label: "Crédit Agricole", country: "Francia" },
      { value: "societe-generale", label: "Société Générale", country: "Francia" },
      { value: "credit-mutuel", label: "Crédit Mutuel", country: "Francia" },
      // Italy
      { value: "unicredit", label: "UniCredit", country: "Italia" },
      { value: "intesa-sanpaolo", label: "Intesa Sanpaolo", country: "Italia" },
      // Netherlands
      { value: "ing-netherlands", label: "ING Netherlands", country: "Países Bajos" },
      { value: "abn-amro", label: "ABN AMRO", country: "Países Bajos" },
      { value: "rabobank", label: "Rabobank", country: "Países Bajos" },
      // European fintechs
      { value: "revolut", label: "Revolut", country: "Europa" },
      { value: "wise-eur", label: "Wise (EUR)", country: "Europa" },
      { value: "bunq", label: "Bunq", country: "Europa" }
    ],
    // British Pound - UK banks
    GBP: [
      { value: "hsbc-uk", label: "HSBC UK", country: "Reino Unido" },
      { value: "barclays", label: "Barclays", country: "Reino Unido" },
      { value: "lloyds", label: "Lloyds Bank", country: "Reino Unido" },
      { value: "natwest", label: "NatWest", country: "Reino Unido" },
      { value: "santander-uk", label: "Santander UK", country: "Reino Unido" },
      { value: "halifax", label: "Halifax", country: "Reino Unido" },
      { value: "tsb", label: "TSB", country: "Reino Unido" },
      { value: "monzo", label: "Monzo", country: "Reino Unido" },
      { value: "starling", label: "Starling Bank", country: "Reino Unido" },
      { value: "revolut-uk", label: "Revolut UK", country: "Reino Unido" },
      { value: "wise-gbp", label: "Wise (GBP)", country: "Reino Unido" }
    ],
    // Brazilian Real - Brazilian banks
    BRL: [
      { value: "itau", label: "Itaú Unibanco", country: "Brasil" },
      { value: "bradesco", label: "Bradesco", country: "Brasil" },
      { value: "banco-do-brasil", label: "Banco do Brasil", country: "Brasil" },
      { value: "caixa", label: "Caixa Econômica", country: "Brasil" },
      { value: "santander-brasil", label: "Santander Brasil", country: "Brasil" },
      { value: "nubank", label: "Nubank", country: "Brasil" },
      { value: "inter", label: "Banco Inter", country: "Brasil" },
      { value: "c6-bank", label: "C6 Bank", country: "Brasil" },
      { value: "picpay", label: "PicPay", country: "Brasil" },
      { value: "mercado-pago", label: "Mercado Pago", country: "Brasil" }
    ]
  };

  // Get banks based on account currency, default to COP
  const accountCurrency = account?.currency || "COP";
  const bankOptions = banksByCurrency[accountCurrency] || banksByCurrency.COP;
  
  // Currency formatting helper
  const formatCurrency = (value: number, currency: string) => {
    const localeMap: Record<string, string> = {
      COP: "es-CO",
      USD: "en-US",
      EUR: "de-DE",
      GBP: "en-GB",
      BRL: "pt-BR"
    };
    const locale = localeMap[currency] || "es-CO";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency
    }).format(value);
  };

  const accountTypeOptions = [
    { value: "ahorros", label: "Cuenta de Ahorros" },
    { value: "corriente", label: "Cuenta Corriente" }
  ];

  return (
    <div className="flex flex-col h-full">
      {isLoading && <LoadingOverlay text="Procesando transferencia..." />}
      
      {/* Header */}
      <div className="bg-red-600 text-white p-4">
        <div className="flex items-center">
          <button 
            onClick={() => navigate('/home')} 
            className="mr-2 text-white hover:bg-red-700 p-1 rounded"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-semibold">Transferencias</h1>
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
                Su cuenta se encuentra bloqueada. No podrá realizar transferencias hasta resolver las retenciones pendientes.
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
            {account ? formatCurrency(account.balance, accountCurrency) : 'Cargando...'}
          </p>
        </div>
        
        {/* Transfer Form */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h3 className="font-medium mb-4 text-red-600">Transferir dinero</h3>
          
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleTransfer(); }}>
            <div>
              <Label htmlFor="from-account" className="block text-sm font-medium text-gray-700 mb-1">
                De
              </Label>
              <Select disabled defaultValue="account">
                <SelectTrigger id="from-account">
                  <SelectValue placeholder="Seleccionar cuenta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="account">
                    {account ? `${account.accountType} **** ${account.accountNumber.slice(-4)}` : 'Cargando...'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">
                Banco {accountCurrency !== "COP" && <span className="text-xs text-gray-500">({accountCurrency})</span>}
              </Label>
              <Select value={bank} onValueChange={setBank} required>
                <SelectTrigger id="bank" data-testid="select-bank">
                  <SelectValue placeholder="Seleccionar banco" />
                </SelectTrigger>
                <SelectContent>
                  {bankOptions.map(option => (
                    <SelectItem key={option.value} value={option.value} data-testid={`bank-option-${option.value}`}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        {option.country && <span className="text-xs text-gray-500">{option.country}</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de cuenta
              </Label>
              <Select value={accountType} onValueChange={setAccountType} required>
                <SelectTrigger id="account-type">
                  <SelectValue placeholder="Seleccionar tipo de cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {accountTypeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="account-number" className="block text-sm font-medium text-gray-700 mb-1">
                Número de cuenta
              </Label>
              <Input
                id="account-number"
                type="text"
                className="w-full"
                placeholder="Ingrese el número de cuenta"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Monto ({accountCurrency})
              </Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                  {CURRENCIES[accountCurrency as CurrencyCode]?.symbol || "$"}
                </span>
                <Input
                  id="amount"
                  type="text"
                  className="w-full pl-8"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  data-testid="input-amount"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="concept" className="block text-sm font-medium text-gray-700 mb-1">
                Concepto (opcional)
              </Label>
              <Input
                id="concept"
                type="text"
                className="w-full"
                placeholder="Ej: Pago arriendo"
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                disabled={!bank || !accountNumber || !accountType || !amount}
              >
                Transferir
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TransfersPage;
