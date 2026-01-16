'use client';

import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { Calendar, Filter, Loader2 } from 'lucide-react';
import { useAuth } from '@/app/providers';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getAttendanceStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'present': return 'badge badge-success';
    case 'late': return 'badge badge-warning';
    case 'absent': return 'badge badge-danger';
    case 'excused': return 'badge badge-info';
    default: return 'badge badge-gray';
  }
}

export default function StudentAttendancePage() {
  const { user } = useAuth();
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  // Get student by email
  const students = useQuery(api.students.list, { search: user?.email });
  const student = students?.[0];

  // Get attendance report
  const report = useQuery(
    api.students.getAttendanceReport,
    student?._id ? { id: student._id as Id<'students'> } : 'skip'
  );

  // Compute course list from records
  const courseStats = useMemo(() => {
    if (!report?.records) return [];

    const courseMap = new Map<string, { id: string; code: string; name: string }>();

    for (const record of report.records) {
      const key = `${record.courseId}`;
      if (!courseMap.has(key)) {
        courseMap.set(key, {
          id: key,
          code: record.courseCode,
          name: record.courseName,
        });
      }
    }

    return Array.from(courseMap.values());
  }, [report]);

  // Filter records by selected course
  const filteredRecords = useMemo(() => {
    if (!report?.records) return [];
    if (!selectedCourseId) return report.records;
    return report.records.filter((r: any) => r.courseId === selectedCourseId);
  }, [report, selectedCourseId]);

  const loading = students === undefined || (student && report === undefined);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">Student profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              className="input max-w-xs"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              <option value="">All Courses</option>
              {courseStats.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Attendance List */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-900">Attendance History</h2>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Course</th>
                <th>Status</th>
                <th>Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">
                    No attendance records found
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record: any, index: number) => (
                  <tr key={`${record.sessionId}-${index}`}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDate(record.sessionDate)}
                      </div>
                    </td>
                    <td>
                      <div>
                        <p className="font-medium">{record.courseCode}</p>
                        <p className="text-sm text-gray-500">
                          {record.courseName}
                        </p>
                      </div>
                    </td>
                    <td>
                      <span className={getAttendanceStatusColor(record.status)}>
                        {record.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="text-sm text-gray-600">
                      {(record.verificationMethod || 'manual').replace('_', ' + ')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
