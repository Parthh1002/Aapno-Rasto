import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Complaint } from '@/components/ComplaintCard';
import { useLanguage } from '@/contexts/LanguageContext';

interface DashboardAnalyticsProps {
  complaints: Complaint[];
}

const COLORS = ['#22c55e', '#eab308', '#ef4444', '#3b82f6', '#8b5cf6'];

export function DashboardAnalytics({ complaints }: DashboardAnalyticsProps) {
  const { t } = useLanguage();

  const categoryData = useMemo(() => {
    const counts = complaints.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
      .sort((a, b) => b.value - a.value);
  }, [complaints]);

  const statusData = useMemo(() => {
    const counts = complaints.reduce((acc, curr) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { name: 'Pending', value: counts['pending'] || 0, color: '#f97316' },
      { name: 'In Progress', value: counts['in_progress'] || 0, color: '#eab308' },
      { name: 'Completed', value: counts['completed'] || 0, color: '#22c55e' }
    ];
  }, [complaints]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <Card className="govt-card border-l-4 border-l-[#FF9933]">
        <CardHeader>
          <CardTitle className="text-lg text-[#FF9933]">Complaints by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF9933" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#FF9933" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255, 153, 51, 0.1)' }}
                  contentStyle={{ backgroundColor: 'rgba(10, 10, 10, 0.9)', border: '1px solid rgba(255, 153, 51, 0.3)', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="value" fill="url(#colorValue)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="govt-card">
        <CardHeader>
          <CardTitle className="text-lg">Resolution Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
