'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Webcam from 'react-webcam';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { useAuth } from '@/app/providers';
import {
  Camera,
  CheckCircle,
  XCircle,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Clock,
  QrCode,
} from 'lucide-react';
import { initializeFaceAPI, mockVerifyFace } from '@/services/faceRecognition';

type Step = 'loading' | 'select_session' | 'face_capture' | 'processing' | 'success' | 'error';

interface VerificationResult {
  success: boolean;
  message: string;
  status?: string;
  anomalyDetected?: boolean;
}

export default function MarkAttendancePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('loading');
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<VerificationResult | null>(null);

  const webcamRef = useRef<Webcam>(null);

  // Get student data by email
  const students = useQuery(api.students.list, { search: user?.email });
  const student = students?.[0];

  // Get active sessions that the student is enrolled in
  const activeSessions = useQuery(api.sessions.getActiveSessions, {});

  // Get student's enrolled courses
  const enrolledCoursesQuery = useQuery(
    api.courses.list,
    {}
  );

  // Filter active sessions to only those the student is enrolled in
  const enrolledCourseIds = student 
    ? enrolledCoursesQuery?.filter(c => c).map(c => c._id) || []
    : [];

  const studentActiveSessions = activeSessions?.filter(session => 
    enrolledCourseIds.includes(session.courseId)
  ) || [];

  // Convex mutation
  const verifyAndMark = useMutation(api.attendance.verifyAndMark);

  // Initialize face API on mount
  useEffect(() => {
    initializeFaceAPI();
  }, []);

  // Handle loading state
  useEffect(() => {
    if (students === undefined || activeSessions === undefined) {
      setStep('loading');
    } else if (!student) {
      setError('Student profile not found. Please contact administrator.');
      setStep('error');
    } else if (studentActiveSessions.length === 0) {
      setStep('select_session'); // Will show "no active sessions" message
    } else {
      setStep('select_session');
    }
  }, [students, student, activeSessions, studentActiveSessions.length]);

  const handleSessionSelect = (session: any) => {
    setSelectedSession(session);
    setStep('face_capture');
  };

  const handleCaptureFace = async () => {
    if (!webcamRef.current || !selectedSession || !student) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      setError('Failed to capture image. Please ensure camera access is allowed.');
      return;
    }

    setStep('processing');

    try {
      // Use mock face verification for demo
      const faceResult = mockVerifyFace(student.rollNo);
      
      // Format QR data for Convex
      const qrData = student.qrCode || `SMARTATTEND:${student.collegeId}:${student.rollNo}`;

      const response = await verifyAndMark({
        sessionCode: selectedSession.attendanceCode,
        qrData: qrData,
        faceConfidence: faceResult.confidence,
        deviceInfo: navigator.userAgent,
        ipAddress: 'student-device',
      });

      setResult({
        success: response.success,
        message: response.message,
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

  const handleReset = () => {
    setSelectedSession(null);
    setResult(null);
    setError('');
    setStep('select_session');
  };

  const handleBack = () => {
    if (step === 'face_capture') {
      setSelectedSession(null);
      setStep('select_session');
    } else {
      router.push('/student');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={handleBack}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mark Attendance</h1>
          <p className="text-gray-600">Use face verification to mark your attendance</p>
        </div>
      </div>

      {step === 'loading' && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      )}

      {step === 'select_session' && (
        <div className="space-y-6">
          {studentActiveSessions.length === 0 ? (
            <div className="card p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Sessions</h3>
              <p className="text-gray-600 mb-4">
                There are no classes currently taking attendance that you're enrolled in.
              </p>
              <Link href="/student" className="btn-primary inline-flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Link>
            </div>
          ) : (
            <>
              <p className="text-gray-600">Select your class to mark attendance:</p>
              <div className="grid gap-4">
                {studentActiveSessions.map((session) => (
                  <button
                    key={session._id}
                    onClick={() => handleSessionSelect(session)}
                    className="card p-4 text-left hover:shadow-md hover:border-blue-300 transition-all border-2 border-transparent"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {session.courseCode} - {session.courseName}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {session.sessionDate} | {session.startTime} - {session.endTime}
                        </p>
                        {session.roomNo && (
                          <p className="text-sm text-gray-500">
                            Room: {session.roomNo} {session.building && `(${session.building})`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          Active
                        </span>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-mono">
                          {session.attendanceCode}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {step === 'face_capture' && selectedSession && student && (
        <div className="space-y-6">
          {/* Session Info */}
          <div className="card p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <QrCode className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-blue-900">
                  {selectedSession.courseCode} - {selectedSession.courseName}
                </p>
                <p className="text-sm text-blue-700">
                  Code: {selectedSession.attendanceCode} | {student.rollNo}
                </p>
              </div>
            </div>
          </div>

          {/* Face Capture */}
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Face Verification</h2>
            <p className="text-gray-600">Position your face in the circle and click capture</p>
          </div>

          <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video max-w-lg mx-auto">
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
              <div className="w-40 h-52 border-4 border-green-400 rounded-full animate-pulse"></div>
            </div>
          </div>

          <div className="card p-4 bg-gray-50">
            <p className="text-sm text-gray-600 font-medium mb-2">Tips for better verification:</p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>- Look directly at the camera</li>
              <li>- Ensure good lighting on your face</li>
              <li>- Remove glasses or hats if possible</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={handleBack} 
              className="flex-1 btn-secondary flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <button 
              onClick={handleCaptureFace} 
              className="flex-1 btn-primary flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Capture & Verify
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <p className="mt-4 text-gray-600">Verifying your face...</p>
          <p className="text-sm text-gray-500">Please wait</p>
        </div>
      )}

      {step === 'success' && result && (
        <div className="card p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-green-600 mb-2">Attendance Marked!</h2>
          <p className="text-gray-600 mb-2">{result.message}</p>
          {result.status && (
            <p className={`text-sm font-medium ${result.status === 'late' ? 'text-yellow-600' : 'text-green-600'}`}>
              Status: {result.status.toUpperCase()}
            </p>
          )}
          {selectedSession && (
            <p className="text-gray-500 mt-4">
              {selectedSession.courseCode} - {selectedSession.courseName}
            </p>
          )}

          <div className="flex gap-3 justify-center mt-8">
            <Link href="/student" className="btn-secondary inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <button onClick={handleReset} className="btn-primary inline-flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Mark Another
            </button>
          </div>
        </div>
      )}

      {step === 'error' && (
        <div className="card p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            {result?.anomalyDetected ? (
              <AlertTriangle className="w-12 h-12 text-yellow-600" />
            ) : (
              <XCircle className="w-12 h-12 text-red-600" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">
            {result?.anomalyDetected ? 'Verification Issue' : 'Error'}
          </h2>
          <p className="text-gray-600 mb-4">{error || result?.message}</p>
          {result?.anomalyDetected && (
            <p className="text-yellow-600 text-sm mb-4">
              This incident has been logged. Please contact your instructor if you need assistance.
            </p>
          )}

          <div className="flex gap-3 justify-center mt-4">
            <Link href="/student" className="btn-secondary inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <button onClick={handleReset} className="btn-primary inline-flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
