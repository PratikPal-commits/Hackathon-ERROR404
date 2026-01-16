'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from 'convex/react';
import { Users, BookOpen, Calendar, AlertTriangle, TrendingUp, Clock, Database, Zap } from 'lucide-react';
import { api } from '@convex/_generated/api';

// Helper functions
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

function getAnomalySeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'badge badge-danger';
    case 'high': return 'badge bg-orange-100 text-orange-800';
    case 'medium': return 'badge badge-warning';
    case 'low': return 'badge badge-info';
    default: return 'badge badge-gray';
  }
}

function getAnomalyTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    face_mismatch: 'Face Mismatch',
    duplicate_attendance: 'Duplicate Attempt',
    liveness_failed: 'Liveness Failed',
    proxy_suspected: 'Proxy Suspected',
    multiple_attempts: 'Multiple Attempts',
    time_anomaly: 'Time Anomaly',
    location_mismatch: 'Location Mismatch',
  };
  return labels[type] || type;
}

export default function TeacherDashboard() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  // Convex queries
  const dashboardStats = useQuery(api.analytics.getDashboard, {});
  const seedMutation = useMutation(api.seed.seedDemoData);

  // Handle seeding demo data
  const handleSeedData = async () => {
    setIsSeeding(true);
    setSeedMessage(null);
    try {
      const result = await seedMutation({});
      setSeedMessage(`Demo data seeded! Created ${result.data?.users?.students || 0} students, ${result.data?.courses || 0} courses.`);
    } catch (err: any) {
      setSeedMessage(`Error: ${err.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  // Loading state
  if (dashboardStats === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-12 h-12"></div>
      </div>
    );
  }

  // No data state - show seed button
  if (!dashboardStats || (dashboardStats.totalStudents === 0 && dashboardStats.totalCourses === 0)) {
    return (
      <div className="space-y-6">
        <div className="card p-8 text-center">
          <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Data Found</h2>
          <p className="text-gray-600 mb-6">
            The database is empty. Click below to seed demo data for testing.
          </p>
          <button
            onClick={handleSeedData}
            disabled={isSeeding}
            className="btn-primary inline-flex items-center gap-2"
          >
            {isSeeding ? (
              <>
                <span className="loading-spinner w-5 h-5"></span>
                Seeding...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Seed Demo Data
              </>
            )}
          </button>
          {seedMessage && (
            <p className={`mt-4 text-sm ${seedMessage.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {seedMessage}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Seed Button for adding more data */}
      {seedMessage && (
        <div className="alert-success">
          <span>{seedMessage}</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-value">{dashboardStats.totalStudents}</p>
              <p className="stat-label">Total Students</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-value">{dashboardStats.totalCourses}</p>
              <p className="stat-label">Total Courses</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-value">{dashboardStats.activeSessions}</p>
              <p className="stat-label">Active Sessions</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-value">
                {formatPercentage(dashboardStats.todayAttendanceRate)}
              </p>
              <p className="stat-label">Today's Attendance</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Sessions */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Upcoming Sessions</h2>
            <Link href="/teacher/sessions" className="text-primary-600 text-sm hover:underline">
              View All
            </Link>
          </div>
          <div className="card-body">
            {dashboardStats.upcomingSessions && dashboardStats.upcomingSessions.length > 0 ? (
              <div className="space-y-3">
                {dashboardStats.upcomingSessions.slice(0, 5).map((session: any) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {session.courseName || 'Unknown Course'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(session.sessionDate)} at {formatTime(session.startTime)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {session.roomNo ? `${session.building || ''} ${session.roomNo}` : 'No location'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No upcoming sessions</p>
            )}
          </div>
        </div>

        {/* Recent Anomalies */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Anomalies</h2>
            <Link href="/teacher/anomalies" className="text-primary-600 text-sm hover:underline">
              View All
            </Link>
          </div>
          <div className="card-body">
            {dashboardStats.recentAnomalies && dashboardStats.recentAnomalies.length > 0 ? (
              <div className="space-y-3">
                {dashboardStats.recentAnomalies.slice(0, 5).map((anomaly: any) => (
                  <div
                    key={anomaly.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={getAnomalySeverityColor(anomaly.severity)}>
                          {anomaly.severity.toUpperCase()}
                        </span>
                        <span className="font-medium text-gray-900">
                          {getAnomalyTypeLabel(anomaly.anomalyType)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {anomaly.studentName || 'Unknown Student'}
                      </p>
                    </div>
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No recent anomalies</p>
            )}
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
              href="/teacher/students?action=add"
              className="btn-outline flex flex-col items-center gap-2 py-4"
            >
              <Users className="w-6 h-6" />
              <span>Add Student</span>
            </Link>
            <Link
              href="/teacher/courses?action=add"
              className="btn-outline flex flex-col items-center gap-2 py-4"
            >
              <BookOpen className="w-6 h-6" />
              <span>Add Course</span>
            </Link>
            <Link
              href="/teacher/sessions?action=add"
              className="btn-outline flex flex-col items-center gap-2 py-4"
            >
              <Calendar className="w-6 h-6" />
              <span>Create Session</span>
            </Link>
            <Link
              href="/teacher/analytics"
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
