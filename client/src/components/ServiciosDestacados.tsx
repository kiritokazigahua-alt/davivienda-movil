import { useState } from 'react';
import { Key, CreditCard, FileCheck, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface ServicioDestacadoProps {
  icon: React.ReactNode;
  title: string;
  label?: string;
  onClick: () => void;
}

const ServicioDestacado = ({ icon, title, label, onClick }: ServicioDestacadoProps) => {
  return (
    <div className="flex flex-col items-center cursor-pointer" onClick={onClick}>
      <div className="w-16 h-16 rounded-full border-[1px] border-gray-200 flex items-center justify-center mb-2">
        {icon}
      </div>
      {label && <div className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full mb-1">{label}</div>}
      <span className="text-xs text-center">{title}</span>
    </div>
  );
};

export const ServiciosDestacados = () => {
  const { toast } = useToast();
  const [_, navigate] = useLocation();

  const handleTransferConLlaves = () => {
    toast({
      title: "Transferir con llaves",
      description: "Aquí puedes realizar transferencias seguras con llaves de seguridad. Función disponible próximamente.",
    });
  };

  const handleRecargas = () => {
    toast({
      title: "Recargas",
      description: "Aquí puedes realizar recargas a celulares, transporte y más. Función disponible próximamente.",
    });
  };

  const handlePazYSalvo = () => {
    toast({
      title: "Paz y salvo",
      description: "Aquí puedes generar certificados de paz y salvo. Función disponible próximamente.",
    });
  };

  const handleCertificados = () => {
    toast({
      title: "Certificados",
      description: "Aquí puedes solicitar y descargar certificados bancarios. Función disponible próximamente.",
    });
  };

  const handleRetirarSinTarjeta = () => {
    toast({
      title: "Retirar sin tarjeta",
      description: "Aquí puedes generar códigos para retirar dinero sin tarjeta. Función disponible próximamente.",
    });
  };

  return (
    <div className="bg-white rounded-lg p-5 shadow-sm">
      <h2 className="text-xl font-bold mb-6">Servicios destacados</h2>
      
      <div className="grid grid-cols-3 gap-6 mb-6">
        <ServicioDestacado 
          icon={<Key className="h-6 w-6 text-primary" />} 
          title="Transferir con llaves"
          label="Nuevo"
          onClick={handleTransferConLlaves}
        />
        
        <ServicioDestacado 
          icon={<CreditCard className="h-6 w-6 text-primary" />} 
          title="Recargas"
          onClick={handleRecargas}
        />
        
        <ServicioDestacado 
          icon={<MessageSquare className="h-6 w-6 text-primary" />} 
          title="Paz y salvo"
          onClick={handlePazYSalvo}
        />
      </div>
      
      <div className="grid grid-cols-3 gap-6">
        <ServicioDestacado 
          icon={<FileCheck className="h-6 w-6 text-primary" />} 
          title="Certificados"
          onClick={handleCertificados}
        />
        
        <ServicioDestacado 
          icon={<CreditCard className="h-6 w-6 text-primary" />} 
          title="Retirar sin tarjeta"
          onClick={handleRetirarSinTarjeta}
        />
      </div>
    </div>
  );
};