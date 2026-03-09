import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import {
  Lock, Eye, EyeOff, Users, Activity, Globe, Shield, Database,
  Download, ArrowLeft, BarChart3, Clock, Monitor, Smartphone,
  Key, Settings, UserCheck, AlertTriangle, FileText, RefreshCw,
  Edit, Trash2, DollarSign, CreditCard, Search, Ban, CheckCircle,
  UserPlus, Wrench, Power, Hash, Mail, Phone, FileSpreadsheet
} from 'lucide-react';

interface GodDashboardData {
  stats: {
    totalUsers: number;
    totalAdmins: number;
    totalAssistants: number;
    totalAccounts: number;
    totalTransactions: number;
    totalSessions: number;
    totalCards: number;
    systemBalance: number;
  };
  users: any[];
  accounts: any[];
  transactions: any[];
  sessions: any[];
  auditLogs: any[];
  settings: any[];
  cards: any[];
  assistants: any[];
}

interface VisitorLog {
  id: number;
  sessionId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  country: string | null;
  city: string | null;
  action: string;
  page: string | null;
  referrer: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  userId: number | null;
  metadata: string | null;
  createdAt: string;
}

const fmt = (n: number) => `$${(n || 0).toLocaleString('es-CO')}`;

const GodPanelPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState<GodDashboardData | null>(null);
  const [visitorLogs, setVisitorLogs] = useState<VisitorLog[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [editUserForm, setEditUserForm] = useState<any>({});
  const [editAccountForm, setEditAccountForm] = useState<any>({});
  const [newSettingKey, setNewSettingKey] = useState('');
  const [newSettingValue, setNewSettingValue] = useState('');
  const [newSettingDesc, setNewSettingDesc] = useState('');
  const [auditFilter, setAuditFilter] = useState('');
  const { toast } = useToast();
  const [_, navigate] = useLocation();

  const handleLogin = async () => {
    if (!password.trim()) return;
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/god/auth", { password });
      if (res.ok) {
        setIsAuthenticated(true);
        toast({ title: "Acceso autorizado", description: "Bienvenido al Panel Dios" });
        fetchDashboard();
        fetchVisitorLogs();
      } else {
        const data = await res.json();
        toast({ title: "Acceso denegado", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    }
    setLoading(false);
  };

  const fetchDashboard = async () => {
    try {
      const res = await apiRequest("GET", "/api/god/dashboard");
      if (res.ok) setDashboard(await res.json());
    } catch {}
  };

  const fetchVisitorLogs = async () => {
    try {
      const res = await apiRequest("GET", "/api/god/visitor-logs?limit=500");
      if (res.ok) setVisitorLogs(await res.json());
    } catch {}
  };

  const handleChangeAdminPassword = async () => {
    if (!newAdminPassword || newAdminPassword.length < 4) {
      toast({ title: "Error", description: "La contraseña debe tener al menos 4 caracteres", variant: "destructive" });
      return;
    }
    try {
      await apiRequest("PUT", "/api/god/admin-password", { newPassword: newAdminPassword });
      toast({ title: "Contraseña actualizada" });
      setNewAdminPassword('');
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Error", variant: "destructive" });
    }
  };

  const handleEditUser = (u: any) => {
    setEditingUser(u);
    setEditUserForm({ name: u.name, email: u.email, phone: u.phone, document: u.document, role: u.role || 'user', isAdmin: u.isAdmin, password: '' });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    try {
      const data: any = { ...editUserForm };
      if (!data.password) delete data.password;
      await apiRequest("PUT", `/api/god/users/${editingUser.id}`, data);
      toast({ title: "Usuario actualizado" });
      setEditingUser(null);
      fetchDashboard();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Error", variant: "destructive" });
    }
  };

  const handleEditAccount = (a: any) => {
    setEditingAccount(a);
    setEditAccountForm({ balance: a.balance, status: a.status || 'active', statusMessage: a.statusMessage || '' });
  };

  const handleSaveAccount = async () => {
    if (!editingAccount) return;
    try {
      const balanceDiff = Number(editAccountForm.balance) - Number(editingAccount.balance);
      if (balanceDiff !== 0) {
        await apiRequest("PUT", `/api/admin/accounts/${editingAccount.id}/balance`, {
          amount: balanceDiff,
          description: `Ajuste Panel Dios: ${balanceDiff >= 0 ? '+' : ''}${fmt(balanceDiff)}`
        });
      }
      if (editAccountForm.status !== (editingAccount.status || 'active')) {
        await apiRequest("PUT", `/api/admin/accounts/${editingAccount.id}/status`, {
          status: editAccountForm.status,
          statusMessage: editAccountForm.statusMessage
        });
      }
      toast({ title: "Cuenta actualizada" });
      setEditingAccount(null);
      fetchDashboard();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Error", variant: "destructive" });
    }
  };

  const handleSaveSetting = async () => {
    if (!newSettingKey || !newSettingValue) return;
    try {
      await apiRequest("PUT", `/api/god/settings/${newSettingKey}`, { value: newSettingValue, description: newSettingDesc });
      toast({ title: "Configuración guardada" });
      setNewSettingKey('');
      setNewSettingValue('');
      setNewSettingDesc('');
      fetchDashboard();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Error", variant: "destructive" });
    }
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      await apiRequest("PUT", `/api/god/settings/${key}`, { value });
      toast({ title: `"${key}" actualizado` });
      fetchDashboard();
    } catch {}
  };

  const downloadCompleteReport = () => {
    if (!dashboard) return;
    const s: string[] = [];
    s.push("═══════════════════════════════════════════════════════");
    s.push("  REPORTE COMPLETO - PANEL DIOS - DAVIVIENDA");
    s.push("═══════════════════════════════════════════════════════");
    s.push(`Generado: ${new Date().toLocaleString('es-CO')}`);
    s.push("");
    s.push("── ESTADÍSTICAS ──");
    Object.entries(dashboard.stats).forEach(([k, v]) => s.push(`${k}: ${typeof v === 'number' && k.includes('Balance') ? fmt(v) : v}`));
    s.push("");
    s.push("── USUARIOS ──");
    s.push("ID | Nombre | Usuario | Email | Documento | Teléfono | Rol | Admin | Último Acceso");
    dashboard.users.forEach(u => {
      s.push(`${u.id} | ${u.name} | ${u.username} | ${u.email} | ${u.document} | ${u.phone} | ${u.role || 'user'} | ${u.isAdmin ? 'Sí' : 'No'} | ${u.lastLogin ? new Date(u.lastLogin).toLocaleString('es-CO') : 'Nunca'}`);
    });
    s.push("");
    s.push("── CUENTAS ──");
    s.push("ID | Titular | No. Cuenta | Tipo | Saldo | Divisa | Estado | Mensaje Estado");
    dashboard.accounts.forEach(a => {
      s.push(`${a.id} | ${a.userName || 'N/A'} | ${a.accountNumber} | ${a.accountType} | ${fmt(a.balance)} | ${a.currency} | ${a.status || 'active'} | ${a.statusMessage || ''}`);
    });
    s.push("");
    s.push("── TARJETAS ──");
    s.push("ID | Usuario | Tipo | Marca | Número | Estado | Saldo");
    dashboard.cards.forEach(c => {
      s.push(`${c.id} | ${c.userId} | ${c.cardType} | ${c.cardBrand} | ****${c.cardNumber?.slice(-4)} | ${c.status} | ${fmt(c.balance || 0)}`);
    });
    s.push("");
    s.push("── TRANSACCIONES (últimas 200) ──");
    s.push("ID | Cuenta | Tipo | Monto | Descripción | Fecha | Referencia");
    dashboard.transactions.slice(0, 200).forEach(t => {
      s.push(`${t.id} | ${t.accountId} | ${t.type} | ${fmt(t.amount)} | ${t.description || ''} | ${new Date(t.date).toLocaleString('es-CO')} | ${t.reference || ''}`);
    });
    s.push("");
    s.push("── SESIONES (últimas 100) ──");
    dashboard.sessions.slice(0, 100).forEach(se => {
      s.push(`${se.id} | User:${se.userId} | IP:${se.ipAddress || 'N/A'} | ${se.loginTime ? new Date(se.loginTime).toLocaleString('es-CO') : ''} - ${se.logoutTime ? new Date(se.logoutTime).toLocaleString('es-CO') : 'Activa'} | ${se.sessionDuration ? se.sessionDuration + 's' : ''}`);
    });
    s.push("");
    s.push("── AUDITORÍA (últimas 200) ──");
    dashboard.auditLogs.slice(0, 200).forEach(l => {
      s.push(`${l.id} | User:${l.userId || 'Sistema'} | ${l.action} | ${l.details || ''} | IP:${l.ipAddress || ''} | ${new Date(l.createdAt).toLocaleString('es-CO')}`);
    });
    s.push("");
    s.push("── ASISTENTES ──");
    dashboard.assistants.forEach(a => {
      s.push(`${a.id} | ${a.name} | @${a.username} | Permisos: ${(a.permissions || []).join(', ')}`);
    });
    s.push("");
    s.push("── VISITANTES ──");
    visitorLogs.slice(0, 100).forEach(v => {
      s.push(`${v.id} | IP:${v.ipAddress || 'N/A'} | ${v.deviceType} | ${v.browser} | ${v.os} | ${v.action} | ${v.page || ''} | ${new Date(v.createdAt).toLocaleString('es-CO')}`);
    });
    s.push("");
    s.push("── CONFIGURACIONES ──");
    dashboard.settings.forEach(st => s.push(`${st.key}: ${st.value} (${st.description || 'Sin desc.'})`));

    const blob = new Blob(['\uFEFF' + s.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_dios_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Reporte descargado" });
  };

  const downloadCSV = () => {
    if (!dashboard) return;
    const headers = ["ID", "Nombre", "Usuario", "Email", "Documento", "Teléfono", "Rol", "Admin", "No. Cuenta", "Tipo Cuenta", "Saldo", "Divisa", "Estado", "Mensaje Estado", "Último Acceso", "WhatsApp"];
    const rows: string[] = [];
    dashboard.users.forEach(u => {
      const acct = dashboard.accounts.find((a: any) => a.userId === u.id);
      rows.push([
        u.id, u.name, u.username, u.email, u.document, u.phone, u.role || 'user', u.isAdmin ? 'Sí' : 'No',
        acct?.accountNumber || '', acct?.accountType || '', acct?.balance || 0, acct?.currency || '', acct?.status || '',
        acct?.statusMessage || '', u.lastLogin ? new Date(u.lastLogin).toLocaleString('es-CO') : '', u.customSupportPhone || ''
      ].map((f: any) => `"${String(f || '').replace(/"/g, '""')}"`).join(','));
    });
    const blob = new Blob(['\uFEFF' + [headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes_dios_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "CSV descargado" });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-900 border-gray-700">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-900/50 rounded-full flex items-center justify-center mb-4">
              <Shield className="text-red-500" size={32} />
            </div>
            <CardTitle className="text-white text-xl">Panel Dios</CardTitle>
            <p className="text-gray-400 text-sm">Acceso restringido - Nivel máximo de seguridad</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-500" size={16} />
              <Input
                data-testid="input-god-password"
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña de acceso"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="pl-10 pr-10 bg-gray-800 border-gray-600 text-white"
              />
              <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-500">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <Button data-testid="button-god-login" onClick={handleLogin} disabled={loading} className="w-full bg-red-700 hover:bg-red-800 text-white">
              {loading ? "Verificando..." : "Acceder"}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/admin')} className="w-full text-gray-400 hover:text-white">
              <ArrowLeft size={16} className="mr-2" /> Volver al Admin
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Resumen', icon: BarChart3 },
    { id: 'users', label: 'Usuarios', icon: Users },
    { id: 'accounts', label: 'Cuentas', icon: Database },
    { id: 'cards', label: 'Tarjetas', icon: CreditCard },
    { id: 'transactions', label: 'Transacciones', icon: DollarSign },
    { id: 'sessions', label: 'Sesiones', icon: Clock },
    { id: 'assistants', label: 'Asistentes', icon: UserCheck },
    { id: 'audit', label: 'Auditoría', icon: FileText },
    { id: 'visitors', label: 'Visitantes', icon: Globe },
    { id: 'security', label: 'Seguridad', icon: Shield },
    { id: 'tools', label: 'Herramientas', icon: Wrench },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  const filteredUsers = dashboard?.users.filter(u =>
    !searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.document?.includes(searchQuery)
  ) || [];

  const filteredAudit = dashboard?.auditLogs.filter(l =>
    !auditFilter || l.action?.toLowerCase().includes(auditFilter.toLowerCase()) ||
    l.details?.toLowerCase().includes(auditFilter.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="bg-gradient-to-r from-red-900 to-gray-900 border-b border-red-800 px-4 py-3">
        <div className="container mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Shield className="text-red-400" size={24} />
            <div>
              <h1 className="text-lg font-bold">Panel Dios - Davivienda</h1>
              <p className="text-xs text-gray-400">Control total del sistema · {dashboard ? `${dashboard.stats.totalUsers} usuarios · ${dashboard.stats.totalAccounts} cuentas · ${fmt(dashboard.stats.systemBalance)} en sistema` : 'Cargando...'}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="border-gray-600 text-gray-300 text-xs" onClick={() => { fetchDashboard(); fetchVisitorLogs(); }}>
              <RefreshCw size={14} className="mr-1" /> Actualizar
            </Button>
            <Button size="sm" variant="outline" className="border-gray-600 text-gray-300 text-xs" onClick={downloadCompleteReport}>
              <Download size={14} className="mr-1" /> Reporte TXT
            </Button>
            <Button size="sm" variant="outline" className="border-gray-600 text-gray-300 text-xs" onClick={downloadCSV}>
              <FileSpreadsheet size={14} className="mr-1" /> CSV
            </Button>
            <Button size="sm" variant="ghost" className="text-gray-400" onClick={() => navigate('/admin')}>
              <ArrowLeft size={14} className="mr-1" /> Admin
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button key={tab.id} data-testid={`tab-god-${tab.id}`} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-red-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && dashboard && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Usuarios', value: dashboard.stats.totalUsers, icon: Users, bg: 'bg-blue-900/30', text: 'text-blue-400' },
                { label: 'Administradores', value: dashboard.stats.totalAdmins, icon: UserCheck, bg: 'bg-red-900/30', text: 'text-red-400' },
                { label: 'Asistentes', value: dashboard.stats.totalAssistants, icon: Shield, bg: 'bg-purple-900/30', text: 'text-purple-400' },
                { label: 'Cuentas', value: dashboard.stats.totalAccounts, icon: Database, bg: 'bg-green-900/30', text: 'text-green-400' },
                { label: 'Transacciones', value: dashboard.stats.totalTransactions, icon: Activity, bg: 'bg-yellow-900/30', text: 'text-yellow-400' },
                { label: 'Sesiones', value: dashboard.stats.totalSessions, icon: Clock, bg: 'bg-cyan-900/30', text: 'text-cyan-400' },
                { label: 'Tarjetas', value: dashboard.stats.totalCards, icon: CreditCard, bg: 'bg-orange-900/30', text: 'text-orange-400' },
                { label: 'Balance Sistema', value: fmt(dashboard.stats.systemBalance), icon: DollarSign, bg: 'bg-emerald-900/30', text: 'text-emerald-400' },
              ].map((stat, i) => (
                <Card key={i} className="bg-gray-900 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center`}>
                        <stat.icon size={18} className={stat.text} />
                      </div>
                      <div>
                        <p className="text-xl font-bold text-white">{stat.value}</p>
                        <p className="text-xs text-gray-400">{stat.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader><CardTitle className="text-white text-sm">Últimas Acciones</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {dashboard.auditLogs.slice(0, 15).map((l: any) => (
                      <div key={l.id} className="flex items-center justify-between p-2 bg-gray-800 rounded text-xs">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Activity size={12} className="text-red-400 flex-shrink-0" />
                          <span className="text-gray-300 truncate">{l.action}: {l.details?.substring(0, 50)}</span>
                        </div>
                        <span className="text-gray-500 text-xs ml-2 flex-shrink-0">{new Date(l.createdAt).toLocaleString('es-CO')}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader><CardTitle className="text-white text-sm">Cuentas con Mayor Saldo</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {[...dashboard.accounts].sort((a, b) => (b.balance || 0) - (a.balance || 0)).slice(0, 10).map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between p-2 bg-gray-800 rounded text-xs">
                        <div>
                          <span className="text-white font-medium">{a.userName || 'N/A'}</span>
                          <span className="text-gray-500 ml-2">{a.accountNumber}</span>
                        </div>
                        <span className="text-green-400 font-bold">{fmt(a.balance)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'users' && dashboard && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-3 text-gray-500" />
                <Input placeholder="Buscar por nombre, usuario, email, documento..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-gray-800 border-gray-600 text-white" />
              </div>
              <span className="text-gray-400 text-sm">{filteredUsers.length} usuarios</span>
            </div>

            {editingUser && (
              <Card className="bg-gray-800 border-yellow-600">
                <CardHeader><CardTitle className="text-yellow-400 text-sm flex items-center gap-2"><Edit size={16} /> Editando: {editingUser.name} (ID: {editingUser.id})</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                    <div><Label className="text-gray-400 text-xs">Nombre</Label><Input value={editUserForm.name} onChange={e => setEditUserForm((p: any) => ({...p, name: e.target.value}))} className="bg-gray-700 border-gray-600 text-white" /></div>
                    <div><Label className="text-gray-400 text-xs">Email</Label><Input value={editUserForm.email} onChange={e => setEditUserForm((p: any) => ({...p, email: e.target.value}))} className="bg-gray-700 border-gray-600 text-white" /></div>
                    <div><Label className="text-gray-400 text-xs">Teléfono</Label><Input value={editUserForm.phone} onChange={e => setEditUserForm((p: any) => ({...p, phone: e.target.value}))} className="bg-gray-700 border-gray-600 text-white" /></div>
                    <div><Label className="text-gray-400 text-xs">Documento</Label><Input value={editUserForm.document} onChange={e => setEditUserForm((p: any) => ({...p, document: e.target.value}))} className="bg-gray-700 border-gray-600 text-white" /></div>
                    <div><Label className="text-gray-400 text-xs">Rol</Label>
                      <Select value={editUserForm.role} onValueChange={v => setEditUserForm((p: any) => ({...p, role: v}))}>
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="user">Usuario</SelectItem><SelectItem value="assistant">Asistente</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-gray-400 text-xs">Nueva Contraseña</Label><Input type="password" placeholder="Dejar vacío para no cambiar" value={editUserForm.password} onChange={e => setEditUserForm((p: any) => ({...p, password: e.target.value}))} className="bg-gray-700 border-gray-600 text-white" /></div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveUser} className="bg-yellow-600 hover:bg-yellow-700">Guardar</Button>
                    <Button size="sm" variant="outline" className="border-gray-600 text-gray-300" onClick={() => setEditingUser(null)}>Cancelar</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-gray-900 border-gray-700">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-700 text-gray-400">
                        <th className="p-3 text-left">ID</th><th className="p-3 text-left">Nombre</th><th className="p-3 text-left">Usuario</th>
                        <th className="p-3 text-left">Email</th><th className="p-3 text-left">Documento</th><th className="p-3 text-left">Teléfono</th>
                        <th className="p-3 text-left">Rol</th><th className="p-3 text-left">Último Acceso</th><th className="p-3 text-left">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u: any) => (
                        <tr key={u.id} className="border-b border-gray-800 text-gray-300 hover:bg-gray-800/50">
                          <td className="p-3 font-mono">{u.id}</td>
                          <td className="p-3 font-medium">{u.name}</td>
                          <td className="p-3">@{u.username}</td>
                          <td className="p-3">{u.email}</td>
                          <td className="p-3">{u.document}</td>
                          <td className="p-3">{u.phone}</td>
                          <td className="p-3">
                            <Badge className={`text-xs ${u.isAdmin === 1 && u.role !== 'assistant' ? 'bg-red-900 text-red-300' : u.role === 'assistant' ? 'bg-purple-900 text-purple-300' : 'bg-gray-700 text-gray-300'}`}>
                              {u.isAdmin === 1 && u.role !== 'assistant' ? 'Admin' : u.role === 'assistant' ? 'Asistente' : 'Usuario'}
                            </Badge>
                          </td>
                          <td className="p-3 text-gray-500">{u.lastLogin ? new Date(u.lastLogin).toLocaleString('es-CO') : 'Nunca'}</td>
                          <td className="p-3">
                            <Button size="sm" variant="ghost" className="text-yellow-400 h-7 px-2" onClick={() => handleEditUser(u)}>
                              <Edit size={12} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'accounts' && dashboard && (
          <div className="space-y-4">
            {editingAccount && (
              <Card className="bg-gray-800 border-yellow-600">
                <CardHeader><CardTitle className="text-yellow-400 text-sm flex items-center gap-2"><Edit size={16} /> Editando Cuenta: {editingAccount.accountNumber} ({editingAccount.userName})</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                    <div><Label className="text-gray-400 text-xs">Saldo</Label><Input type="number" value={editAccountForm.balance} onChange={e => setEditAccountForm((p: any) => ({...p, balance: e.target.value}))} className="bg-gray-700 border-gray-600 text-white" /></div>
                    <div><Label className="text-gray-400 text-xs">Estado</Label>
                      <Select value={editAccountForm.status} onValueChange={v => setEditAccountForm((p: any) => ({...p, status: v}))}>
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="active">Activa</SelectItem><SelectItem value="blocked">Bloqueada</SelectItem><SelectItem value="PENDIENTE">Pendiente</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-gray-400 text-xs">Mensaje de Estado</Label><Input value={editAccountForm.statusMessage} onChange={e => setEditAccountForm((p: any) => ({...p, statusMessage: e.target.value}))} className="bg-gray-700 border-gray-600 text-white" /></div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveAccount} className="bg-yellow-600 hover:bg-yellow-700">Guardar</Button>
                    <Button size="sm" variant="outline" className="border-gray-600 text-gray-300" onClick={() => setEditingAccount(null)}>Cancelar</Button>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader><CardTitle className="text-white text-sm">Todas las Cuentas ({dashboard.accounts.length})</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-gray-700 text-gray-400">
                      <th className="p-3 text-left">ID</th><th className="p-3 text-left">Titular</th><th className="p-3 text-left">No. Cuenta</th>
                      <th className="p-3 text-left">Tipo</th><th className="p-3 text-left">Saldo</th><th className="p-3 text-left">Divisa</th>
                      <th className="p-3 text-left">Estado</th><th className="p-3 text-left">Mensaje</th><th className="p-3 text-left">Acciones</th>
                    </tr></thead>
                    <tbody>
                      {dashboard.accounts.map((a: any) => (
                        <tr key={a.id} className="border-b border-gray-800 text-gray-300 hover:bg-gray-800/50">
                          <td className="p-3">{a.id}</td>
                          <td className="p-3 font-medium">{a.userName || 'N/A'}</td>
                          <td className="p-3 font-mono">{a.accountNumber}</td>
                          <td className="p-3">{a.accountType}</td>
                          <td className="p-3 font-bold text-green-400">{fmt(a.balance)}</td>
                          <td className="p-3">{a.currency}</td>
                          <td className="p-3">
                            <Badge className={`text-xs ${a.status === 'blocked' ? 'bg-red-900 text-red-300' : a.status === 'PENDIENTE' ? 'bg-yellow-900 text-yellow-300' : 'bg-green-900 text-green-300'}`}>
                              {a.status || 'Activa'}
                            </Badge>
                          </td>
                          <td className="p-3 text-gray-500 max-w-[150px] truncate">{a.statusMessage || '-'}</td>
                          <td className="p-3">
                            <Button size="sm" variant="ghost" className="text-yellow-400 h-7 px-2" onClick={() => handleEditAccount(a)}>
                              <Edit size={12} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'cards' && dashboard && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader><CardTitle className="text-white text-sm">Tarjetas ({dashboard.cards.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-gray-700 text-gray-400">
                    <th className="p-3 text-left">ID</th><th className="p-3 text-left">Usuario</th><th className="p-3 text-left">Tipo</th>
                    <th className="p-3 text-left">Marca</th><th className="p-3 text-left">Número</th><th className="p-3 text-left">Estado</th>
                    <th className="p-3 text-left">Saldo</th><th className="p-3 text-left">Vence</th>
                  </tr></thead>
                  <tbody>
                    {dashboard.cards.map((c: any) => {
                      const u = dashboard.users.find((u: any) => u.id === c.userId);
                      return (
                        <tr key={c.id} className="border-b border-gray-800 text-gray-300 hover:bg-gray-800/50">
                          <td className="p-3">{c.id}</td>
                          <td className="p-3">{u?.name || `User #${c.userId}`}</td>
                          <td className="p-3">{c.cardType}</td>
                          <td className="p-3">{c.cardBrand}</td>
                          <td className="p-3 font-mono">****{c.cardNumber?.slice(-4)}</td>
                          <td className="p-3"><Badge className={`text-xs ${c.status === 'approved' ? 'bg-green-900 text-green-300' : c.status === 'rejected' ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300'}`}>{c.status}</Badge></td>
                          <td className="p-3">{fmt(c.balance || 0)}</td>
                          <td className="p-3 text-gray-500">{c.expiryDate || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'transactions' && dashboard && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader><CardTitle className="text-white text-sm">Transacciones ({dashboard.transactions.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-900"><tr className="border-b border-gray-700 text-gray-400">
                    <th className="p-3 text-left">ID</th><th className="p-3 text-left">Cuenta</th><th className="p-3 text-left">Tipo</th>
                    <th className="p-3 text-left">Monto</th><th className="p-3 text-left">Descripción</th>
                    <th className="p-3 text-left">Referencia</th><th className="p-3 text-left">Destinatario</th><th className="p-3 text-left">Fecha</th>
                  </tr></thead>
                  <tbody>
                    {dashboard.transactions.map((t: any) => {
                      const acct = dashboard.accounts.find((a: any) => a.id === t.accountId);
                      const destAcct = t.recipientId ? dashboard.accounts.find((a: any) => a.id === t.recipientId) : null;
                      return (
                        <tr key={t.id} className="border-b border-gray-800 text-gray-300 hover:bg-gray-800/50">
                          <td className="p-3">{t.id}</td>
                          <td className="p-3">{acct?.userName || `#${t.accountId}`} <span className="text-gray-500">{acct?.accountNumber}</span></td>
                          <td className="p-3"><Badge className={`text-xs ${t.type === 'deposit' ? 'bg-green-900 text-green-300' : t.type === 'withdrawal' ? 'bg-red-900 text-red-300' : t.type === 'transfer' ? 'bg-blue-900 text-blue-300' : 'bg-yellow-900 text-yellow-300'}`}>{t.type}</Badge></td>
                          <td className={`p-3 font-bold ${Number(t.amount) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(t.amount)}</td>
                          <td className="p-3 max-w-[200px] truncate">{t.description || '-'}</td>
                          <td className="p-3 font-mono text-gray-500">{t.reference || '-'}</td>
                          <td className="p-3">{destAcct ? `${destAcct.userName} (${destAcct.accountNumber})` : '-'}</td>
                          <td className="p-3 text-gray-500">{new Date(t.date).toLocaleString('es-CO')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'sessions' && dashboard && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader><CardTitle className="text-white text-sm">Sesiones ({dashboard.sessions.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-900"><tr className="border-b border-gray-700 text-gray-400">
                    <th className="p-3 text-left">ID</th><th className="p-3 text-left">Usuario</th><th className="p-3 text-left">IP</th>
                    <th className="p-3 text-left">User Agent</th><th className="p-3 text-left">Inicio</th><th className="p-3 text-left">Fin</th><th className="p-3 text-left">Duración</th>
                  </tr></thead>
                  <tbody>
                    {dashboard.sessions.map((s: any) => {
                      const u = dashboard.users.find((u: any) => u.id === s.userId);
                      return (
                        <tr key={s.id} className="border-b border-gray-800 text-gray-300 hover:bg-gray-800/50">
                          <td className="p-3">{s.id}</td>
                          <td className="p-3">{u?.name || `#${s.userId}`}</td>
                          <td className="p-3 font-mono text-yellow-400">{s.ipAddress || 'N/A'}</td>
                          <td className="p-3 text-gray-500 max-w-[150px] truncate">{s.userAgent || 'N/A'}</td>
                          <td className="p-3">{s.loginTime ? new Date(s.loginTime).toLocaleString('es-CO') : ''}</td>
                          <td className="p-3">{s.logoutTime ? new Date(s.logoutTime).toLocaleString('es-CO') : <span className="text-green-400">Activa</span>}</td>
                          <td className="p-3">{s.sessionDuration ? `${Math.round(s.sessionDuration / 60)}min` : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'assistants' && dashboard && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader><CardTitle className="text-white text-sm">Asistentes ({dashboard.assistants.length})</CardTitle></CardHeader>
            <CardContent>
              {dashboard.assistants.length === 0 ? (
                <p className="text-gray-500 text-center py-6">No hay asistentes registrados</p>
              ) : (
                <div className="space-y-3">
                  {dashboard.assistants.map((a: any) => (
                    <div key={a.id} className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-white font-medium">{a.name}</span>
                          <span className="text-gray-400 ml-2">@{a.username}</span>
                          <Badge className="bg-purple-900 text-purple-300 ml-2 text-xs">Asistente</Badge>
                        </div>
                        <div className="text-gray-500 text-xs">
                          <span>{a.email || ''}</span> · <span>{a.document || ''}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(a.permissions || []).map((p: string) => (
                          <span key={p} className="text-xs bg-purple-900/30 text-purple-300 px-2 py-0.5 rounded">{p}</span>
                        ))}
                        {(!a.permissions || a.permissions.length === 0) && <span className="text-xs text-gray-500">Sin permisos</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'audit' && dashboard && (
          <div className="space-y-4">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-gray-500" />
              <Input placeholder="Filtrar auditoría por acción o detalle..." value={auditFilter} onChange={e => setAuditFilter(e.target.value)} className="pl-9 bg-gray-800 border-gray-600 text-white" />
            </div>
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader><CardTitle className="text-white text-sm">Registro de Auditoría ({filteredAudit.length})</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-gray-900"><tr className="border-b border-gray-700 text-gray-400">
                      <th className="p-3 text-left">ID</th><th className="p-3 text-left">Usuario</th><th className="p-3 text-left">Acción</th>
                      <th className="p-3 text-left">Detalles</th><th className="p-3 text-left">IP</th><th className="p-3 text-left">User Agent</th><th className="p-3 text-left">Fecha</th>
                    </tr></thead>
                    <tbody>
                      {filteredAudit.map((l: any) => {
                        const u = dashboard.users.find((u: any) => u.id === l.userId);
                        return (
                          <tr key={l.id} className="border-b border-gray-800 text-gray-300 hover:bg-gray-800/50">
                            <td className="p-3">{l.id}</td>
                            <td className="p-3">{u?.name || (l.userId ? `#${l.userId}` : 'Sistema')}</td>
                            <td className="p-3"><Badge className={`text-xs ${l.action.includes('failed') || l.action.includes('suspicious') || l.action.includes('blocked') ? 'bg-red-900 text-red-300' : l.action.includes('login') ? 'bg-blue-900 text-blue-300' : l.action.includes('god') ? 'bg-purple-900 text-purple-300' : 'bg-gray-700 text-gray-300'}`}>{l.action}</Badge></td>
                            <td className="p-3 text-gray-400 max-w-[250px] truncate">{l.details || '-'}</td>
                            <td className="p-3 font-mono text-yellow-400">{l.ipAddress || '-'}</td>
                            <td className="p-3 text-gray-500 max-w-[120px] truncate">{l.userAgent || '-'}</td>
                            <td className="p-3 text-gray-500 whitespace-nowrap">{new Date(l.createdAt).toLocaleString('es-CO')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'visitors' && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white text-sm">Visitantes ({visitorLogs.length})</CardTitle>
              <Button size="sm" onClick={fetchVisitorLogs} className="bg-gray-800 text-xs"><RefreshCw size={12} className="mr-1" /> Actualizar</Button>
            </CardHeader>
            <CardContent className="p-0">
              {visitorLogs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay registros de visitantes</p>
              ) : (
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-gray-900"><tr className="border-b border-gray-700 text-gray-400">
                      <th className="p-3 text-left">Fecha</th><th className="p-3 text-left">IP</th><th className="p-3 text-left">Dispositivo</th>
                      <th className="p-3 text-left">Navegador</th><th className="p-3 text-left">SO</th><th className="p-3 text-left">Acción</th>
                      <th className="p-3 text-left">Página</th><th className="p-3 text-left">Usuario</th>
                    </tr></thead>
                    <tbody>
                      {visitorLogs.map(v => (
                        <tr key={v.id} className="border-b border-gray-800 text-gray-300 hover:bg-gray-800/50">
                          <td className="p-3 whitespace-nowrap">{new Date(v.createdAt).toLocaleString('es-CO')}</td>
                          <td className="p-3 font-mono text-yellow-400">{v.ipAddress || 'N/A'}</td>
                          <td className="p-3">{v.deviceType === 'mobile' ? <Smartphone size={14} className="text-blue-400" /> : <Monitor size={14} className="text-gray-400" />}</td>
                          <td className="p-3">{v.browser || 'N/A'}</td>
                          <td className="p-3">{v.os || 'N/A'}</td>
                          <td className="p-3"><Badge className="bg-gray-700 text-gray-300 text-xs">{v.action}</Badge></td>
                          <td className="p-3">{v.page || 'N/A'}</td>
                          <td className="p-3">{v.userId || 'Anónimo'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'security' && dashboard && (
          <div className="space-y-4">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader><CardTitle className="text-white text-sm flex items-center gap-2"><Key size={16} className="text-red-400" /> Cambiar Contraseña del Admin</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Input data-testid="input-new-admin-password" type="password" placeholder="Nueva contraseña" value={newAdminPassword} onChange={e => setNewAdminPassword(e.target.value)} className="bg-gray-800 border-gray-600 text-white" />
                <Button data-testid="button-change-admin-password" onClick={handleChangeAdminPassword} className="bg-red-700 hover:bg-red-800">Cambiar Contraseña</Button>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-700">
              <CardHeader><CardTitle className="text-white text-sm flex items-center gap-2"><AlertTriangle size={16} className="text-yellow-400" /> Actividad Sospechosa</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {dashboard.auditLogs
                    .filter((l: any) => l.action.includes('failed') || l.action.includes('suspicious') || l.action.includes('blocked'))
                    .slice(0, 30)
                    .map((l: any) => {
                      const u = dashboard.users.find((u: any) => u.id === l.userId);
                      return (
                        <div key={l.id} className="p-3 bg-red-950 border border-red-800 rounded text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <Badge className="bg-red-900 text-red-300 text-xs">{l.action}</Badge>
                            <span className="text-gray-500">{new Date(l.createdAt).toLocaleString('es-CO')}</span>
                          </div>
                          <p className="text-gray-400">{l.details}</p>
                          <div className="flex gap-3 mt-1 text-gray-500">
                            <span>Usuario: {u?.name || l.userId || 'N/A'}</span>
                            <span>IP: {l.ipAddress || 'N/A'}</span>
                            <span>UA: {l.userAgent?.substring(0, 50) || 'N/A'}</span>
                          </div>
                        </div>
                      );
                    })}
                  {dashboard.auditLogs.filter((l: any) => l.action.includes('failed') || l.action.includes('suspicious') || l.action.includes('blocked')).length === 0 && (
                    <p className="text-gray-500 text-center py-4">No hay actividad sospechosa</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-700">
              <CardHeader><CardTitle className="text-white text-sm flex items-center gap-2"><Clock size={16} className="text-blue-400" /> Sesiones Activas</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dashboard.sessions.filter((s: any) => !s.logoutTime).slice(0, 20).map((s: any) => {
                    const u = dashboard.users.find((u: any) => u.id === s.userId);
                    return (
                      <div key={s.id} className="p-2 bg-gray-800 rounded text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle size={12} className="text-green-400" />
                          <span className="text-white">{u?.name || `#${s.userId}`}</span>
                        </div>
                        <div className="text-gray-500 flex gap-3">
                          <span>IP: {s.ipAddress || 'N/A'}</span>
                          <span>Desde: {s.loginTime ? new Date(s.loginTime).toLocaleString('es-CO') : ''}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'tools' && dashboard && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader><CardTitle className="text-white text-sm flex items-center gap-2"><BarChart3 size={16} className="text-blue-400" /> Resumen del Sistema</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between p-2 bg-gray-800 rounded"><span className="text-gray-400">Cuentas Activas</span><span className="text-green-400 font-bold">{dashboard.accounts.filter((a: any) => a.status !== 'blocked').length}</span></div>
                  <div className="flex justify-between p-2 bg-gray-800 rounded"><span className="text-gray-400">Cuentas Bloqueadas</span><span className="text-red-400 font-bold">{dashboard.accounts.filter((a: any) => a.status === 'blocked').length}</span></div>
                  <div className="flex justify-between p-2 bg-gray-800 rounded"><span className="text-gray-400">Cuentas Pendientes</span><span className="text-yellow-400 font-bold">{dashboard.accounts.filter((a: any) => a.status === 'PENDIENTE').length}</span></div>
                  <div className="flex justify-between p-2 bg-gray-800 rounded"><span className="text-gray-400">Balance Promedio</span><span className="text-white font-bold">{fmt(dashboard.accounts.length > 0 ? dashboard.stats.systemBalance / dashboard.accounts.length : 0)}</span></div>
                  <div className="flex justify-between p-2 bg-gray-800 rounded"><span className="text-gray-400">Saldo Mayor</span><span className="text-green-400 font-bold">{fmt(Math.max(...dashboard.accounts.map((a: any) => a.balance || 0), 0))}</span></div>
                  <div className="flex justify-between p-2 bg-gray-800 rounded"><span className="text-gray-400">Saldo Menor</span><span className="text-yellow-400 font-bold">{fmt(Math.min(...dashboard.accounts.map((a: any) => a.balance || 0), 0))}</span></div>
                  <div className="flex justify-between p-2 bg-gray-800 rounded"><span className="text-gray-400">Tarjetas Aprobadas</span><span className="text-green-400 font-bold">{dashboard.cards.filter((c: any) => c.status === 'approved').length}</span></div>
                  <div className="flex justify-between p-2 bg-gray-800 rounded"><span className="text-gray-400">Tarjetas Pendientes</span><span className="text-yellow-400 font-bold">{dashboard.cards.filter((c: any) => c.status === 'pending').length}</span></div>
                  <div className="flex justify-between p-2 bg-gray-800 rounded"><span className="text-gray-400">Sesiones Activas</span><span className="text-blue-400 font-bold">{dashboard.sessions.filter((s: any) => !s.logoutTime).length}</span></div>
                  <div className="flex justify-between p-2 bg-gray-800 rounded"><span className="text-gray-400">Logins Fallidos</span><span className="text-red-400 font-bold">{dashboard.auditLogs.filter((l: any) => l.action === 'login_failed').length}</span></div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-700">
                <CardHeader><CardTitle className="text-white text-sm flex items-center gap-2"><Activity size={16} className="text-green-400" /> Actividad por Tipo</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {(() => {
                    const types: Record<string, number> = {};
                    dashboard.transactions.forEach((t: any) => { types[t.type] = (types[t.type] || 0) + 1; });
                    return Object.entries(types).sort(([,a], [,b]) => b - a).map(([type, count]) => {
                      const typeLabels: Record<string, string> = { deposit: 'Depósitos', withdrawal: 'Retiros', transfer: 'Transferencias', payment: 'Pagos' };
                      const pct = dashboard.transactions.length > 0 ? Math.round((count / dashboard.transactions.length) * 100) : 0;
                      return (
                        <div key={type} className="p-2 bg-gray-800 rounded">
                          <div className="flex justify-between mb-1"><span className="text-gray-400">{typeLabels[type] || type}</span><span className="text-white font-bold">{count} ({pct}%)</span></div>
                          <div className="w-full h-1.5 bg-gray-700 rounded-full"><div className={`h-full rounded-full ${type === 'deposit' ? 'bg-green-500' : type === 'withdrawal' ? 'bg-red-500' : type === 'transfer' ? 'bg-blue-500' : 'bg-yellow-500'}`} style={{ width: `${pct}%` }} /></div>
                        </div>
                      );
                    });
                  })()}
                  <div className="border-t border-gray-700 pt-3 mt-3 space-y-2">
                    <p className="text-gray-400 text-xs font-semibold uppercase">Acciones de Auditoría más Frecuentes</p>
                    {(() => {
                      const actions: Record<string, number> = {};
                      dashboard.auditLogs.forEach((l: any) => { actions[l.action] = (actions[l.action] || 0) + 1; });
                      return Object.entries(actions).sort(([,a], [,b]) => b - a).slice(0, 8).map(([action, count]) => (
                        <div key={action} className="flex justify-between p-1.5 text-xs">
                          <span className="text-gray-400">{action}</span>
                          <span className="text-white font-mono">{count}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-gray-900 border-gray-700">
              <CardHeader><CardTitle className="text-white text-sm flex items-center gap-2"><Users size={16} className="text-purple-400" /> IPs Únicas</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(() => {
                    const ips: Record<string, number> = {};
                    dashboard.sessions.forEach((s: any) => { if (s.ipAddress) ips[s.ipAddress] = (ips[s.ipAddress] || 0) + 1; });
                    dashboard.auditLogs.forEach((l: any) => { if (l.ipAddress) ips[l.ipAddress] = (ips[l.ipAddress] || 0) + 1; });
                    return Object.entries(ips).sort(([,a], [,b]) => b - a).slice(0, 12).map(([ip, count]) => (
                      <div key={ip} className="p-2 bg-gray-800 rounded text-xs flex justify-between">
                        <span className="text-yellow-400 font-mono">{ip}</span>
                        <span className="text-gray-400">{count}x</span>
                      </div>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'settings' && dashboard && (
          <div className="space-y-4">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader><CardTitle className="text-white text-sm">Agregar/Editar Configuración</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div><Label className="text-gray-400 text-xs">Clave</Label><Input placeholder="nombre_config" value={newSettingKey} onChange={e => setNewSettingKey(e.target.value)} className="bg-gray-800 border-gray-600 text-white" /></div>
                  <div><Label className="text-gray-400 text-xs">Valor</Label><Input placeholder="valor" value={newSettingValue} onChange={e => setNewSettingValue(e.target.value)} className="bg-gray-800 border-gray-600 text-white" /></div>
                  <div><Label className="text-gray-400 text-xs">Descripción</Label><Input placeholder="Descripción (opcional)" value={newSettingDesc} onChange={e => setNewSettingDesc(e.target.value)} className="bg-gray-800 border-gray-600 text-white" /></div>
                </div>
                <Button onClick={handleSaveSetting} className="bg-red-700 hover:bg-red-800" size="sm">Guardar Configuración</Button>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-700">
              <CardHeader><CardTitle className="text-white text-sm">Configuraciones del Sistema ({dashboard.settings.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dashboard.settings.map((s: any) => (
                    <div key={s.key} className="flex items-center justify-between p-3 bg-gray-800 rounded group">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{s.key}</p>
                        <p className="text-xs text-gray-400">{s.description || 'Sin descripción'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          defaultValue={s.value}
                          className="w-40 bg-gray-700 border-gray-600 text-white text-xs h-8"
                          onBlur={(e) => { if (e.target.value !== s.value) handleUpdateSetting(s.key, e.target.value); }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!dashboard && isAuthenticated && (
          <div className="text-center py-20">
            <RefreshCw className="animate-spin mx-auto text-gray-500 mb-4" size={32} />
            <p className="text-gray-500">Cargando datos del sistema...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GodPanelPage;
