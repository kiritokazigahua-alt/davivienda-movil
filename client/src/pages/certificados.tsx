import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { Account } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const CertificadosPage = () => {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [certificateType, setCertificateType] = useState('productos');
  
  const { data: account } = useQuery<Account>({
    queryKey: ['/api/account'],
  });
  
  const handleGenerateCertificate = (type: string) => {
    setIsLoading(true);
    
    // Simular la generación del certificado
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Certificado generado",
        description: "El certificado ha sido generado exitosamente.",
      });
    }, 1500);
  };

  const certificateTypes = [
    { id: 'productos', name: 'Certificado de Productos', icon: <FileText className="h-8 w-8 text-primary" /> },
    { id: 'tributario', name: 'Certificado Tributario', icon: <FileText className="h-8 w-8 text-primary" /> },
    { id: 'extracto', name: 'Extractos Bancarios', icon: <FileText className="h-8 w-8 text-primary" /> },
    { id: 'paz-salvo', name: 'Paz y Salvo', icon: <FileText className="h-8 w-8 text-primary" /> },
  ];

  return (
    <div className="flex flex-col h-full">
      {isLoading && <LoadingOverlay text="Generando certificado..." />}
      
      {/* Header */}
      <div className="bg-primary text-white p-4">
        <div className="flex items-center">
          <button 
            onClick={() => navigate('/home')} 
            className="mr-2 text-white hover:bg-red-700 p-1 rounded"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-semibold">Certificados</h1>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4 bg-gray-100">
        {/* Info Card */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-medium text-gray-800">Genere sus certificados</h3>
              <p className="text-sm text-gray-600">
                Seleccione el tipo de certificado que desea generar
              </p>
            </div>
          </div>
        </div>
        
        {/* Certificates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {certificateTypes.map((cert) => (
            <Card key={cert.id} className="border border-gray-200">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-3">
                  {cert.icon}
                  <CardTitle className="text-base">{cert.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 pt-0">
                <p>Descargue su {cert.name.toLowerCase()} en formato PDF.</p>
              </CardContent>
              <CardFooter className="pt-0">
                <Button
                  onClick={() => handleGenerateCertificate(cert.id)}
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Generar
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Extractos Bancarios */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h3 className="font-medium mb-4 text-gray-800">Extractos Mensuales</h3>
          
          <div className="space-y-4">
            <Select defaultValue="current">
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar período" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }).map((_, i) => {
                  const date = new Date();
                  date.setMonth(date.getMonth() - i);
                  const label = format(date, 'MMMM yyyy', { locale: es });
                  return (
                    <SelectItem key={i} value={`month-${i}`}>
                      {label.charAt(0).toUpperCase() + label.slice(1)}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            
            <Button 
              className="w-full bg-primary hover:bg-primary/90 text-white"
              onClick={() => handleGenerateCertificate('extracto')}
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar Extracto
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificadosPage;