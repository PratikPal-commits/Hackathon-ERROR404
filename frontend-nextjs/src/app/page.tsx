'use client';

import Link from 'next/link';
import { GraduationCap, Users, MonitorSmartphone, Shield, Camera, Fingerprint } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100">
      {/* Header */}
      <header className="py-6 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">SmartAttend</span>
          </div>
          <Link href="/login" className="btn-primary">
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Intelligent Attendance
            <span className="text-primary-600"> Verification</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Secure and efficient attendance tracking with facial recognition, 
            QR code scanning, and biometric verification.
          </p>
        </div>

        {/* Portal Selection */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {/* Teacher Portal */}
          <Link href="/login?role=teacher" className="portal-card group">
            <div className="portal-icon">
              <Users className="w-full h-full" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Teacher Portal</h2>
            <p className="text-gray-600 text-sm">
              Manage students, courses, and sessions. View attendance analytics and handle anomalies.
            </p>
            <div className="mt-4 text-primary-600 font-medium group-hover:underline">
              Access Dashboard
            </div>
          </Link>

          {/* Student Portal */}
          <Link href="/login?role=student" className="portal-card group">
            <div className="portal-icon">
              <GraduationCap className="w-full h-full" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Student Portal</h2>
            <p className="text-gray-600 text-sm">
              View your attendance records, check class schedules, and track your attendance rate.
            </p>
            <div className="mt-4 text-primary-600 font-medium group-hover:underline">
              View Attendance
            </div>
          </Link>

          {/* Kiosk Mode */}
          <Link href="/kiosk" className="portal-card group">
            <div className="portal-icon">
              <MonitorSmartphone className="w-full h-full" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Attendance Kiosk</h2>
            <p className="text-gray-600 text-sm">
              Mark attendance using face recognition with QR code or fingerprint verification.
            </p>
            <div className="mt-4 text-primary-600 font-medium group-hover:underline">
              Mark Attendance
            </div>
          </Link>
        </div>

        {/* Features */}
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Multi-Factor Verification
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Face Recognition</h3>
              <p className="text-gray-600 text-sm">
                Advanced facial recognition with liveness detection to prevent photo spoofing.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">QR Code Scanning</h3>
              <p className="text-gray-600 text-sm">
                Quick identification using student ID cards with unique QR codes.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Fingerprint className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Biometric Auth</h3>
              <p className="text-gray-600 text-sm">
                Fingerprint verification for secure and quick attendance marking.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
          <div className="bg-white rounded-xl p-6 text-center shadow-sm">
            <div className="text-3xl font-bold text-primary-600">99.5%</div>
            <div className="text-sm text-gray-600">Accuracy Rate</div>
          </div>
          <div className="bg-white rounded-xl p-6 text-center shadow-sm">
            <div className="text-3xl font-bold text-primary-600">&lt;2s</div>
            <div className="text-sm text-gray-600">Verification Time</div>
          </div>
          <div className="bg-white rounded-xl p-6 text-center shadow-sm">
            <div className="text-3xl font-bold text-primary-600">100%</div>
            <div className="text-sm text-gray-600">Proxy Prevention</div>
          </div>
          <div className="bg-white rounded-xl p-6 text-center shadow-sm">
            <div className="text-3xl font-bold text-primary-600">24/7</div>
            <div className="text-sm text-gray-600">Available</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 mt-12 border-t border-gray-200">
        <div className="max-w-6xl mx-auto text-center text-gray-600 text-sm">
          <p>Smart Attendance Verification System - Hackathon Project</p>
        </div>
      </footer>
    </div>
  );
}
