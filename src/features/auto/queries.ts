import "server-only";
import { connectToDatabase } from "@/lib/db";
import { getActiveProfileKey } from "@/lib/profile";
import { FuelLog, UpcomingService, ServiceRecord } from "@/models/auto";
import { addDays, todayStr } from "@/lib/pf";
import type { Currency } from "@/lib/money";
import type {
  AutoOverview,
  FuelLogDTO,
  UpcomingServiceDTO,
  ServiceRecordDTO,
  ServiceStatus,
} from "./types";

type Lean = Record<string, unknown>;
const str = (v: unknown) => (v == null ? "" : String(v));

/**
 * Mapea las cargas y calcula, por patente, el consumo (km/l) contra la carga
 * anterior en orden cronológico. Devuelve ordenado por fecha descendente
 * (más reciente primero) para mostrar en la lista.
 */
function mapFuelLogs(docs: Lean[]): FuelLogDTO[] {
  const chronological = [...docs].sort((a, b) => {
    const byDate = str(a.date).localeCompare(str(b.date));
    if (byDate !== 0) return byDate;
    return ((a.km as number) ?? 0) - ((b.km as number) ?? 0);
  });

  const lastKmByPlate = new Map<string, number>();
  const mapped = chronological.map((d) => {
    const plate = str(d.plate);
    const km = (d.km as number) ?? 0;
    const liters = (d.liters as number) ?? 0;
    const prevKm = lastKmByPlate.get(plate);
    const kmPerLiter =
      prevKm != null && km > prevKm && liters > 0
        ? (km - prevKm) / liters
        : null;
    lastKmByPlate.set(plate, km);

    return {
      id: str(d._id),
      plate,
      date: str(d.date),
      km,
      liters,
      amount: (d.amount as number) ?? 0,
      currency: (d.currency as Currency) ?? "ARS",
      kmPerLiter,
    };
  });

  return mapped.sort(
    (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.km - a.km),
  );
}

function statusFor(nextServiceDate: string): ServiceStatus {
  const today = todayStr();
  if (nextServiceDate < today) return "overdue";
  if (nextServiceDate <= addDays(today, 30)) return "soon";
  return "ok";
}

function mapUpcoming(d: Lean): UpcomingServiceDTO {
  const nextServiceDate = str(d.nextServiceDate);
  return {
    id: str(d._id),
    plate: str(d.plate),
    loadedDate: str(d.loadedDate),
    nextServiceDate,
    description: str(d.description),
    mechanic: str(d.mechanic),
    status: statusFor(nextServiceDate),
  };
}

function mapServiceRecord(d: Lean): ServiceRecordDTO {
  return {
    id: str(d._id),
    plate: str(d.plate),
    date: str(d.date),
    description: str(d.description),
    amount: (d.amount as number) ?? 0,
    currency: (d.currency as Currency) ?? "ARS",
    parts: Array.isArray(d.parts) ? (d.parts as string[]) : [],
  };
}

export async function getAutoOverview(): Promise<AutoOverview> {
  await connectToDatabase();
  const uid = await getActiveProfileKey();

  const [fuelDocs, upcomingDocs, recordDocs] = await Promise.all([
    FuelLog.find({ userId: uid }).lean(),
    UpcomingService.find({ userId: uid }).sort({ nextServiceDate: 1 }).lean(),
    ServiceRecord.find({ userId: uid }).sort({ date: -1 }).lean(),
  ]);

  const fuelLogs = mapFuelLogs(fuelDocs as Lean[]);
  const upcomingServices = upcomingDocs.map((d) => mapUpcoming(d as Lean));
  const serviceRecords = recordDocs.map((d) => mapServiceRecord(d as Lean));

  const plates = [
    ...new Set([
      ...fuelLogs.map((f) => f.plate),
      ...upcomingServices.map((u) => u.plate),
      ...serviceRecords.map((s) => s.plate),
    ]),
  ].sort();

  return { fuelLogs, upcomingServices, serviceRecords, plates };
}
