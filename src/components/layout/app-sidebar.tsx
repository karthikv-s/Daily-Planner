"use client";

import { Calendar, CheckSquare, Home, Settings, Trophy } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AppSidebar() {
  const pathname = usePathname();

  const getLinkClasses = (path: string) => {
    return pathname === path 
      ? "flex items-center gap-3 px-3 py-2 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-medium transition-colors"
      : "flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors";
  };

  return (
    <aside className="hidden md:flex flex-col w-64 border-r bg-muted/20 px-4 py-6 justify-between transition-all duration-300 sticky top-0 h-screen">
      <div className="space-y-8">
        <div className="px-2">
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600">Planner.AI</h2>
        </div>
        
        <nav className="space-y-2">
          <Link href="/" className={getLinkClasses("/")}>
            <Home className="w-5 h-5" /> Today
          </Link>
          <Link href="/upcoming" className={getLinkClasses("/upcoming")}>
            <Calendar className="w-5 h-5" /> Upcoming
          </Link>
          <Link href="/completed" className={getLinkClasses("/completed")}>
            <CheckSquare className="w-5 h-5" /> Completed
          </Link>
          <Link href="/analytics" className={getLinkClasses("/analytics")}>
            <Trophy className="w-5 h-5" /> Analytics
          </Link>
        </nav>
      </div>
      
      <nav className="space-y-2">
        <Link href="/settings" className={getLinkClasses("/settings")}>
          <Settings className="w-5 h-5" /> Settings
        </Link>
      </nav>
    </aside>
  );
}
