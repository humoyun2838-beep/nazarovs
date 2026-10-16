import "server-only";
import fs from "node:fs";
import path from "node:path";
import { sqlite } from "@/db";

let release: string | undefined;
function getRelease() {
  if (release) return release;
  try {
    release = fs.readFileSync(path.join(process.cwd(), ".next/BUILD_ID"), "utf8").trim();
  } catch {
    release = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.DEPLOY_REV || "development";
  }
  return release;
}

export function getCatalogRevision() {
  const row = sqlite.prepare("SELECT revision FROM catalog_revision WHERE id = 1").get() as { revision: number };
  return String(row.revision);
}

export function getAppVersion() {
  return `${getRelease()}:${getCatalogRevision()}`;
}
