# TASK PAGE - CURRENT SPECIFICATIONS
## Reference Document - DO NOT MODIFY

### Current Configuration

#### Time Reset System
- **Reset Interval**: 12 hours (NOT 24 hours)
- **Reset Times**: 12:00 AM (00:00) and 12:00 PM (12:00)
- **Reset Type**: Fixed daily windows, not rolling 12-hour cooldown
- **Implementation**: `getNextResetBoundary()` function

#### Time Display Format
- **Format**: 12-hour display (capped at 12 hours max)
- **Example**: "3h 45m 30s" instead of "15h 45m 30s"
- **Function**: `formatTime()` - converts milliseconds to display format

#### Yellow Warning Box
- **Location**: Under EVERY task card (not just ads)
- **Style**: Yellow/amber background `hh-task-warning` class
- **Content**: "⚠️ Interact with the task for up to 10 seconds before you can claim the reward."
- **Condition**: Shows for all tasks that have a link

#### Task Verification
- **Required Interaction Time**: 10 seconds minimum
- **Verification Method**: Focus listener on window
- **Failure Message**: Shows time spent if less than 10 seconds
- **Success Message**: "Task Completed 🎉"

#### Daily Reset Message
- **Text**: "Tasks reset at 12:00 AM and 12:00 PM every day. Check back after the next interval for more rewards!"
- **Location**: Bottom of task page in info card
- **Icon**: Sparkles

### Task Data Structure

```typescript
interface Task {
  id: string
  platform: string
  description: string
  category: string
  reward: number
  link: string
  icon: string
}
```

### Current Tasks (10 total)
1. Monetage Spin-to-Win Ad - ₦5,000
2. Bloggersin Promo - ₦5,000
3. EffectiveGate CPM Ad - ₦5,000
4. EffectiveGate Offer - ₦5,000
5. Spin-to-Win Hub - ₦5,000
6. Winners Hub Promo - ₦5,000
7. Quick Survey Task (Nova Cash) - ₦5,000
8. Sponsored ads 1 - ₦5,000
9. Sponsored ads 2 - ₦5,000
10. Sponsored ads 3 - ₦5,000

### State Management

- `completedTasks`: Array of completed task IDs for the day
- `cooldowns`: Object mapping task IDs to reset timestamp
- `verifyingTasks`: Object tracking verification progress
- `balance`: User's current balance
- `showCoinRain`: Coin rain animation trigger

### Local Storage Keys Used

- `tivexx-user`: User data object
- `tivexx-completed-tasks`: Array of completed task IDs
- `tivexx-task-cooldowns`: Object of task cooldown timestamps

### Key Functions

- `completeVerification()`: Handles task reward and sets cooldown
- `getNextResetBoundary()`: Calculates next 12-hour reset time
- `formatTime()`: Converts ms to display time
- `handleTaskClick()`: Initiates task
- `confirmStartTask()`: Starts timer and opens task link
- `startProgressAnimation()`: Shows progress bar (0-100%)

### Toast Messages

- Task Started: "Make sure to spend at least 10 seconds on the site before returning..."
- Task Completed: "Reward Credited 🎉"
- Task Already Completed: "You have already earned the reward for this task."
- Task on Cooldown: "This task resets at the next 12-hour interval."
- Didn't Interact Long Enough: "You only spent Xs outside. Please tap the task again..."

### UI Components Used

- Progress bar with verification animation
- Coin rain animation on successful completion
- Status badges (Claimed Today, Pending)
- Cooldown timer display
- Hero card with stats
- Bottom navigation
- Animated bubbles and mesh overlay

### Styling Classes

- `.hh-task-card`: Main task card container
- `.hh-task-warning`: Yellow warning box
- `.hh-task-btn`: Task button (state-based styling)
- `.hh-progress-fill`: Progress bar fill
- `.hh-cooldown`: Cooldown timer display
- `.hh-status-badge`: Status indicator

---

**These specifications must remain as-is. Any changes must be explicitly requested.**
**Last Updated**: April 30, 2026 (After implementing 12-hour resets and per-card warnings)
