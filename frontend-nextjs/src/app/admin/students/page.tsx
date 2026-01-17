'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import {
  Plus,
  Search,
  Camera,
  Fingerprint,
  X,
  AlertCircle,
  Check,
  Loader2,
  Copy,
  CheckCircle,
  Key,
  GraduationCap,
} from 'lucide-react';
import { enrollFingerprint } from '@/services/fingerprint';
import { initializeFaceAPI, extractFaceEmbedding, detectFaces, FaceErrorType } from '@/services/faceRecognition';
import Webcam from 'react-webcam';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function StudentsPage() {
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(searchParams.get('action') === 'add');
  const [selectedStudentId, setSelectedStudentId] = useState<Id<'students'> | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);

  // Convex queries
  const students = useQuery(api.students.list, {});

  // Convex mutations
  const deleteStudent = useMutation(api.students.remove);

  const filteredStudents = students?.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleDelete = async (id: Id<'students'>) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    try {
      await deleteStudent({ id });
    } catch (err: any) {
      alert(err.message || 'Failed to delete student');
    }
  };

  const loading = students === undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white border-slate-200"
          />
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-sky-600 hover:bg-sky-700 shadow-lg shadow-sky-600/25">
          <Plus className="w-5 h-5 mr-2" />
          Add Student
        </Button>
      </div>

      {/* Students Table */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Roll Number</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Semester</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Enrollment</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-sky-600" />
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    No students found
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center">
                          <GraduationCap className="w-5 h-5 text-sky-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{student.name}</p>
                          <p className="text-sm text-slate-500">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-slate-700">{student.rollNo}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-700">{student.department}</td>
                    <td className="px-6 py-4 text-slate-700">{student.semester || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center',
                            student.hasFaceData
                              ? 'bg-emerald-100 text-emerald-600'
                              : 'bg-slate-100 text-slate-400'
                          )}
                          title={student.hasFaceData ? 'Face Enrolled' : 'Face Not Enrolled'}
                        >
                          <Camera className="w-4 h-4" />
                        </span>
                        <span
                          className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center',
                            student.hasFingerprint
                              ? 'bg-emerald-100 text-emerald-600'
                              : 'bg-slate-100 text-slate-400'
                          )}
                          title={
                            student.hasFingerprint
                              ? 'Fingerprint Enrolled'
                              : 'Fingerprint Not Enrolled'
                          }
                        >
                          <Fingerprint className="w-4 h-4" />
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedStudentId(student._id);
                            setShowEnrollModal(true);
                          }}
                          className="h-8 w-8 text-sky-600 hover:bg-sky-50"
                          title="Enroll Biometrics"
                        >
                          <Camera className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(student._id)}
                          className="h-8 w-8 text-red-600 hover:bg-red-50"
                          title="Delete Student"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Student Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <AddStudentModal onClose={() => setShowModal(false)} />
        </DialogContent>
      </Dialog>

      {/* Enroll Modal */}
      <Dialog open={showEnrollModal && !!selectedStudentId} onOpenChange={(open) => { setShowEnrollModal(open); if (!open) setSelectedStudentId(null); }}>
        <DialogContent className="sm:max-w-lg">
          {selectedStudentId && (
            <EnrollModal
              studentId={selectedStudentId}
              onClose={() => {
                setShowEnrollModal(false);
                setSelectedStudentId(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Add Student Modal Component
function AddStudentModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    rollNo: '',
    department: '',
    semester: 1,
    collegeId: 'DEMO',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
    name: string;
    rollNo: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const createStudent = useMutation(api.students.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await createStudent({
        rollNo: formData.rollNo,
        name: formData.name,
        email: formData.email,
        department: formData.department,
        collegeId: formData.collegeId,
        semester: formData.semester,
      });
      
      setCreatedCredentials({
        email: formData.email,
        password: result.generatedPassword,
        name: formData.name,
        rollNo: formData.rollNo,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create student');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    
    const text = `Student Login Credentials
------------------------
Name: ${createdCredentials.name}
Roll No: ${createdCredentials.rollNo}
Email: ${createdCredentials.email}
Password: ${createdCredentials.password}

Note: The student can change their password after logging in.`;
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (createdCredentials) {
    return (
      <>
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <DialogTitle className="text-xl">Student Created Successfully!</DialogTitle>
          <p className="text-slate-600 mt-1">Share these credentials with the student</p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Name:</span>
              <span className="font-medium text-slate-900">{createdCredentials.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Roll No:</span>
              <span className="font-mono text-slate-900">{createdCredentials.rollNo}</span>
            </div>
            <hr className="border-slate-200" />
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Email:</span>
              <span className="font-medium text-slate-900">{createdCredentials.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 flex items-center gap-1">
                <Key className="w-4 h-4" />
                Password:
              </span>
              <span className="font-mono font-bold text-sky-600 bg-sky-50 px-2 py-1 rounded">
                {createdCredentials.password}
              </span>
            </div>
          </div>
        </div>

        <Alert className="mb-6 bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Important:</strong> Please save or share these credentials now. 
            The password won't be shown again.
          </AlertDescription>
        </Alert>

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleCopyCredentials} className="flex-1">
            {copied ? (
              <>
                <Check className="w-5 h-5 mr-2 text-emerald-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5 mr-2" />
                Copy to Clipboard
              </>
            )}
          </Button>
          <Button onClick={onClose} className="flex-1 bg-sky-600 hover:bg-sky-700">
            Done
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add New Student</DialogTitle>
      </DialogHeader>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Full Name</Label>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-1"
            required
          />
        </div>

        <div>
          <Label>Email</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="mt-1"
            required
          />
        </div>

        <div>
          <Label>Roll Number</Label>
          <Input
            type="text"
            value={formData.rollNo}
            onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
            placeholder="e.g., CS2024001"
            className="mt-1"
            required
          />
          <p className="text-xs text-slate-500 mt-1">
            Password will be auto-generated as: {formData.rollNo || 'RollNo'}@XXXX
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Department</Label>
            <Input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="e.g., Computer Science"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label>Semester</Label>
            <Select value={String(formData.semester)} onValueChange={(val) => setFormData({ ...formData, semester: parseInt(val) })}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <SelectItem key={sem} value={String(sem)}>
                    Semester {sem}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="bg-sky-600 hover:bg-sky-700">
            {loading ? 'Creating...' : 'Create Student'}
          </Button>
        </div>
      </form>
    </>
  );
}

// Enroll Modal Component
function EnrollModal({
  studentId,
  onClose,
}: {
  studentId: Id<'students'>;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'face' | 'fingerprint'>('face');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const webcamRef = useRef<Webcam>(null);
  const [faceApiReady, setFaceApiReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceStatus, setFaceStatus] = useState<string>('Initializing camera...');
  const [cameraActive, setCameraActive] = useState(false);
  const [showReenrollConfirm, setShowReenrollConfirm] = useState(false);

  const student = useQuery(api.students.getById, { id: studentId });
  const enrollFingerprintMutation = useMutation(api.students.enrollFingerprint);
  const enrollFaceMutation = useMutation(api.students.enrollFace);

  useEffect(() => {
    if (tab === 'face') {
      initializeFaceAPI().then((ready) => {
        setFaceApiReady(ready);
      });
    }
  }, [tab]);

  useEffect(() => {
    if (!cameraActive || !faceApiReady || tab !== 'face') return;

    const detectInterval = setInterval(async () => {
      const webcam = webcamRef.current;
      if (!webcam) return;
      
      const video = webcam.video;
      if (!video || video.readyState < 2 || video.videoWidth === 0) {
        setFaceStatus('Initializing camera...');
        return;
      }
      
      try {
        const detection = await detectFaces(video, { minFaceSize: 8 });
        
        if (detection.error) {
          setFaceDetected(false);
          switch (detection.error.type) {
            case FaceErrorType.NO_FACE:
              setFaceStatus('Position face in circle');
              break;
            case FaceErrorType.MULTIPLE_FACES:
              setFaceStatus('Only one face allowed');
              break;
            case FaceErrorType.FACE_TOO_SMALL:
              setFaceStatus('Move closer to camera');
              break;
            case FaceErrorType.POOR_LIGHTING:
              setFaceStatus('Improve lighting');
              break;
            default:
              setFaceStatus('Adjust position');
          }
        } else if (detection.detected && detection.count === 1) {
          setFaceDetected(true);
          setFaceStatus('Face detected - Ready to capture');
        } else {
          setFaceDetected(false);
          setFaceStatus('Position face in circle');
        }
      } catch (err) {
        console.warn('[FaceDetect] Detection error:', err);
        setFaceStatus('Detection error - retrying...');
      }
    }, 500);

    return () => clearInterval(detectInterval);
  }, [cameraActive, faceApiReady, tab]);

  const handleEnrollFace = async () => {
    const webcam = webcamRef.current;
    if (!webcam) {
      setError('Camera not available. Please ensure your camera is connected.');
      return;
    }

    const video = webcam.video;
    if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      setError('Camera is still initializing. Please wait a moment and try again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await extractFaceEmbedding(video);

      if (!result.success || !result.embedding) {
        const errorMsg = result.error 
          ? `${result.error.message}. ${result.error.suggestion}`
          : 'Failed to capture face. Please try again.';
        setError(errorMsg);
        setLoading(false);
        return;
      }
      
      await enrollFaceMutation({
        id: studentId,
        faceEmbedding: result.embedding,
      });

      setMessage('Face enrolled successfully!');
      setCameraActive(false);
      setTimeout(onClose, 1500);
    } catch (err: any) {
      console.error('[EnrollFace] Error:', err);
      setError(err.message || 'Failed to enroll face. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollFingerprint = async () => {
    if (!student) return;
    
    setLoading(true);
    setError('');
    
    try {
      const result = await enrollFingerprint(student.rollNo);
      
      if (result.success && result.hash) {
        await enrollFingerprintMutation({
          id: studentId,
          fingerprintHash: result.hash,
        });
        setMessage('Fingerprint enrolled successfully!');
        setTimeout(onClose, 1500);
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to enroll fingerprint');
    } finally {
      setLoading(false);
    }
  };

  if (!student) {
    return (
      <div className="p-6 text-center">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-sky-600" />
      </div>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Enroll Biometrics</DialogTitle>
        <p className="text-slate-600 text-sm">
          Student: {student.name} ({student.rollNo})
        </p>
      </DialogHeader>

      <Tabs value={tab} onValueChange={(val) => { setTab(val as 'face' | 'fingerprint'); setCameraActive(false); setError(''); setMessage(''); }}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="face" className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Face
          </TabsTrigger>
          <TabsTrigger value="fingerprint" className="flex items-center gap-2">
            <Fingerprint className="w-4 h-4" />
            Fingerprint
          </TabsTrigger>
        </TabsList>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {message && (
          <Alert className="mt-4 bg-emerald-50 border-emerald-200">
            <Check className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-800">{message}</AlertDescription>
          </Alert>
        )}

        <TabsContent value="face" className="mt-4">
          {!cameraActive ? (
            <div className="text-center py-8">
              <div className="w-32 h-32 bg-slate-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Camera className="w-12 h-12 text-slate-400" />
              </div>
              <p className="text-slate-600 mb-4">
                Capture the student's face for attendance verification.
              </p>
              <div className="flex items-center justify-center gap-2 mb-4">
                <Badge variant={student.hasFaceData ? 'default' : 'secondary'} className={student.hasFaceData ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}>
                  {student.hasFaceData ? 'Enrolled' : 'Not Enrolled'}
                </Badge>
              </div>
              {student.hasFaceData && !showReenrollConfirm ? (
                <div className="space-y-3">
                  <Alert className="bg-amber-50 border-amber-200 text-left">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      This student already has face data enrolled. Re-enrolling will replace the existing data.
                    </AlertDescription>
                  </Alert>
                  <Button variant="outline" onClick={() => setShowReenrollConfirm(true)}>
                    <Camera className="w-4 h-4 mr-2" />
                    Re-enroll Face
                  </Button>
                </div>
              ) : (
                <Button onClick={() => { setCameraActive(true); setShowReenrollConfirm(false); }} className="bg-sky-600 hover:bg-sky-700">
                  <Camera className="w-4 h-4 mr-2" />
                  {student.hasFaceData ? 'Continue Re-enrollment' : 'Start Camera'}
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-video">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  videoConstraints={{
                    width: 640,
                    height: 480,
                    facingMode: 'user',
                  }}
                  className="w-full h-full object-cover"
                  mirrored
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className={cn(
                      'w-32 h-40 border-4 rounded-full transition-colors',
                      faceDetected ? 'border-emerald-400' : 'border-white/50'
                    )}
                  />
                </div>
                <div className="absolute bottom-2 left-2 right-2">
                  <div
                    className={cn(
                      'px-2 py-1 rounded text-xs font-medium text-center',
                      faceDetected ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                    )}
                  >
                    {faceStatus}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={() => setCameraActive(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleEnrollFace}
                  disabled={!faceDetected || loading}
                  className={cn('flex-1', faceDetected && !loading ? 'bg-sky-600 hover:bg-sky-700' : '')}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-2" />
                      Capture & Save
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="fingerprint" className="mt-4">
          <div className="text-center py-8">
            <div className="w-32 h-32 bg-slate-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Fingerprint className="w-12 h-12 text-slate-400" />
            </div>
            
            <p className="text-slate-600 mb-4">
              Click below to enroll fingerprint for this student.
            </p>

            <div className="flex items-center justify-center gap-2 mb-4">
              <Badge variant={student.hasFingerprint ? 'default' : 'secondary'} className={student.hasFingerprint ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}>
                {student.hasFingerprint ? 'Enrolled' : 'Not Enrolled'}
              </Badge>
            </div>

            {student.hasFingerprint ? (
              <div className="space-y-3">
                <Alert className="bg-amber-50 border-amber-200 text-left">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    This student already has fingerprint data enrolled. Re-enrolling will replace the existing data.
                  </AlertDescription>
                </Alert>
                <Button variant="outline" onClick={handleEnrollFingerprint} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enrolling...
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4 mr-2" />
                      Re-enroll Fingerprint
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Button onClick={handleEnrollFingerprint} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enrolling...
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4 mr-2" />
                    Enroll Fingerprint
                  </>
                )}
              </Button>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-4 border-t border-slate-200 mt-4">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </>
  );
}
