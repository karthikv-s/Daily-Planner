'use client';

import { useTaskStore } from '@/store/useTaskStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function AnalyticsPage() {
  const { xp, streak, bestStreak, tasks } = useTaskStore();

  const completedCount = tasks.filter(t => t.completed).length;
  const activeCount = tasks.length - completedCount;

  // Mocking 7-day velocity data for MVP visualization
  const velocityData = [
    { name: 'Mon', tasks: Math.floor(completedCount * 0.2) },
    { name: 'Tue', tasks: Math.floor(completedCount * 0.4) },
    { name: 'Wed', tasks: Math.floor(completedCount * 0.1) },
    { name: 'Thu', tasks: Math.floor(completedCount * 0.5) },
    { name: 'Fri', tasks: Math.floor(completedCount * 0.3) },
    { name: 'Sat', tasks: Math.floor(completedCount * 0.8) },
    { name: 'Sun', tasks: completedCount },
  ];

  const distributionData = [
    { name: 'Active', value: activeCount, fill: '#8b5cf6' },
    { name: 'Done', value: completedCount, fill: '#10b981' }
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 w-full">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-1">Track your productivity and velocity over time.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-violet-500/10 to-indigo-500/5 hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total XP Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-violet-600 dark:text-violet-400">{xp}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-amber-500/5 hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Current Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-orange-500">{streak} <span className="text-2xl">🔥</span></div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-400/5 hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Best Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-yellow-500">{bestStreak} <span className="text-2xl">🏆</span></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <Card>
          <CardHeader>
            <CardTitle>7-Day Completion Velocity</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={velocityData}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ stroke: '#8b5cf6', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Line type="monotone" dataKey="tasks" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6' }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task Distribution Status</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
