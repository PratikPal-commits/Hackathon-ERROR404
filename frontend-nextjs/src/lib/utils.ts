import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInMs = date.getTime() - now.getTime();
  const diffInHours = Math.floor(Math.abs(diffInMs) / (1000 * 60 * 60));
  const diffInDays = Math.floor(Math.abs(diffInMs) / (1000 * 60 * 60 * 24));

  if (diffInMs > 0) {
    // Future date
    if (diffInHours < 24) {
      return `in ${diffInHours} hour${diffInHours !== 1 ? 's' : ''}`;
    } else {
      return `in ${diffInDays} day${diffInDays !== 1 ? 's' : ''}`;
    }
  } else {
    // Past date
    if (diffInHours < 24) {
      return `${Math.abs(diffInHours)} hour${Math.abs(diffInHours) !== 1 ? 's' : ''} ago`;
    } else {
      return `${Math.abs(diffInDays)} day${Math.abs(diffInDays) !== 1 ? 's' : ''} ago`;
    }
  }
}
