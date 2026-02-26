import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'verifying' | 'paid' | 'pending' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const chargeId = params.get('charge_id');
    const sessionId = params.get('session_id');

    if (chargeId) {
      verifyPayment(chargeId, sessionId);
    } else {
      setStatus('error');
      setMessage('No se encontró información del pago');
    }
  }, []);

  const verifyPayment = async (chargeId: string, sessionId: string | null) => {
    try {
      const response = await apiRequest("POST", `/api/charges/${chargeId}/verify-payment`, {
        session_id: sessionId
      });
      const data = await response.json();
      if (data.status === 'paid') {
        setStatus('paid');
        setMessage('Tu pago ha sido procesado exitosamente. El monto será reflejado en tu cuenta.');
      } else {
        setStatus('pending');
        setMessage('Tu pago está siendo procesado. Se confirmará automáticamente en unos momentos.');
      }
    } catch {
      setStatus('pending');
      setMessage('Tu pago está siendo verificado. Si completaste el pago en Stripe, será confirmado automáticamente.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === 'verifying' && (
            <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto" />
          )}
          {status === 'paid' && (
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
          )}
          {status === 'pending' && (
            <Clock className="h-16 w-16 text-yellow-600 mx-auto" />
          )}
          {status === 'error' && (
            <Clock className="h-16 w-16 text-red-600 mx-auto" />
          )}
          <CardTitle className="mt-4" data-testid="text-payment-status">
            {status === 'verifying' ? 'Verificando pago...' : 
             status === 'paid' ? 'Pago Exitoso' :
             status === 'pending' ? 'Pago en Proceso' : 'Error'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground" data-testid="text-payment-message">{message}</p>
          <Button
            data-testid="button-go-home"
            onClick={() => setLocation("/")}
            className="w-full"
          >
            Volver al inicio
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
