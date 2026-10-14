const fs = require("node:fs");
const path = require("node:path");
const required = [
  "src/data/dmed-tree.json", "src/data/catalog-i18n.json",
  "src/data/lesson-i18n.json", "src/data/lesson-phrases.json",
  "src/data/notion-videos.json",
];
let failed = false;
for (const file of required) {
  try {
    JSON.parse(fs.readFileSync(path.join(__dirname, "..", file), "utf8"));
    console.log(`OK ${file}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${file}: ${error.code || error.message}`);
  }
}
if (failed) console.error("Restore the original data files before building or packaging this site.");
process.exitCode = failed ? 1 : 0;
