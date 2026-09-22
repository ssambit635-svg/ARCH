/**
 * FormData → plain object for Zod parsing.
 *
 * HTML forms send "" for untouched optional fields; Zod's `.optional()` expects `undefined`.
 * Repeated field names (checkbox groups) become arrays, which is what `serviceIds` wants.
 */
export function toFormObject(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of new Set(formData.keys())) {
    if (key.startsWith('$ACTION')) continue;
    const values = formData
      .getAll(key)
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim());

    if (values.length === 0) continue;
    if (values.length === 1) {
      result[key] = values[0] === '' ? undefined : values[0];
      continue;
    }
    result[key] = values.filter((value) => value !== '');
  }

  return result;
}
