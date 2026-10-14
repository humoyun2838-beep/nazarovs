export type PanelTurn = { role: "user" | "assistant"; text: string };

export type FlowTurn = PanelTurn & { id: string };

export type FlowView = {
  turns: FlowTurn[];
  draft: string;
  pending: boolean;
  error: string;
  lock: boolean;
  generation: number;
  source: string;
};

export type SendResult =
  | { ok: false; view: FlowView; reason: "empty" | "locked" | "too-long" }
  | {
      ok: true;
      view: FlowView;
      query: string;
      generation: number;
      prior: FlowTurn[];
    };

const QUERY_LIMIT = 4000;

export function classifyPanelQuery(raw: string) {
  const query = raw.trim();
  if (!query) return { ok: false as const, code: "blank" as const, query };
  if (query.length > QUERY_LIMIT) {
    return { ok: false as const, code: "too-long" as const, query };
  }
  return { ok: true as const, code: "ok" as const, query };
}

export function sanitizePanelMessages(raw: unknown): PanelTurn[] {
  if (!Array.isArray(raw)) return [];
  const out: PanelTurn[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const role = (item as { role?: string }).role;
    const text = (item as { text?: string }).text;
    if ((role !== "user" && role !== "assistant") || typeof text !== "string") {
      continue;
    }
    const clean = text.trim().slice(0, 2000);
    if (clean) out.push({ role, text: clean });
  }
  return out.slice(-12);
}

export function historyForModel(history: PanelTurn[], query: string): PanelTurn[] {
  const trimmed = query.trim();
  const copy = history
    .filter(
      (turn) =>
        (turn.role === "user" || turn.role === "assistant") && turn.text.trim(),
    )
    .map((turn) => ({
      role: turn.role,
      text: turn.text.trim().slice(0, 2000),
    }));
  const last = copy[copy.length - 1];
  if (last && last.role === "user" && last.text === trimmed) copy.pop();
  return copy.slice(-8);
}

export function isSafeMarkdownHref(href: string) {
  if (!href || href !== href.trim() || /\s/.test(href)) return false;
  if (href.startsWith("//") || href.startsWith("/\\") || href.includes("\\")) {
    return false;
  }
  if (href.startsWith("/")) {
    const lower = href.toLowerCase();
    if (lower.includes("javascript:") || lower.includes("data:")) return false;
    return true;
  }
  try {
    const url = new URL(href);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function markdownHref(token: string) {
  const linked = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  if (!linked) return null;
  const href = linked[2];
  if (!isSafeMarkdownHref(href)) return null;
  return { label: linked[1], href };
}

export function assistantAccepted(
  resOk: boolean,
  data: { ok?: boolean; text?: string; source?: string; message?: string } | null,
) {
  const text = data?.text?.trim() || "";
  if (!resOk || !data?.ok || !text || data.source !== "openai") {
    return { show: false as const, text: "", error: data?.message || "" };
  }
  return { show: true as const, text, error: "" };
}

export function buildPanelRequest(
  query: string,
  prior: { id?: string; role: "user" | "assistant"; text: string }[],
) {
  return {
    action: "panel" as const,
    text: query,
    messages: prior
      .filter((turn) => turn.id !== "hello")
      .map((turn) => ({ role: turn.role, text: turn.text })),
  };
}

export function leakedPanelKeys(body: Record<string, unknown>) {
  const banned = ["password", "openaiKey", "apiKey", "geminiKey", "sessionId", "secret"];
  return banned.filter((key) => Object.prototype.hasOwnProperty.call(body, key));
}

export function takeRateSlot(
  hits: number[],
  now: number,
  limit = 20,
  windowMs = 60_000,
) {
  const recent = hits.filter((at) => now - at < windowMs);
  if (recent.length >= limit) return { ok: false, hits: recent };
  recent.push(now);
  return { ok: true, hits: recent };
}

export class PanelRateLimiter {
  private hits = new Map<string, number[]>();

  allow(id: string, now = Date.now(), limit = 20, windowMs = 60_000) {
    const slot = takeRateSlot(this.hits.get(id) || [], now, limit, windowMs);
    this.hits.set(id, slot.hits);
    return slot.ok;
  }
}

export function createFlow(hello: string): FlowView {
  return {
    turns: [{ id: "hello", role: "assistant", text: hello }],
    draft: "",
    pending: false,
    error: "",
    lock: false,
    generation: 0,
    source: "",
  };
}

export function setDraft(view: FlowView, draft: string): FlowView {
  return { ...view, draft };
}

export function attemptSend(
  view: FlowView,
  tooLongMessage: string,
  id: string,
): SendResult {
  const query = view.draft.trim();
  if (view.lock) return { ok: false, view, reason: "locked" };
  if (!query) return { ok: false, view, reason: "empty" };
  if (query.length > QUERY_LIMIT) {
    return {
      ok: false,
      view: { ...view, error: tooLongMessage },
      reason: "too-long",
    };
  }
  const userTurn: FlowTurn = { id, role: "user", text: query };
  const turns = [...view.turns, userTurn];
  const generation = view.generation + 1;
  return {
    ok: true,
    query,
    generation,
    prior: turns,
    view: {
      ...view,
      turns,
      draft: "",
      pending: true,
      error: "",
      lock: true,
      generation,
    },
  };
}

export function finishSuccess(
  view: FlowView,
  generation: number,
  id: string,
  text: string,
): FlowView {
  if (view.generation !== generation) return view;
  return {
    ...view,
    pending: false,
    lock: false,
    source: "openai",
    error: "",
    turns: [...view.turns, { id, role: "assistant", text }],
  };
}

export function finishFailure(
  view: FlowView,
  generation: number,
  message: string,
): FlowView {
  if (view.generation !== generation) return view;
  return {
    ...view,
    pending: false,
    lock: false,
    source: "",
    error: message,
  };
}

export function requestStop(view: FlowView, stopped: string): FlowView {
  return {
    ...view,
    generation: view.generation + 1,
    pending: false,
    lock: false,
    error: stopped,
  };
}

export function attemptRetry(view: FlowView): SendResult {
  if (view.lock) return { ok: false, view, reason: "locked" };
  const lastUser = [...view.turns].reverse().find((turn) => turn.role === "user");
  if (!lastUser) return { ok: false, view, reason: "empty" };
  let turns = view.turns;
  const last = turns[turns.length - 1];
  if (last?.role === "assistant" && last.id !== "hello") turns = turns.slice(0, -1);
  const generation = view.generation + 1;
  return {
    ok: true,
    query: lastUser.text,
    generation,
    prior: turns,
    view: {
      ...view,
      turns,
      pending: true,
      error: "",
      lock: true,
      generation,
    },
  };
}

export function resetChat(view: FlowView, hello: string): FlowView {
  return { ...createFlow(hello), generation: view.generation + 1 };
}

export function enterSends(key: string, shift: boolean) {
  return key === "Enter" && !shift;
}
