// Quick Log Modal - Fast exercise logging interface
import { useState, useEffect } from 'react';
import { COMMON_EXERCISES, MUSCLE_GROUPS } from './constants';
import type { ExerciseLog, MuscleGroup, FocusRecommendation } from './types';

interface QuickLogModalProps {
  onClose: () => void;
  onSave: (log: Omit<ExerciseLog, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  initialData?: Partial<Omit<ExerciseLog, 'id' | 'user_id' | 'created_at'>> | null;
  focusRecommendations?: FocusRecommendation | null;
}

export function QuickLogModal({ onClose, onSave, initialData, focusRecommendations }: QuickLogModalProps) {
  const [exerciseName, setExerciseName] = useState(initialData?.exercise_name || '');
  const [muscleGroups, setMuscleGroups] = useState<string[]>(initialData?.muscle_groups || []);
  const [reps, setReps] = useState(initialData?.reps?.toString() || '');
  const [sets, setSets] = useState(initialData?.sets?.toString() || '');
  const [weightKg, setWeightKg] = useState(initialData?.weight_kg?.toString() || '');
  const [durationMinutes, setDurationMinutes] = useState(initialData?.duration_minutes?.toString() || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Filter autocomplete suggestions
  const suggestions = exerciseName
    ? COMMON_EXERCISES.filter((ex) =>
        ex.name.toLowerCase().includes(exerciseName.toLowerCase())
      ).slice(0, 5)
    : [];

  // Handle exercise selection from autocomplete
  const selectExercise = (name: string, defaultMuscles: MuscleGroup[]) => {
    setExerciseName(name);
    setMuscleGroups(defaultMuscles);
    setShowAutocomplete(false);
  };
  
  // Handle focus chip click
  const handleFocusChipClick = (exerciseName: string) => {
    const exercise = COMMON_EXERCISES.find((ex) => ex.name === exerciseName);
    if (exercise) {
      selectExercise(exercise.name, exercise.defaultMuscles);
    }
  };

  // Toggle muscle group selection
  const toggleMuscle = (muscle: string) => {
    setMuscleGroups((prev) =>
      prev.includes(muscle)
        ? prev.filter((m) => m !== muscle)
        : [...prev, muscle]
    );
  };

  // Handle save
  const handleSave = async () => {
    if (!exerciseName.trim()) {
      setToast({ type: 'warning', message: 'Please enter an exercise name' });
      return;
    }

    setSaving(true);
    try {
      await onSave({
        exercise_name: exerciseName.trim(),
        muscle_groups: muscleGroups,
        reps: reps ? parseInt(reps, 10) : null,
        sets: sets ? parseInt(sets, 10) : null,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        duration_minutes: durationMinutes ? parseFloat(durationMinutes) : null,
        notes: notes.trim() || null,
        logged_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error saving log:', error);
      setToast({ type: 'error', message: 'Failed to save workout. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal" style={{ display: 'flex' }}>
      <div className="modal-backdrop" onClick={onClose} />
      <section className="modal__panel card glass">
        <h2 className="card__title" style={{ marginBottom: 'var(--space-4)' }}>
          {initialData ? '🔄 Repeat Workout' : '⚡ Quick Log'}
        </h2>

        {/* Toast Notification */}
        {toast && (
          <div className={`training-toast training-toast--${toast.type}`}>
            {toast.message}
          </div>
        )}

        <div className="quick-log-form">
          {/* Focus Recommendations Section */}
          {focusRecommendations && focusRecommendations.recommendedExercises.length > 0 && (
            <div className="focus-recommendations">
              <div className="focus-recommendations__header">
                📌 Recommended for your focus
              </div>
              <div className="focus-recommendations__list">
                {focusRecommendations.recommendedExercises.slice(0, 6).map((exercise) => (
                  <button
                    key={exercise}
                    type="button"
                    className="focus-chip"
                    onClick={() => handleFocusChipClick(exercise)}
                  >
                    {exercise}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Exercise Name with Autocomplete */}
          <div className="form-group">
            <label htmlFor="exercise-name">Exercise *</label>
            <div className="autocomplete-container">
              <input
                id="exercise-name"
                type="text"
                value={exerciseName}
                onChange={(e) => {
                  setExerciseName(e.target.value);
                  setShowAutocomplete(true);
                }}
                onFocus={() => setShowAutocomplete(true)}
                placeholder="e.g., Bench Press, Squats"
              />
              {showAutocomplete && suggestions.length > 0 && (
                <div className="autocomplete-list">
                  {suggestions.map((ex) => (
                    <div
                      key={ex.name}
                      className="autocomplete-item"
                      onClick={() => selectExercise(ex.name, ex.defaultMuscles)}
                    >
                      {ex.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Reps, Sets, Weight, Duration */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="reps">Reps</label>
              <input
                id="reps"
                type="number"
                min="0"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="10"
              />
            </div>
            <div className="form-group">
              <label htmlFor="sets">Sets</label>
              <input
                id="sets"
                type="number"
                min="0"
                value={sets}
                onChange={(e) => setSets(e.target.value)}
                placeholder="3"
              />
            </div>
            <div className="form-group">
              <label htmlFor="weight">Weight (kg)</label>
              <input
                id="weight"
                type="number"
                min="0"
                step="0.5"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="50"
              />
            </div>
            <div className="form-group">
              <label htmlFor="duration">Duration (min)</label>
              <input
                id="duration"
                type="number"
                min="0"
                step="0.5"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="30"
              />
            </div>
          </div>

          {/* Muscle Groups */}
          <div className="form-group">
            <label>Muscle Groups</label>
            <div className="muscle-groups">
              {MUSCLE_GROUPS.map((muscle) => (
                <button
                  key={muscle.value}
                  type="button"
                  className={`muscle-pill ${
                    muscleGroups.includes(muscle.value) ? 'muscle-pill--selected' : ''
                  }`}
                  onClick={() => toggleMuscle(muscle.value)}
                >
                  <span className="muscle-pill__emoji">{muscle.emoji}</span>
                  {muscle.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label htmlFor="notes">Notes (optional)</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it feel? Any observations?"
            />
          </div>
        </div>

        <div className="modal__actions">
          <button className="btn btn--ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="btn btn--primary"
            onClick={handleSave}
            disabled={saving || !exerciseName.trim()}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </section>
    </div>
  );
}
