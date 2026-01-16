'use client';

import Link from 'next/link';
import { useQuery } from 'convex/react';
import { Users, BookOpen, Calendar, Shield, UserCheck, UserX, TrendingUp } from 'lucide-react';
import { api } from '@convex/_generated/api';

export default function AdminDashboard() {
  const stats = useQuery(api.faculty.getStats, {});

  // Loading state
  if (stats === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-12 h-12"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-value">{stats.totalAdmins}</p>
              <p className="stat-label">Total Admins</p>
              <p className="text-xs text-green-600 mt-1">{stats.activeAdmins} active</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-value">{stats.totalFaculty}</p>
              <p className="stat-label">Total Faculty</p>
              <p className="text-xs text-green-600 mt-1">{stats.activeFaculty} active</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-value">{stats.totalStudents}</p>
              <p className="stat-label">Total Students</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-value">{stats.totalCourses}</p>
              <p className="stat-label">Total Courses</p>
              <p className="text-xs text-purple-600 mt-1">{stats.activeSessions} active sessions</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Overview Cards */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Faculty Overview */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Faculty Overview</h2>
            <Link href="/admin/faculty" className="text-primary-600 text-sm hover:underline">
              Manage Faculty
            </Link>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <Shield className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Administrators</p>
                    <p className="text-sm text-gray-500">Full system access</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{stats.totalAdmins}</p>
                  <p className="text-xs text-gray-500">{stats.activeAdmins} active</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Faculty Members</p>
                    <p className="text-sm text-gray-500">Teaching staff</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{stats.totalFaculty}</p>
                  <p className="text-xs text-gray-500">{stats.activeFaculty} active</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900">System Status</h2>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-medium text-green-800">System Online</span>
                </div>
                <span className="text-sm text-green-600">All services running</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Active Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeSessions}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalAdmins + stats.totalFaculty + stats.totalStudents}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/admin/faculty?action=add"
              className="btn-outline flex flex-col items-center gap-2 py-4"
            >
              <Users className="w-6 h-6" />
              <span>Add Faculty</span>
            </Link>
            <Link
              href="/admin/students?action=add"
              className="btn-outline flex flex-col items-center gap-2 py-4"
            >
              <UserCheck className="w-6 h-6" />
              <span>Add Student</span>
            </Link>
            <Link
              href="/admin/network"
              className="btn-outline flex flex-col items-center gap-2 py-4"
            >
              <Calendar className="w-6 h-6" />
              <span>Network Settings</span>
            </Link>
            <Link
              href="/admin/analytics"
              className="btn-outline flex flex-col items-center gap-2 py-4"
            >
              <TrendingUp className="w-6 h-6" />
              <span>View Reports</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
