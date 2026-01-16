/**
 * Network Verification Service
 * 
 * Verifies if a user is connected to an allowed network by checking their IP address.
 * Uses Convex database for allowed networks configuration.
 * 
 * For demo/MVP purposes, includes mock mode for testing.
 */

// Mock mode configuration
let useMockMode = true;
const VERIFICATION_DELAY = 500;

// Types
export interface NetworkConfig {
  id: string;
  name: string;
  ipRange: string; // CIDR notation
  location: string;
  networkType: 'campus' | 'temporary';
}

export interface NetworkVerificationResult {
  isOnAllowedNetwork: boolean;
  networkId: string | null;
  networkName: string | null;
  location: string | null;
  networkType: 'campus' | 'temporary' | null;
  ipAddress: string;
  message: string;
}

export interface ClientNetworkInfo {
  ipAddress: string;
  isVPN: boolean;
  isMobile: boolean;
  connectionType: string;
}

/**
 * Initialize the network verification service
 */
export async function initializeNetworkVerification(): Promise<{
  success: boolean;
  message: string;
  mode: 'real' | 'mock';
}> {
  await new Promise(resolve => setTimeout(resolve, 200));

  return {
    success: true,
    message: useMockMode
      ? 'Network verification initialized (mock mode)'
      : 'Network verification initialized',
    mode: useMockMode ? 'mock' : 'real',
  };
}

/**
 * Get the client's network information
 * In production, this would call a server endpoint that captures the real IP
 */
export async function getClientNetworkInfo(): Promise<{
  success: boolean;
  info: ClientNetworkInfo | null;
  message: string;
}> {
  await new Promise(resolve => setTimeout(resolve, VERIFICATION_DELAY));

  if (useMockMode) {
    return getMockNetworkInfo();
  }

  // In production, call your backend API to get the client's real IP
  // The server sees the actual IP, not the client
  try {
    // Example: const response = await fetch('/api/network/client-info');
    // For now, return mock data
    return getMockNetworkInfo();
  } catch {
    return {
      success: false,
      info: null,
      message: 'Failed to retrieve network information',
    };
  }
}

/**
 * Generate mock network info
 */
function getMockNetworkInfo(): {
  success: boolean;
  info: ClientNetworkInfo | null;
  message: string;
} {
  // Simulate being on campus network 80% of the time
  const isOnCampus = Math.random() > 0.2;

  const mockIp = isOnCampus
    ? `10.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`
    : `203.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;

  return {
    success: true,
    info: {
      ipAddress: mockIp,
      isVPN: false,
      isMobile: Math.random() > 0.7,
      connectionType: 'wifi',
    },
    message: 'Network info retrieved (mock)',
  };
}

/**
 * Check if an IP address falls within a CIDR range or matches exactly
 */
export function isIpInRange(ip: string, cidr: string): boolean {
  // Handle single IP (no CIDR notation)
  if (!cidr.includes('/')) {
    return ip === cidr;
  }

  const [range, bits] = cidr.split('/');
  const mask = ~(2 ** (32 - parseInt(bits)) - 1);

  const ipNum = ipToNumber(ip);
  const rangeNum = ipToNumber(range);

  return (ipNum & mask) === (rangeNum & mask);
}

/**
 * Convert IP string to number for comparison
 */
function ipToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
}

/**
 * Verify if the client is on an allowed network
 * This version accepts networks from Convex database
 */
export async function verifyNetworkLocation(
  allowedNetworks: NetworkConfig[]
): Promise<NetworkVerificationResult> {
  const networkInfoResult = await getClientNetworkInfo();

  if (!networkInfoResult.success || !networkInfoResult.info) {
    return {
      isOnAllowedNetwork: false,
      networkId: null,
      networkName: null,
      location: null,
      networkType: null,
      ipAddress: 'unknown',
      message: networkInfoResult.message,
    };
  }

  const { ipAddress } = networkInfoResult.info;

  // Check against provided allowed networks
  for (const network of allowedNetworks) {
    if (isIpInRange(ipAddress, network.ipRange)) {
      return {
        isOnAllowedNetwork: true,
        networkId: network.id,
        networkName: network.name,
        location: network.location,
        networkType: network.networkType,
        ipAddress,
        message: `Connected to ${network.name}`,
      };
    }
  }

  return {
    isOnAllowedNetwork: false,
    networkId: null,
    networkName: null,
    location: null,
    networkType: null,
    ipAddress,
    message: 'Not connected to an allowed network',
  };
}

/**
 * Quick check if user is on any allowed network
 */
export async function isOnAllowedNetwork(allowedNetworks: NetworkConfig[]): Promise<boolean> {
  const result = await verifyNetworkLocation(allowedNetworks);
  return result.isOnAllowedNetwork;
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
 * Force a specific mock IP for testing
 */
let forcedMockIp: string | null = null;

export function setForcedMockIp(ip: string | null): void {
  forcedMockIp = ip;
}

export function getForcedMockIp(): string | null {
  return forcedMockIp;
}

// Network verification state for UI
export type NetworkVerificationState = 'idle' | 'checking' | 'verified' | 'failed' | 'not_on_network';

/**
 * Get state class for UI styling
 */
export function getNetworkStateClass(state: NetworkVerificationState): string {
  switch (state) {
    case 'idle':
      return 'bg-gray-100';
    case 'checking':
      return 'bg-blue-100 animate-pulse';
    case 'verified':
      return 'bg-green-100';
    case 'failed':
      return 'bg-red-100';
    case 'not_on_network':
      return 'bg-yellow-100';
    default:
      return 'bg-gray-100';
  }
}

/**
 * Get state icon color for UI
 */
export function getNetworkStateColor(state: NetworkVerificationState): string {
  switch (state) {
    case 'idle':
      return 'text-gray-400';
    case 'checking':
      return 'text-blue-500';
    case 'verified':
      return 'text-green-500';
    case 'failed':
      return 'text-red-500';
    case 'not_on_network':
      return 'text-yellow-500';
    default:
      return 'text-gray-400';
  }
}
