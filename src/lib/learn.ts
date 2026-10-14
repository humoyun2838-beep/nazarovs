import { sqlite } from "@/db";

export type LearnRow = {
  slug: string;
  seenAt: string;
  doneAt: string;
  savedAt: string;
};

export function listLearn(userId: number): LearnRow[] {
  if (!userId) return [];
  const rows = sqlite
    .prepare(
      `SELECT slug, seen_at, done_at, saved_at FROM lesson_progress WHERE user_id = ? ORDER BY seen_at DESC`,
    )
    .all(userId) as Array<{
    slug: string;
    seen_at: string;
    done_at: string;
    saved_at: string;
  }>;
  return rows.map((row) => ({
    slug: row.slug,
    seenAt: row.seen_at,
    doneAt: row.done_at,
    savedAt: row.saved_at,
  }));
}

export function saveLearn(
  userId: number,
  slug: string,
  patch: { seen?: boolean; done?: boolean; saved?: boolean },
) {
  const clean = slug.trim().slice(0, 180);
  if (!userId || !clean) return { ok: false as const };
  const now = new Date().toISOString();
  const current = sqlite
    .prepare(
      `SELECT seen_at, done_at, saved_at FROM lesson_progress WHERE user_id = ? AND slug = ?`,
    )
    .get(userId, clean) as
    | { seen_at: string; done_at: string; saved_at: string }
    | undefined;
  const seenAt = patch.seen ? now : current?.seen_at || (patch.done ? now : "");
  const doneAt = patch.done ? now : current?.done_at || "";
  const savedAt =
    patch.saved === true ? now : patch.saved === false ? "" : current?.saved_at || "";
  sqlite
    .prepare(
      `INSERT INTO lesson_progress (user_id, slug, seen_at, done_at, saved_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, slug) DO UPDATE SET
         seen_at = excluded.seen_at,
         done_at = excluded.done_at,
         saved_at = excluded.saved_at`,
    )
    .run(userId, clean, seenAt || now, doneAt, savedAt);
  return { ok: true as const };
}
