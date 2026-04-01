'use server';

import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { Priority } from '@/types/task';

export async function parseTaskFromText(input: string) {
  try {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'mock-openai-key') {
      await new Promise(r => setTimeout(r, 1000)); // Simulate latency
      return {
        title: input,
        description: 'Auto-generated mock description',
        priority: 'P1' as Priority,
        dueTime: new Date(Date.now() + 86400000).toISOString(),
      };
    }

    const { object } = await generateObject({
      model: openai('gpt-4o'),
      schema: z.object({
        title: z.string().describe('A concise title for the task'),
        description: z.string().optional().describe('Additional details or notes extracted from the prompt'),
        priority: z.enum(['P0', 'P1', 'P2']).describe('P0 is urgent/critical, P1 is high/normal, P2 is low priority'),
        dueTime: z.string().optional().describe('ISO 8601 date string if a time or date was mentioned'),
      }),
      prompt: `Extract task details from this user input: "${input}". Today is ${new Date().toISOString()}`,
    });

    return object;
  } catch (error) {
    console.error('Failed to parse task:', error);
    throw new Error('Failed to parse task from input');
  }
}
