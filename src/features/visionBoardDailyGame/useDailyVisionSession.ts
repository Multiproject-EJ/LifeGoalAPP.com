import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../../lib/supabaseClient';
import type { Database } from '../../lib/database.types';
import { LIFE_WHEEL_CATEGORIES } from '../checkins/LifeWheelCheckins';
import { evaluateBalance } from './scoring';
import { convertImageToWebp } from './imageWebp';
import { getSignedImageUrl, uploadDailyGameImage } from './storage';

type DailySessionRow = Database['public']['Tables']['vision_board_daily_sessions']['Row'];
type DailyItemRow = Database['public']['Tables']['vision_board_daily_items']['Row'];

type DailyGameItem = DailyItemRow & { signedUrl?: string | null };

type RevealPayload = {
  title: string;
  description?: string;
  file: File;
  suggestedArea?: string;
};

type UseDailyVisionSessionResult = {
  sessionDate: string;
  sessionRow: DailySessionRow | null;
  items: DailyGameItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  revealItem: (itemId: string, payload: RevealPayload) => Promise<void>;
  updateItemArea: (itemId: string, areaKey: string) => Promise<void>;
  reorderItem: (itemId: string, direction: 'up' | 'down') => Promise<void>;
  completeSession: () => Promise<void>;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function sortItems(items: DailyGameItem[]): DailyGameItem[] {
  return [...items].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
}

export function useDailyVisionSession(session: Session | null): UseDailyVisionSessionResult {
  const [sessionRow, setSessionRow] = useState<DailySessionRow | null>(null);
  const [items, setItems] = useState<DailyGameItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionDate] = useState(() => todayIsoDate());
  const [signedUrlCache, setSignedUrlCache] = useState<Record<string, string>>({});

  const supabase = useMemo(() => {
    try {
      return getSupabaseClient();
    } catch (error) {
      return null;
    }
  }, []);

  const ensureSignedUrls = useCallback(
    async (records: DailyGameItem[]) => {
      const updates: Record<string, string> = {};
      await Promise.all(
        records.map(async (item) => {
          if (item.image_storage_path && !signedUrlCache[item.image_storage_path]) {
            const signedUrl = await getSignedImageUrl(item.image_storage_path);
            if (signedUrl) {
              updates[item.image_storage_path] = signedUrl;
            }
          }
        }),
      );

      const nextCache = Object.keys(updates).length ? { ...signedUrlCache, ...updates } : signedUrlCache;
      if (Object.keys(updates).length) {
        setSignedUrlCache(nextCache);
      }
      return nextCache;
    },
    [signedUrlCache],
  );

  const loadSession = useCallback(async () => {
    if (!session) {
      setSessionRow(null);
      setItems([]);
      return;
    }

    if (!canUseSupabaseData()) {
      setError('Connect Supabase to play the Daily Vision Game.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: existingSession, error: sessionError } = await supabase!
        .from('vision_board_daily_sessions')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('session_date', sessionDate)
        .maybeSingle<DailySessionRow>();

      if (sessionError && sessionError.code !== 'PGRST116') {
        throw sessionError;
      }

      let sessionRecord = existingSession;

      if (!sessionRecord) {
        const { data: created, error: createError } = await supabase!
          .from('vision_board_daily_sessions')
          .insert({
            user_id: session.user.id,
            session_date: sessionDate,
            status: 'in_progress',
          })
          .select()
          .single<DailySessionRow>();

        if (createError) throw createError;
        sessionRecord = created;
      }

      const { data: fetchedItems, error: itemsError } = await supabase!
        .from('vision_board_daily_items')
        .select('*')
        .eq('session_id', sessionRecord.id)
        .order('order_index', { ascending: true })
        .returns<DailyItemRow[]>();

      if (itemsError) throw itemsError;

      let hydratedItems = fetchedItems as DailyGameItem[];

      if (!hydratedItems?.length) {
        const seedItems = Array.from({ length: 6 }).map((_, index) => ({
          session_id: sessionRecord!.id,
          user_id: session.user.id,
          suggested_area: LIFE_WHEEL_CATEGORIES[index % LIFE_WHEEL_CATEGORIES.length].key,
          order_index: index,
          status: 'hidden' as const,
        }));

        const { data: createdItems, error: seedError } = await supabase!
          .from('vision_board_daily_items')
          .insert(seedItems)
          .select()
          .returns<DailyItemRow[]>();

        if (seedError) throw seedError;
        hydratedItems = createdItems as DailyGameItem[];
      }

      const cache = await ensureSignedUrls(hydratedItems);

      setSessionRow(sessionRecord);
      setItems(
        sortItems(
          hydratedItems.map((item) => ({
            ...item,
            signedUrl: item.image_storage_path ? cache[item.image_storage_path] : null,
          })),
        ),
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load the daily game session.');
    } finally {
      setLoading(false);
    }
  }, [session, sessionDate, supabase, ensureSignedUrls]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const revealItem = useCallback(
    async (itemId: string, payload: RevealPayload) => {
      if (!session) return;
      if (!canUseSupabaseData()) {
        setError('Supabase is not configured.');
        return;
      }

      const target = items.find((item) => item.id === itemId);
      if (!target) return;

      try {
        const webp = await convertImageToWebp(payload.file, { maxSize: 1024, quality: 0.82 });
        const { path, error: uploadError } = await uploadDailyGameImage(session.user.id, webp, sessionDate);
        if (uploadError || !path) {
          throw uploadError || new Error('Unable to upload image');
        }

        const orderIndex = typeof target.order_index === 'number' ? target.order_index : items.length;

        const { data, error: updateError } = await supabase!
          .from('vision_board_daily_items')
          .update({
            title: payload.title.trim(),
            description: payload.description?.trim() || null,
            image_storage_path: path,
            status: 'revealed',
            suggested_area: payload.suggestedArea || target.suggested_area,
            order_index: orderIndex,
            updated_at: new Date().toISOString(),
          })
          .eq('id', itemId)
          .select()
          .single<DailyItemRow>();

        if (updateError) throw updateError;

        const signedUrl = await getSignedImageUrl(path);
        setSignedUrlCache((current) => (signedUrl ? { ...current, [path]: signedUrl } : current));

        setItems((current) => {
          const updatedItem: DailyGameItem = { ...data, signedUrl };
          const next = current.map((item) => (item.id === itemId ? updatedItem : item));
          return sortItems(next);
        });
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Unable to reveal this card.');
      }
    },
    [session, supabase, items, sessionDate],
  );

  const updateItemArea = useCallback(
    async (itemId: string, areaKey: string) => {
      if (!session) return;
      if (!canUseSupabaseData()) {
        setError('Supabase is not configured.');
        return;
      }

      const { data, error: updateError } = await supabase!
        .from('vision_board_daily_items')
        .update({ final_area: areaKey, updated_at: new Date().toISOString() })
        .eq('id', itemId)
        .select()
        .single<DailyItemRow>();

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setItems((current) => current.map((item) => (item.id === itemId ? { ...item, ...data } : item)));
    },
    [session, supabase],
  );

  const reorderItem = useCallback(
    async (itemId: string, direction: 'up' | 'down') => {
      if (!session) return;
      if (!canUseSupabaseData()) {
        setError('Supabase is not configured.');
        return;
      }

      const ordered = sortItems(items);
      const index = ordered.findIndex((item) => item.id === itemId);
      if (index === -1) return;

      const swapWith = direction === 'up' ? index - 1 : index + 1;
      if (swapWith < 0 || swapWith >= ordered.length) return;

      const updated = [...ordered];
      [updated[index], updated[swapWith]] = [updated[swapWith], updated[index]];

      const payload = updated.map((item, idx) => ({
        id: item.id,
        session_id: item.session_id,
        user_id: item.user_id,
        order_index: idx,
        updated_at: new Date().toISOString(),
      }));

      const { error: updateError } = await supabase!
        .from('vision_board_daily_items')
        .upsert(payload, { onConflict: 'id' });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setItems(updated.map((item, idx) => ({ ...item, order_index: idx })));
    },
    [session, supabase, items],
  );

  const completeSession = useCallback(async () => {
    if (!session || !sessionRow) return;
    if (!canUseSupabaseData()) {
      setError('Supabase is not configured.');
      return;
    }

    const insight = evaluateBalance(items);
    const revealed = items.filter((item) => item.status !== 'hidden');

    const { data, error: updateError } = await supabase!
      .from('vision_board_daily_sessions')
      .update({
        status: 'completed',
        balance_score: insight.balanceScore,
        insight_area: insight.insightArea,
        insight_text: insight.insightText,
        total_points: revealed.length * 5,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionRow.id)
      .select()
      .single<DailySessionRow>();

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSessionRow(data);

    const revealedIds = revealed.map((item) => item.id);
    if (revealedIds.length) {
      await supabase!
        .from('vision_board_daily_items')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .in('id', revealedIds);
      setItems((current) => current.map((item) => (revealedIds.includes(item.id) ? { ...item, status: 'completed' } : item)));
    }
  }, [session, sessionRow, supabase, items]);

  return {
    sessionDate,
    sessionRow,
    items,
    loading,
    error,
    refresh: loadSession,
    revealItem,
    updateItemArea,
    reorderItem,
    completeSession,
  };
}
