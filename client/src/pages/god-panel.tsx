import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { 
  Lock, Eye, EyeOff, Users, Activity, Globe, Shield, Database, 
  Download, ArrowLeft, BarChart3, Clock, MapPin, Monitor, Smartphone,
  Key, Settings, UserCheck, AlertTriangle, FileText, RefreshCw
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

const GodPanelPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState<GodDashboardData | null>(null);
  const [visitorLogs, setVisitorLogs] = useState<VisitorLog[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [newAdminPassword, setNewAdminPassword] = useState('');
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
      if (res.ok) {
        const data = await res.json();
        setDashboard(data);
      }
    } catch {}
  };

  const fetchVisitorLogs = async () => {
    try {
      const res = await apiRequest("GET", "/api/god/visitor-logs?limit=500");
      if (res.ok) {
        const data = await res.json();
        setVisitorLogs(data);
      }
    } catch {}
  };

  const handleChangeAdminPassword = async () => {
    if (!newAdminPassword || newAdminPassword.length < 4) {
      toast({ title: "Error", description: "La contraseña debe tener al menos 4 caracteres", variant: "destructive" });
      return;
    }
    try {
      const res = await apiRequest("PUT", "/api/god/admin-password", { newPassword: newAdminPassword });
      if (res.ok) {
        toast({ title: "Contraseña actualizada", description: "La contraseña del admin ha sido cambiada" });
        setNewAdminPassword('');
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error al cambiar contraseña", variant: "destructive" });
    }
  };

  const downloadCompleteReport = () => {
    if (!dashboard) return;
    
    const sections: string[] = [];
    
    sections.push("=== REPORTE COMPLETO - PANEL DIOS - DAVIVIENDA ===");
    sections.push(`Fecha de generación: ${new Date().toLocaleString('es-CO')}`);
    sections.push("");
    
    sections.push("--- ESTADÍSTICAS GENERALES ---");
    sections.push(`Total Usuarios: ${dashboard.stats.totalUsers}`);
    sections.push(`Total Administradores: ${dashboard.stats.totalAdmins}`);
    sections.push(`Total Asistentes: ${dashboard.stats.totalAssistants}`);
    sections.push(`Total Cuentas: ${dashboard.stats.totalAccounts}`);
    sections.push(`Total Transacciones: ${dashboard.stats.totalTransactions}`);
    sections.push(`Total Sesiones: ${dashboard.stats.totalSessions}`);
    sections.push(`Total Tarjetas: ${dashboard.stats.totalCards}`);
    sections.push(`Balance del Sistema: $${dashboard.stats.systemBalance.toLocaleString()}`);
    sections.push("");
    
    sections.push("--- USUARIOS REGISTRADOS ---");
    sections.push("ID | Nombre | Usuario | Email | Documento | Teléfono | Rol | Último Acceso");
    dashboard.users.forEach(u => {
      sections.push(`${u.id} | ${u.name} | ${u.username} | ${u.email} | ${u.document} | ${u.phone} | ${u.role || (u.isAdmin ? 'admin' : 'user')} | ${u.lastLogin ? new Date(u.lastLogin).toLocaleString('es-CO') : 'Nunca'}`);
    });
    sections.push("");
    
    sections.push("--- CUENTAS BANCARIAS ---");
    sections.push("ID | Titular | No. Cuenta | Tipo | Saldo | Divisa | Estado");
    dashboard.accounts.forEach(a => {
      sections.push(`${a.id} | ${a.userName || 'N/A'} | ${a.accountNumber} | ${a.accountType} | $${a.balance?.toLocaleString()} | ${a.currency} | ${a.status || 'Activa'}`);
    });
    sections.push("");
    
    sections.push("--- TRANSACCIONES ---");
    sections.push("ID | Cuenta | Tipo | Monto | Descripción | Fecha");
    dashboard.transactions.slice(0, 200).forEach(t => {
      sections.push(`${t.id} | ${t.accountId} | ${t.type} | $${t.amount?.toLocaleString()} | ${t.description || 'N/A'} | ${t.date ? new Date(t.date).toLocaleString('es-CO') : 'N/A'}`);
    });
    sections.push("");
    
    sections.push("--- SESIONES ---");
    sections.push("ID | Usuario | IP | Inicio | Fin | Duración");
    dashboard.sessions.slice(0, 100).forEach(s => {
      sections.push(`${s.id} | ${s.userId} | ${s.ipAddress || 'N/A'} | ${s.loginTime ? new Date(s.loginTime).toLocaleString('es-CO') : 'N/A'} | ${s.logoutTime ? new Date(s.logoutTime).toLocaleString('es-CO') : 'Activa'} | ${s.sessionDuration || 'N/A'}`);
    });
    sections.push("");
    
    sections.push("--- REGISTRO DE AUDITORÍA ---");
    sections.push("ID | Usuario | Acción | Detalles | IP | Fecha");
    dashboard.auditLogs.slice(0, 200).forEach(l => {
      sections.push(`${l.id} | ${l.userId || 'Sistema'} | ${l.action} | ${l.details || 'N/A'} | ${l.ipAddress || 'N/A'} | ${new Date(l.createdAt).toLocaleString('es-CO')}`);
    });
    sections.push("");
    
    if (visitorLogs.length > 0) {
      sections.push("--- REGISTRO DE VISITANTES ---");
      sections.push("ID | IP | Dispositivo | Navegador | SO | Acción | Página | Fecha");
      visitorLogs.forEach(v => {
        sections.push(`${v.id} | ${v.ipAddress || 'N/A'} | ${v.deviceType || 'N/A'} | ${v.browser || 'N/A'} | ${v.os || 'N/A'} | ${v.action} | ${v.page || 'N/A'} | ${new Date(v.createdAt).toLocaleString('es-CO')}`);
      });
    }
    
    const content = sections.join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_dios_davivienda_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Reporte descargado", description: "Reporte completo generado" });
  };

  const downloadCSV = () => {
    if (!dashboard) return;
    const headers = ["ID", "Nombre", "Usuario", "Email", "Documento", "Teléfono", "Rol", "No. Cuenta", "Tipo Cuenta", "Saldo", "Divisa", "Estado", "Último Acceso", "WhatsApp Personalizado"];
    const rows = dashboard.accounts.map(a => {
      const u = dashboard.users.find((u: any) => u.id === a.userId);
      return [
        u?.id || a.userId, u?.name || a.userName || '', u?.username || '', u?.email || a.userEmail || '',
        u?.document || a.userDocument || '', u?.phone || a.userPhone || '', u?.role || (u?.isAdmin ? 'admin' : 'user'),
        a.accountNumber, a.accountType, a.balance, a.currency, a.status || 'Activa',
        u?.lastLogin ? new Date(u.lastLogin).toLocaleString('es-CO') : '', u?.customSupportPhone || ''
      ].map((f: any) => `"${String(f || '').replace(/"/g, '""')}"`).join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clientes_completo_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            <Button
              data-testid="button-god-login"
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-red-700 hover:bg-red-800 text-white"
            >
              {loading ? "Verificando..." : "Acceder"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/admin')}
              className="w-full text-gray-400 hover:text-white"
            >
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
    { id: 'sessions', label: 'Sesiones', icon: Clock },
    { id: 'audit', label: 'Auditoría', icon: FileText },
    { id: 'visitors', label: 'Visitantes', icon: Globe },
    { id: 'security', label: 'Seguridad', icon: Shield },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="bg-gradient-to-r from-red-900 to-gray-900 border-b border-red-800 px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="text-red-400" size={24} />
            <div>
              <h1 className="text-lg font-bold">Panel Dios - Davivienda</h1>
              <p className="text-xs text-gray-400">Control total del sistema</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="border-gray-600 text-gray-300 text-xs" onClick={() => { fetchDashboard(); fetchVisitorLogs(); }}>
              <RefreshCw size={14} className="mr-1" /> Actualizar
            </Button>
            <Button size="sm" variant="outline" className="border-gray-600 text-gray-300 text-xs" onClick={downloadCompleteReport}>
              <Download size={14} className="mr-1" /> Reporte Completo
            </Button>
            <Button size="sm" variant="outline" className="border-gray-600 text-gray-300 text-xs" onClick={downloadCSV}>
              <Download size={14} className="mr-1" /> CSV
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
            <button
              key={tab.id}
              data-testid={`tab-god-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id ? 'bg-red-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && dashboard && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Usuarios', value: dashboard.stats.totalUsers, icon: Users, color: 'blue' },
                { label: 'Administradores', value: dashboard.stats.totalAdmins, icon: UserCheck, color: 'red' },
                { label: 'Asistentes', value: dashboard.stats.totalAssistants, icon: Shield, color: 'purple' },
                { label: 'Cuentas', value: dashboard.stats.totalAccounts, icon: Database, color: 'green' },
                { label: 'Transacciones', value: dashboard.stats.totalTransactions, icon: Activity, color: 'yellow' },
                { label: 'Sesiones', value: dashboard.stats.totalSessions, icon: Clock, color: 'cyan' },
                { label: 'Tarjetas', value: dashboard.stats.totalCards, icon: Monitor, color: 'orange' },
                { label: 'Balance Sistema', value: `$${dashboard.stats.systemBalance.toLocaleString()}`, icon: BarChart3, color: 'emerald' },
              ].map((stat, i) => (
                <Card key={i} className="bg-gray-900 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <stat.icon size={20} className={`text-${stat.color}-400`} />
                      <div>
                        <p className="text-2xl font-bold text-white">{stat.value}</p>
                        <p className="text-xs text-gray-400">{stat.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-sm">Últimas Acciones del Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {dashboard.auditLogs.slice(0, 20).map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between p-2 bg-gray-800 rounded text-xs">
                      <div className="flex items-center gap-2">
                        <Activity size={12} className="text-red-400" />
                        <span className="text-gray-300">{log.action}</span>
                        <span className="text-gray-500">{log.details?.substring(0, 60)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        <span>{log.ipAddress || 'N/A'}</span>
                        <span>{new Date(log.createdAt).toLocaleString('es-CO')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'users' && dashboard && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-sm">Todos los Usuarios del Sistema ({dashboard.users.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-700 text-gray-400">
                      <th className="p-2 text-left">ID</th>
                      <th className="p-2 text-left">Nombre</th>
                      <th className="p-2 text-left">Usuario</th>
                      <th className="p-2 text-left">Email</th>
                      <th className="p-2 text-left">Documento</th>
                      <th className="p-2 text-left">Teléfono</th>
                      <th className="p-2 text-left">Rol</th>
                      <th className="p-2 text-left">Último Acceso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.users.map((u: any) => (
                      <tr key={u.id} className="border-b border-gray-800 text-gray-300 hover:bg-gray-800">
                        <td className="p-2">{u.id}</td>
                        <td className="p-2 font-medium">{u.name}</td>
                        <td className="p-2">{u.username}</td>
                        <td className="p-2">{u.email}</td>
                        <td className="p-2">{u.document}</td>
                        <td className="p-2">{u.phone}</td>
                        <td className="p-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            u.isAdmin === 1 && u.role !== 'assistant' ? 'bg-red-900 text-red-300' :
                            u.role === 'assistant' ? 'bg-purple-900 text-purple-300' :
                            'bg-gray-700 text-gray-300'
                          }`}>
                            {u.isAdmin === 1 && u.role !== 'assistant' ? 'Admin' : u.role === 'assistant' ? 'Asistente' : 'Usuario'}
                          </span>
                        </td>
                        <td className="p-2 text-gray-500">{u.lastLogin ? new Date(u.lastLogin).toLocaleString('es-CO') : 'Nunca'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'accounts' && dashboard && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-sm">Todas las Cuentas ({dashboard.accounts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-700 text-gray-400">
                      <th className="p-2 text-left">ID</th>
                      <th className="p-2 text-left">Titular</th>
                      <th className="p-2 text-left">No. Cuenta</th>
                      <th className="p-2 text-left">Tipo</th>
                      <th className="p-2 text-left">Saldo</th>
                      <th className="p-2 text-left">Divisa</th>
                      <th className="p-2 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.accounts.map((a: any) => (
                      <tr key={a.id} className="border-b border-gray-800 text-gray-300 hover:bg-gray-800">
                        <td className="p-2">{a.id}</td>
                        <td className="p-2 font-medium">{a.userName || 'N/A'}</td>
                        <td className="p-2 font-mono">{a.accountNumber}</td>
                        <td className="p-2">{a.accountType}</td>
                        <td className="p-2 font-medium text-green-400">${a.balance?.toLocaleString()}</td>
                        <td className="p-2">{a.currency}</td>
                        <td className="p-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${a.status === 'blocked' ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'}`}>
                            {a.status || 'Activa'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'sessions' && dashboard && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-sm">Sesiones ({dashboard.sessions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-900">
                    <tr className="border-b border-gray-700 text-gray-400">
                      <th className="p-2 text-left">ID</th>
                      <th className="p-2 text-left">Usuario ID</th>
                      <th className="p-2 text-left">IP</th>
                      <th className="p-2 text-left">Inicio</th>
                      <th className="p-2 text-left">Fin</th>
                      <th className="p-2 text-left">Duración</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.sessions.map((s: any) => (
                      <tr key={s.id} className="border-b border-gray-800 text-gray-300 hover:bg-gray-800">
                        <td className="p-2">{s.id}</td>
                        <td className="p-2">{s.userId}</td>
                        <td className="p-2 font-mono text-yellow-400">{s.ipAddress || 'N/A'}</td>
                        <td className="p-2">{s.loginTime ? new Date(s.loginTime).toLocaleString('es-CO') : 'N/A'}</td>
                        <td className="p-2">{s.logoutTime ? new Date(s.logoutTime).toLocaleString('es-CO') : <span className="text-green-400">Activa</span>}</td>
                        <td className="p-2">{s.sessionDuration || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'audit' && dashboard && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-sm">Registro de Auditoría ({dashboard.auditLogs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-900">
                    <tr className="border-b border-gray-700 text-gray-400">
                      <th className="p-2 text-left">ID</th>
                      <th className="p-2 text-left">Usuario</th>
                      <th className="p-2 text-left">Acción</th>
                      <th className="p-2 text-left">Detalles</th>
                      <th className="p-2 text-left">IP</th>
                      <th className="p-2 text-left">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.auditLogs.map((l: any) => (
                      <tr key={l.id} className="border-b border-gray-800 text-gray-300 hover:bg-gray-800">
                        <td className="p-2">{l.id}</td>
                        <td className="p-2">{l.userId || 'Sistema'}</td>
                        <td className="p-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            l.action.includes('failed') || l.action.includes('suspicious') ? 'bg-red-900 text-red-300' :
                            l.action.includes('login') ? 'bg-blue-900 text-blue-300' :
                            l.action.includes('transfer') || l.action.includes('payment') ? 'bg-green-900 text-green-300' :
                            'bg-gray-700 text-gray-300'
                          }`}>
                            {l.action}
                          </span>
                        </td>
                        <td className="p-2 text-gray-400 max-w-xs truncate">{l.details || 'N/A'}</td>
                        <td className="p-2 font-mono text-yellow-400">{l.ipAddress || 'N/A'}</td>
                        <td className="p-2 text-gray-500">{new Date(l.createdAt).toLocaleString('es-CO')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'visitors' && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white text-sm">Registro de Visitantes ({visitorLogs.length})</CardTitle>
              <Button size="sm" onClick={fetchVisitorLogs} className="bg-gray-800 text-xs">
                <RefreshCw size={12} className="mr-1" /> Actualizar
              </Button>
            </CardHeader>
            <CardContent>
              {visitorLogs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay registros de visitantes aún</p>
              ) : (
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-gray-900">
                      <tr className="border-b border-gray-700 text-gray-400">
                        <th className="p-2 text-left">Fecha</th>
                        <th className="p-2 text-left">IP</th>
                        <th className="p-2 text-left">Dispositivo</th>
                        <th className="p-2 text-left">Navegador</th>
                        <th className="p-2 text-left">SO</th>
                        <th className="p-2 text-left">Acción</th>
                        <th className="p-2 text-left">Página</th>
                        <th className="p-2 text-left">Usuario</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visitorLogs.map(v => (
                        <tr key={v.id} className="border-b border-gray-800 text-gray-300 hover:bg-gray-800">
                          <td className="p-2 whitespace-nowrap">{new Date(v.createdAt).toLocaleString('es-CO')}</td>
                          <td className="p-2 font-mono text-yellow-400">{v.ipAddress || 'N/A'}</td>
                          <td className="p-2">
                            {v.deviceType === 'mobile' ? <Smartphone size={14} className="text-blue-400" /> : <Monitor size={14} className="text-gray-400" />}
                          </td>
                          <td className="p-2">{v.browser || 'N/A'}</td>
                          <td className="p-2">{v.os || 'N/A'}</td>
                          <td className="p-2">
                            <span className="px-2 py-0.5 rounded bg-gray-700 text-gray-300">{v.action}</span>
                          </td>
                          <td className="p-2">{v.page || 'N/A'}</td>
                          <td className="p-2">{v.userId || 'Anónimo'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'security' && (
          <div className="space-y-4">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Key size={16} className="text-red-400" />
                  Cambiar Contraseña del Administrador
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  data-testid="input-new-admin-password"
                  type="password"
                  placeholder="Nueva contraseña para el admin"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                />
                <Button
                  data-testid="button-change-admin-password"
                  onClick={handleChangeAdminPassword}
                  className="bg-red-700 hover:bg-red-800"
                >
                  Cambiar Contraseña
                </Button>
              </CardContent>
            </Card>

            {dashboard && (
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <AlertTriangle size={16} className="text-yellow-400" />
                    Actividad Sospechosa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dashboard.auditLogs
                      .filter((l: any) => l.action.includes('failed') || l.action.includes('suspicious') || l.action.includes('blocked'))
                      .slice(0, 20)
                      .map((l: any) => (
                        <div key={l.id} className="p-2 bg-red-950 border border-red-800 rounded text-xs flex justify-between">
                          <div>
                            <span className="text-red-400 font-medium">{l.action}</span>
                            <span className="text-gray-400 ml-2">{l.details}</span>
                          </div>
                          <div className="text-gray-500 flex items-center gap-2">
                            <span>{l.ipAddress}</span>
                            <span>{new Date(l.createdAt).toLocaleString('es-CO')}</span>
                          </div>
                        </div>
                      ))}
                    {dashboard.auditLogs.filter((l: any) => l.action.includes('failed') || l.action.includes('suspicious')).length === 0 && (
                      <p className="text-gray-500 text-center py-4">No hay actividad sospechosa registrada</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'settings' && dashboard && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-sm">Configuraciones del Sistema ({dashboard.settings.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dashboard.settings.map((s: any) => (
                  <div key={s.key} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                    <div>
                      <p className="text-sm font-medium text-white">{s.key}</p>
                      <p className="text-xs text-gray-400">{s.description || 'Sin descripción'}</p>
                    </div>
                    <span className="text-sm font-mono bg-gray-700 px-2 py-1 rounded text-gray-300">{s.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
