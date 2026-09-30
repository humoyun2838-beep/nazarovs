"use client";

import { useEffect, useMemo, useState } from "react";
import { BookmarkPlus, ChevronDown, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  CHAT_TEMPLATE_GROUPS,
  isCustomTemplateId,
  templatesFor,
  type ChatTemplate,
  type ChatTemplatePack,
} from "@/lib/chat-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type TemplatePack = ChatTemplatePack;

const QUICK_IDS = {
  uz: ["uz-dars-ochiq", "uz-kuting", "uz-video", "uz-tushunarli"],
  ru: ["ru-dars-ochiq", "ru-kuting", "ru-video", "ru-tushunarli"],
};

const STORAGE_KEY = "nazarov-chat-templates";
let localTemplateMigrateStarted = false;

export function AdminChatTemplates({
  language = "uz",
  draft,
  templates,
  onInsert,
  onTemplates,
}: {
  language?: string;
  draft: string;
  templates?: ChatTemplate[];
  onInsert: (body: string) => void;
  onTemplates?: (pack: TemplatePack) => void;
}) {
  const lang = language === "ru" ? "ru" : "uz";
  const builtin = useMemo(() => templatesFor(lang), [lang]);
  const rows = templates?.length ? templates.filter((row) => row.lang === lang || !row.lang) : builtin;
  const custom = rows.filter((row) => row.custom || isCustomTemplateId(row.id));
  const [open, setOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [label, setLabel] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [migrated, setMigrated] = useState(false);

  const quick = QUICK_IDS[lang]
    .map((id) => builtin.find((row) => row.id === id))
    .filter((row): row is ChatTemplate => Boolean(row));

  function resetForm() {
    setEditingId("");
    setLabel("");
    setBody("");
    setError("");
  }

  function openCreate(prefill = false) {
    setFormOpen(true);
    setOpen(true);
    setEditingId("");
    setLabel("");
    setBody(prefill ? draft.trim() : "");
    setError("");
  }

  function openEdit(row: ChatTemplate) {
    setFormOpen(true);
    setOpen(true);
    setEditingId(row.id);
    setLabel(row.label);
    setBody(row.body);
    setError("");
  }

  async function saveTemplate() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "template-save",
          id: editingId || undefined,
          lang,
          label,
          body,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        templates?: TemplatePack;
      } | null;
      if (!res.ok || !data?.ok || !data.templates) {
        setError(data?.error || (lang === "ru" ? "Шаблон не сохранился." : "Shablon saqlanmadi."));
        return;
      }
      onTemplates?.(data.templates);
      setFormOpen(false);
      resetForm();
    } catch {
      setError(lang === "ru" ? "Шаблон не сохранился." : "Shablon saqlanmadi.");
    } finally {
      setBusy(false);
    }
  }

  async function removeTemplate(id: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "template-delete", id }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        templates?: TemplatePack;
      } | null;
      if (!res.ok || !data?.ok || !data.templates) {
        setError(data?.error || (lang === "ru" ? "Не удалось удалить." : "O‘chirilmadi."));
        return;
      }
      onTemplates?.(data.templates);
      if (editingId === id) {
        setFormOpen(false);
        resetForm();
      }
    } catch {
      setError(lang === "ru" ? "Не удалось удалить." : "O‘chirilmadi.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (migrated || typeof window === "undefined" || localTemplateMigrateStarted) {
      setMigrated(true);
      return;
    }
    localTemplateMigrateStarted = true;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setMigrated(true);
      return;
    }
    let parsed: Array<{ lang?: string; label?: string; body?: string }> = [];
    try {
      parsed = JSON.parse(raw);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      setMigrated(true);
      return;
    }
    if (!Array.isArray(parsed) || !parsed.length) {
      window.localStorage.removeItem(STORAGE_KEY);
      setMigrated(true);
      return;
    }
    let cancelled = false;
    (async () => {
      let pack: TemplatePack | null = null;
      for (const row of parsed) {
        const text = typeof row.body === "string" ? row.body.trim() : "";
        if (text.length < 4) continue;
        const res = await fetch("/api/admin/chat", {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "template-save",
            lang: row.lang === "ru" ? "ru" : "uz",
            label: (row.label || text).slice(0, 80),
            body: text,
          }),
        });
        const data = (await res.json().catch(() => null)) as { ok?: boolean; templates?: TemplatePack } | null;
        if (data?.templates) pack = data.templates;
      }
      if (!cancelled && pack) onTemplates?.(pack);
      window.localStorage.removeItem(STORAGE_KEY);
      if (!cancelled) setMigrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [migrated, onTemplates]);

  return (
    <div data-admin-chat="templates" className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          data-chat-template="create"
          onClick={() => (formOpen ? (setFormOpen(false), resetForm()) : openCreate(false))}
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
            formOpen
              ? "bg-[#1a6fd4] text-white"
              : "border border-dashed border-[#1a6fd4] bg-white text-[#0b4fa8]",
          )}
        >
          <Plus className="size-3.5" />
          {lang === "ru" ? "Новый шаблон" : "Yangi shablon"}
        </button>
        {quick.map((row) => (
          <button
            key={row.id}
            type="button"
            data-chat-template={row.id}
            onClick={() => onInsert(row.body)}
            className="shrink-0 rounded-full border border-[#cfe0f5] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0b4fa8] transition hover:border-[#1a6fd4] hover:bg-[#eaf3ff]"
          >
            {row.label}
          </button>
        ))}
        {custom.map((row) => (
          <button
            key={row.id}
            type="button"
            data-chat-template={row.id}
            title={row.body}
            onClick={() => onInsert(row.body)}
            className="shrink-0 rounded-full border border-[#1a6fd4] bg-[#eaf3ff] px-2.5 py-1 text-[11px] font-semibold text-[#0b4fa8] transition hover:bg-[#dcebff]"
          >
            {row.label}
          </button>
        ))}
        <button
          type="button"
          data-chat-template="more"
          onClick={() => setOpen((value) => !value)}
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
            open
              ? "bg-[#1a6fd4] text-white"
              : "border border-[#cfe0f5] bg-[#f4f8ff] text-[#1a3a66]",
          )}
        >
          Barchasi
          <ChevronDown className={cn("size-3.5 transition", open ? "rotate-180" : "")} />
        </button>
      </div>

      {formOpen ? (
        <div
          data-chat-template-form="1"
          className="space-y-2 rounded-xl border border-[#d7e6fb] bg-[#f7fbff] p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold tracking-wide text-[#1a3a66] uppercase">
              {editingId
                ? lang === "ru"
                  ? "Изменить шаблон"
                  : "Shablonni tahrirlash"
                : lang === "ru"
                  ? "Новый шаблон"
                  : "Yangi shablon"}
            </p>
            <button
              type="button"
              aria-label={lang === "ru" ? "Закрыть" : "Yopish"}
              onClick={() => {
                setFormOpen(false);
                resetForm();
              }}
              className="rounded-md p-1 text-[#5b7aa8] hover:bg-white"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <Input
            name="template-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={lang === "ru" ? "Название, например «Цена»" : "Nomi, masalan «Narx»"}
            className="h-9 rounded-lg border-[#cfe0f5] bg-white text-sm text-[#051530]"
          />
          <Textarea
            name="template-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              lang === "ru"
                ? "Текст, который вставится в ответ"
                : "Javobga tushadigan matn"
            }
            className="min-h-20 resize-none rounded-lg border-[#cfe0f5] bg-white text-sm text-[#051530]"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busy || label.trim().length < 2 || body.trim().length < 4}
              onClick={() => void saveTemplate()}
              className="h-8 rounded-lg bg-[#1a6fd4] text-white hover:bg-[#155bb0]"
              data-chat-template="save"
            >
              <BookmarkPlus className="size-3.5" />
              {editingId
                ? lang === "ru"
                  ? "Сохранить"
                  : "Saqlash"
                : lang === "ru"
                  ? "Добавить"
                  : "Qo‘shish"}
            </Button>
            {draft.trim().length >= 4 ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  if (!label.trim()) setLabel(draft.trim().slice(0, 28));
                  setBody(draft.trim());
                }}
                className="h-8 rounded-lg border-[#cfe0f5] text-[#0b4fa8]"
              >
                {lang === "ru" ? "Взять из ответа" : "Javobdan olish"}
              </Button>
            ) : null}
          </div>
          {error ? (
            <p className="text-xs text-[#b42318]" role="alert">
              {error}
            </p>
          ) : (
            <p className="text-[11px] text-[#5b7aa8]">
              {lang === "ru"
                ? "Шаблон сохранится в админке. Потом одним нажатием вставляется."
                : "Shablon admin panelda saqlanadi. Keyin bir bosishda javobga tushadi."}
            </p>
          )}
        </div>
      ) : null}

      {open ? (
        <div className="max-h-56 space-y-3 overflow-y-auto rounded-xl border border-[#d7e6fb] bg-[#f7fbff] p-3">
          {CHAT_TEMPLATE_GROUPS.filter((group) => group.id !== "custom").map((group) => {
            const groupRows = builtin.filter((row) => row.group === group.id);
            if (!groupRows.length) return null;
            return (
              <div key={group.id}>
                <p className="mb-1.5 text-[10px] font-bold tracking-wide text-[#1a3a66] uppercase">
                  {lang === "ru" ? group.ru : group.uz}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {groupRows.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      data-chat-template={row.id}
                      title={row.body}
                      onClick={() => {
                        onInsert(row.body);
                        setOpen(false);
                      }}
                      className="rounded-lg bg-white px-2 py-1.5 text-left text-[11px] font-medium text-[#051530] shadow-sm ring-1 ring-[#d7e6fb] hover:ring-[#1a6fd4]"
                    >
                      {row.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          <div>
            <p className="mb-1.5 text-[10px] font-bold tracking-wide text-[#1a3a66] uppercase">
              {lang === "ru" ? "Мои шаблоны" : "Mening shablonlarim"}
            </p>
            {custom.length ? (
              <div className="space-y-1">
                {custom.map((row) => (
                  <div key={row.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      data-chat-template={row.id}
                      onClick={() => {
                        onInsert(row.body);
                        setOpen(false);
                      }}
                      className="min-w-0 flex-1 truncate rounded-lg bg-white px-2 py-1.5 text-left text-[11px] font-medium text-[#051530] ring-1 ring-[#d7e6fb]"
                    >
                      {row.label}
                    </button>
                    <button
                      type="button"
                      aria-label={lang === "ru" ? "Изменить" : "Tahrirlash"}
                      onClick={() => openEdit(row)}
                      className="rounded-md p-1 text-[#5b7aa8] hover:bg-white hover:text-[#0b4fa8]"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={lang === "ru" ? "Удалить" : "O‘chirish"}
                      onClick={() => void removeTemplate(row.id)}
                      className="rounded-md p-1 text-[#7a7166] hover:bg-white hover:text-[#b42318]"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-[#5b7aa8]">
                {lang === "ru"
                  ? "Пока нет своих шаблонов — нажмите «Шаблон»."
                  : "Hali o‘z shablon yo‘q — «Shablon» ni bosing."}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
