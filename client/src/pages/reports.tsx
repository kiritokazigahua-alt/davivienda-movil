import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import {
  ArrowLeft, TrendingUp, TrendingDown, DollarSign, BarChart3,
  Lightbulb, Target, Activity, PieChart, Calendar, Download,
  ChevronRight, Sparkles, Shield, ArrowUpRight, ArrowDownRight
} from "lucide-react";

interface FinancialReport {
  generatedAt: string;
  userName: string;
  accountNumber: string;
  accountType: string;
  currency: string;
  currentBalance: number;
  summary: {
    totalTransactions: number;
    totalIncome: number;
    totalExpenses: number;
    netFlow: number;
    last30Days: { income: number; expenses: number; net: number; count: number };
    last90Days: { count: number };
  };
  healthScore: { score: number; label: string; color: string };
  monthlyTrend: Array<{
    key: string; month: string; year: number; income: number; expenses: number; net: number; count: number;
  }>;
  typeBreakdown: Array<{ type: string; label: string; count: number; total: number }>;
  highlights: {
    largestIncome: { amount: number; description: string; date: string };
    largestExpense: { amount: number; description: string; date: string };
  };
  insights: string[];
  recommendations: string[];
}

const fmt = (n: number) => `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`;

const HealthScoreRing = ({ score, label, color }: { score: number; label: string; color: string }) => {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  const colorMap: Record<string, string> = { green: '#22c55e', blue: '#3b82f6', yellow: '#eab308', red: '#ef4444' };
  const strokeColor = colorMap[color] || '#3b82f6';

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#e5e7eb" strokeWidth="8" className="dark:stroke-gray-700" />
          <circle cx="60" cy="60" r="54" fill="none" stroke={strokeColor} strokeWidth="8"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease-in-out' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color: strokeColor }}>{score}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">de 100</span>
        </div>
      </div>
      <p className="mt-2 text-sm font-semibold" style={{ color: strokeColor }}>{label}</p>
    </div>
  );
};

const MiniBar = ({ value, max, color }: { value: number; max: number; color: string }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%`, transition: 'width 0.8s ease' }} />
    </div>
  );
};

const ReportsPage = () => {
  const [_, navigate] = useLocation();
  const [activeSection, setActiveSection] = useState<string>('overview');

  const { data: report, isLoading, error, refetch } = useQuery<FinancialReport>({
    queryKey: ['/api/reports/financial'],
    staleTime: 60000,
  });

  const downloadReport = () => {
    if (!report) return;
    const lines: string[] = [];
    lines.push("═══════════════════════════════════════");
    lines.push("  REPORTE FINANCIERO PERSONALIZADO");
    lines.push("  Davivienda - Banca Virtual");
    lines.push("═══════════════════════════════════════");
    lines.push(`Generado: ${new Date(report.generatedAt).toLocaleString('es-CO')}`);
    lines.push(`Titular: ${report.userName}`);
    lines.push(`Cuenta: ${report.accountNumber} (${report.accountType})`);
    lines.push(`Saldo actual: ${fmt(report.currentBalance)} ${report.currency}`);
    lines.push("");
    lines.push("── RESUMEN GENERAL ──");
    lines.push(`Total transacciones: ${report.summary.totalTransactions}`);
    lines.push(`Total ingresos: ${fmt(report.summary.totalIncome)}`);
    lines.push(`Total gastos: ${fmt(report.summary.totalExpenses)}`);
    lines.push(`Flujo neto: ${fmt(report.summary.netFlow)}`);
    lines.push("");
    lines.push("── ÚLTIMOS 30 DÍAS ──");
    lines.push(`Ingresos: ${fmt(report.summary.last30Days.income)}`);
    lines.push(`Gastos: ${fmt(report.summary.last30Days.expenses)}`);
    lines.push(`Neto: ${fmt(report.summary.last30Days.net)}`);
    lines.push(`Transacciones: ${report.summary.last30Days.count}`);
    lines.push("");
    lines.push("── SALUD FINANCIERA ──");
    lines.push(`Puntuación: ${report.healthScore.score}/100 - ${report.healthScore.label}`);
    lines.push("");
    lines.push("── TENDENCIA MENSUAL ──");
    report.monthlyTrend.forEach(m => {
      lines.push(`${m.month} ${m.year}: Ingresos ${fmt(m.income)} | Gastos ${fmt(m.expenses)} | Neto ${fmt(m.net)}`);
    });
    lines.push("");
    lines.push("── ANÁLISIS POR TIPO ──");
    report.typeBreakdown.forEach(t => {
      lines.push(`${t.label}: ${t.count} transacciones, Total ${fmt(t.total)}`);
    });
    lines.push("");
    lines.push("── INSIGHTS IA ──");
    report.insights.forEach((i, idx) => lines.push(`${idx + 1}. ${i}`));
    lines.push("");
    lines.push("── RECOMENDACIONES ──");
    report.recommendations.forEach((r, idx) => lines.push(`${idx + 1}. ${r}`));

    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_financiero_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sections = [
    { id: 'overview', label: 'Resumen', icon: BarChart3 },
    { id: 'trends', label: 'Tendencias', icon: TrendingUp },
    { id: 'breakdown', label: 'Desglose', icon: PieChart },
    { id: 'insights', label: 'Insights IA', icon: Sparkles },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-700 to-red-800">
        <div className="px-4 pt-4 pb-3 flex items-center gap-3">
          <button onClick={() => navigate('/home')} className="text-white"><ArrowLeft size={22} /></button>
          <h1 className="text-white font-semibold text-lg">Reportes Financieros</h1>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-t-3xl min-h-screen p-4 space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-700 to-red-800">
        <div className="px-4 pt-4 pb-3 flex items-center gap-3">
          <button onClick={() => navigate('/home')} className="text-white"><ArrowLeft size={22} /></button>
          <h1 className="text-white font-semibold text-lg">Reportes Financieros</h1>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-t-3xl min-h-screen p-4 flex flex-col items-center justify-center gap-4">
          <p className="text-gray-500">No se pudo cargar el reporte.</p>
          <Button data-testid="button-retry-report" onClick={() => refetch()} variant="outline" className="rounded-full">
            Intentar de nuevo
          </Button>
        </div>
      </div>
    );
  }

  const maxMonthly = Math.max(...report.monthlyTrend.map(m => Math.max(m.income, m.expenses)), 1);
  const maxTypeTotal = Math.max(...report.typeBreakdown.map(t => t.total), 1);
  const typeColors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500'];

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-700 to-red-800">
      <div className="px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button data-testid="button-back-reports" onClick={() => navigate('/home')} className="text-white active:scale-95">
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="text-white font-semibold text-lg">Reportes Financieros</h1>
              <p className="text-red-200 text-xs">Análisis inteligente de tu cuenta</p>
            </div>
          </div>
          <button data-testid="button-download-report" onClick={downloadReport} className="bg-white/20 rounded-full p-2 text-white active:scale-95">
            <Download size={18} />
          </button>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-200 text-xs">{report.accountType}</p>
              <p className="text-white text-2xl font-bold" data-testid="text-report-balance">{fmt(report.currentBalance)}</p>
              <p className="text-red-200 text-xs">{report.currency} · {report.accountNumber}</p>
            </div>
            <div className="text-right">
              <div className={`flex items-center gap-1 ${report.summary.last30Days.net >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {report.summary.last30Days.net >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                <span className="text-sm font-medium">{fmt(Math.abs(report.summary.last30Days.net))}</span>
              </div>
              <p className="text-red-200 text-xs">Últimos 30 días</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-900 rounded-t-3xl min-h-screen">
        <div className="flex gap-1 p-3 overflow-x-auto">
          {sections.map(s => (
            <button
              key={s.id}
              data-testid={`tab-report-${s.id}`}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all active:scale-95 ${
                activeSection === s.id
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              <s.icon size={14} />
              {s.label}
            </button>
          ))}
        </div>

        <div className="px-4 pb-32 space-y-4">
          {activeSection === 'overview' && (
            <>
              <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield size={18} className="text-red-600" />
                    <h3 className="font-semibold text-sm">Salud Financiera</h3>
                  </div>
                  <div className="flex items-center justify-between">
                    <HealthScoreRing score={report.healthScore.score} label={report.healthScore.label} color={report.healthScore.color} />
                    <div className="flex-1 ml-6 space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500">Ingresos (30d)</span>
                          <span className="font-medium text-green-600">{fmt(report.summary.last30Days.income)}</span>
                        </div>
                        <MiniBar value={report.summary.last30Days.income} max={Math.max(report.summary.last30Days.income, report.summary.last30Days.expenses)} color="bg-green-500" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500">Gastos (30d)</span>
                          <span className="font-medium text-red-600">{fmt(report.summary.last30Days.expenses)}</span>
                        </div>
                        <MiniBar value={report.summary.last30Days.expenses} max={Math.max(report.summary.last30Days.income, report.summary.last30Days.expenses)} color="bg-red-500" />
                      </div>
                      <div className="pt-1 border-t">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Transacciones totales</span>
                          <span className="font-bold">{report.summary.totalTransactions}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                <Card className="border-0 shadow-md rounded-2xl">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <TrendingUp size={16} className="text-green-600" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Total Ingresos</p>
                    <p className="text-lg font-bold text-green-600" data-testid="text-total-income">{fmt(report.summary.totalIncome)}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-md rounded-2xl">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                        <TrendingDown size={16} className="text-red-600" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Total Gastos</p>
                    <p className="text-lg font-bold text-red-600" data-testid="text-total-expenses">{fmt(report.summary.totalExpenses)}</p>
                  </CardContent>
                </Card>
              </div>

              {report.highlights.largestIncome.amount > 0 && (
                <Card className="border-0 shadow-md rounded-2xl">
                  <CardContent className="p-4 space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Activity size={16} className="text-red-600" />
                      Movimientos Destacados
                    </h3>
                    {report.highlights.largestIncome.amount > 0 && (
                      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                        <div className="flex items-center gap-3">
                          <ArrowUpRight size={18} className="text-green-600" />
                          <div>
                            <p className="text-xs text-gray-500">Mayor ingreso</p>
                            <p className="text-sm font-medium">{report.highlights.largestIncome.description}</p>
                          </div>
                        </div>
                        <p className="font-bold text-green-600">{fmt(report.highlights.largestIncome.amount)}</p>
                      </div>
                    )}
                    {report.highlights.largestExpense.amount > 0 && (
                      <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                        <div className="flex items-center gap-3">
                          <ArrowDownRight size={18} className="text-red-600" />
                          <div>
                            <p className="text-xs text-gray-500">Mayor gasto</p>
                            <p className="text-sm font-medium">{report.highlights.largestExpense.description}</p>
                          </div>
                        </div>
                        <p className="font-bold text-red-600">{fmt(report.highlights.largestExpense.amount)}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {activeSection === 'trends' && (
            <>
              <Card className="border-0 shadow-md rounded-2xl">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar size={18} className="text-red-600" />
                    <h3 className="font-semibold text-sm">Tendencia Mensual</h3>
                  </div>
                  {report.monthlyTrend.length === 0 ? (
                    <p className="text-gray-500 text-center py-6 text-sm">No hay suficientes datos para mostrar tendencias</p>
                  ) : (
                    <div className="space-y-4">
                      {report.monthlyTrend.map((m, i) => (
                        <div key={m.key} data-testid={`trend-month-${i}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">{m.month} {m.year}</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              m.net >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-red-100 text-red-700 dark:bg-red-900/30'
                            }`}>
                              {m.net >= 0 ? '+' : ''}{fmt(m.net)}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 w-16">Ingresos</span>
                              <div className="flex-1">
                                <MiniBar value={m.income} max={maxMonthly} color="bg-green-500" />
                              </div>
                              <span className="text-xs font-medium text-green-600 w-24 text-right">{fmt(m.income)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 w-16">Gastos</span>
                              <div className="flex-1">
                                <MiniBar value={m.expenses} max={maxMonthly} color="bg-red-500" />
                              </div>
                              <span className="text-xs font-medium text-red-600 w-24 text-right">{fmt(m.expenses)}</span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{m.count} transacciones</p>
                          {i < report.monthlyTrend.length - 1 && <hr className="mt-3 border-gray-100 dark:border-gray-800" />}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md rounded-2xl">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 size={18} className="text-red-600" />
                    <h3 className="font-semibold text-sm">Flujo de Efectivo</h3>
                  </div>
                  <div className="flex justify-around">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{fmt(report.summary.totalIncome)}</p>
                      <p className="text-xs text-gray-500">Entradas totales</p>
                    </div>
                    <div className="w-px bg-gray-200 dark:bg-gray-700" />
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{fmt(report.summary.totalExpenses)}</p>
                      <p className="text-xs text-gray-500">Salidas totales</p>
                    </div>
                  </div>
                  <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-center">
                    <p className="text-xs text-gray-500">Flujo neto</p>
                    <p className={`text-xl font-bold ${report.summary.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {report.summary.netFlow >= 0 ? '+' : ''}{fmt(report.summary.netFlow)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeSection === 'breakdown' && (
            <Card className="border-0 shadow-md rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <PieChart size={18} className="text-red-600" />
                  <h3 className="font-semibold text-sm">Desglose por Tipo</h3>
                </div>
                {report.typeBreakdown.length === 0 ? (
                  <p className="text-gray-500 text-center py-6 text-sm">No hay transacciones para analizar</p>
                ) : (
                  <div className="space-y-4">
                    {report.typeBreakdown.map((t, i) => {
                      const pct = report.summary.totalTransactions > 0 ? Math.round((t.count / report.summary.totalTransactions) * 100) : 0;
                      return (
                        <div key={t.type} data-testid={`breakdown-type-${t.type}`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${typeColors[i % typeColors.length]}`} />
                              <span className="text-sm font-medium">{t.label}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold">{fmt(t.total)}</span>
                              <span className="text-xs text-gray-400 ml-2">{pct}%</span>
                            </div>
                          </div>
                          <MiniBar value={t.total} max={maxTypeTotal} color={typeColors[i % typeColors.length]} />
                          <p className="text-xs text-gray-400 mt-1">{t.count} transacciones</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeSection === 'insights' && (
            <>
              <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={18} className="text-white" />
                    <h3 className="text-white font-semibold text-sm">Análisis Inteligente</h3>
                  </div>
                  <p className="text-purple-200 text-xs">Insights generados a partir de tus patrones financieros</p>
                </div>
                <CardContent className="p-4 space-y-3">
                  {report.insights.map((insight, i) => (
                    <div key={i} data-testid={`insight-${i}`} className="flex gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                      <Lightbulb size={18} className="text-purple-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700 dark:text-gray-300">{insight}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Target size={18} className="text-white" />
                    <h3 className="text-white font-semibold text-sm">Recomendaciones</h3>
                  </div>
                  <p className="text-emerald-200 text-xs">Acciones sugeridas para mejorar tu salud financiera</p>
                </div>
                <CardContent className="p-4 space-y-3">
                  {report.recommendations.map((rec, i) => (
                    <div key={i} data-testid={`recommendation-${i}`} className="flex gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                      <ChevronRight size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700 dark:text-gray-300">{rec}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <p className="text-center text-xs text-gray-400 pb-4">
                Generado el {new Date(report.generatedAt).toLocaleString('es-CO')}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
