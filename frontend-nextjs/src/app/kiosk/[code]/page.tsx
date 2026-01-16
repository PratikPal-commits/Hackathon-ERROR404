'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Webcam from 'react-webcam';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import {
  Shield,
  Camera,
  Fingerprint,
  QrCode,
  CheckCircle,
  XCircle,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { initializeFaceAPI, extractFaceEmbedding, verifyFace, getServiceStatus } from '@/services/faceRecognition';
import { verifyFingerprint, captureFingerprint } from '@/services/fingerprint';

type Step = 'loading' | 'select_method' | 'qr_scan' | 'face_capture' | 'fingerprint' | 'processing' | 'success' | 'error';

interface VerificationResult {
  success: boolean;
  message: string;
  student?: { name: string; rollNo: string };
  status?: string;
  anomalyDetected?: boolean;
}

export default function KioskAttendancePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [step, setStep] = useState<Step>('loading');
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [scannedQR, setScannedQR] = useState<string | null>(null);
  const [scannedStudentRollNo, setScannedStudentRollNo] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [scannerState, setScannerState] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [faceApiReady, setFaceApiReady] = useState(false);

  const webcamRef = useRef<Webcam>(null);

  // Convex queries and mutations
  const session = useQuery(api.sessions.getByCode, { code });
  const scannedStudent = useQuery(
    api.students.getByRollNo,
    scannedStudentRollNo ? { rollNo: scannedStudentRollNo } : "skip"
  );
  const verifyAndMark = useMutation(api.attendance.verifyAndMark);
  const verifyFingerprintAndMark = useMutation(api.attendance.verifyFingerprintAndMark);

  // Initialize face API on mount
  useEffect(() => {
    initializeFaceAPI().then((ready) => {
      setFaceApiReady(ready);
      console.log('[Kiosk] Face API initialized, mock mode:', getServiceStatus().mockMode);
    });
  }, []);

  // Handle session loading
  useEffect(() => {
    if (session === undefined) {
      setStep('loading');
    } else if (session === null) {
      setError('Invalid or expired session code');
      setStep('error');
    } else if (!session.isActive) {
      setError('This session is not active for attendance');
      setStep('error');
    } else {
      setStep('select_method');
    }
  }, [session]);

  const handleMethodSelect = (selectedMethod: 'face_qr' | 'fingerprint') => {
    if (selectedMethod === 'face_qr') {
      setStep('qr_scan');
    } else {
      setStep('fingerprint');
    }
  };

  const handleQRScanned = (qrData: string) => {
    // Parse QR data format: SMARTATTEND:DEMO:ROLLNO:TIMESTAMP
    // Extract roll number (3rd element)
    let rollNo = qrData;
    
    if (qrData.startsWith('SMARTATTEND:')) {
      const parts = qrData.split(':');
      if (parts.length >= 3) {
        rollNo = parts[2]; // Get the roll number (3rd element)
      }
    }
    
    setScannedQR(rollNo);
    setScannedStudentRollNo(rollNo);
    setStep('face_capture');
  };

  const handleCaptureFace = async () => {
    if (!webcamRef.current || !scannedQR) return;

    // Check if student data is loaded
    if (scannedStudent === undefined) {
      setError('Loading student data...');
      return;
    }

    if (scannedStudent === null) {
      setError('Student not found. Please scan a valid ID.');
      setStep('error');
      return;
    }

    const videoElement = webcamRef.current.video;
    if (!videoElement) {
      setError('Camera not available');
      return;
    }

    setStep('processing');

    try {
      // Extract face embedding from live camera
      const capturedEmbedding = await extractFaceEmbedding(videoElement);
      
      if (!capturedEmbedding) {
        setError('No face detected. Please position your face in the circle and try again.');
        setStep('face_capture');
        return;
      }

      let faceConfidence = 0;
      let faceMatch = false;
      let message = '';

      // Check if student has enrolled face data
      if (scannedStudent.hasFaceData && scannedStudent.faceEmbedding) {
        // Compare with stored embedding
        const verificationResult = verifyFace(capturedEmbedding, scannedStudent.faceEmbedding);
        faceConfidence = verificationResult.confidence;
        faceMatch = verificationResult.match;
        message = verificationResult.message;

        if (!faceMatch) {
          setError(message);
          setResult({
            success: false,
            message,
            anomalyDetected: true,
          });
          setStep('error');
          return;
        }
      } else {
        // Student has no face data enrolled - allow with warning
        // In production, you might want to require enrollment first
        console.log('[Kiosk] Student has no face data, allowing verification with captured face');
        faceConfidence = 85; // Default confidence for first-time
        faceMatch = true;
        message = 'Face captured (no enrolled face to compare)';
      }
      
      // Format QR data for Convex (expecting SMARTATTEND:ID:ROLLNO format)
      const formattedQR = `SMARTATTEND:DEMO:${scannedQR}`;

      const response = await verifyAndMark({
        sessionCode: code,
        qrData: formattedQR,
        faceConfidence: faceConfidence,
        deviceInfo: navigator.userAgent,
        ipAddress: 'kiosk',
      });

      setResult({
        success: response.success,
        message: response.message,
        student: response.student || undefined,
        status: response.status,
      });
      setStep(response.success ? 'success' : 'error');
      if (!response.success) {
        setError(response.message);
      }
    } catch (err: any) {
      setError(err.message || 'Face verification failed');
      setResult({
        success: false,
        message: err.message || 'Face verification failed',
        anomalyDetected: err.message?.includes('mismatch') || err.message?.includes('already'),
      });
      setStep('error');
    }
  };

  const handleFingerprintVerify = async () => {
    setScannerState('scanning');
    setStep('processing');

    try {
      // Simulate fingerprint capture
      const captureResult = await captureFingerprint();
      
      if (!captureResult.success || !captureResult.hash) {
        setScannerState('error');
        setError(captureResult.message);
        setStep('error');
        return;
      }

      const response = await verifyFingerprintAndMark({
        sessionCode: code,
        fingerprintHash: captureResult.hash,
        deviceInfo: navigator.userAgent,
        ipAddress: 'kiosk',
      });

      setScannerState(response.success ? 'success' : 'error');
      setResult({
        success: response.success,
        message: response.message,
        student: response.student || undefined,
        status: response.status,
      });
      setStep(response.success ? 'success' : 'error');
      if (!response.success) {
        setError(response.message);
      }
    } catch (err: any) {
      setScannerState('error');
      setError(err.message || 'Fingerprint verification failed');
      setResult({
        success: false,
        message: err.message || 'Fingerprint verification failed',
      });
      setStep('error');
    }
  };

  const handleReset = () => {
    setScannedQR(null);
    setScannedStudentRollNo(null);
    setResult(null);
    setError('');
    setCameraError('');
    setScannerState('idle');
    setStep('select_method');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 py-4 px-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold">Attendance Kiosk</h1>
              {session && (
                <p className="text-sm text-gray-400">
                  {session.courseCode} - {session.courseName} | Code: {code}
                </p>
              )}
            </div>
          </div>
          <Link href="/kiosk" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto p-6">
        {step === 'loading' && (
          <div className="text-center py-20">
            <Loader2 className="w-16 h-16 mx-auto animate-spin text-blue-500" />
            <p className="mt-4 text-gray-400">Loading session...</p>
          </div>
        )}

        {step === 'select_method' && session && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold">Mark Your Attendance</h2>
              <p className="text-gray-400 mt-2">
                {session.courseCode} - {session.courseName}
              </p>
              <p className="text-gray-500 text-sm">
                {session.startTime} - {session.endTime}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleMethodSelect('face_qr')}
                className="bg-gray-800 border-2 border-gray-700 hover:border-blue-500 rounded-xl p-6 text-center transition-colors"
              >
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="font-semibold text-lg">QR + Face</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Scan ID card + Face verification
                </p>
              </button>

              <button
                onClick={() => handleMethodSelect('fingerprint')}
                className="bg-gray-800 border-2 border-gray-700 hover:border-purple-500 rounded-xl p-6 text-center transition-colors"
              >
                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Fingerprint className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="font-semibold text-lg">Fingerprint</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Use fingerprint scanner
                </p>
              </button>
            </div>
          </div>
        )}

        {step === 'qr_scan' && (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold">Scan Your ID Card</h2>
              <p className="text-gray-400">Position your ID card QR code in the camera view</p>
            </div>

            <div className="relative bg-gray-800 rounded-xl overflow-hidden" style={{ minHeight: '300px' }}>
              <Scanner
                onScan={(result) => {
                  if (result && result.length > 0) {
                    const qrData = result[0].rawValue;
                    if (qrData) {
                      handleQRScanned(qrData);
                    }
                  }
                }}
                onError={(error) => {
                  console.error('QR Scanner error:', error);
                  setCameraError('Unable to access camera. Please allow camera permissions and make sure you are using HTTPS.');
                }}
                scanDelay={500}
                constraints={{
                  facingMode: { ideal: 'environment' },
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                }}
                styles={{
                  container: {
                    width: '100%',
                    height: '100%',
                    minHeight: '300px',
                  },
                  video: {
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  },
                }}
                components={{
                  finder: true,
                }}
              />
            </div>

            {cameraError && (
              <div className="bg-red-900/50 border border-red-500 rounded-lg p-4">
                <p className="text-red-300 text-sm">{cameraError}</p>
                <p className="text-yellow-400 text-xs mt-2">
                  Tip: On mobile, camera requires HTTPS. Make sure you&apos;re accessing via https://
                </p>
              </div>
            )}

            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <QrCode className="w-6 h-6 text-blue-400" />
                <div>
                  <p className="text-sm text-gray-300">Waiting for QR code...</p>
                  <p className="text-xs text-gray-500">Hold your ID card steady in front of the camera</p>
                </div>
              </div>
            </div>

            <button onClick={handleReset} className="w-full bg-gray-700 hover:bg-gray-600 py-3 rounded-lg flex items-center justify-center gap-2">
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          </div>
        )}

        {step === 'face_capture' && (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold">Face Verification</h2>
              <p className="text-gray-400">Position your face in the circle and click capture</p>
              <p className="text-green-400 text-sm mt-2">ID: {scannedQR}</p>
            </div>

            <div className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                  width: 640,
                  height: 480,
                  facingMode: 'user',
                }}
                className="w-full h-full object-cover"
                mirrored
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-40 h-52 border-2 border-green-400 rounded-full animate-pulse"></div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-400">Tips for better verification:</p>
              <ul className="text-sm text-gray-500 mt-2 space-y-1">
                <li>- Look directly at the camera</li>
                <li>- Ensure good lighting on your face</li>
                <li>- Remove glasses or hats if possible</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button onClick={handleReset} className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-lg flex items-center justify-center gap-2">
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <button onClick={handleCaptureFace} className="flex-1 bg-blue-600 hover:bg-blue-700 py-3 rounded-lg flex items-center justify-center gap-2">
                <Camera className="w-5 h-5" />
                Capture & Verify
              </button>
            </div>
          </div>
        )}

        {step === 'fingerprint' && (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold">Fingerprint Scan</h2>
              <p className="text-gray-400">Place your finger on the scanner</p>
            </div>

            <div className="bg-gray-800 rounded-xl p-8 flex flex-col items-center">
              <div className={`w-32 h-40 border-4 rounded-2xl relative overflow-hidden transition-colors ${
                scannerState === 'scanning' ? 'border-blue-500' :
                scannerState === 'success' ? 'border-green-500' :
                scannerState === 'error' ? 'border-red-500' :
                'border-purple-500'
              }`}>
                <Fingerprint className={`w-full h-full p-4 ${
                  scannerState === 'scanning' ? 'text-blue-400 animate-pulse' :
                  scannerState === 'success' ? 'text-green-400' :
                  scannerState === 'error' ? 'text-red-400' :
                  'text-purple-400'
                }`} />
                {scannerState === 'scanning' && (
                  <div className="absolute inset-0 bg-gradient-to-b from-blue-500/50 to-transparent animate-scan"></div>
                )}
              </div>
              <p className="text-gray-400 mt-4">
                {scannerState === 'scanning' ? 'Scanning...' :
                 scannerState === 'success' ? 'Verified!' :
                 scannerState === 'error' ? 'Try again' :
                 'Ready to scan'}
              </p>
            </div>

            <button 
              onClick={handleFingerprintVerify} 
              disabled={scannerState === 'scanning'}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 py-4 rounded-lg flex items-center justify-center gap-2 font-medium"
            >
              <Fingerprint className="w-5 h-5" />
              {scannerState === 'scanning' ? 'Scanning...' : 'Verify Fingerprint'}
            </button>

            <button onClick={handleReset} className="w-full bg-gray-700 hover:bg-gray-600 py-3 rounded-lg flex items-center justify-center gap-2">
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          </div>
        )}

        {step === 'processing' && (
          <div className="text-center py-20">
            <Loader2 className="w-16 h-16 mx-auto animate-spin text-blue-500" />
            <p className="mt-4 text-gray-400">Verifying...</p>
          </div>
        )}

        {step === 'success' && result && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <h2 className="text-3xl font-bold text-green-500 mb-2">Attendance Marked!</h2>
            <p className="text-gray-400 mb-2">{result.message}</p>
            {result.student && (
              <p className="text-xl text-white">
                Welcome, {result.student.name}!
              </p>
            )}
            {result.status && (
              <p className={`text-sm mt-2 ${result.status === 'late' ? 'text-yellow-400' : 'text-green-400'}`}>
                Status: {result.status.toUpperCase()}
              </p>
            )}

            <button onClick={handleReset} className="mt-8 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg flex items-center justify-center gap-2 mx-auto">
              <RefreshCw className="w-5 h-5" />
              Mark Another
            </button>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              {result?.anomalyDetected ? (
                <AlertTriangle className="w-16 h-16 text-yellow-500" />
              ) : (
                <XCircle className="w-16 h-16 text-red-500" />
              )}
            </div>
            <h2 className="text-3xl font-bold text-red-500 mb-2">
              {result?.anomalyDetected ? 'Verification Failed' : 'Error'}
            </h2>
            <p className="text-gray-400 mb-4">{error || result?.message}</p>
            {result?.anomalyDetected && (
              <p className="text-yellow-400 text-sm">
                This incident has been logged for review.
              </p>
            )}

            <div className="flex gap-3 justify-center mt-8">
              <button onClick={handleReset} className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-lg flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Try Again
              </button>
              <Link href="/kiosk" className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg flex items-center gap-2">
                <ArrowLeft className="w-5 h-5" />
                New Session
              </Link>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .animate-scan {
          animation: scan 1.5s infinite;
        }
      `}</style>
    </div>
  );
}
