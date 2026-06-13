type ClassValue = string | number | boolean | null | undefined | ClassValue[] | Record<string, boolean | null | undefined>;

/**
 * Tiny inline classnames utility — replaces the `clsx` dependency.
 * Supports strings, numbers, arrays, and objects with truthy values.
 */
export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (Array.isArray(input)) {
      classes.push(cn(...input));
      continue;
    }

    if (typeof input === 'object') {
      for (const key in input) {
        if (Object.prototype.hasOwnProperty.call(input, key) && input[key]) {
          classes.push(key);
        }
      }
      continue;
    }

    classes.push(String(input));
  }

  return classes.join(' ');
}
