import type { Currency } from "@/lib/money";
import type { DateStr } from "@/lib/pf";

export type { Currency, DateStr };

export type ActionResult = { ok: true } | { ok: false; error: string };

export type FuelLogDTO = {
  id: string;
  plate: string;
  date: DateStr;
  km: number;
  liters: number;
  amount: number;
  currency: Currency;
  /** Calculado: km recorridos / litros cargados desde la carga anterior de la misma patente (null si es la primera). */
  kmPerLiter: number | null;
};

export type ServiceStatus = "overdue" | "soon" | "ok";

export type UpcomingServiceDTO = {
  id: string;
  plate: string;
  loadedDate: DateStr;
  nextServiceDate: DateStr;
  description: string;
  mechanic: string;
  /** Calculado a partir de nextServiceDate vs. hoy. */
  status: ServiceStatus;
};

export type ServiceRecordDTO = {
  id: string;
  plate: string;
  date: DateStr;
  description: string;
  amount: number;
  currency: Currency;
  parts: string[];
};

export type AutoOverview = {
  fuelLogs: FuelLogDTO[];
  upcomingServices: UpcomingServiceDTO[];
  serviceRecords: ServiceRecordDTO[];
  /** Patentes ya usadas en cualquiera de los tres registros, para sugerir en los formularios. */
  plates: string[];
};
