import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { User, Account, Transaction, UserSession, CURRENCIES, CurrencyCode, Card as CardType, CardNotification } from "@/types";
import { formatCurrency, formatCurrencyWithCode, formatDateTime } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { LoadingOverlay, showLoading, hideLoading } from "@/components/LoadingOverlay";

// Interfaces para datos extendidos
interface ExtendedUserSession extends UserSession {
  userName?: string;
}

interface ExtendedTransaction extends Transaction {
  accountNumber?: string;
  userName?: string;
}

interface ExtendedAccount extends Account {
  userName?: string;
}

interface ExtendedCard extends CardType {
  userName?: string;
  userDocument?: string;
}

// Interfaz para alertas personalizadas
interface Alert {
  id: number;
  title: string;
  message: string;
  color: 'red' | 'blue' | 'yellow' | 'orange' | 'white';
  active: boolean;
  createdAt: string;
}

// Componente principal de administración
const AdminPage = () => {
  const user = useStore((state) => state.user);
  
  // Estado para datos de administración
  const [users, setUsers] = useState<User[]>([]);
  const [accounts, setAccounts] = useState<ExtendedAccount[]>([]);
  const [transactions, setTransactions] = useState<ExtendedTransaction[]>([]);
  const [sessions, setSessions] = useState<ExtendedUserSession[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [adminCards, setAdminCards] = useState<ExtendedCard[]>([]);
  const [cardNotifications, setCardNotifications] = useState<CardNotification[]>([]);
  const [appSettings, setAppSettings] = useState<{key: string, value: string, description?: string}[]>([]);
  const [supportPhone, setSupportPhone] = useState("+573208646620");

  // Estado para audit logs
  interface AuditLogEntry {
    id: number;
    userId: number | null;
    action: string;
    details: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    entityType: string | null;
    entityId: number | null;
    createdAt: string;
    userName: string | null;
  }
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditActionFilter, setAuditActionFilter] = useState("");
  const [auditUserFilter, setAuditUserFilter] = useState("");
  const [auditDateFrom, setAuditDateFrom] = useState("");
  const [auditDateTo, setAuditDateTo] = useState("");

  // Estado para cobros y accesos
  const [charges, setCharges] = useState<any[]>([]);
  const [isChargeDialogOpen, setIsChargeDialogOpen] = useState(false);
  const [newCharge, setNewCharge] = useState({
    accountId: 0,
    type: "cobro",
    title: "",
    description: "",
    amount: "",
    currency: "COP",
    applyToBalance: false,
    paymentMethod: "custom_link" as "stripe" | "custom_link" | "none",
    customPaymentLink: "",
    interestRate: "",
    discountPercent: "",
    scheduledDate: "",
    expiresAt: ""
  });
  // Per-user support phone state
  const [userSupportPhoneDialog, setUserSupportPhoneDialog] = useState<{open: boolean; userId: number; name: string; current: string}>({
    open: false, userId: 0, name: "", current: ""
  });
  const [newUserSupportPhone, setNewUserSupportPhone] = useState("");
  const [isCreateCardDialogOpen, setIsCreateCardDialogOpen] = useState(false);
  const [isEditCardDialogOpen, setIsEditCardDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<ExtendedCard | null>(null);
  const [newCardData, setNewCardData] = useState({
    userId: 0,
    cardNumber: "",
    cardType: "debit",
    cardBrand: "visa",
    expirationDate: "",
    cvv: "",
    status: "active",
    balance: 0,
    balanceStatus: "active"
  });
  const [statistics, setStatistics] = useState<any>({
    totalUsers: 0,
    activeAccounts: 0,
    blockedAccounts: 0,
    activeSessions: 0,
    recentUsers: []
  });
  
  // Estado para filtros
  const [userFilter, setUserFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [transactionFilter, setTransactionFilter] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");
  
  // Estado para diálogos
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isAddBalanceDialogOpen, setIsAddBalanceDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [isEditAccountDialogOpen, setIsEditAccountDialogOpen] = useState(false);
  const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false);
  
  // Estado para datos de formularios
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    name: "",
    email: "",
    document: "",
    phone: ""
  });
  
  const [editUser, setEditUser] = useState({
    id: 0,
    username: "",
    password: "",
    name: "",
    email: "",
    document: "",
    phone: ""
  });
  
  const [balanceData, setBalanceData] = useState({
    accountId: 0,
    accountInfo: "",
    amount: 0,
    sucursal: "Sucursal Principal",
    message: "",
    reference: "",
    transactionName: "" // Nuevo campo para personalizar el nombre de la transacción
  });
  
  const [statusData, setStatusData] = useState({
    accountId: 0,
    accountInfo: "",
    status: "",
    statusMessage: ""
  });
  
  const [editAccountData, setEditAccountData] = useState({
    id: 0,
    userId: 0,
    accountNumber: "",
    accountType: "",
    balance: 0,
    status: "",
    statusMessage: "",
    currency: "COP" as CurrencyCode
  });
  
  const [alertData, setAlertData] = useState({
    title: "",
    message: "",
    color: "red" as 'red' | 'blue' | 'yellow' | 'orange' | 'white'
  });

  const [deleteAccountData, setDeleteAccountData] = useState({
    accountId: 0,
    accountInfo: ""
  });
  
  // WebSocket para notificaciones en tiempo real
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  // Verificar si el usuario es administrador
  const isAdmin = user?.isAdmin === 1;
  
  // Efecto para cargar datos iniciales
  useEffect(() => {
    if (isAdmin) {
      fetchDashboardData();
      connectWebSocket();
      // Inicializar algunas alertas de ejemplo
      setAlerts([
        {
          id: 1,
          title: "Mantenimiento Programado",
          message: "El sistema estará en mantenimiento el día 10 de Mayo de 2025 de 2:00 AM a 4:00 AM",
          color: "blue",
          active: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 2,
          title: "Alerta de Seguridad",
          message: "Se ha detectado un intento de phishing. No comparta su información personal por correo o mensajes.",
          color: "red",
          active: true,
          createdAt: new Date().toISOString()
        }
      ]);
    }
    
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [isAdmin]);
  
  // Conexión WebSocket
  const connectWebSocket = () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const newSocket = new WebSocket(wsUrl);
    
    newSocket.onopen = () => {
      setIsConnected(true);
    };
    
    newSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "admin_notification") {
          setNotifications(prev => [data.message, ...prev]);
          fetchDashboardData();
        }
      } catch {}
    };
    
    newSocket.onclose = () => {
      setIsConnected(false);
      setTimeout(connectWebSocket, 5000);
    };
    
    newSocket.onerror = () => {};
    
    setSocket(newSocket);
  };
  
  // Funciones para cargar datos
  const fetchDashboardData = async () => {
    try {
      showLoading("Cargando información...");
      const stats = await apiRequest("GET", "/api/admin/statistics");
      setStatistics(await stats.json());
      
      // Fetch recent sessions for activity log
      const sessionsResponse = await apiRequest("GET", "/api/admin/sessions");
      const sessionsData = await sessionsResponse.json();
      
      // Convert sessions to activity log format
      const recentActivities = sessionsData.slice(0, 10).map((session: ExtendedUserSession) => {
        const loginTime = new Date(session.loginTime).toLocaleString('es-CO');
        if (session.logoutTime) {
          const logoutTime = new Date(session.logoutTime).toLocaleString('es-CO');
          return `[LOGOUT] ${session.userName || 'Usuario'} cerró sesión - ${logoutTime}`;
        } else {
          return `[LOGIN] ${session.userName || 'Usuario'} inició sesión - ${loginTime}`;
        }
      });
      
      // Set the activity log with session data (will be updated by WebSocket for new events)
      setNotifications(prev => prev.length === 0 ? recentActivities : prev);
      
      hideLoading();
    } catch (error) {
      hideLoading();
      toast({
        title: "Error",
        description: "No se pudieron cargar las estadísticas",
        variant: "destructive",
      });
    }
  };
  
  const fetchUsers = async () => {
    try {
      showLoading("Cargando usuarios...");
      const response = await apiRequest("GET", "/api/admin/users");
      const data = await response.json();
      setUsers(data);
      hideLoading();
    } catch (error) {
      hideLoading();
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      });
    }
  };
  
  const fetchAccounts = async () => {
    try {
      showLoading("Cargando cuentas...");
      const response = await apiRequest("GET", "/api/admin/accounts");
      const data = await response.json();
      setAccounts(data);
      hideLoading();
    } catch (error) {
      hideLoading();
      toast({
        title: "Error",
        description: "No se pudieron cargar las cuentas",
        variant: "destructive",
      });
    }
  };
  
  const fetchTransactions = async () => {
    try {
      showLoading("Cargando transacciones...");
      const response = await apiRequest("GET", "/api/admin/transactions");
      const data = await response.json();
      setTransactions(data);
      hideLoading();
    } catch (error) {
      hideLoading();
      toast({
        title: "Error",
        description: "No se pudieron cargar las transacciones",
        variant: "destructive",
      });
    }
  };
  
  const fetchSessions = async () => {
    try {
      showLoading("Cargando sesiones...");
      const response = await apiRequest("GET", "/api/admin/sessions");
      const data = await response.json();
      setSessions(data);
      hideLoading();
    } catch (error) {
      hideLoading();
      toast({
        title: "Error",
        description: "No se pudieron cargar las sesiones",
        variant: "destructive",
      });
    }
  };
  
  const fetchCards = async () => {
    try {
      showLoading("Cargando tarjetas...");
      const response = await apiRequest("GET", "/api/admin/cards");
      const data = await response.json();
      setAdminCards(data);
      hideLoading();
    } catch (error) {
      hideLoading();
      toast({
        title: "Error",
        description: "No se pudieron cargar las tarjetas",
        variant: "destructive",
      });
    }
  };
  
  const fetchSettings = async () => {
    try {
      const response = await apiRequest("GET", "/api/admin/settings");
      const data = await response.json();
      setAppSettings(data);
      const phoneSetting = data.find((s: any) => s.key === "support_phone");
      if (phoneSetting) {
        setSupportPhone(phoneSetting.value);
      }
    } catch (error) {
    }
  };

  const fetchAuditLogs = async () => {
    try {
      showLoading("Cargando registro de actividad...");
      const response = await apiRequest("GET", "/api/admin/audit-logs");
      const data = await response.json();
      setAuditLogs(data);
      hideLoading();
    } catch (error) {
      hideLoading();
      toast({
        title: "Error",
        description: "No se pudieron cargar los registros de actividad",
        variant: "destructive",
      });
    }
  };
  
  const handleSaveSupportPhone = async () => {
    try {
      if (!supportPhone || supportPhone.trim() === "") {
        toast({
          title: "Error",
          description: "El número no puede estar vacío",
          variant: "destructive",
        });
        return;
      }
      showLoading("Guardando configuración...");
      const response = await apiRequest("PUT", "/api/admin/settings/support_phone", {
        value: supportPhone.trim(),
        description: "Número de WhatsApp de soporte al cliente"
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMsg = errorData?.message || "Error al guardar";
        if (response.status === 401 || response.status === 403) {
          throw new Error("Sesión expirada. Cierre sesión y vuelva a iniciar como administrador.");
        }
        throw new Error(errorMsg);
      }
      toast({
        title: "Configuración guardada",
        description: `Número de soporte actualizado a: ${supportPhone.trim()}`,
      });
      hideLoading();
    } catch (error: any) {
      hideLoading();
      toast({
        title: "Error",
        description: error?.message || "No se pudo guardar la configuración",
        variant: "destructive",
      });
    }
  };
  
  const handleCreateCard = async () => {
    try {
      if (!newCardData.userId || !newCardData.cardNumber) {
        toast({
          title: "Error",
          description: "Usuario y número de tarjeta son requeridos",
          variant: "destructive",
        });
        return;
      }
      
      showLoading("Creando tarjeta...");
      const response = await apiRequest("POST", "/api/admin/cards", newCardData);
      if (!response.ok) {
        throw new Error("Error al crear tarjeta");
      }
      
      setIsCreateCardDialogOpen(false);
      setNewCardData({
        userId: 0,
        cardNumber: "",
        cardType: "debit",
        cardBrand: "visa",
        expirationDate: "",
        cvv: "",
        status: "active",
        balance: 0,
        balanceStatus: "active"
      });
      fetchCards();
      toast({
        title: "Tarjeta creada",
        description: "La tarjeta ha sido creada exitosamente",
      });
      hideLoading();
    } catch (error) {
      hideLoading();
      toast({
        title: "Error",
        description: "No se pudo crear la tarjeta",
        variant: "destructive",
      });
    }
  };
  
  const handleEditCard = async () => {
    if (!editingCard) return;
    
    try {
      showLoading("Actualizando tarjeta...");
      const response = await apiRequest("PUT", `/api/admin/cards/${editingCard.id}`, {
        cardNumber: editingCard.cardNumber,
        cardType: editingCard.cardType,
        cardBrand: editingCard.cardBrand,
        expirationDate: editingCard.expirationDate,
        cvv: editingCard.cvv,
        status: editingCard.status,
        balance: editingCard.balance,
        balanceStatus: editingCard.balanceStatus
      });
      if (!response.ok) {
        throw new Error("Error al actualizar tarjeta");
      }
      
      setIsEditCardDialogOpen(false);
      setEditingCard(null);
      fetchCards();
      toast({
        title: "Tarjeta actualizada",
        description: "La tarjeta ha sido actualizada exitosamente",
      });
      hideLoading();
    } catch (error) {
      hideLoading();
      toast({
        title: "Error",
        description: "No se pudo actualizar la tarjeta",
        variant: "destructive",
      });
    }
  };
  
  const handleApproveCard = async (cardId: number) => {
    try {
      showLoading("Aprobando tarjeta...");
      const response = await apiRequest("PUT", `/api/admin/cards/${cardId}/approve`);
      if (!response.ok) {
        throw new Error("Error al aprobar tarjeta");
      }
      fetchCards();
      toast({
        title: "Tarjeta aprobada",
        description: "La tarjeta ha sido aprobada exitosamente",
      });
      hideLoading();
    } catch (error) {
      hideLoading();
      toast({
        title: "Error",
        description: "No se pudo aprobar la tarjeta",
        variant: "destructive",
      });
    }
  };
  
  const handleRejectCard = async (cardId: number) => {
    try {
      showLoading("Rechazando tarjeta...");
      const response = await apiRequest("PUT", `/api/admin/cards/${cardId}/reject`);
      if (!response.ok) {
        throw new Error("Error al rechazar tarjeta");
      }
      fetchCards();
      toast({
        title: "Tarjeta rechazada",
        description: "La tarjeta ha sido rechazada",
      });
      hideLoading();
    } catch (error) {
      hideLoading();
      toast({
        title: "Error",
        description: "No se pudo rechazar la tarjeta",
        variant: "destructive",
      });
    }
  };
  
  const handleCardStatusChange = async (cardId: number, status: string) => {
    try {
      showLoading("Actualizando estado de tarjeta...");
      const response = await apiRequest("PUT", `/api/admin/cards/${cardId}/status`, { status });
      if (!response.ok) {
        throw new Error("Error al actualizar estado");
      }
      fetchCards();
      toast({
        title: "Estado actualizado",
        description: `La tarjeta ha sido ${status === 'active' ? 'activada' : status === 'blocked' ? 'bloqueada' : 'congelada'}`,
      });
      hideLoading();
    } catch (error) {
      hideLoading();
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive",
      });
    }
  };
  
  const handleCardBalanceStatusChange = async (cardId: number, balanceStatus: string) => {
    try {
      showLoading("Actualizando estado de saldo...");
      const response = await apiRequest("PUT", `/api/admin/cards/${cardId}/balance-status`, { balanceStatus });
      if (!response.ok) {
        throw new Error("Error al actualizar estado de saldo");
      }
      fetchCards();
      toast({
        title: "Estado de saldo actualizado",
        description: `El saldo ha sido ${balanceStatus === 'active' ? 'activado' : balanceStatus === 'blocked' ? 'bloqueado' : 'congelado'}`,
      });
      hideLoading();
    } catch (error) {
      hideLoading();
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del saldo",
        variant: "destructive",
      });
    }
  };
  
  const handleCardBalanceChange = async (cardId: number, balance: number) => {
    try {
      showLoading("Actualizando saldo...");
      const response = await apiRequest("PUT", `/api/admin/cards/${cardId}/balance`, { balance });
      if (!response.ok) {
        throw new Error("Error al actualizar saldo");
      }
      fetchCards();
      toast({
        title: "Saldo actualizado",
        description: "El saldo de la tarjeta ha sido actualizado",
      });
      hideLoading();
    } catch (error) {
      hideLoading();
      toast({
        title: "Error",
        description: "No se pudo actualizar el saldo",
        variant: "destructive",
      });
    }
  };
  
  // Funciones para crear y actualizar datos
  const handleAddUser = async () => {
    try {
      showLoading("Creando usuario...");
      const response = await apiRequest("POST", "/api/admin/users", newUser);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al crear usuario");
      }
      
      setIsAddUserDialogOpen(false);
      setNewUser({
        username: "",
        password: "",
        name: "",
        email: "",
        document: "",
        phone: ""
      });
      
      fetchUsers();
      fetchDashboardData();
      
      toast({
        title: "Usuario creado",
        description: "El usuario ha sido creado exitosamente",
      });
      hideLoading();
    } catch (error) {
      hideLoading();
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el usuario",
        variant: "destructive",
      });
    }
  };
  
  const handleUpdateUser = async () => {
    try {
      const userData = { ...editUser };
      if (!userData.password) {
        delete userData.password;
      }
      
      showLoading("Actualizando usuario...");
      const response = await apiRequest("PUT", `/api/admin/users/${userData.id}`, userData);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al actualizar usuario");
      }
      
      setIsEditUserDialogOpen(false);
      fetchUsers();
      
      toast({
        title: "Usuario actualizado",
        description: "El usuario ha sido actualizado exitosamente",
      });
      hideLoading();
    } catch (error) {
      hideLoading();
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el usuario",
        variant: "destructive",
      });
    }
  };
  
  const handleAddBalance = async () => {
    try {
      const operationText = balanceData.amount >= 0 ? "añadiendo" : "descontando";
      const loadingText = balanceData.amount >= 0 ? "Añadiendo saldo..." : "Descontando saldo...";
      
      showLoading(loadingText);
      const response = await apiRequest("PUT", `/api/admin/accounts/${balanceData.accountId}/balance`, {
        amount: balanceData.amount,
        sucursal: balanceData.sucursal,
        message: balanceData.message,
        reference: balanceData.reference,
        transactionName: balanceData.transactionName // Enviar el nombre personalizado de la transacción
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error al ${operationText} saldo`);
      }
      
      setIsAddBalanceDialogOpen(false);
      fetchAccounts();
      fetchTransactions();
      
      const operationTitle = balanceData.amount >= 0 ? "Saldo añadido" : "Saldo descontado";
      const operationDesc = balanceData.amount >= 0 
        ? `Se añadieron ${formatCurrency(balanceData.amount)} a la cuenta` 
        : `Se descontaron ${formatCurrency(Math.abs(balanceData.amount))} de la cuenta`;
      
      toast({
        title: operationTitle,
        description: operationDesc,
      });
      hideLoading();
    } catch (error) {
      hideLoading();
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo procesar la operación",
        variant: "destructive",
      });
    }
  };
  
  const handleUpdateStatus = async () => {
    try {
      if (!statusData.status) {
        throw new Error("Debe seleccionar un estado");
      }
      
      showLoading("Actualizando estado...");
      const response = await apiRequest("PUT", `/api/admin/accounts/${statusData.accountId}/status`, {
        status: statusData.status,
        statusMessage: statusData.statusMessage
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al actualizar estado");
      }
      
      setIsStatusDialogOpen(false);
      fetchAccounts();
      
      toast({
        title: "Estado actualizado",
        description: `El estado de la cuenta ha sido actualizado a "${statusData.status}"`,
      });
      hideLoading();
    } catch (error) {
      hideLoading();
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo actualizar el estado",
        variant: "destructive",
      });
    }
  };
  
  const handleUpdateAccount = async () => {
    try {
      showLoading("Actualizando datos de la cuenta...");
      const response = await apiRequest("PUT", `/api/admin/accounts/${editAccountData.id}/update`, editAccountData);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al actualizar los datos de la cuenta");
      }
      
      setIsEditAccountDialogOpen(false);
      fetchAccounts();
      
      toast({
        title: "Cuenta actualizada",
        description: "Los datos de la cuenta han sido actualizados exitosamente",
      });
      hideLoading();
    } catch (error) {
      hideLoading();
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo actualizar la cuenta",
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteAccount = async () => {
    try {
      showLoading("Eliminando cuenta...");
      const response = await apiRequest("DELETE", `/api/admin/accounts/${deleteAccountData.accountId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al eliminar la cuenta");
      }
      
      setIsDeleteAccountDialogOpen(false);
      fetchAccounts(); // Refresh accounts list
      
      toast({
        title: "Cuenta eliminada",
        description: "La cuenta y todas sus transacciones han sido eliminadas exitosamente",
      });
      hideLoading();
    } catch (error) {
      hideLoading();
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar la cuenta",
        variant: "destructive",
      });
    }
  };
  
  const handleAddAlert = () => {
    try {
      if (!alertData.title || !alertData.message) {
        throw new Error("Debe completar el título y el mensaje de la alerta");
      }
      
      const newAlert: Alert = {
        id: alerts.length > 0 ? Math.max(...alerts.map(a => a.id)) + 1 : 1,
        title: alertData.title,
        message: alertData.message,
        color: alertData.color,
        active: true,
        createdAt: new Date().toISOString()
      };
      
      setAlerts([...alerts, newAlert]);
      setIsAlertDialogOpen(false);
      setAlertData({
        title: "",
        message: "",
        color: "red"
      });
      
      toast({
        title: "Alerta creada",
        description: "La alerta ha sido creada exitosamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo crear la alerta",
        variant: "destructive",
      });
    }
  };
  
  const toggleAlertStatus = (id: number) => {
    setAlerts(alerts.map(alert => 
      alert.id === id ? { ...alert, active: !alert.active } : alert
    ));
    
    toast({
      title: "Estado de alerta cambiado",
      description: "Se ha cambiado el estado de la alerta",
    });
  };
  
  const deleteAlert = (id: number) => {
    setAlerts(alerts.filter(alert => alert.id !== id));
    
    toast({
      title: "Alerta eliminada",
      description: "La alerta ha sido eliminada exitosamente",
    });
  };
  
  // Funciones de cobros y accesos
  const fetchCharges = async () => {
    try {
      const response = await fetch("/api/admin/charges");
      if (response.ok) {
        const data = await response.json();
        setCharges(data);
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar los cobros", variant: "destructive" });
    }
  };

  const handleCreateCharge = async () => {
    if (!newCharge.title || !newCharge.accountId) {
      toast({ title: "Campos requeridos", description: "Completa título y cuenta destino", variant: "destructive" });
      return;
    }
    if (newCharge.paymentMethod === "custom_link" && !newCharge.customPaymentLink) {
      toast({ title: "Link requerido", description: "Pega el link de pago (Takenos u otro)", variant: "destructive" });
      return;
    }
    try {
      await apiRequest("POST", "/api/admin/charges", {
        ...newCharge,
        accountId: Number(newCharge.accountId),
        amount: newCharge.amount ? parseFloat(newCharge.amount) : null,
        requireStripePayment: newCharge.paymentMethod === "stripe",
        customPaymentLink: newCharge.paymentMethod === "custom_link" ? newCharge.customPaymentLink : null,
        interestRate: newCharge.interestRate ? parseFloat(newCharge.interestRate) : null,
        discountPercent: newCharge.discountPercent ? parseFloat(newCharge.discountPercent) : null,
        scheduledDate: newCharge.scheduledDate || null,
        expiresAt: newCharge.expiresAt || null
      });
      const desc = newCharge.paymentMethod === "stripe" 
        ? "Cobro creado con link de pago Stripe" 
        : newCharge.paymentMethod === "custom_link"
        ? "Cobro creado con link de pago personalizado"
        : "El cobro fue aplicado correctamente";
      toast({ title: "Cobro creado", description: desc });
      setIsChargeDialogOpen(false);
      setNewCharge({ accountId: 0, type: "cobro", title: "", description: "", amount: "", currency: "COP", applyToBalance: false, paymentMethod: "custom_link", customPaymentLink: "", interestRate: "", discountPercent: "", scheduledDate: "", expiresAt: "" });
      fetchCharges();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo crear el cobro", variant: "destructive" });
    }
  };

  const handleDeleteCharge = async (chargeId: number) => {
    try {
      await apiRequest("DELETE", `/api/admin/charges/${chargeId}`);
      toast({ title: "Cobro eliminado", description: "El cobro fue eliminado correctamente" });
      fetchCharges();
    } catch (error) {
      toast({ title: "Error", description: "No se pudo eliminar el cobro", variant: "destructive" });
    }
  };

  const handleSaveUserSupportPhone = async (phoneOverride?: string) => {
    const phoneToSave = phoneOverride !== undefined ? phoneOverride : newUserSupportPhone;
    try {
      await apiRequest("PUT", `/api/admin/users/${userSupportPhoneDialog.userId}/support-phone`, {
        customSupportPhone: phoneToSave || null
      });
      toast({ title: "Teléfono actualizado", description: phoneToSave ? `Número asignado: ${phoneToSave}` : "Se usará el número global" });
      setUserSupportPhoneDialog({ open: false, userId: 0, name: "", current: "" });
      setNewUserSupportPhone("");
      fetchUsers();
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar el número", variant: "destructive" });
    }
  };

  // Funciones de filtrado
  const filteredUsers = userFilter 
    ? users.filter(u => 
        u.name.toLowerCase().includes(userFilter.toLowerCase()) || 
        u.document.toLowerCase().includes(userFilter.toLowerCase()) ||
        u.email.toLowerCase().includes(userFilter.toLowerCase())
      )
    : users;
  
  const filteredAccounts = accountFilter
    ? accounts.filter(a => 
        a.accountNumber.toLowerCase().includes(accountFilter.toLowerCase()) ||
        (a.userName && a.userName.toLowerCase().includes(accountFilter.toLowerCase()))
      )
    : accounts;
  
  const filteredTransactions = transactionFilter
    ? transactions.filter(t => 
        t.description.toLowerCase().includes(transactionFilter.toLowerCase()) ||
        (t.reference && t.reference.toLowerCase().includes(transactionFilter.toLowerCase())) ||
        t.type.toLowerCase().includes(transactionFilter.toLowerCase())
      )
    : transactions;
  
  const filteredSessions = sessionFilter
    ? sessions.filter(s => 
        (s.userName && s.userName.toLowerCase().includes(sessionFilter.toLowerCase()))
      )
    : sessions;

  // Funciones auxiliares
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "En curso";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours}h ${minutes}m ${secs}s`;
  };
  
  const getTransactionTypeLabel = (type: string) => {
    switch(type) {
      case 'deposit': return <Badge className="bg-green-500">Depósito</Badge>;
      case 'withdrawal': return <Badge className="bg-red-500">Retiro</Badge>;
      case 'transfer': return <Badge className="bg-blue-500">Transferencia</Badge>;
      case 'payment': return <Badge className="bg-yellow-500 text-black">Pago</Badge>;
      default: return <Badge>{type}</Badge>;
    }
  };
  
  // Si el usuario no es administrador, mostrar mensaje de acceso denegado
  if (!isAdmin) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
          <h3 className="font-bold">Acceso Restringido</h3>
          <p>No tienes permisos para acceder al panel de administración.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-3xl font-bold text-red-700 mb-6">Panel de Administración</h1>
      
      {/* Estado de conexión */}
      <div className={`mb-4 p-3 rounded-md text-center ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {isConnected ? 'Conectado al servidor' : 'Desconectado - Intentando reconectar...'}
      </div>
      
      <Tabs defaultValue="dashboard">
        <div className="overflow-x-auto pb-2 mb-4">
          <TabsList className="w-max min-w-full border-b flex-nowrap">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="users" onClick={fetchUsers}>Usuarios</TabsTrigger>
            <TabsTrigger value="accounts" onClick={fetchAccounts}>Cuentas</TabsTrigger>
            <TabsTrigger value="cards" onClick={fetchCards}>Tarjetas</TabsTrigger>
            <TabsTrigger value="transactions" onClick={fetchTransactions}>Transacciones</TabsTrigger>
            <TabsTrigger value="sessions" onClick={fetchSessions}>Sesiones</TabsTrigger>
            <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
            <TabsTrigger value="alerts">Alertas</TabsTrigger>
            <TabsTrigger value="cobros" onClick={() => { fetchCharges(); fetchAccounts(); fetchUsers(); }}>Cobros & Accesos</TabsTrigger>
            <TabsTrigger value="audit" onClick={fetchAuditLogs} data-testid="tab-audit-logs">Registro de Actividad</TabsTrigger>
            <TabsTrigger value="settings" onClick={fetchSettings}>Configuración</TabsTrigger>
          </TabsList>
        </div>
        
        {/* Dashboard */}
        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Usuarios</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{statistics.totalUsers}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Cuentas Activas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">{statistics.activeAccounts}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Cuentas Bloqueadas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-600">{statistics.blockedAccounts}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Sesiones Activas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">{statistics.activeSessions}</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Actividad Reciente</CardTitle>
              </CardHeader>
              <CardContent>
                {notifications.length > 0 ? (
                  <div className="space-y-3">
                    {notifications.slice(0, 5).map((notification, index) => (
                      <div 
                        key={index}
                        className={`p-3 rounded-md ${
                          notification.includes("[LOGIN]") ? "bg-blue-50 border-l-4 border-blue-500" :
                          notification.includes("[LOGOUT]") ? "bg-red-50 border-l-4 border-red-500" :
                          notification.includes("[REGISTRO]") ? "bg-green-50 border-l-4 border-green-500" :
                          "bg-gray-50 border-l-4 border-gray-500"
                        }`}
                      >
                        <p>{notification}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500">No hay actividad reciente</p>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Últimos Usuarios Registrados</CardTitle>
              </CardHeader>
              <CardContent>
                {statistics.recentUsers && statistics.recentUsers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="text-left pb-2">Nombre</th>
                          <th className="text-left pb-2">Documento</th>
                          <th className="text-left pb-2">Último Acceso</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statistics.recentUsers.map((user: User) => (
                          <tr key={user.id} className="border-t">
                            <td className="py-2">{user.name}</td>
                            <td className="py-2">{user.document}</td>
                            <td className="py-2">{formatDateTime(user.lastLogin)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-gray-500">No hay usuarios registrados recientemente</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Users Tab */}
        <TabsContent value="users">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Administración de Usuarios</h2>
            <Button onClick={() => setIsAddUserDialogOpen(true)}>
              Nuevo Usuario
            </Button>
          </div>
          
          <Input
            className="mb-4"
            placeholder="Buscar por nombre, documento o email..."
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
          />
          
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-4">ID</th>
                      <th className="text-left p-4">Nombre</th>
                      <th className="text-left p-4">Documento</th>
                      <th className="text-left p-4">Email</th>
                      <th className="text-left p-4">Teléfono</th>
                      <th className="text-left p-4">Último Acceso</th>
                      <th className="text-left p-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="border-t hover:bg-gray-50">
                          <td className="p-4">{user.id}</td>
                          <td className="p-4">{user.name}</td>
                          <td className="p-4">{user.document}</td>
                          <td className="p-4">{user.email}</td>
                          <td className="p-4">{user.phone}</td>
                          <td className="p-4">{formatDateTime(user.lastLogin)}</td>
                          <td className="p-4">
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditUser({
                                  id: user.id,
                                  username: user.username,
                                  password: "",
                                  name: user.name,
                                  email: user.email,
                                  document: user.document,
                                  phone: user.phone
                                });
                                setIsEditUserDialogOpen(true);
                              }}
                            >
                              Editar
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-gray-500">
                          No hay usuarios que coincidan con la búsqueda
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Accounts Tab */}
        <TabsContent value="accounts">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Administración de Cuentas</h2>
          </div>
          
          <Input
            className="mb-4"
            placeholder="Buscar por número de cuenta o nombre de usuario..."
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
          />
          
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-4">ID</th>
                      <th className="text-left p-4">Usuario</th>
                      <th className="text-left p-4">Número de Cuenta</th>
                      <th className="text-left p-4">Tipo</th>
                      <th className="text-left p-4">Saldo</th>
                      <th className="text-left p-4">Divisa</th>
                      <th className="text-left p-4">Estado</th>
                      <th className="text-left p-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccounts.length > 0 ? (
                      filteredAccounts.map((account) => (
                        <tr key={account.id} className="border-t hover:bg-gray-50">
                          <td className="p-4">{account.id}</td>
                          <td className="p-4">{account.userName || 'Desconocido'}</td>
                          <td className="p-4">{account.accountNumber}</td>
                          <td className="p-4">{account.accountType}</td>
                          <td className="p-4">{formatCurrencyWithCode(account.balance, account.currency as CurrencyCode)}</td>
                          <td className="p-4">
                            <Badge variant="outline" className="text-xs">
                              {CURRENCIES[account.currency as CurrencyCode || 'COP']?.symbol} {account.currency || 'COP'}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge className={account.status === 'BLOQUEADA' ? 'bg-red-500' : 'bg-green-500'}>
                              {account.status || 'ACTIVA'}
                            </Badge>
                          </td>
                          <td className="p-4 space-x-2 flex flex-col sm:flex-row gap-2">
                            <Button 
                              variant="outline"
                              size="sm"
                              className="bg-green-50 text-green-600 hover:bg-green-100"
                              onClick={() => {
                                setBalanceData({
                                  accountId: account.id,
                                  accountInfo: `${account.accountNumber} - ${account.userName || 'Desconocido'}`,
                                  amount: 0,
                                  sucursal: "Sucursal Principal",
                                  message: "",
                                  reference: "",
                                  transactionName: ""
                                });
                                setIsAddBalanceDialogOpen(true);
                              }}
                            >
                              Añadir Saldo
                            </Button>
                            <Button 
                              variant="outline"
                              size="sm"
                              className="bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
                              onClick={() => {
                                setStatusData({
                                  accountId: account.id,
                                  accountInfo: `${account.accountNumber} - ${account.userName || 'Desconocido'}`,
                                  status: account.status || 'ACTIVA',
                                  statusMessage: account.statusMessage || ''
                                });
                                setIsStatusDialogOpen(true);
                              }}
                            >
                              Estado
                            </Button>
                            <Button 
                              variant="outline"
                              size="sm"
                              className="bg-blue-50 text-blue-600 hover:bg-blue-100"
                              onClick={() => {
                                setEditAccountData({
                                  id: account.id,
                                  userId: account.userId,
                                  accountNumber: account.accountNumber,
                                  accountType: account.accountType,
                                  balance: account.balance,
                                  status: account.status || 'ACTIVA',
                                  currency: (account.currency as CurrencyCode) || 'COP',
                                  statusMessage: account.statusMessage || ''
                                });
                                setIsEditAccountDialogOpen(true);
                              }}
                            >
                              Editar Cuenta
                            </Button>
                            <Button 
                              variant="outline"
                              size="sm"
                              className="bg-red-50 text-red-600 hover:bg-red-100"
                              onClick={() => {
                                setDeleteAccountData({
                                  accountId: account.id,
                                  accountInfo: `${account.accountNumber} - ${account.userName || 'Desconocido'}`
                                });
                                setIsDeleteAccountDialogOpen(true);
                              }}
                            >
                              Eliminar
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-gray-500">
                          No hay cuentas que coincidan con la búsqueda
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Cards Tab */}
        <TabsContent value="cards">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Gestión de Tarjetas</h2>
            <Button 
              data-testid="button-create-card"
              onClick={() => setIsCreateCardDialogOpen(true)}
            >
              Crear Tarjeta
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-4">ID</th>
                      <th className="text-left p-4">Usuario</th>
                      <th className="text-left p-4">Número de Tarjeta</th>
                      <th className="text-left p-4">Tipo</th>
                      <th className="text-left p-4">Estado</th>
                      <th className="text-left p-4">Saldo</th>
                      <th className="text-left p-4">Estado Saldo</th>
                      <th className="text-left p-4">Solicitud</th>
                      <th className="text-left p-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminCards.length > 0 ? (
                      adminCards.map((card) => (
                        <tr key={card.id} className="border-t hover:bg-gray-50" data-testid={`card-row-${card.id}`}>
                          <td className="p-4">{card.id}</td>
                          <td className="p-4">{card.userName || 'Desconocido'}</td>
                          <td className="p-4 font-mono">{card.cardNumber}</td>
                          <td className="p-4">
                            <Badge className={card.cardType === 'debit' ? 'bg-blue-500' : 'bg-purple-500'}>
                              {card.cardType === 'debit' ? 'Débito' : 'Crédito'}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge className={
                              card.status === 'active' ? 'bg-green-500' :
                              card.status === 'pending' ? 'bg-yellow-500 text-black' :
                              card.status === 'blocked' ? 'bg-red-500' :
                              card.status === 'frozen' ? 'bg-blue-300' :
                              'bg-gray-500'
                            }>
                              {card.status === 'active' ? 'Activa' :
                               card.status === 'pending' ? 'Pendiente' :
                               card.status === 'blocked' ? 'Bloqueada' :
                               card.status === 'frozen' ? 'Congelada' :
                               card.status === 'rejected' ? 'Rechazada' : card.status}
                            </Badge>
                          </td>
                          <td className="p-4">{formatCurrency(card.balance)}</td>
                          <td className="p-4">
                            <Badge className={
                              card.balanceStatus === 'active' ? 'bg-green-500' :
                              card.balanceStatus === 'blocked' ? 'bg-red-500' :
                              'bg-blue-300'
                            }>
                              {card.balanceStatus === 'active' ? 'Activo' :
                               card.balanceStatus === 'blocked' ? 'Bloqueado' : 'Congelado'}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge className={card.requestType === 'request' ? 'bg-indigo-500' : 'bg-teal-500'}>
                              {card.requestType === 'request' ? 'Solicitud' : 'Inscripción'}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                              {card.status === 'pending' && (
                                <>
                                  <Button 
                                    variant="default" 
                                    size="sm" 
                                    onClick={() => handleApproveCard(card.id)}
                                    data-testid={`btn-approve-card-${card.id}`}
                                  >
                                    Aprobar
                                  </Button>
                                  <Button 
                                    variant="destructive" 
                                    size="sm" 
                                    onClick={() => handleRejectCard(card.id)}
                                    data-testid={`btn-reject-card-${card.id}`}
                                  >
                                    Rechazar
                                  </Button>
                                </>
                              )}
                              {card.status === 'active' && (
                                <>
                                  <Button 
                                    variant="destructive" 
                                    size="sm" 
                                    onClick={() => handleCardStatusChange(card.id, 'blocked')}
                                    data-testid={`btn-block-card-${card.id}`}
                                  >
                                    Bloquear
                                  </Button>
                                  <Button 
                                    variant="secondary" 
                                    size="sm" 
                                    onClick={() => handleCardStatusChange(card.id, 'frozen')}
                                    data-testid={`btn-freeze-card-${card.id}`}
                                  >
                                    Congelar
                                  </Button>
                                </>
                              )}
                              {(card.status === 'blocked' || card.status === 'frozen') && (
                                <Button 
                                  variant="default" 
                                  size="sm" 
                                  onClick={() => handleCardStatusChange(card.id, 'active')}
                                  data-testid={`btn-activate-card-${card.id}`}
                                >
                                  Activar
                                </Button>
                              )}
                              {card.status === 'active' && (
                                <>
                                  {card.balanceStatus === 'active' && (
                                    <>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleCardBalanceStatusChange(card.id, 'blocked')}
                                        data-testid={`btn-block-balance-${card.id}`}
                                      >
                                        Bloquear Saldo
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleCardBalanceStatusChange(card.id, 'frozen')}
                                        data-testid={`btn-freeze-balance-${card.id}`}
                                      >
                                        Congelar Saldo
                                      </Button>
                                    </>
                                  )}
                                  {(card.balanceStatus === 'blocked' || card.balanceStatus === 'frozen') && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleCardBalanceStatusChange(card.id, 'active')}
                                      data-testid={`btn-activate-balance-${card.id}`}
                                    >
                                      Activar Saldo
                                    </Button>
                                  )}
                                </>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setEditingCard(card);
                                  setIsEditCardDialogOpen(true);
                                }}
                                data-testid={`btn-edit-card-${card.id}`}
                              >
                                Editar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="p-4 text-center text-gray-500">
                          No hay tarjetas registradas
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Registro de Transacciones</h2>
          </div>
          
          <Input
            className="mb-4"
            placeholder="Buscar por descripción, referencia o tipo..."
            value={transactionFilter}
            onChange={(e) => setTransactionFilter(e.target.value)}
          />
          
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-4">ID</th>
                      <th className="text-left p-4">Cuenta</th>
                      <th className="text-left p-4">Tipo</th>
                      <th className="text-left p-4">Monto</th>
                      <th className="text-left p-4">Descripción</th>
                      <th className="text-left p-4">Referencia</th>
                      <th className="text-left p-4">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length > 0 ? (
                      filteredTransactions.map((transaction) => (
                        <tr key={transaction.id} className="border-t hover:bg-gray-50">
                          <td className="p-4">{transaction.id}</td>
                          <td className="p-4">{transaction.accountNumber || transaction.accountId}</td>
                          <td className="p-4">{getTransactionTypeLabel(transaction.type)}</td>
                          <td className={`p-4 ${transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {transaction.amount < 0 ? '-' : '+'}
                            {formatCurrency(Math.abs(transaction.amount))}
                          </td>
                          <td className="p-4">{transaction.description}</td>
                          <td className="p-4">{transaction.reference || '-'}</td>
                          <td className="p-4">{formatDateTime(transaction.date)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-gray-500">
                          No hay transacciones que coincidan con la búsqueda
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Sessions Tab */}
        <TabsContent value="sessions">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Historial de Sesiones</h2>
          </div>
          
          <Input
            className="mb-4"
            placeholder="Buscar por usuario..."
            value={sessionFilter}
            onChange={(e) => setSessionFilter(e.target.value)}
          />
          
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-4">ID</th>
                      <th className="text-left p-4">Usuario</th>
                      <th className="text-left p-4">Inicio de Sesión</th>
                      <th className="text-left p-4">Dirección IP</th>
                      <th className="text-left p-4">User Agent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.length > 0 ? (
                      filteredSessions.map((session) => (
                        <tr key={session.id} className="border-t hover:bg-gray-50">
                          <td className="p-4">{session.id}</td>
                          <td className="p-4">{session.userName || session.userId}</td>
                          <td className="p-4">{formatDateTime(session.loginTime)}</td>
                          <td className="p-4">{session.ipAddress || 'Desconocida'}</td>
                          <td className="p-4 truncate max-w-[200px]" title={session.userAgent || 'Desconocido'}>
                            {session.userAgent || 'Desconocido'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-gray-500">
                          No hay sesiones que coincidan con la búsqueda
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Notificaciones en Tiempo Real</h2>
            <Button 
              variant="outline" 
              onClick={() => setNotifications([])}
            >
              Limpiar Notificaciones
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-6">
              {notifications.length > 0 ? (
                <div className="space-y-4">
                  {notifications.map((notification, index) => (
                    <div 
                      key={index}
                      className={`p-4 rounded-md ${
                        notification.includes("[LOGIN]") ? "bg-blue-50 border-l-4 border-blue-500" :
                        notification.includes("[LOGOUT]") ? "bg-red-50 border-l-4 border-red-500" :
                        notification.includes("[REGISTRO]") ? "bg-green-50 border-l-4 border-green-500" :
                        notification.includes("[RECARGA]") ? "bg-purple-50 border-l-4 border-purple-500" :
                        notification.includes("[ESTADO]") ? "bg-yellow-50 border-l-4 border-yellow-500" :
                        notification.includes("[ACTUALIZACION]") ? "bg-indigo-50 border-l-4 border-indigo-500" :
                        "bg-gray-50 border-l-4 border-gray-500"
                      }`}
                    >
                      <p>{notification}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500">No hay notificaciones</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Alertas Personalizadas</h2>
            <Button onClick={() => setIsAlertDialogOpen(true)}>
              Nueva Alerta
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-6">
              {alerts.length > 0 ? (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div 
                      key={alert.id}
                      className={`p-4 rounded-md relative ${
                        alert.color === "red" ? "bg-red-50 border-l-4 border-red-500" :
                        alert.color === "blue" ? "bg-blue-50 border-l-4 border-blue-500" :
                        alert.color === "yellow" ? "bg-yellow-50 border-l-4 border-yellow-500" :
                        alert.color === "orange" ? "bg-orange-50 border-l-4 border-orange-500" :
                        "bg-white border-l-4 border-gray-300"
                      } ${!alert.active ? "opacity-50" : ""}`}
                    >
                      <div className="flex justify-between">
                        <div>
                          <h3 className="font-bold text-lg mb-1">{alert.title}</h3>
                          <p className="text-gray-700">{alert.message}</p>
                          <p className="text-xs text-gray-500 mt-2">Creada: {formatDateTime(alert.createdAt)}</p>
                        </div>
                        <div className="flex items-start space-x-2">
                          <Button 
                            variant="outline"
                            size="sm"
                            className={alert.active ? "bg-orange-50 text-orange-600" : "bg-green-50 text-green-600"}
                            onClick={() => toggleAlertStatus(alert.id)}
                          >
                            {alert.active ? "Desactivar" : "Activar"}
                          </Button>
                          <Button 
                            variant="outline"
                            size="sm"
                            className="bg-red-50 text-red-600"
                            onClick={() => deleteAlert(alert.id)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>
                      {!alert.active && (
                        <div className="absolute top-2 right-2">
                          <Badge variant="outline" className="bg-gray-200 text-gray-700">Inactiva</Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500">No hay alertas disponibles</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Configuración del Sistema</CardTitle>
              <CardDescription>
                Ajuste las configuraciones generales del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Support Phone */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Número de Soporte</h3>
                <div className="flex items-center space-x-4">
                  <Label htmlFor="supportPhone" className="w-48">
                    WhatsApp de Soporte
                  </Label>
                  <Input
                    id="supportPhone"
                    data-testid="input-support-phone"
                    value={supportPhone}
                    onChange={(e) => setSupportPhone(e.target.value)}
                    placeholder="+573208646620"
                    className="max-w-xs"
                  />
                  <Button 
                    data-testid="button-save-support-phone"
                    onClick={handleSaveSupportPhone}
                  >
                    Guardar
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Este número aparecerá como botón de contacto para soporte en la página de inicio de los clientes.
                </p>
              </div>
              
              <hr />
              
              {/* All Settings Display */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Configuraciones Guardadas</h3>
                {appSettings.length > 0 ? (
                  <div className="space-y-2">
                    {appSettings.map((setting) => (
                      <div key={setting.key} className="flex items-center justify-between p-3 bg-muted rounded-md">
                        <div>
                          <p className="font-medium">{setting.key}</p>
                          <p className="text-sm text-gray-500">{setting.description || "Sin descripción"}</p>
                        </div>
                        <p className="text-sm font-mono bg-background px-2 py-1 rounded">{setting.value}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500">No hay configuraciones guardadas</p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={fetchSettings}>
                Recargar Configuraciones
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Cobros & Accesos Tab */}
        <TabsContent value="cobros">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Cobros, Multas & Accesos</h2>
            <Button data-testid="button-new-charge" onClick={() => setIsChargeDialogOpen(true)}>
              Nuevo Cobro / Acceso
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              {charges.length > 0 ? (
                <div className="space-y-3">
                  {charges.map((charge: any) => (
                    <div key={charge.id} className="flex items-start justify-between p-4 border rounded-lg bg-muted/30">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            charge.type === "multa" ? "destructive" :
                            charge.type === "cobro" ? "secondary" :
                            charge.type === "promo" ? "default" :
                            charge.type === "descuento" ? "outline" :
                            "secondary"
                          }>
                            {charge.type.toUpperCase()}
                          </Badge>
                          <span className="font-semibold">{charge.reason || charge.title}</span>
                          <Badge variant="outline" className="text-xs">{charge.currency || "COP"}</Badge>
                          {charge.status === 'pending_payment' && (
                            <Badge variant="destructive" className="text-xs">Pendiente de Pago</Badge>
                          )}
                          {charge.status === 'paid' && (
                            <Badge className="text-xs bg-green-600">Pagado</Badge>
                          )}
                        </div>
                        {charge.description && <p className="text-sm text-muted-foreground">{charge.description}</p>}
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          {charge.amount != null && <span>Monto: <strong>{parseFloat(charge.amount).toLocaleString("es-CO")}</strong></span>}
                          {charge.interestRate != null && <span>Interés: <strong>{charge.interestRate}%</strong></span>}
                          {charge.discountPercent != null && <span>Descuento: <strong>{charge.discountPercent}%</strong></span>}
                          {charge.scheduledDate && <span>Fecha: <strong>{new Date(charge.scheduledDate).toLocaleDateString("es-CO")}</strong></span>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {charge.accountNumber ? `Cuenta: ${charge.accountNumber}` : `Cuenta ID: ${charge.accountId}`}
                          {charge.userName ? ` (${charge.userName})` : ''}
                          {' • '}{formatDateTime(charge.createdAt)}
                        </p>
                        {(charge.stripePaymentUrl) && charge.status === 'pending_payment' && (
                          <div className="flex items-center gap-2 mt-1">
                            <a
                              href={charge.stripePaymentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                              data-testid={`link-payment-${charge.id}`}
                            >
                              {charge.stripePaymentUrl.includes('takenos') ? 'Link de pago Takenos' : 
                               charge.stripePaymentUrl.includes('stripe') ? 'Link de pago Stripe' : 
                               'Link de pago externo'}
                            </a>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              data-testid={`button-copy-payment-link-${charge.id}`}
                              onClick={() => {
                                navigator.clipboard.writeText(charge.stripePaymentUrl);
                                toast({ title: "Copiado", description: "Link de pago copiado al portapapeles" });
                              }}
                            >
                              Copiar link
                            </Button>
                          </div>
                        )}
                        {charge.paidAt && (
                          <p className="text-xs text-green-600 mt-1">
                            Pagado el: {formatDateTime(charge.paidAt)}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-red-50 text-red-600 hover:bg-red-100"
                        data-testid={`button-delete-charge-${charge.id}`}
                        onClick={() => handleDeleteCharge(charge.id)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No hay cobros registrados. Crea uno nuevo.</p>
              )}
            </CardContent>
          </Card>

          {/* Per-user support phone section */}
          <div className="mt-6">
            <h3 className="text-xl font-bold mb-3">Teléfono de Soporte por Usuario</h3>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-4">
                  Asigna un número de WhatsApp de soporte personalizado a cada usuario. Si no se asigna, se usará el número global de configuración.
                </p>
                {users.length > 0 ? (
                  <div className="space-y-2">
                    {users.filter(u => !u.isAdmin).map((u: any) => (
                      <div key={u.id} className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <p className="font-medium">{u.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Soporte: {u.customSupportPhone || <span className="italic">Global ({supportPhone})</span>}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-assign-phone-${u.id}`}
                          onClick={() => {
                            setUserSupportPhoneDialog({ open: true, userId: u.id, name: u.name, current: u.customSupportPhone || "" });
                            setNewUserSupportPhone(u.customSupportPhone || "");
                          }}
                        >
                          Asignar Teléfono
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Carga los usuarios primero desde la pestaña de Usuarios.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <h2 className="text-2xl font-bold" data-testid="text-audit-title">Registro de Actividad</h2>
            <Button data-testid="button-refresh-audit" onClick={fetchAuditLogs} variant="outline">
              Actualizar
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label className="text-sm mb-1 block">Tipo de Acción</Label>
              <Select value={auditActionFilter} onValueChange={setAuditActionFilter}>
                <SelectTrigger data-testid="select-audit-action">
                  <SelectValue placeholder="Todas las acciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las acciones</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                  <SelectItem value="register">Registro</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                  <SelectItem value="payment">Pago</SelectItem>
                  <SelectItem value="deposit">Depósito</SelectItem>
                  <SelectItem value="withdrawal">Retiro</SelectItem>
                  <SelectItem value="card_request">Solicitud Tarjeta</SelectItem>
                  <SelectItem value="card_register">Inscripción Tarjeta</SelectItem>
                  <SelectItem value="card_approved">Tarjeta Aprobada</SelectItem>
                  <SelectItem value="card_rejected">Tarjeta Rechazada</SelectItem>
                  <SelectItem value="admin_balance_adjust">Ajuste Saldo Admin</SelectItem>
                  <SelectItem value="admin_status_change">Cambio Estado Admin</SelectItem>
                  <SelectItem value="admin_user_update">Actualización Usuario Admin</SelectItem>
                  <SelectItem value="admin_charge_created">Cobro Creado Admin</SelectItem>
                  <SelectItem value="settings_change">Cambio Configuración</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm mb-1 block">Usuario</Label>
              <Input
                data-testid="input-audit-user"
                placeholder="Buscar por nombre..."
                value={auditUserFilter}
                onChange={(e) => setAuditUserFilter(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm mb-1 block">Desde</Label>
              <Input
                data-testid="input-audit-date-from"
                type="date"
                value={auditDateFrom}
                onChange={(e) => setAuditDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm mb-1 block">Hasta</Label>
              <Input
                data-testid="input-audit-date-to"
                type="date"
                value={auditDateTo}
                onChange={(e) => setAuditDateTo(e.target.value)}
              />
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="table-audit-logs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-4">Fecha/Hora</th>
                      <th className="text-left p-4">Usuario</th>
                      <th className="text-left p-4">Acción</th>
                      <th className="text-left p-4">Detalles</th>
                      <th className="text-left p-4">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = auditLogs.filter((log) => {
                        if (auditActionFilter && auditActionFilter !== "all" && log.action !== auditActionFilter) return false;
                        if (auditUserFilter && !(log.userName || "").toLowerCase().includes(auditUserFilter.toLowerCase())) return false;
                        if (auditDateFrom) {
                          const logDate = new Date(log.createdAt).toISOString().split("T")[0];
                          if (logDate < auditDateFrom) return false;
                        }
                        if (auditDateTo) {
                          const logDate = new Date(log.createdAt).toISOString().split("T")[0];
                          if (logDate > auditDateTo) return false;
                        }
                        return true;
                      });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="p-4 text-center text-gray-500">
                              No hay registros de actividad
                            </td>
                          </tr>
                        );
                      }

                      const actionLabels: Record<string, string> = {
                        login: "Inicio de Sesión",
                        logout: "Cierre de Sesión",
                        register: "Registro",
                        transfer: "Transferencia",
                        payment: "Pago",
                        deposit: "Depósito",
                        withdrawal: "Retiro",
                        card_request: "Solicitud Tarjeta",
                        card_register: "Inscripción Tarjeta",
                        card_approved: "Tarjeta Aprobada",
                        card_rejected: "Tarjeta Rechazada",
                        admin_balance_adjust: "Ajuste Saldo",
                        admin_status_change: "Cambio Estado",
                        admin_user_update: "Actualización Usuario",
                        admin_charge_created: "Cobro Creado",
                        settings_change: "Cambio Configuración",
                      };

                      const actionColors: Record<string, string> = {
                        login: "bg-blue-500",
                        logout: "bg-gray-500",
                        register: "bg-green-500",
                        transfer: "bg-indigo-500",
                        payment: "bg-yellow-500 text-black",
                        deposit: "bg-emerald-500",
                        withdrawal: "bg-orange-500",
                        card_request: "bg-purple-500",
                        card_register: "bg-teal-500",
                        card_approved: "bg-green-600",
                        card_rejected: "bg-red-500",
                        admin_balance_adjust: "bg-amber-600",
                        admin_status_change: "bg-rose-500",
                        admin_user_update: "bg-cyan-600",
                        admin_charge_created: "bg-pink-500",
                        settings_change: "bg-slate-500",
                      };

                      return filtered.map((log) => (
                        <tr key={log.id} className="border-t hover:bg-gray-50" data-testid={`audit-row-${log.id}`}>
                          <td className="p-4 whitespace-nowrap" data-testid={`audit-date-${log.id}`}>
                            {formatDateTime(log.createdAt)}
                          </td>
                          <td className="p-4" data-testid={`audit-user-${log.id}`}>
                            {log.userName || "Sistema"}
                          </td>
                          <td className="p-4" data-testid={`audit-action-${log.id}`}>
                            <Badge className={actionColors[log.action] || "bg-gray-500"}>
                              {actionLabels[log.action] || log.action}
                            </Badge>
                          </td>
                          <td className="p-4 max-w-xs truncate" data-testid={`audit-details-${log.id}`}>
                            {log.details || "-"}
                          </td>
                          <td className="p-4 font-mono text-sm" data-testid={`audit-ip-${log.id}`}>
                            {log.ipAddress || "-"}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <p className="text-sm text-muted-foreground mt-2" data-testid="text-audit-count">
            {auditLogs.length} registros en total
          </p>
        </TabsContent>

      </Tabs>
      
      {/* Diálogos */}
      {/* Diálogo para añadir usuario */}
      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Complete el formulario para crear un nuevo usuario
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Documento (Usuario)
              </Label>
              <Input
                id="username"
                className="col-span-3"
                value={newUser.username}
                onChange={(e) => setNewUser({...newUser, username: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                className="col-span-3"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nombre
              </Label>
              <Input
                id="name"
                className="col-span-3"
                value={newUser.name}
                onChange={(e) => setNewUser({...newUser, name: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                className="col-span-3"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="document" className="text-right">
                Documento
              </Label>
              <Input
                id="document"
                className="col-span-3"
                value={newUser.document}
                onChange={(e) => setNewUser({...newUser, document: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Teléfono
              </Label>
              <Input
                id="phone"
                className="col-span-3"
                value={newUser.phone}
                onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddUser}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para editar usuario */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Actualice la información del usuario
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editUsername" className="text-right">
                Documento (Usuario)
              </Label>
              <Input
                id="editUsername"
                className="col-span-3"
                value={editUser.username}
                onChange={(e) => setEditUser({...editUser, username: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editPassword" className="text-right">
                Nueva Contraseña
              </Label>
              <Input
                id="editPassword"
                type="password"
                className="col-span-3"
                placeholder="Dejar en blanco para mantener la actual"
                value={editUser.password}
                onChange={(e) => setEditUser({...editUser, password: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editName" className="text-right">
                Nombre
              </Label>
              <Input
                id="editName"
                className="col-span-3"
                value={editUser.name}
                onChange={(e) => setEditUser({...editUser, name: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editEmail" className="text-right">
                Email
              </Label>
              <Input
                id="editEmail"
                type="email"
                className="col-span-3"
                value={editUser.email}
                onChange={(e) => setEditUser({...editUser, email: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editDocument" className="text-right">
                Documento
              </Label>
              <Input
                id="editDocument"
                className="col-span-3"
                value={editUser.document}
                onChange={(e) => setEditUser({...editUser, document: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editPhone" className="text-right">
                Teléfono
              </Label>
              <Input
                id="editPhone"
                className="col-span-3"
                value={editUser.phone}
                onChange={(e) => setEditUser({...editUser, phone: e.target.value})}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditUserDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateUser}>Actualizar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para añadir saldo */}
      <Dialog open={isAddBalanceDialogOpen} onOpenChange={setIsAddBalanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajuste de Saldo</DialogTitle>
            <DialogDescription>
              Ingrese el monto a añadir o descontar de la cuenta (para descontar, ingrese un valor negativo)
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="accountInfo" className="text-right">
                Cuenta
              </Label>
              <Input
                id="accountInfo"
                className="col-span-3"
                value={balanceData.accountInfo}
                readOnly
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Monto
              </Label>
              <Input
                id="amount"
                type="number"
                className="col-span-3"
                value={balanceData.amount}
                onChange={(e) => setBalanceData({...balanceData, amount: parseFloat(e.target.value)})}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sucursal" className="text-right">
                Sucursal
              </Label>
              <Select 
                value={balanceData.sucursal}
                onValueChange={(value) => setBalanceData({...balanceData, sucursal: value})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccione una sucursal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sucursal Principal">Sucursal Principal</SelectItem>
                  <SelectItem value="Sucursal Norte">Sucursal Norte</SelectItem>
                  <SelectItem value="Sucursal Sur">Sucursal Sur</SelectItem>
                  <SelectItem value="Sucursal Este">Sucursal Este</SelectItem>
                  <SelectItem value="Sucursal Oeste">Sucursal Oeste</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="transactionNameField" className="text-right">
                Nombre de Transacción
              </Label>
              <Input
                id="transactionNameField"
                className="col-span-3"
                value={balanceData.transactionName || ""}
                onChange={(e) => setBalanceData({...balanceData, transactionName: e.target.value})}
                placeholder="Ej: INDEMNIZACION, DEVOLUCION, PREMIO SORTEO, etc."
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="balanceMessage" className="text-right">
                Mensaje personalizado
              </Label>
              <Textarea
                id="balanceMessage"
                className="col-span-3"
                value={balanceData.message || ""}
                onChange={(e) => setBalanceData({...balanceData, message: e.target.value})}
                placeholder="Opcional: Mensaje que verá el cliente"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="referenceField" className="text-right">
                Referencia
              </Label>
              <Input
                id="referenceField"
                className="col-span-3"
                value={balanceData.reference || ""}
                onChange={(e) => setBalanceData({...balanceData, reference: e.target.value})}
                placeholder="Opcional: Referencia personalizada para la transacción"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddBalanceDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddBalance}>Ajustar Saldo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para editar los datos de la cuenta */}
      <Dialog open={isEditAccountDialogOpen} onOpenChange={setIsEditAccountDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Cuenta</DialogTitle>
            <DialogDescription>
              Modifique los datos de la cuenta según lo necesite
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="accountNumber" className="text-right">
                Número de Cuenta
              </Label>
              <Input
                id="accountNumber"
                className="col-span-3"
                value={editAccountData.accountNumber}
                onChange={(e) => setEditAccountData({...editAccountData, accountNumber: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="accountType" className="text-right">
                Tipo de Cuenta
              </Label>
              <Input
                id="accountType"
                className="col-span-3"
                value={editAccountData.accountType}
                onChange={(e) => setEditAccountData({...editAccountData, accountType: e.target.value})}
                placeholder="Ej: Ahorros, Corriente, Nómina, Premium, etc."
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="balance" className="text-right">
                Saldo
              </Label>
              <Input
                id="balance"
                className="col-span-3"
                type="number"
                value={editAccountData.balance}
                onChange={(e) => setEditAccountData({...editAccountData, balance: parseFloat(e.target.value)})}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="accountStatus" className="text-right">
                Estado
              </Label>
              <Select 
                value={editAccountData.status}
                onValueChange={(value) => setEditAccountData({...editAccountData, status: value})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccione un estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVA">Activa</SelectItem>
                  <SelectItem value="BLOQUEADA">Bloqueada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="statusMessage" className="text-right">
                Mensaje de Estado
              </Label>
              <Textarea
                id="statusMessage"
                className="col-span-3"
                value={editAccountData.statusMessage || ''}
                onChange={(e) => setEditAccountData({...editAccountData, statusMessage: e.target.value})}
                placeholder="Mensaje opcional para el estado de la cuenta"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="currency" className="text-right">
                Divisa
              </Label>
              <Select 
                value={editAccountData.currency}
                onValueChange={(value) => setEditAccountData({...editAccountData, currency: value as CurrencyCode})}
              >
                <SelectTrigger className="col-span-3" data-testid="select-currency">
                  <SelectValue placeholder="Seleccione una divisa" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CURRENCIES).map(([code, info]) => (
                    <SelectItem key={code} value={code} data-testid={`currency-option-${code}`}>
                      {info.symbol} - {info.name} ({code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="submit" onClick={handleUpdateAccount}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para cambiar estado de cuenta */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Estado de Cuenta</DialogTitle>
            <DialogDescription>
              Seleccione el nuevo estado para la cuenta
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="statusAccountInfo" className="text-right">
                Cuenta
              </Label>
              <Input
                id="statusAccountInfo"
                className="col-span-3"
                value={statusData.accountInfo}
                readOnly
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="accountStatus" className="text-right">
                Estado
              </Label>
              <Select 
                value={statusData.status}
                onValueChange={(value) => setStatusData({...statusData, status: value})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccione un estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVA">Activa</SelectItem>
                  <SelectItem value="BLOQUEADA">Bloqueada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="statusMessage" className="text-right">
                Mensaje de Estado
              </Label>
              <Textarea
                id="statusMessage"
                className="col-span-3"
                value={statusData.statusMessage}
                onChange={(e) => setStatusData({...statusData, statusMessage: e.target.value})}
                placeholder="Opcional: Motivo del cambio de estado"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateStatus}>Actualizar Estado</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para eliminar cuenta */}
      <Dialog open={isDeleteAccountDialogOpen} onOpenChange={setIsDeleteAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación de Cuenta</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminará la cuenta y todas sus transacciones asociadas.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">
                Cuenta a eliminar:
              </Label>
              <div className="col-span-3 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                {deleteAccountData.accountInfo}
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 p-3 rounded">
              <p className="text-red-800 text-sm font-medium">
                ⚠️ Advertencia: Esta acción es irreversible
              </p>
              <p className="text-red-700 text-sm mt-1">
                Al eliminar esta cuenta se perderán todos los datos asociados permanentemente.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteAccountDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              Eliminar Cuenta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para añadir alerta personalizada */}
      <Dialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nueva Alerta</DialogTitle>
            <DialogDescription>
              Complete los campos para crear una alerta personalizada para todos los usuarios
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="alertTitle" className="text-right">
                Título
              </Label>
              <Input
                id="alertTitle"
                className="col-span-3"
                value={alertData.title}
                onChange={(e) => setAlertData({...alertData, title: e.target.value})}
                placeholder="Título de la alerta"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="alertMessage" className="text-right">
                Mensaje
              </Label>
              <Textarea
                id="alertMessage"
                className="col-span-3"
                value={alertData.message}
                onChange={(e) => setAlertData({...alertData, message: e.target.value})}
                placeholder="Contenido detallado de la alerta"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="alertColor" className="text-right">
                Color
              </Label>
              <Select
                value={alertData.color}
                onValueChange={(value) => setAlertData({...alertData, color: value as 'red' | 'blue' | 'yellow' | 'orange' | 'white'})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccione un color" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="red">Rojo (Urgente)</SelectItem>
                  <SelectItem value="orange">Naranja (Importante)</SelectItem>
                  <SelectItem value="yellow">Amarillo (Advertencia)</SelectItem>
                  <SelectItem value="blue">Azul (Información)</SelectItem>
                  <SelectItem value="white">Blanco (Neutral)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAlertDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddAlert}>Crear Alerta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para crear tarjeta */}
      <Dialog open={isCreateCardDialogOpen} onOpenChange={setIsCreateCardDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Nueva Tarjeta</DialogTitle>
            <DialogDescription>
              Complete el formulario para crear una nueva tarjeta para un usuario
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cardUserId" className="text-right">
                Usuario
              </Label>
              <Select 
                value={newCardData.userId.toString()}
                onValueChange={(value) => setNewCardData({...newCardData, userId: parseInt(value)})}
              >
                <SelectTrigger className="col-span-3" data-testid="select-card-user">
                  <SelectValue placeholder="Seleccione un usuario" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.isAdmin !== 1).map((u) => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.name} ({u.document})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cardNumber" className="text-right">
                Número
              </Label>
              <Input
                id="cardNumber"
                className="col-span-3"
                data-testid="input-card-number"
                value={newCardData.cardNumber}
                onChange={(e) => setNewCardData({...newCardData, cardNumber: e.target.value})}
                placeholder="****-****-****-****"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Tipo</Label>
              <Select 
                value={newCardData.cardType}
                onValueChange={(value) => setNewCardData({...newCardData, cardType: value})}
              >
                <SelectTrigger className="col-span-3" data-testid="select-card-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debit">Débito</SelectItem>
                  <SelectItem value="credit">Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Marca</Label>
              <Select 
                value={newCardData.cardBrand}
                onValueChange={(value) => setNewCardData({...newCardData, cardBrand: value})}
              >
                <SelectTrigger className="col-span-3" data-testid="select-card-brand">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visa">Visa</SelectItem>
                  <SelectItem value="mastercard">Mastercard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cardExpiration" className="text-right">
                Vencimiento
              </Label>
              <Input
                id="cardExpiration"
                className="col-span-3"
                data-testid="input-card-expiration"
                value={newCardData.expirationDate}
                onChange={(e) => setNewCardData({...newCardData, expirationDate: e.target.value})}
                placeholder="MM/AA"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cardCvv" className="text-right">
                CVV
              </Label>
              <Input
                id="cardCvv"
                className="col-span-3"
                data-testid="input-card-cvv"
                value={newCardData.cvv}
                onChange={(e) => setNewCardData({...newCardData, cvv: e.target.value})}
                placeholder="***"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cardBalance" className="text-right">
                Saldo
              </Label>
              <Input
                id="cardBalance"
                type="number"
                className="col-span-3"
                data-testid="input-card-balance"
                value={newCardData.balance}
                onChange={(e) => setNewCardData({...newCardData, balance: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateCardDialogOpen(false)}>
              Cancelar
            </Button>
            <Button data-testid="button-submit-create-card" onClick={handleCreateCard}>
              Crear Tarjeta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para editar tarjeta */}
      <Dialog open={isEditCardDialogOpen} onOpenChange={setIsEditCardDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Tarjeta</DialogTitle>
            <DialogDescription>
              Modifique la información de la tarjeta
            </DialogDescription>
          </DialogHeader>
          
          {editingCard && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Usuario</Label>
                <div className="col-span-3 text-sm bg-muted p-2 rounded">
                  {editingCard.userName || 'Usuario ID: ' + editingCard.userId}
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editCardNumber" className="text-right">
                  Número
                </Label>
                <Input
                  id="editCardNumber"
                  className="col-span-3"
                  data-testid="input-edit-card-number"
                  value={editingCard.cardNumber}
                  onChange={(e) => setEditingCard({...editingCard, cardNumber: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Tipo</Label>
                <Select 
                  value={editingCard.cardType}
                  onValueChange={(value) => setEditingCard({...editingCard, cardType: value})}
                >
                  <SelectTrigger className="col-span-3" data-testid="select-edit-card-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debit">Débito</SelectItem>
                    <SelectItem value="credit">Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Marca</Label>
                <Select 
                  value={editingCard.cardBrand}
                  onValueChange={(value) => setEditingCard({...editingCard, cardBrand: value})}
                >
                  <SelectTrigger className="col-span-3" data-testid="select-edit-card-brand">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visa">Visa</SelectItem>
                    <SelectItem value="mastercard">Mastercard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editCardExpiration" className="text-right">
                  Vencimiento
                </Label>
                <Input
                  id="editCardExpiration"
                  className="col-span-3"
                  data-testid="input-edit-card-expiration"
                  value={editingCard.expirationDate || ''}
                  onChange={(e) => setEditingCard({...editingCard, expirationDate: e.target.value})}
                  placeholder="MM/AA"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editCardCvv" className="text-right">
                  CVV
                </Label>
                <Input
                  id="editCardCvv"
                  className="col-span-3"
                  data-testid="input-edit-card-cvv"
                  value={editingCard.cvv || ''}
                  onChange={(e) => setEditingCard({...editingCard, cvv: e.target.value})}
                  placeholder="***"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Estado</Label>
                <Select 
                  value={editingCard.status}
                  onValueChange={(value) => setEditingCard({...editingCard, status: value})}
                >
                  <SelectTrigger className="col-span-3" data-testid="select-edit-card-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activa</SelectItem>
                    <SelectItem value="blocked">Bloqueada</SelectItem>
                    <SelectItem value="frozen">Congelada</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="rejected">Rechazada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editCardBalance" className="text-right">
                  Saldo
                </Label>
                <Input
                  id="editCardBalance"
                  type="number"
                  className="col-span-3"
                  data-testid="input-edit-card-balance"
                  value={editingCard.balance}
                  onChange={(e) => setEditingCard({...editingCard, balance: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Estado Saldo</Label>
                <Select 
                  value={editingCard.balanceStatus}
                  onValueChange={(value) => setEditingCard({...editingCard, balanceStatus: value})}
                >
                  <SelectTrigger className="col-span-3" data-testid="select-edit-balance-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="blocked">Bloqueado</SelectItem>
                    <SelectItem value="frozen">Congelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditCardDialogOpen(false)}>
              Cancelar
            </Button>
            <Button data-testid="button-submit-edit-card" onClick={handleEditCard}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para crear cobro/acceso */}
      <Dialog open={isChargeDialogOpen} onOpenChange={setIsChargeDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Cobro / Multa / Acceso</DialogTitle>
            <DialogDescription>
              Crea un cobro, multa, promo, descuento o acceso especial para una cuenta.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Cuenta ID</Label>
              <Select
                value={newCharge.accountId ? String(newCharge.accountId) : ""}
                onValueChange={(v) => setNewCharge({...newCharge, accountId: parseInt(v)})}
              >
                <SelectTrigger className="col-span-3" data-testid="select-charge-account">
                  <SelectValue placeholder="Selecciona cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.accountNumber} - {a.userName || `Usuario ${a.userId}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Tipo</Label>
              <Select
                value={newCharge.type}
                onValueChange={(v) => setNewCharge({...newCharge, type: v})}
              >
                <SelectTrigger className="col-span-3" data-testid="select-charge-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cobro">Cobro</SelectItem>
                  <SelectItem value="multa">Multa</SelectItem>
                  <SelectItem value="promo">Promo</SelectItem>
                  <SelectItem value="descuento">Descuento</SelectItem>
                  <SelectItem value="acceso_especial">Acceso Especial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Título</Label>
              <Input
                className="col-span-3"
                data-testid="input-charge-title"
                value={newCharge.title}
                onChange={(e) => setNewCharge({...newCharge, title: e.target.value})}
                placeholder="Ej: Multa por inactividad"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Descripción</Label>
              <Textarea
                className="col-span-3"
                data-testid="input-charge-description"
                value={newCharge.description}
                onChange={(e) => setNewCharge({...newCharge, description: e.target.value})}
                placeholder="Motivo detallado..."
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Monto</Label>
              <Input
                className="col-span-3"
                data-testid="input-charge-amount"
                type="number"
                value={newCharge.amount}
                onChange={(e) => setNewCharge({...newCharge, amount: e.target.value})}
                placeholder="0.00"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Moneda</Label>
              <Select
                value={newCharge.currency}
                onValueChange={(v) => setNewCharge({...newCharge, currency: v})}
              >
                <SelectTrigger className="col-span-3" data-testid="select-charge-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(CURRENCIES).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Tasa de Interés (%)</Label>
              <Input
                className="col-span-3"
                data-testid="input-charge-interest"
                type="number"
                step="0.01"
                value={newCharge.interestRate}
                onChange={(e) => setNewCharge({...newCharge, interestRate: e.target.value})}
                placeholder="Ej: 1.5"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Descuento (%)</Label>
              <Input
                className="col-span-3"
                data-testid="input-charge-discount"
                type="number"
                step="0.01"
                value={newCharge.discountPercent}
                onChange={(e) => setNewCharge({...newCharge, discountPercent: e.target.value})}
                placeholder="Ej: 10"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Fecha programada</Label>
              <Input
                className="col-span-3"
                data-testid="input-charge-scheduled"
                type="date"
                value={newCharge.scheduledDate}
                onChange={(e) => setNewCharge({...newCharge, scheduledDate: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Expira</Label>
              <Input
                className="col-span-3"
                data-testid="input-charge-expires"
                type="date"
                value={newCharge.expiresAt}
                onChange={(e) => setNewCharge({...newCharge, expiresAt: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Método de pago</Label>
              <Select
                value={newCharge.paymentMethod}
                onValueChange={(v: "stripe" | "custom_link" | "none") => setNewCharge({...newCharge, paymentMethod: v, applyToBalance: v !== "none" ? false : newCharge.applyToBalance})}
              >
                <SelectTrigger className="col-span-3" data-testid="select-payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom_link">Link de pago (Takenos / otro)</SelectItem>
                  <SelectItem value="stripe">Stripe (genera link automático)</SelectItem>
                  <SelectItem value="none">Sin pasarela de pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newCharge.paymentMethod === "custom_link" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Link de pago</Label>
                <Input
                  className="col-span-3"
                  data-testid="input-custom-payment-link"
                  value={newCharge.customPaymentLink}
                  onChange={(e) => setNewCharge({...newCharge, customPaymentLink: e.target.value})}
                  placeholder="https://app.takenos.com/pay/..."
                />
              </div>
            )}
            {newCharge.paymentMethod === "none" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Aplicar al saldo</Label>
                <div className="col-span-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    data-testid="checkbox-charge-apply"
                    checked={newCharge.applyToBalance}
                    onChange={(e) => setNewCharge({...newCharge, applyToBalance: e.target.checked})}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-muted-foreground">
                    {newCharge.applyToBalance 
                      ? (newCharge.type === "promo" || newCharge.type === "descuento" 
                          ? "Se sumará al saldo de la cuenta" 
                          : "Se descontará del saldo de la cuenta")
                      : "Solo informativo, no modifica saldo"}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChargeDialogOpen(false)}>
              Cancelar
            </Button>
            <Button data-testid="button-submit-charge" onClick={handleCreateCharge}>
              Aplicar Cobro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para asignar teléfono de soporte por usuario */}
      <Dialog open={userSupportPhoneDialog.open} onOpenChange={(open) => {
        if (!open) setUserSupportPhoneDialog({ open: false, userId: 0, name: "", current: "" });
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Teléfono de Soporte</DialogTitle>
            <DialogDescription>
              Asigna un número de WhatsApp personalizado para {userSupportPhoneDialog.name}. Si lo dejas vacío, usará el número global.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Teléfono</Label>
              <Input
                className="col-span-3"
                data-testid="input-user-support-phone"
                value={newUserSupportPhone}
                onChange={(e) => setNewUserSupportPhone(e.target.value)}
                placeholder="+573208646620"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Número global actual: <strong>{supportPhone}</strong>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleSaveUserSupportPhone("")}>
              Usar Global
            </Button>
            <Button data-testid="button-save-user-phone" onClick={() => handleSaveUserSupportPhone()}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LoadingOverlay />
    </div>
  );
};

export default AdminPage;