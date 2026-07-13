import { ChangeEvent, DragEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  uploadVisionImage,
  uploadVisionImageFromUrl,
} from '../../services/visionBoard';
import { fetchVisionImageTags, setVisionImageCategories } from '../../services/visionBoardTags';
import { VisionBoardDailyGame } from '../visionBoardDailyGame/VisionBoardDailyGame';
import type { Database } from '../../lib/database.types';
import { isDemoSession } from '../../services/demoSession';
import { loadHaircutPreferences, saveHaircutPreferences } from './haircutPreferences';
import { useModalA11y } from './useModalA11y';
import { fetchGoals } from '../../services/goals';
import { listHabitsV2 } from '../../services/habitsV2';
import { getDemoHabitsForUser } from '../../services/demoData';
import { validateImageUploadFile } from '../../utils/imageUploadOptimizer';
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

const FOUR_VISIONARIES = [
  { key: 'things_living', label: 'Things & Living' },
  { key: 'body_style', label: 'Body & Style' },
  { key: 'happenings_events', label: 'The Happenings & Events' },
  { key: 'personality_inspiration', label: 'The Personality Type Inspiration' },
] as const;

type FourVisionaryCategory = (typeof FOUR_VISIONARIES)[number];

type FourVisionaryCategoryKey = FourVisionaryCategory['key'];

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

const DEFAULT_VISION_TYPE = 'goal';

const VISION_TYPES = [
  { value: 'goal', label: 'Goal' },
  { value: 'habit', label: 'Habit' },
  { value: 'identity', label: 'Identity' },
  { value: 'experience', label: 'Experience' },
  { value: 'environment', label: 'Environment' },
];

const HAIRCUT_INTERVAL_OPTIONS = [
  { value: 60, label: 'Every 2 months (60 days)' },
  { value: 75, label: 'Every 2-3 months (75 days)' },
  { value: 90, label: 'Every 3 months (90 days)' },
];

const HAIRCUT_STYLES = [
  { key: 'classic_taper', label: 'Classic taper', tone: 'Clean + sharp' },
  { key: 'soft_layers', label: 'Soft layers', tone: 'Natural + airy' },
  { key: 'textured_crop', label: 'Textured crop', tone: 'Modern + bold' },
];

const HAIRCUT_LENGTHS = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
];

function formatDateLabel(value: string | null): string {
  if (!value) return 'Not scheduled';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not scheduled';
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(dateValue: string | null, days: number): string | null {
  if (!dateValue) return null;
  const base = new Date(dateValue);
  if (Number.isNaN(base.getTime())) return null;
  const next = new Date(base);
  next.setDate(base.getDate() + days);
  return next.toISOString();
}

function getVisionTypeLabel(value: string | null | undefined): string {
  return VISION_TYPES.find((type) => type.value === value)?.label ?? 'Goal';
}

export function VisionBoard({ session, onNavigateToTimer }: VisionBoardProps) {
  const { isConfigured } = useSupabaseAuth();
  const isDemoExperience = isDemoSession(session);
  const { earnXP, recordActivity } = useGamification(session);
  const [images, setImages] = useState<VisionImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [fileDraft, setFileDraft] = useState<File | null>(null);
  const [urlDraft, setUrlDraft] = useState('');
  const [captionDraft, setCaptionDraft] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [gridLayout, setGridLayout] = useState<GridLayout>('masonry');
  const [boardView, setBoardView] = useState<BoardView>('all');
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showDailyGame, setShowDailyGame] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteItem[] | null>(null);
  const pendingDeleteRef = useRef<{ items: PendingDeleteItem[]; timeoutId: number } | null>(null);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [habits, setHabits] = useState<HabitRow[]>([]);
  const [linkDataLoading, setLinkDataLoading] = useState(false);
  const [addVisionType, setAddVisionType] = useState(DEFAULT_VISION_TYPE);
  const [addLinkedGoals, setAddLinkedGoals] = useState<string[]>([]);
  const [addLinkedHabits, setAddLinkedHabits] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editVisionType, setEditVisionType] = useState(DEFAULT_VISION_TYPE);
  const [editLinkedGoals, setEditLinkedGoals] = useState<string[]>([]);
  const [editLinkedHabits, setEditLinkedHabits] = useState<string[]>([]);
  const [editSavingId, setEditSavingId] = useState<string | null>(null);
  const [lifeWheelFilter, setLifeWheelFilter] = useState<LifeWheelFilter>('all');
  const [visionaryFilter, setVisionaryFilter] = useState<VisionaryFilter>('all');
  const [lifeWheelTags, setLifeWheelTags] = useState<Record<string, LifeWheelCategoryKey[]>>({});
  const [visionaryTags, setVisionaryTags] = useState<Record<string, FourVisionaryCategoryKey[]>>({});
  const [taggingImage, setTaggingImage] = useState<VisionImage | null>(null);
  const [lifeWheelDraft, setLifeWheelDraft] = useState<LifeWheelCategoryKey[]>([]);
  const [visionaryDraft, setVisionaryDraft] = useState<FourVisionaryCategoryKey[]>([]);
  const [tagSaving, setTagSaving] = useState(false);
  const [isHaircutExpanded, setIsHaircutExpanded] = useState(false);
  const [haircutIntervalDays, setHaircutIntervalDays] = useState(75);
  const [lastHaircutDate, setLastHaircutDate] = useState(() => formatISODate(new Date()));
  const [selectedHaircutStyle, setSelectedHaircutStyle] = useState(HAIRCUT_STYLES[0].key);
  const [bestHairLength, setBestHairLength] = useState(HAIRCUT_LENGTHS[1].value);
  const [needsHaircut, setNeedsHaircut] = useState(false);
  const haircutPrefsLoaded = useRef(false);
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

  useEffect(() => {
    haircutPrefsLoaded.current = false;
    const userId = session?.user?.id;
    if (!userId) return;
    const prefs = loadHaircutPreferences(userId);
    if (prefs) {
      if (typeof prefs.intervalDays === 'number') setHaircutIntervalDays(prefs.intervalDays);
      if (typeof prefs.lastHaircutDate === 'string') setLastHaircutDate(prefs.lastHaircutDate);
      if (typeof prefs.styleKey === 'string') setSelectedHaircutStyle(prefs.styleKey);
      if (typeof prefs.bestLength === 'string') setBestHairLength(prefs.bestLength);
      if (typeof prefs.needsHaircut === 'boolean') setNeedsHaircut(prefs.needsHaircut);
    }
    haircutPrefsLoaded.current = true;
  }, [session?.user?.id]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || !haircutPrefsLoaded.current) return;
    saveHaircutPreferences(userId, {
      intervalDays: haircutIntervalDays,
      lastHaircutDate,
      styleKey: selectedHaircutStyle,
      bestLength: bestHairLength,
      needsHaircut,
    });
  }, [
    session?.user?.id,
    haircutIntervalDays,
    lastHaircutDate,
    selectedHaircutStyle,
    bestHairLength,
    needsHaircut,
  ]);

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

  const showPrevImage = useCallback(() => {
    setLightboxIndex((current) => {
      if (current === null || filteredImages.length === 0) return current;
      return (current - 1 + filteredImages.length) % filteredImages.length;
    });
  }, [filteredImages.length]);

  const showNextImage = useCallback(() => {
    setLightboxIndex((current) => {
      if (current === null || filteredImages.length === 0) return current;
      return (current + 1) % filteredImages.length;
    });
  }, [filteredImages.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeLightbox();
      else if (event.key === 'ArrowLeft') showPrevImage();
      else if (event.key === 'ArrowRight') showNextImage();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxIndex, closeLightbox, showPrevImage, showNextImage]);

  const lightboxImage =
    lightboxIndex !== null && lightboxIndex < filteredImages.length
      ? filteredImages[lightboxIndex]
      : null;

  const isBodyStyleTab =
    boardView === 'visionaries' && (visionaryFilter === 'body_style' || (!isConfigured && !isDemoExperience));
  const nextHaircutDate = addDays(lastHaircutDate, haircutIntervalDays);
  const haircutDaysSince = useMemo(() => {
    const parsed = new Date(lastHaircutDate);
    if (Number.isNaN(parsed.getTime())) return 0;
    const diff = Date.now() - parsed.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }, [lastHaircutDate]);
  const haircutProgress = haircutIntervalDays > 0
    ? Math.min(100, Math.round((haircutDaysSince / haircutIntervalDays) * 100))
    : 0;

  const hasImages = sortedImages.length > 0;
  const shouldShowEmptyState = (isConfigured || isDemoExperience) && hasLoadedOnce && !loading && !hasImages;
  const shouldShowAddEditSection = hasImages || (shouldShowEmptyState && isAddEditOpen);

  const toggleSelection = <T extends string>(current: T[], id: T): T[] =>
    current.includes(id) ? current.filter((item) => item !== id) : [...current, id];

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

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (file) {
      try {
        validateImageUploadFile(file);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Please choose a valid image file.');
        event.target.value = '';
        setFileDraft(null);
        setPreviewUrl(null);
        return;
      }
    }

    setErrorMessage(null);
    setFileDraft(file);

    // Generate preview for file upload
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!uploading && (isConfigured || isDemoExperience)) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    if (!isConfigured && !isDemoExperience) {
      return;
    }

    const file = event.dataTransfer.files[0];
    if (!file) return;

    try {
      validateImageUploadFile(file);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Please drop a JPG, PNG, or WebP image.');
      return;
    }

    // Set file and generate preview
    setErrorMessage(null);
    setFileDraft(file);
    setUploadMode('file');
    setIsAddEditOpen(true);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlChange = (value: string) => {
    setUrlDraft(value);
    // Set preview URL for URL-based uploads
    if (value.trim()) {
      setPreviewUrl(value.trim());
    } else {
      setPreviewUrl(null);
    }
  };

  const startEditing = (image: VisionImage) => {
    setEditingId(image.id);
    setEditCaption(image.caption ?? '');
    setEditVisionType(image.vision_type ?? DEFAULT_VISION_TYPE);
    setEditLinkedGoals(image.linked_goal_ids ?? []);
    setEditLinkedHabits(image.linked_habit_ids ?? []);
  };

  const stopEditing = () => {
    setEditingId(null);
  };

  const startTagging = (image: VisionImage) => {
    setTaggingImage(image);
    setLifeWheelDraft(lifeWheelTags[image.id] ?? []);
    setVisionaryDraft(visionaryTags[image.id] ?? []);
  };

  const stopTagging = () => {
    setTaggingImage(null);
    setLifeWheelDraft([]);
    setVisionaryDraft([]);
  };

  const handleSaveTags = async () => {
    if (!taggingImage || !session) {
      setErrorMessage('You need to sign in to tag your vision board images.');
      return;
    }

    if (!isConfigured && !isDemoExperience) {
      setErrorMessage('Connect Supabase to save vision board tags.');
      return;
    }

    setTagSaving(true);
    try {
      const [lifeWheelResult, visionaryResult] = await Promise.all([
        setVisionImageCategories(session.user.id, taggingImage.id, lifeWheelDraft, 'life_wheel'),
        setVisionImageCategories(session.user.id, taggingImage.id, visionaryDraft, 'four_visionaries'),
      ]);
      if (lifeWheelResult.error) throw lifeWheelResult.error;
      if (visionaryResult.error) throw visionaryResult.error;
      setLifeWheelTags((current) => ({
        ...current,
        [taggingImage.id]: (lifeWheelResult.data ?? []).map((tag) => tag.category_key as LifeWheelCategoryKey),
      }));
      setVisionaryTags((current) => ({
        ...current,
        [taggingImage.id]: (visionaryResult.data ?? []).map(
          (tag) => tag.category_key as FourVisionaryCategoryKey,
        ),
      }));
      stopTagging();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save tags for this image.');
    } finally {
      setTagSaving(false);
    }
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

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>, imageId: string) => {
    event.preventDefault();
    setEditSavingId(imageId);
    const success = await handleUpdateImage(imageId, {
      caption: editCaption.trim() ? editCaption.trim() : null,
      vision_type: editVisionType,
      linked_goal_ids: editLinkedGoals,
      linked_habit_ids: editLinkedHabits,
    });
    setEditSavingId(null);
    if (success) {
      stopEditing();
    }
  };

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!session) {
      setErrorMessage('You need to sign in to curate your vision board.');
      return;
    }

    if (!isConfigured && !isDemoExperience) {
      setErrorMessage('Supabase credentials are missing. Update your environment variables to continue.');
      return;
    }

    // Validate based on upload mode
    if (uploadMode === 'file') {
      if (!fileDraft) {
        setErrorMessage('Choose an image to upload.');
        return;
      }

      try {
        validateImageUploadFile(fileDraft);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Please choose a valid image file.');
        return;
      }
    } else {
      if (!urlDraft.trim()) {
        setErrorMessage('Enter an image URL.');
        return;
      }

      // Basic URL validation
      try {
        new URL(urlDraft.trim());
      } catch {
        setErrorMessage('Enter a valid URL.');
        return;
      }
    }

    setUploading(true);
    setErrorMessage(null);

    try {
      let data, error;

      if (uploadMode === 'file' && fileDraft) {
        ({ data, error } = await uploadVisionImage({
          userId: session.user.id,
          file: fileDraft,
          fileName: fileDraft.name,
          caption: captionDraft,
          visionType: addVisionType,
          linkedGoalIds: addLinkedGoals,
          linkedHabitIds: addLinkedHabits,
        }));
      } else {
        ({ data, error } = await uploadVisionImageFromUrl({
          userId: session.user.id,
          imageUrl: urlDraft.trim(),
          caption: captionDraft,
          visionType: addVisionType,
          linkedGoalIds: addLinkedGoals,
          linkedHabitIds: addLinkedHabits,
        }));
      }

      if (error) throw error;

      if (data) {
        setImages((current) => [
          {
            ...data,
            publicUrl: getVisionImagePublicUrl(data),
          },
          ...current,
        ]);

        // Award XP for vision board upload
        const hasCaption = Boolean(captionDraft?.trim());
        const xpAmount = hasCaption
          ? XP_REWARDS.VISION_BOARD + XP_REWARDS.VISION_BOARD_CAPTION  // 15 XP with caption
          : XP_REWARDS.VISION_BOARD;  // 10 XP base

        await earnXP(xpAmount, 'vision_board_upload', data.id);
        await recordActivity();
      }
      setFileDraft(null);
      setUrlDraft('');
      setCaptionDraft('');
      setPreviewUrl(null);
      setAddVisionType(DEFAULT_VISION_TYPE);
      setAddLinkedGoals([]);
      setAddLinkedHabits([]);
      (event.target as HTMLFormElement).reset();
    } catch (error) {
      // Enhanced error logging for debugging
      console.group('[Vision Board] Upload failed');
      console.error('Timestamp:', new Date().toISOString());
      console.error('User ID:', session?.user?.id);
      console.error('Upload mode:', uploadMode);
      
      if (uploadMode === 'file' && fileDraft) {
        console.error('File details:', {
          name: fileDraft.name,
          size: fileDraft.size,
          type: fileDraft.type,
        });
      } else {
        console.error('Image URL:', urlDraft.trim());
      }
      
      console.error('Error details:', error);
      
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Stack trace:', error.stack);
      }
      console.groupEnd();

      // Provide specific user-facing error messages based on error type
      const CONSOLE_GUIDANCE = ' Check browser console for details.';
      let userMessage = 'Unable to upload the image right now.';
      
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        // Storage-related errors
        if (errorMsg.includes('storage upload failed')) {
          userMessage = error.message + CONSOLE_GUIDANCE;
        }
        // Database-related errors
        else if (errorMsg.includes('database insert failed')) {
          userMessage = error.message + CONSOLE_GUIDANCE;
        }
        // Bucket not found (already has good message)
        else if (errorMsg.includes('storage bucket') && errorMsg.includes('not found')) {
          userMessage = error.message;
        }
        // Other specific errors
        else if (error.message) {
          userMessage = error.message + CONSOLE_GUIDANCE;
        }
      }
      
      setErrorMessage(userMessage);
    } finally {
      setUploading(false);
    }
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
  const tagModalRef = useModalA11y<HTMLDivElement>(Boolean(taggingImage), stopTagging);
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
            onClick={() => {
              setUploadMode('file');
              setIsAddEditOpen(true);
            }}
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
          <form className="vision-board__form" onSubmit={handleUpload}>
            <div className="vision-board__field">
              <label>Upload method</label>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="radio"
                    name="upload-mode"
                    value="file"
                    checked={uploadMode === 'file'}
                    onChange={(e) => setUploadMode(e.target.value as 'file' | 'url')}
                    disabled={(!isConfigured && !isDemoExperience) || uploading}
                  />
                  <span>File upload</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="radio"
                    name="upload-mode"
                    value="url"
                    checked={uploadMode === 'url'}
                    onChange={(e) => setUploadMode(e.target.value as 'file' | 'url')}
                    disabled={(!isConfigured && !isDemoExperience) || uploading}
                  />
                  <span>Image URL</span>
                </label>
              </div>
            </div>
            {uploadMode === 'file' ? (
              <>
                <div 
                  className={`vision-board__drop-zone ${isDragging ? 'vision-board__drop-zone--active' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="vision-board__drop-zone-content">
                    <p className="vision-board__drop-zone-text">
                      {isDragging ? '📥 Drop image here' : '📁 Drag & drop an image here'}
                    </p>
                    <p className="vision-board__drop-zone-divider">or</p>
                    <label htmlFor="vision-board-file" className="vision-board__file-button">
                      Choose File
                    </label>
                    <input
                      id="vision-board-file"
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleFileChange}
                      disabled={(!isConfigured && !isDemoExperience) || uploading}
                      style={{ display: 'none' }}
                      required
                    />
                  </div>
                  {fileDraft && (
                    <p className="vision-board__file-selected">
                      Selected: {fileDraft.name} ({(fileDraft.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
                <span className="vision-board__hint">
                  PNG, JPG, or WEBP up to 5MB. Images are optimized to WebP before upload.
                </span>
              </>
            ) : (
              <div className="vision-board__field">
                <label htmlFor="vision-board-url">Image URL</label>
                <input
                  id="vision-board-url"
                  type="url"
                  value={urlDraft}
                  onChange={(event) => handleUrlChange(event.target.value)}
                  placeholder="https://example.com/image.jpg"
                  disabled={(!isConfigured && !isDemoExperience) || uploading}
                  required
                />
                <span className="vision-board__hint">Enter a direct link to an image.</span>
              </div>
            )}
            <div className="vision-board__field">
              <label htmlFor="vision-board-caption">Caption</label>
              <input
                id="vision-board-caption"
                type="text"
                value={captionDraft}
                onChange={(event) => setCaptionDraft(event.target.value)}
                placeholder="Describe why this image matters"
                disabled={(!isConfigured && !isDemoExperience) || uploading}
              />
            </div>
            <div className="vision-board__field">
              <label htmlFor="vision-board-type">Vision type</label>
              <select
                id="vision-board-type"
                value={addVisionType}
                onChange={(event) => setAddVisionType(event.target.value)}
                disabled={(!isConfigured && !isDemoExperience) || uploading}
              >
                {VISION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <span className="vision-board__hint">
                Tag each image to reflect the Game of Life focus it supports.
              </span>
            </div>
            <div className="vision-board__field">
              <label>Linked goals</label>
              {linkDataLoading ? (
                <span className="vision-board__hint">Loading goals…</span>
              ) : goals.length === 0 ? (
                <span className="vision-board__hint">No goals available yet.</span>
              ) : (
                <div className="vision-board__link-grid">
                  {goals.map((goal) => (
                    <label key={goal.id} className="vision-board__link-option">
                      <input
                        type="checkbox"
                        checked={addLinkedGoals.includes(goal.id)}
                        onChange={() => setAddLinkedGoals((current) => toggleSelection(current, goal.id))}
                        disabled={(!isConfigured && !isDemoExperience) || uploading}
                      />
                      <span>{goal.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="vision-board__field">
              <label>Linked habits</label>
              {linkDataLoading ? (
                <span className="vision-board__hint">Loading habits…</span>
              ) : habits.length === 0 ? (
                <span className="vision-board__hint">No habits available yet.</span>
              ) : (
                <div className="vision-board__link-grid">
                  {habits.map((habit) => (
                    <label key={habit.id} className="vision-board__link-option">
                      <input
                        type="checkbox"
                        checked={addLinkedHabits.includes(habit.id)}
                        onChange={() => setAddLinkedHabits((current) => toggleSelection(current, habit.id))}
                        disabled={(!isConfigured && !isDemoExperience) || uploading}
                      />
                      <span>{habit.title}</span>
                    </label>
                  ))}
                </div>
              )}
              <span className="vision-board__hint">
                Connect habits and goals to spot orphans that need a clearer Game of Life tie-in.
              </span>
            </div>
            {previewUrl && (
              <div className="vision-board__preview">
                <label>Preview</label>
                <img src={previewUrl} alt="Upload preview" className="vision-board__preview-image" />
              </div>
            )}
            <button
              type="submit"
              className="vision-board__submit"
              disabled={uploading || (!isConfigured && !isDemoExperience)}
            >
              {uploading ? 'Optimizing & uploading…' : 'Add to board'}
            </button>
          </form>
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

      {hasImages && isBodyStyleTab && (
        <section className={`vision-board__haircut-widget ${isHaircutExpanded ? 'vision-board__haircut-widget--expanded' : ''}`}>
          <button
            type="button"
            className="vision-board__haircut-toggle"
            aria-expanded={isHaircutExpanded}
            onClick={() => setIsHaircutExpanded((prev) => !prev)}
          >
            <div>
              <p className="vision-board__haircut-kicker">My Haircut</p>
              <h3 className="vision-board__haircut-title">Haircut rhythm & reminders</h3>
              <p className="vision-board__haircut-subtitle">
                Interval: {HAIRCUT_INTERVAL_OPTIONS.find((option) => option.value === haircutIntervalDays)?.label ?? 'Custom'} ·
                Next reminder {formatDateLabel(nextHaircutDate)}
              </p>
            </div>
            <span className="vision-board__haircut-toggle-icon" aria-hidden>
              {isHaircutExpanded ? '−' : '+'}
            </span>
          </button>
          {isHaircutExpanded && (
            <div className="vision-board__haircut-details">
              <div className="vision-board__haircut-section">
                <h4>My haircut selection</h4>
                <div className="vision-board__haircut-style-grid" role="radiogroup" aria-label="Select haircut style">
                  {HAIRCUT_STYLES.map((style) => (
                    <button
                      key={style.key}
                      type="button"
                      role="radio"
                      aria-checked={selectedHaircutStyle === style.key}
                      className={`vision-board__haircut-style ${selectedHaircutStyle === style.key ? 'vision-board__haircut-style--active' : ''}`}
                      onClick={() => setSelectedHaircutStyle(style.key)}
                    >
                      <span className="vision-board__haircut-style-swatch" aria-hidden />
                      <span>
                        <strong>{style.label}</strong>
                        <span>{style.tone}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="vision-board__haircut-section">
                <h4>Reminders & reset</h4>
                <div className="vision-board__haircut-inputs">
                  <label>
                    Last haircut
                    <input
                      type="date"
                      value={lastHaircutDate}
                      onChange={(event) => setLastHaircutDate(event.target.value)}
                    />
                  </label>
                  <label>
                    Interval
                    <select
                      value={haircutIntervalDays}
                      onChange={(event) => setHaircutIntervalDays(Number(event.target.value))}
                    >
                      {HAIRCUT_INTERVAL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Best length
                    <select
                      value={bestHairLength}
                      onChange={(event) => setBestHairLength(event.target.value)}
                    >
                      {HAIRCUT_LENGTHS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="vision-board__haircut-actions">
                  <button
                    type="button"
                    className="vision-board__haircut-reset"
                    onClick={() => {
                      setLastHaircutDate(formatISODate(new Date()));
                      setNeedsHaircut(false);
                    }}
                  >
                    Just had a haircut
                  </button>
                  <button
                    type="button"
                    className="vision-board__haircut-alert"
                    onClick={() => setNeedsHaircut(true)}
                  >
                    Hair feels too long
                  </button>
                </div>
                <p className={`vision-board__haircut-status ${needsHaircut ? 'vision-board__haircut-status--alert' : ''}`}>
                  {needsHaircut ? 'Time for a trim — consider booking a cut.' : 'On track with your ideal length.'}
                </p>
              </div>
            </div>
          )}
          <div className="vision-board__haircut-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={haircutProgress}>
            <div className="vision-board__haircut-progress-bar" style={{ width: `${haircutProgress}%` }} />
          </div>
          <p className="vision-board__haircut-progress-label">
            {haircutDaysSince} days since your last cut · {haircutProgress}% toward your next one
          </p>
        </section>
      )}

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
            <article
              key={image.id}
              className={`vision-board__card${
                selectMode && selectedIds.includes(image.id) ? ' vision-board__card--selected' : ''
              }`}
              role="listitem"
            >
              <div className="vision-board__card-image-container">
                {selectMode && (
                  <label className="vision-board__select-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(image.id)}
                      onChange={() => toggleSelected(image.id)}
                      aria-label={`Select ${image.caption?.trim() || 'vision board entry'}`}
                    />
                  </label>
                )}
                {image.publicUrl ? (
                  <button
                    type="button"
                    className="vision-board__card-image-button"
                    onClick={() => openLightbox(image.id)}
                    aria-label={`View ${image.caption?.trim() || 'vision board entry'} full screen`}
                  >
                    <img
                      src={image.publicUrl}
                      alt={image.caption ?? 'Vision board entry'}
                      loading="lazy"
                      onError={(event) => {
                        const target = event.currentTarget;
                        target.style.display = 'none';
                        target.parentElement?.classList.add('vision-board__card-image-button--broken');
                      }}
                    />
                    <span className="vision-board__card-image-broken" aria-hidden>
                      Image unavailable
                    </span>
                  </button>
                ) : (
                  <div className="vision-board__placeholder" aria-hidden>
                    <span>No preview</span>
                  </div>
                )}
                {image.caption && (
                  <div className="vision-board__card-overlay">
                    <p>{image.caption}</p>
                  </div>
                )}
              </div>
              {(() => {
                const linkedGoals = image.linked_goal_ids ?? [];
                const linkedHabits = image.linked_habit_ids ?? [];
                const isOrphan = linkedGoals.length === 0 && linkedHabits.length === 0;
                const goalLabels = linkedGoals.map((id) => goalLookup.get(id)).filter(Boolean) as string[];
                const habitLabels = linkedHabits.map((id) => habitLookup.get(id)).filter(Boolean) as string[];
                const lifeWheelKeys = lifeWheelTags[image.id] ?? [];
                const lifeWheelLabels = lifeWheelKeys
                  .map((key) => lifeWheelLabelLookup.get(key))
                  .filter(Boolean) as string[];
                const visionaryKeys = visionaryTags[image.id] ?? [];
                const visionaryLabels = visionaryKeys
                  .map((key) => visionaryLabelLookup.get(key))
                  .filter(Boolean) as string[];
                return (
                  <div className="vision-board__card-body">
                    <div className="vision-board__card-meta">
                      <span className="vision-board__chip">{getVisionTypeLabel(image.vision_type)}</span>
                      {isOrphan && <span className="vision-board__chip vision-board__chip--orphan">Orphan</span>}
                    </div>
                    {lifeWheelLabels.length > 0 && (
                      <div className="vision-board__card-tags">
                        {lifeWheelKeys.map((key) => {
                          const label = lifeWheelLabelLookup.get(key);
                          if (!label) return null;
                          return (
                            <span key={`${image.id}-${key}`} className="vision-board__chip vision-board__chip--category">
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {visionaryLabels.length > 0 && (
                      <div className="vision-board__card-tags">
                        {visionaryKeys.map((key) => {
                          const label = visionaryLabelLookup.get(key);
                          if (!label) return null;
                          return (
                            <span
                              key={`${image.id}-${key}`}
                              className="vision-board__chip vision-board__chip--visionary"
                            >
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {goalLabels.length > 0 && (
                      <p className="vision-board__card-links">
                        <strong>Goals:</strong> {goalLabels.join(', ')}
                      </p>
                    )}
                    {habitLabels.length > 0 && (
                      <p className="vision-board__card-links">
                        <strong>Habits:</strong> {habitLabels.join(', ')}
                      </p>
                    )}
                    {isOrphan && (
                      <p className="vision-board__card-links vision-board__card-links--orphan">
                        No links yet—attach a goal or habit to keep this Game of Life anchor grounded.
                      </p>
                    )}
                  </div>
                );
              })()}
              <div className="vision-board__card-actions">
                <button
                  type="button"
                  onClick={() =>
                    onNavigateToTimer?.({
                      sourceType: 'vision',
                      sourceId: image.id,
                      sourceName: image.caption?.trim() || 'Vision board entry',
                    })
                  }
                  className="vision-board__edit"
                  aria-label={`Start timer for vision image: ${image.caption?.trim() || 'Vision board entry'}`}
                  title="Start timer"
                >
                  ⏱️ Timer
                </button>
                <button type="button" onClick={() => startEditing(image)} className="vision-board__edit">
                  Edit details
                </button>
                <button
                  type="button"
                  onClick={() => startTagging(image)}
                  className="vision-board__edit"
                  disabled={!isConfigured && !isDemoExperience}
                >
                  Tag/Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(image)}
                  className="vision-board__delete"
                  disabled={!isConfigured && !isDemoExperience}
                  title="Remove image"
                >
                  Remove
                </button>
              </div>
              {editingId === image.id && (
                <form className="vision-board__edit-form" onSubmit={(event) => handleEditSubmit(event, image.id)}>
                  <div className="vision-board__field">
                    <label htmlFor={`vision-edit-caption-${image.id}`}>Caption</label>
                    <input
                      id={`vision-edit-caption-${image.id}`}
                      type="text"
                      value={editCaption}
                      onChange={(event) => setEditCaption(event.target.value)}
                      disabled={editSavingId === image.id}
                    />
                  </div>
                  <div className="vision-board__field">
                    <label htmlFor={`vision-edit-type-${image.id}`}>Vision type</label>
                    <select
                      id={`vision-edit-type-${image.id}`}
                      value={editVisionType}
                      onChange={(event) => setEditVisionType(event.target.value)}
                      disabled={editSavingId === image.id}
                    >
                      {VISION_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="vision-board__field">
                    <label>Linked goals</label>
                    {goals.length === 0 ? (
                      <span className="vision-board__hint">No goals available yet.</span>
                    ) : (
                      <div className="vision-board__link-grid">
                        {goals.map((goal) => (
                          <label key={goal.id} className="vision-board__link-option">
                            <input
                              type="checkbox"
                              checked={editLinkedGoals.includes(goal.id)}
                              onChange={() => setEditLinkedGoals((current) => toggleSelection(current, goal.id))}
                              disabled={editSavingId === image.id}
                            />
                            <span>{goal.title}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="vision-board__field">
                    <label>Linked habits</label>
                    {habits.length === 0 ? (
                      <span className="vision-board__hint">No habits available yet.</span>
                    ) : (
                      <div className="vision-board__link-grid">
                        {habits.map((habit) => (
                          <label key={habit.id} className="vision-board__link-option">
                            <input
                              type="checkbox"
                              checked={editLinkedHabits.includes(habit.id)}
                              onChange={() => setEditLinkedHabits((current) => toggleSelection(current, habit.id))}
                              disabled={editSavingId === image.id}
                            />
                            <span>{habit.title}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="vision-board__edit-actions">
                    <button type="submit" disabled={editSavingId === image.id}>
                      {editSavingId === image.id ? 'Saving…' : 'Save updates'}
                    </button>
                    <button type="button" onClick={stopEditing} disabled={editSavingId === image.id}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </article>
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
        <div className="vision-board__modal-backdrop" onClick={stopTagging}>
          <div
            className="vision-board__modal vision-board__tag-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Tag vision image"
            tabIndex={-1}
            ref={tagModalRef}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="vision-board__tag-header">
              <h3>Tag vision image</h3>
              <p>Select the life wheel areas and visionary themes this image supports.</p>
            </header>
            <div className="vision-board__tag-section">
              <h4>Life wheel categories</h4>
              {lifeWheelAvailable ? (
                <div className="vision-board__tag-list">
                  {LIFE_WHEEL_CATEGORIES.map((category) => (
                    <label key={category.key} className="vision-board__tag-option">
                      <input
                        type="checkbox"
                        checked={lifeWheelDraft.includes(category.key)}
                        onChange={() => setLifeWheelDraft((current) => toggleSelection(current, category.key))}
                        disabled={tagSaving}
                      />
                      <span>{category.label}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="vision-board__hint">Life wheel categories are unavailable right now.</p>
              )}
            </div>
            <div className="vision-board__tag-section">
              <h4>The Four Visionaries</h4>
              {visionariesAvailable ? (
                <div className="vision-board__tag-list">
                  {FOUR_VISIONARIES.map((category) => (
                    <label key={category.key} className="vision-board__tag-option">
                      <input
                        type="checkbox"
                        checked={visionaryDraft.includes(category.key)}
                        onChange={() => setVisionaryDraft((current) => toggleSelection(current, category.key))}
                        disabled={tagSaving}
                      />
                      <span>{category.label}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="vision-board__hint">Visionary categories are unavailable right now.</p>
              )}
            </div>
            <div className="vision-board__edit-actions">
              <button type="button" onClick={handleSaveTags} disabled={tagSaving}>
                {tagSaving ? 'Saving…' : 'Save tags'}
              </button>
              <button type="button" onClick={stopTagging} disabled={tagSaving}>
                Cancel
              </button>
            </div>
          </div>
        </div>
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

      {lightboxImage && (
        <div
          className="vision-board__lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Vision image viewer"
          onClick={closeLightbox}
        >
          <button
            type="button"
            className="vision-board__lightbox-close"
            onClick={closeLightbox}
            aria-label="Close viewer"
          >
            ×
          </button>
          {filteredImages.length > 1 && (
            <button
              type="button"
              className="vision-board__lightbox-nav vision-board__lightbox-nav--prev"
              onClick={(event) => {
                event.stopPropagation();
                showPrevImage();
              }}
              aria-label="Previous image"
            >
              ‹
            </button>
          )}
          <figure
            className="vision-board__lightbox-figure"
            onClick={(event) => event.stopPropagation()}
          >
            {lightboxImage.publicUrl ? (
              <img
                src={lightboxImage.publicUrl}
                alt={lightboxImage.caption ?? 'Vision board entry'}
                className="vision-board__lightbox-image"
              />
            ) : (
              <div className="vision-board__placeholder" aria-hidden>
                <span>No preview</span>
              </div>
            )}
            {lightboxImage.caption && (
              <figcaption className="vision-board__lightbox-caption">{lightboxImage.caption}</figcaption>
            )}
            {filteredImages.length > 1 && (
              <p className="vision-board__lightbox-counter">
                {(lightboxIndex ?? 0) + 1} / {filteredImages.length}
              </p>
            )}
          </figure>
          {filteredImages.length > 1 && (
            <button
              type="button"
              className="vision-board__lightbox-nav vision-board__lightbox-nav--next"
              onClick={(event) => {
                event.stopPropagation();
                showNextImage();
              }}
              aria-label="Next image"
            >
              ›
            </button>
          )}
        </div>
      )}
    </section>
  );
}
