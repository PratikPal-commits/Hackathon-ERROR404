'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { Loader2 } from 'lucide-react';

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

  // Placeholder for low attendance calculation (still empty until we compute)
  const lowAttendanceStudents = useMemo(() => {
    if (!students) return [];
    return [] as any[];
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
    <div className="container mx-auto my-6 space-y-6">
      {/* Course Selector */}
      <Card>
        <CardHeader>
          <Label htmlFor="course-selector">Select a Course:</Label>
        </CardHeader>
        <CardContent>
          <select
            id="course-selector"
            className="w-full rounded-md bg-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={selectedCourseId ?? ''}
            onChange={(e) => setSelectedCourseId((e.target.value as unknown) as Id<'courses'>)}
          >
            {courses && courses.length > 0 ? (
              courses.map((course: any) => (
                <option key={course._id} value={course._id}>
                  {course.courseCode} - {course.courseName}
                </option>
              ))
            ) : (
              <option disabled>No courses available</option>
            )}
          </select>
        </CardContent>
      </Card>

      {analyticsLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : analytics ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Stats Overview */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Stats Overview</h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-2xl font-bold text-gray-900">{analytics?.stats?.totalSessions ?? 0}</p>
                  <p className="text-sm text-gray-600">Total Sessions</p>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-2xl font-bold text-green-600">{formatPercentage(analytics?.stats?.attendanceRate ?? 0)}</p>
                  <p className="text-sm text-gray-600">Attendance Rate</p>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-2xl font-bold text-blue-600">{analytics?.stats?.totalPresent ?? 0}</p>
                  <p className="text-sm text-gray-600">Total Present</p>
                </div>
              </div>

              {/* Attendance Breakdown */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-800 mb-2">Attendance Breakdown</h3>
                {analytics?.stats && (analytics.stats.totalPresent || analytics.stats.totalAbsent || analytics.stats.totalLate) ? (
                  <>
                    <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
                      <div
                        className="bg-green-500 h-full transition-all"
                        style={{
                          width: `${
                            ((analytics.stats.totalPresent || 0) /
                              ((analytics.stats.totalPresent || 0) + (analytics.stats.totalAbsent || 0) + (analytics.stats.totalLate || 0))) *
                            100 || 0
                          }%`,
                        }}
                        title={`Present: ${analytics.stats.totalPresent}`}
                      />
                      <div
                        className="bg-yellow-500 h-full transition-all"
                        style={{
                          width: `${
                            ((analytics.stats.totalLate || 0) /
                              ((analytics.stats.totalPresent || 0) + (analytics.stats.totalAbsent || 0) + (analytics.stats.totalLate || 0))) *
                            100 || 0
                          }%`,
                        }}
                        title={`Late: ${analytics.stats.totalLate}`}
                      />
                      <div
                        className="bg-red-500 h-full transition-all"
                        style={{
                          width: `${
                            ((analytics.stats.totalAbsent || 0) /
                              ((analytics.stats.totalPresent || 0) + (analytics.stats.totalAbsent || 0) + (analytics.stats.totalLate || 0))) *
                            100 || 0
                          }%`,
                        }}
                        title={`Absent: ${analytics.stats.totalAbsent}`}
                      />
                    </div>

                    <div className="flex gap-6 mt-3 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-green-500 rounded-full" />
                        <span>Present ({analytics.stats.totalPresent})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-yellow-500 rounded-full" />
                        <span>Late ({analytics.stats.totalLate})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-red-500 rounded-full" />
                        <span>Absent ({analytics.stats.totalAbsent})</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No attendance data available</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right: Recent Sessions & Low Attendance */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h3 className="text-sm font-medium text-gray-800">Recent Sessions</h3>
              </CardHeader>
              <CardContent>
                {analytics?.recentSessions && analytics.recentSessions.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.recentSessions.map((session: any) => (
                      <div key={session._id} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{session.sessionDate}</p>
                          <p className="text-sm text-gray-500">{session.startTime} - {session.endTime}</p>
                        </div>
                        <span className={cn('text-xs font-semibold', session.isActive ? 'text-green-600' : 'text-gray-500')}>
                          {session.isActive ? 'ACTIVE' : 'COMPLETED'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-4 text-gray-500">No recent sessions</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-sm font-medium text-gray-800">Low Attendance Students</h3>
              </CardHeader>
              <CardContent>
                {lowAttendanceStudents.length > 0 ? (
                  <div className="space-y-3">
                    {lowAttendanceStudents.map((s: any) => (
                      <div key={s._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium text-gray-900">{s.name}</p>
                          <p className="text-sm text-gray-500">{s.rollNo}</p>
                        </div>
                        <span className="text-sm font-semibold text-red-600">{formatPercentage(s.attendanceRate || 0)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-4 text-gray-500">No students with low attendance</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <p className="text-center py-8 text-gray-500">Select a course to view analytics</p>
      )}
    </div>
  );
}
