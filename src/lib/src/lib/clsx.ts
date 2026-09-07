export type ClassValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | ClassValue[];

export function clsx(...inputs: ClassValue[]): string {
  const result: string[] = [];

  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === "string" || typeof input === "number") {
      result.push(String(input));
    } else if (Array.isArray(input)) {
      const nested = clsx(...input);
      if (nested) result.push(nested);
    }
  }

  return result.join(" ");
}
