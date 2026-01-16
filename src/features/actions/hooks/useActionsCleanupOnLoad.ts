import { useEffect, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Action } from '../../../types/actions';
import { runActionsCleanup, runDoneArchiveCleanup } from '../../../services/actionsCleanup';
import { runActionsMigration } from '../../../services/actionsMigration';
import { isDemoSession } from '../../../services/demoSession';

const CLEANUP_STORAGE_KEY = 'lifegoal_actions_last_cleanup';
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const ARCHIVE_STORAGE_KEY = 'lifegoal_actions_last_archive_cleanup';
const ARCHIVE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CleanupResult {
  deletedCount: number;
  migratedCount: number;
  archivedCount: number;
  ranCleanup: boolean;
}

/**
 * Hook that runs actions cleanup when the user opens the Actions tab
 * Acts as a safety net/backup to Edge Functions
 * Only runs once per 24 hours to avoid unnecessary operations
 */
export function useActionsCleanupOnLoad(
  session: Session | null,
  options: {
    onCleanupComplete?: (result: CleanupResult) => void;
    forceCleanup?: boolean; // For testing - skip the 24h check
  } = {}
): { isCleaningUp: boolean; lastCleanup: Date | null } {
  const { onCleanupComplete, forceCleanup = false } = options;
  const isCleaningUpRef = useRef(false);
  const hasRunRef = useRef(false);

  useEffect(() => {
    // Only run once per component mount
    if (hasRunRef.current) return;
    
    // Need a session to cleanup
    if (!session) return;

    const runCleanupIfNeeded = async () => {
      // Prevent concurrent runs
      if (isCleaningUpRef.current) return;

      try {
        const now = Date.now();
        const lastCleanupStr = localStorage.getItem(CLEANUP_STORAGE_KEY);
        const lastCleanup = lastCleanupStr ? parseInt(lastCleanupStr, 10) : 0;
        const timeSinceLastCleanup = now - lastCleanup;

        // Check if cleanup is needed (24+ hours since last run)
        const needsCleanup = forceCleanup || timeSinceLastCleanup > CLEANUP_INTERVAL_MS;

        const lastArchiveStr = localStorage.getItem(ARCHIVE_STORAGE_KEY);
        const lastArchive = lastArchiveStr ? parseInt(lastArchiveStr, 10) : 0;
        const timeSinceLastArchive = now - lastArchive;
        const needsArchive = forceCleanup || timeSinceLastArchive > ARCHIVE_INTERVAL_MS;

        if (!needsCleanup && !needsArchive) {
          // Already ran cleanup recently, skip
          return;
        }

        isCleaningUpRef.current = true;
        hasRunRef.current = true;

        // For demo mode, still run cleanup (it uses demo data)
        const isDemo = isDemoSession(session);

        console.log(`🧹 Running actions cleanup (${isDemo ? 'demo mode' : 'live'})...`);

        let deletedCount = 0;
        let actionsToMigrate: Action[] = [];
        let archivedCount = 0;
        let cleanupError: Error | null = null;

        // Step 1: Delete expired NICE TO DO actions
        if (needsCleanup) {
          const cleanupResult = await runActionsCleanup();
          deletedCount = cleanupResult.deletedCount;
          actionsToMigrate = cleanupResult.actionsToMigrate;
          cleanupError = cleanupResult.error;
        }

        if (cleanupError) {
          console.error('Cleanup error:', cleanupError);
          // Note: cleanupError means deletion failed, but we still have the list of actions to migrate
          // We'll proceed with migration since it's independent of the deletion operation
        } else if (deletedCount > 0) {
          console.log(`🗑️ Deleted ${deletedCount} expired NICE TO DO action(s)`);
        }

        // Step 2: Migrate expired PROJECT actions to full projects
        // This runs even if cleanup had errors, as the operations are independent
        let migratedCount = 0;
        if (needsCleanup && actionsToMigrate && actionsToMigrate.length > 0) {
          const { successCount, failureCount } = await runActionsMigration();
          migratedCount = successCount;

          if (successCount > 0) {
            console.log(`📦 Migrated ${successCount} PROJECT action(s) to Projects`);
          }
          if (failureCount > 0) {
            console.warn(`⚠️ Failed to migrate ${failureCount} action(s)`);
          }
        }

        if (needsArchive) {
          const { archivedCount: archived, error: archiveError } = await runDoneArchiveCleanup();
          if (archiveError) {
            console.error('Archive cleanup error:', archiveError);
          } else if (archived > 0) {
            console.log(`🔥 Archived ${archived} completed action(s)`);
          }
          archivedCount = archived;
          localStorage.setItem(ARCHIVE_STORAGE_KEY, now.toString());
        }

        if (needsCleanup) {
          // Update last cleanup timestamp (even if there were partial errors)
          // This prevents retry loops for transient errors
          localStorage.setItem(CLEANUP_STORAGE_KEY, now.toString());
        }

        // Notify caller of results (includes actual counts, even if there were errors)
        onCleanupComplete?.({
          deletedCount,
          migratedCount,
          archivedCount,
          ranCleanup: true,
        });

      } catch (error) {
        console.error('Actions cleanup failed:', error);
      } finally {
        isCleaningUpRef.current = false;
      }
    };

    // Run cleanup after a short delay to not block initial render
    const timeoutId = setTimeout(runCleanupIfNeeded, 500);

    return () => clearTimeout(timeoutId);
  }, [session, forceCleanup, onCleanupComplete]);

  // Get last cleanup date for display purposes
  const getLastCleanup = (): Date | null => {
    const lastCleanupStr = localStorage.getItem(CLEANUP_STORAGE_KEY);
    if (!lastCleanupStr) return null;
    const timestamp = parseInt(lastCleanupStr, 10);
    return isNaN(timestamp) ? null : new Date(timestamp);
  };

  return {
    isCleaningUp: isCleaningUpRef.current,
    lastCleanup: getLastCleanup(),
  };
}

/**
 * Utility to manually trigger cleanup (e.g., from a settings page)
 */
export async function manualActionsCleanup(): Promise<CleanupResult> {
  console.log('🧹 Manual actions cleanup triggered...');

  const { deletedCount, error: cleanupError } = await runActionsCleanup();

  if (cleanupError) {
    console.error('Cleanup error:', cleanupError);
    // Return actual counts even if there was an error
    // The deletion might have partially succeeded
    return {
      deletedCount,
      migratedCount: 0,
      archivedCount: 0,
      ranCleanup: false,
    };
  }

  const { successCount: migratedCount } = await runActionsMigration();
  const { archivedCount } = await runDoneArchiveCleanup();

  // Update timestamp
  localStorage.setItem(CLEANUP_STORAGE_KEY, Date.now().toString());
  localStorage.setItem(ARCHIVE_STORAGE_KEY, Date.now().toString());

  console.log(`✅ Cleanup complete: ${deletedCount} deleted, ${migratedCount} migrated, ${archivedCount} archived`);

  return {
    deletedCount,
    migratedCount,
    archivedCount,
    ranCleanup: true,
  };
}

/**
 * Clear the cleanup timestamp (for testing)
 */
export function resetCleanupTimestamp(): void {
  localStorage.removeItem(CLEANUP_STORAGE_KEY);
}
