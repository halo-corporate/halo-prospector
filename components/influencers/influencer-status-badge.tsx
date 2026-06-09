import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  INFLUENCER_STATUS_LABELS,
  type InfluencerStatus,
} from "@/lib/database.types";
import { influencerStatusBadgeClass } from "@/lib/influencers/badge";

interface Props {
  status: InfluencerStatus;
  className?: string;
}

export function InfluencerStatusBadge({ status, className }: Props) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border text-[10px] py-0",
        influencerStatusBadgeClass(status),
        className,
      )}
    >
      {INFLUENCER_STATUS_LABELS[status]}
    </Badge>
  );
}
