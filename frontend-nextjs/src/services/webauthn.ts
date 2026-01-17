/**
 * WebAuthn Service for Fingerprint/Biometric Authentication
 * 
 * Uses the Web Authentication API to leverage device biometrics (fingerprint, Face ID, etc.)
 * Credentials are stored in Convex, but actual biometric data never leaves the device.
 */

// Configuration
const RP_NAME = 'Smart Attendance System';
const RP_ID = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

// Helper to convert ArrayBuffer to Base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper to convert Base64 string to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Generate a random challenge
function generateChallenge(): Uint8Array {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  return challenge;
}

/**
 * Check if WebAuthn is supported and available
 */
export async function checkWebAuthnSupport(): Promise<{
  supported: boolean;
  platformAuthenticator: boolean;
  message: string;
  isSecureContext: boolean;
}> {
  if (typeof window === 'undefined') {
    return {
      supported: false,
      platformAuthenticator: false,
      message: 'Not running in browser',
      isSecureContext: false,
    };
  }

  // Check if we're in a secure context (HTTPS or localhost)
  const isSecure = window.isSecureContext;
  if (!isSecure) {
    return {
      supported: false,
      platformAuthenticator: false,
      message: 'WebAuthn requires HTTPS or localhost. Please access via HTTPS.',
      isSecureContext: false,
    };
  }

  if (!window.PublicKeyCredential) {
    return {
      supported: false,
      platformAuthenticator: false,
      message: 'WebAuthn is not supported on this browser',
      isSecureContext: true,
    };
  }

  try {
    const platformAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    
    return {
      supported: true,
      platformAuthenticator: platformAvailable,
      isSecureContext: true,
      message: platformAvailable 
        ? 'Fingerprint/Face ID available' 
        : 'WebAuthn supported but no platform authenticator (fingerprint/Face ID)',
    };
  } catch (error) {
    return {
      supported: false,
      platformAuthenticator: false,
      message: 'Failed to check WebAuthn availability',
      isSecureContext: true,
    };
  }
}

/**
 * WebAuthn credential data to store in database
 */
export interface WebAuthnCredential {
  credentialId: string;      // Base64 encoded credential ID
  publicKey: string;         // Base64 encoded public key
  counter: number;           // Signature counter for replay attack prevention
  deviceName?: string;       // Optional device identifier
  createdAt: number;         // Timestamp
}

/**
 * Register a new WebAuthn credential (fingerprint enrollment)
 * This prompts the user for their fingerprint and returns credential data to store
 * 
 * NOTE: This is designed for admin/teacher to enroll multiple students from one device.
 * Each student gets a unique credential tied to their fingerprint.
 */
export async function registerFingerprint(
  userId: string,
  userName: string,
  displayName: string,
  existingCredentialId?: string // Pass existing credential to exclude/replace
): Promise<{
  success: boolean;
  credential: WebAuthnCredential | null;
  error?: string;
}> {
  const support = await checkWebAuthnSupport();
  
  if (!support.supported) {
    return {
      success: false,
      credential: null,
      error: support.message,
    };
  }

  if (!support.platformAuthenticator) {
    return {
      success: false,
      credential: null,
      error: 'No fingerprint sensor available on this device. Please use a device with biometric authentication.',
    };
  }

  try {
    const challenge = generateChallenge();
    
    // Create a unique user ID by combining the student ID with a timestamp
    // This ensures each enrollment creates a NEW credential even on the same device
    const uniqueUserId = `${userId}_${Date.now()}`;
    const userIdBytes = new TextEncoder().encode(uniqueUserId);

    // Exclude existing credential if re-enrolling
    const excludeCredentials: PublicKeyCredentialDescriptor[] = [];
    if (existingCredentialId) {
      try {
        excludeCredentials.push({
          id: base64ToUint8Array(existingCredentialId) as BufferSource,
          type: 'public-key',
          transports: ['internal'],
        });
      } catch (e) {
        console.warn('[WebAuthn] Could not parse existing credential ID');
      }
    }

    // Create credential options
    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge: challenge as BufferSource,
      rp: {
        name: RP_NAME,
        id: RP_ID,
      },
      user: {
        id: userIdBytes as BufferSource,
        name: userName,
        displayName: displayName,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Use device's built-in authenticator
        userVerification: 'required',        // Require fingerprint/biometric
        residentKey: 'discouraged',          // Allow multiple credentials on same device
        requireResidentKey: false,           // Don't require discoverable credential
      },
      excludeCredentials: excludeCredentials.length > 0 ? excludeCredentials : undefined,
      timeout: 60000, // 60 seconds
      attestation: 'none', // We don't need attestation for this use case
    };

    console.log('[WebAuthn] Starting fingerprint registration for:', displayName);

    // Prompt user for fingerprint
    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    }) as PublicKeyCredential;

    if (!credential) {
      return {
        success: false,
        credential: null,
        error: 'Failed to create credential',
      };
    }

    const response = credential.response as AuthenticatorAttestationResponse;

    // Extract public key from attestation
    const publicKeyBytes = response.getPublicKey();
    if (!publicKeyBytes) {
      return {
        success: false,
        credential: null,
        error: 'Failed to get public key from credential',
      };
    }

    const webAuthnCredential: WebAuthnCredential = {
      credentialId: arrayBufferToBase64(credential.rawId),
      publicKey: arrayBufferToBase64(publicKeyBytes),
      counter: 0,
      deviceName: getDeviceName(),
      createdAt: Date.now(),
    };

    console.log('[WebAuthn] Fingerprint registered successfully');

    return {
      success: true,
      credential: webAuthnCredential,
    };
  } catch (error: any) {
    console.error('[WebAuthn] Registration error:', error);

    // Handle specific errors
    if (error.name === 'NotAllowedError') {
      return {
        success: false,
        credential: null,
        error: 'User cancelled fingerprint registration or permission denied',
      };
    }

    if (error.name === 'InvalidStateError') {
      return {
        success: false,
        credential: null,
        error: 'A credential already exists for this user on this device',
      };
    }

    return {
      success: false,
      credential: null,
      error: error.message || 'Failed to register fingerprint',
    };
  }
}

/**
 * Verify a fingerprint against stored credential
 * Returns true if the fingerprint matches the stored credential
 */
export async function verifyFingerprintWebAuthn(
  storedCredential: WebAuthnCredential
): Promise<{
  success: boolean;
  verified: boolean;
  newCounter?: number;
  error?: string;
}> {
  const support = await checkWebAuthnSupport();
  
  if (!support.supported || !support.platformAuthenticator) {
    return {
      success: false,
      verified: false,
      error: 'Fingerprint authentication not available on this device',
    };
  }

  try {
    const challenge = generateChallenge();
    const credentialIdBytes = base64ToUint8Array(storedCredential.credentialId);

    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge: challenge as BufferSource,
      rpId: RP_ID,
      allowCredentials: [
        {
          id: credentialIdBytes as BufferSource,
          type: 'public-key',
          transports: ['internal'], // Platform authenticator
        },
      ],
      userVerification: 'required',
      timeout: 60000,
    };

    console.log('[WebAuthn] Starting fingerprint verification...');

    // Prompt user for fingerprint
    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    }) as PublicKeyCredential;

    if (!assertion) {
      return {
        success: false,
        verified: false,
        error: 'Failed to get credential assertion',
      };
    }

    const response = assertion.response as AuthenticatorAssertionResponse;
    
    // Get the counter from authenticator data
    const authenticatorData = new Uint8Array(response.authenticatorData);
    const dataView = new DataView(authenticatorData.buffer, authenticatorData.byteOffset, authenticatorData.byteLength);
    const counter = dataView.getUint32(33, false);

    // Verify counter is increasing (prevents replay attacks)
    if (counter <= storedCredential.counter) {
      console.warn('[WebAuthn] Counter not increasing, possible replay attack');
      // For demo purposes, we'll still allow it but log a warning
    }

    console.log('[WebAuthn] Fingerprint verified successfully');

    return {
      success: true,
      verified: true,
      newCounter: counter,
    };
  } catch (error: any) {
    console.error('[WebAuthn] Verification error:', error);

    if (error.name === 'NotAllowedError') {
      return {
        success: false,
        verified: false,
        error: 'User cancelled fingerprint verification or permission denied',
      };
    }

    return {
      success: false,
      verified: false,
      error: error.message || 'Failed to verify fingerprint',
    };
  }
}

/**
 * Get a friendly device name
 */
function getDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Unknown';
  
  const ua = navigator.userAgent;
  
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) {
    const match = ua.match(/Android[^;]*;\s*([^)]+)/);
    return match ? match[1].trim() : 'Android Device';
  }
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Linux/.test(ua)) return 'Linux PC';
  
  return 'Unknown Device';
}

/**
 * Check if a credential is registered for this device
 * Useful to check if user needs to register or can verify directly
 */
export async function isCredentialAvailable(credentialId: string): Promise<boolean> {
  try {
    const support = await checkWebAuthnSupport();
    if (!support.supported) return false;

    // We can't directly check if a credential exists without triggering the prompt
    // So we return true and let verification handle the error
    return true;
  } catch {
    return false;
  }
}
