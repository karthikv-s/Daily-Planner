import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { Task } from '@/types/task';

export async function POST(req: Request) {
  const { tasks }: { tasks: Task[] } = await req.json();

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'mock-openai-key') {
    return new Response('Mock mode active: Your daily briefing is looking great. You have ' + tasks.length + ' tasks perfectly organized. Keep up the momentum! 🔥', {
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  const prompt = `You are an AI assistant for a Daily Planner app. 
Here are the user's current tasks:
${tasks.map(t => `- [${t.completed ? 'x' : ' '}] ${t.title} (Priority: ${t.priority})`).join('\n')}

Please write a very short (2-3 sentences), encouraging "Daily Briefing" summarizing their current workload. If they have done tasks, praise them. If they have P0 tasks, remind them gently.`;

  const result = streamText({
    model: openai('gpt-4o'),
    prompt,
  });

  return result.toTextStreamResponse();
}
