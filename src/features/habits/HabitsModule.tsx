import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';

type HabitsModuleProps = {
  session: Session;
};

export function HabitsModule({ session }: HabitsModuleProps) {
  const [showInstructions, setShowInstructions] = useState(true);

  return (
    <div className="habits-module-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        color: 'white',
        padding: '3rem 2rem',
        borderRadius: '16px',
        marginBottom: '2rem',
        boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
      }}>
        <h1 style={{ margin: '0 0 1rem 0', fontSize: '2.5rem', fontWeight: '800' }}>
          🎯 Comprehensive Habits System
        </h1>
        <p style={{ margin: 0, fontSize: '1.125rem', opacity: 0.95 }}>
          A complete habit tracking module with templates, challenges, auto-progression, and more!
        </p>
      </div>

      {showInstructions && (
        <div style={{
          background: '#f8fafc',
          border: '2px solid #e2e8f0',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>✨ Setup Instructions</h2>
            <button
              onClick={() => setShowInstructions(false)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                opacity: 0.6
              }}
            >
              ×
            </button>
          </div>

          <div style={{ fontSize: '1rem', lineHeight: '1.75' }}>
            <p><strong>🚀 The comprehensive habits module has been created!</strong></p>
            
            <p>All the code and SQL migrations are ready in your repository:</p>
            
            <ul style={{ marginLeft: '1.5rem' }}>
              <li><code>/supabase/migrations/</code> - Database schema (0001-0003)</li>
              <li><code>/supabase/functions/</code> - Edge Functions for reminders & auto-progression</li>
              <li><code>/app/habits/</code> - Complete vanilla JS/HTML/CSS implementation</li>
            </ul>

            <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>📋 Next Steps:</h3>
            
            <ol style={{ marginLeft: '1.5rem' }}>
              <li>
                <strong>Run SQL Migrations:</strong> Open Supabase SQL Editor and run:
                <ul style={{ marginLeft: '1rem', marginTop: '0.5rem' }}>
                  <li><code>supabase/migrations/0001_habits_core.sql</code></li>
                  <li><code>supabase/migrations/0002_push.sql</code></li>
                  <li><code>supabase/migrations/0003_challenges_autoprog.sql</code></li>
                </ul>
              </li>
              
              <li style={{ marginTop: '1rem' }}>
                <strong>Generate VAPID Keys:</strong>
                <pre style={{ 
                  background: '#1e293b', 
                  color: '#e2e8f0', 
                  padding: '0.75rem', 
                  borderRadius: '6px',
                  overflow: 'auto',
                  marginTop: '0.5rem'
                }}>npx web-push generate-vapid-keys</pre>
              </li>
              
              <li style={{ marginTop: '1rem' }}>
                <strong>Set Environment Variables:</strong>
                <ul style={{ marginLeft: '1rem', marginTop: '0.5rem' }}>
                  <li><code>VITE_VAPID_PUBLIC_KEY=your-public-key</code></li>
                  <li>Add to Supabase Edge Functions secrets: <code>VAPID_PRIVATE_KEY</code></li>
                </ul>
              </li>
              
              <li style={{ marginTop: '1rem' }}>
                <strong>Deploy Edge Functions:</strong>
                <pre style={{ 
                  background: '#1e293b', 
                  color: '#e2e8f0', 
                  padding: '0.75rem', 
                  borderRadius: '6px',
                  overflow: 'auto',
                  marginTop: '0.5rem'
                }}>supabase functions deploy send-reminders{'\n'}supabase functions deploy auto-progression</pre>
              </li>
              
              <li style={{ marginTop: '1rem' }}>
                <strong>Load Demo Data (Optional):</strong>
                <br />
                Run <code>supabase/migrations/demo_data.sql</code> after replacing <code>YOUR_USER_ID_HERE</code> with your user ID
              </li>
            </ol>

            <div style={{
              background: '#eff6ff',
              border: '1px solid #93c5fd',
              borderRadius: '8px',
              padding: '1rem',
              marginTop: '1.5rem'
            }}>
              <strong>📚 Documentation:</strong> See <code>/app/habits/README.md</code> for detailed setup instructions,
              SQL patch guide, and architecture notes.
            </div>
          </div>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <FeatureCard 
          emoji="🧙"
          title="3-Step Wizard"
          description="Create habits with an intuitive wizard: Basics → Schedule → Targets & Reminders"
        />
        <FeatureCard 
          emoji="📋"
          title="12 Templates"
          description="Pre-filled templates for common habits: meditation, hydration, reading, and more"
        />
        <FeatureCard 
          emoji="✅"
          title="Smart Tracking"
          description="Boolean (done/not done), Quantity (with stepper), and Duration (with timer) types"
        />
        <FeatureCard 
          emoji="🔥"
          title="Streaks & Insights"
          description="31-day heatmap, success rates (7/30/90 days), current & best streaks"
        />
        <FeatureCard 
          emoji="🔔"
          title="Web Push Reminders"
          description="Smart notifications with quick Done/Skip action buttons"
        />
        <FeatureCard 
          emoji="🏆"
          title="Challenges"
          description="Create challenges, invite friends, compete on leaderboards"
        />
        <FeatureCard 
          emoji="📈"
          title="Auto-Progression"
          description="Automatically increase difficulty when you hit success rate targets"
        />
        <FeatureCard 
          emoji="💾"
          title="Offline Support"
          description="Queue habit logs when offline, auto-sync when back online"
        />
      </div>

      <div style={{
        background: '#fef2f2',
        border: '2px solid #fecaca',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#991b1b' }}>⚠️ Implementation Status</h3>
        <p style={{ margin: 0, lineHeight: '1.75' }}>
          The habits module is built as a standalone vanilla JavaScript system in <code>/app/habits/</code>.
          To fully integrate it into this React app, you have two options:
        </p>
        <ul style={{ marginLeft: '1.5rem', marginTop: '1rem' }}>
          <li>
            <strong>Option 1:</strong> Create a separate route (e.g., <code>/habits</code>) that serves the vanilla JS version
          </li>
          <li>
            <strong>Option 2:</strong> Port the components to React (recommended for long-term maintenance)
          </li>
        </ul>
      </div>

      <div style={{
        background: 'white',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        padding: '2rem'
      }}>
        <h2 style={{ marginTop: 0 }}>📦 What's Included</h2>
        
        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '0.75rem' }}>SQL Migrations</h3>
          <ul style={{ marginLeft: '1.5rem', lineHeight: '1.75' }}>
            <li><code>habits_v2</code> table with emoji, type (boolean/quantity/duration), schedule JSON, auto-progression config</li>
            <li><code>habit_logs_v2</code> with value field for quantity/duration tracking</li>
            <li><code>habit_reminders</code> with time, days, and geo fields</li>
            <li><code>push_subscriptions</code> for Web Push endpoints</li>
            <li><code>habit_challenges</code> and <code>habit_challenge_members</code> for social features</li>
            <li><code>v_habit_streaks</code> view for calculating current and best streaks</li>
            <li><code>v_challenge_scores</code> view for leaderboards</li>
          </ul>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '0.75rem' }}>Edge Functions</h3>
          <ul style={{ marginLeft: '1.5rem', lineHeight: '1.75' }}>
            <li><strong>send-reminders:</strong> Handles Web Push subscriptions, sends notifications, logs habit completions from notification actions</li>
            <li><strong>auto-progression:</strong> Daily cron job to analyze success rates and adjust habit schedules automatically</li>
          </ul>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '0.75rem' }}>Frontend Files</h3>
          <ul style={{ marginLeft: '1.5rem', lineHeight: '1.75' }}>
            <li><code>habits.js</code> - Main logic with wizard, active habits, insights, challenges</li>
            <li><code>habits.css</code> - Modern, mobile-first styles</li>
            <li><code>templates.json</code> - 12 curated habit templates</li>
            <li><code>buildplan.json</code> - Implementation checklist</li>
            <li><code>BuildChecklist.js</code> - On-page progress tracker</li>
            <li><code>README.md</code> - Complete documentation</li>
          </ul>
        </div>
      </div>

      <div style={{
        marginTop: '2rem',
        padding: '1.5rem',
        background: '#f0fdf4',
        border: '2px solid #86efac',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <p style={{ margin: 0, fontSize: '1.125rem' }}>
          <strong>✅ All code has been generated and committed to the repository!</strong>
        </p>
        <p style={{ margin: '0.5rem 0 0 0', color: '#15803d' }}>
          Follow the setup steps above to enable the full habits experience.
        </p>
      </div>
    </div>
  );
}

function FeatureCard({ emoji, title, description }: { emoji: string; title: string; description: string }) {
  return (
    <div style={{
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '1.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      transition: 'all 0.2s ease'
    }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{emoji}</div>
      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem' }}>{title}</h3>
      <p style={{ margin: 0, color: '#64748b', fontSize: '0.9375rem', lineHeight: '1.6' }}>
        {description}
      </p>
    </div>
  );
}
