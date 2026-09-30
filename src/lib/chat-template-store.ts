import { randomUUID } from "node:crypto";
import { sqlite } from "@/db";
import {
  CHAT_TEMPLATES,
  type ChatTemplate,
  type ChatTemplateLang,
} from "@/lib/chat-templates";

const MAX_CUSTOM = 80;
const LABEL_MAX = 80;
const BODY_MAX = 2000;

type TemplateRow = {
  id: string;
  lang: string;
  label: string;
  body: string;
  created_at: string;
};

function asLang(value: unknown): ChatTemplateLang {
  return value === "ru" ? "ru" : "uz";
}

function cleanLabel(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, LABEL_MAX) : "";
}

function cleanBody(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+$/g, "").trim().slice(0, BODY_MAX) : "";
}

function fromRow(row: TemplateRow): ChatTemplate {
  return {
    id: row.id,
    lang: asLang(row.lang),
    group: "custom",
    label: row.label,
    body: row.body,
    custom: true,
  };
}

export function listCustomTemplates(language?: string | null): ChatTemplate[] {
  const lang = language ? asLang(language) : "";
  const rows = sqlite
    .prepare(
      `
      SELECT id, lang, label, body, created_at
      FROM chat_templates
      WHERE (? = '' OR lang = ?)
      ORDER BY created_at DESC, id DESC
      `,
    )
    .all(lang, lang) as TemplateRow[];
  return rows.map(fromRow);
}

export function publicChatTemplates() {
  const custom = listCustomTemplates();
  return {
    uz: [...CHAT_TEMPLATES.filter((row) => row.lang === "uz"), ...custom.filter((row) => row.lang === "uz")],
    ru: [...CHAT_TEMPLATES.filter((row) => row.lang === "ru"), ...custom.filter((row) => row.lang === "ru")],
  };
}

export function saveChatTemplate(input: {
  id?: unknown;
  lang?: unknown;
  label?: unknown;
  body?: unknown;
}) {
  const lang = asLang(input.lang);
  const label = cleanLabel(input.label);
  const body = cleanBody(input.body);
  if (label.length < 2) {
    return {
      ok: false as const,
      error: lang === "ru" ? "Введите название шаблона." : "Shablon nomini yozing.",
    };
  }
  if (body.length < 4) {
    return {
      ok: false as const,
      error: lang === "ru" ? "Введите текст шаблона." : "Shablon matnini yozing.",
    };
  }

  const requestedId = typeof input.id === "string" ? input.id.trim() : "";
  if (requestedId) {
    if (CHAT_TEMPLATES.some((row) => row.id === requestedId)) {
      return {
        ok: false as const,
        error: lang === "ru" ? "Встроенный шаблон нельзя изменить." : "Tayyor shablonni o‘zgartirib bo‘lmaydi.",
      };
    }
    const existing = sqlite
      .prepare(`SELECT id FROM chat_templates WHERE id = ?`)
      .get(requestedId) as { id: string } | undefined;
    if (!existing) {
      return {
        ok: false as const,
        error: lang === "ru" ? "Шаблон не найден." : "Shablon topilmadi.",
      };
    }
    sqlite
      .prepare(
        `UPDATE chat_templates SET lang = ?, label = ?, body = ? WHERE id = ?`,
      )
      .run(lang, label, body, requestedId);
    return {
      ok: true as const,
      template: fromRow({
        id: requestedId,
        lang,
        label,
        body,
        created_at: "",
      }),
      templates: publicChatTemplates(),
    };
  }

  const count = (
    sqlite.prepare(`SELECT COUNT(*) AS n FROM chat_templates`).get() as {
      n: number;
    }
  ).n;
  if (count >= MAX_CUSTOM) {
    return {
      ok: false as const,
      error:
        lang === "ru"
          ? "Слишком много шаблонов. Удалите старый."
          : "Shablonlar juda ko‘p. Avval birini o‘chiring.",
    };
  }

  const id = `c-${randomUUID()}`;
  const createdAt = new Date().toISOString();
  sqlite
    .prepare(
      `INSERT INTO chat_templates (id, lang, label, body, created_at) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(id, lang, label, body, createdAt);
  return {
    ok: true as const,
    template: fromRow({ id, lang, label, body, created_at: createdAt }),
    templates: publicChatTemplates(),
  };
}

export function deleteChatTemplate(id: unknown) {
  const templateId = typeof id === "string" ? id.trim() : "";
  if (!templateId) {
    return { ok: false as const, error: "id" };
  }
  if (CHAT_TEMPLATES.some((row) => row.id === templateId)) {
    return {
      ok: false as const,
      error: "Tayyor shablonni o‘chirib bo‘lmaydi.",
    };
  }
  const result = sqlite.prepare(`DELETE FROM chat_templates WHERE id = ?`).run(templateId);
  if (!result.changes) {
    return { ok: false as const, error: "Shablon topilmadi." };
  }
  return { ok: true as const, templates: publicChatTemplates() };
}
