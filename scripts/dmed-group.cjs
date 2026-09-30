const SECTION_ORDER = [
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
];

function slugify(value) {
  const base = String(value)
    .toLowerCase()
    .replace(/['’ʻʼ`]/g, "")
    .replace(/[^a-z0-9\u0400-\u04FFа-яё\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || `bolim-${Date.now()}`;
}

function normTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[‘’ʻʼ`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function splitRole(title) {
  const raw = String(title || "").trim();
  const idx = raw.indexOf(":");
  if (idx > 0) {
    return {
      role: raw.slice(0, idx).trim(),
      lesson: raw.slice(idx + 1).trim() || raw,
    };
  }
  return { role: raw, lesson: raw };
}

function groupDmedMaterials(materials) {
  const order = [];
  const map = new Map();

  for (const material of materials) {
    const fromSection = String(material.section || "").trim();
    const { role, lesson } = splitRole(material.title);
    const groupTitle = fromSection || role;
    const itemTitle = fromSection ? material.title : lesson;
    if (!map.has(groupTitle)) {
      map.set(groupTitle, {
        title: groupTitle,
        slug: slugify(groupTitle),
        icon: material.icon || "file-text",
        materials: [],
      });
      order.push(groupTitle);
    }
    const group = map.get(groupTitle);
    group.materials.push({
      ...material,
      title: itemTitle,
      summary: material.summary || `DMED · ${groupTitle}`,
    });
  }

  const rank = new Map(SECTION_ORDER.map((title, index) => [normTitle(title), index]));
  const original = new Map(order.map((title, index) => [title, index]));
  order.sort((a, b) => {
    const ra = rank.has(normTitle(a)) ? rank.get(normTitle(a)) : 1000;
    const rb = rank.has(normTitle(b)) ? rank.get(normTitle(b)) : 1000;
    if (ra !== rb) return ra - rb;
    return original.get(a) - original.get(b);
  });

  return order.map((role, index) => {
    const group = map.get(role);
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

module.exports = { slugify, splitRole, groupDmedMaterials, SECTION_ORDER };
