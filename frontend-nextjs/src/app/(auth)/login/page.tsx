'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Eye, EyeOff, AlertCircle, Loader2, GraduationCap, Users, UserCog } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { useAuth } from '@/app/providers';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Get the default dashboard for a role
function getDashboardForRole(role: string): string {
  if (role === 'student') return '/student';
  if (role === 'admin') return '/admin';
  if (role === 'faculty') return '/teacher';
  return '/login';
}

export default function LoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setAuth } = useAuth();
  const suggestedRole = searchParams.get('role');
  
  const loginMutation = useMutation(api.auth.login);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await loginMutation({
        email: formData.email,
        password: formData.password,
      });
      
      // Store token AND user using auth context
      setAuth(result.user, result.token);
      
      // Redirect based on role
      const dashboardPath = getDashboardForRole(result.user.role);
      router.push(dashboardPath);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Demo quick login
  const handleDemoLogin = async (role: 'admin' | 'faculty' | 'student') => {
    const credentials = 
      role === 'admin'
        ? { email: 'admin@smartattend.com', password: 'admin123' }
        : role === 'faculty' 
          ? { email: 'prof.sharma@college.edu', password: 'faculty123' }
          : { email: 'amit@student.edu', password: 'student123' };
    
    setFormData(credentials);
    setError('');
    setIsLoading(true);

    try {
      const result = await loginMutation(credentials);
      setAuth(result.user, result.token);
      router.push(getDashboardForRole(result.user.role));
    } catch (err: any) {
      setError(err.message || 'Demo login failed. Please seed the database first.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-100 flex items-center justify-center py-12 px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-sky-300/20 rounded-full blur-3xl" />
      </div>
      
      <div className="max-w-md w-full relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-14 h-14 bg-gradient-to-br from-sky-500 to-sky-600 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/25 group-hover:shadow-sky-500/40 transition-shadow">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              SmartAttend
            </span>
          </Link>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl shadow-gray-200/50 border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold text-gray-900">Welcome Back</CardTitle>
            <CardDescription className="text-gray-600">
              {suggestedRole === 'teacher'
                ? 'Sign in to the Teacher Portal'
                : suggestedRole === 'student'
                ? 'Sign in to the Student Portal'
                : 'Sign in to your account'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="h-11 bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className="h-11 pr-10 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-sky-600 hover:bg-sky-700 text-white font-medium shadow-lg shadow-sky-600/25 hover:shadow-sky-600/40 transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="text-center">
              <Link href="/" className="text-sky-600 hover:text-sky-700 text-sm font-medium hover:underline transition-colors">
                Back to Home
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Demo Credentials */}
        <Card className="mt-6 shadow-lg shadow-gray-200/30 border-0 bg-white/60 backdrop-blur-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 text-center mb-4 font-medium">Quick Demo Login</p>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                onClick={() => handleDemoLogin('admin')}
                disabled={isLoading}
                className="flex flex-col items-center gap-1 h-auto py-3 border-gray-200 hover:border-sky-300 hover:bg-sky-50 transition-all"
              >
                <UserCog className="w-5 h-5 text-sky-600" />
                <span className="text-xs font-medium">Admin</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDemoLogin('faculty')}
                disabled={isLoading}
                className="flex flex-col items-center gap-1 h-auto py-3 border-gray-200 hover:border-sky-300 hover:bg-sky-50 transition-all"
              >
                <Users className="w-5 h-5 text-sky-600" />
                <span className="text-xs font-medium">Teacher</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDemoLogin('student')}
                disabled={isLoading}
                className="flex flex-col items-center gap-1 h-auto py-3 border-gray-200 hover:border-sky-300 hover:bg-sky-50 transition-all"
              >
                <GraduationCap className="w-5 h-5 text-sky-600" />
                <span className="text-xs font-medium">Student</span>
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-4 text-center">
              Make sure to seed the demo data first
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
