'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTaskStore } from "@/store/useTaskStore";
import { User, Database, Cloud, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { logout } from "@/app/auth/actions";

export default function SettingsPage() {
  const { tasks, isCloudSyncEnabled, setCloudSync } = useTaskStore();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleClearData = () => {
    if (confirm("Are you sure you want to clear your local tasks? This cannot be undone.")) {
      useTaskStore.setState({ tasks: [], xp: 0, streak: 0, bestStreak: 0, lastCompletedDate: null, badges: [] });
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('daily-planner-storage')) {
          localStorage.removeItem(key);
        }
      });
      window.location.href = '/';
    }
  }

  const handleConnect = () => {
    if (isCloudSyncEnabled) {
      setCloudSync(false);
      toast.success("Disconnected from Cloud Sync.");
      return;
    }
    
    setIsConnecting(true);
    toast.loading("Connecting to Supabase...", { id: 'cloud-sync' });
    setTimeout(() => {
      setIsConnecting(false);
      setCloudSync(true);
      toast.success("Cloud Auth connected successfully!", { id: 'cloud-sync' });
    }, 1500);
  }

  return (
    <main className="flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account preferences, integrations, and local data.</p>
      </header>

      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <div className={`p-2 rounded-xl transition-colors ${isCloudSyncEnabled ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-violet-100 dark:bg-violet-900/30'}`}>
              <User className={`w-6 h-6 ${isCloudSyncEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-violet-600 dark:text-violet-400'}`} />
            </div>
            <div>
              <CardTitle>Cloud Account</CardTitle>
              <CardDescription>{isCloudSyncEnabled ? 'Your tasks are securely syncing to Supabase.' : 'Supabase sync requires live credentials to be injected.'}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button 
              variant={isCloudSyncEnabled ? "secondary" : "default"} 
              className={!isCloudSyncEnabled ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white" : ""}
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? "Connecting..." : isCloudSyncEnabled ? "Disconnect Account" : "Connect Account"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-xl">
              <LogOut className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <CardTitle>Sign Out</CardTitle>
              <CardDescription>Securely sign out of your account on this device.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => logout()}>
              Sign Out
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-xl">
              <Database className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <CardTitle>Storage & Local Data</CardTitle>
              <CardDescription>Manage the tasks currently cached in your browser.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm font-medium">
              You currently have <span className="text-orange-600 font-bold">{tasks.length}</span> tasks stored locally across your priorities.
            </div>
            <Button variant="destructive" onClick={handleClearData}>
              Erase Local Data
            </Button>
          </CardContent>
        </Card>

      </div>
    </main>
  );
}
