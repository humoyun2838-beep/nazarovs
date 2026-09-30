"use client";

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
      <p>Saqlandi. Mijozlar sahifasida hozir ko‘rinadi.</p>
      {slug ? (
        <p className="mt-1">
          <Link href={`/m/${slug}`} className="underline underline-offset-2">
            Mijoz ko‘rinishini ochish
          </Link>
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

export function CategoryCreateForm() {
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
      <p className="text-sm text-[#5a5248]">
        Yangi bo‘lim mijozlarning “Bo‘limlar” ro‘yxatida chiqadi.
      </p>
      <div className="grid gap-2">
        <Label htmlFor="cat-title">Bo‘lim nomi *</Label>
        <Input id="cat-title" name="title" required placeholder="Masalan: Yangi kurs" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="cat-desc">Tavsif</Label>
        <Input id="cat-desc" name="description" placeholder="Qisqa izoh" />
      </div>
      <input type="hidden" name="icon" value="stethoscope" />
      <ResultMessage state={state} />
      <Button type="submit" disabled={pending} className="h-11 w-full sm:w-auto">
        {pending ? "Saqlanmoqda..." : "Bo‘lim qo‘shish"}
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
}: {
  categories: { id: number; title: string }[];
  material?: Material;
  pending: boolean;
  state: SaveResult | null;
  onSubmit: (form: FormData) => void;
}) {
  const preferred =
    categories.find((c) => c.title.toLowerCase() === "dmed") ?? categories[0];
  const defaultCategoryId = String(
    material?.categoryId ?? preferred?.id ?? "",
  );
  const [title, setTitle] = useState(material?.title || "");
  const [content, setContent] = useState(material?.content || "");
  const [removeImage, setRemoveImage] = useState(false);
  const [videoName, setVideoName] = useState("");
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    material?.imageUrl || null,
  );
  const videoUrlRef = useRef<string | null>(null);
  const imageUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
      if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
    };
  }, []);

  const previewContent = useMemo(() => {
    if (videoPreview && !/VIDEO::/i.test(content)) {
      return `VIDEO::${videoPreview}\n\n${content}`.trim();
    }
    return content;
  }, [content, videoPreview]);

  return (
    <form
      encType="multipart/form-data"
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        form.set("content", content);
        form.set("title", title);
        onSubmit(form);
      }}
    >
      {material ? <input type="hidden" name="id" value={material.id} /> : null}
      <input type="hidden" name="removeImage" value={removeImage ? "1" : "0"} />

      <p className="rounded-lg bg-[#eef3fb] px-3 py-2 text-sm text-[#243b6b]">
        Video, matn va rasm shu yerda saqlanadi. Mijozlar login-parolsiz
        `/nazarov` da ko‘radi.
      </p>

      <div className="grid gap-2">
        <Label htmlFor="mat-category">Qaysi bo‘limga? *</Label>
        <select
          id="mat-category"
          name="categoryId"
          required
          defaultValue={defaultCategoryId}
          className="border-input bg-background h-11 w-full rounded-lg border px-2.5 text-sm outline-none"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.title}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="mat-title">Sarlavha *</Label>
        <Input
          id="mat-title"
          name="title"
          required
          className="h-11"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Masalan: Shifokor — yangi dars"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="mat-summary">Qisqa izoh</Label>
        <Input
          id="mat-summary"
          name="summary"
          className="h-11"
          defaultValue={material?.summary || ""}
          placeholder="Mijozlar ro‘yxatida ko‘rinadigan qisqa matn"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="mat-video">Video dars (mp4, webm — 80MB gacha)</Label>
        <Input
          id="mat-video"
          name="video"
          type="file"
          accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
          className="h-11"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
            if (!file) {
              setVideoName("");
              setVideoPreview(null);
              videoUrlRef.current = null;
              return;
            }
            const url = URL.createObjectURL(file);
            videoUrlRef.current = url;
            setVideoName(file.name);
            setVideoPreview(url);
          }}
        />
        {videoName ? (
          <p className="text-xs text-[#5a5248]">Tanlangan video: {videoName}</p>
        ) : /VIDEO::/i.test(content) ? (
          <p className="text-xs text-[#0f5c4c]">
            Bu darsda video allaqachon bor. Yangi fayl yuklasangiz, almashtiriladi.
          </p>
        ) : (
          <p className="text-xs text-[#7a7166]">
            Video ixtiyoriy. Faqat matn ham yetarli.
          </p>
        )}
        {videoPreview ? (
          <video
            controls
            playsInline
            src={videoPreview}
            className="max-h-64 w-full rounded-xl bg-black"
          />
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="mat-content">Dars matni</Label>
        <Textarea
          id="mat-content"
          name="content"
          rows={10}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Mijozlar ochganda o‘qiydigan matn. Video alohida yuklanadi."
        />
        <p className="text-xs text-[#7a7166]">
          Matn bo‘sh bo‘lishi mumkin, lekin video yoki rasm bo‘lsin.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="mat-image">Rasm (ixtiyoriy, 8MB gacha)</Label>
        {imagePreview && !removeImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagePreview}
            alt=""
            className="max-h-48 w-full rounded-xl object-cover"
          />
        ) : (
          <p className="text-sm text-[#7a7166]">Rasm yo‘q</p>
        )}
        {material?.imageUrl ? (
          <label className="flex items-center gap-2 text-sm text-[#5a5248]">
            <input
              type="checkbox"
              checked={removeImage}
              onChange={(e) => setRemoveImage(e.target.checked)}
            />
            Hozirgi rasmni o‘chirish
          </label>
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
        <summary className="cursor-pointer text-sm font-medium text-[#5a5248]">
          Qo‘shimcha (icon)
        </summary>
        <div className="mt-3 grid gap-2">
          <Label htmlFor="mat-icon">Icon</Label>
          <select
            id="mat-icon"
            name="icon"
            defaultValue={material?.icon || "file-text"}
            className="border-input bg-background h-11 w-full rounded-lg border px-2.5 text-sm outline-none"
          >
            {ICON_OPTIONS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </details>

      <section className="rounded-2xl border border-black/8 bg-[#fbfaf7] p-3">
        <p className="mb-2 text-xs font-medium tracking-wide text-[#7a7166] uppercase">
          Mijozlarda qanday ko‘rinadi
        </p>
        <MaterialBody title={title || "Sarlavha"} content={previewContent} />
      </section>

      <ResultMessage state={state} slug={state?.ok ? state.slug : undefined} />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending} className="h-11">
          {pending
            ? "Saqlanmoqda..."
            : material
              ? "O‘zgarishlarni saqlash"
              : "Mijozlarga chiqarish"}
        </Button>
        {material ? (
          <>
            <Button asChild type="button" variant="outline" className="h-11">
              <Link href="/admin">Orqaga</Link>
            </Button>
            <Button asChild type="button" variant="ghost" className="h-11">
              <Link href={`/m/${material.slug}`}>Mijozlarda ko‘rish</Link>
            </Button>
          </>
        ) : null}
      </div>
    </form>
  );
}

export function MaterialCreateForm({
  categories,
}: {
  categories: { id: number; title: string }[];
}) {
  const router = useRouter();
  const [state, setState] = useState<SaveResult | null>(null);
  const [pending, setPending] = useState(false);
  const [formKey, setFormKey] = useState(0);

  if (categories.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/40 bg-white/90 p-5 text-sm text-[#7a7166]">
        Avval bo‘lim qo‘shing, keyin material kiriting.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/30 bg-white/95 p-5 shadow-sm">
      <MaterialFields
        key={formKey}
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
