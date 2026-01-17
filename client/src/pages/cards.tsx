import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, CreditCard, Plus, ClipboardList, CheckCircle, Clock, XCircle, Lock, Snowflake } from "lucide-react";
import { Card as CardType, CardStatus } from "@/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const CardsPage = () => {
  const [_, navigate] = useLocation();
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
  const [requestData, setRequestData] = useState({
    cardType: "debit",
    cardBrand: "visa"
  });
  const [registerData, setRegisterData] = useState({
    cardNumber: "",
    cardType: "debit",
    cardBrand: "visa",
    expirationDate: "",
    cvv: ""
  });

  const { data: cards, isLoading } = useQuery<CardType[]>({
    queryKey: ['/api/cards'],
  });

  const requestCardMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/cards/request", requestData);
      if (!response.ok) {
        throw new Error("Error al solicitar tarjeta");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cards'] });
      setIsRequestDialogOpen(false);
      toast({
        title: "Solicitud enviada",
        description: "Su solicitud de tarjeta ha sido enviada y está pendiente de aprobación.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo enviar la solicitud",
        variant: "destructive",
      });
    }
  });

  const registerCardMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/cards/register", registerData);
      if (!response.ok) {
        throw new Error("Error al inscribir tarjeta");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cards'] });
      setIsRegisterDialogOpen(false);
      setRegisterData({
        cardNumber: "",
        cardType: "debit",
        cardBrand: "visa",
        expirationDate: "",
        cvv: ""
      });
      toast({
        title: "Inscripción enviada",
        description: "Su tarjeta ha sido enviada para revisión y aprobación.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo inscribir la tarjeta",
        variant: "destructive",
      });
    }
  });

  const getStatusIcon = (status: CardStatus) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'blocked':
        return <Lock className="w-5 h-5 text-red-500" />;
      case 'frozen':
        return <Snowflake className="w-5 h-5 text-blue-400" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-gray-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: CardStatus) => {
    switch (status) {
      case 'active': return 'Activa';
      case 'pending': return 'Pendiente de aprobación';
      case 'blocked': return 'Bloqueada';
      case 'frozen': return 'Congelada';
      case 'rejected': return 'Rechazada';
      default: return status;
    }
  };

  const getStatusColor = (status: CardStatus) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500 text-black';
      case 'blocked': return 'bg-red-500';
      case 'frozen': return 'bg-blue-300';
      case 'rejected': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <div className="bg-[#D50000] text-white p-4">
        <div className="flex items-center">
          <button 
            onClick={() => navigate('/home')} 
            className="mr-2 text-white hover-elevate p-1 rounded"
            data-testid="button-back"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-semibold">Mis Tarjetas</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3 mb-6">
            <Button 
              className="flex-1 bg-[#D50000] border-[#D50000]"
              onClick={() => setIsRequestDialogOpen(true)}
              data-testid="button-request-card"
            >
              <Plus className="w-4 h-4 mr-2" />
              Solicitar Tarjeta
            </Button>
            <Button 
              variant="outline"
              className="flex-1"
              onClick={() => setIsRegisterDialogOpen(true)}
              data-testid="button-register-card"
            >
              <ClipboardList className="w-4 h-4 mr-2" />
              Inscribir Tarjeta
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin h-8 w-8 border-4 border-[#D50000] border-t-transparent rounded-full"></div>
            </div>
          ) : cards && cards.length > 0 ? (
            <div className="space-y-4">
              {cards.map((card) => (
                <Card key={card.id} className="overflow-hidden" data-testid={`card-item-${card.id}`}>
                  <div className={`h-2 ${card.cardBrand === 'visa' ? 'bg-blue-600' : 'bg-red-600'}`}></div>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-6 h-6 text-gray-600" />
                        <CardTitle className="text-lg">
                          {card.cardType === 'debit' ? 'Tarjeta Débito' : 'Tarjeta Crédito'}
                        </CardTitle>
                      </div>
                      <Badge className={getStatusColor(card.status as CardStatus)}>
                        {getStatusText(card.status as CardStatus)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Número</span>
                        <span className="font-mono text-lg">{card.cardNumber}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Marca</span>
                        <span className="font-medium capitalize">{card.cardBrand}</span>
                      </div>
                      {card.status === 'active' && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">Saldo disponible</span>
                            <span className="font-bold text-lg">{formatCurrency(card.balance)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">Estado del saldo</span>
                            <Badge className={
                              card.balanceStatus === 'active' ? 'bg-green-500' :
                              card.balanceStatus === 'blocked' ? 'bg-red-500' : 'bg-blue-300'
                            }>
                              {card.balanceStatus === 'active' ? 'Activo' :
                               card.balanceStatus === 'blocked' ? 'Bloqueado' : 'Congelado'}
                            </Badge>
                          </div>
                        </>
                      )}
                      {card.status === 'pending' && (
                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center gap-2 text-yellow-700">
                            <Clock className="w-5 h-5" />
                            <span className="font-medium">Esperando aprobación</span>
                          </div>
                          <p className="text-sm text-yellow-600 mt-1">
                            Su solicitud está siendo revisada. Le notificaremos cuando sea aprobada.
                          </p>
                        </div>
                      )}
                      {card.status === 'rejected' && (
                        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="flex items-center gap-2 text-gray-700">
                            <XCircle className="w-5 h-5" />
                            <span className="font-medium">Solicitud rechazada</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Lamentamos informarle que su solicitud no fue aprobada.
                          </p>
                        </div>
                      )}
                      {(card.status === 'blocked' || card.status === 'frozen') && (
                        <div className={`mt-4 p-4 ${card.status === 'blocked' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'} border rounded-lg`}>
                          <div className={`flex items-center gap-2 ${card.status === 'blocked' ? 'text-red-700' : 'text-blue-700'}`}>
                            {card.status === 'blocked' ? <Lock className="w-5 h-5" /> : <Snowflake className="w-5 h-5" />}
                            <span className="font-medium">
                              {card.status === 'blocked' ? 'Tarjeta bloqueada' : 'Tarjeta congelada'}
                            </span>
                          </div>
                          <p className={`text-sm ${card.status === 'blocked' ? 'text-red-600' : 'text-blue-600'} mt-1`}>
                            {card.status === 'blocked' 
                              ? 'Su tarjeta ha sido bloqueada. Contacte a soporte para más información.'
                              : 'Su tarjeta está temporalmente congelada. Contacte a soporte para reactivarla.'}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <CreditCard className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No tienes tarjetas</h3>
                <p className="text-gray-500 mb-4">
                  Solicita una nueva tarjeta o inscribe una tarjeta existente.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#D50000]">Solicitar Nueva Tarjeta</DialogTitle>
            <DialogDescription>
              Complete los datos para solicitar una nueva tarjeta. Su solicitud será revisada por un administrador.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cardType">Tipo de Tarjeta</Label>
              <Select 
                value={requestData.cardType} 
                onValueChange={(value) => setRequestData({...requestData, cardType: value})}
              >
                <SelectTrigger data-testid="select-card-type">
                  <SelectValue placeholder="Seleccione tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debit">Débito</SelectItem>
                  <SelectItem value="credit">Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="cardBrand">Marca</Label>
              <Select 
                value={requestData.cardBrand} 
                onValueChange={(value) => setRequestData({...requestData, cardBrand: value})}
              >
                <SelectTrigger data-testid="select-card-brand">
                  <SelectValue placeholder="Seleccione marca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visa">Visa</SelectItem>
                  <SelectItem value="mastercard">Mastercard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-[#D50000] border-[#D50000]"
              onClick={() => requestCardMutation.mutate()}
              disabled={requestCardMutation.isPending}
              data-testid="button-submit-request"
            >
              {requestCardMutation.isPending ? 'Enviando...' : 'Solicitar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRegisterDialogOpen} onOpenChange={setIsRegisterDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#D50000]">Inscribir Tarjeta Existente</DialogTitle>
            <DialogDescription>
              Ingrese los datos de su tarjeta existente. La información será verificada antes de la inscripción.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cardNumber">Número de Tarjeta</Label>
              <Input
                id="cardNumber"
                placeholder="XXXX-XXXX-XXXX-XXXX"
                value={registerData.cardNumber}
                onChange={(e) => setRegisterData({...registerData, cardNumber: e.target.value})}
                data-testid="input-card-number"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="expirationDate">Fecha de Vencimiento</Label>
                <Input
                  id="expirationDate"
                  placeholder="MM/AA"
                  value={registerData.expirationDate}
                  onChange={(e) => setRegisterData({...registerData, expirationDate: e.target.value})}
                  data-testid="input-expiration"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  placeholder="XXX"
                  value={registerData.cvv}
                  onChange={(e) => setRegisterData({...registerData, cvv: e.target.value})}
                  maxLength={4}
                  data-testid="input-cvv"
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="regCardType">Tipo de Tarjeta</Label>
              <Select 
                value={registerData.cardType} 
                onValueChange={(value) => setRegisterData({...registerData, cardType: value})}
              >
                <SelectTrigger data-testid="select-reg-card-type">
                  <SelectValue placeholder="Seleccione tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debit">Débito</SelectItem>
                  <SelectItem value="credit">Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="regCardBrand">Marca</Label>
              <Select 
                value={registerData.cardBrand} 
                onValueChange={(value) => setRegisterData({...registerData, cardBrand: value})}
              >
                <SelectTrigger data-testid="select-reg-card-brand">
                  <SelectValue placeholder="Seleccione marca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visa">Visa</SelectItem>
                  <SelectItem value="mastercard">Mastercard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRegisterDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-[#D50000] border-[#D50000]"
              onClick={() => registerCardMutation.mutate()}
              disabled={registerCardMutation.isPending || !registerData.cardNumber || !registerData.expirationDate}
              data-testid="button-submit-register"
            >
              {registerCardMutation.isPending ? 'Inscribiendo...' : 'Inscribir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CardsPage;
