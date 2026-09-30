export type ChatStarRating = 1 | 2 | 3 | 4 | 5;

export type ChatStarCounts = {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
};

export const STAR_SQL = `CASE
  WHEN rating IN ('1','2','3','4','5') THEN CAST(rating AS INTEGER)
  WHEN rating = 'good' THEN 5
  WHEN rating = 'bad' THEN 1
  ELSE NULL
END`;

export function emptyStarCounts(): ChatStarCounts {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

export function normalizeStarRating(value: unknown): ChatStarRating | null {
  const n =
    typeof value === "number"
      ? value
      : Number.parseInt(String(value ?? "").trim(), 10);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return null;
}

export function ratingFromStored(
  value: string | number | null | undefined,
): ChatStarRating | null {
  if (value === "good") return 5;
  if (value === "bad") return 1;
  if (value == null || value === "") return null;
  return normalizeStarRating(value);
}

export function publicRating(
  value: string | number | null | undefined,
): string {
  const n = ratingFromStored(value);
  return n ? String(n) : "";
}

export function starLabel(value: string | number | null | undefined): string {
  const n = ratingFromStored(value);
  return n ? `${n}/5` : "";
}

export function roundStarAvg(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 10) / 10;
}
