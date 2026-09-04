import React, { useEffect, useState } from 'react';
import { Trophy, Calendar as CalendarIcon, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { cn } from '../components/Layout.tsx';
import { api } from '../lib/api.ts';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    api.get('/analytics')
      .then((res: any) => {
        setStats(res.data);
      })
      .catch((err) => {
        console.error("Failed to fetch analytics:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-8 text-neutral-500">Loading dashboard...</div>;
  }

  // Fallback for null stats
  const safeStats = stats || {
    projects: { active: 0, completed: 0, total: 0 },
    tasks: { overdue: 0, completed: 0, total: 0 },
    results: { wins: 0, finals: 0, totalPrizeMoney: 0 }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Metric Card 1 */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm">
          <div className="flex items-center text-neutral-500 mb-4">
            <Trophy className="h-5 w-5 mr-2" />
            <h3 className="text-sm font-medium uppercase tracking-wider">Prize Money</h3>
          </div>
          <p className="text-3xl font-bold text-neutral-900">${safeStats.results.totalPrizeMoney.toLocaleString()}</p>
          <p className="text-sm text-green-600 mt-2 font-medium">+{safeStats.results.wins} Wins</p>
        </div>

        {/* Metric Card 2 */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm">
          <div className="flex items-center text-neutral-500 mb-4">
            <CheckCircle2 className="h-5 w-5 mr-2" />
            <h3 className="text-sm font-medium uppercase tracking-wider">Tasks Completed</h3>
          </div>
          <p className="text-3xl font-bold text-neutral-900">{safeStats.tasks.completed}</p>
          <p className="text-sm text-neutral-500 mt-2 font-medium">{safeStats.tasks.total - safeStats.tasks.completed} pending</p>
        </div>

        {/* Metric Card 3 */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm">
          <div className="flex items-center text-neutral-500 mb-4">
            <AlertCircle className="h-5 w-5 mr-2" />
            <h3 className="text-sm font-medium uppercase tracking-wider">Urgent Needs</h3>
          </div>
          <p className="text-3xl font-bold text-red-600">{safeStats.tasks.overdue}</p>
          <p className="text-sm text-neutral-500 mt-2 font-medium">Overdue tasks</p>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm min-h-[400px]">
          <h3 className="text-lg font-bold text-neutral-900 mb-4">Active Projects</h3>
          <div className="space-y-4">
             <div className="p-4 border border-neutral-100 rounded-lg hover:border-primary-200 transition-colors cursor-pointer group">
               <div className="flex justify-between items-start mb-2">
                 <h4 className="font-semibold text-neutral-900 group-hover:text-primary-600">AI Hackathon Spring 2026</h4>
                 <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">In Progress</span>
               </div>
               <p className="text-sm text-neutral-500 mb-3">Building a multimodal agent for automated video editing.</p>
               <div className="flex items-center text-sm text-neutral-400">
                 <Clock className="w-4 h-4 mr-1.5" /> 12 days left
               </div>
             </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm min-h-[400px]">
          <h3 className="text-lg font-bold text-neutral-900 mb-4">Upcoming Deadlines</h3>
          <div className="space-y-4">
             <div className="flex items-center p-3 rounded-lg bg-red-50 text-red-900">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-semibold">Submit presentation slides</p>
                  <p className="text-xs text-red-700 mt-0.5">Overdue by 2 days</p>
                </div>
             </div>
             
             <div className="flex items-center p-3 rounded-lg bg-neutral-50 text-neutral-900 border border-neutral-100">
                <div className="h-10 w-10 rounded-full bg-white border border-neutral-200 flex items-center justify-center shrink-0">
                  <CalendarIcon className="h-5 w-5 text-neutral-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-semibold">Final Code Freeze</p>
                  <p className="text-xs text-neutral-500 mt-0.5">Tomorrow, 11:59 PM</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
