#!/usr/bin/env node
/**
 * 900 Dmed chat checks: widget, validation, site inbox, admin reply roundtrip.
 */
const BASE = process.env.BASE_URL || "http://127.0.0.1:3847";
const TOTAL = Number(process.env.TOTAL || 900);
const LIVE = process.env.CHAT_LIVE_TELEGRAM === "1";
const ADMIN_USER = "Nazarov";
const ADMIN_PASS = process.env.ADMIN_PASSWORD || "admin9915504";
const fs = require("node:fs");
const path = require("node:path");

const ACK_UZ = "Xabaringiz qabul qilindi. Shu chatda javob beramiz.";
const ACK_RU = "Сообщение принято. Ответим в этом чате.";
const RATE_UZ = "Suhbat yopildi. Operatorni baholang.";
const RATE_RU = "Чат закрыт. Оцените оператора.";
const THANKS_UZ = "Bahoyingiz uchun rahmat.";
const THANKS_RU = "Спасибо за оценку.";
const GREETING_UZ = "Savolingizni yozing — shu chatda javob beramiz.";
const GREETING_RU = "Напишите вопрос по уроку — ответим в этом чате.";

function fail(message) {
  throw new Error(message);
}

function utcDay(offset = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function ackCount(messages) {
  return (messages || []).filter(
    (row) => row.role === "dmed" && (row.body === ACK_UZ || row.body === ACK_RU),
  ).length;
}

function bodiesOf(messages) {
  return (messages || []).map((row) => row.body).join("\n");
}

function starKey(rating) {
  return String(rating);
}

function starCount(stats, rating) {
  const stars = stats?.stars || {};
  return Number(stars[starKey(rating)] || stars[Number(rating)] || 0);
}

async function assertRestart(visitorCookie, previousSessionId) {
  const restarted = await jsonReq("/api/chat", {
    cookie: `dmed_chat=${visitorCookie}`,
    body: { action: "restart", page: "/nazarov" },
  });
  if (restarted.status !== 200 || !restarted.data?.ok || !restarted.cookie) {
    fail(`restart failed ${restarted.status} ${JSON.stringify(restarted.data)}`);
  }
  if (!restarted.data.sessionId || restarted.data.sessionId === previousSessionId) {
    fail(`restart must open a new session: ${JSON.stringify(restarted.data)}`);
  }
  if (
    restarted.data.canSend !== true ||
    restarted.data.status !== "open" ||
    restarted.data.canRate === true ||
    restarted.data.canRestart === true
  ) {
    fail(`restarted session flags wrong: ${JSON.stringify(restarted.data)}`);
  }
  const bodies = bodiesOf(restarted.data.messages);
  if (!bodies.includes(GREETING_UZ) && !bodies.includes(GREETING_RU)) {
    fail(`restart greeting missing: ${bodies}`);
  }
  const sent = await jsonReq("/api/chat", {
    cookie: `dmed_chat=${restarted.cookie}`,
    body: { action: "message", text: "Yangi suhbat savoli.", page: "/nazarov" },
  });
  if (sent.status !== 200 || !sent.data?.ok) {
    fail(`new chat after restart should accept messages: ${JSON.stringify(sent.data)}`);
  }
  if (ackCount(sent.data.messages) !== 1) {
    fail("restarted chat must get a single receipt ack");
  }
  return restarted;
}

async function jsonReq(path, { method = "POST", body, cookie, test = !LIVE, extraHeaders = {} } = {}) {
  const headers = {
    "content-type": "application/json",
    "user-agent": "nazarov-chat-test/1.0",
    ...extraHeaders,
  };
  if (test) headers["x-nazarov-chat-test"] = "1";
  if (cookie) headers.cookie = cookie;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  const setCookie = res.headers.get("set-cookie") || "";
  const match = setCookie.match(/dmed_chat=([^;]+)/);
  return { status: res.status, data, cookie: match ? match[1] : "" };
}

async function adminLogin() {
  const form = new FormData();
  form.set("username", ADMIN_USER);
  form.set("password", ADMIN_PASS);
  form.set("next", "/admin");
  const res = await fetch(`${BASE}/api/login`, {
    method: "POST",
    body: form,
    redirect: "manual",
  });
  const cookie = res.headers.get("set-cookie") || "";
  const match = cookie.match(/nazarov_session=([^;]+)/);
  if (!match) fail(`admin login failed ${res.status}`);
  return match[1];
}

async function adminJson(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      cookie: `nazarov_session=${token}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const WEBM_STUB = Buffer.from(
  "GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwH/////////FUmpZpkq17GDD0JATYCGQ2hyb21lV0RZU0lS",
  "base64",
);

async function mediaReq({ cookie, bytes, filename, type, caption = "", sessionId = "", kind = "" } = {}) {
  const form = new FormData();
  form.set("action", "media");
  form.set("file", new File([bytes], filename, { type }));
  form.set("page", "/nazarov");
  if (caption) form.set("caption", caption);
  if (sessionId) form.set("sessionId", sessionId);
  if (kind) form.set("kind", kind);
  const headers = {
    "user-agent": "nazarov-chat-test/1.0",
    "x-nazarov-chat-test": "1",
  };
  if (cookie) headers.cookie = cookie;
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers,
    body: form,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function getMedia(id, cookie) {
  const res = await fetch(`${BASE}/api/chat/media/${id}`, {
    headers: {
      cookie: cookie || "",
      "user-agent": "nazarov-chat-test/1.0",
    },
  });
  const buf = Buffer.from(await res.arrayBuffer());
  return {
    status: res.status,
    buf,
    type: res.headers.get("content-type") || "",
  };
}

function mediaOf(messages, kind) {
  return (messages || []).filter((row) => row.kind === kind && row.role === "visitor");
}

async function assertChatMedia(token) {
  const start = await jsonReq("/api/chat", {
    body: {
      action: "start",
      name: "Media Mijoz",
      phone: "+998901119900",
      language: "uz",
      page: "/nazarov",
    },
  });
  if (start.status !== 200 || !start.data?.ok || !start.cookie) {
    fail(`media start failed ${start.status} ${JSON.stringify(start.data)}`);
  }
  const visitorCookie = `dmed_chat=${start.cookie}`;
  const sessionId = start.data.sessionId;

  const photo = await mediaReq({
    cookie: visitorCookie,
    bytes: PNG_1X1,
    filename: "shot.png",
    type: "image/png",
    caption: "Rasm izoh media-test",
  });
  if (photo.status !== 200 || !photo.data?.ok) {
    fail(`image upload failed ${photo.status} ${JSON.stringify(photo.data)}`);
  }
  if (ackCount(photo.data.messages) !== 1) {
    fail(`first media message must get one receipt ack, got ${ackCount(photo.data.messages)}`);
  }
  const images = mediaOf(photo.data.messages, "image");
  if (!images.length || !images[0].mediaUrl) {
    fail(`image message missing mediaUrl: ${JSON.stringify(photo.data.messages)}`);
  }
  if (images[0].body !== "Rasm izoh media-test") {
    fail(`image caption missing: ${images[0].body}`);
  }
  const imageId = images[0].id;
  const served = await getMedia(imageId, visitorCookie);
  if (served.status !== 200 || !served.type.includes("image/png")) {
    fail(`visitor media GET failed ${served.status} ${served.type}`);
  }
  if (served.buf[0] !== 0x89 || served.buf[1] !== 0x50) {
    fail("served image is not a PNG");
  }
  const anon = await getMedia(imageId, "");
  if (anon.status !== 401) {
    fail(`anonymous media GET should be 401, got ${anon.status}`);
  }

  const other = await jsonReq("/api/chat", {
    body: {
      action: "start",
      name: "Boshqa Mijoz",
      phone: "+998901119901",
      language: "uz",
      page: "/nazarov",
    },
  });
  const stolen = await getMedia(imageId, `dmed_chat=${other.cookie}`);
  if (stolen.status !== 401) {
    fail(`other visitor must not read chat media, got ${stolen.status}`);
  }
  const asAdmin = await getMedia(imageId, `nazarov_session=${token}`);
  if (asAdmin.status !== 200 || asAdmin.buf[0] !== 0x89) {
    fail(`admin media GET failed ${asAdmin.status}`);
  }

  const voice = await mediaReq({
    cookie: visitorCookie,
    bytes: WEBM_STUB,
    filename: "voice.webm",
    type: "audio/webm",
    kind: "voice",
  });
  if (voice.status !== 200 || !voice.data?.ok) {
    fail(`voice upload failed ${voice.status} ${JSON.stringify(voice.data)}`);
  }
  if (ackCount(voice.data.messages) !== 1) {
    fail(`ack must stay at one after voice, got ${ackCount(voice.data.messages)}`);
  }
  if (!mediaOf(voice.data.messages, "voice").length) {
    fail("voice message kind missing");
  }

  const video = await mediaReq({
    cookie: visitorCookie,
    bytes: WEBM_STUB,
    filename: "clip.webm",
    type: "video/webm",
  });
  if (video.status !== 200 || !video.data?.ok) {
    fail(`video upload failed ${video.status} ${JSON.stringify(video.data)}`);
  }
  if (!mediaOf(video.data.messages, "video").length) {
    fail("video message kind missing");
  }

  const refuse = await mediaReq({
    cookie: visitorCookie,
    bytes: Buffer.from("not-media"),
    filename: "note.txt",
    type: "text/plain",
  });
  if (refuse.status === 200 && refuse.data?.ok) {
    fail("plain text file should not be stored as chat media");
  }

  const thread = await adminJson("/api/admin/chat", {
    method: "POST",
    token,
    body: { action: "thread", sessionId, markRead: false },
  });
  const kinds = (thread.data?.session?.messages || [])
    .filter((row) => row.role === "visitor")
    .map((row) => row.kind)
    .sort()
    .join(",");
  if (kinds !== "image,video,voice") {
    fail(`admin thread media kinds ${kinds}`);
  }
  const inbox = await adminJson(
    `/api/admin/chat?q=${encodeURIComponent("Rasm izoh media-test")}&s=${encodeURIComponent(sessionId)}`,
    { token },
  );
  const row = (inbox.data?.sessions || []).find((item) => item.id === sessionId);
  if (!row) {
    fail("inbox missing media session");
  }
  if (!/Video|Видео/.test(String(row.lastBody || ""))) {
    fail(`inbox preview should show last video: ${JSON.stringify(row.lastBody)}`);
  }

  const reply = await adminJson("/api/admin/chat", {
    method: "POST",
    token,
    body: { sessionId, text: "Rasm va videoni ko‘rdik." },
  });
  if (reply.status !== 200 || !reply.data?.ok) {
    fail(`media admin reply failed ${JSON.stringify(reply.data)}`);
  }
  const expired = await adminJson("/api/admin/chat", {
    method: "POST",
    token,
    body: { action: "expire", idleMs: 0, sessionId },
  });
  if (expired.status !== 200 || expired.data?.ok !== true || expired.data?.closed < 1) {
    fail(`media expire failed ${JSON.stringify(expired.data)}`);
  }
  const closedMedia = await mediaReq({
    cookie: visitorCookie,
    bytes: PNG_1X1,
    filename: "late.png",
    type: "image/png",
  });
  if (closedMedia.status === 200 && closedMedia.data?.ok) {
    fail("closed chat must reject media uploads");
  }
}

async function assertChatMediaLoop(token, rounds) {
  for (let i = 0; i < rounds; i++) {
    const start = await jsonReq("/api/chat", {
      body: {
        action: "start",
        name: `MediaLoop ${i + 1}`,
        phone: `+99890${String(2000000 + i).slice(-7)}`,
        language: i % 2 === 0 ? "uz" : "ru",
        page: "/nazarov",
      },
    });
    if (!start.data?.ok) fail(`media loop start ${i} failed`);
    const cookie = `dmed_chat=${start.cookie}`;
    const photo = await mediaReq({
      cookie,
      bytes: PNG_1X1,
      filename: "loop.png",
      type: "image/png",
    });
    if (photo.status !== 200 || !photo.data?.ok) {
      fail(`media loop image ${i} failed ${photo.status} ${JSON.stringify(photo.data)}`);
    }
    if (ackCount(photo.data.messages) !== 1) {
      fail(`media loop ack ${i} was ${ackCount(photo.data.messages)}`);
    }
    const image = mediaOf(photo.data.messages, "image")[0];
    const served = await getMedia(image.id, cookie);
    if (served.status !== 200) fail(`media loop GET ${i} ${served.status}`);
    if (i % 5 === 0) {
      const voice = await mediaReq({
        cookie,
        bytes: WEBM_STUB,
        filename: "loop.webm",
        type: "audio/webm",
      });
      if (!mediaOf(voice.data?.messages, "voice").length) {
        fail(`media loop voice ${i} failed`);
      }
    }
  }
}

async function assertCustomTemplates(token) {
  const stamp = Date.now();
  const label = `Narx ${stamp}`;
  const body = "Dars narxi 150 ming so‘m. Shu chatda yozing.";
  const created = await adminJson("/api/admin/chat", {
    method: "POST",
    token,
    body: { action: "template-save", lang: "uz", label, body },
  });
  if (created.status !== 200 || !created.data?.ok || !created.data.template?.id) {
    fail(`custom template create failed ${created.status} ${JSON.stringify(created.data)}`);
  }
  const id = created.data.template.id;
  if (!String(id).startsWith("c-")) {
    fail(`custom template id should be stored, got ${id}`);
  }
  const listed = (created.data.templates?.uz || []).find((row) => row.id === id);
  if (!listed || listed.body !== body || listed.label !== label || !listed.custom) {
    fail(`created template missing from pack: ${JSON.stringify(listed)}`);
  }
  const inbox = await adminJson("/api/admin/chat", { token });
  if (!(inbox.data?.templates?.uz || []).some((row) => row.id === id && row.body === body)) {
    fail("GET /api/admin/chat did not return the saved custom template");
  }
  if (typeof inbox.data?.folders?.all !== "number" || typeof inbox.data?.unread !== "number") {
    fail("admin folders/unread counts missing");
  }
  const updatedBody = `${body} Yangilandi.`;
  const updated = await adminJson("/api/admin/chat", {
    method: "POST",
    token,
    body: {
      action: "template-save",
      id,
      lang: "uz",
      label: "Narx yangi",
      body: updatedBody,
    },
  });
  if (!updated.data?.ok || updated.data.template?.body !== updatedBody) {
    fail(`custom template update failed ${JSON.stringify(updated.data)}`);
  }
  const empty = await adminJson("/api/admin/chat", {
    method: "POST",
    token,
    body: { action: "template-save", lang: "uz", label: "x", body: "ab" },
  });
  if (empty.status === 200 && empty.data?.ok) {
    fail("short template text should be rejected");
  }
  const blocked = await adminJson("/api/admin/chat", {
    method: "POST",
    token,
    body: { action: "template-delete", id: "uz-dars-ochiq" },
  });
  if (blocked.status === 200 && blocked.data?.ok) {
    fail("builtin template must not be deletable");
  }
  const visitorStart = await jsonReq("/api/chat", {
    body: {
      action: "start",
      name: "Shablon Mijoz",
      phone: "+998901119977",
      language: "uz",
      page: "/nazarov",
    },
  });
  const question = await jsonReq("/api/chat", {
    cookie: `dmed_chat=${visitorStart.cookie}`,
    body: { action: "message", text: "Narx qancha?", page: "/nazarov" },
  });
  if (!question.data?.ok) fail("template roundtrip visitor message failed");
  const reply = await adminJson("/api/admin/chat", {
    method: "POST",
    token,
    body: { sessionId: visitorStart.data.sessionId, text: updatedBody },
  });
  if (!reply.data?.ok) fail(`custom template reply failed ${JSON.stringify(reply.data)}`);
  const loaded = await jsonReq("/api/chat", {
    method: "GET",
    cookie: `dmed_chat=${visitorStart.cookie}`,
  });
  const bodies = bodiesOf(loaded.data?.session?.messages);
  if (!bodies.includes(updatedBody)) {
    fail(`visitor did not see custom template reply: ${bodies}`);
  }
  const deleted = await adminJson("/api/admin/chat", {
    method: "POST",
    token,
    body: { action: "template-delete", id },
  });
  if (!deleted.data?.ok) {
    fail(`custom template delete failed ${JSON.stringify(deleted.data)}`);
  }
  const after = await adminJson("/api/admin/chat", { token });
  if ((after.data?.templates?.uz || []).some((row) => row.id === id)) {
    fail("deleted custom template still listed");
  }
}

async function assertOperatorClose(token) {
  const missing = await adminJson("/api/admin/chat", {
    method: "POST",
    token,
    body: { action: "close", sessionId: "missing-session" },
  });
  if (missing.status === 200 && missing.data?.ok) {
    fail("closing a missing chat should fail");
  }

  const start = await jsonReq("/api/chat", {
    body: {
      action: "start",
      name: "Yakunlash Mijoz",
      phone: "+998901118877",
      language: "uz",
      page: "/nazarov",
    },
  });
  if (!start.data?.ok || !start.cookie || !start.data.sessionId) {
    fail(`close-test start failed ${JSON.stringify(start.data)}`);
  }
  const visitorCookie = `dmed_chat=${start.cookie}`;
  const sessionId = start.data.sessionId;
  const asked = await jsonReq("/api/chat", {
    cookie: visitorCookie,
    body: { action: "message", text: "Yakunlash testi: savol.", page: "/nazarov" },
  });
  if (!asked.data?.ok) fail("close-test visitor message failed");

  const closed = await adminJson("/api/admin/chat", {
    method: "POST",
    token,
    body: { action: "close", sessionId },
  });
  if (closed.status !== 200 || !closed.data?.ok || closed.data.session?.status !== "closed") {
    fail(`operator close failed ${closed.status} ${JSON.stringify(closed.data)}`);
  }
  const promptBodies = bodiesOf(closed.data.session.messages);
  if (!promptBodies.includes(RATE_UZ) && !promptBodies.includes(RATE_RU)) {
    fail(`operator close must send rating prompt: ${promptBodies}`);
  }

  const visitor = await jsonReq("/api/chat", {
    method: "GET",
    cookie: visitorCookie,
  });
  const session = visitor.data?.session;
  if (!session || session.status !== "closed" || session.canSend !== false || session.canRate !== true || session.canRestart !== true) {
    fail(`visitor flags after operator close: ${JSON.stringify(session)}`);
  }
  if (ackCount(session.messages) !== 1) {
    fail("operator close must keep a single receipt ack");
  }

  const blocked = await jsonReq("/api/chat", {
    cookie: visitorCookie,
    body: { action: "message", text: "yopilgandan keyin" },
  });
  if (blocked.status === 200 && blocked.data?.ok) {
    fail("visitor should not send after operator closes the chat");
  }

  const twice = await adminJson("/api/admin/chat", {
    method: "POST",
    token,
    body: { action: "close", sessionId },
  });
  if (twice.status === 200 && twice.data?.ok) {
    fail("closing an already closed chat should fail");
  }

  const rejectedGood = await jsonReq("/api/chat", {
    cookie: visitorCookie,
    body: { action: "rate", rating: "good" },
  });
  if (rejectedGood.status === 200 && rejectedGood.data?.ok) {
    fail("legacy good/bad rating must be rejected");
  }
  const rejectedRange = await jsonReq("/api/chat", {
    cookie: visitorCookie,
    body: { action: "rate", rating: 6 },
  });
  if (rejectedRange.status === 200 && rejectedRange.data?.ok) {
    fail("out-of-range rating must be rejected");
  }

  const rated = await jsonReq("/api/chat", {
    cookie: visitorCookie,
    body: { action: "rate", rating: 5 },
  });
  if (rated.status !== 200 || !rated.data?.ok || String(rated.data.session?.rating) !== "5") {
    fail(`visitor rating after operator close failed ${JSON.stringify(rated.data)}`);
  }
  const thanks = bodiesOf(rated.data.session.messages);
  if (!thanks.includes(THANKS_UZ) && !thanks.includes(THANKS_RU)) {
    fail(`thanks missing after operator-close rating: ${thanks}`);
  }
  const inbox = await adminJson(`/api/admin/chat?s=${encodeURIComponent(sessionId)}`, { token });
  const row = (inbox.data?.sessions || []).find((item) => item.id === sessionId);
  if (row?.status !== "closed" || String(row?.rating) !== "5") {
    fail(`inbox missing closed rating after operator close: ${JSON.stringify(row)}`);
  }
  await assertRestart(visitorCookie.replace(/^dmed_chat=/, ""), sessionId);

  const withReply = await jsonReq("/api/chat", {
    body: {
      action: "start",
      name: "Yakunlash Javob",
      phone: "+998901118878",
      language: "uz",
      page: "/nazarov",
    },
  });
  await jsonReq("/api/chat", {
    cookie: `dmed_chat=${withReply.cookie}`,
    body: { action: "message", text: "Avval javob, keyin yakun.", page: "/nazarov" },
  });
  const replied = await adminJson("/api/admin/chat", {
    method: "POST",
    token,
    body: { sessionId: withReply.data.sessionId, text: "Javob berdik, yakunlaymiz." },
  });
  if (!replied.data?.ok) fail("close-test admin reply failed");
  const ended = await adminJson("/api/admin/chat", {
    method: "POST",
    token,
    body: { action: "close", sessionId: withReply.data.sessionId },
  });
  if (!ended.data?.ok || ended.data.session?.status !== "closed") {
    fail(`close after reply failed ${JSON.stringify(ended.data)}`);
  }
  const afterReply = await jsonReq("/api/chat", {
    method: "GET",
    cookie: `dmed_chat=${withReply.cookie}`,
  });
  if (afterReply.data?.session?.canRate !== true || afterReply.data?.session?.canRestart !== true) {
    fail("visitor must be asked to rate after operator ends a replied chat");
  }
  await assertRestart(withReply.cookie, withReply.data.sessionId);
}

async function assertVisitorIp(token) {
  async function startWithHeaders(headers, name) {
    const started = await jsonReq("/api/chat", {
      extraHeaders: headers,
      body: {
        action: "start",
        name,
        phone: "+998901112233",
        language: "uz",
        page: "/nazarov",
      },
    });
    if (started.status !== 200 || !started.data?.ok || !started.data?.sessionId) {
      fail(`IP start failed ${started.status} ${JSON.stringify(started.data)}`);
    }
    if (started.data.session?.ip || started.data.ip) {
      fail("visitor IP must not leak to the public chat session");
    }
    return started;
  }

  async function expectAdminIp(sessionId, expected, label) {
    const opened = await adminJson("/api/admin/chat", {
      method: "POST",
      token,
      body: { action: "thread", sessionId, markRead: false },
    });
    if (opened.data?.session?.ip !== expected) {
      fail(`${label}: admin thread missing visitor IP, got ${JSON.stringify(opened.data?.session)}`);
    }
    const inbox = await adminJson(
      `/api/admin/chat?q=${encodeURIComponent(expected)}`,
      { token },
    );
    if (!(inbox.data?.sessions || []).some((row) => row.id === sessionId && row.ip === expected)) {
      fail(`${label}: admin inbox search must find the chat by visitor IP`);
    }
  }

  const cf = "203.0.113.77";
  const started = await startWithHeaders(
    {
      "cf-connecting-ip": cf,
      "x-forwarded-for": `${cf}, 10.0.0.1`,
    },
    "IP tekshiruv",
  );
  await expectAdminIp(started.data.sessionId, cf, "cloudflare");

  const real = "198.51.100.24";
  const fromReal = await startWithHeaders({ "x-real-ip": real }, "IP real-ip");
  await expectAdminIp(fromReal.data.sessionId, real, "x-real-ip");

  const publicBehindNat = "198.51.100.88";
  const fromXff = await startWithHeaders(
    { "x-forwarded-for": `10.0.0.8, ${publicBehindNat}` },
    "IP xff",
  );
  await expectAdminIp(fromXff.data.sessionId, publicBehindNat, "xff-public");

  const v6 = "2001:db8:85a3::8a2e:370:7334";
  const fromV6 = await startWithHeaders({ "cf-connecting-ip": v6 }, "IP v6");
  await expectAdminIp(fromV6.data.sessionId, v6, "ipv6");

  const forwarded = "203.0.113.91";
  const fromFwd = await startWithHeaders(
    { forwarded: `for="${forwarded}";proto=https` },
    "IP forwarded",
  );
  await expectAdminIp(fromFwd.data.sessionId, forwarded, "forwarded");

  const health = await fetch(`${BASE}/api/health`, {
    headers: { "cf-connecting-ip": cf },
  });
  const healthData = await health.json().catch(() => null);
  if (healthData?.visitorIp !== cf) {
    fail(`health visitorIp expected ${cf}, got ${JSON.stringify(healthData)}`);
  }
}

async function assertAdminRoundtrip(token, visitorCookie, visitorText, replyText, sessionId) {
  const inbox = await adminJson(
    `/api/admin/chat?q=${encodeURIComponent(visitorText)}&s=${encodeURIComponent(sessionId)}`,
    { token },
  );
  if (inbox.status !== 200 || !Array.isArray(inbox.data?.sessions)) {
    fail(`admin inbox failed ${inbox.status} ${JSON.stringify(inbox.data)}`);
  }
  if (!inbox.data?.stats || typeof inbox.data.stats.total !== "number") {
    fail("admin inbox is missing dashboard stats");
  }
  if (typeof inbox.data.stats.rated !== "number" || !inbox.data.stats.stars) {
    fail("admin inbox is missing 5-star rating stats");
  }
  if (!Array.isArray(inbox.data.stats.daily)) {
    fail("admin inbox is missing daily analytics");
  }
  if (!Array.isArray(inbox.data.templates?.uz) || inbox.data.templates.uz.length < 6) {
    fail("admin chat is missing Uzbek reply templates");
  }
  if (!Array.isArray(inbox.data.templates?.ru) || inbox.data.templates.ru.length < 6) {
    fail("admin chat is missing Russian reply templates");
  }
  const found = (inbox.data.sessions || []).find((row) => row.id === sessionId);
  if (!found) {
    fail(`admin inbox missing session ${sessionId} for ${visitorText}`);
  }
  if (!found.unread) {
    fail("new visitor message should be unread in admin inbox");
  }
  if ((found.unreadCount || 0) < 2) {
    fail(`unread count should stay until admin replies, got ${found.unreadCount}`);
  }
  const opened = await adminJson("/api/admin/chat", {
    method: "POST",
    token,
    body: { action: "thread", sessionId, markRead: true },
  });
  if (opened.status !== 200 || !opened.data?.ok) {
    fail(`open thread failed ${opened.status} ${JSON.stringify(opened.data)}`);
  }
  const stillWaiting = await adminJson(
    `/api/admin/chat?s=${encodeURIComponent(sessionId)}`,
    { token },
  );
  const waitingRow = (stillWaiting.data?.sessions || []).find((row) => row.id === sessionId);
  if (!waitingRow?.unread) {
    fail("opening a thread must not clear the blue unread count until admin replies");
  }
  if ((waitingRow.unreadCount || 0) < 2) {
    fail(`unread count vanished on open: ${waitingRow.unreadCount}`);
  }
  const inNew = await adminJson(
    `/api/admin/chat?f=new&q=${encodeURIComponent(visitorText)}`,
    { token },
  );
  if (!(inNew.data?.sessions || []).some((row) => row.id === sessionId)) {
    fail("unanswered chat should appear in Yangi filter");
  }
  const notRepliedYet = await adminJson(
    `/api/admin/chat?f=replied&q=${encodeURIComponent(visitorText)}`,
    { token },
  );
  if ((notRepliedYet.data?.sessions || []).some((row) => row.id === sessionId)) {
    fail("unanswered chat should not appear in Javoblangan filter");
  }
  const template = (inbox.data.templates?.uz || []).find(
    (row) => row.id === "uz-dars-ochiq" && typeof row.body === "string",
  );
  if (!template?.body) {
    fail("Dars ochiq template is missing");
  }
  const reply = await adminJson("/api/admin/chat", {
    method: "POST",
    token,
    body: { sessionId, text: template.body },
  });
  if (reply.status !== 200 || !reply.data?.ok) {
    fail(`admin reply failed ${reply.status} ${JSON.stringify(reply.data)}`);
  }
  const loaded = await jsonReq("/api/chat", {
    method: "GET",
    cookie: `dmed_chat=${visitorCookie}`,
  });
  const bodies = bodiesOf(loaded.data?.session?.messages);
  if (!bodies.includes(template.body)) {
    fail(`visitor did not see template reply: ${bodies}`);
  }
  if (ackCount(loaded.data?.session?.messages) !== 1) {
    fail(`ack should still appear once after admin reply, got ${ackCount(loaded.data?.session?.messages)}`);
  }
  const after = await adminJson(`/api/admin/chat?s=${encodeURIComponent(sessionId)}`, { token });
  const row = (after.data?.sessions || []).find((item) => item.id === sessionId);
  if (row?.unread || (row?.unreadCount || 0) > 0) {
    fail("blue unread count should disappear after admin reply");
  }
  const stillNew = await adminJson(
    `/api/admin/chat?f=new&q=${encodeURIComponent(visitorText)}`,
    { token },
  );
  if ((stillNew.data?.sessions || []).some((item) => item.id === sessionId)) {
    fail("answered chat should leave the Yangi filter");
  }
  const inReplied = await adminJson(
    `/api/admin/chat?f=replied&q=${encodeURIComponent(visitorText)}`,
    { token },
  );
  const repliedRow = (inReplied.data?.sessions || []).find((item) => item.id === sessionId);
  if (!repliedRow || repliedRow.unread) {
    fail("answered chat should appear in Javoblangan filter without a blue count");
  }
}

async function assertCloseRateStats(token, visitorCookie, sessionId, rating) {
  const day = utcDay(0);
  const before = await adminJson(`/api/admin/chat?from=${day}&to=${day}`, { token });
  const prev = before.data?.stats;
  if (!prev) fail("dashboard stats missing before close");

  const expired = await adminJson("/api/admin/chat", {
    method: "POST",
    token,
    body: { action: "expire", idleMs: 0, sessionId, from: day, to: day },
  });
  if (expired.status !== 200 || expired.data?.ok !== true || expired.data?.closed < 1) {
    fail(`expire failed ${expired.status} ${JSON.stringify(expired.data)}`);
  }

  const closed = await jsonReq("/api/chat?expire=1", {
    method: "GET",
    cookie: `dmed_chat=${visitorCookie}`,
  });
  const session = closed.data?.session;
  if (!session || session.status !== "closed" || session.canSend !== false || session.canRate !== true || session.canRestart !== true) {
    fail(`closed session flags wrong: ${JSON.stringify(session)}`);
  }
  const closedBodies = bodiesOf(session.messages);
  if (!closedBodies.includes(RATE_UZ) && !closedBodies.includes(RATE_RU)) {
    fail(`rating prompt missing: ${closedBodies}`);
  }
  if (ackCount(session.messages) !== 1) {
    fail("closed chat must still have exactly one receipt ack");
  }

  const blocked = await jsonReq("/api/chat", {
    cookie: `dmed_chat=${visitorCookie}`,
    body: { action: "message", text: "yopilgandan keyin" },
  });
  if (blocked.status === 200 && blocked.data?.ok) {
    fail("visitor should not send after chat is closed");
  }

  const rated = await jsonReq("/api/chat", {
    cookie: `dmed_chat=${visitorCookie}`,
    body: { action: "rate", rating },
  });
  if (rated.status !== 200 || !rated.data?.ok) {
    fail(`rate failed ${rated.status} ${JSON.stringify(rated.data)}`);
  }
  const afterSession = rated.data?.session;
  if (
    !afterSession ||
    afterSession.canRate !== false ||
    String(afterSession.rating) !== starKey(rating) ||
    afterSession.canRestart !== true
  ) {
    fail(`rated session flags wrong: ${JSON.stringify(afterSession)}`);
  }
  const thanks = bodiesOf(afterSession.messages);
  if (!thanks.includes(THANKS_UZ) && !thanks.includes(THANKS_RU)) {
    fail(`thanks missing after rating: ${thanks}`);
  }

  const twice = await jsonReq("/api/chat", {
    cookie: `dmed_chat=${visitorCookie}`,
    body: { action: "rate", rating: starKey(rating) === "5" ? 1 : 5 },
  });
  if (twice.status === 200 && twice.data?.ok) {
    fail("rating should only be accepted once");
  }

  const after = await adminJson(`/api/admin/chat?from=${day}&to=${day}&s=${encodeURIComponent(sessionId)}`, {
    token,
  });
  const stats = after.data?.stats;
  if (!stats) fail("dashboard stats missing after rating");
  if (stats.closed < prev.closed + 1) {
    fail(`closed count did not increase: ${prev.closed} -> ${stats.closed}`);
  }
  if ((stats.rated || 0) < (prev.rated || 0) + 1) {
    fail(`rated count did not increase: ${prev.rated} -> ${stats.rated}`);
  }
  if (starCount(stats, rating) < starCount(prev, rating) + 1) {
    fail(`star ${rating} count did not increase: ${JSON.stringify(prev.stars)} -> ${JSON.stringify(stats.stars)}`);
  }
  if (stats.avg == null || !Number.isFinite(Number(stats.avg))) {
    fail(`average rating missing after a 5-star vote: ${JSON.stringify(stats)}`);
  }
  const future = await adminJson(`/api/admin/chat?from=${utcDay(2)}&to=${utcDay(3)}`, { token });
  if ((future.data?.stats?.total || 0) !== 0) {
    fail(`future date filter should be empty, got ${JSON.stringify(future.data?.stats)}`);
  }
  const row = (after.data?.sessions || []).find((item) => item.id === sessionId);
  if (row?.status !== "closed" || String(row?.rating) !== starKey(rating)) {
    fail(`inbox row missing closed rating: ${JSON.stringify(row)}`);
  }
  await assertRestart(visitorCookie, sessionId);
}

async function main() {
  const catalog = await fetch(`${BASE}/nazarov`).then((r) => r.text());
  if (!catalog.includes('data-dmed-chat="widget"')) {
    fail("catalog is missing the Dmed chat widget");
  }
  if (!catalog.includes(">Dmed<") && !catalog.includes("Dmed bilan")) {
    fail("catalog does not show Dmed chat launcher");
  }
  if (catalog.includes("/telegram-ulash") && catalog.includes("Telegramni ulash")) {
    fail("catalog widget should not ask to connect Telegram");
  }

  const lesson = await fetch(`${BASE}/m/login-to-system-uz`).then((r) => r.text());
  if (!lesson.includes('data-dmed-chat="widget"')) {
    fail("lesson page is missing the Dmed chat widget");
  }

  const admin = await fetch(`${BASE}/admin/login`).then((r) => r.text());
  if (admin.includes('data-dmed-chat="launcher"') || admin.includes('data-dmed-chat="widget"')) {
    fail("admin login should not show the client Dmed chat");
  }

  const token = await adminLogin();
  const adminHome = await fetch(`${BASE}/admin`, {
    headers: { cookie: `nazarov_session=${token}` },
  }).then((r) => r.text());
  if (!adminHome.includes('data-admin-chat="home"') || !adminHome.includes('data-admin-nav="chat"')) {
    fail("admin home is missing the Chat section");
  }
  if (adminHome.includes("CallMeBot") || adminHome.includes("Telegramni ulash")) {
    fail("admin home should not require Telegram");
  }

  const chatPage = await fetch(`${BASE}/admin/chat`, {
    headers: { cookie: `nazarov_session=${token}` },
  }).then((r) => r.text());
  if (!chatPage.includes('data-admin-chat="inbox"')) {
    fail("admin chat page is missing the inbox");
  }
  if (
    !chatPage.includes('data-admin-chat="filters"') ||
    !chatPage.includes('data-inbox-filter="all"') ||
    !chatPage.includes('data-inbox-filter="new"') ||
    !chatPage.includes('data-inbox-filter="replied"')
  ) {
    fail("admin chat inbox is missing Hammasi / Yangi / Javoblangan filters");
  }
  if (!chatPage.includes('data-admin-chat="stats"')) {
    fail("admin chat page is missing the dashboard");
  }
  if (!chatPage.includes('data-admin-chat="analytics"')) {
    fail("admin chat page is missing daily analytics");
  }
  if (!chatPage.includes("Kunlik murojaatlar")) {
    fail("admin chat analytics is missing the daily inquiries chart");
  }
  if (!chatPage.includes("Murojaatlar") || !chatPage.includes("Yopilgan")) {
    fail("admin chat dashboard is missing inquiry/closed stats");
  }
  if (!chatPage.includes("Baholangan") || !chatPage.includes("O‘rtacha baho")) {
    fail("admin chat dashboard is missing 5-star rating stats");
  }
  if (!chatPage.includes("5 ballik") && !chatPage.includes("star-breakdown")) {
    fail("admin chat dashboard is missing 5-star analytics");
  }
  if (!chatPage.includes("shablon")) {
    fail("admin chat should mention reply templates");
  }

  const navSrc = fs.readFileSync(
    path.join(__dirname, "../src/components/admin-chat-nav.tsx"),
    "utf8",
  );
  const inboxSrc = fs.readFileSync(
    path.join(__dirname, "../src/components/admin-chat-inbox.tsx"),
    "utf8",
  );
  const templateSrc = fs.readFileSync(
    path.join(__dirname, "../src/components/admin-chat-templates.tsx"),
    "utf8",
  );
  if (navSrc.includes("99+") || inboxSrc.includes("99+")) {
    fail("admin Chat counts must show the real total, not 99+");
  }
  if (!templateSrc.includes('data-chat-template="create"') || !templateSrc.includes("template-label")) {
    fail("admin Chat is missing the manual template create form");
  }
  if (!inboxSrc.includes('data-admin-chat="close"') || !inboxSrc.includes("Suhbatni yakunlash")) {
    fail("admin Chat is missing the end-conversation button");
  }
  if (!inboxSrc.includes("data-visitor-ip") || !inboxSrc.includes("IP ")) {
    fail("admin Chat must show the visitor IP");
  }
  if (!inboxSrc.includes("data-inbox-ip") || !inboxSrc.includes("{row.ip}")) {
    fail("admin inbox list must show the visitor IP on each chat");
  }
  const dmedSrc = fs.readFileSync(
    path.join(__dirname, "../src/components/dmed-chat.tsx"),
    "utf8",
  );
  const dashSrc = fs.readFileSync(
    path.join(__dirname, "../src/components/admin-chat-dashboard.tsx"),
    "utf8",
  );
  if (!dmedSrc.includes('data-dmed-chat="restart"') || !dmedSrc.includes("Yangi suhbat")) {
    fail("visitor widget is missing the new-chat button after close");
  }
  if (/\bYaxshi\b/.test(dmedSrc) || /\bYomon\b/.test(dmedSrc)) {
    fail("visitor rating must use 1–5 stars, not Yaxshi/Yomon");
  }
  if (dashSrc.includes('label: "Yaxshi"') || dashSrc.includes('label: "Yomon"')) {
    fail("admin analytics must use the 5-star system, not Yaxshi/Yomon");
  }
  if (!dashSrc.includes("star-breakdown") || !dashSrc.includes("O‘rtacha baho")) {
    fail("admin dashboard is missing 5-star analytics");
  }

  await assertCustomTemplates(token);
  await assertOperatorClose(token);
  await assertVisitorIp(token);

  const empty = await jsonReq("/api/chat", {
    body: { action: "start", name: "", phone: "123" },
  });
  if (empty.status !== 400 || empty.data?.ok !== false || !empty.data?.errors?.name) {
    fail(`empty start should 400, got ${empty.status} ${JSON.stringify(empty.data)}`);
  }

  const badMail = await jsonReq("/api/chat", {
    body: {
      action: "start",
      name: "Ali",
      phone: "+998901234567",
      email: "not-an-email",
    },
  });
  if (badMail.status !== 400 || !badMail.data?.errors?.email) {
    fail(`bad email should 400, got ${badMail.status} ${JSON.stringify(badMail.data)}`);
  }

  await assertChatMedia(token);
  await assertChatMediaLoop(token, 20);

  const results = [];
  for (let i = 0; i < TOTAL; i++) {
    const t0 = Date.now();
    try {
      const start = await jsonReq("/api/chat", {
        body: {
          action: "start",
          name: `Mijoz ${i + 1}`,
          phone: `+99890${String(1000000 + (i % 8000000)).slice(-7)}`,
          email: i % 5 === 0 ? `mijoz${i}@dmed.uz` : "",
          language: i % 2 === 0 ? "uz" : "ru",
          page: "/nazarov",
        },
      });
      if (start.status !== 200 || !start.data?.ok || !start.cookie || !start.data?.sessionId) {
        throw new Error(
          `start failed ${start.status} ${JSON.stringify(start.data)}`,
        );
      }
      if (!Array.isArray(start.data.messages) || start.data.messages.length < 1) {
        throw new Error("start did not return Dmed greeting");
      }
      if (ackCount(start.data.messages) !== 0) {
        throw new Error("greeting must not send the receipt ack");
      }
      if (start.data.session?.name || start.data.name) {
        throw new Error("start leaked visitor name in session");
      }
      const visitorName = `Mijoz ${i + 1}`;
      const startBodies = bodiesOf(start.data.messages);
      if (
        startBodies.includes(visitorName) ||
        /Assalomu alaykum,/i.test(startBodies) ||
        /Здравствуйте,/i.test(startBodies)
      ) {
        throw new Error("start greeting showed visitor name");
      }
      if (/Telegram/i.test(startBodies)) {
        throw new Error("start greeting mentioned Telegram");
      }
      const visitorText = `Test xabar ${i + 1}: dars bo‘yicha savol.`;
      const msg = await jsonReq("/api/chat", {
        cookie: `dmed_chat=${start.cookie}`,
        body: {
          action: "message",
          text: visitorText,
          page: "/nazarov",
        },
      });
      if (msg.status !== 200 || !msg.data?.ok) {
        throw new Error(
          `message failed ${msg.status} ${JSON.stringify(msg.data)}`,
        );
      }
      if (ackCount(msg.data.messages) !== 1) {
        throw new Error(
          `first visitor message must get exactly one receipt ack, got ${ackCount(msg.data.messages)}`,
        );
      }
      const bodies = bodiesOf(msg.data.messages);
      if (!bodies.includes(`Test xabar ${i + 1}`)) {
        throw new Error("visitor message missing from thread");
      }
      if (bodies.includes(visitorName)) {
        throw new Error(`chat showed visitor name: ${visitorName}`);
      }
      if (/Telegram/i.test(bodies)) {
        throw new Error("chat reply mentioned Telegram");
      }
      if (LIVE && !start.data?.telegram?.ok) {
        throw new Error(`start telegram not delivered: ${JSON.stringify(start.data?.telegram)}`);
      }
      if (LIVE && !msg.data?.telegram?.ok) {
        throw new Error(`message telegram not delivered: ${JSON.stringify(msg.data?.telegram)}`);
      }
      const secondText = `Ikkinchi xabar ${i + 1}: qo‘shimcha savol.`;
      const second = await jsonReq("/api/chat", {
        cookie: `dmed_chat=${start.cookie}`,
        body: {
          action: "message",
          text: secondText,
          page: "/nazarov",
        },
      });
      if (second.status !== 200 || !second.data?.ok) {
        throw new Error(`second message failed ${second.status} ${JSON.stringify(second.data)}`);
      }
      if (ackCount(second.data.messages) !== 1) {
        throw new Error(
          `receipt ack must stay at one after later messages, got ${ackCount(second.data.messages)}`,
        );
      }
      const loaded = await jsonReq("/api/chat", {
        method: "GET",
        cookie: `dmed_chat=${start.cookie}`,
      });
      if (!loaded.data?.session || loaded.data.session.name) {
        throw new Error("GET leaked visitor name or missing session");
      }
      const loadedBodies = bodiesOf(loaded.data.session.messages);
      if (loadedBodies.includes(visitorName) || /Assalomu alaykum,/i.test(loadedBodies)) {
        throw new Error("GET transcript showed visitor name");
      }
      if (ackCount(loaded.data.session.messages) !== 1) {
        throw new Error("GET transcript must keep a single receipt ack");
      }
      if (loaded.data.session.waitingForOperator !== true) {
        throw new Error("visitor thread should wait for operator after a question");
      }
      if (loaded.data.session.canSend !== true || loaded.data.session.status !== "open") {
        throw new Error("open chat should still allow sending");
      }
      const peek = await adminJson(
        `/api/admin/chat?s=${encodeURIComponent(start.data.sessionId)}`,
        { token },
      );
      const peekRow = (peek.data?.sessions || []).find(
        (row) => row.id === start.data.sessionId,
      );
      if (!peekRow?.unread || (peekRow.unreadCount || 0) < 2) {
        throw new Error(
          `admin must keep visitor message count until reply, got ${JSON.stringify({
            unread: peekRow?.unread,
            unreadCount: peekRow?.unreadCount,
          })}`,
        );
      }
      const inNew = await adminJson(
        `/api/admin/chat?f=new&q=${encodeURIComponent(secondText)}`,
        { token },
      );
      if (!(inNew.data?.sessions || []).some((row) => row.id === start.data.sessionId)) {
        throw new Error("new visitor thread missing from Yangi filter");
      }
      const inReplied = await adminJson(
        `/api/admin/chat?f=replied&q=${encodeURIComponent(secondText)}`,
        { token },
      );
      if ((inReplied.data?.sessions || []).some((row) => row.id === start.data.sessionId)) {
        throw new Error("unanswered thread leaked into Javoblangan filter");
      }
      if (i === 0 || (i + 1) % 50 === 0) {
        await assertAdminRoundtrip(
          token,
          start.cookie,
          secondText,
          `Admin javob ${i + 1}: dars ochiq, davom eting.`,
          start.data.sessionId,
        );
        await assertCloseRateStats(
          token,
          start.cookie,
          start.data.sessionId,
          (i + 1) % 100 === 0 ? "1" : "5",
        );
      }
      results.push({ i, status: 200, ms: Date.now() - t0 });
    } catch (error) {
      results.push({ i, status: 0, ms: Date.now() - t0, error: String(error) });
    }
    if ((i + 1) % 100 === 0) {
      process.stdout.write(`chat progress ${i + 1}/${TOTAL}\n`);
    }
  }

  const failed = results.filter((r) => r.error || r.status !== 200);
  const avg =
    results.reduce((sum, r) => sum + (r.ms || 0), 0) / Math.max(results.length, 1);
  console.log(
    JSON.stringify(
      {
        total: results.length,
        failed: failed.length,
        avgMs: Math.round(avg),
        sampleFails: failed.slice(0, 8),
      },
      null,
      2,
    ),
  );
  if (LIVE) {
    const mockUrl = process.env.TELEGRAM_MOCK_URL || "http://127.0.0.1:9377/_count";
    const mock = await fetch(mockUrl).then((r) => r.json()).catch(() => null);
    if (!mock || mock.count < TOTAL * 2) {
      fail(
        `telegram mock count ${mock && mock.count} expected >= ${TOTAL * 2}`,
      );
    }
    console.log(`telegram mock delivered ${mock.count} messages`);
  }
  if (failed.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
