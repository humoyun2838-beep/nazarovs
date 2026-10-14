import { sqlite } from "@/db";
import {
  adminAiCodeFromStatus,
  adminAiFailure,
  type AdminAiErrorCode,
} from "@/lib/admin-ai-errors";
import { extractMediaFromContent } from "@/lib/media-blocks";
import type { Locale } from "@/lib/locale";
import { historyForModel } from "@/lib/admin-ai-flow";
import { languageName } from "@/lib/ui-copy";
import { getSetting, setSetting } from "@/lib/settings";

export type AiChatTurn = { role: "user" | "assistant"; text: string };

const OPENAI_SETTING = "openai_api_key";
const GEMINI_SETTING = "gemini_api_key";

function geminiModel() {
  return process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
}

function tokensOf(value: string) {
  const stop = new Set(["bu", "va", "mi", "da", "ga", "ni", "ham", "yo", "yok"]);
  return (value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s/-]/gu, " ")
    .split(/\s+/)
    .filter((part) => part.length >= 2 && !stop.has(part))
    .slice(0, 8);
}

export function openaiKey() {
  return (
    getSetting(OPENAI_SETTING) ||
    process.env.OPENAI_API_KEY?.trim() ||
    ""
  );
}

export function geminiKey() {
  return (
    getSetting(GEMINI_SETTING) ||
    process.env.GEMINI_API_KEY?.trim() ||
    ""
  );
}

export function hasAiKey() {
  return Boolean(openaiKey() || geminiKey());
}

export function isAiBillingError(raw: string) {
  const text = (raw || "").toLowerCase();
  return (
    text.includes("credit") ||
    text.includes("quota") ||
    text.includes("billing") ||
    text.includes("insufficient") ||
    text.includes("exceeded your current quota")
  );
}

export function isAiBusyError(raw: string) {
  const text = (raw || "").toLowerCase();
  return (
    text.includes("high demand") ||
    text.includes("try again later") ||
    text.includes("resource_exhausted") ||
    text.includes("overloaded") ||
    text.includes("unavailable") ||
    text.includes("503") ||
    text.includes("429")
  );
}

export function friendlyAiError(raw: string) {
  if (isAiBillingError(raw)) {
    return "ChatGPT hisobida mablag‘ yo‘q. Kalit to‘g‘ri, lekin OpenAI’da kredit tugagan. platform.openai.com → Billing ga kiring va kredit qo‘shing.";
  }
  if (isAiBusyError(raw)) {
    return "Gemini hozir band (ko‘p so‘rov). Bir-ikki soniyadan keyin yana yuboring.";
  }
  const clean = (raw || "").trim();
  if (!clean || clean === "empty") {
    return "AI javob qaytarmadi. Kalit va hisobni tekshiring.";
  }
  return clean.length > 280 ? `${clean.slice(0, 277)}…` : clean;
}

export function maskSecret(value: string) {
  const key = value.trim();
  if (!key) return "";
  if (key.length < 10) return "ulangan";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

export function aiKeyStatus() {
  const openai = openaiKey();
  const gemini = geminiKey();
  return {
    hasOpenAi: Boolean(openai),
    hasGemini: Boolean(gemini),
    openaiHint: maskSecret(openai),
    geminiHint: maskSecret(gemini),
  };
}

export function setOpenAiKey(raw: string) {
  const key = raw.trim();
  setSetting(OPENAI_SETTING, key);
  if (key) process.env.OPENAI_API_KEY = key;
  else delete process.env.OPENAI_API_KEY;
  return aiKeyStatus();
}

export function setGeminiKey(raw: string) {
  const key = raw.trim();
  setSetting(GEMINI_SETTING, key);
  if (key) process.env.GEMINI_API_KEY = key;
  else delete process.env.GEMINI_API_KEY;
  return aiKeyStatus();
}

type CatalogRow = {
  title: string;
  slug: string;
  summary: string;
  category: string;
  text: string;
};

export function catalogContextForQuery(query: string, limit = 6): CatalogRow[] {
  const cap = Math.max(1, Math.min(limit, 8));
  const tokens = tokensOf(query);
  if (!tokens.length) return [];
  type Raw = {
    title: string;
    slug: string;
    summary: string;
    category: string;
    snippet: string;
  };

  const focus = [...tokens].sort((a, b) => b.length - a.length)[0];
  const clause = tokens
    .map(
      () =>
        "(instr(lower(m.title), ?) OR instr(lower(m.summary), ?) OR instr(lower(c.title), ?) OR instr(lower(m.content), ?))",
    )
    .join(" OR ");
  const params = [focus, ...tokens.flatMap((token) => [token, token, token, token])];
  const raw = sqlite
    .prepare(
      `
      SELECT m.title, m.slug, m.summary, c.title AS category,
        substr(m.content, MAX(1, instr(lower(m.content), ?) - 120), 700) AS snippet
      FROM materials m
      JOIN categories c ON c.id = m.category_id
      WHERE ${clause}
      LIMIT 24
      `,
    )
    .all(...params) as Raw[];

  const scored = raw.map((row) => {
    const body = extractMediaFromContent(row.snippet || "").text.toLowerCase();
    const hay = `${row.title} ${row.summary} ${row.category}`.toLowerCase();
    let score = 0;
    for (const token of tokens) {
      if (hay.includes(token)) score += token.length > 4 ? 3 : 2;
      else if (body.includes(token)) score += 2;
    }
    return { ...row, score };
  });
  scored.sort((a, b) => b.score - a.score);

  return scored
    .filter((row) => row.score > 0)
    .slice(0, cap)
    .map((row) => ({
      title: row.title,
      slug: row.slug,
      summary: row.summary || "",
      category: row.category,
      text: extractMediaFromContent(row.snippet || "")
        .text.replace(/\s+/g, " ")
        .trim()
        .slice(0, 720),
    }));
}

function formatCatalog(rows: CatalogRow[]) {
  if (!rows.length) return "";
  return rows
    .map(
      (row, index) =>
        `${index + 1}. ${row.title} (bo‘lim: ${row.category})\nHavola: /m/${row.slug}\n${row.summary}\n${row.text}`,
    )
    .join("\n\n");
}

function localCatalogAnswer(query: string, rows: CatalogRow[]) {
  const asked = query.trim().replace(/\s+/g, " ").slice(0, 140);
  if (!rows.length) {
    return [
      `“${asked}” bo‘yicha katalogdan to‘g‘ridan-to‘g‘ri mos dars chiqmadi.`,
      "Bo‘limlar ro‘yxatidan o‘z kasbingizni oching yoki savolni aniqroq yozing, masalan: “shifokor bemorni qabulga yozish”.",
      "Keyingi qadam: /nazarov sahifasida kerakli bo‘limni tanlang.",
    ].join("\n\n");
  }
  const top = rows[0];
  const body = (top.text || top.summary || "").replace(/\s+/g, " ").trim();
  const links = rows
    .slice(0, 3)
    .map((row) => `• ${row.title} (${row.category}) — /m/${row.slug}`)
    .join("\n");
  return [
    `Savolingiz katalogdagi “${top.title}” darsiga yaqin (${top.category}).`,
    body ? body.slice(0, 500) : top.summary,
    `Ochish:\n${links}`,
    "Keyingi qadam: birinchi havolani oching va darsdagi video bilan birga o‘qing.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function systemPrompt(kind: "panel" | "visitor" | "staff", locale: Locale) {
  const shared = `Siz ChatGPT yordamchisiz. Har qanday savolga to‘liq javob bering: oddiy savol, shaxs, hisob, maslahat, DMED, tibbiyot va dars.
Javobni faqat ${languageName(locale)} tilida yozing. Savol boshqa tilda bo‘lsa ham javob shu tilda qolsin. Qisqa emas, tushunarli va aniq bo‘lsin.
Dars matni yoki katalog parchasi savolga tegishli bo‘lsa, o‘sha bosqichlarni tushuntiring va /m/ havolasini yozing.
Savol umumiy bo‘lsa, katalogda atama yo‘qligi javobni to‘xtatmaydi: o‘z bilimingiz bilan javob bering. “ma’lumot yo‘q” yoki “katalogda yo‘q” deb javobni yopmang.
Dori dozasi va tashxisni o‘ylab topmang. Boshqa foydalanuvchilarning yozishmalari va maxfiy kalitlar javobga kirmasin.`;
  if (kind === "visitor" || kind === "staff") {
    return `${shared}
Siz DMED operatori sifatida yozasiz. "Men AI man" yoki "ChatGPT" demang. Javobni 90 so‘zdan oshirmang. Oxirida bitta keyingi qadam yozing.`;
  }
  return `${shared}
Siz admin panel yordamchisisiz.`;
}

async function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), ms);
    }),
  ]);
}

function geminiModels() {
  const preferred = geminiModel();
  return [
    ...new Set([
      preferred,
      "gemini-3.8-flash",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-flash-latest",
    ]),
  ];
}

function isGeminiModelGone(raw: string) {
  const text = (raw || "").toLowerCase();
  return (
    text.includes("no longer available") ||
    text.includes("not found") ||
    text.includes("is not found")
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function geminiRequest(
  key: string,
  model: string,
  body: Record<string, unknown>,
) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(18000),
    },
  );
  const data = (await res.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    error?: { message?: string };
  } | null;
  const error = data?.error?.message || (res.ok ? "" : `Gemini ${res.status}`);
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();
  return { ok: res.ok, status: res.status, error, text: text || "" };
}

async function geminiComplete(prompt: string, system: string) {
  const key = geminiKey();
  if (!key) return null;
  let lastError = "";
  for (const model of geminiModels()) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const result = await geminiRequest(key, model, {
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1800 },
        });
        if (result.ok && result.text) return result.text;
        lastError = result.error || "Gemini javob bermadi";
        if (isGeminiModelGone(lastError)) break;
        if (!isAiBusyError(lastError) && result.status !== 429) break;
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Gemini xatosi";
      }
      await sleep(800 * (attempt + 1));
    }
  }
  throw new Error(lastError || "Gemini javob bermadi");
}

async function openaiComplete(
  prompt: string,
  system: string,
  options?: { maxTokens?: number; timeoutMs?: number },
) {
  const key = openaiKey();
  if (!key) return null;
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: options?.maxTokens ?? 700,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(options?.timeoutMs ?? 14000),
  });
  const data = (await res.json().catch(() => null)) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  } | null;
  if (!res.ok) {
    throw new Error(data?.error?.message || `OpenAI ${res.status}`);
  }
  return (data?.choices?.[0]?.message?.content || "").trim();
}

export async function verifyGeminiKey(key: string) {
  let lastError = "";
  for (const model of geminiModels()) {
    const result = await geminiRequest(key, model, {
      contents: [{ role: "user", parts: [{ text: "ok" }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 8 },
    }).catch((error: unknown) => ({
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : "Gemini xatosi",
      text: "",
    }));
    if (result.ok) return { ok: true as const };
    lastError = result.error;
    if (isAiBusyError(lastError)) return { ok: true as const };
    if (!isGeminiModelGone(lastError) && result.status !== 404) break;
  }
  return {
    ok: false as const,
    error: friendlyAiError(lastError || "Gemini kaliti noto‘g‘ri."),
  };
}

export async function verifyOpenAiKey(key: string) {
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: { authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    const error = data?.error?.message || `OpenAI ${res.status}`;
    return { ok: false as const, error: friendlyAiError(error) };
  }

  const ping = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0,
      max_tokens: 1,
      messages: [{ role: "user", content: "ok" }],
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (ping.ok) return { ok: true as const, billing: false as const };
  const pingData = (await ping.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  const pingError = pingData?.error?.message || `OpenAI ${ping.status}`;
  if (isAiBillingError(pingError)) {
    return {
      ok: true as const,
      billing: true as const,
      error: friendlyAiError(pingError),
    };
  }
  return { ok: false as const, error: friendlyAiError(pingError) };
}

function lessonPlainText(content: string) {
  return extractMediaFromContent(content || "")
    .text.replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function lessonWindow(text: string, query: string, limit = 4200) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  const lower = clean.toLowerCase();
  let at = -1;
  for (const token of tokensOf(query)) {
    const found = lower.indexOf(token);
    if (found >= 0 && (at < 0 || found < at)) at = found;
  }
  if (at < 0) return clean.slice(0, limit);
  const start = Math.max(0, at - 800);
  const slice = clean.slice(start, start + limit);
  if (start === 0) return slice;
  return `${clean.slice(0, 420)}\n…\n${slice}`;
}

function openLesson(slug: string, query: string) {
  const clean = slug.trim().slice(0, 180);
  if (!clean) return null;
  const row = sqlite
    .prepare(
      `
      SELECT m.title, m.slug, m.summary, m.content AS content, c.title AS category
      FROM materials m
      JOIN categories c ON c.id = m.category_id
      WHERE m.slug = ?
      `,
    )
    .get(clean) as
    | { title: string; slug: string; summary: string; content: string; category: string }
    | undefined;
  if (!row) return null;
  return {
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    category: row.category,
    text: lessonWindow(lessonPlainText(row.content || ""), query),
  };
}

export async function completeWithCatalog(input: {
  kind: "panel" | "visitor" | "staff";
  query: string;
  history?: AiChatTurn[];
  locale?: Locale;
  lessonSlug?: string;
}) {
  const fast = input.kind === "visitor" || input.kind === "staff";
  const history = (input.history || [])
    .slice(fast ? -4 : -8)
    .map((turn) => `${turn.role === "user" ? "Foydalanuvchi" : "Yordamchi"}: ${turn.text.slice(0, fast ? 400 : 1200)}`)
    .join("\n");
  const lesson = input.lessonSlug ? openLesson(input.lessonSlug, input.query) : null;
  if (fast && lesson) lesson.text = lesson.text.slice(0, 900);
  const rows = catalogContextForQuery(input.query, fast ? 2 : 4).map((row) => ({
    ...row,
    text: row.text.slice(0, fast ? 280 : 720),
  }));
  const catalog = formatCatalog(rows);
  const prompt = [
    lesson
      ? `Ochiq dars (birinchi manba). Shu matndagi ish tartibini tushuntiring va havola qo‘ying: /m/${lesson.slug}\n${lesson.title} (${lesson.category})\n${lesson.summary}\n${lesson.text}`
      : "Ochiq dars yo‘q. Dars haqida so‘ralgan bo‘lsa katalogdan foydalaning. Umumiy savol bo‘lsa katalogsiz ham to‘liq javob bering.",
    catalog
      ? `Katalogdan qo‘shimcha parcha. Faqat savolga mos bo‘lsa ishlating:\n${catalog}`
      : "Katalogda mos dars topilmadi. Bu javobni to‘xtatish uchun sabab emas. Umumiy savolga to‘liq javob yozing.",
    history ? `Shu foydalanuvchining joriy suhbati:\n${history}` : "",
    `Savol:\n${input.query}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  const system = systemPrompt(input.kind, input.locale || "uz");

  if (!hasAiKey()) {
    if (input.kind === "visitor" || input.kind === "staff") {
      return {
        ok: true as const,
        text: localCatalogAnswer(input.query, rows).slice(0, 4000),
      };
    }
    return {
      ok: false as const,
      error: "no-key",
      message:
        "AI ulanmagan. Admin panelidagi AI yordamchiga ChatGPT kalitini bir marta yozing.",
    };
  }

  try {
    let lastError = "";
    if (openaiKey()) {
      try {
        const openai = await openaiComplete(prompt, system, {
          maxTokens: fast ? 380 : 900,
          timeoutMs: fast ? 11000 : 18000,
        });
        if (openai) return { ok: true as const, text: openai.slice(0, 4000) };
      } catch (error) {
        lastError = error instanceof Error ? error.message : "OpenAI xatosi";
      }
      return {
        ok: false as const,
        error: isAiBillingError(lastError) ? "billing" : lastError || "empty",
        message: friendlyAiError(lastError || "empty"),
      };
    }
    if (geminiKey()) {
      try {
        const gemini = await withTimeout(geminiComplete(prompt, system), 50000);
        if (gemini) return { ok: true as const, text: gemini.slice(0, 4000) };
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Gemini xatosi";
      }
    }
    if (input.kind === "visitor" || input.kind === "staff") {
      return {
        ok: true as const,
        text: localCatalogAnswer(input.query, rows).slice(0, 4000),
      };
    }
    return {
      ok: false as const,
      error: isAiBillingError(lastError) ? "billing" : lastError || "empty",
      message: friendlyAiError(lastError || "empty"),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI xatosi";
    return {
      ok: false as const,
      error: message,
      message: friendlyAiError(message),
    };
  }
}

function adminSystemPrompt(locale: Locale) {
  return `Siz admin panelidagi umumiy ChatGPT yordamchisisiz. Katalog majburiy manba emas.
Javobni ${languageName(locale)} tilida yozing. Qaraqalpaqcha so‘ralgan bo‘lsa, o‘zbekcha gap yozmang. Admin aniq boshqa til so‘rasa, o‘sha tilda yozing.
Shu suhbatdagi oldingi savol va javoblarni tushuning: qisqartirish, misol, tarjima oxirgi javobga tegishli.
Noaniq qisqartmani bitta ma’noga qotirib haqiqat deb yozmang. Ikki-uch ehtimolni ayting va qaysi biri kerakligini so‘rang.
Jonli internet yo‘q. Yangilik yoki bugungi faktni tekshirdim demang.
Dori dozasi va tashxis o‘ylab topmang. Boshqa odamlarning yozishmasi, parol va kalitlar javobga kirmasin.
Agar pastda ixtiyoriy dars parchasi bo‘lsa, uni faqat savol shu ish tartibi haqida bo‘lsa ishlating.`;
}

function optionalLessonNote(query: string) {
  const strong = tokensOf(query).filter((token) => token.length >= 5);
  if (!strong.length) return "";
  const rows = catalogContextForQuery(query, 2).filter((row) => {
    const hay = `${row.title} ${row.text}`.toLowerCase();
    return strong.some((token) => hay.includes(token));
  });
  if (!rows.length) return "";
  return rows
    .map(
      (row) =>
        `${row.title} (${row.category})\nHavola: /m/${row.slug}\n${row.text.slice(0, 500)}`,
    )
    .join("\n\n");
}

export async function completeAdminAssistant(input: {
  query: string;
  history?: AiChatTurn[];
  locale?: Locale;
  signal?: AbortSignal;
  key?: string;
}) {
  const locale = input.locale || "uz";
  const query = input.query.trim();
  if (!query) return adminAiFailure("blank", locale);
  if (query.length > 4000) return adminAiFailure("too-long", locale);
  const key = input.key !== undefined ? input.key.trim() : openaiKey();
  if (!key) return adminAiFailure("no-key", locale);

  const history = historyForModel(input.history || [], query).map((turn) => ({
    role: turn.role,
    content: turn.text,
  }));
  const note = optionalLessonNote(query);
  const userContent = note
    ? `${query}\n\nIxtiyoriy dars parchasi. Savol dars haqida bo‘lmasa e’tibor bermang:\n${note}`
    : query;
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const timeout = AbortSignal.timeout(25000);
  const signal = input.signal ? AbortSignal.any([input.signal, timeout]) : timeout;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 1200,
        messages: [
          { role: "system", content: adminSystemPrompt(locale) },
          ...history,
          { role: "user", content: userContent },
        ],
      }),
      signal,
    });
    const data = (await res.json().catch(() => null)) as {
      choices?: { message?: { content?: string } }[];
      model?: string;
      error?: { message?: string };
    } | null;
    if (!res.ok) {
      const code = adminAiCodeFromStatus(res.status);
      return adminAiFailure(code, locale);
    }
    const text = (data?.choices?.[0]?.message?.content || "").trim();
    if (!text) return adminAiFailure("empty", locale);
    return {
      ok: true as const,
      text: text.slice(0, 6000),
      source: "openai" as const,
      model: data?.model || model,
    };
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    const code: AdminAiErrorCode =
      name === "TimeoutError" || name === "AbortError" ? "timeout" : "network";
    if (input.signal?.aborted) return adminAiFailure("timeout", locale);
    return adminAiFailure(code, locale);
  }
}
