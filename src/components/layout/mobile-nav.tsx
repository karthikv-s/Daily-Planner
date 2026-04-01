"use client";

import { Calendar, Home, CheckSquare, Trophy } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function MobileNav() {
  const pathname = usePathname();

  const getLinkClasses = (path: string) => {
    return pathname === path 
      ? "flex flex-col items-center gap-1 text-violet-600 dark:text-violet-400"
      : "flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground";
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background/80 backdrop-blur-lg flex justify-around p-3 z-40 px-6 pb-safe">
      <Link href="/" className={getLinkClasses("/")}>
        <Home className="w-5 h-5" />
        <span className="text-[10px] font-medium">Today</span>
      </Link>
      <Link href="/upcoming" className={getLinkClasses("/upcoming")}>
        <Calendar className="w-5 h-5" />
        <span className="text-[10px] font-medium">Upcoming</span>
      </Link>
      <Link href="/completed" className={getLinkClasses("/completed")}>
        <CheckSquare className="w-5 h-5" />
        <span className="text-[10px] font-medium">Done</span>
      </Link>
      <Link href="/analytics" className={getLinkClasses("/analytics")}>
        <Trophy className="w-5 h-5" />
        <span className="text-[10px] font-medium">Stats</span>
      </Link>
    </div>
  );
}
