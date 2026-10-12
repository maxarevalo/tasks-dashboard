import "server-only";
import { connectToDatabase } from "@/lib/db";
import { getActiveProfileKey } from "@/lib/profile";
import { GlucoseEntry, WeightEntry, WeightMilestone } from "@/models/salud";
import { buildWeeks } from "./weekly";
import type { GlucoseEntryDTO, WeightEntryDTO, WeightOverview } from "./types";

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

/** Mediciones de glucosa, de la más reciente a la más antigua. */
export async function getGlucoseEntries(): Promise<GlucoseEntryDTO[]> {
  await connectToDatabase();
  const uid = await getActiveProfileKey();
  const docs = await GlucoseEntry.find({ userId: uid })
    .sort({ takenAt: -1 })
    .select("takenAt value context")
    .lean();
  return docs.map((d) => ({
    id: String(d._id),
    takenAt: String(d.takenAt),
    value: (d.value as number) ?? 0,
    context: (d.context as string | undefined) || "Ayunas",
  }));
}
