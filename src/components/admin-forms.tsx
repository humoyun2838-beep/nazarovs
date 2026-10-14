"use client";
import { UiText } from "@/components/ui-locale";


import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Material } from "@/db/schema";
import { ICON_OPTIONS } from "@/lib/icons";
import { MaterialBody } from "@/components/material-body";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { extractMediaFromContent, serializeLessonContent } from "@/lib/media-blocks";
import type { Locale } from "@/lib/locale";
import { uiCopy } from "@/lib/ui-copy";

type MediaDraft = {
  key: string;
  kind: "image" | "video";
  url?: string;
  file?: File;
  preview: string;
};

function newKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type SaveResult =
  | { ok: true; id?: number; slug?: string }
  | { ok: false; error: string };

function ResultMessage({
  state,
  slug,
}: {
  state: SaveResult | null;
  slug?: string;
}) {
  if (!state) return null;
  if (!state.ok) {
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[#b42318]" role="alert">
        {state.error}
      </p>
    );
  }
  return (
    <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-[#0f5c4c]">
      <p><UiText>{"Saqlandi. Mijozlar sahifasida hozir ko‘rinadi."}</UiText></p>
      {slug ? (
        <p className="mt-1">
          <Link href={`/m/${slug}`} className="underline underline-offset-2"><UiText>{" Mijoz ko‘rinishini ochish "}</UiText></Link>
        </p>
      ) : null}
    </div>
  );
}

async function postForm(url: string, form: FormData, method = "POST") {
  const res = await fetch(url, { method, body: form });
  const data = (await res.json().catch(() => null)) as SaveResult | null;
  if (!data) {
    return {
      ok: false as const,
      error: res.status === 413
        ? "Fayl juda katta. Video 80MB, rasm 8MB dan oshmasin."
        : "Saqlashda xato. Qayta urinib ko‘ring.",
    };
  }
  return data;
}

export function CategoryCreateForm({ locale = "uz" }: { locale?: Locale }) {
  const copy = uiCopy(locale);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<SaveResult | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      ref={formRef}
      className="grid gap-3 rounded-2xl border border-white/30 bg-white/95 p-5 shadow-sm"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setState(null);
        const form = new FormData(event.currentTarget);
        const result = await postForm("/api/admin/categories", form);
        setState(result);
        setPending(false);
        if (result.ok) {
          formRef.current?.reset();
          router.refresh();
        }
      }}
    >
      <p className="text-sm text-[#5a5248]"><UiText>{copy.sectionLead}</UiText></p>
      <div className="grid gap-2">
        <Label htmlFor="cat-title"><UiText>{copy.sectionName}</UiText> *</Label>
        <Input id="cat-title" name="title" required placeholder={copy.sectionNamePh} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="cat-desc"><UiText>{copy.description}</UiText></Label>
        <Input id="cat-desc" name="description" placeholder={copy.descriptionPh} />
      </div>
      <input type="hidden" name="icon" value="stethoscope" />
      <ResultMessage state={state} />
      <Button type="submit" disabled={pending} className="h-11 w-full sm:w-auto">
        <UiText>{pending ? copy.saving : copy.addSection}</UiText>
      </Button>
    </form>
  );
}

function MaterialFields({
  categories,
  material,
  pending,
  state,
  onSubmit,
  locale = "uz",
}: {
  categories: { id: number; title: string }[];
  material?: Material;
  pending: boolean;
  state: SaveResult | null;
  onSubmit: (form: FormData) => void;
  locale?: Locale;
}) {
  const copy = uiCopy(locale);
  const preferred =
    categories.find((c) => c.title.toLowerCase() === "dmed") ?? categories[0];
  const defaultCategoryId = String(
    material?.categoryId ?? preferred?.id ?? "",
  );
  const parsed = extractMediaFromContent(material?.content || "");
  const [title, setTitle] = useState(material?.title || "");
  const [content, setContent] = useState(parsed.text);
  const [media, setMedia] = useState<MediaDraft[]>(() =>
    parsed.media.map((item) => ({
      key: newKey(),
      kind: item.kind,
      url: item.src,
      preview: item.src,
    })),
  );
  const [removeImage, setRemoveImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(
    material?.imageUrl || null,
  );
  const videoUrlRef = useRef<string | null>(null);
  const imageUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
      if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
      for (const item of media) {
        if (item.file && item.preview.startsWith("blob:")) {
          URL.revokeObjectURL(item.preview);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const previewContent = useMemo(() => {
    const items = media
      .map((item) =>
        item.preview ? { kind: item.kind, src: item.preview } : null,
      )
      .filter((item): item is { kind: "image" | "video"; src: string } => Boolean(item));
    return serializeLessonContent(items, content);
  }, [content, media]);

  function addFiles(kind: "image" | "video", files: FileList | null) {
    if (!files?.length) return;
    const extra: MediaDraft[] = [];
    for (const file of Array.from(files)) {
      const preview = URL.createObjectURL(file);
      extra.push({ key: newKey(), kind, file, preview });
    }
    setMedia((prev) => [...prev, ...extra]);
  }

  function moveMedia(index: number, dir: -1 | 1) {
    setMedia((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }

  function removeMedia(index: number) {
    setMedia((prev) => {
      const item = prev[index];
      if (item?.file && item.preview.startsWith("blob:")) {
        URL.revokeObjectURL(item.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  }

  return (
    <form
      encType="multipart/form-data"
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        form.set("content", content);
        form.set("title", title);
        const plan: Array<
          | { kind: "image" | "video"; src: string }
          | { kind: "image" | "video"; newIndex: number }
        > = [];
        const videoFiles: File[] = [];
        const imageFiles: File[] = [];
        for (const item of media) {
          if (item.url) {
            plan.push({ kind: item.kind, src: item.url });
            continue;
          }
          if (!item.file) continue;
          if (item.kind === "video") {
            plan.push({ kind: "video", newIndex: videoFiles.length });
            videoFiles.push(item.file);
          } else {
            plan.push({ kind: "image", newIndex: imageFiles.length });
            imageFiles.push(item.file);
          }
        }
        form.set("mediaPlan", JSON.stringify(plan));
        for (const file of videoFiles) form.append("videos", file);
        for (const file of imageFiles) form.append("images", file);
        onSubmit(form);
      }}
    >
      {material ? <input type="hidden" name="id" value={material.id} /> : null}
      <input type="hidden" name="removeImage" value={removeImage ? "1" : "0"} />

      <p className="rounded-lg bg-[#eef3fb] px-3 py-2 text-sm text-[#243b6b]">
        <UiText>{copy.lessonLead}</UiText>
      </p>

      <div className="grid gap-2">
        <Label htmlFor="mat-category"><UiText>{copy.whichSection}</UiText> *</Label>
        <select
          id="mat-category"
          name="categoryId"
          required
          defaultValue={defaultCategoryId}
          className="border-input bg-background h-11 w-full rounded-lg border px-2.5 text-sm outline-none"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              <UiText>{category.title}</UiText>
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="mat-title"><UiText>{copy.title}</UiText> *</Label>
        <Input
          id="mat-title"
          name="title"
          required
          className="h-11"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={copy.titlePh}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="mat-summary"><UiText>{copy.summary}</UiText></Label>
        <Input
          id="mat-summary"
          name="summary"
          className="h-11"
          defaultValue={material?.summary || ""}
          placeholder={copy.summaryPh}
        />
      </div>

      <div className="grid gap-2">
        <Label><UiText>{copy.videoMedia}</UiText></Label>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex h-11 cursor-pointer items-center rounded-full bg-[#1a6fd4] px-4 text-sm font-medium text-white">
            <UiText>{copy.addVideo}</UiText>
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
              multiple
              className="sr-only"
              onChange={(event) => {
                addFiles("video", event.target.files);
                event.target.value = "";
              }}
            />
          </label>
          <label className="inline-flex h-11 cursor-pointer items-center rounded-full border border-[#d7e4fb] bg-white px-4 text-sm font-medium text-[#0b2a55]">
            <UiText>{copy.addImage}</UiText>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
              multiple
              className="sr-only"
              onChange={(event) => {
                addFiles("image", event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        </div>
        {media.length === 0 ? (
          <p className="text-xs text-[#7a7166]"><UiText>{" Hali video yoki rasm yo‘q. Mp4/webm — 80MB, rasm — 8MB gacha. "}</UiText></p>
        ) : (
          <ul className="space-y-2">
            {media.map((item, index) => (
              <li
                key={item.key}
                className="flex flex-wrap items-center gap-3 rounded-xl bg-[#f7f3ec]/80 px-3 py-2"
              >
                {item.kind === "video" ? (
                  <video
                    src={item.preview}
                    className="h-16 w-24 rounded-lg bg-black object-cover"
                    muted
                    playsInline
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.preview}
                    alt=""
                    className="h-16 w-24 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#071a38]">
                    <UiText>{item.kind === "video" ? "Video" : "Rasm"}</UiText> {index + 1}
                  </p>
                  <p className="truncate text-xs text-[#5a5248]">
                    {item.file?.name || item.url || ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={index === 0}
                    onClick={() => moveMedia(index, -1)}
                  ><UiText>{" Yuqoriga "}</UiText></Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={index === media.length - 1}
                    onClick={() => moveMedia(index, 1)}
                  ><UiText>{" Pastga "}</UiText></Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMedia(index)}
                  ><UiText>{" O‘chirish "}</UiText></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="mat-content"><UiText>{copy.lessonText}</UiText></Label>
        <Textarea
          id="mat-content"
          name="content"
          rows={10}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={copy.lessonTextPh}
        />
        <p className="text-xs text-[#7a7166]"><UiText>{" Matn bo‘sh bo‘lishi mumkin, lekin video yoki rasm bo‘lsin. "}</UiText></p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="mat-image"><UiText>{copy.coverImage}</UiText></Label>
        {imagePreview && !removeImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagePreview}
            alt=""
            className="max-h-48 w-full rounded-xl object-cover"
          />
        ) : (
          <p className="text-sm text-[#7a7166]"><UiText>{"Rasm yo‘q"}</UiText></p>
        )}
        {material?.imageUrl ? (
          <label className="flex items-center gap-2 text-sm text-[#5a5248]">
            <input
              type="checkbox"
              checked={removeImage}
              onChange={(e) => setRemoveImage(e.target.checked)}
            /><UiText>{" Hozirgi muqova rasmni o‘chirish "}</UiText></label>
        ) : null}
        <Input
          id="mat-image"
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
          className="h-11"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
            if (!file) return;
            const url = URL.createObjectURL(file);
            imageUrlRef.current = url;
            setImagePreview(url);
            setRemoveImage(false);
          }}
        />
      </div>

      <details className="rounded-xl border border-black/8 bg-[#f7f3ec]/60 px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium text-[#5a5248]"><UiText>{" Qo‘shimcha (icon) "}</UiText></summary>
        <div className="mt-3 grid gap-2">
          <Label htmlFor="mat-icon"><UiText>{"Icon"}</UiText></Label>
          <select
            id="mat-icon"
            name="icon"
            defaultValue={material?.icon || "file-text"}
            className="border-input bg-background h-11 w-full rounded-lg border px-2.5 text-sm outline-none"
          >
            {ICON_OPTIONS.map((name) => (
              <option key={name} value={name}>
                <UiText>{name}</UiText>
              </option>
            ))}
          </select>
        </div>
      </details>

      <section className="rounded-2xl border border-black/8 bg-[#fbfaf7] p-3">
        <p className="mb-2 text-xs font-medium tracking-wide text-[#7a7166] uppercase"><UiText>{" Mijozlarda qanday ko‘rinadi "}</UiText></p>
        <MaterialBody title={title || "Sarlavha"} content={previewContent} />
      </section>

      <ResultMessage state={state} slug={state?.ok ? state.slug : undefined} />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending} className="h-11">
          <UiText>{pending
            ? "Saqlanmoqda..."
            : material
              ? "O‘zgarishlarni saqlash"
              : "Mijozlarga chiqarish"}</UiText>
        </Button>
        {material ? (
          <>
            <Button asChild type="button" variant="outline" className="h-11">
              <Link href="/admin"><UiText>{"Orqaga"}</UiText></Link>
            </Button>
            <Button asChild type="button" variant="ghost" className="h-11">
              <Link href={`/m/${material.slug}`}><UiText>{"Mijozlarda ko‘rish"}</UiText></Link>
            </Button>
          </>
        ) : null}
      </div>
    </form>
  );
}

export function MaterialCreateForm({
  categories,
  locale = "uz",
}: {
  categories: { id: number; title: string }[];
  locale?: Locale;
}) {
  const router = useRouter();
  const [state, setState] = useState<SaveResult | null>(null);
  const [pending, setPending] = useState(false);
  const [formKey, setFormKey] = useState(0);

  if (categories.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/40 bg-white/90 p-5 text-sm text-[#7a7166]"><UiText>{" Avval bo‘lim qo‘shing, keyin material kiriting. "}</UiText></div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/30 bg-white/95 p-5 shadow-sm">
      <MaterialFields
        key={formKey}
        locale={locale}
        categories={categories}
        pending={pending}
        state={state}
        onSubmit={async (form) => {
          setPending(true);
          setState(null);
          const result = await postForm("/api/admin/materials", form);
          setState(result);
          setPending(false);
          if (result.ok) {
            setFormKey((n) => n + 1);
            router.refresh();
          }
        }}
      />
    </div>
  );
}

export function MaterialEditForm({
  material,
  categories,
}: {
  material: Material;
  categories: { id: number; title: string }[];
}) {
  const router = useRouter();
  const [state, setState] = useState<SaveResult | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="rounded-2xl border border-white/30 bg-white/95 p-5 shadow-sm">
    <MaterialFields
      categories={categories}
      material={material}
      pending={pending}
      state={state}
      onSubmit={async (form) => {
        setPending(true);
        setState(null);
        const result = await postForm("/api/admin/materials", form, "PUT");
        setState(result);
        setPending(false);
        if (result.ok) router.refresh();
      }}
    />
    </div>
  );
}
