import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { SignJWT } from "jose";

for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!match || process.env[match[1]]) continue;
  process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
}

const { db } = await import("../src/db/index.ts");
const { clientRequests, users } = await import("../src/db/schema.ts");
const { createClientDirect } = await import("../src/lib/clients.ts");
const { createOperator, setOperatorStatus } = await import("../src/lib/operators.ts");
const { createSessionToken } = await import("../src/lib/session.ts");

const base = "http://127.0.0.1:3847";
const stamp = Date.now().toString(36);
const opUser = `qaop${stamp}`.slice(0, 20);
const blockedUser = `qabl${stamp}`.slice(0, 20);
const clientUser = `qacl${stamp}`.slice(0, 20);
const expiredClientUser = `qaex${stamp}`.slice(0, 20);
const opPass = `Op-${stamp}-Aa1`;
const clientPass = `Cl-${stamp}-Aa1`;
const rows = [];

function record(id, input, expected, actual) {
  const pass = actual === expected;
  rows.push({ id, input, expected, actual, pass });
}

function cookieNames(res) {
  const listed = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const raw = [res.headers.get("set-cookie") || "", ...listed].join("\n");
  return [...raw.matchAll(/(?:^|[\n,])\s*([^=,\s]+)=/g)].map((match) => match[1]);
}

async function hit(path, { method = "GET", jar = "", form, follow = false } = {}) {
  const headers = {};
  if (jar) headers.cookie = jar;
  let body;
  if (form) {
    body = new URLSearchParams(form);
    headers["content-type"] = "application/x-www-form-urlencoded";
  }
  const res = await fetch(base + path, { method, headers, body, redirect: "manual" });
  const text = await res.text();
  const location = res.headers.get("location") || "";
  const set = cookieNames(res);
  return { status: res.status, location, set, text };
}

function jarFrom(setLines, previous = "") {
  const map = new Map();
  for (const part of previous.split(";").map((item) => item.trim()).filter(Boolean)) {
    const [name, ...rest] = part.split("=");
    map.set(name, rest.join("="));
  }
  return previous;
}

async function login(role, username, password, extra = {}) {
  return hit("/api/login", {
    method: "POST",
    form: { username, password, role, next: extra.next || "/operator" },
    jar: extra.jar || "",
  });
}

function kept(jar, name) {
  return jar.split(";").some((part) => part.trim().startsWith(`${name}=`) && !part.trim().endsWith("="));
}

const admin = db.select().from(users).where(eq(users.role, "admin")).limit(1).all()[0];
if (!admin) throw new Error("admin user missing");
const adminToken = await createSessionToken({
  sub: String(admin.id),
  username: admin.username,
  role: "admin",
});
const adminJar = `nazarov_session=${adminToken}`;

const created = createOperator({ fullName: "QA Operator", username: opUser, password: opPass });
const blocked = createOperator({ fullName: "QA Blocked", username: blockedUser, password: opPass });
if (!created.ok || !blocked.ok) throw new Error("operator create failed");
setOperatorStatus(blocked.operator.id, "blocked");
const client = createClientDirect({
  name: "QA Client",
  username: clientUser,
  password: clientPass,
  expiresAt: "2030-01-01T00:00:00.000Z",
});
const expiredClient = createClientDirect({
  name: "QA Expired",
  username: expiredClientUser,
  password: clientPass,
  expiresAt: "2020-01-01T00:00:00.000Z",
});
if (!client.ok || !expiredClient.ok) throw new Error("client create failed");

try {
  const anonOp = await hit("/operator");
  record("anon-operator", "GET /operator", "307 /operator/kirish", `${anonOp.status} ${anonOp.location.includes("/operator/kirish") && !anonOp.location.includes("/admin") ? "/operator/kirish" : anonOp.location}`);

  const anonIn = await hit("/operator/kirish");
  record("anon-login", "GET /operator/kirish", "200 form", `${anonIn.status} ${anonIn.text.includes('name="role" value="operator"') ? "form" : "no-form"}`);

  const adminOp = await hit("/operator", { jar: adminJar });
  record(
    "admin-operator",
    "admin cookie GET /operator",
    "307 /operator/kirish",
    `${adminOp.status} ${adminOp.location.includes("/operator/kirish") && !adminOp.location.includes("/admin") ? "/operator/kirish" : adminOp.location}`,
  );

  const adminIn = await hit("/operator/kirish", { jar: adminJar });
  record(
    "admin-login-page",
    "admin cookie GET /operator/kirish",
    "200 notice",
    `${adminIn.status} ${adminIn.text.includes("Admin sessiyasi ochiq") ? "notice" : "no-notice"}`,
  );

  const adminHome = await hit("/admin", { jar: adminJar });
  record("admin-still", "admin cookie GET /admin", "200", String(adminHome.status));

  const bad = await login("operator", opUser, "wrong-pass");
  record("bad-password", "wrong operator password", "303 error=invalid", `${bad.status} ${bad.location.includes("error=invalid") ? "error=invalid" : bad.location}`);

  const desk = await login("operator", process.env.ADMIN_USERNAME || admin.username, process.env.ADMIN_PASSWORD || "", { jar: adminJar });
  record(
    "admin-on-operator-form",
    "admin password on operator form",
    "303 error=desk",
    `${desk.status} ${desk.location.includes("error=desk") ? "error=desk" : desk.location}`,
  );

  const asClient = await login("operator", clientUser, clientPass);
  record("client-form", "client password on operator form", "303 error=client", `${asClient.status} ${asClient.location.includes("error=client") ? "error=client" : asClient.location}`);

  const expiredForm = await login("operator", expiredClientUser, clientPass);
  record("expired-client-form", "expired client on operator form", "303 error=client", `${expiredForm.status} ${expiredForm.location.includes("error=client") ? "error=client" : expiredForm.location}`);

  const blockedForm = await login("operator", blockedUser, opPass);
  record("blocked-form", "blocked operator login", "303 error=blocked", `${blockedForm.status} ${blockedForm.location.includes("error=blocked") ? "error=blocked" : blockedForm.location}`);

  const sneak = await login("operator", opUser, opPass, { next: "/admin" });
  record(
    "next-admin",
    "operator login next=/admin",
    "303 /operator",
    `${sneak.status} ${sneak.location.endsWith("/operator") ? "/operator" : sneak.location}`,
  );

  const external = await login("operator", opUser, opPass, { next: "https://evil.example/admin" });
  record(
    "next-external",
    "operator login next=external",
    "303 /operator",
    `${external.status} ${external.location.endsWith("/operator") && !external.location.includes("evil") ? "/operator" : external.location}`,
  );

  const opJar = `nazarov_operator=${external.set.find((name) => name === "nazarov_operator") ? "" : ""}`;
  const opLogin = await login("operator", opUser, opPass, { jar: adminJar });
  const opToken = (opLogin.headers ? "" : "");
  void opJar;
  void opToken;
  const setOperator = opLogin.set.includes("nazarov_operator");
  const wipedAdmin = opLogin.set.includes("nazarov_session");
  record(
    "operator-login-keeps-admin",
    "operator login beside admin cookie",
    "303 /operator op:true wipedAdmin:false",
    `${opLogin.status} ${opLogin.location.endsWith("/operator") ? "/operator" : opLogin.location} op:${setOperator} wipedAdmin:${wipedAdmin}`,
  );

  const secret = new TextEncoder().encode(
    process.env.AUTH_SECRET || "nazarov-uz-local-dev-secret-change-me",
  );
  const operatorToken = await new SignJWT({
    sub: String(created.operator.id),
    username: opUser,
    role: "operator",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret);
  const both = `${adminJar}; nazarov_operator=${operatorToken}`;

  const bothOp = await hit("/operator", { jar: both });
  record("both-operator", "admin+operator GET /operator", "200 desk", `${bothOp.status} ${bothOp.text.includes('data-operator-desk="chat"') ? "desk" : "not-desk"}`);

  const bothAdmin = await hit("/admin", { jar: both });
  record(
    "both-admin",
    "admin+operator GET /admin",
    "200 admin",
    `${bothAdmin.status} ${bothAdmin.text.includes("Admin panel") || bothAdmin.text.includes("Mijozlarga material") ? "admin" : "other"}`,
  );

  const opOnly = `nazarov_operator=${operatorToken}`;
  const opAdmin = await hit("/admin", { jar: opOnly });
  record(
    "operator-cannot-admin",
    "operator cookie GET /admin",
    "307 /operator",
    `${opAdmin.status} ${opAdmin.location.endsWith("/operator") ? "/operator" : opAdmin.location}`,
  );
  const opApi = await hit("/api/admin/ai", { jar: opOnly });
  record("operator-cannot-api", "operator cookie GET /api/admin/ai", "401", String(opApi.status));
  const opOps = await hit("/admin/operatorlar", { jar: opOnly });
  record(
    "operator-cannot-operators",
    "operator cookie GET /admin/operatorlar",
    "307 /operator",
    `${opOps.status} ${opOps.location.endsWith("/operator") ? "/operator" : opOps.location}`,
  );

  const clientToken = await createSessionToken({
    sub: String(db.select().from(users).where(eq(users.username, clientUser)).limit(1).all()[0].id),
    username: clientUser,
    role: "client",
  });
  const clientJar = `nazarov_session=${clientToken}`;
  const clientOp = await hit("/operator", { jar: clientJar });
  record(
    "client-session",
    "client cookie GET /operator",
    "307 /operator/kirish",
    `${clientOp.status} ${clientOp.location.includes("/operator/kirish") && !clientOp.location.includes("/admin") ? "/operator/kirish" : clientOp.location}`,
  );
  const clientStill = await hit("/nazarov", { jar: clientJar });
  record("client-catalog", "client cookie GET /nazarov", "200", String(clientStill.status));

  const expiredToken = await new SignJWT({
    sub: String(created.operator.id),
    username: opUser,
    role: "operator",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 30)
    .sign(secret);
  const expiredHit = await hit("/operator", { jar: `${adminJar}; nazarov_operator=${expiredToken}` });
  record(
    "expired-operator",
    "expired operator cookie GET /operator",
    "307 error=expired",
    `${expiredHit.status} ${expiredHit.location.includes("error=expired") ? "error=expired" : expiredHit.location}`,
  );
  const adminAfterExpired = await hit("/admin", { jar: adminJar });
  record("admin-after-expired", "admin cookie still opens /admin", "200", String(adminAfterExpired.status));

  const blockedToken = await new SignJWT({
    sub: String(blocked.operator.id),
    username: blockedUser,
    role: "operator",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret);
  const blockedHit = await hit("/operator", { jar: `nazarov_operator=${blockedToken}` });
  record(
    "blocked-session",
    "blocked operator cookie GET /operator",
    "307 error=blocked",
    `${blockedHit.status} ${blockedHit.location.includes("error=blocked") ? "error=blocked" : blockedHit.location}`,
  );

  const logout = await hit("/api/logout", {
    method: "POST",
    jar: both,
    form: { scope: "operator" },
  });
  const clearedOperator = logout.set.includes("nazarov_operator");
  const clearedAdmin = logout.set.includes("nazarov_session");
  record(
    "operator-logout",
    "operator logout beside admin cookie",
    "303 /operator/kirish clear-operator keep-admin",
    `${logout.status} ${logout.location.includes("/operator/kirish") ? "/operator/kirish" : logout.location} ${clearedOperator && !clearedAdmin ? "clear-operator keep-admin" : `set:${logout.set.join(",")}`}`,
  );

  const deskHtml = await hit("/operator", { jar: opOnly });
  const menuLeak = /<header class="site-header|<a href="\/admin|<a href="\/nazarov/.test(deskHtml.text);
  record("desk-only", "operator desk has no admin menu", "200 no-menu", `${deskHtml.status} ${menuLeak ? "menu" : "no-menu"}`);

  void jarFrom;
  void kept;
} finally {
  const names = [opUser, blockedUser, clientUser, expiredClientUser];
  for (const username of names) {
    const row = db.select().from(users).where(eq(users.username, username)).limit(1).all()[0];
    if (!row) continue;
    db.delete(clientRequests).where(eq(clientRequests.userId, row.id)).run();
    db.delete(users).where(eq(users.id, row.id)).run();
  }
}

const failed = rows.filter((row) => !row.pass);
console.log(JSON.stringify({ pass: rows.length - failed.length, fail: failed.length, rows }, null, 2));
process.exit(failed.length ? 1 : 0);
