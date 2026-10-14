export const SECTION_STICKERS: Record<string, string> = {
  "violation-report": "/art/ai-notion-v6/violation-report.webp",
  "electron-queue": "/art/ai-notion-v6/electron-queue.webp",
  "tech-settings": "/art/ai-notion-v6/tech-settings.webp",
  "tizimga-kirish": "/stickers/tizimga-kirish.webp",
  "royxatga-oluvchi": "/stickers/royxatga-oluvchi.webp",
  "amaliyotchi-hamshira": "/stickers/amaliyotchi-hamshira.webp",
  "patronaj-hamshirasi": "/stickers/patronaj-hamshirasi.webp",
  shifokor: "/stickers/shifokor.webp",
  "qabul-bolimining-navbatchi-shifokorhamshirasi":
    "/stickers/qabul-bolimining-navbatchi-shifokorhamshirasi.webp",
  "shifoxonaning-davolovchi-shifokor":
    "/stickers/shifoxonaning-davolovchi-shifokor.webp",
  "shifoxona-tor-mutaxassis-korik-tartibi":
    "/stickers/shifoxona-tor-mutaxassis-korik-tartibi.webp",
  laborant: "/stickers/laborant.webp",
  "taqrizchi-qayta-korib-chiquvchi":
    "/stickers/taqrizchi-qayta-korib-chiquvchi.webp",
  direktor: "/stickers/direktor.webp",
  statist: "/stickers/statist.webp",
  farmasevt: "/stickers/farmasevt.webp",
  "ombor-mudiri": "/stickers/ombor-mudiri.webp",
  buxgalter: "/stickers/buxgalter.webp",
  kassir: "/stickers/kassir.webp",
  "bosh-hamshira": "/stickers/bosh-hamshira.webp",
  hamshira: "/stickers/hamshira.webp",
  bemor: "/stickers/bemor.webp",
  "kpi-asosiy-samaradorlik-korsatkichlari":
    "/stickers/kpi-asosiy-samaradorlik-korsatkichlari.webp",
  "yangi-omborxona": "/stickers/yangi-omborxona.webp",
  "muxlisa-ilovasini-ornatish": "/stickers/muxlisa-ilovasini-ornatish.webp",
};

export function sectionSticker(slug: string) {
  const src = SECTION_STICKERS[slug];
  return src ? `${src}?v=c3` : "";
}

export function allSectionStickerUrls() {
  return Object.keys(SECTION_STICKERS).map((slug) => sectionSticker(slug));
}
