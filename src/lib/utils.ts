import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

/**
 * 10.0833 -> 10′1″. Lived in canvas/page.tsx, while TopView printed the raw
 * float straight into its header, so the same room read as 10′1″ in one place
 * and 10.083333333333334′ two lines below it.
 */
export function feet(v: number): string {
  const whole = Math.floor(v);
  const inches = Math.round((v - whole) * 12);
  if (inches === 0) return `${whole}′`;
  if (inches === 12) return `${whole + 1}′`;
  return `${whole}′${inches}″`;
}
