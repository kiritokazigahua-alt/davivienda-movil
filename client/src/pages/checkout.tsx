import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, CreditCard, ArrowRight, Lock, CheckCircle, Copy, Check, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { CurrencyCode } from "@/types";

interface CheckoutData {
  id: number;
  reason: string;
  description: string | null;
  amount: number;
  currency: string;
  status: string;
  orderId: string;
  paymentUrl: string;
  brandName: string;
  brandTagline: string;
}

export default function CheckoutPage() {
  const params = useParams<{ chargeId: string }>();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchCheckout = async () => {
      try {
        const res = await fetch(`/api/checkout/${params.chargeId}`, { credentials: 'include' });
        if (res.status === 401) {
          setLocation("/");
          return;
        }
        if (!res.ok) {
          const data = await res.json();
          setError(data.message || 'Error al cargar la pasarela de pago');
          setLoading(false);
          return;
        }
        const data = await res.json();
        setCheckout(data);
      } catch {
        setError('No se pudo conectar con el servidor');
      } finally {
        setLoading(false);
      }
    };
    fetchCheckout();
  }, [params.chargeId]);

  const handleCopyLink = async () => {
    if (!checkout) return;
    try {
      await navigator.clipboard.writeText(checkout.paymentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = checkout.paymentUrl;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-[#D50000] animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Cargando pasarela de pago...</p>
        </div>
      </div>
    );
  }

  if (error || !checkout) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-10">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Error</h2>
            <p className="text-gray-600 mb-6" data-testid="text-checkout-error">{error || 'Pago no disponible'}</p>
            <Button
              data-testid="button-checkout-back"
              onClick={() => setLocation("/home")}
              variant="outline"
            >
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (checkout.status === 'paid') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-10">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Pago ya completado</h2>
            <p className="text-gray-600 mb-6">Este cobro ya fue pagado exitosamente.</p>
            <Button
              data-testid="button-checkout-home"
              onClick={() => setLocation("/home")}
            >
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col">
      <div className="bg-[#D50000] text-white py-6 px-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-brand-name">
          {checkout.brandName}
        </h1>
        {checkout.brandTagline && (
          <p className="text-sm opacity-90 mt-1" data-testid="text-brand-tagline">{checkout.brandTagline}</p>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 -mt-6">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="pb-2 pt-6 px-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <span>Pago seguro verificado</span>
            </div>

            <div className="border-b pb-4 mb-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Orden</p>
              <p className="text-sm font-mono text-gray-600" data-testid="text-order-id">{checkout.orderId}</p>
            </div>
          </CardHeader>

          <CardContent className="px-6 pb-6">
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Concepto</p>
                <p className="text-lg font-semibold text-gray-800" data-testid="text-checkout-reason">{checkout.reason}</p>
                {checkout.description && (
                  <p className="text-sm text-gray-500 mt-1" data-testid="text-checkout-description">{checkout.description}</p>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Total a pagar</p>
                <p className="text-3xl font-bold text-gray-900" data-testid="text-checkout-amount">
                  {formatCurrency(checkout.amount, checkout.currency as CurrencyCode)}
                </p>
                <p className="text-sm text-gray-500 mt-1">{checkout.currency}</p>
              </div>

              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-xs text-blue-700">
                  Al hacer clic en "Pagar Ahora" se abrira la pasarela de pago en una nueva ventana. Complete el pago alli.
                </p>
              </div>

              <a
                href={checkout.paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="button-checkout-pay"
                className="flex items-center justify-center gap-2 w-full h-14 text-lg font-bold bg-[#D50000] hover:bg-[#B30000] text-white rounded-md transition-all duration-200 shadow-lg"
              >
                <CreditCard className="h-5 w-5" />
                Pagar Ahora
                <ExternalLink className="h-5 w-5" />
              </a>

              <Button
                data-testid="button-copy-link"
                variant="outline"
                className="w-full h-12 text-sm border-gray-300"
                onClick={handleCopyLink}
              >
                {copied ? (
                  <span className="flex items-center gap-2 text-green-600">
                    <Check className="h-4 w-4" />
                    Link copiado al portapapeles
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Copy className="h-4 w-4" />
                    Copiar link de pago
                  </span>
                )}
              </Button>

              <p className="text-xs text-center text-gray-400">
                Si el boton no abre la pasarela, copie el link y abralo directamente en su navegador.
              </p>

              <Button
                data-testid="button-checkout-cancel"
                variant="ghost"
                className="w-full text-gray-500 hover:text-gray-700"
                onClick={() => setLocation("/home")}
              >
                Cancelar y volver
              </Button>
            </div>

            <div className="mt-6 pt-4 border-t flex items-center justify-center gap-2 text-xs text-gray-400">
              <Lock className="h-3 w-3" />
              <span>Conexion cifrada SSL - Sus datos estan protegidos</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
