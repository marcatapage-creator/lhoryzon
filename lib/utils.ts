import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAmount(value: number, locale: string = 'fr', options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    maximumFractionDigits: 4,
    ...options,
  }).format(value)
}

export function formatCurrency(value: number, currency: string = 'eur', locale: string = 'fr', options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 4,
    ...options,
  }).format(value)
}

export function formatDashboardAmount(value: number, locale: string = 'fr', options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    ...options,
  }).format(value)
}

export function formatDashboardCurrency(value: number, currency: string = 'eur', locale: string = 'fr', options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    ...options,
  }).format(value)
}

export function formatCompactNumber(number: number, locale: string = 'fr') {
  return new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 2,
  }).format(number)
}
