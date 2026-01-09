# Push Notifications Scaling Guide

## Overview
This guide explains how to scale push notifications from 0 to 5,000+ users in the LifeGoal App.

## Tier Recommendations

### Free Tier (0-100 users)
**Cost:** $0/month  
**Setup:** Current implementation works out of the box  
**Action:** Monitor Edge Function invocations in Supabase dashboard

**What's Included:**
- 500K Edge Function invocations/month
- 500MB database storage
- Up to 2 concurrent connections
- Community support

**Performance:**
- ~500 queries/minute during CRON runs
- ~50 notifications/minute
- Edge Function execution: <5 seconds
- ✅ **Works perfectly** on Free tier

**When to Upgrade:** You approach 100 active users or 500K invocations/month

---

### Pro Tier (100-1,000 users)
**Cost:** $25/month  
**Setup:** Upgrade Supabase to Pro + enable optimization indexes  
**Changes Needed:**
- Apply migration `0128_optimize_push_notifications.sql` (already created)
- Enable database indexes for performance
- Monitor performance metrics in Supabase dashboard
- Consider adding CRON monitoring

**What's Included:**
- 2M Edge Function invocations/month
- 8GB database storage
- Unlimited API requests
- Daily backups
- Email support

**Performance:**
- ~2,500 queries/minute during CRON runs
- ~250 notifications/minute
- Edge Function execution: ~15 seconds
- ✅ **Works well** on Pro tier

**Optimizations Applied:**
1. Database indexes speed up habit/reminder lookups by 50-70%
2. Optimized query filters users before loading subscriptions
3. Database function pre-filters users with active reminders

**When to Upgrade:** You approach 1,000 users or Edge Functions timeout

---

### Pro Tier Optimized (1,000-5,000 users)
**Cost:** $25-50/month  
**Setup:** Pro tier + usage overages + batch processing  
**Changes Needed:**
- Implement batch processing (see below)
- Add monitoring and alerting
- Consider caching strategies
- Optimize database queries further

**What's Included:**
- Same as Pro tier
- Additional charges for overages:
  - Edge Function: $2 per 1M invocations beyond 2M
  - Database: $0.125/GB beyond 8GB
  - Bandwidth: $0.09/GB

**Performance:**
- ~5,000 queries/minute during CRON runs
- ~500 notifications/minute
- Edge Function execution: ~30 seconds
- ⚠️ **Requires batch processing** to avoid timeouts

**Batch Processing Implementation:**

The CRON job should process users in batches to prevent timeouts:

```typescript
// Pseudo-code for batch processing
const BATCH_SIZE = 100;

// Track which batch we're on
const { data: batchState } = await supabase
  .from('reminder_batch_state')
  .select('last_processed_user_id, reset_at')
  .single();

// Reset batch if we've completed a full cycle (e.g., every hour)
const shouldReset = !batchState || 
  (new Date() - new Date(batchState.reset_at)) > 60 * 60 * 1000;

const lastUserId = shouldReset ? 
  '00000000-0000-0000-0000-000000000000' : 
  batchState.last_processed_user_id;

// Get next batch of users
const { data: eligibleUsers } = await supabase
  .rpc('get_users_with_active_reminders')
  .gt('user_id', lastUserId)
  .order('user_id')
  .limit(BATCH_SIZE);

// Process this batch...
// (existing reminder logic)

// Update batch state
await supabase
  .from('reminder_batch_state')
  .upsert({
    last_processed_user_id: eligibleUsers[eligibleUsers.length - 1],
    reset_at: shouldReset ? new Date().toISOString() : batchState.reset_at
  });
```

**Benefits:**
- Prevents Edge Function timeouts (60s limit)
- Distributes database load across multiple minutes
- All users still get reminders within a reasonable window

**When to Upgrade:** Edge Functions consistently timeout or you need event-driven architecture

---

### Architectural Change Required (5,000+ users)
**Cost:** $100-500/month  
**Setup:** Event-driven architecture with job queue  
**Changes Needed:**
- Migrate to job queue system (BullMQ, AWS EventBridge, Inngest)
- Implement per-user job scheduling
- Consider Team or Enterprise tier
- Add dedicated monitoring and alerting

**Why the Change:**
- CRON-based approach becomes inefficient at scale
- Need for per-user scheduling (different timezones, preferences)
- Better error handling and retry mechanisms
- Improved observability and debugging

**Recommended Architecture:**

```
User creates habit with reminder
         ↓
Schedule individual job for that user+habit
         ↓
Job queue triggers at specific time
         ↓
Worker processes single reminder
         ↓
Update reminder state
```

**Technology Options:**

1. **BullMQ + Redis** ($10-50/month for Redis)
   - Most flexible
   - Great for complex scheduling
   - Requires Redis hosting

2. **AWS EventBridge** ($0-20/month)
   - Serverless
   - Integrates with AWS Lambda
   - Good for event-driven workflows

3. **Inngest** ($20-100/month)
   - Built for background jobs
   - Easy to set up
   - Good observability

4. **Temporal** (Self-hosted or $30+/month)
   - Most robust
   - Best for complex workflows
   - Steeper learning curve

**When to Consider:** You have 5,000+ active users and/or significant revenue

---

## Performance Benchmarks

| Users | Queries/min | Notifications/min | Edge Function Time | Recommended Tier |
|-------|-------------|-------------------|-------------------|------------------|
| 100   | ~500       | ~50               | <5s               | ✅ Free          |
| 500   | ~2,500     | ~250              | ~15s              | ✅ Free/Pro      |
| 1,000 | ~5,000     | ~500              | ~30s              | ✅ Pro           |
| 2,500 | ~12,500    | ~1,250            | ~60s              | ⚠️ Pro + batch   |
| 5,000 | ~25,000    | ~2,500            | Timeout           | ⚠️ Pro + batch   |
| 10,000| ~50,000    | ~5,000            | Timeout           | ❌ Need rewrite  |

**Notes:**
- Assumes 50% of users have active habits with reminders
- Assumes average 2 habits per user with reminders
- Assumes 10% of users are in reminder window at any given minute
- Edge Function timeout is 60 seconds on all tiers

---

## When to Upgrade

### Upgrade to Pro when:
- [ ] You have 100+ active users
- [ ] Edge Function invocations exceed 500K/month
- [ ] You want daily backups and email support
- [ ] You need better performance and reliability

### Implement batch processing when:
- [ ] You have 1,000+ users
- [ ] CRON jobs take >30 seconds
- [ ] Edge Functions occasionally timeout
- [ ] Database queries are slow (>500ms)

### Consider architecture rewrite when:
- [ ] You have 5,000+ users
- [ ] CRON jobs consistently timeout despite batching
- [ ] You need per-user scheduling precision
- [ ] You have revenue to support infrastructure costs ($100+/month)
- [ ] You need advanced features (retry logic, priority queues, etc.)

---

## Monitoring Checklist

Use these metrics to decide when to upgrade:

- [ ] **Edge Function execution time** - Track in Supabase logs
  - Alert if >40s (approaching timeout)
- [ ] **Database query performance** - Track slow queries
  - Alert if queries take >1s
- [ ] **Push notification delivery rate** - Track success/failure ratio
  - Alert if failure rate >5%
- [ ] **User count** - Track active users with reminders
  - Alert at 80, 800, and 4,000 users
- [ ] **Edge Function invocations** - Track monthly usage
  - Alert at 400K (80% of free tier)

**How to Monitor:**

1. **Supabase Dashboard:**
   - Go to Edge Functions → send-reminders
   - View invocation logs and execution times
   - Check for errors and timeouts

2. **Custom Logging:**
   - Add console.log statements in Edge Function
   - Track metrics in reminder_logs table
   - Query for slow queries and failures

3. **Third-party Monitoring:**
   - Consider Sentry for error tracking
   - Consider Datadog/New Relic for APM
   - Set up alerts in Supabase (Pro tier)

---

## Cost Estimates

### Monthly Costs by User Count

| User Count | Tier | Base Cost | Overages | Total | Notes |
|------------|------|-----------|----------|-------|-------|
| 0-100 | Free | $0 | $0 | **$0** | Included in free tier |
| 100-500 | Pro | $25 | $0-5 | **$25-30** | Minimal overages |
| 500-1,000 | Pro | $25 | $5-10 | **$30-35** | Some overages |
| 1,000-2,500 | Pro + Batch | $25 | $10-20 | **$35-45** | Moderate overages |
| 2,500-5,000 | Pro + Batch | $25 | $20-25 | **$45-50** | Higher overages |
| 5,000-10,000 | Rewrite | $25-100 | $50-100 | **$75-200** | Depends on architecture |
| 10,000+ | Rewrite | $100+ | $100+ | **$200-500+** | Event-driven required |

**Cost Breakdown:**
- **Supabase Pro:** $25/month base
- **Edge Function overages:** $2 per 1M invocations beyond 2M
- **Database overages:** $0.125/GB beyond 8GB
- **Job Queue (if needed):** $10-100/month depending on provider
- **Monitoring tools (if needed):** $0-50/month

---

## Migration Path

When you need to scale beyond current capacity:

### Phase 1: Enable Optimizations (0-1,000 users)
1. Apply migration `0128_optimize_push_notifications.sql`
2. Monitor Edge Function performance
3. Track query execution times
4. **Timeline:** 1 hour to apply, immediate benefits

### Phase 2: Implement Batch Processing (1,000-5,000 users)
1. Create `reminder_batch_state` table
2. Modify CRON handler to process in batches
3. Test with small batch size (50 users)
4. Gradually increase to optimal size (100-200 users)
5. **Timeline:** 1-2 days of development, 1 week of testing

### Phase 3: Event-Driven Architecture (5,000+ users)
1. Choose job queue technology (BullMQ, EventBridge, etc.)
2. Set up infrastructure (Redis, Lambda, etc.)
3. Implement job scheduling for new reminders
4. Migrate existing reminders in phases:
   - Week 1: 10% of users
   - Week 2: 30% of users
   - Week 3: 60% of users
   - Week 4: 100% of users
5. Deprecate old CRON system
6. **Timeline:** 2-4 weeks of development, 4+ weeks of migration

---

## Future Migration Path Details

When you reach 5,000+ users and need to migrate to event-driven architecture:

### Option 1: Dual System Approach (Recommended)
Run both systems in parallel during migration:

```
Old CRON (declining %) ← → New Event System (increasing %)
```

**Advantages:**
- Low risk (can rollback anytime)
- Gradual migration allows testing
- Users experience no downtime

**Timeline:**
- Week 1-2: Set up new system, migrate 10% of users
- Week 3-4: Monitor and debug, migrate to 30%
- Week 5-6: Increase to 60%
- Week 7-8: Migrate remaining 40%
- Week 9: Deprecate old CRON system

### Option 2: Big Bang Migration
Switch all users at once:

**Advantages:**
- Faster migration
- No dual system maintenance

**Disadvantages:**
- Higher risk
- Harder to debug issues
- Potential downtime

**Not Recommended** unless you have:
- Comprehensive test coverage
- Staging environment
- Rollback plan
- Small user base (<1,000)

---

## Frequently Asked Questions

### Q: Should I upgrade to Pro now even with <100 users?
**A:** Only if you want daily backups, email support, or are approaching free tier limits. The free tier works great for early stage.

### Q: Can I stay on free tier with 200 users?
**A:** Technically yes, but you'll likely exceed 500K Edge Function invocations/month. Monitor your usage closely.

### Q: When should I implement batch processing?
**A:** When CRON jobs consistently take >30 seconds or you have 1,000+ users. Don't implement too early—it adds complexity.

### Q: Do I need to rewrite everything at 5,000 users?
**A:** Not immediately. Batch processing can handle 5,000-10,000 users. But event-driven architecture is the right long-term solution for better reliability and features.

### Q: What if my CRON job times out?
**A:** First, check if you've applied the optimization migration. If yes, implement batch processing. If that's not enough, consider architectural changes.

### Q: Can I use Supabase's built-in CRON (pg_cron)?
**A:** Yes, but it has the same limitations. You'd still need batch processing at scale. Edge Functions with HTTP CRON are easier to debug and monitor.

---

## Related Documentation

- [Push Notifications Setup Guide](./WEB_PUSH_REMINDERS.md) - Initial setup instructions
- [Reminder Analytics](./REMINDER_ANALYTICS.md) - Track notification metrics
- [Daily Reminder Scheduling](./DAILY_REMINDER_SCHEDULING.md) - How reminders are scheduled

---

## Need Help?

- **Free tier users:** Community support in Supabase Discord
- **Pro tier users:** Email support from Supabase
- **Enterprise needs:** Contact Supabase sales team

For LifeGoal App-specific questions, check the GitHub issues or discussions.
