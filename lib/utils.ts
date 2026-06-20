import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to combine classnames using clsx + tailwind-merge.
 * Resolves Tailwind conflicts intelligently.
 * 
 * @param inputs - Class values to merge
 * @returns Merged classname string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
