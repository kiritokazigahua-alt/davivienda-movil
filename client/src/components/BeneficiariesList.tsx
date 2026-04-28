import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useStore } from '@/lib/store';
import { Plus, Send, HandCoins, Phone, Mail, CreditCard, Trash2 } from 'lucide-react';
import { Beneficiary } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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

interface ExtendedBeneficiary extends Beneficiary {
  userName?: string;
}

const BeneficiariesList = () => {
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const setBeneficiaries = useStore((state) => state.setBeneficiaries);

  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<ExtendedBeneficiary | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [requestAmount, setRequestAmount] = useState('');

  const { data: beneficiaries, isLoading } = useQuery<ExtendedBeneficiary[]>({
    queryKey: ['/api/beneficiaries'],
  });

  useEffect(() => {
    if (beneficiaries) {
      setBeneficiaries(beneficiaries as any);
    }
  }, [beneficiaries, setBeneficiaries]);

  const addBeneficiaryMutation = useMutation({
    mutationFn: async (data: { name: string; accountNumber: string; bankName?: string; bank?: string; accountType?: string; phone?: string; email?: string }) => {
      const payload = {
        name: data.name,
        bank: data.bank || data.bankName || 'Contacto',
        accountNumber: data.accountNumber || '000000000',
        accountType: data.accountType || 'ahorros',
        phone: data.phone || null,
        email: data.email || null,
      };
      const res = await apiRequest('POST', '/api/beneficiaries', payload);
      if (!res.ok) throw new Error('Error al agregar beneficiario');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/beneficiaries'] });
      toast({ title: "Contacto guardado", description: "El contacto fue agregado a tus beneficiarios." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo guardar el contacto.", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/beneficiaries/${id}`, undefined);
      if (!res.ok) throw new Error('Error al eliminar');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/beneficiaries'] });
      toast({ title: "Contacto eliminado" });
    },
    onError: () => {
      toast({ title: "Error al eliminar", variant: "destructive" });
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
      const results = await navigator.contacts!.select(['name', 'tel', 'email'], { multiple: false });
      if (results && results.length > 0) {
        const contact = results[0];
        const name = contact.name?.[0]?.trim() || '';
        const tel = contact.tel?.[0]?.replace(/\s+/g, '').replace(/[^\d+]/g, '') || '';
        const email = contact.email?.[0]?.trim() || '';
        if (!name) {
          toast({ title: "Sin nombre", description: "El contacto no tiene nombre.", variant: "destructive" });
          return;
        }
        addBeneficiaryMutation.mutate({ name, accountNumber: tel, bank: 'Contacto', accountType: 'ahorros', phone: tel, email });
      }
    } catch (err: any) {
      if (err?.name === 'SecurityError' || err?.message?.includes('denied')) {
        toast({ title: "Permiso denegado", description: "Permite el acceso a contactos para continuar.", variant: "destructive" });
      } else if (err?.name !== 'AbortError') {
        toast({ title: "Error", description: "No se pudo abrir los contactos.", variant: "destructive" });
      }
    }
  };

  const handleSend = (b: ExtendedBeneficiary) => {
    const params = new URLSearchParams();
    if (b.accountNumber && b.accountNumber !== '000000000') params.set('account', b.accountNumber);
    if (b.bank) params.set('bank', b.bank);
    if (b.name) params.set('name', b.name);
    navigate(`/transfers?${params.toString()}`);
  };

  const handleRequest = (b: ExtendedBeneficiary) => {
    setSelectedBeneficiary(b);
    setRequestAmount('');
    setRequestMessage(`Hola ${b.name.split(' ')[0]}, te solicito un pago.`);
    setRequestDialogOpen(true);
  };

  const handleSendRequest = () => {
    if (!selectedBeneficiary) return;
    const contact = selectedBeneficiary.phone || selectedBeneficiary.email || selectedBeneficiary.accountNumber;
    const amountText = requestAmount ? ` de $${requestAmount}` : '';
    const text = encodeURIComponent(`${requestMessage}${amountText ? ` Monto${amountText}.` : ''}`);

    if (selectedBeneficiary.phone) {
      window.open(`https://wa.me/${selectedBeneficiary.phone.replace(/[^\d]/g, '')}?text=${text}`, '_blank');
    } else if (selectedBeneficiary.email) {
      window.open(`mailto:${selectedBeneficiary.email}?subject=Solicitud de pago&body=${decodeURIComponent(text)}`, '_blank');
    } else {
      toast({ title: "Sin contacto", description: "Este beneficiario no tiene teléfono ni correo registrado." });
    }
    setRequestDialogOpen(false);
  };

  const getInitials = (name: string) =>
    name.split(' ').filter(Boolean).slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('');

  if (isLoading) {
    return (
      <div className="flex space-x-3 overflow-x-auto pb-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex-shrink-0 w-48 h-36 bg-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex space-x-3 overflow-x-auto pb-2">
        {beneficiaries && beneficiaries.map((b) => (
          <div
            key={b.id}
            className="flex-shrink-0 w-52 bg-white border border-gray-100 rounded-xl shadow-sm p-3 flex flex-col gap-2"
            data-testid={`card-beneficiary-${b.id}`}
          >
            {/* Header */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                {getInitials(b.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{b.name}</p>
                <p className="text-xs text-gray-500 truncate">{b.bank}</p>
              </div>
              <button
                className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                onClick={() => deleteMutation.mutate(b.id)}
                data-testid={`button-delete-beneficiary-${b.id}`}
                title="Eliminar"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Info sin censura */}
            <div className="space-y-0.5 text-xs text-gray-600">
              {b.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className="font-mono">{b.phone}</span>
                </div>
              )}
              {b.email && (
                <div className="flex items-center gap-1">
                  <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{b.email}</span>
                </div>
              )}
              {b.accountNumber && b.accountNumber !== '000000000' && (
                <div className="flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className="font-mono">{b.accountNumber}</span>
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="flex gap-1.5 mt-auto pt-1">
              <button
                onClick={() => handleSend(b)}
                data-testid={`button-send-beneficiary-${b.id}`}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
              >
                <Send className="w-3 h-3" />
                Enviar
              </button>
              <button
                onClick={() => handleRequest(b)}
                data-testid={`button-request-beneficiary-${b.id}`}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors"
              >
                <HandCoins className="w-3 h-3" />
                Pedir
              </button>
            </div>
          </div>
        ))}

        {/* Agregar */}
        <div
          className="flex-shrink-0 w-36 h-full min-h-[9rem] border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-red-300 hover:bg-red-50 transition-colors group"
          onClick={handleAddContact}
          data-testid="button-add-beneficiary"
        >
          <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-red-100 flex items-center justify-center transition-colors">
            <Plus className="w-5 h-5 text-gray-400 group-hover:text-red-500" />
          </div>
          <span className="text-xs text-gray-400 group-hover:text-red-500 font-medium text-center px-2">
            {isContactsSupported() ? 'Agregar del directorio' : 'Agregar contacto'}
          </span>
        </div>
      </div>

      {/* Diálogo de Pedir */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Solicitar pago</DialogTitle>
            <DialogDescription>
              {selectedBeneficiary?.name} — {selectedBeneficiary?.phone || selectedBeneficiary?.email || 'Sin contacto'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs mb-1 block">Monto a solicitar (opcional)</Label>
              <Input
                type="number"
                placeholder="Ej: 50000"
                value={requestAmount}
                onChange={e => setRequestAmount(e.target.value)}
                data-testid="input-request-amount"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Mensaje</Label>
              <Textarea
                rows={3}
                value={requestMessage}
                onChange={e => setRequestMessage(e.target.value)}
                data-testid="input-request-message"
              />
            </div>
            {!selectedBeneficiary?.phone && !selectedBeneficiary?.email && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded p-2">
                Este contacto no tiene teléfono ni correo registrado. No se podrá enviar la solicitud.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSendRequest}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={!selectedBeneficiary?.phone && !selectedBeneficiary?.email}
              data-testid="button-confirm-request"
            >
              {selectedBeneficiary?.phone ? 'Enviar por WhatsApp' : 'Enviar por correo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BeneficiariesList;
