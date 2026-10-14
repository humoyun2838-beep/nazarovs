#!/usr/bin/env node
const BASE = process.env.BASE_URL || "http://127.0.0.1:3847";

function fail(message) {
  throw new Error(message);
}

async function json(path, { method = "GET", cookie, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(cookie ? { cookie: `nazarov_session=${cookie}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

(async () => {
  const form = new FormData();
  form.set("username", "Nazarov");
  form.set("password", process.env.ADMIN_PASSWORD || "local-dev-only-password");
  form.set("next", "/admin/chat");
  const login = await fetch(`${BASE}/api/login`, {
    method: "POST",
    body: form,
    redirect: "manual",
  });
  const am = (login.headers.get("set-cookie") || "").match(/nazarov_session=([^;]+)/);
  if (!am) fail(`admin cookie missing ${login.status}`);
  const token = am[1];

  const adminPage = await fetch(`${BASE}/admin/chat`, {
    headers: { cookie: `nazarov_session=${token}` },
  }).then((r) => r.text());
  if (!adminPage.includes('data-admin-chat="stats"') || !adminPage.includes("Chat statistikasi")) {
    fail("admin dashboard missing");
  }
  if (!adminPage.includes("Boshqaruv") || !adminPage.includes("Login / parol")) {
    fail("admin chrome missing");
  }
  const adminApi = await json("/api/admin/chat", { cookie: token });
  if (!adminApi.data?.ok || typeof adminApi.data.stats?.total !== "number") {
    fail("admin stats missing");
  }

  const user = `opchk${Date.now()}`;
  const issued = await json("/api/admin/clients", {
    method: "POST",
    cookie: token,
    body: {
      action: "create",
      name: "Op Check",
      username: user,
      password: "op900pass",
      expiresAt: new Date(Date.now() + 30 * 864e5).toISOString(),
    },
  });
  if (issued.status !== 200 || !issued.data?.ok) {
    fail(`create operator ${JSON.stringify(issued.data)}`);
  }

  const of = new FormData();
  of.set("username", user);
  of.set("password", "op900pass");
  of.set("role", "client");
  of.set("next", "/admin/chat");
  const ol = await fetch(`${BASE}/api/login`, {
    method: "POST",
    body: of,
    redirect: "manual",
  });
  const om = (ol.headers.get("set-cookie") || "").match(/nazarov_session=([^;]+)/);
  if (!om) fail(`op cookie ${ol.status}`);
  const oc = om[1];

  const kirish = await fetch(`${BASE}/chat/kirish`, {
    headers: { cookie: `nazarov_session=${oc}` },
    redirect: "manual",
  });
  const kLoc = kirish.headers.get("location") || "";
  if (kirish.status !== 307 || !kLoc.includes("/admin/chat")) {
    if (kirish.status !== 200) {
      fail(`logged operator /chat/kirish ${kirish.status} ${kLoc}`);
    }
    const html = await kirish.text();
    if (!html.includes("data-staff-chat")) {
      fail(`logged operator /chat/kirish stayed on login ${kirish.status}`);
    }
  }

  const opPage = await fetch(`${BASE}/admin/chat`, {
    headers: { cookie: `nazarov_session=${oc}` },
  }).then((r) => r.text());
  const banned = [
    'data-admin-chat="stats"',
    'data-admin-chat="analytics"',
    "Chat statistikasi",
    "Kunlik murojaatlar",
    "Boshqaruv",
    "Login / parol",
    'data-admin-nav="chat"',
    "Admin panel · Chat",
    'data-admin-chat="ai-auto"',
  ];
  for (const s of banned) {
    if (opPage.includes(s)) fail(`operator page leaked ${s}`);
  }
  if (
    !opPage.includes('data-staff-chat="only"') ||
    !opPage.includes('data-staff-chat="desk"') ||
    !opPage.includes('data-admin-chat="inbox"')
  ) {
    fail("operator missing staff inbox");
  }

  const opApi = await json("/api/admin/chat", { cookie: oc });
  if (opApi.status !== 200 || !opApi.data?.ok) fail(`op api ${JSON.stringify(opApi.data)}`);
  if (opApi.data.stats) fail("op api has stats");

  const adminHome = await fetch(`${BASE}/admin`, {
    headers: { cookie: `nazarov_session=${oc}` },
  }).then((r) => r.text());
  if (!adminHome.includes('data-staff-chat="only"') || adminHome.includes('data-admin-chat="home"')) {
    fail("/admin not chat-only for operator");
  }

  const mijoz = await fetch(`${BASE}/admin/mijozlar`, {
    headers: { cookie: `nazarov_session=${oc}` },
  }).then((r) => r.text());
  if (mijoz.includes("data-admin-clients")) fail("operator saw mijozlar");
  if (!mijoz.includes('data-staff-chat="only"')) fail("mijozlar must rewrite to staff chat");

  const cat = await fetch(`${BASE}/nazarov`, {
    headers: { cookie: `nazarov_session=${oc}` },
    redirect: "manual",
  });
  if (cat.status !== 307 || !(cat.headers.get("location") || "").includes("/admin/chat")) {
    fail(`catalog redirect ${cat.status} ${cat.headers.get("location")}`);
  }

  const clients = await json("/api/admin/clients", { cookie: oc });
  if (clients.status !== 401) fail(`clients api ${clients.status}`);
  const mats = await json("/api/admin/materials", { cookie: oc });
  if (mats.status !== 401) fail(`materials api ${mats.status}`);

  const leaks = ["AI javob", "Materiallar", 'data-admin-chat="ai-auto"'];
  const found = {};
  for (const s of leaks) {
    const i = opPage.indexOf(s);
    found[s] = i;
    if (i >= 0) found[`${s} ctx`] = opPage.slice(Math.max(0, i - 70), i + 70);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        operator: user,
        adminStatsTotal: adminApi.data.stats.total,
        checks: 14,
        leaks: found,
      },
      null,
      2,
    ),
  );
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
