export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const weekday = date.toLocaleDateString("pt-BR", { weekday: "short" });
  const rest = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const days = daysUntil(dateStr);
  const prefix = days === 0 ? "Hoje" : days === 1 ? "Amanhã" : weekday.replace(".", "");
  return `${prefix.charAt(0).toUpperCase() + prefix.slice(1)}, ${rest}`;
}

export function formatTimeLabel(timeStr: string): string {
  return timeStr.slice(0, 5);
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCountryCode = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${withCountryCode}?text=${encodeURIComponent(message)}`;
}

export function planValidityLabel(validUntil: string | null): {
  label: string;
  status: "ok" | "soon" | "expired";
} | null {
  if (!validUntil) return null;
  const days = daysUntil(validUntil);
  if (days < 0) return { label: "Vencida", status: "expired" };
  if (days === 0) return { label: "Vence hoje", status: "soon" };
  if (days <= 7) return { label: `Vence em ${days}d`, status: "soon" };
  return { label: `Válida até ${validUntil.split("-").reverse().join("/")}`, status: "ok" };
}
