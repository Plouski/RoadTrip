import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function formatDateFR(iso: string, isMobile: boolean) {
  try {
    const d = new Date(iso);
    return format(d, isMobile ? "d MMM à HH:mm" : "d MMMM yyyy à HH:mm", {
      locale: fr,
    });
  } catch {
    return "Date inconnue";
  }
}