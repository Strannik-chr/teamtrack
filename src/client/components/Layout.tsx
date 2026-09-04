import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Trophy, Users, Bell, CheckSquare } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Competitions', href: '/competitions', icon: Trophy },
  { name: 'Team', href: '/team', icon: Users },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen w-full bg-neutral-50/50">
      {/* Sidebar */}
      <aside className="w-64 border-r border-neutral-200 bg-white flex-col hidden md:flex">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight text-primary-900">TeamTrack</h1>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                  isActive 
                    ? "bg-primary-50 text-primary-700" 
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                )}
              >
                <Icon className={cn("mr-3 h-5 w-5", isActive ? "text-primary-700" : "text-neutral-400")} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-neutral-200">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
              U
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-neutral-900">Current User</p>
              <p className="text-xs text-neutral-500">View profile</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-neutral-200 bg-white flex items-center justify-between px-8 shrink-0">
          <h2 className="text-lg font-semibold text-neutral-900">
            {navItems.find(item => item.href === location.pathname)?.name || "Dashboard"}
          </h2>
          <div className="flex items-center space-x-4">
            <button className="p-2 text-neutral-400 hover:text-neutral-500 rounded-full hover:bg-neutral-100 transition-colors">
              <Bell className="h-5 w-5" />
            </button>
          </div>
        </header>
        <div className="flex-1 p-8 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
