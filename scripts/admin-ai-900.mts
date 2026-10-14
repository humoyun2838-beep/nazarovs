import fs from "node:fs";
import path from "node:path";
import { adminAiCodeFromStatus, adminAiFailure } from "../src/lib/admin-ai-errors.ts";
import { isAdminAreaPath, isAdminRole } from "../src/lib/admin-area.ts";
import {
  assistantAccepted,
  attemptRetry,
  attemptSend,
  buildPanelRequest,
  classifyPanelQuery,
  createFlow,
  enterSends,
  finishFailure,
  finishSuccess,
  historyForModel,
  isSafeMarkdownHref,
  leakedPanelKeys,
  markdownHref,
  PanelRateLimiter,
  requestStop,
  resetChat,
  sanitizePanelMessages,
  setDraft,
  takeRateSlot,
} from "../src/lib/admin-ai-flow.ts";
import { completeAdminAssistant } from "../src/lib/ai.ts";
import { parseLocale, withLang, type Locale } from "../src/lib/locale.ts";
import { languageName, uiCopy } from "../src/lib/ui-copy.ts";

type Result = "pass" | "fail" | "blocked";
type CaseRow = {
  id: string;
  category: string;
  input: string;
  expected: string;
  actual: string;
  result: Result;
};

const rows: CaseRow[] = [];
const MOCK_KEY = "sk-mock-isolated-900";
const locales: Locale[] = ["uz", "ru", "en", "kaa"];

function add(
  id: string,
  category: string,
  input: string,
  expected: string,
  actual: string,
  ok: boolean,
  blocked = false,
) {
  rows.push({
    id,
    category,
    input: input.slice(0, 500),
    expected: expected.slice(0, 500),
    actual: actual.slice(0, 500),
    result: blocked ? "blocked" : ok ? "pass" : "fail",
  });
}

type Plan = {
  status?: number;
  content?: string;
  json?: unknown;
  raw?: string;
  throwName?: string;
};
let plan: Plan = {};
const seen: { url: string; body: { messages?: { role: string; content: string }[] } }[] = [];
const originalFetch = globalThis.fetch;

function installMock() {
  globalThis.fetch = (async (url: string, init?: { body?: string; headers?: { authorization?: string } }) => {
    const body = JSON.parse(String(init?.body || "{}"));
    seen.push({ url: String(url), body });
    if (init?.headers?.authorization && init.headers.authorization !== `Bearer ${MOCK_KEY}`) {
      throw new Error("mock-saw-non-mock-key");
    }
    if (plan.throwName) {
      const error = new Error(plan.throwName);
      error.name = plan.throwName;
      throw error;
    }
    if (plan.raw !== undefined) {
      return new Response(plan.raw, { status: plan.status || 200 });
    }
    const payload =
      plan.json === undefined
        ? { model: "mock-gpt", choices: [{ message: { content: plan.content ?? "" } }] }
        : plan.json;
    return new Response(JSON.stringify(payload), {
      status: plan.status || 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

installMock();

function lastUserContents() {
  const messages = seen.at(-1)?.body.messages || [];
  return messages.filter((item) => item.role === "user").map((item) => item.content);
}

async function ask(query: string, extra: Record<string, unknown> = {}) {
  seen.length = 0;
  return completeAdminAssistant({
    query,
    key: MOCK_KEY,
    locale: "uz",
    ...extra,
  });
}

const blanks = ["", " ", "\n", "\t", "   \n  ", "\u00a0", " \u00a0 ", "\r\n", "\f", "\v"];
for (let i = 0; i < 40; i += 1) {
  const raw = i < blanks.length ? blanks[i] : ` ${" ".repeat(i)} `;
  const classified = classifyPanelQuery(raw);
  const remote = await ask(raw);
  const code = "error" in remote ? remote.error : "ok";
  add(
    `V${String(i + 1).padStart(3, "0")}`,
    "input",
    JSON.stringify(raw),
    "blank, fetch yo‘q",
    `${classified.code}/${code}/calls:${seen.length}`,
    classified.code === "blank" && code === "blank" && seen.length === 0,
  );
}

for (let i = 0; i < 40; i += 1) {
  const raw = `U${i}-${"x".repeat(3998 + (i % 5))}`;
  const classified = classifyPanelQuery(raw);
  const remote = i % 2 === 0 ? await ask(raw) : null;
  const code = remote && "error" in remote ? remote.error : classified.code;
  const expectTooLong = raw.trim().length > 4000;
  add(
    `V${String(41 + i).padStart(3, "0")}`,
    "input",
    `len=${raw.trim().length}`,
    expectTooLong ? "too-long" : "ok",
    code,
    code === (expectTooLong ? "too-long" : "ok") && (!remote || seen.length === 0 || !expectTooLong),
  );
}

for (let i = 0; i < 40; i += 1) {
  const raw = [
    null,
    5,
    { role: "system", text: `maxfiy-${i}` },
    { role: "user", text: "  " },
    { role: "user", text: `savol-${i}` },
    { role: "assistant", text: ` javob-${i} ` },
    { role: "tool", text: "yo‘q" },
    { text: "rolsiz" },
  ];
  const clean = sanitizePanelMessages(raw);
  add(
    `V${String(81 + i).padStart(3, "0")}`,
    "input",
    `history-junk-${i}`,
    "faqat user/assistant, system tushadi",
    clean.map((turn) => `${turn.role}:${turn.text}`).join(","),
    clean.length === 2 &&
      clean[0].text === `savol-${i}` &&
      clean[1].text === `javob-${i}` &&
      !clean.some((turn) => turn.text.includes("maxfiy")),
  );
}

for (let i = 0; i < 40; i += 1) {
  const raw = `  Aniq savol ${i}  `;
  const classified = classifyPanelQuery(raw);
  add(
    `V${String(121 + i).padStart(3, "0")}`,
    "input",
    raw,
    `ok:${raw.trim()}`,
    `${classified.code}:${classified.query}`,
    classified.ok && classified.query === raw.trim(),
  );
}

for (let i = 0; i < 20; i += 1) {
  const limit = i < 10 ? 4000 : 4001;
  const raw = `${i % 10}${"y".repeat(limit - 1)}`;
  const classified = classifyPanelQuery(raw);
  add(
    `V${String(161 + i).padStart(3, "0")}`,
    "input",
    `boundary-${raw.length}`,
    raw.length > 4000 ? "too-long" : "ok",
    classified.code,
    (raw.length > 4000 ? classified.code === "too-long" : classified.ok) && raw.length === limit,
  );
}

for (let i = 0; i < 40; i += 1) {
  const reply = `Mock javob ${i}: H2O emas, bu ${i}-sinov.`;
  plan = { content: reply, status: 200 };
  const result = await ask(`Umumiy savol raqami ${i}. Formula so‘ralmasin.`);
  const text = "text" in result ? result.text : "";
  const source = "source" in result ? result.source : "";
  add(
    `G${String(i + 1).padStart(3, "0")}`,
    "gpt",
    `reply-${i}`,
    reply,
    `${source}:${text}`,
    "ok" in result && result.ok && source === "openai" && text === reply && seen[0]?.url.includes("api.openai.com"),
  );
}

for (let i = 0; i < 20; i += 1) {
  const prior = Array.from({ length: 11 }, (_, n) => ({
    role: (n % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
    text: `tarix-${i}-${n}`,
  }));
  const query = `ab ${i}`;
  prior.push({ role: "user", text: query });
  plan = { content: `davom-${i}` };
  const result = await ask(query, { history: prior });
  const roles = (seen[0]?.body.messages || []).map((item) => `${item.role}:${item.content}`);
  add(
    `G${String(41 + i).padStart(3, "0")}`,
    "gpt",
    `window-${i}`,
    "oxirgi 8 tarix + yangi savol, eski tushadi",
    roles.filter((item) => item.includes("tarix")).length + ":" + (roles.at(-1) || ""),
    "ok" in result &&
      result.ok &&
      !roles.some((item) => item.includes(`tarix-${i}-0`)) &&
      roles.some((item) => item.includes(`tarix-${i}-10`)) &&
      roles.at(-1) === `user:${query}`,
  );
}

for (let i = 0; i < 20; i += 1) {
  const query = `ab ${i} cd`;
  plan = { content: `esladim-${i}` };
  const result = await ask(query, {
    history: [
      { role: "user", text: query },
      { role: "assistant", text: `oldingi javob ${i}` },
      { role: "user", text: query },
    ],
  });
  const contents = (seen[0]?.body.messages || []).map((item) => item.content);
  add(
    `G${String(61 + i).padStart(3, "0")}`,
    "gpt",
    query,
    "oldingi savol va javob saqlanadi",
    contents.filter((item) => item !== contents[0]).join(" | "),
    "ok" in result &&
      result.ok &&
      contents.includes(query) &&
      contents.includes(`oldingi javob ${i}`) &&
      contents.filter((item) => item === query).length >= 2,
  );
}

for (let i = 0; i < 20; i += 1) {
  const locale = locales[i % 4];
  plan = { content: `til-${locale}-${i}` };
  seen.length = 0;
  const result = await completeAdminAssistant({
    query: `Til sinovi ${i}`,
    key: MOCK_KEY,
    locale,
  });
  const system = seen[0]?.body.messages?.[0]?.content || "";
  add(
    `G${String(81 + i).padStart(3, "0")}`,
    "gpt",
    locale,
    languageName(locale),
    system.includes(languageName(locale)) ? languageName(locale) : "yo‘q",
    "ok" in result && result.ok && system.includes(languageName(locale)),
  );
}

for (let i = 0; i < 20; i += 1) {
  plan = { content: `qisqa-${i}` };
  const query = `zzzztoken${i}qqqq`;
  const result = await ask(query);
  const user = lastUserContents().at(-1) || "";
  add(
    `G${String(101 + i).padStart(3, "0")}`,
    "gpt",
    query,
    "savolning o‘zi, katalog majburiy emas",
    user,
    "ok" in result && result.ok && user === query && !user.includes("Ixtiyoriy dars"),
  );
}

const badPayloads: Plan[] = [
  { content: "" },
  { content: "   " },
  { json: {} },
  { json: { choices: [] } },
  { json: { choices: [{ message: {} }] } },
  { json: { choices: [{ message: { content: null } }] } },
  { raw: "bu-json-emas", status: 200 },
  { json: { choices: [{ message: { content: "  ichkarida  " } }] } },
  { content: `${"Z".repeat(6005)}` },
  { json: { model: "mock-named", choices: [{ message: { content: "model-bor" } }] } },
];
for (let i = 0; i < 40; i += 1) {
  plan = badPayloads[i % badPayloads.length];
  const result = await ask(`parser ${i}`);
  const kind = i % badPayloads.length;
  let expected = "empty";
  let ok = "error" in result && result.error === "empty";
  if (kind === 7) {
    expected = "ichkarida";
    ok = "text" in result && result.text === "ichkarida";
  } else if (kind === 8) {
    expected = "6000";
    ok = "text" in result && result.text.length === 6000 && result.source === "openai";
  } else if (kind === 9) {
    expected = "mock-named";
    ok = "model" in result && result.model === "mock-named" && result.source === "openai";
  }
  add(
    `G${String(121 + i).padStart(3, "0")}`,
    "gpt",
    `payload-${kind}`,
    expected,
    "error" in result ? result.error : `text:${"text" in result ? result.text.length : 0}/${"model" in result ? result.model : ""}`,
    ok,
  );
}

for (let i = 0; i < 20; i += 1) {
  plan = { status: 500, json: { error: { message: "upstream" } } };
  const result = await ask(`lokal fallback sinovi ${i}`);
  const text = "text" in result ? result.text : "";
  add(
    `G${String(161 + i).padStart(3, "0")}`,
    "gpt",
    `fail-${i}`,
    "ok:false, katalog matni GPT emas",
    `${"ok" in result && result.ok}:${"error" in result ? result.error : ""}:${text}`,
    "ok" in result &&
      !result.ok &&
      "error" in result &&
      result.error === "upstream" &&
      !text.includes("katalogdan") &&
      !("source" in result),
  );
}

const roles = [
  "admin",
  "client",
  "operator",
  "ADMIN",
  "Admin",
  "",
  null,
  undefined,
  " admin",
  "blocked",
  "guest",
  "user",
  "root",
  "superadmin",
  1,
  0,
  true,
  false,
  {},
  [],
];
for (let i = 0; i < 40; i += 1) {
  const role = roles[i % roles.length];
  const allowed = isAdminRole(role);
  add(
    `A${String(i + 1).padStart(3, "0")}`,
    "auth",
    `role:${JSON.stringify(role)}`,
    role === "admin" ? "ruxsat" : "rad",
    allowed ? "ruxsat" : "rad",
    allowed === (role === "admin"),
  );
}

const paths = [
  "/admin",
  "/admin/login",
  "/admin/chat",
  "/api/admin/ai",
  "/api/health",
  "/api/login",
  "/api/logout",
  "/api/search",
  "/api/learn",
  "/api/chat",
  "/api/chat/media",
  "/api/media/notion",
  "/api/locale",
  "/api/visit",
  "/api/telegram",
  "/nazarov",
  "/operator",
  "/operator/kirish",
  "/api/register",
  "/api/session-expired",
];
for (let i = 0; i < 40; i += 1) {
  const pathname = paths[i % paths.length];
  const area = isAdminAreaPath(pathname);
  const expectArea =
    pathname === "/admin" ||
    (pathname.startsWith("/admin/") && pathname !== "/admin/login") ||
    pathname === "/api/admin/ai";
  add(
    `A${String(41 + i).padStart(3, "0")}`,
    "auth",
    pathname,
    expectArea ? "admin-zona" : "ochiq",
    area ? "admin-zona" : "ochiq",
    area === expectArea,
  );
}

for (let i = 0; i < 40; i += 1) {
  const mine = buildPanelRequest(`mening savolim ${i}`, [
    { id: "hello", role: "assistant", text: "salom" },
    { id: "u", role: "user", text: `mening savolim ${i}` },
    { role: "assistant", text: "boshqa mijoz siri" },
  ]);
  const other = buildPanelRequest(`boshqa suhbat ${i}`, [
    { role: "user", text: `boshqa suhbat ${i}` },
  ]);
  const leaks = leakedPanelKeys(mine);
  const foreign = JSON.stringify(mine).includes(`boshqa suhbat ${i}`);
  add(
    `A${String(81 + i).padStart(3, "0")}`,
    "auth",
    `suhbat-${i}`,
    "faqat shu suhbat, sir maydoni yo‘q",
    `leaks:${leaks.join(",") || "yo‘q"};hello:${JSON.stringify(mine).includes("salom")}`,
    mine.action === "panel" &&
      leaks.length === 0 &&
      !JSON.stringify(mine.messages).includes("salom") &&
      !foreign &&
      other.text !== mine.text,
  );
}

const statuses = [401, 403, 408, 429, 500, 502, 503, 504, 418, 400];
for (let i = 0; i < 40; i += 1) {
  const status = statuses[i % statuses.length];
  const locale = locales[i % 4];
  plan = { status, json: { error: { message: "hidden" } } };
  seen.length = 0;
  const result = await completeAdminAssistant({
    query: `status sinov ${i}`,
    key: MOCK_KEY,
    locale,
  });
  const code = adminAiCodeFromStatus(status);
  add(
    `E${String(i + 1).padStart(3, "0")}`,
    "errors",
    `${status}/${locale}`,
    `${code}:${adminAiFailure(code, locale).message}`,
    "error" in result ? `${result.error}:${result.message}` : "ok",
    "error" in result && result.error === code && result.message === adminAiFailure(code, locale).message && result.status === adminAiFailure(code, locale).status,
  );
}

const throws = ["TimeoutError", "AbortError", "TypeError", "Error"];
for (let i = 0; i < 20; i += 1) {
  const throwName = throws[i % throws.length];
  plan = { throwName };
  const controller = new AbortController();
  if (i % throws.length === 1) controller.abort();
  const result = await ask(`tarmoq ${i}`, { signal: controller.signal });
  const expectCode = throwName === "TypeError" || throwName === "Error" ? "network" : "timeout";
  add(
    `E${String(41 + i).padStart(3, "0")}`,
    "errors",
    throwName,
    expectCode,
    "error" in result ? result.error : "ok",
    "error" in result && result.error === expectCode,
  );
}

for (let i = 0; i < 30; i += 1) {
  const limiter = new PanelRateLimiter();
  const id = `admin-${i}`;
  const other = `other-${i}`;
  let allowed = 0;
  let blockedAt = 0;
  for (let n = 0; n < 21; n += 1) {
    const ok = limiter.allow(id, 1_000_000 + i);
    if (ok) allowed += 1;
    else blockedAt = n + 1;
  }
  const otherOk = limiter.allow(other, 1_000_000 + i);
  const expired = takeRateSlot([1], 70_000, 20, 60_000);
  add(
    `E${String(61 + i).padStart(3, "0")}`,
    "errors",
    `rate-${id}`,
    "20 ruxsat, 21-rad, boshqa admin alohida",
    `allowed:${allowed};blocked:${blockedAt};other:${otherOk};expired:${expired.ok}`,
    allowed === 20 && blockedAt === 21 && otherOk && expired.ok,
  );
}

for (let i = 0; i < 30; i += 1) {
  let view = setDraft(createFlow("salom"), `qayta ${i}`);
  const sent = attemptSend(view, "uzun", `u-${i}`);
  if (!sent.ok) {
    add(`E${String(91 + i).padStart(3, "0")}`, "errors", `retry-${i}`, "yuborildi", "yuborilmadi", false);
    continue;
  }
  view = finishFailure(sent.view, sent.generation, `xato-${i}`);
  const again = attemptRetry(view);
  const users = again.ok ? again.view.turns.filter((turn) => turn.role === "user") : [];
  add(
    `E${String(91 + i).padStart(3, "0")}`,
    "errors",
    `retry-${i}`,
    "bitta user, qayta yuborish, xato tozalanadi",
    again.ok ? `users:${users.length};pending:${again.view.pending};error:${again.view.error}` : again.reason,
    again.ok && users.length === 1 && again.query === `qayta ${i}` && again.view.error === "" && again.view.pending,
  );
}

for (let i = 0; i < 30; i += 1) {
  let view = setDraft(createFlow("salom"), `ikki marta ${i}`);
  const first = attemptSend(view, "uzun", `a-${i}`);
  const second = first.ok ? attemptSend(first.view, "uzun", `b-${i}`) : first;
  const users = first.ok ? first.view.turns.filter((turn) => turn.role === "user").length : 0;
  add(
    `P${String(i + 1).padStart(3, "0")}`,
    "parallel",
    `double-${i}`,
    "ikkinchi bosish qulflanadi",
    second.ok ? "ikkinchi ham ketdi" : `${second.reason};users:${users}`,
    first.ok && !second.ok && second.reason === "locked" && users === 1,
  );
}

for (let i = 0; i < 30; i += 1) {
  let view = setDraft(createFlow("salom"), `bekor ${i}`);
  const sent = attemptSend(view, "uzun", `c-${i}`);
  if (!sent.ok) {
    add(`P${String(31 + i).padStart(3, "0")}`, "parallel", `stop-${i}`, "stop", "yo‘q", false);
    continue;
  }
  view = requestStop(sent.view, "to‘xtadi");
  const late = finishSuccess(view, sent.generation, `late-${i}`, `kechikkan ${i}`);
  const assistants = late.turns.filter((turn) => turn.id !== "hello" && turn.role === "assistant");
  add(
    `P${String(31 + i).padStart(3, "0")}`,
    "parallel",
    `stop-${i}`,
    "to‘xtatilgan so‘rov javobi yozilmaydi",
    `error:${late.error};assistants:${assistants.length};lock:${late.lock}`,
    late.error === "to‘xtadi" && assistants.length === 0 && !late.lock && !late.pending,
  );
}

for (let i = 0; i < 30; i += 1) {
  let view = setDraft(createFlow("salom"), `saqla ${i}`);
  const sent = attemptSend(view, "uzun", `d-${i}`);
  view = sent.ok ? finishSuccess(sent.view, sent.generation, `as-${i}`, `javob ${i}`) : view;
  const kept = view.turns.map((turn) => turn.text).join("|");
  const cleared = resetChat(view, "yangi");
  add(
    `P${String(61 + i).padStart(3, "0")}`,
    "parallel",
    `persist-${i}`,
    "javob turadi, yangi suhbat tozalaydi",
    `kept:${kept.includes(`javob ${i}`)};reset:${cleared.turns.length}`,
    sent.ok && kept.includes(`javob ${i}`) && kept.includes(`saqla ${i}`) && cleared.turns.length === 1 && cleared.generation === view.generation + 1,
  );
}

for (let i = 0; i < 30; i += 1) {
  const empty = attemptSend(setDraft(createFlow("salom"), "   "), "uzun", "e");
  const typing = enterSends("Enter", false);
  const newline = enterSends("Enter", true);
  const other = enterSends("a", false);
  const stopped = requestStop(createFlow("salom"), "stop");
  add(
    `P${String(91 + i).padStart(3, "0")}`,
    "parallel",
    `keys-${i}`,
    "bo‘sh rad, Enter yuboradi, Shift+Enter yo‘q",
    `${empty.ok ? "sent" : empty.reason};enter:${typing};shift:${newline};other:${other};gen:${stopped.generation}`,
    !empty.ok && empty.reason === "empty" && typing && !newline && !other && stopped.generation === 1,
  );
}

const hrefs = [
  ["https://example.com/a", true],
  ["http://example.com/a", true],
  ["/nazarov", true],
  ["/b/savol", true],
  ["//evil.example", false],
  ["javascript:alert(1)", false],
  ["data:text/html,hi", false],
  ["/\\evil", false],
  ["https://example.com/a b", false],
  ["ftp://example.com", false],
  ["mailto:a@b.c", false],
  ["/admin?lang=uz", true],
  ["https://example.com/q?x=1", true],
  ["javascript://example.com", false],
  [" HTTP://example.com", false],
  ["/ok", true],
  ["#faq", false],
  ["", false],
  ["https:///no-host", true],
  ["//localhost/admin", false],
] as const;
for (let i = 0; i < 40; i += 1) {
  const [href, safe] = hrefs[i % hrefs.length];
  const token = `[link${i}](${href})`;
  const parsed = markdownHref(token);
  add(
    `L${String(i + 1).padStart(3, "0")}`,
    "locale",
    href,
    safe ? "havola" : "matn",
    parsed ? parsed.href : "matn",
    isSafeMarkdownHref(href) === safe && (safe ? parsed?.href === href : parsed === null),
  );
}

const copyKeys = ["preparing", "stop", "retry", "copy", "newChat", "tooLong", "send", "aiTitle", "aiLead", "hello"] as const;
for (let i = 0; i < 40; i += 1) {
  const locale = locales[i % 4];
  const key = copyKeys[i % copyKeys.length];
  const text = uiCopy(locale)[key];
  const others = locales.filter((item) => item !== locale).map((item) => uiCopy(item)[key]);
  add(
    `L${String(41 + i).padStart(3, "0")}`,
    "locale",
    `${locale}.${key}`,
    "bo‘sh emas",
    text,
    typeof text === "string" && text.trim().length > 0 && others.some((item) => item !== text),
  );
}

const nav = [
  ["/admin", "uz"],
  ["/admin", "ru"],
  ["/admin", "en"],
  ["/admin", "kaa"],
  ["/nazarov", "ru"],
  ["/operator", "en"],
  ["/operator/kirish", "kaa"],
  ["/b/savol", "uz"],
  ["/m/dars", "ru"],
  ["/admin/chat", "en"],
] as const;
for (let i = 0; i < 20; i += 1) {
  const [href, locale] = nav[i % nav.length];
  const next = withLang(href, locale);
  const parsed = parseLocale(locale);
  add(
    `L${String(81 + i).padStart(3, "0")}`,
    "locale",
    `${href}?${locale}`,
    `${href} lang=${locale}`,
    next,
    next.startsWith(href) && next.includes(`lang=${locale}`) && !next.includes("http") && parsed === locale,
  );
}

const chatSource = fs.readFileSync(new URL("../src/components/admin-ai-chat.tsx", import.meta.url), "utf8");
const layoutChecks: [string, boolean][] = [
  ["copy.send", chatSource.includes("{copy.send}")],
  ["danger", !chatSource.includes("dangerouslySetInnerHTML")],
  ["input", chatSource.includes('data-admin-ai="input"')],
  ["send", chatSource.includes('data-admin-ai="send"')],
  ["stop", chatSource.includes('data-admin-ai="stop"')],
  ["retry", chatSource.includes('data-admin-ai="retry"')],
  ["thread", chatSource.includes('data-admin-ai="thread"')],
  ["enter", chatSource.includes('event.key === "Enter" && !event.shiftKey')],
  ["accepted", chatSource.includes("assistantAccepted")],
  ["href", chatSource.includes("markdownHref")],
  ["stopfn", chatSource.includes("requestStop")],
  ["attempt", chatSource.includes("attemptSend")],
  ["scroll", chatSource.includes("overflow-y-auto")],
  ["wrap", chatSource.includes("flex-wrap")],
  ["stack", chatSource.includes("sm:flex-row")],
  ["height", chatSource.includes("max-h-80")],
  ["error", chatSource.includes('data-admin-ai="error"')],
  ["pending", chatSource.includes('data-admin-ai="pending"')],
  ["form", chatSource.includes('data-admin-ai="form"')],
  ["yuborish-literal", !chatSource.includes("\n          Yuborish")],
];
for (let i = 0; i < 20; i += 1) {
  const [name, ok] = layoutChecks[i];
  add(`L${String(101 + i).padStart(3, "0")}`, "locale", name, "bor", ok ? "bor" : "yo‘q", ok);
}

globalThis.fetch = originalFetch;
const routeSource = fs.readFileSync(new URL("../src/app/api/admin/ai/route.ts", import.meta.url), "utf8");
const panelSlice = routeSource.slice(routeSource.indexOf("const locale = await getLocale()"));
const publicCopy = fs.readFileSync(new URL("../src/lib/public-copy.ts", import.meta.url), "utf8");
const faqCopy = fs.readFileSync(new URL("../src/lib/faq-dmed.ts", import.meta.url), "utf8");
const devServer = fs.readFileSync(new URL("./dev-server.cjs", import.meta.url), "utf8");

const fileChecks: [string, string, boolean][] = [
  ["panel-client-chat", "panel addOperatorReply chaqirmaydi", !panelSlice.includes("addOperatorReply") && !panelSlice.includes("replyToVisitorWithAi")],
  ["panel-key", "brauzer kaliti panelga uzatilmaydi", !panelSlice.includes("openaiKey")],
  ["help", "telegram qatori yo‘q", publicCopy.includes('helpBody: "Savolni pastdagi chat orqali yozing."') && !publicCopy.includes("Telegram:")],
  ["faq", "qisqa tavsif", faqCopy.includes('description: "20 ta savol — 20 ta aniq javob."') && !faqCopy.includes("Stikerli, qidiruvli")],
  ["port", "3847", devServer.includes("3847") && !devServer.includes("3848")],
  ["history", "historyForModel ishlatiladi", fs.readFileSync(new URL("../src/lib/ai.ts", import.meta.url), "utf8").includes("historyForModel")],
  ["blank", "bo‘sh savol blank", fs.readFileSync(new URL("../src/lib/ai.ts", import.meta.url), "utf8").includes('adminAiFailure("blank"')],
  ["source-gate", "openai manbasi", chatSource.includes('data.source !== "openai"') || chatSource.includes("assistantAccepted")],
];
for (let i = 0; i < fileChecks.length; i += 1) {
  const [name, expected, ok] = fileChecks[i];
  add(`R${String(i + 1).padStart(3, "0")}`, "regression", name, expected, ok ? "ha" : "yo‘q", ok);
}

async function statusOf(url: string) {
  try {
    const response = await fetch(url, { redirect: "manual" });
    return { status: response.status, body: await response.text(), blocked: false };
  } catch (error) {
    return { status: 0, body: error instanceof Error ? error.name : "error", blocked: true };
  }
}

const pages = [
  ["http://127.0.0.1:3847/api/health", 200],
  ["http://127.0.0.1:3847/nazarov", 200],
  ["http://127.0.0.1:3847/admin", 307],
  ["http://127.0.0.1:3847/operator", 307],
  ["http://127.0.0.1:3847/operator/kirish", 200],
  ["http://127.0.0.1:3847/b/eng-kop-beriladigan-savollarga-qisqa-javoblar?lang=uz", 200],
] as const;
for (let i = 0; i < pages.length; i += 1) {
  const [url, expected] = pages[i];
  const got = await statusOf(url);
  const healthOk =
    !url.endsWith("/api/health") ||
    (got.body.includes('"service":"nazarov-uz"') && got.body.includes('"port":3847'));
  const pageOk =
    url.includes("/nazarov")
      ? got.body.includes("DMED o‘quv materiallari kasb va vazifa bo‘yicha.") && !got.body.includes("Login shart emas.")
      : true;
  const faqOk = url.includes("/b/")
    ? got.body.includes("20 ta savol — 20 ta aniq javob.") && !got.body.includes("Stikerli, qidiruvli")
    : true;
  add(
    `R${String(9 + i).padStart(3, "0")}`,
    "regression",
    url,
    String(expected),
    got.blocked ? "blocked" : String(got.status),
    !got.blocked && (got.status === expected || (expected === 307 && (got.status === 307 || got.status === 302))) && healthOk && pageOk && faqOk,
    got.blocked,
  );
}

const moreFiles = [
  ["materials-page", !fs.readFileSync(new URL("../src/app/materials/page.tsx", import.meta.url), "utf8").includes("t.me/nazarov_07_09")],
  ["start-server", fs.readFileSync(new URL("./start-server.cjs", import.meta.url), "utf8").includes("3847")],
  ["no-local-as-gpt", !panelSlice.includes("localCatalogAnswer")],
  ["rate-class", routeSource.includes("panelLimiter.allow")],
  ["sanitize", routeSource.includes("sanitizePanelMessages")],
];
for (let i = 0; i < moreFiles.length; i += 1) {
  add(
    `R${String(15 + i).padStart(3, "0")}`,
    "regression",
    moreFiles[i][0] as string,
    "ha",
    moreFiles[i][1] ? "ha" : "yo‘q",
    Boolean(moreFiles[i][1]),
  );
}

const extraUrls = [
  "/api/health",
  "/nazarov?lang=ru",
  "/nazarov?lang=en",
  "/nazarov?lang=kaa",
  "/admin/login",
  "/admin?lang=uz",
];
for (let i = 0; i < extraUrls.length; i += 1) {
  const url = `http://127.0.0.1:3847${extraUrls[i]}`;
  const got = await statusOf(url);
  const okStatus = got.status === 200 || got.status === 307 || got.status === 302;
  add(
    `R${String(20 + i).padStart(3, "0")}`,
    "regression",
    extraUrls[i],
    "200 yoki login redirect, port 3847",
    got.blocked ? "blocked" : String(got.status),
    !got.blocked && okStatus && url.includes(":3847"),
    got.blocked,
  );
}

for (let i = 0; i < 35; i += 1) {
  const locale = locales[i % 4];
  const failure = adminAiFailure(i % 2 === 0 ? "network" : "timeout", locale);
  add(
    `R${String(26 + i).padStart(3, "0")}`,
    "regression",
    `${locale}-${failure.error}`,
    "lokal katalog gapisiz xato",
    failure.message,
    failure.ok === false && !failure.message.toLowerCase().includes("katalog") && failure.message.length > 3,
  );
}

if (rows.length !== 900) {
  console.error(`COUNT ${rows.length}`);
  process.exit(2);
}

const counts = { pass: 0, fail: 0, blocked: 0 };
const byCategory: Record<string, { pass: number; fail: number; blocked: number }> = {};
for (const row of rows) {
  counts[row.result] += 1;
  byCategory[row.category] ||= { pass: 0, fail: 0, blocked: 0 };
  byCategory[row.category][row.result] += 1;
}

const real: { id: string; prompt: string; ok: boolean; source: string; note: string }[] = [];
const skipReal = process.env.SKIP_REAL === "1";
const realPrompts: { id: string; query: string; history?: { role: "user" | "assistant"; text: string }[]; locale?: Locale }[] = skipReal
  ? []
  : [
  { id: "real-general", query: "Suvning kimyoviy formulasi nima? Faqat formula." },
  { id: "real-edit", query: "Quyidagi gapni rasmiyroq qilib qayta yoz: bizga tezroq javob kerak edi" },
  {
    id: "real-translate",
    query: "Shu javobni inglizchaga tarjima qil",
    history: [
      { role: "user", text: "Quyidagi gapni rasmiyroq qilib qayta yoz: bizga tezroq javob kerak edi" },
      { role: "assistant", text: "Iltimos, tezroq javob berishingizni so‘raymiz." },
    ],
  },
  { id: "real-lesson", query: "Kasalxonaga yotqizishni qanday bekor qilaman?" },
  {
    id: "real-follow",
    query: "Oldingi javobni ikki gapga qisqartir",
    history: [
      { role: "user", text: "Kasalxonaga yotqizishni qanday bekor qilaman?" },
      { role: "assistant", text: "Yotqizish yozuvini oching va bekor qilish tugmasini bosing. Sababini yozib saqlang." },
    ],
  },
];

for (const item of realPrompts) {
  try {
    const result = await completeAdminAssistant({
      query: item.query,
      history: item.history,
      locale: "uz",
    });
    const text = "text" in result ? result.text : "";
    const source = "source" in result ? result.source : "";
    real.push({
      id: item.id,
      prompt: item.query,
      ok: Boolean("ok" in result && result.ok && source === "openai" && text.trim()),
      source: source || ("error" in result ? result.error : "none"),
      note: (text || ("message" in result ? result.message : "")).slice(0, 280),
    });
  } catch (error) {
    real.push({
      id: item.id,
      prompt: item.query,
      ok: false,
      source: "throw",
      note: error instanceof Error ? error.name : "error",
    });
  }
}

const outDir = path.resolve("reports/admin-ai-900");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "cases.json"), JSON.stringify({ counts, byCategory, cases: rows }, null, 2));
const csv = ["id,category,input,expected,actual,result"];
for (const row of rows) {
  const cell = (value: string) => `"${value.replaceAll('"', '""')}"`;
  csv.push([row.id, row.category, cell(row.input), cell(row.expected), cell(row.actual), row.result].join(","));
}
fs.writeFileSync(path.join(outDir, "cases.csv"), csv.join("\n"));
if (real.length) {
  fs.writeFileSync(
    path.join(outDir, "real-gpt.json"),
    JSON.stringify({ calls: real.length, passed: real.filter((item) => item.ok).length, real }, null, 2),
  );
}

const lines = [
  "# DMED admin AI — 900 test",
  "",
  `Jami: ${rows.length}. Pass: ${counts.pass}. Fail: ${counts.fail}. Blocked: ${counts.blocked}.`,
  "",
  "Bu 900 ta holat mock GPT bilan bajarilgan. Real pullik chaqiruvlar alohida.",
  "",
  "## Kategoriyalar",
  "",
];
for (const [name, value] of Object.entries(byCategory)) {
  lines.push(`- ${name}: pass ${value.pass}, fail ${value.fail}, blocked ${value.blocked}`);
}
lines.push("", "## Fail", "");
const fails = rows.filter((row) => row.result !== "pass");
if (!fails.length) lines.push("Birlamchi 900 ichida fail yoki blocked yo‘q.");
for (const row of fails) {
  lines.push(`- ${row.id} ${row.result}: ${row.input} → kutilgan ${row.expected}; haqiqiy ${row.actual}`);
}
lines.push("", "## Real GPT", "");
for (const item of real) {
  lines.push(`- ${item.id}: ${item.ok ? "pass" : "fail"} source=${item.source} javob=${item.note}`);
}
lines.push(
  "",
  "## Qamrov chegarasi",
  "",
  "900 holat admin yordamchining sof qoidalari, mock javobni tahlil qilish, rol/zona, limit, suhbat holati va bir nechta jonli sahifa tekshiruvi. Butun dars bazasi, barcha video va barcha mijoz chatlari bu ro‘yxatga kirmaydi. Nol fail qolgan xato yo‘q degani emas.",
);
fs.writeFileSync(path.join(outDir, "report.md"), lines.join("\n"));
console.log(JSON.stringify({ counts, byCategory, real: real.map((item) => ({ id: item.id, ok: item.ok, source: item.source })) }));
