'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
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
  Sparkles,
} from 'lucide-react';
import { initializeFaceAPI, extractFaceEmbedding, verifyFace, getServiceStatus } from '@/services/faceRecognition';
import { captureFingerprint } from '@/services/fingerprint';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Step = 'loading' | 'select_method' | 'qr_scan' | 'face_capture' | 'fingerprint_rollno' | 'fingerprint' | 'processing' | 'success' | 'error';

interface VerificationResult {
  success: boolean;
  message: string;
  student?: { name: string; rollNo: string };
  status?: string;
  anomalyDetected?: boolean;
}

export default function KioskAttendancePage() {
  const params = useParams();
  const code = params.code as string;

  const [step, setStep] = useState<Step>('loading');
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [scannedQR, setScannedQR] = useState<string | null>(null);
  const [scannedStudentRollNo, setScannedStudentRollNo] = useState<string | null>(null);
  const [fingerprintRollNo, setFingerprintRollNo] = useState('');
  const [fingerprintRollNoError, setFingerprintRollNoError] = useState('');
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
      setStep('fingerprint_rollno');
    }
  };

  const handleQRScanned = (qrData: string) => {
    let rollNo = qrData;
    
    if (qrData.startsWith('SMARTATTEND:')) {
      const parts = qrData.split(':');
      if (parts.length >= 3) {
        rollNo = parts[2];
      }
    }
    
    setScannedQR(rollNo);
    setScannedStudentRollNo(rollNo);
    setStep('face_capture');
  };

  const handleCaptureFace = async () => {
    if (!webcamRef.current || !scannedQR) return;

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

    if (videoElement.readyState < 2 || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
      setError('Camera not ready. Please wait a moment and try again.');
      return;
    }

    setStep('processing');

    try {
      const extractionResult = await extractFaceEmbedding(videoElement);
      
      if (!extractionResult.success || !extractionResult.embedding) {
        const errorMsg = extractionResult.error 
          ? `${extractionResult.error.message}. ${extractionResult.error.suggestion}`
          : 'No face detected. Please position your face in the circle and try again.';
        setError(errorMsg);
        setStep('face_capture');
        return;
      }

      const capturedEmbedding = extractionResult.embedding;

      let faceConfidence = 0;
      let faceMatch = false;
      let message = '';

      if (scannedStudent.hasFaceData && scannedStudent.faceEmbedding) {
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
        faceConfidence = 85;
        faceMatch = true;
        message = 'Face captured (no enrolled face to compare)';
      }
      
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

  const handleFingerprintRollNoSubmit = () => {
    if (!fingerprintRollNo.trim()) {
      setFingerprintRollNoError('Please enter your roll number');
      return;
    }
    setFingerprintRollNoError('');
    setScannedStudentRollNo(fingerprintRollNo.trim());
    setStep('fingerprint');
  };

  const handleFingerprintVerify = async () => {
    if (!scannedStudentRollNo) {
      setError('Please enter your roll number first');
      setStep('error');
      return;
    }

    setScannerState('scanning');
    setStep('processing');

    try {
      const captureResult = await captureFingerprint();
      
      if (!captureResult.success || !captureResult.hash) {
        setScannerState('error');
        setError(captureResult.message);
        setStep('error');
        return;
      }

      const response = await verifyFingerprintAndMark({
        sessionCode: code,
        rollNo: scannedStudentRollNo,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 py-4 px-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-sky-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/25">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Attendance Kiosk</h1>
              {session && (
                <p className="text-sm text-slate-400">
                  {session.courseCode} - {session.courseName} | Code: <span className="font-mono text-sky-400">{code}</span>
                </p>
              )}
            </div>
          </div>
          <Link href="/kiosk">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-700">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-2xl mx-auto p-6">
        {step === 'loading' && (
          <div className="text-center py-24">
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-sky-500/20 rounded-full animate-ping" />
              <div className="relative w-full h-full bg-slate-800 rounded-full flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-sky-500" />
              </div>
            </div>
            <p className="text-slate-400 text-lg">Loading session...</p>
          </div>
        )}

        {step === 'select_method' && session && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2">Mark Your Attendance</h2>
              <p className="text-slate-400">
                {session.courseCode} - {session.courseName}
              </p>
              <p className="text-slate-500 text-sm mt-1">
                {session.startTime} - {session.endTime}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card 
                className="bg-slate-800/50 border-2 border-slate-700 hover:border-sky-500 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-sky-500/10 group"
                onClick={() => handleMethodSelect('face_qr')}
              >
                <CardContent className="pt-8 pb-8 text-center">
                  <div className="w-20 h-20 bg-sky-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Camera className="w-10 h-10 text-sky-400" />
                  </div>
                  <h3 className="font-semibold text-xl text-white mb-1">QR + Face</h3>
                  <p className="text-sm text-slate-400">
                    Scan ID card + Face verification
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="bg-slate-800/50 border-2 border-slate-700 hover:border-purple-500 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/10 group"
                onClick={() => handleMethodSelect('fingerprint')}
              >
                <CardContent className="pt-8 pb-8 text-center">
                  <div className="w-20 h-20 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Fingerprint className="w-10 h-10 text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-xl text-white mb-1">Fingerprint</h3>
                  <p className="text-sm text-slate-400">
                    Use fingerprint scanner
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {step === 'qr_scan' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Scan Your ID Card</h2>
              <p className="text-slate-400">Position your ID card QR code in the camera view</p>
            </div>

            <Card className="bg-slate-800/50 border-slate-700 overflow-hidden">
              <div className="relative" style={{ minHeight: '320px' }}>
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
                    setCameraError('Unable to access camera. Please allow camera permissions.');
                  }}
                  scanDelay={500}
                  constraints={{
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                  }}
                  styles={{
                    container: { width: '100%', height: '100%', minHeight: '320px' },
                    video: { width: '100%', height: '100%', objectFit: 'cover' },
                  }}
                  components={{ finder: true }}
                />
              </div>
            </Card>

            {cameraError && (
              <Alert variant="destructive" className="bg-red-900/50 border-red-500/50 text-red-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{cameraError}</AlertDescription>
              </Alert>
            )}

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-sky-500/20 rounded-xl flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-sky-400" />
                  </div>
                  <div>
                    <p className="text-slate-200 font-medium">Waiting for QR code...</p>
                    <p className="text-sm text-slate-500">Hold your ID card steady in front of the camera</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleReset} variant="secondary" size="lg" className="w-full bg-slate-700 hover:bg-slate-600 text-white border-0">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
          </div>
        )}

        {step === 'face_capture' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Face Verification</h2>
              <p className="text-slate-400">Position your face in the circle and click capture</p>
              <div className="inline-flex items-center gap-2 mt-3 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full">
                <CheckCircle className="w-4 h-4" />
                <span className="font-mono text-sm">ID: {scannedQR}</span>
              </div>
            </div>

            <Card className="bg-slate-800/50 border-slate-700 overflow-hidden">
              <div className="relative aspect-video">
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
                  <div className="w-44 h-56 border-4 border-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/20" />
                </div>
              </div>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="py-4">
                <p className="text-sm text-slate-400 mb-2">Tips for better verification:</p>
                <ul className="text-sm text-slate-500 space-y-1">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-sky-400 rounded-full" />
                    Look directly at the camera
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-sky-400 rounded-full" />
                    Ensure good lighting on your face
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-sky-400 rounded-full" />
                    Remove glasses or hats if possible
                  </li>
                </ul>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button onClick={handleReset} variant="secondary" size="lg" className="flex-1 bg-slate-700 hover:bg-slate-600 text-white border-0">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </Button>
              <Button onClick={handleCaptureFace} size="lg" className="flex-1 bg-sky-600 hover:bg-sky-700 shadow-lg shadow-sky-600/25">
                <Camera className="w-5 h-5 mr-2" />
                Capture & Verify
              </Button>
            </div>
          </div>
        )}

        {step === 'fingerprint_rollno' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Enter Your Roll Number</h2>
              <p className="text-slate-400">Enter your student ID to proceed with fingerprint verification</p>
            </div>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="py-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <Fingerprint className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <label htmlFor="rollno" className="block text-sm font-medium text-slate-300 mb-1">
                        Roll Number
                      </label>
                      <input
                        id="rollno"
                        type="text"
                        value={fingerprintRollNo}
                        onChange={(e) => {
                          setFingerprintRollNo(e.target.value);
                          setFingerprintRollNoError('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleFingerprintRollNoSubmit();
                          }
                        }}
                        placeholder="Enter your roll number (e.g. CS001)"
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        autoFocus
                      />
                      {fingerprintRollNoError && (
                        <p className="text-red-400 text-sm mt-1">{fingerprintRollNoError}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-slate-500">
                    This identifies you in the system before fingerprint verification
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button onClick={handleReset} variant="secondary" size="lg" className="flex-1 bg-slate-700 hover:bg-slate-600 text-white border-0">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </Button>
              <Button onClick={handleFingerprintRollNoSubmit} size="lg" className="flex-1 bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-600/25">
                <Fingerprint className="w-5 h-5 mr-2" />
                Continue to Fingerprint
              </Button>
            </div>
          </div>
        )}

        {step === 'fingerprint' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Fingerprint Scan</h2>
              <p className="text-slate-400">Click to simulate fingerprint verification</p>
            </div>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="py-12 flex flex-col items-center">
                <div className={`w-36 h-44 border-4 rounded-3xl relative overflow-hidden transition-all duration-300 ${
                  scannerState === 'scanning' ? 'border-sky-500 shadow-lg shadow-sky-500/30' :
                  scannerState === 'success' ? 'border-emerald-500 shadow-lg shadow-emerald-500/30' :
                  scannerState === 'error' ? 'border-red-500 shadow-lg shadow-red-500/30' :
                  'border-purple-500 shadow-lg shadow-purple-500/20'
                }`}>
                  <Fingerprint className={`w-full h-full p-6 transition-colors ${
                    scannerState === 'scanning' ? 'text-sky-400 animate-pulse' :
                    scannerState === 'success' ? 'text-emerald-400' :
                    scannerState === 'error' ? 'text-red-400' :
                    'text-purple-400'
                  }`} />
                  {scannerState === 'scanning' && (
                    <div className="absolute inset-0 bg-gradient-to-b from-sky-500/40 to-transparent animate-scan" />
                  )}
                </div>
                <p className="text-slate-400 mt-6 font-medium">
                  {scannerState === 'scanning' ? 'Verifying...' :
                   scannerState === 'success' ? 'Verified!' :
                   scannerState === 'error' ? 'Try again' :
                   'Ready to scan'}
                </p>
              </CardContent>
            </Card>

            <Button 
              onClick={handleFingerprintVerify} 
              disabled={scannerState === 'scanning'}
              size="lg"
              className="w-full h-14 bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-600/25 disabled:opacity-50"
            >
              <Fingerprint className="w-5 h-5 mr-2" />
              {scannerState === 'scanning' ? 'Verifying...' : 'Verify Fingerprint'}
            </Button>

            <Button onClick={handleReset} variant="secondary" size="lg" className="w-full bg-slate-700 hover:bg-slate-600 text-white border-0">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
          </div>
        )}

        {step === 'processing' && (
          <div className="text-center py-24">
            <div className="w-24 h-24 mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-sky-500/20 rounded-full animate-ping" />
              <div className="relative w-full h-full bg-slate-800 rounded-full flex items-center justify-center border-2 border-sky-500/30">
                <Loader2 className="w-12 h-12 animate-spin text-sky-500" />
              </div>
            </div>
            <p className="text-xl text-slate-300">Verifying...</p>
            <p className="text-slate-500 mt-2">Please wait a moment</p>
          </div>
        )}

        {step === 'success' && result && (
          <div className="text-center py-12">
            <div className="w-28 h-28 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-8 ring-4 ring-emerald-500/30 animate-pulse">
              <CheckCircle className="w-16 h-16 text-emerald-500" />
            </div>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-6 h-6 text-amber-400" />
              <h2 className="text-4xl font-bold text-emerald-500">Attendance Marked!</h2>
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
            <p className="text-slate-400 mb-3">{result.message}</p>
            {result.student && (
              <p className="text-2xl text-white font-medium">
                Welcome, {result.student.name}!
              </p>
            )}
            {result.status && (
              <div className={`inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full ${
                result.status === 'late' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${result.status === 'late' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                Status: {result.status.toUpperCase()}
              </div>
            )}

            <Button onClick={handleReset} size="lg" className="mt-10 bg-sky-600 hover:bg-sky-700 shadow-lg shadow-sky-600/25">
              <RefreshCw className="w-5 h-5 mr-2" />
              Mark Another
            </Button>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center py-12">
            <div className={`w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-8 ring-4 ${
              result?.anomalyDetected 
                ? 'bg-amber-500/20 ring-amber-500/30' 
                : 'bg-red-500/20 ring-red-500/30'
            }`}>
              {result?.anomalyDetected ? (
                <AlertTriangle className="w-16 h-16 text-amber-500" />
              ) : (
                <XCircle className="w-16 h-16 text-red-500" />
              )}
            </div>
            <h2 className={`text-3xl font-bold mb-3 ${result?.anomalyDetected ? 'text-amber-500' : 'text-red-500'}`}>
              {result?.anomalyDetected ? 'Verification Failed' : 'Error'}
            </h2>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">{error || result?.message}</p>
            {result?.anomalyDetected && (
              <p className="text-amber-400/80 text-sm bg-amber-500/10 inline-block px-4 py-2 rounded-full">
                This incident has been logged for review
              </p>
            )}

            <div className="flex gap-3 justify-center mt-10">
              <Button onClick={handleReset} variant="secondary" size="lg" className="bg-slate-700 hover:bg-slate-600 text-white border-0">
                <RefreshCw className="w-5 h-5 mr-2" />
                Try Again
              </Button>
              <Link href="/kiosk">
                <Button size="lg" className="bg-sky-600 hover:bg-sky-700 shadow-lg shadow-sky-600/25">
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  New Session
                </Button>
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
