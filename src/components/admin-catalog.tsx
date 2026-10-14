"use client";
import { UiText } from "@/components/ui-locale";


import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/lib/locale";
import { uiCopy } from "@/lib/ui-copy";

type MaterialRow = {
  id: number;
  title: string;
  slug: string;
  summary: string;
  imageUrl?: string;
  hasVideo?: number | boolean | null;
};

type Group = {
  category: { id: number; title: string; slug: string; description?: string };
  materials: MaterialRow[];
};

function swap<T>(list: T[], index: number, dir: -1 | 1) {
  const next = [...list];
  const j = index + dir;
  if (j < 0 || j >= next.length) return null;
  [next[index], next[j]] = [next[j], next[index]];
  return next;
}

export function AdminCatalog({
  groups,
  locale = "uz",
}: {
  groups: Group[];
  locale?: Locale;
}) {
  const copy = uiCopy(locale);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((group) => ({
        ...group,
        materials: group.materials.filter(
          (m) =>
            m.title.toLowerCase().includes(q) ||
            (m.summary || "").toLowerCase().includes(q) ||
            group.category.title.toLowerCase().includes(q),
        ),
      }))
      .filter(
        (group) =>
          group.materials.length > 0 ||
          group.category.title.toLowerCase().includes(q),
      );
  }, [groups, query]);

  async function postJson(url: string, body: unknown) {
    const res = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await res.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;
  }

  async function moveMaterial(
    categoryId: number,
    ids: number[],
    index: number,
    dir: -1 | 1,
  ) {
    const next = swap(ids, index, dir);
    if (!next) return;
    setBusyKey(`m-${ids[index]}`);
    setError("");
    const data = await postJson("/api/admin/materials/reorder", {
      categoryId,
      ids: next,
    });
    setBusyKey("");
    if (!data?.ok) {
      setError(data?.error || "Tartib saqlanmadi.");
      return;
    }
    router.refresh();
  }

  async function moveCategory(index: number, dir: -1 | 1) {
    const ids = groups.map((group) => group.category.id);
    const next = swap(ids, index, dir);
    if (!next) return;
    setBusyKey(`c-${ids[index]}`);
    setError("");
    const data = await postJson("/api/admin/categories/reorder", { ids: next });
    setBusyKey("");
    if (!data?.ok) {
      setError(data?.error || "Tartib saqlanmadi.");
      return;
    }
    router.refresh();
  }

  async function remove(kind: "material" | "category", id: number, label: string) {
    const ok = window.confirm(
      `“${label}” ni o‘chirasizmi? Bu amalni qaytarib bo‘lmaydi.`,
    );
    if (!ok) return;
    setBusyKey(`${kind === "material" ? "m" : "c"}-${id}`);
    setError("");
    const url =
      kind === "material"
        ? "/api/admin/materials/delete"
        : "/api/admin/categories/delete";
    const form = new FormData();
    form.set("id", String(id));
    const res = await fetch(url, { method: "POST", body: form });
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;
    setBusyKey("");
    if (!data?.ok) {
      setError(data?.error || "O‘chirilmadi.");
      return;
    }
    router.refresh();
  }

  async function saveCategory(id: number) {
    const title = editTitle.trim();
    if (!title) {
      setError("Bo‘lim nomi majburiy.");
      return;
    }
    setBusyKey(`c-${id}`);
    setError("");
    const form = new FormData();
    form.set("id", String(id));
    form.set("title", title);
    form.set("description", editDescription.trim());
    const res = await fetch("/api/admin/categories", { method: "PUT", body: form });
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;
    setBusyKey("");
    if (!data?.ok) {
      setError(data?.error || "Bo‘lim saqlanmadi.");
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  return (
    <section className="catalog-panel space-y-4 rounded-3xl p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold"><UiText>{copy.orderTitle}</UiText></h2>
          <p className="mt-1 text-sm text-[#5a5248]"><UiText>{copy.orderLead}</UiText></p>
        </div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={copy.searchCatalog}
          className="h-10 sm:max-w-xs"
        />
      </div>
      {error ? (
        <p className="text-sm text-[#b42318]" role="alert">
          {error}
        </p>
      ) : null}
      {filtered.length === 0 ? (
        <p className="text-sm text-[#7a7166]"><UiText>{copy.nothingFound}</UiText></p>
      ) : (
        <div className="space-y-4">
          {filtered.map(({ category, materials }) => {
            const catIndex = groups.findIndex((g) => g.category.id === category.id);
            const ids = materials.map((row) => row.id);
            const isExpanded = Boolean(query.trim()) || expanded.has(category.id);
            const catBusy = busyKey === `c-${category.id}`;
            return (
            <div
              key={category.id}
              className="rounded-xl border border-black/8 bg-[#f7f3ec]/70 p-4"
            >
              <div className="mb-3 space-y-2">
                <div className="flex min-w-0 items-start gap-2">
                  <span className="mt-1 w-7 shrink-0 text-xs font-semibold tabular-nums text-[#4a6288]">
                    {catIndex + 1}.
                  </span>
                  <div className="min-w-0 flex-1">
                    {editingId === category.id ? (
                      <div className="grid gap-2">
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="h-10"
                          placeholder="Bo‘lim nomi"
                        />
                        <Input
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="h-10"
                          placeholder="Tavsif"
                        />
                      </div>
                    ) : (
                      <>
                        <Link
                          prefetch={false}
                          href={`/b/${category.slug}`}
                          className="font-medium hover:underline"
                        >
                          <UiText>{category.title}</UiText>
                        </Link>
                        <p className="text-xs text-[#7a7166]">
                          {materials.length}<UiText>{" ta material "}</UiText></p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 pl-9">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={catBusy || catIndex <= 0 || Boolean(query.trim())}
                    onClick={() => void moveCategory(catIndex, -1)}
                  ><UiText>{" Yuqoriga "}</UiText></Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      catBusy ||
                      catIndex >= groups.length - 1 ||
                      Boolean(query.trim())
                    }
                    onClick={() => void moveCategory(catIndex, 1)}
                  ><UiText>{" Pastga "}</UiText></Button>
                  {editingId === category.id ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        disabled={catBusy}
                        onClick={() => void saveCategory(category.id)}
                      ><UiText>{" Saqlash "}</UiText></Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(null)}
                      ><UiText>{" Bekor "}</UiText></Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingId(category.id);
                        setEditTitle(category.title);
                        setEditDescription(category.description || "");
                      }}
                    ><UiText>{" Tahrirlash "}</UiText></Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={catBusy}
                    onClick={() => remove("category", category.id, category.title)}
                  ><UiText>{" O‘chirish "}</UiText></Button>
                </div>
              </div>
              <Button type="button" variant="outline" aria-expanded={isExpanded}
                onClick={() => setExpanded(previous => { const next = new Set(previous); if (next.has(category.id)) next.delete(category.id); else next.add(category.id); return next; })}>
                <UiText>{"Materiallar"}</UiText> ({materials.length}) {isExpanded ? "−" : "+"}
              </Button>
              {isExpanded ? <ul className="mt-3 space-y-2">
                {materials.map((material, index) => {
                  const rowBusy = busyKey === `m-${material.id}`;
                  return (
                  <li
                    key={material.id}
                    className="space-y-2 rounded-lg bg-white px-3 py-2"
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      <span className="mt-0.5 w-7 shrink-0 text-xs font-semibold tabular-nums text-[#4a6288]">
                        {index + 1}.
                      </span>
                      <Link
                          prefetch={false}
                        href={`/m/${material.slug}`}
                        className="min-w-0 flex-1 text-sm hover:underline"
                      >
                        <UiText>{material.title}</UiText>
                        {material.hasVideo ? (
                          <span className="ml-2 rounded-full bg-[#eef3fb] px-2 py-0.5 text-[11px] text-[#243b6b]"><UiText>{" video "}</UiText></span>
                        ) : null}
                        {material.imageUrl ? (
                          <span className="ml-2 rounded-full bg-[#f3e8ff] px-2 py-0.5 text-[11px] text-[#6b21a8]"><UiText>{" rasm "}</UiText></span>
                        ) : null}
                      </Link>
                    </div>
                    <div className="flex flex-wrap gap-1 pl-9">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={rowBusy || index === 0 || Boolean(query.trim())}
                        onClick={() =>
                          void moveMaterial(category.id, ids, index, -1)
                        }
                      ><UiText>{" Yuqoriga "}</UiText></Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={rowBusy || index === materials.length - 1 || Boolean(query.trim())}
                        onClick={() =>
                          void moveMaterial(category.id, ids, index, 1)
                        }
                      ><UiText>{" Pastga "}</UiText></Button>
                      <Button asChild variant="outline" size="sm">
                        <Link prefetch={false} href={`/admin/materials/${material.id}/edit`}><UiText>{" Tahrirlash "}</UiText></Link>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={rowBusy}
                        onClick={() =>
                          remove("material", material.id, material.title)
                        }
                      ><UiText>{" O‘chirish "}</UiText></Button>
                    </div>
                  </li>
                  );
                })}
                {materials.length === 0 ? (
                  <li className="text-sm text-[#7a7166]"><UiText>{" Material yo‘q — yuqoridan qo‘shing "}</UiText></li>
                ) : null}
              </ul> : null}
            </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
