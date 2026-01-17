'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, ArrowRight, AlertCircle, Loader2, Scan, Fingerprint, Camera } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
    <div className="min-h-screen bg-gradient-to-br from-sky-600 via-sky-700 to-sky-800 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-64 h-64 bg-sky-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sky-400/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-sky-900/30 ring-4 ring-white/20">
            <Shield className="w-14 h-14 text-sky-600" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Attendance Kiosk</h1>
          <p className="text-sky-100 text-lg">
            Enter the session code displayed by your teacher
          </p>
        </div>

        {/* Code Entry Card */}
        <Card className="shadow-2xl shadow-sky-900/30 border-0 bg-white">
          <CardContent className="pt-8 pb-8 px-8">
            {error && (
              <Alert variant="destructive" className="mb-6 bg-red-50 border-red-200 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-8">
                <Label className="text-center block mb-4 text-gray-600 font-medium">Session Code</Label>
                <Input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="text-center text-4xl font-mono tracking-[0.3em] py-6 h-auto bg-gray-50 border-2 border-gray-200 focus:border-sky-500 focus:ring-sky-500 placeholder:text-gray-300 placeholder:tracking-[0.3em]"
                  placeholder="XXXXXX"
                  maxLength={8}
                  autoFocus
                  autoComplete="off"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !code.trim()}
                size="lg"
                className="w-full h-14 text-lg font-semibold bg-sky-600 hover:bg-sky-700 shadow-lg shadow-sky-600/25 hover:shadow-sky-600/40 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-500 mb-3">
                Don&apos;t have a code? Ask your teacher to start the session.
              </p>
              <Link 
                href="/" 
                className="text-sky-600 text-sm font-medium hover:text-sky-700 hover:underline transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <div className="mt-10 text-center">
          <p className="text-sky-100 font-medium mb-4">How to mark attendance:</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Scan className="w-6 h-6 text-white" />
              </div>
              <p className="text-white/90 text-sm font-medium">1. Scan QR</p>
              <p className="text-sky-200 text-xs mt-1">ID card scan</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <p className="text-white/90 text-sm font-medium">2. Face Verify</p>
              <p className="text-sky-200 text-xs mt-1">Look at camera</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Fingerprint className="w-6 h-6 text-white" />
              </div>
              <p className="text-white/90 text-sm font-medium">OR Fingerprint</p>
              <p className="text-sky-200 text-xs mt-1">Biometric scan</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
