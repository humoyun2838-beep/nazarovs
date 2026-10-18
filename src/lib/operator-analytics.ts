import { sqlite } from "@/db";
import { readOperatorRanking, recordOperatorHeartbeat } from "./operator-analytics-core";
export const operatorRanking = (range: { from?: string; to?: string }) => readOperatorRanking(sqlite, range);
export const operatorHeartbeat = (id: number, active = true) => recordOperatorHeartbeat(sqlite, id, Date.now(), active);
