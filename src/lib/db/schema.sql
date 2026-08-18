-- Schema for User Profiles and OTP Codes table in Supabase / PostgreSQL

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- email or phone number
  type TEXT NOT NULL CHECK (type IN ('email', 'phone')),
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup on active OTPs
CREATE INDEX IF NOT EXISTS idx_otp_identifier ON public.otp_codes(identifier);

-- Table for User Tasks Cloud Sync
CREATE TABLE IF NOT EXISTS public.user_tasks (
  user_id TEXT PRIMARY KEY,
  tasks JSONB DEFAULT '[]'::jsonb,
  xp INT DEFAULT 0,
  streak INT DEFAULT 0,
  best_streak INT DEFAULT 0,
  last_completed_date TEXT,
  badges JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

