# ADMIN DASHBOARD DOCUMENTATION

## Overview
The admin dashboard is a comprehensive system monitoring and management interface located at `/f` route.

## Features

### 1. **Main Dashboard** (`/f`)
- **Overall Statistics**
  - Total Users (tracked via login logs)
  - Total Tasks Completed (from cooldown tracking)
  - Average Tasks per User
  
- **Date Navigation**
  - Calendar date picker for viewing past/future days
  - Previous/Next day navigation
  - Quick "Today" button
  
- **Daily Overview**
  - Unique logins for selected date
  - Tasks completed that day
  - Active users count
  - Total rewards distributed
  
- **Tasks List**
  - Detailed view of all tasks completed on selected date
  - Task name, reward amount, and completion time
  - Reward calculations
  
- **Activity History**
  - Real-time activity log
  - Shows latest 20 activities
  - Includes admin logins and user actions
  
- **Export Functionality**
  - Export all data as JSON
  - Includes daily stats and full activity logs

### 2. **Analytics Page** (`/f/analytics`)
- **Period Selection**
  - 7 days, 30 days, 90 days views
  
- **Performance Metrics**
  - Total logins tracked
  - Total tasks completed
  - Average tasks per day
  - Total rewards paid out
  
- **Visualizations**
  - Line chart: Activity trend over time
  - Bar chart: Daily performance
  - Pie chart: Activity distribution
  - Summary table with key metrics
  
- **Dynamic Stats**
  - Real-time calculations
  - Period-based filtering
  - Comparative metrics

### 3. **User Management** (`/f/users`)
- **User Statistics**
  - Total users count
  - Active/Inactive/Banned user counts
  
- **Search & Filter**
  - Search by name or email
  - Filter by status (All, Active, Inactive, Banned)
  
- **User Table**
  - User name and ID
  - Email address
  - Account balance
  - Tasks completed
  - Last login date
  - Account status
  
- **User Actions**
  - Ban users (for fraud/violations)
  - Reactivate banned users
  
- **Data Columns**
  - User details with sorting
  - Financial tracking
  - Activity history
  - Status management

### 4. **Settings Page** (`/f/settings`)
- **General Settings**
  - Platform name configuration
  - Base reward amount (₦)
  - Max tasks per day limit
  
- **Security & Performance**
  - API rate limiting
  - Maintenance mode toggle
  
- **Notifications**
  - Enable/disable task completion notifications
  
- **Dangerous Actions**
  - Clear all logs
  - Reset all user data
  - Ban inactive users
  
- **Settings Persistence**
  - Auto-save to localStorage
  - Settings confirmation/feedback

## Data Storage

### Current Implementation
- **Primary Storage**: localStorage (browser-based)
- **API Endpoint**: `/api/admin-logs` (POST/GET)

### Data Structure

#### Admin Logs
```json
{
  "id": "timestamp-random",
  "userId": "user-id",
  "eventType": "login|task_complete|admin_access",
  "taskId": "optional-task-id",
  "timestamp": "ISO-string",
  "date": "Date string",
  "ipAddress": "ip-or-unknown"
}
```

#### User Structure
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "name": "User Name",
  "balance": 50000,
  "tasksCompleted": 15,
  "lastLogin": "ISO-string",
  "status": "active|inactive|banned"
}
```

#### Daily Stats
```json
{
  "date": "Date string",
  "uniqueLogins": 25,
  "tasksCompleted": 150,
  "usersActive": ["user-1", "user-2"],
  "tasksList": [
    {
      "userId": "user-id",
      "taskId": "task-id",
      "taskName": "Task name",
      "reward": 5000,
      "completedAt": "ISO-string"
    }
  ]
}
```

## Key Routes

| Route | Purpose |
|-------|---------|
| `/f` | Main admin dashboard |
| `/f/analytics` | Analytics and metrics |
| `/f/users` | User management |
| `/f/settings` | System settings |
| `/api/admin-logs` | Log tracking API |

## Usage

### Accessing the Admin Dashboard
1. Navigate to `http://localhost:3000/f`
2. View current statistics and daily overview
3. Use date picker to view historical data
4. Export data for external analysis

### Tracking User Activity
The system automatically tracks:
- User logins
- Task completions
- Admin access
- Timestamp and date
- User identification

### Managing Users
1. Go to `/f/users`
2. Search or filter users
3. View activity and balance
4. Ban/unban users as needed

### Monitoring Performance
1. Go to `/f/analytics`
2. Select time period (7d, 30d, 90d)
3. Review charts and statistics
4. Export data if needed

### Configuring System
1. Go to `/f/settings`
2. Adjust platform settings
3. Toggle security features
4. Save changes

## Notes

### Task Completion Tracking
- Tracked via localStorage `tivexx-completed-tasks`
- Cooldowns stored in `tivexx-task-cooldowns`
- 12-hour reset intervals per task (0:00 and 12:00)

### User Login Tracking
- Logs stored in `admin-logs` localStorage
- Each login recorded with timestamp
- IP address captured (if available)

### Performance Considerations
- API logs limited to 10,000 entries
- Old logs automatically purged
- Analytics calculated on-demand
- Charts use Recharts library for rendering

## Future Enhancements

1. **Database Integration**
   - Replace localStorage with Supabase/MongoDB
   - Real-time data synchronization
   - Better data persistence

2. **Advanced Analytics**
   - User retention rates
   - Task completion patterns
   - Revenue analytics
   - Fraud detection

3. **Additional Features**
   - Mass user actions
   - Automated reports
   - Webhooks for events
   - Role-based permissions

4. **Security**
   - Admin password protection
   - Session timeouts
   - Audit trails
   - IP whitelisting

## Integration Notes

The admin dashboard integrates with:
- **Task System**: Reads from `tivexx-completed-tasks` and `tivexx-task-cooldowns`
- **User System**: Reads from `tivexx-user` localStorage
- **Supabase**: Available for future database migration
- **Charts**: Uses Recharts for data visualization

---

**Last Updated**: April 30, 2026
