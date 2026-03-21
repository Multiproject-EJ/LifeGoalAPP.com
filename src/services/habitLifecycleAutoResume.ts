import { scheduleHabitNotifications } from './habitAlertNotifications';
import { getHabitLifecycleStatus, listHabitsV2, resumeHabitV2, type HabitV2Row } from './habitsV2';

export function isHabitReadyToResume(habit: HabitV2Row): boolean {
  if (getHabitLifecycleStatus(habit) !== 'paused' || !habit.resume_on) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const resumeOn = new Date(habit.resume_on);
  resumeOn.setHours(0, 0, 0, 0);
  return resumeOn.getTime() <= today.getTime();
}

export async function autoResumeDueHabits(userId: string): Promise<HabitV2Row[]> {
  const { data: habits, error } = await listHabitsV2({ includeInactive: true });
  if (error) {
    throw error;
  }

  const dueHabits = (habits ?? []).filter((habit) => isHabitReadyToResume(habit));
  if (!dueHabits.length) {
    return [];
  }

  const resumed: HabitV2Row[] = [];
  for (const habit of dueHabits) {
    const result = await resumeHabitV2(habit.id);
    if (result.error || !result.data) {
      throw result.error ?? new Error(`Unable to auto-resume ${habit.title}.`);
    }
    resumed.push(result.data);
    await scheduleHabitNotifications(habit.id, userId);
  }

  return resumed;
}
