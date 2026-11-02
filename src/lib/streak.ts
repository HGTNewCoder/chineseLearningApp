/** Local calendar day as YYYY-MM-DD. */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Consecutive days with any activity, ending today. A streak that reached
 * yesterday is still alive until today is over.
 */
export function currentStreak(activity: Record<string, number>, today: Date): number {
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!activity[dayKey(day)]) day.setDate(day.getDate() - 1);
  let streak = 0;
  while (activity[dayKey(day)] > 0) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}

export function addActivity(activity: Record<string, number>, now: Date, count = 1): Record<string, number> {
  const key = dayKey(now);
  return { ...activity, [key]: (activity[key] ?? 0) + count };
}
