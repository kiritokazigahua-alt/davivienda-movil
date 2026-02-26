import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { ArrowLeft, CreditCard, User, ClipboardCheck, Phone, Mail, Calendar, FileText, DownloadCloud, History, ShieldCheck } from 'lucide-react';
import { User as UserType, Account, Transaction, CurrencyCode } from '@/types';
import { formatCurrency, maskAccountNumber, formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';

const ProfilePage = () => {
  const [_, navigate] = useLocation();
  const [dataCopied, setDataCopied] = useState<string | null>(null);
  
  const { data: user, isLoading: isLoadingUser } = useQuery<UserType>({
    queryKey: ['/api/user'],
  });
  
  const { data: account, isLoading: isLoadingAccount } = useQuery<Account>({
    queryKey: ['/api/account'],
  });
  
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });
  
  const isLoading = isLoadingUser || isLoadingAccount || isLoadingTransactions;
  
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setDataCopied(field);
        toast({
          title: "Información copiada",
          description: "Se ha copiado al portapapeles",
        });
        setTimeout(() => setDataCopied(null), 2000);
      },
      (err) => {
        console.error('No se pudo copiar: ', err);
        toast({
          title: "Error al copiar",
          description: "No se pudo copiar la información",
          variant: "destructive",
        });
      }
    );
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
          <h1 className="text-xl font-semibold">Mi Perfil</h1>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4 bg-gray-100">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin h-8 w-8 border-4 border-[#D50000] border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Información del Usuario */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="bg-[#D50000] rounded-full p-3 text-white">
                    <User size={28} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{user?.name}</h2>
                    <p className="text-sm text-gray-500">Información Personal</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <ClipboardCheck className="text-gray-500" size={18} />
                      <span className="text-gray-700">Documento de Identidad</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium">{user?.document}</span>
                      <button 
                        onClick={() => copyToClipboard(user?.document || '', 'document')}
                        className="ml-2 text-gray-500 hover:text-[#D50000]"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
                          {dataCopied === 'document' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          )}
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Mail className="text-gray-500" size={18} />
                      <span className="text-gray-700">Correo Electrónico</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium">{user?.email}</span>
                      <button 
                        onClick={() => copyToClipboard(user?.email || '', 'email')}
                        className="ml-2 text-gray-500 hover:text-[#D50000]"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
                          {dataCopied === 'email' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          )}
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Phone className="text-gray-500" size={18} />
                      <span className="text-gray-700">Teléfono</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium">{user?.phone}</span>
                      <button 
                        onClick={() => copyToClipboard(user?.phone || '', 'phone')}
                        className="ml-2 text-gray-500 hover:text-[#D50000]"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
                          {dataCopied === 'phone' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          )}
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Calendar className="text-gray-500" size={18} />
                      <span className="text-gray-700">Último Acceso</span>
                    </div>
                    <span className="font-medium">{new Date(user?.lastLogin || '').toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Información de la Cuenta */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="bg-[#D50000] rounded-full p-3 text-white">
                    <CreditCard size={28} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Datos de Cuenta</h2>
                    <p className="text-sm text-gray-500">Información de tu cuenta bancaria</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-700">Número de Cuenta</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium">{maskAccountNumber(account?.accountNumber || '')}</span>
                      <button 
                        onClick={() => copyToClipboard(account?.accountNumber || '', 'accountNumber')}
                        className="ml-2 text-gray-500 hover:text-[#D50000]"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
                          {dataCopied === 'accountNumber' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          )}
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-700">Tipo de Cuenta</span>
                    </div>
                    <span className="font-medium">{account?.accountType}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-700">Saldo Disponible</span>
                    </div>
                    <span className="font-medium text-[#D50000]">{formatCurrency(account?.balance || 0, account?.currency as CurrencyCode)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Panel de Administración si el usuario es administrador */}
            {user?.isAdmin === 1 && (
              <Card className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 transform translate-x-12 -translate-y-12">
                  <div className="absolute transform rotate-45 bg-yellow-400 text-center text-xs font-bold text-red-700 py-1 right-0 top-0 w-52">
                    ADMINISTRADOR
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="bg-red-600 rounded-full p-3 text-white">
                      <ShieldCheck size={28} />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">Panel de Administración</h2>
                      <p className="text-sm text-gray-500">Acceso a herramientas administrativas</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 mb-2">
                    <Button 
                      onClick={() => navigate('/admin')} 
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-6 text-lg"
                    >
                      <ShieldCheck className="mr-2 h-5 w-5" />
                      Acceder al Panel de Administración
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    Gestiona usuarios, cuentas, transacciones y más
                  </p>
                </CardContent>
              </Card>
            )}
            
            {/* Movimientos y Certificados */}
            <Card>
              <CardContent className="p-6">
                <Tabs defaultValue="movimientos" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="movimientos" className="text-sm">
                      <History className="h-4 w-4 mr-2" />
                      Movimientos Recientes
                    </TabsTrigger>
                    <TabsTrigger value="certificados" className="text-sm">
                      <FileText className="h-4 w-4 mr-2" />
                      Certificados
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="movimientos" className="space-y-4">
                    <div className="space-y-4">
                      {transactions && transactions.length > 0 ? (
                        transactions.slice(0, 5).map((transaction, index) => (
                          <div key={transaction.id} className="flex justify-between items-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex items-center">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                transaction.type === 'deposit' ? 'bg-green-100 text-green-600' : 
                                transaction.type === 'withdrawal' ? 'bg-red-100 text-red-600' : 
                                transaction.type === 'transfer' ? 'bg-blue-100 text-blue-600' : 
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {transaction.type === 'deposit' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
                                {transaction.type === 'withdrawal' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>}
                                {transaction.type === 'transfer' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>}
                                {transaction.type === 'payment' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}
                              </div>
                              <div className="ml-3">
                                <p className="font-medium text-gray-800">{transaction.description}</p>
                                <p className="text-xs text-gray-500">{formatDateTime(transaction.date)}</p>
                              </div>
                            </div>
                            <div className={`font-medium ${
                              transaction.type === 'deposit' ? 'text-green-600' : 
                              transaction.type === 'withdrawal' || transaction.type === 'transfer' ? 'text-red-600' : 
                              'text-gray-800'
                            }`}>
                              {transaction.type === 'deposit' ? '+' : '-'} {formatCurrency(transaction.amount)}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <History className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                          <p className="text-gray-500">No hay movimientos recientes</p>
                        </div>
                      )}
                      
                      <Button 
                        onClick={() => navigate('/history')} 
                        variant="outline" 
                        className="w-full mt-2"
                      >
                        Ver todos los movimientos
                      </Button>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="certificados" className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        variant="outline" 
                        className="flex flex-col items-center justify-center h-24"
                        onClick={() => navigate('/certificados')}
                      >
                        <FileText className="h-6 w-6 mb-2 text-red-600" />
                        <span className="text-sm">Certificado de Productos</span>
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="flex flex-col items-center justify-center h-24"
                        onClick={() => navigate('/certificados')}
                      >
                        <FileText className="h-6 w-6 mb-2 text-red-600" />
                        <span className="text-sm">Certificado Tributario</span>
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="flex flex-col items-center justify-center h-24"
                        onClick={() => navigate('/certificados')}
                      >
                        <DownloadCloud className="h-6 w-6 mb-2 text-red-600" />
                        <span className="text-sm">Extractos Bancarios</span>
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="flex flex-col items-center justify-center h-24"
                        onClick={() => navigate('/certificados')}
                      >
                        <FileText className="h-6 w-6 mb-2 text-red-600" />
                        <span className="text-sm">Paz y Salvo</span>
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            
            {/* Botones de Acción */}
            <div className="flex flex-col space-y-2">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  toast({
                    title: "Actualización de datos",
                    description: "Por favor complete el formulario para actualizar sus datos de contacto.",
                  });
                  navigate('/actualizar-datos');
                }}
              >
                Actualizar Datos de Contacto
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                onClick={() => {
                  toast({
                    title: "Bloqueo de cuenta",
                    description: "Para mayor seguridad, por favor contacte directamente con nuestro centro de atención al cliente para bloquear su cuenta.",
                    variant: "destructive",
                  });
                }}
              >
                Bloquear Cuenta
              </Button>

              <Button 
                variant="outline" 
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  // El mensaje personalizado si es José Nevares
                  const message = user && user.name === "JOSE NEVARES" 
                    ? "Hola, soy Jose Nevarez, estoy presentando el error #4004 *ASESOR*"
                    : "Indicar al asesor el código #4004";
                  
                  // Construir URL para WhatsApp
                  const whatsappUrl = `https://wa.me/573209233903?text=${encodeURIComponent(message)}`;
                  
                  // Mostrar toast informativo personalizado
                  toast({
                    title: "Atención al Cliente",
                    description: user && user.name === "JOSE NEVARES"
                      ? "Conectando con un asesor por WhatsApp. Su mensaje personalizado incluye el código #4004."
                      : "Conectando con un asesor por WhatsApp. Recuerde indicarle el código #4004."
                  });
                  
                  // Abrir WhatsApp en nueva pestaña
                  window.open(whatsappUrl, '_blank');
                }}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="white" 
                  stroke="white" 
                  strokeWidth="1" 
                  className="mr-2"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Contactar Atención al Cliente
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;