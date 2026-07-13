import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import {
  clearQueuedVisionImageMutations,
  deleteVisionImage,
  fetchVisionImages,
  getVisionImageQueueStatus,
  getVisionImagePublicUrl,
  retryFailedVisionImageMutations,
  syncQueuedVisionImageMutations,
  updateVisionImage,
} from '../../services/visionBoard';
import { fetchVisionImageTags } from '../../services/visionBoardTags';
import { VisionBoardDailyGame } from '../visionBoardDailyGame/VisionBoardDailyGame';
import type { Database } from '../../lib/database.types';
import { isDemoSession } from '../../services/demoSession';
import { HaircutWidget } from './HaircutWidget';
import { VisionCard } from './VisionCard';
import { VisionUploadForm } from './VisionUploadForm';
import { StoryPlayer } from '../story/StoryPlayer';
import type { StoryPanel } from '../story/storyTypes';
import { VisionLightbox } from './VisionLightbox';
import { VisionTagModal } from './VisionTagModal';
import { FOUR_VISIONARIES, type FourVisionaryCategoryKey } from './categories';
import { DEFAULT_VISION_TYPE } from './visionTypes';
import { useModalA11y } from './useModalA11y';
import { fetchGoals } from '../../services/goals';
import { listHabitsV2 } from '../../services/habitsV2';
import { getDemoHabitsForUser } from '../../services/demoData';
import { useGamification } from '../../hooks/useGamification';
import { XP_REWARDS } from '../../types/gamification';
import { LIFE_WHEEL_CATEGORIES, type LifeWheelCategoryKey } from '../checkins/LifeWheelCheckins';
import type { TimerLaunchContext } from '../timer/timerSession';

type VisionImageRow = Database['public']['Tables']['vision_images']['Row'];
type GoalRow = Database['public']['Tables']['goals']['Row'];
type HabitRow = Database['public']['Tables']['habits_v2']['Row'];

type VisionBoardProps = {
  session: Session;
  onNavigateToTimer?: (context?: TimerLaunchContext) => void;
};

type SortMode = 'newest' | 'oldest' | 'caption';

type GridLayout = '2-column' | '3-column' | 'masonry';

type VisionImage = VisionImageRow & { publicUrl: string };

type BoardView = 'all' | 'life_wheel' | 'visionaries';

type LifeWheelFilter = 'all' | 'untagged' | LifeWheelCategoryKey;

type VisionaryFilter = 'all' | 'untagged' | FourVisionaryCategoryKey;

type PendingDeleteItem = {
  record: VisionImage;
  lifeWheel: LifeWheelCategoryKey[];
  visionary: FourVisionaryCategoryKey[];
};

const BOARD_VIEW_OPTIONS: { value: BoardView; label: string }[] = [
  { value: 'all', label: 'All photos' },
  { value: 'life_wheel', label: 'Life wheel categories' },
  { value: 'visionaries', label: 'The Four Visionaries' },
];


export function VisionBoard({ session, onNavigateToTimer }: VisionBoardProps) {
  const { isConfigured } = useSupabaseAuth();
  const isDemoExperience = isDemoSession(session);
  const { earnXP, recordActivity } = useGamification(session);
  const [images, setImages] = useState<VisionImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [gridLayout, setGridLayout] = useState<GridLayout>('masonry');
  const [boardView, setBoardView] = useState<BoardView>('all');
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [showDailyGame, setShowDailyGame] = useState(false);
  const [showStory, setShowStory] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteItem[] | null>(null);
  const pendingDeleteRef = useRef<{ items: PendingDeleteItem[]; timeoutId: number } | null>(null);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [habits, setHabits] = useState<HabitRow[]>([]);
  const [linkDataLoading, setLinkDataLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lifeWheelFilter, setLifeWheelFilter] = useState<LifeWheelFilter>('all');
  const [visionaryFilter, setVisionaryFilter] = useState<VisionaryFilter>('all');
  const [lifeWheelTags, setLifeWheelTags] = useState<Record<string, LifeWheelCategoryKey[]>>({});
  const [visionaryTags, setVisionaryTags] = useState<Record<string, FourVisionaryCategoryKey[]>>({});
  const [taggingImage, setTaggingImage] = useState<VisionImage | null>(null);
  const [queuePending, setQueuePending] = useState(0);
  const [queueFailed, setQueueFailed] = useState(0);
  const lifeWheelAvailable = LIFE_WHEEL_CATEGORIES.length > 0;
  const visionariesAvailable = FOUR_VISIONARIES.length > 0;
  const lifeWheelLabelLookup = useMemo(
    () => new Map(LIFE_WHEEL_CATEGORIES.map((category) => [category.key, category.label])),
    [LIFE_WHEEL_CATEGORIES],
  );
  const visionaryLabelLookup = useMemo(
    () => new Map(FOUR_VISIONARIES.map((category) => [category.key, category.label])),
    [FOUR_VISIONARIES],
  );

  const loadImages = useCallback(async () => {
    if (!isConfigured && !isDemoExperience) {
      setImages([]);
      setHasLoadedOnce(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const { data, error } = await fetchVisionImages(session.user.id);
      if (error) throw error;

      const mapped = (data ?? []).map((record) => ({
        ...record,
        vision_type: record.vision_type ?? DEFAULT_VISION_TYPE,
        linked_goal_ids: record.linked_goal_ids ?? [],
        linked_habit_ids: record.linked_habit_ids ?? [],
        publicUrl: getVisionImagePublicUrl(record),
      }));
      setImages(mapped);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load your vision board.');
    } finally {
      setHasLoadedOnce(true);
      setLoading(false);
    }
  }, [isConfigured, isDemoExperience, session.user.id]);

  useEffect(() => {
    if (!session || (!isConfigured && !isDemoExperience)) {
      return;
    }
    loadImages();
  }, [session?.user?.id, isConfigured, isDemoExperience, loadImages]);

  useEffect(() => {
    if (!session || (!isConfigured && !isDemoExperience)) {
      setQueuePending(0);
      setQueueFailed(0);
      return;
    }
    let cancelled = false;
    const userId = session.user.id;
    const refreshQueueStatus = async () => {
      const status = await getVisionImageQueueStatus(userId);
      if (!cancelled) {
        setQueuePending(status.pending);
        setQueueFailed(status.failed);
      }
    };
    void refreshQueueStatus();
    const intervalId = window.setInterval(() => {
      void refreshQueueStatus();
    }, 10000);
    const handleOnline = () => {
      void syncQueuedVisionImageMutations(userId)
        .then(() => loadImages())
        .finally(() => {
          void refreshQueueStatus();
        });
    };
    window.addEventListener('online', handleOnline);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
    };
  }, [session, isConfigured, isDemoExperience, loadImages]);

  useEffect(() => {
    if (!session || queuePending + queueFailed <= 0) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [session, queuePending, queueFailed]);

  const loadImageTags = useCallback(async () => {
    if (!session || (!isConfigured && !isDemoExperience)) {
      setLifeWheelTags({});
      setVisionaryTags({});
      return;
    }

    if (images.length === 0) {
      setLifeWheelTags({});
      setVisionaryTags({});
      return;
    }

    try {
      const { data, error } = await fetchVisionImageTags(
        session.user.id,
        images.map((image) => image.id),
      );
      if (error) throw error;

      const nextLifeWheelTags: Record<string, LifeWheelCategoryKey[]> = {};
      const nextVisionaryTags: Record<string, FourVisionaryCategoryKey[]> = {};
      (data ?? []).forEach((tag) => {
        const tagGroup = tag.category_group ?? 'life_wheel';
        if (tagGroup === 'four_visionaries') {
          if (!visionaryLabelLookup.has(tag.category_key as FourVisionaryCategoryKey)) return;
          const existing = nextVisionaryTags[tag.image_id] ?? [];
          nextVisionaryTags[tag.image_id] = [
            ...existing,
            tag.category_key as FourVisionaryCategoryKey,
          ];
          return;
        }
        if (!lifeWheelLabelLookup.has(tag.category_key as LifeWheelCategoryKey)) return;
        const existing = nextLifeWheelTags[tag.image_id] ?? [];
        nextLifeWheelTags[tag.image_id] = [...existing, tag.category_key as LifeWheelCategoryKey];
      });
      setLifeWheelTags(nextLifeWheelTags);
      setVisionaryTags(nextVisionaryTags);
    } catch (error) {
      // Provide more context if this is a table-related error
      const errorMessage = error instanceof Error ? error.message : String(error);
      const lowerErrorMessage = errorMessage.toLowerCase();
      const isTableMissing =
        lowerErrorMessage.includes('relation') && lowerErrorMessage.includes('does not exist');
      if (isTableMissing) {
        setErrorMessage(
          'Vision board tags table not found. Please run migrations 0120_vision_board_image_tags.sql and 0121_vision_board_image_tags_group.sql in your Supabase project.',
        );
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load vision board tags.');
      }
    }
  }, [session, isConfigured, isDemoExperience, images, lifeWheelLabelLookup, visionaryLabelLookup]);

  useEffect(() => {
    void loadImageTags();
  }, [loadImageTags]);

  useEffect(() => {
    if (!session || (!isConfigured && !isDemoExperience)) {
      setGoals([]);
      setHabits([]);
      setLinkDataLoading(false);
      return;
    }

    const loadLinkData = async () => {
      setLinkDataLoading(true);
      try {
        const { data: goalData, error: goalError } = await fetchGoals();
        if (goalError) throw goalError;

        let habitData: HabitRow[] = [];
        if (isDemoExperience) {
          habitData = getDemoHabitsForUser(session.user.id);
        } else {
          const { data: habitsResponse, error: habitsError } = await listHabitsV2();
          if (habitsError) throw habitsError;
          habitData = habitsResponse ?? [];
        }

        setGoals(goalData ?? []);
        setHabits(habitData);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load linked goals and habits.');
      } finally {
        setLinkDataLoading(false);
      }
    };

    loadLinkData();
  }, [session, isConfigured, isDemoExperience]);

  useEffect(() => {
    if (!isConfigured && !isDemoExperience) {
      setImages([]);
      setHasLoadedOnce(false);
    }
  }, [isConfigured, isDemoExperience]);

  const sortedImages = useMemo(() => {
    const copy = [...images];
    if (sortMode === 'caption') {
      return copy.sort((a, b) => (a.caption ?? '').localeCompare(b.caption ?? ''));
    }

    return copy.sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortMode === 'newest' ? bTime - aTime : aTime - bTime;
    });
  }, [images, sortMode]);

  const filteredImages = useMemo(() => {
    let base = sortedImages;

    if (boardView === 'life_wheel' && lifeWheelAvailable) {
      if (lifeWheelFilter === 'untagged') {
        base = base.filter((image) => (lifeWheelTags[image.id] ?? []).length === 0);
      } else if (lifeWheelFilter !== 'all') {
        base = base.filter((image) => (lifeWheelTags[image.id] ?? []).includes(lifeWheelFilter));
      }
    } else if (boardView === 'visionaries' && visionariesAvailable) {
      if (visionaryFilter === 'untagged') {
        base = base.filter((image) => (visionaryTags[image.id] ?? []).length === 0);
      } else if (visionaryFilter !== 'all') {
        base = base.filter((image) => (visionaryTags[image.id] ?? []).includes(visionaryFilter));
      }
    }

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      base = base.filter((image) => (image.caption ?? '').toLowerCase().includes(query));
    }

    return base;
  }, [
    boardView,
    sortedImages,
    lifeWheelFilter,
    visionaryFilter,
    lifeWheelTags,
    visionaryTags,
    lifeWheelAvailable,
    visionariesAvailable,
    searchQuery,
  ]);

  const openLightbox = useCallback(
    (imageId: string) => {
      const index = filteredImages.findIndex((image) => image.id === imageId);
      if (index >= 0) setLightboxIndex(index);
    },
    [filteredImages],
  );

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const storyScenes = useMemo<StoryPanel[]>(
    () =>
      filteredImages
        .filter((image) => Boolean(image.publicUrl))
        .map((image) => ({
          id: image.id,
          type: 'image' as const,
          src: image.publicUrl,
          alt: image.caption ?? 'Vision board image',
          caption: image.caption ?? undefined,
        })),
    [filteredImages],
  );

  const isBodyStyleTab =
    boardView === 'visionaries' && (visionaryFilter === 'body_style' || (!isConfigured && !isDemoExperience));

  const hasImages = sortedImages.length > 0;
  const shouldShowEmptyState = (isConfigured || isDemoExperience) && hasLoadedOnce && !loading && !hasImages;
  const shouldShowAddEditSection = hasImages || (shouldShowEmptyState && isAddEditOpen);

  const goalLookup = useMemo(() => new Map(goals.map((goal) => [goal.id, goal.title])), [goals]);
  const habitLookup = useMemo(() => new Map(habits.map((habit) => [habit.id, habit.title])), [habits]);

  useEffect(() => {
    if (!lifeWheelAvailable && lifeWheelFilter !== 'all') {
      setLifeWheelFilter('all');
    }
  }, [lifeWheelAvailable, lifeWheelFilter]);

  useEffect(() => {
    if (!visionariesAvailable && visionaryFilter !== 'all') {
      setVisionaryFilter('all');
    }
  }, [visionariesAvailable, visionaryFilter]);

  const startEditing = (image: VisionImage) => {
    setEditingId(image.id);
  };

  const stopEditing = () => {
    setEditingId(null);
  };

  const startTagging = (image: VisionImage) => {
    setTaggingImage(image);
  };

  const stopTagging = () => {
    setTaggingImage(null);
  };

  const handleTagsSaved = (
    imageId: string,
    lifeWheel: LifeWheelCategoryKey[],
    visionary: FourVisionaryCategoryKey[],
  ) => {
    setLifeWheelTags((current) => ({ ...current, [imageId]: lifeWheel }));
    setVisionaryTags((current) => ({ ...current, [imageId]: visionary }));
    stopTagging();
  };

  const handleUpdateImage = async (imageId: string, updates: Partial<VisionImageRow>) => {
    try {
      const { data, error } = await updateVisionImage(imageId, updates);
      if (error) throw error;
      if (!data) return false;
      setImages((current) =>
        current.map((item) =>
          item.id === data.id
            ? { ...item, ...data, publicUrl: getVisionImagePublicUrl(data) }
            : item,
        ),
      );
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update the entry.');
      return false;
    }
  };

  const handleUploaded = async (data: VisionImageRow) => {
    setImages((current) => [
      {
        ...data,
        publicUrl: getVisionImagePublicUrl(data),
      },
      ...current,
    ]);

    // Award XP for vision board upload
    const hasCaption = Boolean(data.caption?.trim());
    const xpAmount = hasCaption
      ? XP_REWARDS.VISION_BOARD + XP_REWARDS.VISION_BOARD_CAPTION // 15 XP with caption
      : XP_REWARDS.VISION_BOARD; // 10 XP base

    await earnXP(xpAmount, 'vision_board_upload', data.id);
    await recordActivity();
  };

  const commitDeletes = useCallback(async (items: PendingDeleteItem[]) => {
    for (const item of items) {
      try {
        const error = await deleteVisionImage(item.record);
        if (error) throw error;
      } catch (error) {
        // Restore the item so a failed delete never silently loses data.
        setImages((current) =>
          current.some((existing) => existing.id === item.record.id)
            ? current
            : [item.record, ...current],
        );
        setLifeWheelTags((current) => ({ ...current, [item.record.id]: item.lifeWheel }));
        setVisionaryTags((current) => ({ ...current, [item.record.id]: item.visionary }));
        setErrorMessage(error instanceof Error ? error.message : 'Unable to delete an entry.');
      }
    }
  }, []);

  const queueDeletes = (items: PendingDeleteItem[]) => {
    if (items.length === 0) return;

    // Commit any previously-queued batch before starting a new one.
    const prior = pendingDeleteRef.current;
    if (prior) {
      window.clearTimeout(prior.timeoutId);
      void commitDeletes(prior.items);
    }

    const ids = new Set(items.map((item) => item.record.id));

    // Optimistically remove from the gallery; commit after the undo window.
    setImages((current) => current.filter((item) => !ids.has(item.id)));
    setLifeWheelTags((current) => {
      const next = { ...current };
      ids.forEach((id) => delete next[id]);
      return next;
    });
    setVisionaryTags((current) => {
      const next = { ...current };
      ids.forEach((id) => delete next[id]);
      return next;
    });

    const timeoutId = window.setTimeout(() => {
      pendingDeleteRef.current = null;
      setPendingDelete(null);
      void commitDeletes(items);
    }, 5000);

    pendingDeleteRef.current = { items, timeoutId };
    setPendingDelete(items);
  };

  const toPendingItem = (record: VisionImage): PendingDeleteItem => ({
    record,
    lifeWheel: lifeWheelTags[record.id] ?? [],
    visionary: visionaryTags[record.id] ?? [],
  });

  const handleDelete = (record: VisionImage) => {
    if (!isConfigured && !isDemoExperience) {
      setErrorMessage('Connect Supabase to remove items from your vision board.');
      return;
    }
    setErrorMessage(null);
    queueDeletes([toPendingItem(record)]);
  };

  const handleBulkDelete = () => {
    if (!isConfigured && !isDemoExperience) {
      setErrorMessage('Connect Supabase to remove items from your vision board.');
      return;
    }
    const items = selectedIds
      .map((id) => images.find((image) => image.id === id))
      .filter((image): image is VisionImage => Boolean(image))
      .map(toPendingItem);
    if (items.length === 0) return;
    setErrorMessage(null);
    queueDeletes(items);
    setSelectedIds([]);
    setSelectMode(false);
  };

  const undoDelete = () => {
    const pending = pendingDeleteRef.current;
    if (!pending) return;
    window.clearTimeout(pending.timeoutId);
    pendingDeleteRef.current = null;
    setPendingDelete(null);
    setImages((current) => {
      const existing = new Set(current.map((item) => item.id));
      const restored = pending.items
        .filter((item) => !existing.has(item.record.id))
        .map((item) => item.record);
      return restored.length ? [...restored, ...current] : current;
    });
    setLifeWheelTags((current) => {
      const next = { ...current };
      pending.items.forEach((item) => {
        next[item.record.id] = item.lifeWheel;
      });
      return next;
    });
    setVisionaryTags((current) => {
      const next = { ...current };
      pending.items.forEach((item) => {
        next[item.record.id] = item.visionary;
      });
      return next;
    });
  };

  useEffect(() => {
    return () => {
      const pending = pendingDeleteRef.current;
      if (pending) {
        window.clearTimeout(pending.timeoutId);
        pending.items.forEach((item) => void deleteVisionImage(item.record));
      }
    };
  }, []);

  const toggleSelected = (imageId: string) => {
    setSelectedIds((current) =>
      current.includes(imageId) ? current.filter((id) => id !== imageId) : [...current, imageId],
    );
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds([]);
  };

  const handleRetryVisionQueue = async () => {
    if (!session) return;
    await retryFailedVisionImageMutations(session.user.id);
    await syncQueuedVisionImageMutations(session.user.id);
    await loadImages();
    const status = await getVisionImageQueueStatus(session.user.id);
    setQueuePending(status.pending);
    setQueueFailed(status.failed);
  };

  const handleClearVisionQueue = async () => {
    if (!session) return;
    const confirmed = window.confirm('Clear unsynced vision board changes on this device?');
    if (!confirmed) return;
    await clearQueuedVisionImageMutations(session.user.id);
    const status = await getVisionImageQueueStatus(session.user.id);
    setQueuePending(status.pending);
    setQueueFailed(status.failed);
  };

  const closeDailyGame = useCallback(() => setShowDailyGame(false), []);
  const dailyGameModalRef = useModalA11y<HTMLDivElement>(showDailyGame && hasImages, closeDailyGame);

  return (
    <section className="vision-board">
      <header className="vision-board__header">
        <div>
          <h2>Vision board</h2>
          <p>
            Collect the imagery that inspires your next milestone. Upload photos, set a caption, and revisit the gallery
            whenever you need a boost.
          </p>
        </div>
        {hasImages && (
          <div className="vision-board__controls">
            <div className="vision-board__sort">
              <label htmlFor="vision-board-view">Board view</label>
              <select
                id="vision-board-view"
                value={boardView}
                onChange={(event) => setBoardView(event.target.value as BoardView)}
              >
                {BOARD_VIEW_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="vision-board__sort">
              <label htmlFor="vision-board-sort">Sort by</label>
              <select
                id="vision-board-sort"
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="caption">Caption (A–Z)</option>
              </select>
            </div>
            <div className="vision-board__layout">
              <label htmlFor="vision-board-layout">Grid layout</label>
              <select
                id="vision-board-layout"
                value={gridLayout}
                onChange={(event) => setGridLayout(event.target.value as GridLayout)}
              >
                <option value="2-column">2 Columns</option>
                <option value="3-column">3 Columns</option>
                <option value="masonry">Masonry</option>
              </select>
            </div>
            <div className="vision-board__search">
              <label htmlFor="vision-board-search">Search</label>
              <input
                id="vision-board-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search captions…"
              />
            </div>
            <button
              type="button"
              className="vision-board__daily-game-button"
              onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
              aria-pressed={selectMode}
            >
              {selectMode ? 'Done selecting' : 'Select'}
            </button>
            <button
              type="button"
              className="vision-board__daily-game-button"
              onClick={() => setShowStory(true)}
              disabled={storyScenes.length === 0}
            >
              ▶ Story mode
            </button>
            <button
              type="button"
              className="vision-board__daily-game-button"
              onClick={() => setShowDailyGame(true)}
              disabled={!isConfigured}
            >
              🎮 Daily Vision Game
            </button>
          </div>
        )}
      </header>

      {isDemoExperience ? (
        <p className="vision-board__status vision-board__status--info">
          Vision board uploads are stored locally while you explore the demo workspace. Connect Supabase storage to keep a
          cloud-synced gallery.
        </p>
      ) : !isConfigured ? (
        <p className="vision-board__status vision-board__status--warning">
          Add your Supabase credentials and storage bucket to enable uploads and syncing for the vision board. Until then you
          can sketch ideas offline.
        </p>
      ) : null}

      {errorMessage && <p className="vision-board__status vision-board__status--error">{errorMessage}</p>}
      {(queuePending > 0 || queueFailed > 0) && (
        <div className="vision-board__status vision-board__status--warning">
          <p style={{ margin: 0 }}>
            {queueFailed > 0
              ? `${queueFailed} vision board change${queueFailed > 1 ? 's' : ''} failed to sync. We'll retry automatically when you're online.`
              : `${queuePending} vision board change${queuePending > 1 ? 's are' : ' is'} queued for sync.`}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" className="vision-board__daily-game-button" onClick={handleRetryVisionQueue}>
              Retry sync
            </button>
            <button type="button" className="vision-board__daily-game-button" onClick={handleClearVisionQueue}>
              Clear queue
            </button>
          </div>
        </div>
      )}

      {shouldShowEmptyState && (
        <section className="vision-board__empty-card" aria-labelledby="vision-board-empty-title">
          <div className="vision-board__empty-visual" aria-hidden="true">
            <span>🖼️</span>
          </div>
          <div className="vision-board__empty-copy">
            <h3 id="vision-board-empty-title">Start your Vision Board</h3>
            <p>Upload your first image to make your goals feel real.</p>
          </div>
          <button
            type="button"
            className="vision-board__empty-cta"
            onClick={() => setIsAddEditOpen(true)}
            disabled={!isConfigured && !isDemoExperience}
          >
            Upload first image
          </button>
          <p className="vision-board__empty-note">You can add captions and organize it later.</p>
        </section>
      )}

      {shouldShowAddEditSection && (
        <div className="vision-board__add-edit">
          {hasImages && (
            <button
              type="button"
              className="vision-board__add-edit-toggle"
              onClick={() => setIsAddEditOpen(!isAddEditOpen)}
              aria-expanded={isAddEditOpen}
            >
              <span className="vision-board__add-edit-icon">{isAddEditOpen ? '−' : '+'}</span>
              Add/Edit
            </button>
          )}

        {isAddEditOpen && (
          <VisionUploadForm
            userId={session.user.id}
            canUpload={isConfigured || isDemoExperience}
            goals={goals}
            habits={habits}
            linkDataLoading={linkDataLoading}
            onUploaded={handleUploaded}
            onError={setErrorMessage}
          />
        )}
      </div>
      )}

      {(isConfigured || isDemoExperience) && hasImages && boardView === 'life_wheel' && (
        <div className="vision-board__tabs" role="tablist" aria-label="Life wheel categories">
          <button
            type="button"
            role="tab"
            aria-selected={lifeWheelFilter === 'all'}
            className={`vision-board__tab ${lifeWheelFilter === 'all' ? 'vision-board__tab--active' : ''}`}
            onClick={() => setLifeWheelFilter('all')}
          >
            All
          </button>
          {lifeWheelAvailable &&
            LIFE_WHEEL_CATEGORIES.map((category) => (
              <button
                key={category.key}
                type="button"
                role="tab"
                aria-selected={lifeWheelFilter === category.key}
                className={`vision-board__tab ${lifeWheelFilter === category.key ? 'vision-board__tab--active' : ''}`}
                onClick={() => setLifeWheelFilter(category.key)}
              >
                {category.label}
              </button>
            ))}
          {lifeWheelAvailable && (
            <button
              type="button"
              role="tab"
              aria-selected={lifeWheelFilter === 'untagged'}
              className={`vision-board__tab ${lifeWheelFilter === 'untagged' ? 'vision-board__tab--active' : ''}`}
              onClick={() => setLifeWheelFilter('untagged')}
            >
              Untagged
            </button>
          )}
        </div>
      )}

      {(isConfigured || isDemoExperience) && hasImages && boardView === 'visionaries' && (
        <div className="vision-board__tabs" role="tablist" aria-label="The Four Visionaries categories">
          <button
            type="button"
            role="tab"
            aria-selected={visionaryFilter === 'all'}
            className={`vision-board__tab ${visionaryFilter === 'all' ? 'vision-board__tab--active' : ''}`}
            onClick={() => setVisionaryFilter('all')}
          >
            All
          </button>
          {visionariesAvailable &&
            FOUR_VISIONARIES.map((category) => (
              <button
                key={category.key}
                type="button"
                role="tab"
                aria-selected={visionaryFilter === category.key}
                className={`vision-board__tab ${visionaryFilter === category.key ? 'vision-board__tab--active' : ''}`}
                onClick={() => setVisionaryFilter(category.key)}
              >
                {category.label}
              </button>
            ))}
          {visionariesAvailable && (
            <button
              type="button"
              role="tab"
              aria-selected={visionaryFilter === 'untagged'}
              className={`vision-board__tab ${visionaryFilter === 'untagged' ? 'vision-board__tab--active' : ''}`}
              onClick={() => setVisionaryFilter('untagged')}
            >
              Untagged
            </button>
          )}
        </div>
      )}

      {hasImages && isBodyStyleTab && <HaircutWidget userId={session.user.id} />}

      {selectMode && hasImages && (
        <div className="vision-board__bulk-bar">
          <span className="vision-board__bulk-count">{selectedIds.length} selected</span>
          <div className="vision-board__bulk-actions">
            <button
              type="button"
              onClick={() => setSelectedIds(filteredImages.map((image) => image.id))}
              disabled={filteredImages.length === 0}
            >
              Select all
            </button>
            <button type="button" onClick={() => setSelectedIds([])} disabled={selectedIds.length === 0}>
              Clear
            </button>
            <button
              type="button"
              className="vision-board__bulk-delete"
              onClick={handleBulkDelete}
              disabled={selectedIds.length === 0 || (!isConfigured && !isDemoExperience)}
            >
              Delete selected
            </button>
          </div>
        </div>
      )}

      {!shouldShowEmptyState && (
        <div className={`vision-board__grid vision-board__grid--${gridLayout}`} role="list">
        {!isConfigured && !isDemoExperience ? (
          <p className="vision-board__empty">Connect Supabase to sync your gallery.</p>
        ) : loading && !hasLoadedOnce ? (
          <p className="vision-board__empty">Loading your inspiration…</p>
        ) : sortedImages.length === 0 ? (
          <p className="vision-board__empty">No images yet—upload your first motivator to get started.</p>
        ) : filteredImages.length === 0 ? (
          <p className="vision-board__empty">No images match this filter yet.</p>
        ) : (
          filteredImages.map((image) => (
            <VisionCard
              key={image.id}
              image={image}
              selectMode={selectMode}
              selected={selectedIds.includes(image.id)}
              canMutate={isConfigured || isDemoExperience}
              goalLookup={goalLookup}
              habitLookup={habitLookup}
              lifeWheelKeys={lifeWheelTags[image.id] ?? []}
              visionaryKeys={visionaryTags[image.id] ?? []}
              lifeWheelLabelLookup={lifeWheelLabelLookup}
              visionaryLabelLookup={visionaryLabelLookup}
              isEditing={editingId === image.id}
              goals={goals}
              habits={habits}
              onToggleSelected={toggleSelected}
              onOpenLightbox={openLightbox}
              onNavigateToTimer={onNavigateToTimer}
              onStartEditing={startEditing}
              onStartTagging={startTagging}
              onDelete={handleDelete}
              onSaveEdit={handleUpdateImage}
              onCancelEdit={stopEditing}
            />
          ))
        )}
        </div>
      )}

      {showDailyGame && hasImages && (
        <div className="vision-board__modal-backdrop" onClick={closeDailyGame}>
          <div
            className="vision-board__modal"
            role="dialog"
            aria-modal="true"
            aria-label="Daily vision game"
            tabIndex={-1}
            ref={dailyGameModalRef}
            onClick={(event) => event.stopPropagation()}
          >
            <VisionBoardDailyGame session={session} onClose={closeDailyGame} isConfigured={isConfigured} />
          </div>
        </div>
      )}

      {taggingImage && (
        <VisionTagModal
          image={taggingImage}
          userId={session.user.id}
          canSave={isConfigured || isDemoExperience}
          initialLifeWheel={lifeWheelTags[taggingImage.id] ?? []}
          initialVisionary={visionaryTags[taggingImage.id] ?? []}
          onClose={stopTagging}
          onSaved={handleTagsSaved}
          onError={setErrorMessage}
        />
      )}

      {pendingDelete && pendingDelete.length > 0 && (
        <div className="vision-board__toast" role="status" aria-live="polite">
          <span>
            {pendingDelete.length === 1
              ? `Removed “${pendingDelete[0].record.caption?.trim() || 'vision board entry'}”.`
              : `Removed ${pendingDelete.length} images.`}
          </span>
          <button type="button" className="vision-board__toast-undo" onClick={undoDelete}>
            Undo
          </button>
        </div>
      )}

      {lightboxIndex !== null && (
        <VisionLightbox images={filteredImages} initialIndex={lightboxIndex} onClose={closeLightbox} />
      )}

      <StoryPlayer
        isOpen={showStory}
        panels={storyScenes}
        title="Vision story"
        completionLabel="Done"
        onClose={() => setShowStory(false)}
        onComplete={() => setShowStory(false)}
      />
    </section>
  );
}
