import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import {
  deleteVisionImage,
  fetchVisionImages,
  getVisionImagePublicUrl,
  uploadVisionImage,
} from '../../services/visionBoard';
import type { Database } from '../../lib/database.types';

type VisionImageRow = Database['public']['Tables']['vision_images']['Row'];

type VisionBoardProps = {
  session: Session;
};

type SortMode = 'newest' | 'oldest' | 'caption';

type VisionImage = VisionImageRow & { publicUrl: string };

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB

export function VisionBoard({ session }: VisionBoardProps) {
  const { isConfigured, mode } = useSupabaseAuth();
  const isDemoMode = mode === 'demo';
  const [images, setImages] = useState<VisionImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileDraft, setFileDraft] = useState<File | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const loadImages = useCallback(async () => {
    if (!isConfigured && !isDemoMode) {
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
        publicUrl: record.image_path ? getVisionImagePublicUrl(record.image_path) : '',
      }));
      setImages(mapped);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load your vision board.');
    } finally {
      setHasLoadedOnce(true);
      setLoading(false);
    }
  }, [isConfigured, isDemoMode, session.user.id]);

  useEffect(() => {
    if (!session || (!isConfigured && !isDemoMode)) {
      return;
    }
    loadImages();
  }, [session?.user?.id, isConfigured, isDemoMode, loadImages]);

  useEffect(() => {
    if (!isConfigured && !isDemoMode) {
      setImages([]);
      setHasLoadedOnce(false);
    }
  }, [isConfigured, isDemoMode]);

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

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setFileDraft(file);
  };

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!session) {
      setErrorMessage('You need to sign in to curate your vision board.');
      return;
    }

    if (!isConfigured && !isDemoMode) {
      setErrorMessage('Supabase credentials are missing. Update your environment variables to continue.');
      return;
    }

    if (!fileDraft) {
      setErrorMessage('Choose an image to upload.');
      return;
    }

    if (fileDraft.size > MAX_UPLOAD_SIZE) {
      setErrorMessage('Images must be 5MB or smaller.');
      return;
    }

    setUploading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await uploadVisionImage({
        userId: session.user.id,
        file: fileDraft,
        fileName: fileDraft.name,
        caption: captionDraft,
      });
      if (error) throw error;

      if (data) {
        setImages((current) => [
          {
            ...data,
            publicUrl: data.image_path ? getVisionImagePublicUrl(data.image_path) : '',
          },
          ...current,
        ]);
      }
      setFileDraft(null);
      setCaptionDraft('');
      (event.target as HTMLFormElement).reset();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to upload the image right now.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (record: VisionImage) => {
    if (!isConfigured && !isDemoMode) {
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
      </header>

      {isDemoMode ? (
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

      <form className="vision-board__form" onSubmit={handleUpload}>
        <div className="vision-board__field">
          <label htmlFor="vision-board-file">Image</label>
          <input
            id="vision-board-file"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={(!isConfigured && !isDemoMode) || uploading}
            required
          />
          <span className="vision-board__hint">PNG, JPG, or WEBP up to 5MB.</span>
        </div>
        <div className="vision-board__field">
          <label htmlFor="vision-board-caption">Caption</label>
          <input
            id="vision-board-caption"
            type="text"
            value={captionDraft}
            onChange={(event) => setCaptionDraft(event.target.value)}
            placeholder="Describe why this image matters"
            disabled={(!isConfigured && !isDemoMode) || uploading}
          />
        </div>
        <button
          type="submit"
          className="vision-board__submit"
          disabled={uploading || (!isConfigured && !isDemoMode)}
        >
          {uploading ? 'Uploading…' : 'Add to board'}
        </button>
      </form>

      <div className="vision-board__grid" role="list">
        {!isConfigured && !isDemoMode ? (
          <p className="vision-board__empty">Connect Supabase to sync your gallery.</p>
        ) : loading && !hasLoadedOnce ? (
          <p className="vision-board__empty">Loading your inspiration…</p>
        ) : sortedImages.length === 0 ? (
          <p className="vision-board__empty">No images yet—upload your first motivator to get started.</p>
        ) : (
          sortedImages.map((image) => (
            <article key={image.id} className="vision-board__card" role="listitem">
              {image.publicUrl ? (
                <img src={image.publicUrl} alt={image.caption ?? 'Vision board entry'} loading="lazy" />
              ) : (
                <div className="vision-board__placeholder" aria-hidden>
                  <span>No preview</span>
                </div>
              )}
              <div className="vision-board__card-body">
                <p>{image.caption ?? 'Untitled inspiration'}</p>
                <button
                  type="button"
                  onClick={() => handleDelete(image)}
                  className="vision-board__delete"
                  disabled={!isConfigured && !isDemoMode}
                >
                  Remove
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
