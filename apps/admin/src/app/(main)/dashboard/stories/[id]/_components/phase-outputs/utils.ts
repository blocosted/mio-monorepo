/**
 * Phase Output Utilities
 */

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatDate(dateString: string | undefined): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString();
}
