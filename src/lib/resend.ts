import { Resend } from 'resend';

export const resend = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'mock-resend-key'
  ? new Resend(process.env.RESEND_API_KEY)
  : {
      emails: {
        send: async (payload: unknown) => console.log('Mock email sent:', payload),
      }
    }; // Mock fallback
