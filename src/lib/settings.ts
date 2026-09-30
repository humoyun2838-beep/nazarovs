import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema";

export function getSetting(key: string) {
  const row = db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .limit(1)
    .all()[0];
  return row?.value?.trim() || "";
}

export function setSetting(key: string, value: string) {
  const current = getSetting(key);
  if (current) {
    db.update(appSettings)
      .set({ value })
      .where(eq(appSettings.key, key))
      .run();
    return;
  }
  db.insert(appSettings)
    .values({ key, value })
    .run();
}
