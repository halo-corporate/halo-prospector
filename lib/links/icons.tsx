import {
  BookOpen,
  Calendar,
  Cloud,
  FileText,
  Github,
  Instagram,
  Linkedin,
  Link2,
  Mail,
  MessageCircle,
  MessageSquare,
  Sheet,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import type { LinkTipo } from "@/lib/database.types";

/**
 * Mapa de tipo de link → componente de ícone do lucide-react.
 * Usado em /links pra ilustrar cada card visualmente.
 */
export const LINK_TIPO_ICONS: Record<LinkTipo, LucideIcon> = {
  notion: BookOpen,
  drive: Cloud,
  sheets: Sheet,
  docs: FileText,
  calendar: Calendar,
  slack: MessageCircle,
  whatsapp: MessageSquare,
  youtube: Youtube,
  github: Github,
  email: Mail,
  linkedin: Linkedin,
  instagram: Instagram,
  outro: Link2,
};

export function iconForTipo(tipo: string): LucideIcon {
  if (tipo in LINK_TIPO_ICONS) {
    return LINK_TIPO_ICONS[tipo as LinkTipo];
  }
  return Link2;
}
