import { ChangeEvent, DragEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import {
  deleteVisionImage,
  fetchVisionImages,
  getVisionImagePublicUrl,
  updateVisionImage,
  uploadVisionImage,
  uploadVisionImageFromUrl,
} from '../../services/visionBoard';
import { fetchVisionImageTags, setVisionImageCategories } from '../../services/visionBoardTags';
import { VisionBoardDailyGame } from '../visionBoardDailyGame/VisionBoardDailyGame';
import type { Database } from '../../lib/database.types';
import { isDemoSession } from '../../services/demoSession';
import { fetchGoals } from '../../services/goals';
import { listHabitsV2 } from '../../services/habitsV2';
import { getDemoHabitsForUser } from '../../services/demoData';
import { convertToWebP, isWebPSupported, getFileFormat } from '../../utils/imageConverter';
import { useGamification } from '../../hooks/useGamification';
import { XP_REWARDS } from '../../types/gamification';
import { LIFE_WHEEL_CATEGORIES, type LifeWheelCategoryKey } from '../checkins/LifeWheelCheckins';

type VisionImageRow = Database['public']['Tables']['vision_images']['Row'];
type GoalRow = Database['public']['Tables']['goals']['Row'];
type HabitRow = Database['public']['Tables']['habits_v2']['Row'];

type VisionBoardProps = {
  session: Session;
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

const BOARD_VIEW_OPTIONS: { value: BoardView; label: string }[] = [
  { value: 'all', label: 'All photos' },
  { value: 'life_wheel', label: 'Life wheel categories' },
  { value: 'visionaries', label: 'The Four Visionaries' },
];

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_VISION_TYPE = 'goal';
const DEFAULT_REVIEW_INTERVAL = 30;

const VISION_TYPES = [
  { value: 'goal', label: 'Goal' },
  { value: 'habit', label: 'Habit' },
  { value: 'identity', label: 'Identity' },
  { value: 'experience', label: 'Experience' },
  { value: 'environment', label: 'Environment' },
];

const REVIEW_INTERVAL_OPTIONS = [
  { value: 7, label: 'Weekly (7 days)' },
  { value: 14, label: 'Biweekly (14 days)' },
  { value: 30, label: 'Monthly (30 days)' },
  { value: 60, label: 'Every 2 months (60 days)' },
  { value: 90, label: 'Quarterly (90 days)' },
];

function formatDateLabel(value: string | null): string {
  if (!value) return 'Not scheduled';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not scheduled';
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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

export function VisionBoard({ session }: VisionBoardProps) {
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
  const [convertingImage, setConvertingImage] = useState(false);
  const [showDailyGame, setShowDailyGame] = useState(false);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [habits, setHabits] = useState<HabitRow[]>([]);
  const [linkDataLoading, setLinkDataLoading] = useState(false);
  const [addVisionType, setAddVisionType] = useState(DEFAULT_VISION_TYPE);
  const [addReviewInterval, setAddReviewInterval] = useState(DEFAULT_REVIEW_INTERVAL);
  const [addLinkedGoals, setAddLinkedGoals] = useState<string[]>([]);
  const [addLinkedHabits, setAddLinkedHabits] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editVisionType, setEditVisionType] = useState(DEFAULT_VISION_TYPE);
  const [editReviewInterval, setEditReviewInterval] = useState(DEFAULT_REVIEW_INTERVAL);
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
        review_interval_days: record.review_interval_days ?? DEFAULT_REVIEW_INTERVAL,
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
    if (boardView === 'life_wheel' && lifeWheelAvailable) {
      if (lifeWheelFilter === 'all') {
        return sortedImages;
      }
      if (lifeWheelFilter === 'untagged') {
        return sortedImages.filter((image) => (lifeWheelTags[image.id] ?? []).length === 0);
      }
      return sortedImages.filter((image) => (lifeWheelTags[image.id] ?? []).includes(lifeWheelFilter));
    }

    if (boardView === 'visionaries' && visionariesAvailable) {
      if (visionaryFilter === 'all') {
        return sortedImages;
      }
      if (visionaryFilter === 'untagged') {
        return sortedImages.filter((image) => (visionaryTags[image.id] ?? []).length === 0);
      }
      return sortedImages.filter((image) => (visionaryTags[image.id] ?? []).includes(visionaryFilter));
    }

    return sortedImages;
  }, [
    boardView,
    sortedImages,
    lifeWheelFilter,
    visionaryFilter,
    lifeWheelTags,
    visionaryTags,
    lifeWheelAvailable,
    visionariesAvailable,
  ]);

  const dueReviewItems = useMemo(() => {
    const now = new Date();
    return sortedImages.filter((image) => {
      const interval = image.review_interval_days ?? DEFAULT_REVIEW_INTERVAL;
      const baseDate = image.last_reviewed_at ?? image.created_at;
      const nextReviewIso = addDays(baseDate, interval);
      if (!nextReviewIso) return false;
      return new Date(nextReviewIso) <= now;
    });
  }, [sortedImages]);

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

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please drop an image file (PNG, JPG, or WEBP).');
      return;
    }

    // Check file size
    if (file.size > MAX_UPLOAD_SIZE) {
      setErrorMessage('Images must be 5MB or smaller.');
      return;
    }

    // Set file and generate preview
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
    setEditReviewInterval(image.review_interval_days ?? DEFAULT_REVIEW_INTERVAL);
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

  const handleMarkReviewed = async (imageId: string) => {
    await handleUpdateImage(imageId, {
      last_reviewed_at: new Date().toISOString(),
    });
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>, imageId: string) => {
    event.preventDefault();
    setEditSavingId(imageId);
    const success = await handleUpdateImage(imageId, {
      caption: editCaption.trim() ? editCaption.trim() : null,
      vision_type: editVisionType,
      review_interval_days: editReviewInterval,
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

      if (fileDraft.size > MAX_UPLOAD_SIZE) {
        setErrorMessage('Images must be 5MB or smaller.');
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
        // Convert to WebP if supported and not already WebP
        let fileToUpload: File | Blob = fileDraft;
        let fileNameToUpload = fileDraft.name;
        let originalFormat = getFileFormat(fileDraft);

        if (isWebPSupported() && fileDraft.type !== 'image/webp') {
          try {
            setConvertingImage(true);
            const converted = await convertToWebP(fileDraft, 0.85);
            fileToUpload = converted.blob;
            fileNameToUpload = converted.fileName;
            originalFormat = converted.originalFormat;
          } catch (conversionError) {
            // Log WebP conversion failure with details
            console.group('[Vision Board] WebP conversion failed');
            console.error('Timestamp:', new Date().toISOString());
            console.error('File details:', {
              name: fileDraft.name,
              size: fileDraft.size,
              type: fileDraft.type,
            });
            console.error('Conversion error:', conversionError);
            console.groupEnd();
            console.warn('Continuing with original file format');
            // Continue with original file if conversion fails
          } finally {
            setConvertingImage(false);
          }
        }

        ({ data, error } = await uploadVisionImage({
          userId: session.user.id,
          file: fileToUpload,
          fileName: fileNameToUpload,
          caption: captionDraft,
          originalFormat,
          visionType: addVisionType,
          reviewIntervalDays: addReviewInterval,
          linkedGoalIds: addLinkedGoals,
          linkedHabitIds: addLinkedHabits,
        }));
      } else {
        ({ data, error } = await uploadVisionImageFromUrl({
          userId: session.user.id,
          imageUrl: urlDraft.trim(),
          caption: captionDraft,
          visionType: addVisionType,
          reviewIntervalDays: addReviewInterval,
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
      setAddReviewInterval(DEFAULT_REVIEW_INTERVAL);
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
      let userMessage = 'Unable to upload the image right now.';
      
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        // Storage-related errors
        if (errorMsg.includes('storage upload failed')) {
          userMessage = error.message + ' Check browser console for details.';
        }
        // Database-related errors
        else if (errorMsg.includes('database insert failed')) {
          userMessage = error.message + ' Check browser console for details.';
        }
        // Bucket not found (already has good message)
        else if (errorMsg.includes('storage bucket') && errorMsg.includes('not found')) {
          userMessage = error.message;
        }
        // Other specific errors
        else if (error.message) {
          userMessage = error.message + ' Check browser console for details.';
        }
      }
      
      setErrorMessage(userMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (record: VisionImage) => {
    if (!isConfigured && !isDemoExperience) {
      setErrorMessage('Connect Supabase to remove items from your vision board.');
      return;
    }

    const confirmed = window.confirm('Remove this vision board entry? This cannot be undone.');
    if (!confirmed) return;

    setErrorMessage(null);
    try {
      const error = await deleteVisionImage(record);
      if (error) throw error;
      setImages((current) => current.filter((item) => item.id !== record.id));
      setLifeWheelTags((current) => {
        const next = { ...current };
        delete next[record.id];
        return next;
      });
      setVisionaryTags((current) => {
        const next = { ...current };
        delete next[record.id];
        return next;
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete the entry.');
    }
  };

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
          <button
            type="button"
            className="vision-board__daily-game-button"
            onClick={() => setShowDailyGame(true)}
            disabled={!isConfigured}
          >
            🎮 Daily Vision Game
          </button>
        </div>
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

      <div className="vision-board__add-edit">
        <button
          type="button"
          className="vision-board__add-edit-toggle"
          onClick={() => setIsAddEditOpen(!isAddEditOpen)}
          aria-expanded={isAddEditOpen}
        >
          <span className="vision-board__add-edit-icon">{isAddEditOpen ? '−' : '+'}</span>
          Add/Edit
        </button>
        
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
                      accept="image/png, image/jpeg, image/webp, image/gif"
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
                  PNG, JPG, WEBP, or GIF up to 5MB. Images will be converted to WebP format for optimal performance.
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
              <label htmlFor="vision-board-review-interval">Review interval</label>
              <select
                id="vision-board-review-interval"
                value={addReviewInterval}
                onChange={(event) => setAddReviewInterval(Number(event.target.value))}
                disabled={(!isConfigured && !isDemoExperience) || uploading}
              >
                {REVIEW_INTERVAL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="vision-board__hint">
                Choose how often this vision should be revisited in your review loop.
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
              disabled={uploading || convertingImage || (!isConfigured && !isDemoExperience)}
            >
              {convertingImage ? 'Converting to WebP…' : uploading ? 'Uploading…' : 'Add to board'}
            </button>
          </form>
        )}
      </div>

      {(isConfigured || isDemoExperience) && (
        <section className="vision-board__review">
          <div className="vision-board__review-header">
            <div>
              <h3>Vision review loop</h3>
              <p>
                Review entries due for a refresh to keep your Game of Life board aligned with your active goals and habits.
              </p>
            </div>
            <span className="vision-board__review-count">{dueReviewItems.length} due</span>
          </div>
          {dueReviewItems.length === 0 ? (
            <p className="vision-board__empty">All caught up—no reviews due right now.</p>
          ) : (
            <div className="vision-board__review-list">
              {dueReviewItems.map((image) => {
                const nextReview = addDays(
                  image.last_reviewed_at ?? image.created_at,
                  image.review_interval_days ?? DEFAULT_REVIEW_INTERVAL,
                );
                return (
                  <article key={image.id} className="vision-board__review-card">
                    <div className="vision-board__review-info">
                      <h4>{image.caption || 'Vision board entry'}</h4>
                      <p className="vision-board__review-meta">
                        Type: {getVisionTypeLabel(image.vision_type)} · Next review {formatDateLabel(nextReview)}
                      </p>
                      <p className="vision-board__review-prompt">
                        Prompt: Confirm this still supports your Game of Life focus, or update links if it needs a new home.
                      </p>
                    </div>
                    <div className="vision-board__review-actions">
                      <button type="button" onClick={() => startEditing(image)} disabled={editSavingId === image.id}>
                        Update details
                      </button>
                      <button type="button" onClick={() => handleMarkReviewed(image.id)} disabled={editSavingId === image.id}>
                        Mark reviewed
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {(isConfigured || isDemoExperience) && boardView === 'life_wheel' && (
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

      {(isConfigured || isDemoExperience) && boardView === 'visionaries' && (
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
            <article key={image.id} className="vision-board__card" role="listitem">
              <div className="vision-board__card-image-container">
                {image.publicUrl ? (
                  <img src={image.publicUrl} alt={image.caption ?? 'Vision board entry'} loading="lazy" />
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
                const nextReview = addDays(
                  image.last_reviewed_at ?? image.created_at,
                  image.review_interval_days ?? DEFAULT_REVIEW_INTERVAL,
                );
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
                      <span className="vision-board__chip">
                        Review every {image.review_interval_days ?? DEFAULT_REVIEW_INTERVAL} days
                      </span>
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
                    <p className="vision-board__card-review">Next review: {formatDateLabel(nextReview)}</p>
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
                    <label htmlFor={`vision-edit-review-${image.id}`}>Review interval</label>
                    <select
                      id={`vision-edit-review-${image.id}`}
                      value={editReviewInterval}
                      onChange={(event) => setEditReviewInterval(Number(event.target.value))}
                      disabled={editSavingId === image.id}
                    >
                      {REVIEW_INTERVAL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
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

      {showDailyGame && (
        <div className="vision-board__modal-backdrop" role="dialog" aria-modal="true">
          <div className="vision-board__modal">
            <VisionBoardDailyGame session={session} onClose={() => setShowDailyGame(false)} isConfigured={isConfigured} />
          </div>
        </div>
      )}

      {taggingImage && (
        <div className="vision-board__modal-backdrop" role="dialog" aria-modal="true">
          <div className="vision-board__modal vision-board__tag-modal">
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
    </section>
  );
}
