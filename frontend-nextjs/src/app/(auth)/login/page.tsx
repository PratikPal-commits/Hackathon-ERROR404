'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { useAuth } from '@/app/providers';

// Get the default dashboard for a role
function getDashboardForRole(role: string): string {
  if (role === 'student') return '/student';
  if (role === 'faculty' || role === 'admin') return '/teacher';
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
  const handleDemoLogin = async (role: 'faculty' | 'student') => {
    const credentials = role === 'faculty' 
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">SmartAttend</span>
          </Link>
        </div>

        {/* Login Card */}
        <div className="card p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
            <p className="text-gray-600 mt-1">
              {suggestedRole === 'teacher'
                ? 'Sign in to the Teacher Portal'
                : suggestedRole === 'student'
                ? 'Sign in to the Student Portal'
                : 'Sign in to your account'}
            </p>
          </div>

          {error && (
            <div className="alert-error mb-4">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="label">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input pr-10"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="loading-spinner w-5 h-5"></span>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-primary-600 hover:underline text-sm">
              Back to Home
            </Link>
          </div>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 card p-4">
          <p className="text-sm text-gray-600 text-center mb-3">Quick Demo Login:</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleDemoLogin('faculty')}
              disabled={isLoading}
              className="btn-outline text-sm py-2"
            >
              Login as Teacher
            </button>
            <button
              onClick={() => handleDemoLogin('student')}
              disabled={isLoading}
              className="btn-outline text-sm py-2"
            >
              Login as Student
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3 text-center">
            Make sure to seed the demo data first
          </p>
        </div>
      </div>
    </div>
  );
}
