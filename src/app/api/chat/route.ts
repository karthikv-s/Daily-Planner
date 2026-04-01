import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: 'You are Planner.AI, an energetic and helpful AI daily planner assistant. You chat with the user to help them organize their tasks, break down complex goals, and improve their productivity. Keep your answers concise, structured, and extremely encouraging.',
      messages,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
