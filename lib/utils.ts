export function formatCents(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function generateUsername(name: string, email: string): string {
  const base =
    name
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 12) ?? email.split("@")[0].replace(/[^a-z0-9]/g, "").slice(0, 12);
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  return `${base}${suffix}`;
}
