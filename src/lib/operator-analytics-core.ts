import type Database from "better-sqlite3";

export type OperatorRank = {
  id: number; fullName: string; username: string; status: string;
  messages: number; closed: number; activeSeconds: number; online: boolean;
};

// Server time only. One shared interval per operator prevents multi-tab double counting.
export function recordOperatorHeartbeat(db: Database.Database, userId: number, now = Date.now(), active = true) {
  return db.transaction(() => {
    const previous = db.prepare("SELECT id, ended_at, is_open FROM operator_work_intervals WHERE user_id = ? ORDER BY ended_at DESC LIMIT 1").get(userId) as { id: number; ended_at: number; is_open: number } | undefined;
    if (!active) {
      if (previous) db.prepare("UPDATE operator_work_intervals SET is_open = 0 WHERE id = ?").run(previous.id);
      return;
    }
    if (previous?.is_open && now >= previous.ended_at && now - previous.ended_at <= 45_000) {
      db.prepare("UPDATE operator_work_intervals SET ended_at = ? WHERE id = ?").run(now, previous.id);
    } else if (!previous || now > previous.ended_at) {
      db.prepare("INSERT INTO operator_work_intervals(user_id, started_at, ended_at) VALUES(?,?,?)").run(userId, now, now);
    }
  })();
}

export function readOperatorRanking(db: Database.Database, range: { from?: string; to?: string }, now = Date.now()): OperatorRank[] {
  // Selected calendar dates use Uzbekistan time; messages and closures use their own event date.
  const start = range.from ? Date.parse(`${range.from}T00:00:00+05:00`) : 0;
  const end = range.to ? Date.parse(`${range.to}T00:00:00+05:00`) + 86_400_000 : now + 1;
  const fromIso = new Date(start).toISOString(), toIso = new Date(end).toISOString();
  const rows = db.prepare(`
    SELECT u.id, u.full_name AS fullName, u.username, u.status,
      COALESCE(m.messages, 0) AS messages, COALESCE(c.closed, 0) AS closed,
      COALESCE(w.activeSeconds, 0) AS activeSeconds,
      CASE WHEN u.status = 'active' AND p.lastSeen >= ? AND p.isOpen = 1 THEN 1 ELSE 0 END AS online
    FROM users u
    LEFT JOIN (SELECT actor_user_id, COUNT(*) AS messages FROM chat_messages
      WHERE role = 'dmed' AND actor_user_id > 0 AND created_at >= ? AND created_at < ?
      GROUP BY actor_user_id) m ON m.actor_user_id = u.id
    LEFT JOIN (SELECT closed_by_user_id, COUNT(*) AS closed FROM chat_sessions
      WHERE status = 'closed' AND closed_at >= ? AND closed_at < ?
      GROUP BY closed_by_user_id) c ON c.closed_by_user_id = u.id
    LEFT JOIN (SELECT user_id, SUM(MAX(0, MIN(ended_at, ?) - MAX(started_at, ?))) / 1000.0 AS activeSeconds
      FROM operator_work_intervals WHERE ended_at >= ? AND started_at < ? GROUP BY user_id) w ON w.user_id = u.id
    LEFT JOIN (SELECT user_id, MAX(ended_at) AS lastSeen, is_open AS isOpen FROM operator_work_intervals GROUP BY user_id) p ON p.user_id = u.id
    WHERE u.role = 'operator'
    ORDER BY closed DESC, messages DESC, activeSeconds DESC, u.id ASC
  `).all(now - 45_000, fromIso, toIso, fromIso, toIso, end, start, start, end) as Array<Omit<OperatorRank, "online"> & { online: number }>;
  return rows.map(row => ({ ...row, fullName: row.fullName || row.username, activeSeconds: Math.floor(row.activeSeconds), online: Boolean(row.online) }));
}
