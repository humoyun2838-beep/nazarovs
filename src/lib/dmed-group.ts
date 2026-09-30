type SeedMaterial = {
  title: string;
  slug: string;
  summary?: string;
  content?: string;
  icon?: string;
  sourceUrl?: string;
  section?: string;
  parentSlug?: string;
};

export type DmedSection = {
  title: string;
  slug: string;
  description: string;
  icon: string;
  sortOrder: number;
  materials: SeedMaterial[];
};

export const DMED_SECTION_ORDER = [
  "Tizimga kirish",
  "Ro‘yxatga oluvchi",
  "Amaliyotchi hamshira",
  "Patronaj hamshirasi",
  "Shifokor",
  "Qabul bo‘limining navbatchi shifokor/Hamshirasi",
  "Shifoxonaning davolovchi shifokor",
  "Shifoxona. Tor mutaxassis korik tartibi",
  "Laborant",
  "Taqrizchi (qayta ko'rib chiquvchi)",
  "Direktor",
  "Statist",
  "Farmasevt",
  "Ombor mudiri",
  "Buxgalter",
  "Kassir",
  "Bosh hamshira",
  "Hamshira",
  "Bemor",
  "KPI (Asosiy samaradorlik ko’rsatkichlari)",
  "Yangi Omborxona",
  "Muxlisa ilovasini o‘rnatish",
] as const;

export function slugifyCategory(value: string) {
  const base = value
    .toLowerCase()
    .replace(/['’ʻʼ`]/g, "")
    .replace(/[^a-z0-9\u0400-\u04FFа-яё\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || `bolim-${Date.now()}`;
}

export function normDmedTitle(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[‘’ʻʼ`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function splitRole(title: string) {
  const raw = title.trim();
  const idx = raw.indexOf(":");
  if (idx > 0) {
    return {
      role: raw.slice(0, idx).trim(),
      lesson: raw.slice(idx + 1).trim() || raw,
    };
  }
  return { role: raw, lesson: raw };
}

export function groupDmedMaterials(materials: SeedMaterial[]): DmedSection[] {
  const order: string[] = [];
  const map = new Map<
    string,
    { title: string; slug: string; icon: string; materials: SeedMaterial[] }
  >();

  for (const material of materials) {
    const fromSection = (material.section || "").trim();
    const { role, lesson } = splitRole(material.title);
    const groupTitle = fromSection || role;
    const itemTitle = fromSection ? material.title : lesson;
    if (!map.has(groupTitle)) {
      map.set(groupTitle, {
        title: groupTitle,
        slug: slugifyCategory(groupTitle),
        icon: material.icon || "file-text",
        materials: [],
      });
      order.push(groupTitle);
    }
    map.get(groupTitle)!.materials.push({
      ...material,
      title: itemTitle,
      summary: material.summary || `DMED · ${groupTitle}`,
    });
  }

  const rank = new Map(
    DMED_SECTION_ORDER.map((title, index) => [normDmedTitle(title), index]),
  );
  const original = new Map(order.map((title, index) => [title, index]));
  order.sort((a, b) => {
    const ra = rank.has(normDmedTitle(a)) ? rank.get(normDmedTitle(a))! : 1000;
    const rb = rank.has(normDmedTitle(b)) ? rank.get(normDmedTitle(b))! : 1000;
    if (ra !== rb) return ra - rb;
    return (original.get(a) || 0) - (original.get(b) || 0);
  });

  return order.map((role, index) => {
    const group = map.get(role)!;
    return {
      title: group.title,
      slug: group.slug,
      description: `${group.materials.length} ta material`,
      icon: group.icon,
      sortOrder: index + 1,
      materials: group.materials,
    };
  });
}
