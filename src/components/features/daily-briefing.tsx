'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { useTaskStore } from '@/store/useTaskStore';
import { Sparkles } from 'lucide-react';

export function DailyBriefing() {
  const { tasks } = useTaskStore();
  const [briefing, setBriefing] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  useEffect(() => {
    let active = true;
    async function generateBriefing() {
      if (hasGenerated || tasks.length === 0) return;
      setLoading(true);
      try {
        const response = await fetch('/api/briefing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks }),
        });
        
        if (response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let done = false;
          let text = '';
          while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            if (value && active) {
              const chunk = decoder.decode(value, { stream: true });
              text += chunk;
              setBriefing(text);
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (active) {
          setLoading(false);
          setHasGenerated(true);
        }
      }
    }
    
    generateBriefing();
    return () => { active = false; };
  }, [tasks, hasGenerated]);

  if (tasks.length === 0) return null;

  return (
    <Card className="p-5 bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border-violet-200 dark:border-violet-900 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="flex items-center gap-2 mb-2 text-violet-600 dark:text-violet-400">
        <Sparkles className="w-5 h-5" />
        <h3 className="font-semibold">Daily AI Briefing</h3>
      </div>
      <div className="text-sm font-medium leading-relaxed min-h-[40px]">
        {briefing}
        {loading && <span className="animate-pulse ml-1 opacity-70">▋</span>}
      </div>
    </Card>
  );
}
