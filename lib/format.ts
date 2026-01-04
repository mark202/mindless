export function formatCurrency(value: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-GB').format(value);
}

export function formatDateTime(
  value: string | number | Date,
  timezone = 'Europe/London',
  locale = 'en-GB',
  options: Intl.DateTimeFormatOptions = {}
): string {
  try {
    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      hour12: false,
      ...options,
      year: options.year ?? 'numeric',
      month: options.month ?? 'short',
      day: options.day ?? '2-digit',
      hour: options.hour ?? '2-digit',
      minute: options.minute ?? '2-digit'
    }).format(date);
  } catch (error) {
    return '';
  }
}
