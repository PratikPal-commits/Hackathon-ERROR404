/**
 * Geolocation Service (Mock)
 * 
 * Provides geolocation capture and geolock verification for attendance.
 * In a real implementation, this would use the browser's Geolocation API
 * with proper error handling and fallbacks.
 */

// Mock mode configuration
let useMockMode = true;
const MOCK_DELAY = 800;

// Default campus location (can be configured)
const DEFAULT_CAMPUS_LOCATION = {
  latitude: 28.6139,  // Example: Delhi
  longitude: 77.2090,
  name: 'Main Campus',
};

// Types
export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface GeolockConfig {
  targetLatitude: number;
  targetLongitude: number;
  allowedRadiusMeters: number;
  locationName?: string;
}

export interface GeolockResult {
  withinRange: boolean;
  distanceMeters: number;
  message: string;
  accuracy: number;
}

/**
 * Initialize the geolocation service
 */
export async function initializeGeolocation(): Promise<{
  success: boolean;
  message: string;
  mode: 'real' | 'mock';
}> {
  // Simulate initialization delay
  await new Promise(resolve => setTimeout(resolve, 300));

  // Check if real geolocation is available
  if (typeof window !== 'undefined' && 'geolocation' in navigator && !useMockMode) {
    return {
      success: true,
      message: 'Geolocation service initialized',
      mode: 'real',
    };
  }

  return {
    success: true,
    message: 'Geolocation service initialized (mock mode)',
    mode: 'mock',
  };
}

/**
 * Check if geolocation is available
 */
export async function checkGeolocationAvailability(): Promise<{
  available: boolean;
  type: 'real' | 'mock';
  permissionStatus?: PermissionState;
}> {
  if (typeof window === 'undefined') {
    return { available: true, type: 'mock' };
  }

  if (!('geolocation' in navigator) || useMockMode) {
    return { available: true, type: 'mock' };
  }

  // Check permission status if available
  try {
    if ('permissions' in navigator) {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return {
        available: permission.state !== 'denied',
        type: 'real',
        permissionStatus: permission.state,
      };
    }
  } catch {
    // Permissions API not supported
  }

  return { available: true, type: 'real' };
}

/**
 * Get the current location
 * In mock mode, returns a simulated location near the campus
 */
export async function getCurrentLocation(): Promise<{
  success: boolean;
  location: GeoLocation | null;
  message: string;
}> {
  // Simulate delay
  await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));

  if (useMockMode) {
    return getMockLocation();
  }

  // Real geolocation
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      resolve({
        success: false,
        location: null,
        message: 'Geolocation not available',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          success: true,
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          },
          message: 'Location captured successfully',
        });
      },
      (error) => {
        let message = 'Failed to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location unavailable';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out';
            break;
        }
        resolve({
          success: false,
          location: null,
          message,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}

/**
 * Generate a mock location near the default campus
 */
function getMockLocation(): {
  success: boolean;
  location: GeoLocation | null;
  message: string;
} {
  // Simulate occasional failures (5% chance)
  if (Math.random() < 0.05) {
    return {
      success: false,
      location: null,
      message: 'Mock: Unable to determine location',
    };
  }

  // Add small random offset to simulate real GPS variance
  // Offset within ~100 meters
  const latOffset = (Math.random() - 0.5) * 0.002;
  const lonOffset = (Math.random() - 0.5) * 0.002;

  return {
    success: true,
    location: {
      latitude: DEFAULT_CAMPUS_LOCATION.latitude + latOffset,
      longitude: DEFAULT_CAMPUS_LOCATION.longitude + lonOffset,
      accuracy: 10 + Math.random() * 40, // 10-50 meters accuracy
      timestamp: Date.now(),
    },
    message: 'Location captured successfully (mock)',
  };
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Verify if a location is within the allowed geolock radius
 */
export function verifyGeolock(
  currentLocation: GeoLocation,
  config: GeolockConfig
): GeolockResult {
  const distance = calculateDistance(
    currentLocation.latitude,
    currentLocation.longitude,
    config.targetLatitude,
    config.targetLongitude
  );

  const withinRange = distance <= config.allowedRadiusMeters;
  const locationName = config.locationName || 'target location';

  return {
    withinRange,
    distanceMeters: Math.round(distance),
    accuracy: currentLocation.accuracy,
    message: withinRange
      ? `Location verified: within ${config.allowedRadiusMeters}m of ${locationName}`
      : `Location mismatch: ${Math.round(distance)}m away from ${locationName} (allowed: ${config.allowedRadiusMeters}m)`,
  };
}

/**
 * Combined function to get location and verify geolock in one call
 */
export async function checkGeolock(config: GeolockConfig): Promise<{
  success: boolean;
  result: GeolockResult | null;
  location: GeoLocation | null;
  message: string;
}> {
  const locationResult = await getCurrentLocation();

  if (!locationResult.success || !locationResult.location) {
    return {
      success: false,
      result: null,
      location: null,
      message: locationResult.message,
    };
  }

  const geolockResult = verifyGeolock(locationResult.location, config);

  return {
    success: true,
    result: geolockResult,
    location: locationResult.location,
    message: geolockResult.message,
  };
}

/**
 * Set mock mode (for testing)
 */
export function setMockMode(enabled: boolean): void {
  useMockMode = enabled;
}

/**
 * Get mock mode status
 */
export function isMockMode(): boolean {
  return useMockMode;
}

/**
 * Get the default campus location
 */
export function getDefaultCampusLocation(): GeolockConfig {
  return {
    targetLatitude: DEFAULT_CAMPUS_LOCATION.latitude,
    targetLongitude: DEFAULT_CAMPUS_LOCATION.longitude,
    allowedRadiusMeters: 200, // 200 meter default radius
    locationName: DEFAULT_CAMPUS_LOCATION.name,
  };
}

/**
 * Create a geolock configuration for a specific location
 */
export function createGeolockConfig(
  latitude: number,
  longitude: number,
  radiusMeters: number = 100,
  locationName?: string
): GeolockConfig {
  return {
    targetLatitude: latitude,
    targetLongitude: longitude,
    allowedRadiusMeters: radiusMeters,
    locationName,
  };
}

// Geolocation state for UI
export type GeolocationState = 'idle' | 'locating' | 'success' | 'error' | 'out_of_range';

/**
 * Get state class for UI styling
 */
export function getGeolocationStateClass(state: GeolocationState): string {
  switch (state) {
    case 'idle':
      return 'bg-gray-100';
    case 'locating':
      return 'bg-blue-100 animate-pulse';
    case 'success':
      return 'bg-green-100';
    case 'error':
      return 'bg-red-100';
    case 'out_of_range':
      return 'bg-yellow-100';
    default:
      return 'bg-gray-100';
  }
}
