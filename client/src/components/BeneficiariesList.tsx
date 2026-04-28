import { useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useStore } from '@/lib/store';
import { Plus } from 'lucide-react';
import { Beneficiary } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

declare global {
  interface Navigator {
    contacts?: {
      select: (properties: string[], options?: { multiple?: boolean }) => Promise<Array<{
        name?: string[];
        tel?: string[];
        email?: string[];
      }>>;
    };
  }
}

const isContactsSupported = () =>
  typeof navigator !== 'undefined' &&
  'contacts' in navigator &&
  typeof navigator.contacts?.select === 'function';

const BeneficiariesList = () => {
  const { toast } = useToast();
  const setBeneficiaries = useStore((state) => state.setBeneficiaries);

  const { data: beneficiaries, isLoading } = useQuery<Beneficiary[]>({
    queryKey: ['/api/beneficiaries'],
  });

  useEffect(() => {
    if (beneficiaries) {
      setBeneficiaries(beneficiaries);
    }
  }, [beneficiaries, setBeneficiaries]);

  const addBeneficiaryMutation = useMutation({
    mutationFn: async (data: { name: string; accountNumber: string; bankName: string }) => {
      const res = await apiRequest('POST', '/api/beneficiaries', data);
      if (!res.ok) throw new Error('Error al agregar beneficiario');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/beneficiaries'] });
      toast({ title: "Beneficiario agregado", description: "El contacto fue guardado exitosamente." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo guardar el contacto.", variant: "destructive" });
    }
  });

  const handleAddContact = async () => {
    if (!isContactsSupported()) {
      toast({
        title: "No disponible",
        description: "Tu navegador no soporta acceso a contactos. Usa Chrome en Android.",
        variant: "destructive",
      });
      return;
    }
    try {
      const results = await navigator.contacts!.select(['name', 'tel'], { multiple: false });
      if (results && results.length > 0) {
        const contact = results[0];
        const name = contact.name?.[0]?.trim() || '';
        const tel = contact.tel?.[0]?.replace(/\s+/g, '').replace(/[^\d+]/g, '') || '';
        if (!name) {
          toast({ title: "Sin nombre", description: "El contacto seleccionado no tiene nombre.", variant: "destructive" });
          return;
        }
        addBeneficiaryMutation.mutate({
          name,
          accountNumber: tel || '000000000',
          bankName: 'Contacto',
        });
      }
    } catch (err: any) {
      if (err?.name === 'SecurityError' || err?.message?.includes('denied')) {
        toast({
          title: "Permiso denegado",
          description: "Permite el acceso a contactos para agregar beneficiarios rápido.",
          variant: "destructive",
        });
      } else if (err?.name !== 'AbortError') {
        toast({
          title: "Error",
          description: "No se pudo abrir los contactos.",
          variant: "destructive",
        });
      }
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map(p => p.charAt(0)).join('').toUpperCase().substring(0, 1);

  const getShortenedName = (name: string) => {
    const parts = name.split(' ');
    if (parts.length > 1) return `${parts[0]} ${parts[1].charAt(0)}.`;
    return name;
  };

  if (isLoading) {
    return (
      <div className="flex space-x-4 overflow-x-auto pb-2">
        <div className="flex flex-col items-center min-w-[80px]">
          <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="mt-2 w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="flex flex-col items-center min-w-[80px]">
          <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="mt-2 w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex space-x-4 overflow-x-auto pb-2">
      {beneficiaries && beneficiaries.map((beneficiary) => (
        <div key={beneficiary.id} className="flex flex-col items-center min-w-[80px]">
          <div className="w-12 h-12 bg-[#D50000] text-white rounded-full flex items-center justify-center mb-2">
            <span className="text-lg font-bold">{getInitials(beneficiary.name)}</span>
          </div>
          <span className="text-xs text-center">{getShortenedName(beneficiary.name)}</span>
        </div>
      ))}

      <div
        className="flex flex-col items-center min-w-[80px] cursor-pointer"
        onClick={handleAddContact}
        data-testid="button-add-beneficiary"
      >
        <div className="w-12 h-12 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center mb-2 hover:bg-red-50 hover:text-red-600 transition-colors">
          <Plus className="w-5 h-5" />
        </div>
        <span className="text-xs text-center text-gray-500">Agregar</span>
      </div>
    </div>
  );
};

export default BeneficiariesList;
