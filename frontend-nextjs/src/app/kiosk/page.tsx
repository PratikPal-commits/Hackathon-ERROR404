'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, ArrowRight, AlertCircle } from 'lucide-react';

export default function KioskPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter the session code');
      return;
    }

    setLoading(true);
    setError('');

    // Navigate to the attendance marking page
    router.push(`/kiosk/${code.trim().toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="w-12 h-12 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-white">Attendance Kiosk</h1>
          <p className="text-primary-200 mt-2">
            Enter the session code displayed by your teacher
          </p>
        </div>

        {/* Code Entry Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="alert-error mb-4">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="label text-center block mb-3">Session Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="input text-center text-3xl font-mono tracking-widest py-4"
                placeholder="XXXXXX"
                maxLength={8}
                autoFocus
                autoComplete="off"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="btn-primary w-full py-4 text-lg disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="loading-spinner w-5 h-5"></span>
                  Loading...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500 mb-2">
              Don't have a code? Ask your teacher to start the session.
            </p>
            <Link href="/" className="text-primary-600 text-sm hover:underline">
              Back to Home
            </Link>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 text-center text-primary-200 text-sm">
          <p className="mb-2">How to mark attendance:</p>
          <ol className="text-left max-w-xs mx-auto space-y-1">
            <li>1. Enter the session code above</li>
            <li>2. Scan your ID card QR code</li>
            <li>3. Look at the camera for face verification</li>
            <li>4. OR use fingerprint scanner</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
