#!/usr/bin/env node
/**
 * Fill src/data/lesson-i18n.json with ru/en for unique lesson lines.
 * Keys and secrets stay in sqlite; they are not printed.
 */
const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const OUT = path.join("src", "data", "lesson-i18n.json");
const db = new Database("data/nazarov.db", { readonly: true });

function fold(text) {
  return String(text || "")
    .replace(/[\u2018\u2019\u02BB\u02BC`]/g, "'")
    .replace(/[\u201c\u201d«»]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function setting(key) {
  const row = db.prepare("select value from app_settings where key = ?").get(key);
  return String(row?.value || "").trim();
}

function collectLines() {
  const rows = db.prepare("select content, summary, title from materials").all();
  const set = new Set();
  for (const row of rows) {
    for (const field of [row.content, row.summary, row.title]) {
      for (const line of String(field || "").split(/\n/)) {
        const t = fold(line);
        if (!t) continue;
        if (/^(IMAGE|VIDEO)::/i.test(t)) continue;
        if (/^https?:\/\//i.test(t)) continue;
        if (t.length < 6) continue;
        set.add(t);
      }
    }
  }
  return [...set];
}

function parseJson(text) {
  const raw = String(text || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start < 0 || end < start) throw new Error("no json array");
  return JSON.parse(raw.slice(start, end + 1));
}

async function gemini(key, prompt) {
  const models = [
    "gemini-3.8-flash",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-flash-latest",
  ];
  let last = "";
  for (const model of models) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: "You translate Uzbek DMED / medical MIS training UI instructions into Russian and English. Keep step numbers. Translate quoted button/section names. Do not add commentary. Return only a JSON array of {i, ru, en}.",
              },
            ],
          },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
        }),
        signal: AbortSignal.timeout(60000),
      },
    );
    const data = await res.json().catch(() => ({}));
    const text = (data?.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text || "")
      .join("")
      .trim();
    if (res.ok && text) return text;
    last = data?.error?.message || `Gemini ${res.status}`;
    if (/not found|NOT_FOUND/i.test(last)) continue;
  }
  throw new Error(last || "Gemini failed");
}

async function translateBatch(lines) {
  const payload = lines.map((uz, i) => ({ i, uz }));
  const prompt = `Translate these Uzbek lines:\n${JSON.stringify(payload, null, 2)}`;
  const gem = setting("gemini_api_key");
  if (!gem) throw new Error("no Gemini key in app_settings");
  const text = await gemini(gem, prompt);
  const rows = parseJson(text);
  const out = [];
  for (const row of rows) {
    const uz = lines[Number(row.i)];
    if (!uz || !row.ru || !row.en) continue;
    out.push({ uz, ru: String(row.ru).trim(), en: String(row.en).trim() });
  }
  return out;
}

async function main() {
  const map = JSON.parse(fs.readFileSync(OUT, "utf8"));
  const all = collectLines();
  const missing = all.filter((line) => {
    const hit = map[line];
    return !hit?.ru || !hit?.en || hit.ru === line || hit.en === line;
  });
  console.log("lines", all.length, "missing", missing.length);
  const batchSize = 18;
  for (let i = 0; i < missing.length; i += batchSize) {
    const batch = missing.slice(i, i + batchSize);
    let ok = false;
    for (let attempt = 0; attempt < 4 && !ok; attempt += 1) {
      try {
        const rows = await translateBatch(batch);
        for (const row of rows) {
          if (row.ru && row.en && row.ru !== row.uz) map[row.uz] = { ru: row.ru, en: row.en };
        }
        ok = rows.length > 0;
      } catch (error) {
        console.error("batch", i, "try", attempt + 1, String(error.message || error).slice(0, 180));
        await new Promise((r) => setTimeout(r, 2500 * (attempt + 1)));
      }
    }
    fs.writeFileSync(OUT, JSON.stringify(map, null, 2));
    const done = Object.keys(map).length;
    console.log("saved", Math.min(i + batchSize, missing.length), "/", missing.length, "map", done);
    await new Promise((r) => setTimeout(r, 400));
  }
  console.log("done map", Object.keys(map).length);
}

main().catch((error) => {
  console.error(String(error.message || error).slice(0, 240));
  process.exit(1);
});
