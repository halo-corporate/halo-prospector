import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ENVIO_STATUS_LABELS, type EnvioStatus } from "@/lib/database.types";
import { envioStatusBadgeClass } from "@/lib/envios/badge";

interface Props {
  status: EnvioStatus;
  className?: string;
}

export function EnvioStatusBadge({ status, className }: Props) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border text-[10px] py-0",
        envioStatusBadgeClass(status),
        className,
      )}
    >
      {ENVIO_STATUS_LABELS[status]}
    </Badge>
  );
}
