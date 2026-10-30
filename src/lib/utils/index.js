import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines class names with Tailwind CSS class merging
 * @param {...import('clsx').ClassValue} inputs - Class names to combine (strings, objects, arrays, falsy values)
 * @returns {string} Merged class names
 */
export function cn(...inputs) {
	return twMerge(clsx(inputs));
}
