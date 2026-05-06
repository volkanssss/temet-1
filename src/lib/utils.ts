import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(value);
}

/**
 * Yüzde değeri formatlar.
 * value: 0-100 arasında bir sayı (örn: 15.5 → "%15,50")
 * % işareti dahil döndürür — JSX'te başına tekrar % koymayın!
 */
export function formatPercentage(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + '%';
}

/**
 * Sayıyı adet olarak formatlar (hisse sayısı gibi)
 */
export function formatCount(value: number, unit = 'hisse') {
  return `${Math.round(value)} ${unit}`;
}
