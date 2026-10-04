import "server-only";
import { connectToDatabase } from "@/lib/db";
import { getActiveProfileKey } from "@/lib/profile";
import { WeightEntry } from "@/models/salud";
import { buildWeeks } from "./weekly";
import type { WeightEntryDTO, WeightOverview } from "./types";

export async function getWeightOverview(): Promise<WeightOverview> {
  await connectToDatabase();
  const uid = await getActiveProfileKey();

  const docs = await WeightEntry.find({ userId: uid })
    .sort({ takenAt: 1 })
    .select("takenAt weight")
    .lean();

  const asc: WeightEntryDTO[] = docs.map((d, i) => ({
    id: String(d._id),
    takenAt: String(d.takenAt),
    weight: (d.weight as number) ?? 0,
    delta: i > 0 ? ((d.weight as number) ?? 0) - ((docs[i - 1].weight as number) ?? 0) : null,
  }));

  return { entries: [...asc].reverse(), weeks: buildWeeks(asc) };
}
