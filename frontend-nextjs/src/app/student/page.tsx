'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { Calendar, TrendingUp, Clock, BookOpen, QrCode } from 'lucide-react';
import { useAuth } from '@/app/providers';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';

// Helper functions
function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getAttendanceStatusColor(status: string): string {
  const s = status.toLowerCase();
  switch (s) {
    case 'present': return 'badge badge-success';
    case 'late': return 'badge badge-warning';
    case 'absent': return 'badge badge-danger';
    case 'excused': return 'badge badge-info';
    default: return 'badge badge-gray';
  }
}

function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export default function StudentDashboard() {
  const { user } = useAuth();

  // Get student data by email
  const students = useQuery(api.students.list, { search: user?.email });
  const student = students?.[0];

  // Get attendance report for the student
  const report = useQuery(
    api.students.getAttendanceReport,
    student?._id ? { id: student._id as Id<'students'> } : 'skip'
  );

  // Get active sessions
  const activeSessions = useQuery(api.sessions.getActiveSessions, {});

  // Compute course-wise stats from report records
  const courseStats = useMemo(() => {
    if (!report?.records) return [];

    const courseMap = new Map<string, { code: string; name: string; present: number; total: number }>();

    for (const record of report.records) {
      const key = `${record.courseId}`;
      if (!courseMap.has(key)) {
        courseMap.set(key, {
          code: record.courseCode,
          name: record.courseName,
          present: 0,
          total: 0,
        });
      }
      const stats = courseMap.get(key)!;
      stats.total += 1;
      if (record.status === 'present' || record.status === 'late') {
        stats.present += 1;
      }
    }

    return Array.from(courseMap.entries()).map(([courseId, stats]) => ({
      courseId,
      courseCode: stats.code,
      courseName: stats.name,
      totalSessions: stats.total,
      totalPresent: stats.present,
      totalAbsent: stats.total - stats.present,
      attendanceRate: stats.total > 0 ? (stats.present / stats.total) * 100 : 0,
    }));
  }, [report]);

  // Loading state
  if (students === undefined || (student && report === undefined)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-12 h-12"></div>
      </div>
    );
  }

  // No student profile found
  if (!student) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">Student profile not found. Please contact administrator.</p>
        </div>
      </div>
    );
  }

  const totalAbsent = report ? report.totalSessions - report.attendedSessions : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="card bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="card-body">
          <h1 className="text-2xl font-bold mb-1">Welcome back, {user?.fullName || report?.studentName}!</h1>
          <p className="text-primary-100">
            {student.rollNo} | {student.department}
          </p>
        </div>
      </div>

      {/* Active Sessions Banner */}
      {activeSessions && activeSessions.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-800">Active Sessions Available!</p>
              <p className="text-sm text-green-600">
                {activeSessions.length} class(es) are currently taking attendance. Use the kiosk to mark your attendance.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="stat-value text-lg">
                {formatPercentage(report?.attendancePercentage || 0)}
              </p>
              <p className="stat-label text-xs">Overall Rate</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="stat-value text-lg">{report?.totalSessions || 0}</p>
              <p className="stat-label text-xs">Total Classes</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="stat-value text-lg">{report?.attendedSessions || 0}</p>
              <p className="stat-label text-xs">Present</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="stat-value text-lg">{totalAbsent}</p>
              <p className="stat-label text-xs">Absent</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-1 gap-4">
        <Link
          href="/student/profile"
          className="card p-6 hover:shadow-lg transition-shadow flex items-center gap-4"
        >
          <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
            <QrCode className="w-7 h-7 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">View QR Code</h3>
            <p className="text-sm text-gray-600">Show your ID card QR code for kiosk attendance</p>
          </div>
        </Link>
      </div>

      {/* Course-wise Attendance */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Course-wise Attendance</h2>
          <Link href="/student/attendance" className="text-primary-600 text-sm hover:underline">
            View Details
          </Link>
        </div>
        <div className="card-body">
          {courseStats.length > 0 ? (
            <div className="space-y-4">
              {courseStats.map((stats) => (
                <div key={stats.courseId} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">
                        {stats.courseCode} - {stats.courseName}
                      </span>
                      <span
                        className={cn(
                          'font-bold',
                          stats.attendanceRate >= 75
                            ? 'text-green-600'
                            : stats.attendanceRate >= 50
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        )}
                      >
                        {formatPercentage(stats.attendanceRate)}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          stats.attendanceRate >= 75
                            ? 'bg-green-500'
                            : stats.attendanceRate >= 50
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        )}
                        style={{ width: `${stats.attendanceRate}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats.totalPresent} / {stats.totalSessions} classes attended
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-gray-500">No courses enrolled</p>
          )}
        </div>
      </div>

      {/* Recent Attendance */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-900">Recent Attendance</h2>
        </div>
        <div className="card-body">
          {report && report.records.length > 0 ? (
            <div className="space-y-3">
              {report.records.slice(0, 10).map((record: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {record.courseName || 'Unknown Course'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(record.sessionDate)}
                    </p>
                  </div>
                  <span className={getAttendanceStatusColor(record.status)}>
                    {record.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-gray-500">No attendance records</p>
          )}
        </div>
      </div>
    </div>
  );
}
