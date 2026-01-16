'use client';

import { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { TrendingDown, Users, Loader2 } from 'lucide-react';

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export default function AnalyticsPage() {
  const [selectedCourseId, setSelectedCourseId] = useState<Id<'courses'> | null>(null);

  // Convex queries
  const courses = useQuery(api.courses.list, {});
  const analytics = useQuery(
    api.courses.getAnalytics,
    selectedCourseId ? { courseId: selectedCourseId } : 'skip'
  );
  const students = useQuery(api.students.list, {});

  // Set default course when courses load
  useMemo(() => {
    if (courses && courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0]._id);
    }
  }, [courses, selectedCourseId]);

  // Calculate low attendance students
  const lowAttendanceStudents = useMemo(() => {
    if (!students) return [];
    
    // For now, return empty since we'd need to calculate per-student attendance
    // This would require additional queries or computation
    return [];
  }, [students]);

  const loading = courses === undefined;
  const analyticsLoading = selectedCourseId && analytics === undefined;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Course Selector */}
      <div className="card">
        <div className="card-body">
          <label className="label">Select Course</label>
          <select
            className="input max-w-md"
            value={selectedCourseId || ''}
            onChange={(e) => setSelectedCourseId(e.target.value as Id<'courses'>)}
          >
            {courses?.map((course) => (
              <option key={course._id} value={course._id}>
                {course.courseCode} - {course.courseName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {analyticsLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : analytics && (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat-card">
              <p className="stat-value">{analytics.stats.totalSessions}</p>
              <p className="stat-label">Total Sessions</p>
            </div>
            <div className="stat-card">
              <p className="stat-value text-green-600">
                {formatPercentage(analytics.stats.attendanceRate)}
              </p>
              <p className="stat-label">Attendance Rate</p>
            </div>
            <div className="stat-card">
              <p className="stat-value text-blue-600">{analytics.stats.totalPresent}</p>
              <p className="stat-label">Total Present</p>
            </div>
            <div className="stat-card">
              <p className="stat-value text-red-600">{analytics.stats.totalAbsent}</p>
              <p className="stat-label">Total Absent</p>
            </div>
          </div>

          {/* Attendance Breakdown */}
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold text-gray-900">Attendance Breakdown</h2>
            </div>
            <div className="card-body">
              {analytics.stats.totalPresent + analytics.stats.totalAbsent + analytics.stats.totalLate > 0 ? (
                <>
                  <div className="h-8 bg-gray-100 rounded-full overflow-hidden flex">
                    <div
                      className="bg-green-500 h-full transition-all"
                      style={{
                        width: `${
                          (analytics.stats.totalPresent /
                            (analytics.stats.totalPresent +
                              analytics.stats.totalAbsent +
                              analytics.stats.totalLate)) *
                          100
                        }%`,
                      }}
                      title={`Present: ${analytics.stats.totalPresent}`}
                    />
                    <div
                      className="bg-yellow-500 h-full transition-all"
                      style={{
                        width: `${
                          (analytics.stats.totalLate /
                            (analytics.stats.totalPresent +
                              analytics.stats.totalAbsent +
                              analytics.stats.totalLate)) *
                          100
                        }%`,
                      }}
                      title={`Late: ${analytics.stats.totalLate}`}
                    />
                    <div
                      className="bg-red-500 h-full transition-all"
                      style={{
                        width: `${
                          (analytics.stats.totalAbsent /
                            (analytics.stats.totalPresent +
                              analytics.stats.totalAbsent +
                              analytics.stats.totalLate)) *
                          100
                        }%`,
                      }}
                      title={`Absent: ${analytics.stats.totalAbsent}`}
                    />
                  </div>
                  <div className="flex justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                      <span className="text-sm text-gray-600">Present ({analytics.stats.totalPresent})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                      <span className="text-sm text-gray-600">Late ({analytics.stats.totalLate})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                      <span className="text-sm text-gray-600">Absent ({analytics.stats.totalAbsent})</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-center py-8 text-gray-500">No attendance data available</p>
              )}
            </div>
          </div>

          {/* Recent Sessions */}
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold text-gray-900">Recent Sessions</h2>
            </div>
            <div className="card-body">
              {analytics.recentSessions && analytics.recentSessions.length > 0 ? (
                <div className="space-y-3">
                  {analytics.recentSessions.map((session: any) => (
                    <div
                      key={session._id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{session.sessionDate}</p>
                        <p className="text-sm text-gray-500">
                          {session.startTime} - {session.endTime}
                        </p>
                      </div>
                      <span className={cn(
                        'badge',
                        session.isActive ? 'badge-success' : 'badge-gray'
                      )}>
                        {session.isActive ? 'ACTIVE' : 'COMPLETED'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-gray-500">No recent sessions</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Low Attendance Students */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-red-500" />
          <h2 className="font-semibold text-gray-900">Low Attendance Students (&lt;75%)</h2>
        </div>
        <div className="card-body">
          {lowAttendanceStudents.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              No students with low attendance found
            </p>
          ) : (
            <div className="space-y-3">
              {lowAttendanceStudents.map(({ student, attendanceRate }: any) => (
                <div
                  key={student._id}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{student.name}</p>
                      <p className="text-sm text-gray-500">{student.rollNo}</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'font-bold',
                      attendanceRate < 50 ? 'text-red-600' : 'text-yellow-600'
                    )}
                  >
                    {formatPercentage(attendanceRate)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
