'use client';

import { useState, useEffect } from 'react';
import { User, Mail, Hash, Building, Calendar, Camera, Fingerprint, QrCode, Loader2 } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { useAuth } from '@/app/providers';
import { cn } from '@/lib/utils';
import QRCode from 'qrcode';

export default function StudentProfilePage() {
  const { user } = useAuth();
  
  // Get student by email
  const student = useQuery(
    api.students.getByEmail,
    user?.email ? { email: user.email } : 'skip'
  );

  // Get enrollment status
  const enrollmentStatus = useQuery(
    api.students.getEnrollmentStatus,
    student?._id ? { id: student._id } : 'skip'
  );

  const loading = student === undefined;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">Student profile not found</p>
          <p className="text-gray-500 text-sm">Please contact an administrator to link your account.</p>
        </div>
      </div>
    );
  }

  const faceEnrolled = enrollmentStatus?.faceEnrolled ?? student.hasFaceData ?? false;
  const fingerprintEnrolled = enrollmentStatus?.fingerprintEnrolled ?? student.hasFingerprint ?? false;

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-3xl font-bold text-primary-600">
                  {(user?.fullName || student.name)?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{user?.fullName || student.name}</h1>
                <p className="text-gray-600">{student.department}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{user?.email || student.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Hash className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Roll Number</p>
                    <p className="font-medium">{student.rollNo}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Building className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Department</p>
                    <p className="font-medium">{student.department}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">College ID</p>
                    <p className="font-medium">{student.collegeId}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enrollment Status */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-900">Biometric Enrollment</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className={cn(
                'p-4 rounded-lg border-2',
                faceEnrolled
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 bg-gray-50'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center',
                    faceEnrolled ? 'bg-green-100' : 'bg-gray-100'
                  )}
                >
                  <Camera
                    className={cn(
                      'w-6 h-6',
                      faceEnrolled ? 'text-green-600' : 'text-gray-400'
                    )}
                  />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Face Recognition</p>
                  <p
                    className={cn(
                      'text-sm',
                      faceEnrolled ? 'text-green-600' : 'text-gray-500'
                    )}
                  >
                    {faceEnrolled ? 'Enrolled' : 'Not Enrolled - Contact Admin'}
                  </p>
                </div>
              </div>
            </div>

            <div
              className={cn(
                'p-4 rounded-lg border-2',
                fingerprintEnrolled
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 bg-gray-50'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center',
                    fingerprintEnrolled ? 'bg-green-100' : 'bg-gray-100'
                  )}
                >
                  <Fingerprint
                    className={cn(
                      'w-6 h-6',
                      fingerprintEnrolled ? 'text-green-600' : 'text-gray-400'
                    )}
                  />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Fingerprint</p>
                  <p
                    className={cn(
                      'text-sm',
                      fingerprintEnrolled ? 'text-green-600' : 'text-gray-500'
                    )}
                  >
                    {fingerprintEnrolled ? 'Enrolled' : 'Not Enrolled'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-900">Your QR Code</h2>
        </div>
        <div className="card-body">
          <div className="flex flex-col items-center">
            {student.qrCode ? (
              <QRCodeDisplay data={student.qrCode} />
            ) : (
              <div className="w-48 h-48 bg-gray-100 rounded-xl flex items-center justify-center">
                <QrCode className="w-12 h-12 text-gray-400" />
              </div>
            )}
            <p className="text-sm text-gray-500 mt-4 text-center">
              Show this QR code at the attendance kiosk to mark your attendance
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// QR Code display component with async generation
function QRCodeDisplay({ data }: { data: string }) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  
  useEffect(() => {
    QRCode.toDataURL(data, { width: 200, margin: 2 })
      .then(setQrUrl)
      .catch(() => setQrUrl(null));
  }, [data]);

  if (!qrUrl) {
    return (
      <div className="w-48 h-48 bg-gray-100 rounded-xl flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 bg-white border-2 border-gray-200 rounded-xl">
      <img src={qrUrl} alt="Student QR Code" className="w-48 h-48" />
    </div>
  );
}
