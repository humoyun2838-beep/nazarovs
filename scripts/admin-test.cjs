#!/usr/bin/env node
/**
 * 900 admin+client publish checks: auth, validation, CRUD, video marker, client pages.
 */
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const BASE = process.env.BASE_URL || "http://127.0.0.1:3847";
const TOTAL = Number(process.env.TOTAL || 900);
const ADMIN_USER = process.env.ADMIN_USERNAME || "Nazarov";
const ADMIN_PASS = process.env.ADMIN_PASSWORD || "admin9915504";

function tinyJpeg() {
  return Buffer.from(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGf/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPwB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwB//9k=",
    "base64",
  );
}

function tinyMp4() {
  const generated = "/tmp/nazarov-tiny.mp4";
  if (fs.existsSync(generated) && fs.statSync(generated).size > 200) {
    return fs.readFileSync(generated);
  }
  try {
    execSync(
      "ffmpeg -y -f lavfi -i color=c=blue:s=160x90:d=1 -c:v libx264 -pix_fmt yuv420p -t 1 /tmp/nazarov-tiny.mp4",
      { stdio: "ignore" },
    );
    return fs.readFileSync(generated);
  } catch {
    return Buffer.from(
      "AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAAhtZGF0",
      "base64",
    );
  }
}

async function login(username = ADMIN_USER) {
  const form = new FormData();
  form.set("username", username);
  form.set("password", ADMIN_PASS);
  form.set("next", "/admin");
  const res = await fetch(`${BASE}/api/login`, {
    method: "POST",
    body: form,
    redirect: "manual",
  });
  const location = res.headers.get("location") || "";
  if (/127\.0\.0\.1|0\.0\.0\.0|localhost/i.test(location) && !BASE.includes("127.0.0.1")) {
    throw new Error(`login redirected off-host: ${location}`);
  }
  if (location && !location.startsWith("/") && !location.startsWith(BASE) && !BASE.includes("127.0.0.1")) {
    throw new Error(`login redirected to unexpected host: ${location}`);
  }
  const cookie = res.headers.get("set-cookie") || "";
  const match = cookie.match(/nazarov_session=([^;]+)/);
  if (!match) throw new Error(`login failed ${res.status} loc=${location}`);
  return match[1];
}

function cookieHeader(token) {
  return { cookie: `nazarov_session=${token}` };
}

async function jsonReq(url, { method = "POST", token, form } = {}) {
  const headers = token ? cookieHeader(token) : {};
  const res = await fetch(url, { method, headers, body: form });
  const data = await res.json().catch(() => ({ raw: true }));
  return { status: res.status, data };
}

async function textReq(url, token) {
  const res = await fetch(url, { headers: token ? cookieHeader(token) : {} });
  const body = await res.text();
  return { status: res.status, body };
}

async function main() {
  const loginPage = await textReq(`${BASE}/admin/login`);
  if (loginPage.status !== 200 || !loginPage.body.includes('value="Nazarov"')) {
    throw new Error("login page must show Nazarov in the username field");
  }

  const token = await login("Nazarov");
  const lowerToken = await login("nazarov");
  if (!lowerToken) throw new Error("lowercase nazarov login failed");
  const catForm = new FormData();
  catForm.set("title", `Admin sinov ${Date.now()}`);
  catForm.set("description", "Avtomatik test");
  const createdCat = await jsonReq(`${BASE}/api/admin/categories`, {
    token,
    form: catForm,
  });
  if (!createdCat.data?.ok) {
    throw new Error(`category create failed ${JSON.stringify(createdCat)}`);
  }
  const categoryId = createdCat.data.id;

  const firstCat = categoryId;

  const results = [];
  const created = [];

  for (let i = 0; i < TOTAL; i++) {
    const kind = i % 9;
    try {
      if (kind === 0) {
        const form = new FormData();
        form.set("title", `Noauth ${i}`);
        form.set("content", "x");
        form.set("categoryId", String(firstCat));
        const r = await jsonReq(`${BASE}/api/admin/materials`, { form });
        results.push({
          kind: "noauth",
          ok: r.status === 401 || r.data?.ok === false,
        });
      } else if (kind === 1) {
        const form = new FormData();
        form.set("title", "");
        form.set("content", "matn");
        form.set("categoryId", String(firstCat));
        const r = await jsonReq(`${BASE}/api/admin/materials`, {
          token,
          form,
        });
        results.push({
          kind: "empty-title",
          ok: r.data?.ok === false,
        });
      } else if (kind === 2) {
        const form = new FormData();
        form.set("title", `Bo'sh ${i}`);
        form.set("content", "");
        form.set("categoryId", String(firstCat));
        const r = await jsonReq(`${BASE}/api/admin/materials`, {
          token,
          form,
        });
        results.push({
          kind: "empty-body",
          ok: r.data?.ok === false,
        });
      } else if (kind === 3) {
        const form = new FormData();
        form.set("title", `Matn dars ${i}`);
        form.set("summary", "qisqa");
        form.set("content", `Mijoz matni ${i}\nIkkinchi qator.`);
        form.set("categoryId", String(firstCat));
        const r = await jsonReq(`${BASE}/api/admin/materials`, {
          token,
          form,
        });
        const slug = r.data?.slug;
        const page = slug ? await textReq(`${BASE}/m/${slug}`) : { body: "" };
        const seen = page.body.includes(`Mijoz matni ${i}`);
        if (r.data?.ok && slug) created.push({ id: r.data.id, slug });
        results.push({ kind: "create-text", ok: Boolean(r.data?.ok && seen) });
      } else if (kind === 4) {
        const last = created[created.length - 1];
        if (!last) {
          results.push({ kind: "update", ok: true });
          continue;
        }
        const form = new FormData();
        form.set("id", String(last.id));
        form.set("title", `Yangilangan ${i}`);
        form.set("summary", "yangilandi");
        form.set("content", `Yangilangan matn ${i}`);
        form.set("categoryId", String(firstCat));
        const r = await jsonReq(`${BASE}/api/admin/materials`, {
          method: "PUT",
          token,
          form,
        });
        const page = await textReq(`${BASE}/m/${last.slug}`);
        results.push({
          kind: "update",
          ok: Boolean(r.data?.ok && page.body.includes(`Yangilangan matn ${i}`)),
        });
      } else if (kind === 5) {
        const last = created.pop();
        if (!last) {
          results.push({ kind: "delete", ok: true });
          continue;
        }
        const form = new FormData();
        form.set("id", String(last.id));
        const r = await jsonReq(`${BASE}/api/admin/materials/delete`, {
          token,
          form,
        });
        const page = await textReq(`${BASE}/m/${last.slug}`);
        results.push({
          kind: "delete",
          ok: Boolean(r.data?.ok && page.status === 404),
        });
      } else if (kind === 6) {
        const form = new FormData();
        form.set("title", `Rasm dars ${i}`);
        form.set("content", `Rasm bilan matn ${i}`);
        form.set("categoryId", String(firstCat));
        form.set(
          "image",
          new File([tinyJpeg()], "sinov.jpg", { type: "image/jpeg" }),
        );
        const r = await jsonReq(`${BASE}/api/admin/materials`, {
          token,
          form,
        });
        if (r.data?.ok && r.data.slug) created.push({ id: r.data.id, slug: r.data.slug });
        const page = r.data?.slug
          ? await textReq(`${BASE}/m/${r.data.slug}`)
          : { body: "" };
        results.push({
          kind: "create-image",
          ok: Boolean(r.data?.ok && page.body.includes(`/media/`)),
        });
      } else if (kind === 7) {
        const adminPage = await textReq(`${BASE}/admin`, token);
        results.push({
          kind: "admin-ui",
          ok:
            adminPage.status === 200 &&
            adminPage.body.includes("Yangi dars") &&
            adminPage.body.includes('name="video"'),
        });
      } else {
        const form = new FormData();
        form.set("title", `Video dars ${i}`);
        form.set("summary", "video sinov");
        form.set("content", `Video ostidagi matn ${i}`);
        form.set("categoryId", String(firstCat));
        form.set(
          "video",
          new File([tinyMp4()], "sinov.mp4", { type: "video/mp4" }),
        );
        const r = await jsonReq(`${BASE}/api/admin/materials`, {
          token,
          form,
        });
        if (r.data?.ok && r.data.slug) created.push({ id: r.data.id, slug: r.data.slug });
        const page = r.data?.slug
          ? await textReq(`${BASE}/m/${r.data.slug}`)
          : { body: "" };
        results.push({
          kind: "create-video",
          ok: Boolean(
            r.data?.ok &&
              page.body.includes("Video dars") &&
              page.body.includes(`Video ostidagi matn ${i}`),
          ),
        });
      }
    } catch (error) {
      results.push({ kind: "error", ok: false, error: String(error) });
    }
    if ((i + 1) % 100 === 0) process.stdout.write(`progress ${i + 1}/${TOTAL}\n`);
  }

  for (const row of created) {
    const form = new FormData();
    form.set("id", String(row.id));
    await jsonReq(`${BASE}/api/admin/materials/delete`, { token, form });
  }
  if (categoryId) {
    const form = new FormData();
    form.set("id", String(categoryId));
    await jsonReq(`${BASE}/api/admin/categories/delete`, { token, form });
  }

  const failed = results.filter((r) => !r.ok);
  const byKind = {};
  for (const r of results) {
    byKind[r.kind] ??= { n: 0, bad: 0 };
    byKind[r.kind].n += 1;
    if (!r.ok) byKind[r.kind].bad += 1;
  }
  console.log(
    JSON.stringify(
      {
        total: results.length,
        failed: failed.length,
        byKind,
        sampleFails: failed.slice(0, 8),
      },
      null,
      2,
    ),
  );
  if (failed.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
