-- Session Tracking System - Database Setup
-- Run this script to initialize the session tracking database

-- User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    action VARCHAR(50) NOT NULL, -- 'login', 'session_start', 'admin_login'
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date DATE DEFAULT CURRENT_DATE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    INDEX idx_user_id (user_id),
    INDEX idx_date (date),
    INDEX idx_action (action),
    INDEX idx_timestamp (timestamp)
);

-- Daily Analytics Summary Table (for faster queries)
CREATE TABLE IF NOT EXISTS daily_analytics (
    id SERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    active_users INTEGER DEFAULT 0,
    total_logins INTEGER DEFAULT 0,
    total_tasks INTEGER DEFAULT 0,
    total_rewards DECIMAL(10,2) DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_date (date)
);