import React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, CheckCircle, Clock, TrendingUp, AlertTriangle, Award,
  CalendarDays, Globe, RefreshCw, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GovtHeader } from '@/components/GovtHeader';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePublicStats } from '@/hooks/usePublicStats';
import { cn } from '@/lib/utils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, Legend,
} from 'recharts';

const PIE_COLORS = ['#002147', '#FF9933', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B'];

const CATEGORY_LABELS: Record<string, string> = {
  garbage: 'Garbage Collection',
  streetLight: 'Street Light',
  roadMaintenance: 'Road Maintenance',
  waterSupply: 'Water Supply',
  drainage: 'Drainage',
  publicSafety: 'Public Safety',
  strayDog: 'Stray Dog Issue',
};

export default function StatisticsPage() {
  const { t, language } = useLanguage();
  const { stats, isLoading, lastUpdated, refetch } = usePublicStats();

  if (isLoading || !stats) {
    return (
      <div className="min-h-screen bg-background">
        <GovtHeader variant="compact" />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-12 h-12 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  const metricCards = [
    { label: 'Total Complaints', value: stats.total, icon: BarChart3, color: 'text-foreground' },
    { label: 'Resolved', value: stats.resolved, icon: CheckCircle, color: 'text-govt-green' },
    { label: 'In Progress', value: stats.inProgress, icon: TrendingUp, color: 'text-yellow-500' },
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-destructive' },
    { label: 'Resolution Rate', value: `${stats.resolutionRate}%`, icon: Award, color: 'text-accent' },
    { label: 'Avg Response', value: `${stats.avgResponseHours}h`, icon: AlertTriangle, color: 'text-foreground' },
    { label: 'Today', value: stats.completedToday, icon: CalendarDays, color: 'text-govt-green' },
    { label: 'This Week', value: stats.completedThisWeek, icon: TrendingUp, color: 'text-accent' },
  ];

  const pieData = stats.categoryBreakdown.map(c => ({
    name: CATEGORY_LABELS[c.name] || c.name,
    value: c.value,
    icon: c.icon,
  }));

  const getResponseTimeColor = (hours: number) => {
    if (hours < 24) return 'text-govt-green';
    if (hours < 48) return 'text-yellow-500';
    return 'text-destructive';
  };

  return (
    <div className="min-h-screen bg-background">
      <GovtHeader variant="compact" />


      <main className="container mx-auto px-4 py-6 max-w-7xl space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className={cn(
            "text-2xl md:text-3xl font-bold text-foreground",
            language === 'gu' ? 'font-gujarati' : ''
          )}>
            {language === 'gu' ? 'જાહેર ફરિયાદ આંકડા ડેશબોર્ડ' : 'Public Complaint Statistics Dashboard'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'gu' ? 'શાસનમાં પારદર્શિતા' : 'Transparency in Governance'}
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <RefreshCw className="w-3 h-3" />
            <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
            <span className="text-accent cursor-pointer hover:underline" onClick={refetch}>
              (auto-refreshes every 30s)
            </span>
          </div>
        </motion.div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metricCards.map((metric, i) => {
            const Icon = metric.icon;
            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="stat-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">{metric.label}</p>
                        <p className={cn("text-2xl font-bold mt-1", metric.color)}>
                          {metric.value}
                        </p>
                      </div>
                      <Icon className={cn("w-6 h-6 opacity-40", metric.color)} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* 30-Day Trend */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="govt-card">
              <CardHeader>
                <CardTitle className="text-lg">30-Day Complaint Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={stats.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(d) => new Date(d).getDate().toString()}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        backgroundColor: 'hsl(var(--card))',
                        color: 'hsl(var(--foreground))',
                      }}
                      labelFormatter={(d) => new Date(d).toLocaleDateString()}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="submitted"
                      stroke="#002147"
                      strokeWidth={2}
                      name="Submitted"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      stroke="#10B981"
                      strokeWidth={2}
                      name="Completed"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Category Distribution */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="govt-card">
              <CardHeader>
                <CardTitle className="text-lg">Category Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        backgroundColor: 'hsl(var(--card))',
                        color: 'hsl(var(--foreground))',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* District Bar Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="govt-card">
            <CardHeader>
              <CardTitle className="text-lg">District Performance (Top 10)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={stats.districtData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="district" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--card))',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="total" fill="#002147" name="Total" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" fill="#10B981" name="Completed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* District Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="govt-card overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="w-5 h-5 text-accent" />
                District-wise Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>District</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Completed</TableHead>
                      <TableHead className="text-center">Pending</TableHead>
                      <TableHead>Resolution Rate</TableHead>
                      <TableHead className="text-center">Avg Response</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.districtData.map((district) => (
                      <TableRow key={district.district}>
                        <TableCell className="font-medium">{district.district}</TableCell>
                        <TableCell className="text-center">{district.total}</TableCell>
                        <TableCell className="text-center text-govt-green font-semibold">
                          {district.completed}
                        </TableCell>
                        <TableCell className="text-center text-destructive font-semibold">
                          {district.pending}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={district.resolutionRate} className="h-2 flex-1" />
                            <span className="text-xs font-mono w-10 text-right">
                              {district.resolutionRate}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className={cn("text-center font-semibold", getResponseTimeColor(district.avgResponseHours))}>
                          {district.avgResponseHours}h
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <div className="text-center py-6 text-sm text-muted-foreground">
          <p>© 2026 Government of Gujarat — Aapno Rasto</p>
          <p className="text-xs mt-1">Data refreshes automatically every 30 seconds</p>
        </div>
      </main>
    </div>
  );
}
