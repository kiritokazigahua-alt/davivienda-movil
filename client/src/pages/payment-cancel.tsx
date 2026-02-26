import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export default function PaymentCancel() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <XCircle className="h-16 w-16 text-red-600 mx-auto" />
          <CardTitle className="mt-4" data-testid="text-payment-cancelled">
            Pago Cancelado
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground" data-testid="text-cancel-message">
            El pago no fue completado. Puedes intentarlo de nuevo desde tu cuenta.
          </p>
          <Button
            data-testid="button-go-home-cancel"
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
