const BASE = "http://127.0.0.1:3847";
function visible(html) {
  return String(html).replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}
(async () => {
  for (const p of [
    "/b/shifoxonaning-davolovchi-shifokor?lang=ru",
    "/b/direktor?lang=ru",
    "/m/belgilangan-vaqtga-qabulga-pulli-yozilish-26860b77fb?lang=ru",
    "/m/jonli-navbatga-qabulga-pulli-yozilish-26860b77fb?lang=ru",
  ]) {
    const html = await (await fetch(BASE + p)).text();
    const t = visible(html);
    for (const n of ["Tizimga kirganingizdan", "kirganingizdan", "Avvalo", "akkauntiga"]) {
      const i = t.indexOf(n);
      if (i >= 0) console.log(p, n, "=>", t.slice(Math.max(0, i - 40), i + 120));
    }
  }
})();
