import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

// Tailwind class merger
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date formatting utilities
export function formatDate(date: string | Date | null | undefined, formatStr: string = 'MMM dd, yyyy'): string {
  if (!date) return 'N/A';
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    return format(dateObj, formatStr);
  } catch {
    return 'Invalid Date';
  }
}

export function formatTime(time: string | null | undefined): string {
  if (!time) return 'N/A';
  try {
    // Handle HH:mm:ss format
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    if (isNaN(hour)) return time;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  } catch {
    return time;
  }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    return format(dateObj, 'MMM dd, yyyy h:mm a');
  } catch {
    return 'Invalid Date';
  }
}

export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    return formatDistanceToNow(dateObj, { addSuffix: true });
  } catch {
    return 'Invalid Date';
  }
}

// Attendance status helpers
export function getAttendanceStatusColor(status: string): string {
  switch (status) {
    case 'present':
      return 'badge-success';
    case 'absent':
      return 'badge-danger';
    case 'late':
      return 'badge-warning';
    case 'excused':
      return 'badge-info';
    default:
      return 'badge-gray';
  }
}

export function getAttendanceStatusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// Session status helpers
export function getSessionStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'badge-success';
    case 'scheduled':
      return 'badge-info';
    case 'completed':
      return 'badge-gray';
    case 'cancelled':
      return 'badge-danger';
    default:
      return 'badge-gray';
  }
}

// Anomaly severity helpers
export function getAnomalySeverityColor(severity: string): string {
  switch (severity) {
    case 'high':
      return 'badge-danger';
    case 'medium':
      return 'badge-warning';
    case 'low':
      return 'badge-info';
    default:
      return 'badge-gray';
  }
}

export function getAnomalyTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    face_mismatch: 'Face Mismatch',
    liveness_failed: 'Liveness Check Failed',
    multiple_attempts: 'Multiple Attempts',
    location_mismatch: 'Location Mismatch',
    time_anomaly: 'Time Anomaly',
    proxy_suspected: 'Proxy Suspected',
  };
  return labels[type] || type;
}

// Percentage formatting
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// Calculate attendance rate
export function calculateAttendanceRate(present: number, total: number): number {
  if (total === 0) return 0;
  return (present / total) * 100;
}

// Validation helpers
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidRollNumber(rollNumber: string): boolean {
  // Adjust this regex based on your roll number format
  const rollRegex = /^[A-Z0-9]{5,15}$/i;
  return rollRegex.test(rollNumber);
}

// Image helpers
export function dataURLtoBlob(dataURL: string): Blob {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Debounce utility
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return function (...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), wait);
  };
}

// Local storage helpers
export function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.error('Failed to save to localStorage');
  }
}

// Error message extraction
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'object' && error !== null) {
    const err = error as { response?: { data?: { message?: string; error?: string } }; message?: string };
    if (err.response?.data?.message) {
      return err.response.data.message;
    }
    if (err.response?.data?.error) {
      return err.response.data.error;
    }
    if (err.message) {
      return err.message;
    }
  }
  
  return 'An unexpected error occurred';
}

// Generate random color for charts
export function generateChartColors(count: number): string[] {
  const colors = [
    '#0ea5e9', // primary
    '#22c55e', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
  ];
  
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(colors[i % colors.length]);
  }
  return result;
}
