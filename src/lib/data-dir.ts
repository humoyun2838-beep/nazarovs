import path from "node:path";

/** SQLite + chat media. On Railway set DATA_DIR=/data and mount a volume there. */
export function dataDir() {
  const fromEnv = (process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || "").trim();
  if (fromEnv) return fromEnv;
  return path.join(process.cwd(), "data");
}
