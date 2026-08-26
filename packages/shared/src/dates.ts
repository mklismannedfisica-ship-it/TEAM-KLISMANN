export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
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
