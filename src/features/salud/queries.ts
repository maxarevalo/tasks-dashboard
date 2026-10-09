import "server-only";
import { connectToDatabase } from "@/lib/db";
import { getActiveProfileKey } from "@/lib/profile";
import { WeightEntry, WeightMilestone } from "@/models/salud";
import { buildWeeks } from "./weekly";
import type { WeightEntryDTO, WeightOverview } from "./types";

export async function getWeightOverview(): Promise<WeightOverview> {
  await connectToDatabase();
  const uid = await getActiveProfileKey();

  const [docs, milestoneDocs] = await Promise.all([
    WeightEntry.find({ userId: uid })
      .sort({ takenAt: 1 })
      .select("takenAt weight note")
      .lean(),
    WeightMilestone.find({ userId: uid }).sort({ date: 1 }).lean(),
  ]);

  const asc: WeightEntryDTO[] = docs.map((d, i) => ({
    id: String(d._id),
    takenAt: String(d.takenAt),
    weight: (d.weight as number) ?? 0,
    note: (d.note as string | undefined) ?? "",
    delta: i > 0 ? ((d.weight as number) ?? 0) - ((docs[i - 1].weight as number) ?? 0) : null,
  }));

  const milestones = milestoneDocs.map((m) => ({
    id: String(m._id),
    date: String(m.date),
    label: String(m.label),
  }));

  return { entries: [...asc].reverse(), weeks: buildWeeks(asc), milestones };
}
