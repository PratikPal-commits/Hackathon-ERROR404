/**
 * Fingerprint Service (Simulated)
 * 
 * Simulates fingerprint scanning for demo purposes.
 * In a real implementation, this would integrate with hardware like:
 * - Digital Persona fingerprint scanners
 * - SecuGen devices
 * - WebAuthn for device biometrics
 */

// Simulated fingerprint database (in-memory for demo)
const fingerprintDatabase: Map<string, string> = new Map();

// Simulated scan delay (ms)
const SCAN_DELAY = 1500;

// Generate a simulated fingerprint hash
function generateFingerprintHash(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let hash = 'FP_';
  for (let i = 0; i < 32; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return hash;
}

/**
 * Initialize fingerprint scanner
 * In real implementation, this would connect to hardware
 */
export async function initializeFingerprintScanner(): Promise<{
  success: boolean;
  message: string;
}> {
  // Simulate initialization delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    success: true,
    message: 'Fingerprint scanner initialized (simulated mode)',
  };
}

/**
 * Check if fingerprint scanner is available
 */
export async function checkScannerAvailability(): Promise<{
  available: boolean;
  type: 'hardware' | 'simulated' | 'webauthn';
}> {
  // Check if WebAuthn is available for device biometrics
  if (typeof window !== 'undefined' && window.PublicKeyCredential) {
    const webauthnAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (webauthnAvailable) {
      return { available: true, type: 'webauthn' };
    }
  }
  
  // Fall back to simulated mode
  return { available: true, type: 'simulated' };
}

/**
 * Capture fingerprint
 * Returns a fingerprint hash that can be stored/compared
 */
export async function captureFingerprint(): Promise<{
  success: boolean;
  hash: string | null;
  message: string;
  quality: number;
}> {
  // Simulate scanning delay
  await new Promise(resolve => setTimeout(resolve, SCAN_DELAY));
  
  // Simulate occasional scan failures (10% chance)
  if (Math.random() < 0.1) {
    return {
      success: false,
      hash: null,
      message: 'Poor quality scan. Please place finger firmly on the scanner.',
      quality: 30,
    };
  }
  
  const hash = generateFingerprintHash();
  const quality = 75 + Math.floor(Math.random() * 25); // 75-100
  
  return {
    success: true,
    hash,
    message: 'Fingerprint captured successfully',
    quality,
  };
}

/**
 * Enroll a fingerprint for a student
 * Captures multiple samples for better accuracy
 */
export async function enrollFingerprint(
  studentId: string,
  onProgress?: (step: number, total: number) => void
): Promise<{
  success: boolean;
  hash: string | null;
  message: string;
}> {
  const samples: string[] = [];
  const totalSamples = 3;
  
  for (let i = 0; i < totalSamples; i++) {
    onProgress?.(i + 1, totalSamples);
    
    const result = await captureFingerprint();
    
    if (!result.success) {
      return {
        success: false,
        hash: null,
        message: `Failed on sample ${i + 1}: ${result.message}`,
      };
    }
    
    samples.push(result.hash!);
    
    // Wait between samples
    if (i < totalSamples - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // In real implementation, we'd combine/average the samples
  // For simulation, just use the last one
  const finalHash = samples[samples.length - 1];
  
  // Store in simulated database
  fingerprintDatabase.set(studentId, finalHash);
  
  return {
    success: true,
    hash: finalHash,
    message: 'Fingerprint enrolled successfully',
  };
}

/**
 * Verify a fingerprint against stored data
 */
export async function verifyFingerprint(
  storedHash: string,
  onScanStart?: () => void,
  onScanComplete?: () => void
): Promise<{
  success: boolean;
  match: boolean;
  confidence: number;
  message: string;
}> {
  onScanStart?.();
  
  // Simulate scanning
  const captureResult = await captureFingerprint();
  
  onScanComplete?.();
  
  if (!captureResult.success) {
    return {
      success: false,
      match: false,
      confidence: 0,
      message: captureResult.message,
    };
  }
  
  // Simulate verification
  // In demo mode, we'll check if the hash format is valid
  const isValidFormat = storedHash.startsWith('FP_') && storedHash.length >= 10;
  
  // For demo, match with high probability if format is valid
  const shouldMatch = isValidFormat && Math.random() > 0.05; // 95% match rate
  
  if (shouldMatch) {
    return {
      success: true,
      match: true,
      confidence: 90 + Math.floor(Math.random() * 10), // 90-99%
      message: 'Fingerprint verified successfully',
    };
  } else {
    return {
      success: true,
      match: false,
      confidence: 20 + Math.floor(Math.random() * 30), // 20-50%
      message: 'Fingerprint does not match. Please try again.',
    };
  }
}

/**
 * Find a student by fingerprint
 * Searches through all enrolled fingerprints
 */
export async function identifyByFingerprint(
  enrolledFingerprints: Array<{ studentId: string; hash: string }>,
  onScanStart?: () => void,
  onScanComplete?: () => void
): Promise<{
  success: boolean;
  studentId: string | null;
  confidence: number;
  message: string;
}> {
  onScanStart?.();
  
  // Simulate scanning
  await new Promise(resolve => setTimeout(resolve, SCAN_DELAY));
  
  onScanComplete?.();
  
  if (enrolledFingerprints.length === 0) {
    return {
      success: false,
      studentId: null,
      confidence: 0,
      message: 'No enrolled fingerprints to match against',
    };
  }
  
  // Simulate occasional scan failure
  if (Math.random() < 0.1) {
    return {
      success: false,
      studentId: null,
      confidence: 0,
      message: 'Could not read fingerprint. Please try again.',
    };
  }
  
  // For demo, randomly select a student from the enrolled list
  const randomIndex = Math.floor(Math.random() * enrolledFingerprints.length);
  const matched = enrolledFingerprints[randomIndex];
  
  return {
    success: true,
    studentId: matched.studentId,
    confidence: 85 + Math.floor(Math.random() * 15), // 85-100%
    message: 'Fingerprint identified successfully',
  };
}

/**
 * Simulate WebAuthn fingerprint authentication
 */
export async function authenticateWithWebAuthn(): Promise<{
  success: boolean;
  credentialId: string | null;
  message: string;
}> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return {
      success: false,
      credentialId: null,
      message: 'WebAuthn not supported on this device',
    };
  }
  
  try {
    // Check if platform authenticator is available
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    
    if (!available) {
      return {
        success: false,
        credentialId: null,
        message: 'No biometric authenticator available on this device',
      };
    }
    
    // For demo, simulate success
    // In production, you'd use navigator.credentials.get()
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      credentialId: `webauthn_${Date.now()}`,
      message: 'Biometric authentication successful',
    };
  } catch (error) {
    return {
      success: false,
      credentialId: null,
      message: 'Biometric authentication failed',
    };
  }
}

// Animation/UI helper states
export type ScannerState = 'idle' | 'scanning' | 'success' | 'error';

/**
 * Get scanner state for UI animations
 */
export function getScannerStateClass(state: ScannerState): string {
  switch (state) {
    case 'idle':
      return 'bg-gray-100';
    case 'scanning':
      return 'bg-blue-100 animate-pulse';
    case 'success':
      return 'bg-green-100';
    case 'error':
      return 'bg-red-100';
    default:
      return 'bg-gray-100';
  }
}

// Export types
export type FingerprintHash = string;

export interface FingerprintEnrollment {
  studentId: string;
  hash: FingerprintHash;
  enrolledAt: number;
}
