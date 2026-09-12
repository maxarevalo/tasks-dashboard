import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/page-parts";
import { MonthNav } from "@/components/month-nav";
import { normalizePeriod } from "@/lib/period";
import {
  getMonthlyComparison,
  getSpendingTrend,
} from "@/features/gastos/queries";
import { ComparisonSection } from "./_components/comparison-section";
import { TrendChart } from "./_components/trend-chart";

export const dynamic = "force-dynamic";

const TREND_MONTHS = 6;

export default async function EstadisticasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const period = normalizePeriod(mes);

  const [comparison, trend] = await Promise.all([
    getMonthlyComparison(period),
    getSpendingTrend(period, TREND_MONTHS),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estadísticas"
        description="Análisis de tus gastos: comparación mes a mes y evolución."
        icon={BarChart3}
      />

      <MonthNav period={period} basePath="/personal/estadisticas" />

      <TrendChart trend={trend} />

      <ComparisonSection
        title="Gastos mensuales por categoría"
        rows={comparison.byCategory}
      />
      <ComparisonSection
        title="Gastos mensuales por tarjeta"
        rows={comparison.byCard}
      />
      <ComparisonSection
        title="Gastos mensuales por etiqueta"
        rows={comparison.byTag}
      />
    </div>
  );
}
