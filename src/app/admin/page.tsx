import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getCategories, getMaterialLinksByCategory } from "@/lib/data";
import {
  CategoryCreateForm,
  MaterialCreateForm,
} from "@/components/admin-forms";
import { AdminCatalog } from "@/components/admin-catalog";
import { SiteHeader } from "@/components/site-header";
import { AdminChatCard } from "@/components/admin-chat-card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login?next=/admin");
  }
  if (session.role !== "admin") {
    redirect("/nazarov");
  }

  const categories = await getCategories();
  const materialsByCategory = categories.map((category) => ({
    category,
    materials: getMaterialLinksByCategory(category.id),
  }));

  return (
    <>
      <SiteHeader username={session.username} role={session.role} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <div className="page-enter space-y-8">
          <header className="catalog-hero space-y-3 rounded-3xl p-5 sm:p-6">
            <p className="relative z-10 text-xs font-semibold tracking-[0.22em] text-[#1a6fd4] uppercase">
              Admin panel
            </p>
            <h1 className="relative z-10 font-heading text-3xl font-semibold tracking-tight text-[#071a38] sm:text-4xl">
              Mijozlarga material
            </h1>
            <p className="relative z-10 max-w-2xl text-sm leading-relaxed text-[#3d5a84]">
              Video, matn va rasm qo‘shing. Saqlangandan so‘ng dars darhol
              mijozlar katalogida ochiladi.
            </p>
            <div className="relative z-10 flex flex-wrap gap-2 pt-1">
              <Button asChild size="sm">
                <Link href="/nazarov">Mijozlar ko‘rinishini ochish</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/admin/chat">Chat</Link>
              </Button>
            </div>
          </header>

          <AdminChatCard />

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-[#0b2a55]">
              1) Yangi dars
            </h2>
            <MaterialCreateForm
              categories={categories.map((c) => ({ id: c.id, title: c.title }))}
            />
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-[#0b2a55]">
              2) Yangi bo‘lim
            </h2>
            <CategoryCreateForm />
          </section>

          <AdminCatalog groups={materialsByCategory} />
        </div>
      </main>
    </>
  );
}
