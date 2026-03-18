-- Create user_timers table for tracking active timers
CREATE TABLE IF NOT EXISTS user_timers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  timer_ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  timer_duration INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  notified BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_timers_user_id ON user_timers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_timers_ends_at ON user_timers(timer_ends_at);
CREATE INDEX IF NOT EXISTS idx_user_timers_notified ON user_timers(notified);

-- Enable Row Level Security
ALTER TABLE user_timers ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see their own timers
CREATE POLICY "Users can view their own timers"
  ON user_timers
  FOR SELECT
  USING (TRUE);

-- Create policy to allow service role to manage timers
CREATE POLICY "Service role can manage timers"
  ON user_timers
  FOR ALL
  USING (TRUE);
