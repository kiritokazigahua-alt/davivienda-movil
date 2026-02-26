import { useState, useEffect } from 'react';
import { User, MoreHorizontal, Home, CreditCard, QrCode, Send, Eye, EyeOff, CirclePlus, ArrowRight, Key, Repeat, FileText, HeadphonesIcon, MessageCircleIcon, AlertCircle } from 'lucide-react';
import { useStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import { CurrencyCode } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { useSupportPhone } from '@/hooks/use-support-phone';

const HomePage = () => {
  const { user, account, transactions, beneficiaries, getAccount, getTransactions, getBeneficiaries } = useStore();
  const [showBalance, setShowBalance] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const { openWhatsApp } = useSupportPhone((user as any)?.customSupportPhone);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        await Promise.all([getAccount(), getTransactions(), getBeneficiaries()]);
      } catch (error) {
        toast({
          title: "Error",
          description: "No pudimos cargar todos tus datos bancarios",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Acciones para cada botón
  const handleTransferButtonClick = () => navigate('/transfers');
  const handlePayButtonClick = () => navigate('/payments');
  const handleQRButtonClick = () => navigate('/qr');
  const handleHomeButtonClick = () => navigate('/home');
  const handleProfileButtonClick = () => navigate('/profile');

  // Acciones para servicios destacados
  const handleKeyTransfer = () => navigate('/transfers');
  
  const handleRecharge = () => {
    navigate('/recargas');
  };
  
  const handlePeaceAndSafe = () => {
    navigate('/certificados');
  };
  
  const handleCertificates = () => {
    navigate('/certificados');
  };
  
  const handleWithdrawWithoutCard = () => {
    navigate('/retirar');
  };
  
  const handleContactSupport = () => {
    openWhatsApp("Hola, necesito ayuda con mi cuenta. Tengo un error #4004");
  };

  return (
    <>
      {loading && <LoadingOverlay isVisible={true} text="Cargando información..." />}
      
      <div className="flex flex-col min-h-screen bg-gray-100">
        {/* Header */}
        <header className="bg-primary text-white p-4 flex items-center">
          <div className="flex items-center">
            <button 
              onClick={() => navigate('/profile')}
              className="w-10 h-10 bg-red-800 rounded-full flex items-center justify-center">
              <User size={20} />
            </button>
            <div className="ml-2">
              <button 
                onClick={() => navigate('/profile')}
                className="flex items-center">
                <span className="mr-1">{'>'}</span>
              </button>
            </div>
          </div>
          <div className="ml-auto">
            <h1 className="text-xl font-semibold">Hola, {user?.name.split(' ')[0]}</h1>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          {/* Novedades */}
          <section className="mt-4 px-4">
            <h2 className="text-xl font-bold mb-3">Novedades</h2>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold">¡Nunca entregue su tarjeta!</h3>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Nuevo</span>
              </div>
              <p className="text-gray-700">
                Su tarjeta es personal, aunque reciba una nueva nunca entregue la anterior, es suya para siempre. 
                Hágale caso a la Tía Segura.
              </p>
            </div>
          </section>

          {/* Mis productos */}
          <section className="mt-6 px-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-bold">Mis productos</h2>
              <button 
                className="flex items-center bg-white text-gray-700 rounded-full px-4 py-2 shadow-sm cursor-pointer"
                onClick={() => navigate('/profile')}
              >
                <CirclePlus size={18} className="mr-2" />
                <span className="text-sm">Solicitar productos</span>
              </button>
            </div>

            {/* Mis Cuentas */}
            <div className="bg-primary rounded-lg p-4 text-white shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold">Mis Cuentas</h3>
                <div 
                  className="w-8 h-8 flex items-center justify-center cursor-pointer" 
                  onClick={() => navigate('/history')}
                  title="Ver historial de movimientos"
                >
                  <FileText size={20} />
                </div>
              </div>

              <div className="mb-2">
                <p className="text-sm">Saldo disponible</p>
                <div className="flex items-center">
                  <p className="text-2xl font-bold mr-2">
                    {showBalance ? formatCurrency(account?.balance || 0, account?.currency as CurrencyCode) : "$ ********"}
                  </p>
                  <button onClick={() => setShowBalance(!showBalance)}>
                    {showBalance ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {(!account?.status || account?.status === "PENDIENTE") && (
                  <div className="mt-2 p-3 bg-red-100 border border-red-300 rounded-lg">
                    <p className="text-sm text-red-800 font-bold mb-2">Para activar su cuenta debe solicitar su tarjeta física o inscribir su TAG</p>
                    <Button 
                      onClick={() => navigate('/cards')} 
                      className="bg-red-600 hover:bg-red-700 text-white w-full text-xs"
                    >
                      Solicitar Tarjeta / TAG
                    </Button>
                  </div>
                )}
                {account?.status === "BLOQUEADA" && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-400 rounded-md">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-black font-medium">{account.statusMessage}</p>
                    </div>
                    <button 
                      onClick={handleContactSupport}
                      className="mt-2 bg-red-600 text-white text-sm rounded-md px-3 py-1.5 flex items-center w-auto"
                    >
                      <MessageCircleIcon size={16} className="mr-1" />
                      Contactar soporte
                    </button>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm">Saldo total</p>
                <p className="text-lg font-bold">
                  {showBalance ? formatCurrency(account?.balance || 0, account?.currency as CurrencyCode) : "$ ********"}
                </p>
              </div>
            </div>
          </section>

          {/* Servicios Destacados */}
          <section className="mt-6 px-4">
            <h2 className="text-xl font-bold mb-3">Servicios destacados</h2>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="grid grid-cols-4 gap-4 mb-4">
                <button onClick={handleKeyTransfer} className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full border border-green-500 flex items-center justify-center mb-1">
                    <Key size={18} className="text-green-500" />
                  </div>
                  <div className="text-center">
                    <span className="text-xs text-green-500 font-bold">Nuevo</span>
                    <p className="text-xs">Transferir con llaves</p>
                  </div>
                </button>

                <button onClick={handleRecharge} className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full border border-gray-300 flex items-center justify-center mb-1">
                    <Repeat size={18} className="text-gray-500" />
                  </div>
                  <p className="text-xs text-center">Recargas</p>
                </button>

                <button onClick={handlePeaceAndSafe} className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full border border-gray-300 flex items-center justify-center mb-1">
                    <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  </div>
                  <p className="text-xs text-center">Paz y salvo</p>
                </button>

                <button onClick={handleCertificates} className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full border border-gray-300 flex items-center justify-center mb-1">
                    <FileText size={18} className="text-gray-500" />
                  </div>
                  <p className="text-xs text-center">Certificados</p>
                </button>
              </div>

              <div className="flex justify-center space-x-8">
                <button onClick={handleWithdrawWithoutCard} className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full border border-gray-300 flex items-center justify-center mb-1">
                    <CreditCard size={18} className="text-gray-500" />
                  </div>
                  <p className="text-xs text-center">Retirar sin tarjeta</p>
                </button>
                
                <button onClick={() => navigate('/cards')} data-testid="link-cards" className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full border border-red-500 flex items-center justify-center mb-1">
                    <CreditCard size={18} className="text-red-500" />
                  </div>
                  <p className="text-xs text-center text-red-500 font-medium">Mis Tarjetas</p>
                </button>
                
                <button onClick={() => navigate('/history')} className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full border border-gray-300 flex items-center justify-center mb-1">
                    <FileText size={18} className="text-gray-500" />
                  </div>
                  <p className="text-xs text-center">Movimientos</p>
                </button>
                
                <button onClick={handleContactSupport} className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full border border-red-500 flex items-center justify-center mb-1">
                    <HeadphonesIcon size={18} className="text-red-500" />
                  </div>
                  <p className="text-xs text-center">Atención al cliente</p>
                </button>
              </div>
            </div>
          </section>

          {/* Le puede interesar */}
          <section className="mt-6 px-4">
            <h2 className="text-xl font-bold mb-3">Le puede interesar</h2>
            <div className="bg-blue-700 text-white rounded-lg p-4 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Mi Casa</h3>
                <p className="text-sm">Compre, venda, arriende y contrate servicios.</p>
                <button 
                  className="flex items-center text-sm mt-2"
                  onClick={() => navigate('/profile')}
                >
                  <span className="mr-1">Ver más</span>
                  <ArrowRight size={14} />
                </button>
              </div>
              <div className="w-16 h-16 bg-blue-600 rounded-md"></div>
            </div>
          </section>

          {/* Mis finanzas */}
          <section className="mt-6 px-4 mb-24">
            <h2 className="text-xl font-bold mb-3">Mis finanzas</h2>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => navigate('/history')}
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full border-2 border-t-blue-500 border-r-green-500 border-b-yellow-500 border-l-red-500 flex items-center justify-center mr-3"></div>
                  <div>
                    <h3 className="font-semibold">Tome control de su dinero</h3>
                    <p className="text-sm text-gray-600">Administre su presupuesto y controle sus ingresos y gastos para manejar su dinero.</p>
                  </div>
                </div>
                <ArrowRight size={20} className="text-gray-400" />
              </div>
            </div>
          </section>
        </div>

        {/* Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-lg p-3 flex justify-around">
          <button onClick={handleHomeButtonClick} className="flex flex-col items-center text-red-600">
            <Home size={24} />
            <span className="text-xs mt-1">Inicio</span>
          </button>
          
          <button onClick={handlePayButtonClick} className="flex flex-col items-center text-gray-500">
            <CreditCard size={24} />
            <span className="text-xs mt-1">Pagar</span>
          </button>
          
          <button onClick={handleQRButtonClick} className="flex flex-col items-center text-gray-500">
            <QrCode size={24} />
            <span className="text-xs mt-1">QR</span>
          </button>
          
          <button onClick={handleTransferButtonClick} className="flex flex-col items-center text-gray-500">
            <Send size={24} />
            <span className="text-xs mt-1">Transferir</span>
          </button>
        </nav>
      </div>
    </>
  );
};

export default HomePage;
