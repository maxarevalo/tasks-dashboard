import { Wallet } from "lucide-react";
import { PageHeader, ComingSoon } from "@/components/page-parts";

export default function EstadoContablePage() {
  return (
    <div>
      <PageHeader
        title="Estado contable"
        description="Ingresos, gastos y balance de tus cuentas."
        icon={Wallet}
      />
      <ComingSoon note="Acá vas a ver el detalle de tu estado contable. Lo desarrollamos en el próximo paso." />
    </div>
  );
}
