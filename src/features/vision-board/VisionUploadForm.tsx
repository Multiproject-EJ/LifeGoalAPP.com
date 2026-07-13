import { ChangeEvent, DragEvent, FormEvent, useState } from 'react';
import type { Database } from '../../lib/database.types';
import { uploadVisionImage, uploadVisionImageFromUrl } from '../../services/visionBoard';
import { validateImageUploadFile } from '../../utils/imageUploadOptimizer';
import { DEFAULT_VISION_TYPE, VISION_TYPES } from './visionTypes';

type VisionImageRow = Database['public']['Tables']['vision_images']['Row'];
type GoalRow = Database['public']['Tables']['goals']['Row'];
type HabitRow = Database['public']['Tables']['habits_v2']['Row'];

type VisionUploadFormProps = {
  userId: string;
  canUpload: boolean;
  goals: GoalRow[];
  habits: HabitRow[];
  linkDataLoading: boolean;
  onUploaded: (data: VisionImageRow) => void;
  onError: (message: string | null) => void;
};

function toggle<T extends string>(current: T[], id: T): T[] {
  return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
}

/**
 * The "Add/Edit" upload form: file drag-drop or URL, caption, vision type, and
 * goal/habit links. Owns its own draft state and performs the upload; the
 * parent prepends the new record and awards XP via onUploaded.
 */
export function VisionUploadForm({
  userId,
  canUpload,
  goals,
  habits,
  linkDataLoading,
  onUploaded,
  onError,
}: VisionUploadFormProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [fileDraft, setFileDraft] = useState<File | null>(null);
  const [urlDraft, setUrlDraft] = useState('');
  const [captionDraft, setCaptionDraft] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [visionType, setVisionType] = useState(DEFAULT_VISION_TYPE);
  const [linkedGoals, setLinkedGoals] = useState<string[]>([]);
  const [linkedHabits, setLinkedHabits] = useState<string[]>([]);

  const inputsDisabled = !canUpload || uploading;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (file) {
      try {
        validateImageUploadFile(file);
      } catch (error) {
        onError(error instanceof Error ? error.message : 'Please choose a valid image file.');
        event.target.value = '';
        setFileDraft(null);
        setPreviewUrl(null);
        return;
      }
    }

    onError(null);
    setFileDraft(file);

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
    if (!uploading && canUpload) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    if (!canUpload) return;

    const file = event.dataTransfer.files[0];
    if (!file) return;

    try {
      validateImageUploadFile(file);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Please drop a JPG, PNG, or WebP image.');
      return;
    }

    onError(null);
    setFileDraft(file);
    setUploadMode('file');

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlChange = (value: string) => {
    setUrlDraft(value);
    if (value.trim()) {
      setPreviewUrl(value.trim());
    } else {
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canUpload) {
      onError('Supabase credentials are missing. Update your environment variables to continue.');
      return;
    }

    if (uploadMode === 'file') {
      if (!fileDraft) {
        onError('Choose an image to upload.');
        return;
      }
      try {
        validateImageUploadFile(fileDraft);
      } catch (error) {
        onError(error instanceof Error ? error.message : 'Please choose a valid image file.');
        return;
      }
    } else {
      if (!urlDraft.trim()) {
        onError('Enter an image URL.');
        return;
      }
      try {
        new URL(urlDraft.trim());
      } catch {
        onError('Enter a valid URL.');
        return;
      }
    }

    setUploading(true);
    onError(null);

    try {
      let data;
      let error;

      if (uploadMode === 'file' && fileDraft) {
        ({ data, error } = await uploadVisionImage({
          userId,
          file: fileDraft,
          fileName: fileDraft.name,
          caption: captionDraft,
          visionType,
          linkedGoalIds: linkedGoals,
          linkedHabitIds: linkedHabits,
        }));
      } else {
        ({ data, error } = await uploadVisionImageFromUrl({
          userId,
          imageUrl: urlDraft.trim(),
          caption: captionDraft,
          visionType,
          linkedGoalIds: linkedGoals,
          linkedHabitIds: linkedHabits,
        }));
      }

      if (error) throw error;

      if (data) {
        onUploaded(data);
      }

      setFileDraft(null);
      setUrlDraft('');
      setCaptionDraft('');
      setPreviewUrl(null);
      setVisionType(DEFAULT_VISION_TYPE);
      setLinkedGoals([]);
      setLinkedHabits([]);
      (event.target as HTMLFormElement).reset();
    } catch (error) {
      // Enhanced error logging for debugging
      console.group('[Vision Board] Upload failed');
      console.error('Timestamp:', new Date().toISOString());
      console.error('User ID:', userId);
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

        if (errorMsg.includes('storage upload failed')) {
          userMessage = error.message + CONSOLE_GUIDANCE;
        } else if (errorMsg.includes('database insert failed')) {
          userMessage = error.message + CONSOLE_GUIDANCE;
        } else if (errorMsg.includes('storage bucket') && errorMsg.includes('not found')) {
          userMessage = error.message;
        } else if (error.message) {
          userMessage = error.message + CONSOLE_GUIDANCE;
        }
      }

      onError(userMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form className="vision-board__form" onSubmit={handleSubmit}>
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
              disabled={inputsDisabled}
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
              disabled={inputsDisabled}
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
                disabled={inputsDisabled}
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
            disabled={inputsDisabled}
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
          disabled={inputsDisabled}
        />
      </div>
      <div className="vision-board__field">
        <label htmlFor="vision-board-type">Vision type</label>
        <select
          id="vision-board-type"
          value={visionType}
          onChange={(event) => setVisionType(event.target.value)}
          disabled={inputsDisabled}
        >
          {VISION_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <span className="vision-board__hint">Tag each image to reflect the Game of Life focus it supports.</span>
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
                  checked={linkedGoals.includes(goal.id)}
                  onChange={() => setLinkedGoals((current) => toggle(current, goal.id))}
                  disabled={inputsDisabled}
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
                  checked={linkedHabits.includes(habit.id)}
                  onChange={() => setLinkedHabits((current) => toggle(current, habit.id))}
                  disabled={inputsDisabled}
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
      <button type="submit" className="vision-board__submit" disabled={inputsDisabled}>
        {uploading ? 'Optimizing & uploading…' : 'Add to board'}
      </button>
    </form>
  );
}
