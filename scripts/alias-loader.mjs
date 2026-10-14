import { fileURLToPath, pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "src");

function withExtension(target) {
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    if (fs.existsSync(path.join(target, "index.ts"))) return path.join(target, "index.ts");
    if (fs.existsSync(path.join(target, "index.tsx"))) return path.join(target, "index.tsx");
  }
  if (fs.existsSync(`${target}.ts`)) return `${target}.ts`;
  if (fs.existsSync(`${target}.tsx`)) return `${target}.tsx`;
  if (fs.existsSync(`${target}.mjs`)) return `${target}.mjs`;
  return target;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith(".json")) context = { ...context, importAttributes: { type: "json" } };
  // These standalone scripts execute server modules, like Next's server compiler.
  if (specifier === "server-only") {
    return nextResolve(pathToFileURL(path.join(root, "../node_modules/next/dist/compiled/server-only/empty.js")).href, context);
  }
  if (specifier.startsWith("@/")) {
    const target = withExtension(path.join(root, specifier.slice(2)));
    return nextResolve(pathToFileURL(target).href, context);
  }
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !path.extname(specifier)
  ) {
    const parent = context.parentURL
      ? path.dirname(fileURLToPath(context.parentURL))
      : process.cwd();
    const target = withExtension(path.resolve(parent, specifier));
    return nextResolve(pathToFileURL(target).href, context);
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith(pathToFileURL(root).href) && url.endsWith('.json')) {
    return { format: 'module', source: 'export default ' + fs.readFileSync(fileURLToPath(url), 'utf8') + ';', shortCircuit: true };
  }
  return nextLoad(url, context);
}
