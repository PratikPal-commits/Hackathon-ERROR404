/**
 * Face Recognition Service
 * 
 * Provides face detection and recognition using face-api.js with fallback to mock mode.
 * In mock mode, simulates face recognition for demo purposes.
 */

// Global state
let isInitialized = false;
let useMockMode = false;
let faceapi: any = null;

// Model URLs (these would be loaded from public folder)
const MODEL_URL = '/models';

/**
 * Initialize face-api.js models
 */
export async function initializeFaceAPI(): Promise<boolean> {
  if (isInitialized) return true;
  
  try {
    // Dynamically import face-api.js
    const faceapiModule = await import('face-api.js');
    faceapi = faceapiModule;
    
    // Load models
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    
    isInitialized = true;
    useMockMode = false;
    console.log('[FaceService] Face API initialized successfully');
    return true;
  } catch (error) {
    console.warn('[FaceService] Failed to load face-api.js, using mock mode:', error);
    useMockMode = true;
    isInitialized = true;
    return true;
  }
}

/**
 * Detect faces in an image
 * @param imageElement - HTML Image, Video, or Canvas element
 * @returns Detection results with face locations and confidence
 */
export async function detectFaces(imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): Promise<{
  detected: boolean;
  count: number;
  faces: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>;
}> {
  if (!isInitialized) {
    await initializeFaceAPI();
  }

  if (useMockMode) {
    // Mock face detection - simulate finding a face
    return {
      detected: true,
      count: 1,
      faces: [{
        x: 100,
        y: 80,
        width: 150,
        height: 200,
        confidence: 0.95,
      }],
    };
  }

  try {
    const detections = await faceapi
      .detectAllFaces(imageElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();

    return {
      detected: detections.length > 0,
      count: detections.length,
      faces: detections.map((d: any) => ({
        x: d.detection.box.x,
        y: d.detection.box.y,
        width: d.detection.box.width,
        height: d.detection.box.height,
        confidence: d.detection.score,
      })),
    };
  } catch (error) {
    console.error('[FaceService] Error detecting faces:', error);
    return { detected: false, count: 0, faces: [] };
  }
}

/**
 * Extract face embedding (128-dimensional vector) from an image
 * @param imageElement - HTML Image, Video, or Canvas element
 * @returns Face embedding array or null if no face detected
 */
export async function extractFaceEmbedding(imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): Promise<number[] | null> {
  if (!isInitialized) {
    await initializeFaceAPI();
  }

  if (useMockMode) {
    // Return mock embedding (128-dimensional vector)
    return Array(128).fill(0).map(() => Math.random() * 2 - 1);
  }

  try {
    const detection = await faceapi
      .detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return null;
    }

    return Array.from(detection.descriptor);
  } catch (error) {
    console.error('[FaceService] Error extracting embedding:', error);
    return null;
  }
}

/**
 * Compare two face embeddings and return similarity score
 * @param embedding1 - First face embedding
 * @param embedding2 - Second face embedding
 * @returns Similarity score (0-100, higher is more similar)
 */
export function compareFaceEmbeddings(embedding1: number[], embedding2: number[]): number {
  if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
    return 0;
  }

  // Calculate Euclidean distance
  let distance = 0;
  for (let i = 0; i < embedding1.length; i++) {
    distance += Math.pow(embedding1[i] - embedding2[i], 2);
  }
  distance = Math.sqrt(distance);

  // Convert distance to similarity percentage
  // Typical distance for same person: 0.0 - 0.6
  // Typical distance for different person: 0.6 - 1.5
  // We use 0.6 as threshold and convert to 0-100 scale
  const maxDistance = 1.5;
  const similarity = Math.max(0, (1 - distance / maxDistance)) * 100;

  return Math.round(similarity);
}

/**
 * Verify if a captured face matches a stored embedding
 * @param capturedEmbedding - Embedding from live capture
 * @param storedEmbedding - Stored reference embedding
 * @param threshold - Minimum similarity required (default 70)
 * @returns Match result with confidence
 */
export function verifyFace(
  capturedEmbedding: number[],
  storedEmbedding: number[],
  threshold: number = 70
): {
  match: boolean;
  confidence: number;
  message: string;
} {
  const confidence = compareFaceEmbeddings(capturedEmbedding, storedEmbedding);

  if (confidence >= threshold) {
    return {
      match: true,
      confidence,
      message: 'Face verified successfully',
    };
  } else if (confidence >= 50) {
    return {
      match: false,
      confidence,
      message: 'Face partially matches but confidence too low. Please try again.',
    };
  } else {
    return {
      match: false,
      confidence,
      message: 'Face does not match. Please ensure good lighting and face the camera directly.',
    };
  }
}

/**
 * Capture frame from video element as image data
 * @param videoElement - Video element to capture from
 * @returns Base64 image data URL
 */
export function captureFrame(videoElement: HTMLVideoElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  ctx.drawImage(videoElement, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.8);
}

/**
 * Check if camera is available
 */
export async function checkCameraAvailability(): Promise<boolean> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some(device => device.kind === 'videoinput');
  } catch {
    return false;
  }
}

/**
 * Mock face verification for demo mode
 * Simulates face verification with configurable success rate
 */
export function mockVerifyFace(studentRollNo: string): {
  match: boolean;
  confidence: number;
  message: string;
} {
  // Simulate processing time variability
  const confidence = 75 + Math.random() * 25; // 75-100%
  
  // For demo, always match unless roll number ends with 'X' (for testing failures)
  const shouldFail = studentRollNo.toUpperCase().endsWith('X');
  
  if (shouldFail) {
    return {
      match: false,
      confidence: 30 + Math.random() * 30, // 30-60%
      message: 'Face verification failed. Please try again.',
    };
  }
  
  return {
    match: true,
    confidence: Math.round(confidence),
    message: 'Face verified successfully',
  };
}

/**
 * Perform liveness detection (basic version)
 * Checks for movement/blinking to prevent photo attacks
 */
export async function performLivenessCheck(
  videoElement: HTMLVideoElement,
  durationMs: number = 3000
): Promise<{
  passed: boolean;
  message: string;
}> {
  if (useMockMode) {
    // Simulate liveness check
    await new Promise(resolve => setTimeout(resolve, durationMs));
    return {
      passed: true,
      message: 'Liveness check passed',
    };
  }

  return new Promise(async (resolve) => {
    let frameCount = 0;
    let lastEmbedding: number[] | null = null;
    let movementDetected = false;

    const checkInterval = setInterval(async () => {
      frameCount++;
      
      const currentEmbedding = await extractFaceEmbedding(videoElement);
      
      if (currentEmbedding && lastEmbedding) {
        const similarity = compareFaceEmbeddings(currentEmbedding, lastEmbedding);
        // If similarity drops significantly, movement detected
        if (similarity < 95) {
          movementDetected = true;
        }
      }
      
      lastEmbedding = currentEmbedding;
    }, 500);

    setTimeout(() => {
      clearInterval(checkInterval);
      
      if (frameCount < 3) {
        resolve({
          passed: false,
          message: 'Could not capture enough frames. Please stay in frame.',
        });
      } else if (!movementDetected) {
        resolve({
          passed: false,
          message: 'No movement detected. Please blink or move slightly.',
        });
      } else {
        resolve({
          passed: true,
          message: 'Liveness check passed',
        });
      }
    }, durationMs);
  });
}

// Export type for face embedding
export type FaceEmbedding = number[];

// Export status
export function getServiceStatus(): {
  initialized: boolean;
  mockMode: boolean;
} {
  return {
    initialized: isInitialized,
    mockMode: useMockMode,
  };
}

// Force mock mode (for testing)
export function setMockMode(enabled: boolean): void {
  useMockMode = enabled;
  if (enabled) {
    isInitialized = true;
  }
}
