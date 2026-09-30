"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type MaterialRow = {
  id: number;
  title: string;
  slug: string;
  summary: string;
  hasVideo?: number | boolean | null;
};

type Group = {
  category: { id: number; title: string; slug: string };
  materials: MaterialRow[];
};

export function AdminCatalog({ groups }: { groups: Group[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

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

  async function remove(kind: "material" | "category", id: number, label: string) {
    const ok = window.confirm(`“${label}” ni o‘chirasizmi? Bu amalni qaytarib bo‘lmaydi.`);
    if (!ok) return;
    setBusyId(id);
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
    setBusyId(null);
    if (!data?.ok) {
      setError(data?.error || "O‘chirilmadi.");
      return;
    }
    router.refresh();
  }

  return (
    <section className="space-y-4 rounded-2xl border border-white/30 bg-white/95 p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="font-heading text-xl font-semibold">
          Mijozlarga ko‘rinadigan yozuvlar
        </h2>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Qidirish: sarlavha yoki bo‘lim"
          className="h-10 sm:max-w-xs"
        />
      </div>
      {error ? (
        <p className="text-sm text-[#b42318]" role="alert">
          {error}
        </p>
      ) : null}
      {filtered.length === 0 ? (
        <p className="text-sm text-[#7a7166]">Hech narsa topilmadi.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map(({ category, materials }) => (
            <div
              key={category.id}
              className="rounded-xl border border-black/8 bg-[#f7f3ec]/70 p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <Link
                    href={`/b/${category.slug}`}
                    className="font-medium hover:underline"
                  >
                    {category.title}
                  </Link>
                  <p className="text-xs text-[#7a7166]">
                    {materials.length} ta material
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busyId === category.id}
                  onClick={() => remove("category", category.id, category.title)}
                >
                  O‘chirish
                </Button>
              </div>
              <ul className="space-y-2">
                {materials.map((material) => (
                  <li
                    key={material.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2"
                  >
                    <Link
                      href={`/m/${material.slug}`}
                      className="min-w-0 flex-1 truncate text-sm hover:underline"
                    >
                      {material.title}
                      {material.hasVideo ? (
                        <span className="ml-2 rounded-full bg-[#eef3fb] px-2 py-0.5 text-[11px] text-[#243b6b]">
                          video
                        </span>
                      ) : null}
                    </Link>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/materials/${material.id}/edit`}>
                          Tahrirlash
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busyId === material.id}
                        onClick={() =>
                          remove("material", material.id, material.title)
                        }
                      >
                        O‘chirish
                      </Button>
                    </div>
                  </li>
                ))}
                {materials.length === 0 ? (
                  <li className="text-sm text-[#7a7166]">
                    Material yo‘q — yuqoridan qo‘shing
                  </li>
                ) : null}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
