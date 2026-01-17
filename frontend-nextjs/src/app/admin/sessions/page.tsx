'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { Plus, Play, Square, AlertCircle, Copy, Check, Users, Loader2, Calendar, Clock } from 'lucide-react';
import { useAuth } from '@/app/providers';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function SessionsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64">
      <Loader2 className="w-12 h-12 animate-spin text-sky-600" />
    </div>}>
      <SessionsForm />
    </Suspense>
  );
}

function SessionsForm() {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Sessions Management</h2>
          <p className="text-slate-600">Manage all class sessions across courses</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-sky-600 hover:bg-sky-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Session
        </Button>
      </div>

      {/* Sessions List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-12 h-12 animate-spin text-sky-600" />
        </div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-slate-500">No sessions found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const status = getSessionStatus(session);
            const location = session.roomNo
              ? `${session.roomNo}${session.building ? ` (${session.building})` : ''}`
              : 'No location';
            return (
              <Card key={session._id}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge
                          variant={status === 'active' ? 'default' : status === 'completed' ? 'secondary' : 'outline'}
                          className={cn(
                            status === 'active' && 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
                            status === 'completed' && 'bg-slate-100 text-slate-700 hover:bg-slate-100'
                          )}
                        >
                          {status.toUpperCase()}
                        </Badge>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {session.courseCode} - {session.courseName}
                        </h3>
                      </div>
                      <div className="text-sm text-slate-600 space-y-1">
                        <p><Calendar className="w-4 h-4 inline mr-1" />{formatDate(session.sessionDate)}</p>
                        <p><Clock className="w-4 h-4 inline mr-1" />{formatTime(session.startTime)} - {formatTime(session.endTime)}</p>
                        <p className="text-slate-500">Location: {location}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {status === 'active' && session.attendanceCode && (
                        <AttendanceCodeBadge code={session.attendanceCode} />
                      )}

                      {status === 'scheduled' && (
                        <Button
                          onClick={() => handleActivate(session._id)}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Start
                        </Button>
                      )}

                      {status === 'active' && (
                        <Button
                          onClick={() => handleDeactivate(session._id)}
                          size="sm"
                          variant="destructive"
                        >
                          <Square className="w-4 h-4 mr-1" />
                          End
                        </Button>
                      )}

                      <Button
                        onClick={() => {
                          setSelectedSessionId(session._id);
                          setShowAttendanceModal(true);
                        }}
                        size="sm"
                        variant="outline"
                      >
                        <Users className="w-4 h-4 mr-1" />
                        Attendance
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Session Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          {courses && (
            <CreateSessionModal
              courses={courses}
              onClose={() => setShowModal(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Attendance Modal */}
      <Dialog open={showAttendanceModal} onOpenChange={setShowAttendanceModal}>
        <DialogContent className="max-w-4xl">
          {selectedSessionId && (
            <AttendanceModal
              sessionId={selectedSessionId}
              onClose={() => {
                setShowAttendanceModal(false);
                setSelectedSessionId(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
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
    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
      <span className="font-mono font-bold text-emerald-700">{code}</span>
      <button
        onClick={handleCopy}
        className="text-emerald-600 hover:text-emerald-700"
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
    <>
      <DialogHeader>
        <DialogTitle>Create New Session</DialogTitle>
      </DialogHeader>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Course</Label>
          <Select value={formData.courseId} onValueChange={(val) => setFormData({ ...formData, courseId: val })}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course._id} value={course._id}>
                  {course.courseCode} - {course.courseName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Date</Label>
          <Input
            type="date"
            value={formData.sessionDate}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })}
            className="mt-1"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Start Time</Label>
            <Input
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label>End Time</Label>
            <Input
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              className="mt-1"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Room No</Label>
            <Input
              type="text"
              placeholder="Room 101"
              value={formData.roomNo}
              onChange={(e) => setFormData({ ...formData, roomNo: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Building</Label>
            <Input
              type="text"
              placeholder="Main Building"
              value={formData.building}
              onChange={(e) => setFormData({ ...formData, building: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="bg-sky-600 hover:bg-sky-700">
            {loading ? 'Creating...' : 'Create Session'}
          </Button>
        </div>
      </form>
    </>
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

  function formatTimeStamp(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Attendance Record</DialogTitle>
        {session && (
          <p className="text-slate-600 text-sm">
            {session.courseCode} - {session.courseName} | {session.sessionDate}
          </p>
        )}
      </DialogHeader>

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-sky-600" />
          </div>
        ) : attendance.length === 0 ? (
          <p className="text-center py-8 text-slate-500">No attendance records</p>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Student</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Method</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {attendance.map((record) => (
                <tr key={record._id}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{record.studentName}</p>
                      <p className="text-sm text-slate-500">{record.studentRollNo}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge 
                      variant={record.status === 'present' ? 'default' : record.status === 'late' ? 'secondary' : 'destructive'}
                      className={cn(
                        record.status === 'present' && 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
                        record.status === 'late' && 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                      )}
                    >
                      {record.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {record.verificationMethod.replace('_', ' + ').toUpperCase()}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {formatTimeStamp(record.markedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-slate-200 mt-4">
        <span className="text-sm text-slate-600">
          {attendance?.filter((a) => a.status === 'present' || a.status === 'late').length || 0} /{' '}
          {attendance?.length || 0} present
        </span>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </>
  );
}
