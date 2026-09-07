import { ListChecks } from "lucide-react";
import { PageHeader, ComingSoon } from "@/components/page-parts";

export default function TareasPage() {
  return (
    <div>
      <PageHeader
        title="Tareas pendientes"
        description="Lo que tenés que hacer, en un solo lugar."
        icon={ListChecks}
      />
      <ComingSoon note="Acá vas a gestionar tus tareas pendientes. Lo desarrollamos en el próximo paso." />
    </div>
  );
}
