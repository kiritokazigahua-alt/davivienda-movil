import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Account, User } from '@/types';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Copy, QrCode, Scan, Share2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Html5Qrcode } from 'html5-qrcode';

const QrPage = () => {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('receive');
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "qr-reader";
  
  const { data: account } = useQuery<Account>({
    queryKey: ['/api/account'],
  });
  
  const { data: user } = useQuery<User>({
    queryKey: ['/api/user'],
  });
  
  // Limpiar el escáner cuando se desmonta el componente
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(err => {
          
        });
      }
    };
  }, []);
  
  // QR data para recibir dinero
  const qrReceiveData = {
    accountNumber: account?.accountNumber || '',
    accountType: account?.accountType || '',
    userName: user?.name || ''
  };
  
  // URL del QR - Usamos un servicio real para generar QR
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(JSON.stringify(qrReceiveData))}`;
  
  const copyAccountNumber = () => {
    if (account?.accountNumber) {
      navigator.clipboard.writeText(account.accountNumber);
      toast({
        title: "Número de cuenta copiado",
        description: "El número de cuenta ha sido copiado al portapapeles",
      });
    }
  };
  
  const handleShareQR = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Mi código QR de Davivienda',
        text: `Escanea este QR para enviar dinero a ${user?.name}`,
        url: window.location.href,
      })
      .catch(() => {
        toast({
          title: "Error al compartir",
          description: "No se pudo compartir el código QR",
          variant: "destructive",
        });
      });
    } else {
      toast({
        title: "Compartir no disponible",
        description: "Tu dispositivo no soporta la función de compartir",
      });
    }
  };
  
  // Iniciar el escáner QR
  const handleScanQR = () => {
    setShowScanDialog(true);
    setIsLoading(true);
    
    // Esperar a que el DOM se actualice y el contenedor esté disponible
    setTimeout(() => {
      const scanContainer = document.getElementById(scannerContainerId);
      if (!scanContainer) {
        toast({
          title: "Error al escanear",
          description: "No se pudo inicializar el escáner QR",
          variant: "destructive",
        });
        setShowScanDialog(false);
        setIsLoading(false);
        return;
      }
      
      // Inicializar el escáner HTML5 QR
      scannerRef.current = new Html5Qrcode(scannerContainerId);
      
      scannerRef.current.start(
        { facingMode: "environment" }, // Usar la cámara trasera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // QR detectado con éxito
          handleQrCodeSuccess(decodedText);
        },
        () => {}
      ).catch((err) => {
        toast({
          title: "Error en la cámara",
          description: "No se pudo acceder a la cámara: " + err,
          variant: "destructive",
        });
        setShowScanDialog(false);
        setIsLoading(false);
      });
      
      setIsLoading(false);
    }, 500);
  };
  
  // Procesar el código QR escaneado
  const handleQrCodeSuccess = (decodedText: string) => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        setShowScanDialog(false);
        
        try {
          // Redirigir a la página de pago QR con los datos del QR
          navigate(`/qr-payment?data=${encodeURIComponent(decodedText)}`);
        } catch (error) {
          toast({
            title: "Código QR inválido",
            description: "El código QR escaneado no contiene información válida para pago",
            variant: "destructive",
          });
        }
      }).catch(err => {
        
      });
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      {isLoading && <LoadingOverlay text="Procesando..." />}
      
      {/* Header */}
      <div className="bg-red-600 text-white p-4">
        <div className="flex items-center">
          <button 
            onClick={() => navigate('/home')} 
            className="mr-2 text-white hover:bg-red-700 p-1 rounded"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-semibold">Paga y recibe con QR</h1>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4 bg-gray-100">
        <Tabs defaultValue="receive" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="receive">Recibir dinero</TabsTrigger>
            <TabsTrigger value="pay">Pagar</TabsTrigger>
          </TabsList>
          
          {/* Recibir dinero */}
          <TabsContent value="receive" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold">Mi código QR</CardTitle>
                <CardDescription>
                  Comparte este código para recibir dinero en tu cuenta
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="p-4 bg-white rounded-md shadow-sm w-full max-w-[220px]">
                  <img 
                    src={qrImageUrl}
                    alt="Código QR para recibir dinero"
                    className="w-full h-auto"
                  />
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600 mb-1">Número de cuenta</p>
                  <div className="flex items-center justify-center">
                    <p className="font-medium">{account?.accountNumber || 'Cargando...'}</p>
                    <button 
                      className="ml-2 p-1 hover:bg-gray-200 rounded"
                      onClick={copyAccountNumber}
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-center">
                <Button onClick={handleShareQR} className="bg-red-600 hover:bg-red-700 text-white">
                  <Share2 className="mr-2 h-4 w-4" /> Compartir mi QR
                </Button>
              </CardFooter>
            </Card>
            
            <div className="bg-yellow-50 p-4 rounded-md">
              <h3 className="font-medium text-yellow-800 mb-1">Importante</h3>
              <p className="text-sm text-yellow-700">
                Comparte este código QR con tus amigos y familiares para recibir dinero de forma segura y rápida. 
                Cada código es único para tu cuenta.
              </p>
            </div>
          </TabsContent>
          
          {/* Pagar */}
          <TabsContent value="pay" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold">Pagar con QR</CardTitle>
                <CardDescription>
                  Escanea un código QR para pagar de forma rápida y segura
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center py-8">
                <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Scan size={40} className="text-gray-400" />
                </div>
                <p className="text-center text-gray-600 mb-6">
                  Escanea el código QR del comercio o persona a quien deseas pagarle
                </p>
                <Button onClick={handleScanQR} className="bg-red-600 hover:bg-red-700 text-white">
                  <QrCode className="mr-2 h-4 w-4" /> Escanear QR
                </Button>
              </CardContent>
            </Card>
            
            <div className="bg-blue-50 p-4 rounded-md">
              <h3 className="font-medium text-blue-800 mb-1">¿Cómo funciona?</h3>
              <ol className="text-sm text-blue-700 list-decimal pl-4 space-y-1">
                <li>Presiona el botón "Escanear QR"</li>
                <li>Apunta la cámara al código QR del comercio o persona</li>
                <li>Confirma el monto y los datos de la transferencia</li>
                <li>¡Listo! El pago se realizará al instante</li>
              </ol>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Dialog para escaneo de QR */}
      <Dialog open={showScanDialog} onOpenChange={(open) => {
        if (!open && scannerRef.current) {
          // Detener el escáner cuando se cierre el diálogo
          scannerRef.current.stop().catch(err => {
            
          });
        }
        setShowScanDialog(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Escanear código QR</DialogTitle>
            <DialogDescription>
              Apunta la cámara al código QR para pagar
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-4">
            {/* Contenedor para la cámara */}
            <div id={scannerContainerId} className="bg-gray-100 rounded-md mb-4" style={{ minHeight: '250px' }}>
              {/* El escáner QR se montará aquí */}
            </div>
            
            <div className="flex justify-center">
              <Button 
                variant="outline" 
                onClick={() => {
                  if (scannerRef.current) {
                    scannerRef.current.stop().catch(err => {
                      
                    });
                  }
                  setShowScanDialog(false);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QrPage;