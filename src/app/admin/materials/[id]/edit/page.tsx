import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getCategories, getMaterialById } from "@/lib/data";
import { MaterialEditForm } from "@/components/admin-forms";
import { SiteHeader } from "@/components/site-header";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function EditMaterialPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/admin/login?next=/admin");
  if (session.role !== "admin") redirect("/nazarov");

  const { id } = await params;
  const materialId = Number(id);
  if (!Number.isFinite(materialId)) notFound();

  const [material, categories] = await Promise.all([
    getMaterialById(materialId),
    getCategories(),
  ]);
  if (!material) notFound();

  return (
    <>
      <SiteHeader username={session.username} role={session.role} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <div className="page-enter space-y-6">
          <header className="space-y-2 rounded-2xl border border-white/30 bg-white/95 p-5 shadow-sm">
            <p className="text-xs font-medium tracking-[0.2em] text-[#7a7166] uppercase">
              Tahrirlash
            </p>
            <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              {material.title}
            </h1>
            <p className="text-sm text-[#5a5248]">
              Video, matn va rasmni o‘zgartirib saqlang. Mijozlar darhol yangi
              versiyani ko‘radi.
            </p>
            <Link
              href="/admin"
              className="inline-block text-sm text-[#2f6fed] underline underline-offset-2"
            >
              ← Admin ro‘yxatiga
            </Link>
          </header>

          <MaterialEditForm
            material={material}
            categories={categories.map((c) => ({ id: c.id, title: c.title }))}
          />
        </div>
      </main>
    </>
  );
}
