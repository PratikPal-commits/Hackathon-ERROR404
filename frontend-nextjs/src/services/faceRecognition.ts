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

// Error types for better error handling
export enum FaceErrorType {
  NO_FACE = 'NO_FACE',
  MULTIPLE_FACES = 'MULTIPLE_FACES',
  POOR_LIGHTING = 'POOR_LIGHTING',
  FACE_TOO_SMALL = 'FACE_TOO_SMALL',
  FACE_NOT_CENTERED = 'FACE_NOT_CENTERED',
  CAMERA_NOT_READY = 'CAMERA_NOT_READY',
  CAMERA_NOT_AVAILABLE = 'CAMERA_NOT_AVAILABLE',
  MODEL_NOT_LOADED = 'MODEL_NOT_LOADED',
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',
  UNKNOWN = 'UNKNOWN',
}

export interface FaceError {
  type: FaceErrorType;
  message: string;
  suggestion: string;
}

// Error messages with helpful suggestions
const ERROR_MESSAGES: Record<FaceErrorType, { message: string; suggestion: string }> = {
  [FaceErrorType.NO_FACE]: {
    message: 'No face detected',
    suggestion: 'Please position your face within the circle and ensure good lighting.',
  },
  [FaceErrorType.MULTIPLE_FACES]: {
    message: 'Multiple faces detected',
    suggestion: 'Only one person should be in the frame. Please ensure no one else is visible.',
  },
  [FaceErrorType.POOR_LIGHTING]: {
    message: 'Poor lighting conditions',
    suggestion: 'Move to a well-lit area or turn on more lights. Avoid backlighting.',
  },
  [FaceErrorType.FACE_TOO_SMALL]: {
    message: 'Face is too far from camera',
    suggestion: 'Move closer to the camera so your face fills the circle.',
  },
  [FaceErrorType.FACE_NOT_CENTERED]: {
    message: 'Face is not centered',
    suggestion: 'Position your face in the center of the circle.',
  },
  [FaceErrorType.CAMERA_NOT_READY]: {
    message: 'Camera is not ready',
    suggestion: 'Please wait a moment for the camera to initialize.',
  },
  [FaceErrorType.CAMERA_NOT_AVAILABLE]: {
    message: 'Camera not available',
    suggestion: 'Please ensure your camera is connected and you have granted permission.',
  },
  [FaceErrorType.MODEL_NOT_LOADED]: {
    message: 'Face recognition models not loaded',
    suggestion: 'Please wait for the models to load or refresh the page.',
  },
  [FaceErrorType.EXTRACTION_FAILED]: {
    message: 'Failed to extract face data',
    suggestion: 'Please try again. Ensure your face is clearly visible and well-lit.',
  },
  [FaceErrorType.UNKNOWN]: {
    message: 'An unknown error occurred',
    suggestion: 'Please try again or refresh the page.',
  },
};

/**
 * Create a FaceError object
 */
export function createFaceError(type: FaceErrorType): FaceError {
  const info = ERROR_MESSAGES[type];
  return {
    type,
    message: info.message,
    suggestion: info.suggestion,
  };
}

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
 * Check if video element is ready for processing
 */
function isVideoReady(video: HTMLVideoElement): boolean {
  return video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0;
}

/**
 * Detection result with detailed status
 */
export interface FaceDetectionResult {
  detected: boolean;
  count: number;
  faces: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>;
  error?: FaceError;
  quality?: {
    isCentered: boolean;
    isSufficientSize: boolean;
    hasGoodConfidence: boolean;
  };
}

/**
 * Detect faces in an image
 * @param imageElement - HTML Image, Video, or Canvas element
 * @param options - Detection options
 * @returns Detection results with face locations and confidence
 */
export async function detectFaces(
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  options?: {
    minFaceSize?: number; // Minimum face size as percentage of frame (default: 10%)
    requireCentered?: boolean; // Whether face must be centered (default: false)
  }
): Promise<FaceDetectionResult> {
  const minFaceSize = options?.minFaceSize ?? 10;
  const requireCentered = options?.requireCentered ?? false;

  if (!isInitialized) {
    await initializeFaceAPI();
  }

  // Check if video is ready
  if (imageElement instanceof HTMLVideoElement) {
    if (!isVideoReady(imageElement)) {
      return { 
        detected: false, 
        count: 0, 
        faces: [],
        error: createFaceError(FaceErrorType.CAMERA_NOT_READY),
      };
    }
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
      quality: {
        isCentered: true,
        isSufficientSize: true,
        hasGoodConfidence: true,
      },
    };
  }

  try {
    const detections = await faceapi
      .detectAllFaces(imageElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();

    if (detections.length === 0) {
      return {
        detected: false,
        count: 0,
        faces: [],
        error: createFaceError(FaceErrorType.NO_FACE),
      };
    }

    if (detections.length > 1) {
      return {
        detected: true,
        count: detections.length,
        faces: detections.map((d: any) => ({
          x: d.detection.box.x,
          y: d.detection.box.y,
          width: d.detection.box.width,
          height: d.detection.box.height,
          confidence: d.detection.score,
        })),
        error: createFaceError(FaceErrorType.MULTIPLE_FACES),
      };
    }

    // Check face quality
    const detection = detections[0];
    const box = detection.detection.box;
    const frameWidth = imageElement instanceof HTMLVideoElement ? imageElement.videoWidth : imageElement.width;
    const frameHeight = imageElement instanceof HTMLVideoElement ? imageElement.videoHeight : imageElement.height;

    // Check face size (as percentage of frame)
    const faceArea = (box.width * box.height) / (frameWidth * frameHeight) * 100;
    const isSufficientSize = faceArea >= minFaceSize;

    // Check if centered (face center within 30% of frame center)
    const faceCenterX = box.x + box.width / 2;
    const faceCenterY = box.y + box.height / 2;
    const frameCenterX = frameWidth / 2;
    const frameCenterY = frameHeight / 2;
    const toleranceX = frameWidth * 0.3;
    const toleranceY = frameHeight * 0.3;
    const isCentered = 
      Math.abs(faceCenterX - frameCenterX) < toleranceX &&
      Math.abs(faceCenterY - frameCenterY) < toleranceY;

    // Check confidence (good if > 0.7)
    const hasGoodConfidence = detection.detection.score > 0.7;

    const faces = [{
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      confidence: detection.detection.score,
    }];

    // Determine if there's an error based on quality
    let error: FaceError | undefined;
    if (!hasGoodConfidence) {
      error = createFaceError(FaceErrorType.POOR_LIGHTING);
    } else if (!isSufficientSize) {
      error = createFaceError(FaceErrorType.FACE_TOO_SMALL);
    } else if (requireCentered && !isCentered) {
      error = createFaceError(FaceErrorType.FACE_NOT_CENTERED);
    }

    return {
      detected: true,
      count: 1,
      faces,
      quality: {
        isCentered,
        isSufficientSize,
        hasGoodConfidence,
      },
      error,
    };
  } catch (error) {
    console.error('[FaceService] Error detecting faces:', error);
    return { 
      detected: false, 
      count: 0, 
      faces: [],
      error: createFaceError(FaceErrorType.UNKNOWN),
    };
  }
}

/**
 * Result of face embedding extraction
 */
export interface FaceExtractionResult {
  success: boolean;
  embedding: number[] | null;
  error?: FaceError;
}

/**
 * Extract face embedding (128-dimensional vector) from an image
 * @param imageElement - HTML Image, Video, or Canvas element
 * @returns Face embedding result with embedding array or error
 */
export async function extractFaceEmbedding(
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<FaceExtractionResult> {
  if (!isInitialized) {
    await initializeFaceAPI();
  }

  // Check if video is ready
  if (imageElement instanceof HTMLVideoElement) {
    if (!isVideoReady(imageElement)) {
      console.warn('[FaceService] Video not ready yet');
      return {
        success: false,
        embedding: null,
        error: createFaceError(FaceErrorType.CAMERA_NOT_READY),
      };
    }
  }

  if (useMockMode) {
    // Return mock embedding (128-dimensional vector)
    return {
      success: true,
      embedding: Array(128).fill(0).map(() => Math.random() * 2 - 1),
    };
  }

  try {
    // First check for multiple faces
    const allDetections = await faceapi
      .detectAllFaces(imageElement, new faceapi.TinyFaceDetectorOptions());
    
    if (allDetections.length === 0) {
      return {
        success: false,
        embedding: null,
        error: createFaceError(FaceErrorType.NO_FACE),
      };
    }

    if (allDetections.length > 1) {
      return {
        success: false,
        embedding: null,
        error: createFaceError(FaceErrorType.MULTIPLE_FACES),
      };
    }

    // Now get the full detection with descriptor
    const detection = await faceapi
      .detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return {
        success: false,
        embedding: null,
        error: createFaceError(FaceErrorType.EXTRACTION_FAILED),
      };
    }

    // Check detection quality
    if (detection.detection.score < 0.7) {
      return {
        success: false,
        embedding: null,
        error: createFaceError(FaceErrorType.POOR_LIGHTING),
      };
    }

    // Check face size
    const box = detection.detection.box;
    const frameWidth = imageElement instanceof HTMLVideoElement ? imageElement.videoWidth : imageElement.width;
    const frameHeight = imageElement instanceof HTMLVideoElement ? imageElement.videoHeight : imageElement.height;
    const faceArea = (box.width * box.height) / (frameWidth * frameHeight) * 100;
    
    if (faceArea < 5) {
      return {
        success: false,
        embedding: null,
        error: createFaceError(FaceErrorType.FACE_TOO_SMALL),
      };
    }

    return {
      success: true,
      embedding: Array.from(detection.descriptor),
    };
  } catch (error) {
    console.error('[FaceService] Error extracting embedding:', error);
    return {
      success: false,
      embedding: null,
      error: createFaceError(FaceErrorType.EXTRACTION_FAILED),
    };
  }
}

/**
 * Legacy wrapper for extractFaceEmbedding that returns just the embedding or null
 * @deprecated Use extractFaceEmbedding instead for better error handling
 */
export async function extractFaceEmbeddingLegacy(
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<number[] | null> {
  const result = await extractFaceEmbedding(imageElement);
  return result.embedding;
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
      
      const result = await extractFaceEmbedding(videoElement);
      const currentEmbedding = result.embedding;
      
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
