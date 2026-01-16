'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { Plus, Play, Square, AlertCircle, Copy, Check, Users, Loader2 } from 'lucide-react';
import { useAuth } from '@/app/providers';

// Helper functions
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

function getSessionStatus(session: any): 'scheduled' | 'active' | 'completed' {
  if (session.isActive) return 'active';
  
  // Only mark as completed if session was activated (has attendance code) and is now inactive
  if (!session.isActive && session.attendanceCode) return 'completed';
  
  return 'scheduled';
}

function getSessionStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'badge badge-success';
    case 'scheduled': return 'badge badge-info';
    case 'completed': return 'badge badge-gray';
    default: return 'badge badge-gray';
  }
}

export default function SessionsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const [showModal, setShowModal] = useState(searchParams.get('action') === 'add');
  const [selectedSessionId, setSelectedSessionId] = useState<Id<'sessions'> | null>(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  // Convex queries
  const sessions = useQuery(api.sessions.list, {});
  const courses = useQuery(api.courses.list, {});
  
  // Convex mutations
  const activateSession = useMutation(api.sessions.activate);
  const deactivateSession = useMutation(api.sessions.deactivate);

  const handleActivate = async (sessionId: Id<'sessions'>) => {
    try {
      await activateSession({ id: sessionId });
    } catch (err: any) {
      alert(err.message || 'Failed to activate session');
    }
  };

  const handleDeactivate = async (sessionId: Id<'sessions'>) => {
    try {
      await deactivateSession({ id: sessionId });
    } catch (err: any) {
      alert(err.message || 'Failed to deactivate session');
    }
  };

  const loading = sessions === undefined || courses === undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-lg font-medium text-gray-900">Class Sessions</h2>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          Create Session
        </button>
      </div>

      {/* Sessions List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No sessions found</div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const status = getSessionStatus(session);
            const location = session.roomNo 
              ? `${session.roomNo}${session.building ? ` (${session.building})` : ''}`
              : 'No location';
            return (
            <div key={session._id} className="card">
              <div className="card-body">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={getSessionStatusColor(status)}>
                        {status.toUpperCase()}
                      </span>
                      <h3 className="font-semibold text-gray-900">
                        {session.courseCode} - {session.courseName}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatDate(session.sessionDate)} | {formatTime(session.startTime)} -{' '}
                      {formatTime(session.endTime)} | {location}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {status === 'active' && session.attendanceCode && (
                      <AttendanceCodeBadge code={session.attendanceCode} />
                    )}

                    {status === 'scheduled' && (
                      <button
                        onClick={() => handleActivate(session._id)}
                        className="btn-primary btn-sm"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Start
                      </button>
                    )}

                    {status === 'active' && (
                      <button
                        onClick={() => handleDeactivate(session._id)}
                        className="btn-danger btn-sm"
                      >
                        <Square className="w-4 h-4 mr-1" />
                        End
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSelectedSessionId(session._id);
                        setShowAttendanceModal(true);
                      }}
                      className="btn-secondary btn-sm"
                    >
                      <Users className="w-4 h-4 mr-1" />
                      Attendance
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )})}
        </div>
      )}

      {/* Create Session Modal */}
      {showModal && courses && (
        <CreateSessionModal
          courses={courses}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && selectedSessionId && (
        <AttendanceModal
          sessionId={selectedSessionId}
          onClose={() => {
            setShowAttendanceModal(false);
            setSelectedSessionId(null);
          }}
        />
      )}
    </div>
  );
}

// Attendance Code Badge
function AttendanceCodeBadge({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
      <span className="font-mono font-bold text-green-700">{code}</span>
      <button
        onClick={handleCopy}
        className="text-green-600 hover:text-green-700"
        title="Copy code"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

// Create Session Modal
function CreateSessionModal({
  courses,
  onClose,
}: {
  courses: any[];
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    courseId: courses[0]?._id || '',
    sessionDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    roomNo: '',
    building: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createSession = useMutation(api.sessions.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await createSession({
        courseId: formData.courseId as Id<'courses'>,
        sessionDate: formData.sessionDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        roomNo: formData.roomNo || undefined,
        building: formData.building || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Create New Session
          </h2>

          {error && (
            <div className="alert-error mb-4">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Course</label>
              <select
                className="input"
                value={formData.courseId}
                onChange={(e) =>
                  setFormData({ ...formData, courseId: e.target.value as any })
                }
                required
              >
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.courseCode} - {course.courseName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Date</label>
              <input
                type="date"
                className="input"
                value={formData.sessionDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Start Time</label>
                <input
                  type="time"
                  className="input"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="label">End Time</label>
                <input
                  type="time"
                  className="input"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Room No</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Room 101"
                  value={formData.roomNo}
                  onChange={(e) =>
                    setFormData({ ...formData, roomNo: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">Building</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Main Building"
                  value={formData.building}
                  onChange={(e) =>
                    setFormData({ ...formData, building: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Creating...' : 'Create Session'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Attendance Modal
function AttendanceModal({
  sessionId,
  onClose,
}: {
  sessionId: Id<'sessions'>;
  onClose: () => void;
}) {
  const session = useQuery(api.sessions.getById, { id: sessionId });
  const attendance = useQuery(api.attendance.getBySession, { sessionId });

  const loading = attendance === undefined || session === undefined;

  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString();
  }

  function getAttendanceStatusColor(status: string): string {
    switch (status) {
      case 'present': return 'badge badge-success';
      case 'late': return 'badge badge-warning';
      case 'absent': return 'badge badge-danger';
      case 'excused': return 'badge badge-info';
      default: return 'badge badge-gray';
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Attendance Record
          </h2>
          {session && (
            <p className="text-gray-600 mb-4">
              {session.courseCode} - {session.courseName} | {session.sessionDate}
            </p>
          )}

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-600" />
              </div>
            ) : attendance.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No attendance records</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Status</th>
                    <th>Method</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {attendance.map((record) => (
                    <tr key={record._id}>
                      <td>
                        <div>
                          <p className="font-medium">{record.studentName}</p>
                          <p className="text-sm text-gray-500">
                            {record.studentRollNo}
                          </p>
                        </div>
                      </td>
                      <td>
                        <span className={getAttendanceStatusColor(record.status)}>
                          {record.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="text-sm text-gray-600">
                        {record.verificationMethod.replace('_', ' + ').toUpperCase()}
                      </td>
                      <td className="text-sm text-gray-600">
                        {formatTime(record.markedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-gray-200 mt-4">
            <span className="text-sm text-gray-600">
              {attendance?.filter((a) => a.status === 'present' || a.status === 'late').length || 0} /{' '}
              {attendance?.length || 0} present
            </span>
            <button onClick={onClose} className="btn-secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
