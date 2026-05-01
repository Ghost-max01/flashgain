## Analytics Setup Guide

Your analytics system is now fully implemented with real data tracking. Follow these steps to make it work:

### Step 1: Create Database Tables in Supabase

1. Go to your **Supabase Dashboard**
2. Select your project
3. Go to **SQL Editor** 
4. Click **New Query**
5. **Copy and paste this entire SQL** into the editor:

```sql
-- User Sessions Table (for login tracking)
CREATE TABLE IF NOT EXISTS user_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date DATE DEFAULT CURRENT_DATE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task Completions Table (for task tracking)
CREATE TABLE IF NOT EXISTS task_completions (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    task_id VARCHAR(255) NOT NULL,
    task_name VARCHAR(255),
    reward INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_date ON user_sessions(date);
CREATE INDEX IF NOT EXISTS idx_user_sessions_action ON user_sessions(action);
CREATE INDEX IF NOT EXISTS idx_user_sessions_timestamp ON user_sessions(timestamp);

CREATE INDEX IF NOT EXISTS idx_task_completions_user_id ON task_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_date ON task_completions(date);
CREATE INDEX IF NOT EXISTS idx_task_completions_task_id ON task_completions(task_id);

-- Enable Row Level Security
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations
CREATE POLICY "Allow all on user_sessions" ON user_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on task_completions" ON task_completions FOR ALL USING (true) WITH CHECK (true);
```

6. Click **Run** button

### Step 2: Test the System

1. **Log in** to your application
   - Your login will now be tracked in the `user_sessions` table

2. **Complete some tasks** 
   - When you complete tasks, they'll be tracked in the `task_completions` table

3. **Go to Admin Dashboard** > **Analytics**
   - You should now see real data from your logins and completed tasks
   - Charts will display your actual activity

### What Gets Tracked

✅ **Login Sessions** - Every time a user logs in, it's recorded
✅ **Task Completions** - Every task completed is tracked with reward amount
✅ **Daily Aggregation** - Data is automatically grouped by day for analytics
✅ **Active Users** - Unique users per day from login sessions
✅ **Total Rewards** - Sum of rewards from completed tasks

### Analytics Dashboard Shows

- **Total Login Sessions** - Total logins in the selected period
- **Total Tasks Completed** - Total completed tasks  
- **Avg Tasks/Day** - Average tasks per day
- **Total Balance Paid** - Sum of all rewards
- **Activity Trend** - Line chart showing tasks and active users over time
- **Daily Performance** - Bar chart of daily metrics
- **Activity Distribution** - Pie chart of task vs user metrics
