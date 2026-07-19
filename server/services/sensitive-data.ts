const SENSITIVE_COLUMN =
  /pass(word)?|secret|token|api.?key|auth|national.?id|ssn|tax.?id|credit.?card|card.?number|cvv|email|phone|mobile|address/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[\d().\s-]{8,20}$/;
const LONG_OPAQUE = /^[A-Za-z0-9_\-/+=]{24,}$/;

function passesLuhn(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index--) {
    let digit = Number(digits[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

export function isLikelySensitive(columnName: string, value: unknown) {
  if (SENSITIVE_COLUMN.test(columnName)) return value != null;
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return (
    EMAIL.test(trimmed) ||
    PHONE.test(trimmed) ||
    passesLuhn(trimmed) ||
    LONG_OPAQUE.test(trimmed)
  );
}

export function sanitizeSampleCell(
  columnName: string,
  value: unknown,
  options: { maskSensitiveData: boolean; maxLength: number },
): unknown {
  if (options.maskSensitiveData && isLikelySensitive(columnName, value))
    return "[MASKED]";
  if (value == null || typeof value === "number" || typeof value === "boolean")
    return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return "[BINARY]";
  const normalized =
    typeof value === "string" ? value : JSON.stringify(value) || String(value);
  return normalized.length > options.maxLength
    ? `${normalized.slice(0, options.maxLength)}…`
    : normalized;
}

export function sanitizeSampleRow(
  row: Record<string, unknown>,
  options: { maskSensitiveData: boolean; maxLength: number },
) {
  return Object.fromEntries(
    Object.entries(row).map(([column, value]) => [
      column,
      sanitizeSampleCell(column, value, options),
    ]),
  );
}
