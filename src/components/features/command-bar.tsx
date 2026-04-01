'use client';

import { useEffect, useState } from 'react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useTaskStore } from '@/store/useTaskStore';
import { Plus, CheckCircle, Sparkles } from 'lucide-react';
import { parseTaskFromText } from '@/app/actions/ai';
import { toast } from 'sonner';

export function CommandBar() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [parsing, setParsing] = useState(false);
  const { tasks, toggleComplete, addTask } = useTaskStore();

  const handleSmartCreate = async () => {
    if (!input.trim() || parsing) return;
    setParsing(true);
    try {
      const task = await parseTaskFromText(input);
      addTask({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        dueTime: task.dueTime || null,
      });
      toast.success('Task created via AI! ✨');
      setInput('');
      setOpen(false);
    } catch (e) {
      console.error(e);
      toast.error('Failed to parse task.');
    } finally {
      setParsing(false);
    }
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <>
      <p className="fixed bottom-4 right-4 text-sm text-muted-foreground hidden md:flex items-center gap-1 z-50 bg-background/80 backdrop-blur-sm p-2 rounded-lg border shadow-sm">
        Press <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100"><span className="text-xs">⌘</span>K</kbd> to command
      </p>
      
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command className="bg-transparent overflow-visible">
          <div className="relative isolate">
            <div className="absolute -inset-0.5 -z-10 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 opacity-50 blur-sm"></div>
          <div className="bg-popover rounded-xl overflow-hidden border">
            <CommandInput value={input} onValueChange={setInput} placeholder="Type a command or smart task description..." className="focus-visible:ring-0 focus:ring-0 border-none outline-none" />
            <CommandList>
              <CommandEmpty>{parsing ? 'Parsing...' : 'No results found.'}</CommandEmpty>
              {input.length > 3 && (
                <CommandGroup heading="AI Smart Create">
                  <CommandItem onSelect={handleSmartCreate}>
                    <Sparkles className={`mr-2 h-4 w-4 text-violet-500 ${parsing ? 'animate-spin' : ''}`} />
                    <span>{parsing ? 'Parsing task via AI...' : `Create task: "${input}"`}</span>
                  </CommandItem>
                </CommandGroup>
              )}
              <CommandGroup heading="Actions">
                <CommandItem onSelect={() => { 
                  setOpen(false); 
                  document.getElementById('new-task-btn')?.click(); 
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Create Task manually</span>
                </CommandItem>
              </CommandGroup>
              {tasks.length > 0 && (
                <CommandGroup heading="Recent Tasks">
                  {tasks.slice(0, 5).map((task) => (
                    <CommandItem key={task.id} onSelect={() => { toggleComplete(task.id); setOpen(false); }}>
                      <CheckCircle className={`mr-2 h-4 w-4 ${task.completed ? 'text-green-500' : 'text-muted-foreground'}`} />
                      <span className={task.completed ? 'line-through text-muted-foreground' : ''}>{task.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </div>
          </div>
        </Command>
      </CommandDialog>
    </>
  );
}
