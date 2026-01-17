'use client';

import Link from 'next/link';
import { useQuery } from 'convex/react';
import { Users, BookOpen, Calendar, Shield, UserCheck, TrendingUp, Activity } from 'lucide-react';
import { api } from '@convex/_generated/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/layout';

export default function AdminDashboard() {
  const stats = useQuery(api.faculty.getStats, {});

  // Loading state
  if (stats === undefined) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-white border-slate-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-xl" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Admins"
          value={stats.totalAdmins}
          subtitle={`${stats.activeAdmins} active`}
          subtitleColor="green"
          icon={Shield}
          iconColor="red"
        />
        <StatCard
          title="Total Faculty"
          value={stats.totalFaculty}
          subtitle={`${stats.activeFaculty} active`}
          subtitleColor="green"
          icon={Users}
          iconColor="blue"
        />
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon={UserCheck}
          iconColor="green"
        />
        <StatCard
          title="Total Courses"
          value={stats.totalCourses}
          subtitle={`${stats.activeSessions} active sessions`}
          subtitleColor="purple"
          icon={BookOpen}
          iconColor="purple"
        />
      </div>

      {/* Quick Overview Cards */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Faculty Overview */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold text-slate-900">Faculty Overview</CardTitle>
            <Link href="/admin/faculty">
              <Button variant="link" className="text-sky-600 hover:text-sky-700 p-0 h-auto">
                Manage Faculty
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <Shield className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Administrators</p>
                    <p className="text-sm text-slate-500">Full system access</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">{stats.totalAdmins}</p>
                  <p className="text-xs text-slate-500">{stats.activeAdmins} active</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-sky-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Faculty Members</p>
                    <p className="text-sm text-slate-500">Teaching staff</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">{stats.totalFaculty}</p>
                  <p className="text-xs text-slate-500">{stats.activeFaculty} active</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-slate-900">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="font-medium text-emerald-800">System Online</span>
                </div>
                <span className="text-sm text-emerald-600">All services running</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-sky-500" />
                    <p className="text-sm text-slate-500">Active Sessions</p>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{stats.activeSessions}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-purple-500" />
                    <p className="text-sm text-slate-500">Total Users</p>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.totalAdmins + stats.totalFaculty + stats.totalStudents}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-slate-900">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/admin/faculty?action=add">
              <Button
                variant="outline"
                className="w-full h-auto flex flex-col items-center gap-2 py-6 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 transition-colors"
              >
                <Users className="w-6 h-6" />
                <span>Add Faculty</span>
              </Button>
            </Link>
            <Link href="/admin/students?action=add">
              <Button
                variant="outline"
                className="w-full h-auto flex flex-col items-center gap-2 py-6 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 transition-colors"
              >
                <UserCheck className="w-6 h-6" />
                <span>Add Student</span>
              </Button>
            </Link>
            <Link href="/admin/network">
              <Button
                variant="outline"
                className="w-full h-auto flex flex-col items-center gap-2 py-6 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 transition-colors"
              >
                <Calendar className="w-6 h-6" />
                <span>Network Settings</span>
              </Button>
            </Link>
            <Link href="/admin/analytics">
              <Button
                variant="outline"
                className="w-full h-auto flex flex-col items-center gap-2 py-6 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 transition-colors"
              >
                <TrendingUp className="w-6 h-6" />
                <span>View Reports</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
