'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { enrollFingerprint } from '@/services/fingerprint';

function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          Add Student
        </button>
      </div>

      {/* Students Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll Number</th>
                <th>Department</th>
                <th>Semester</th>
                <th>Enrollment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-600" />
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    No students found
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student._id}>
                    <td>
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-gray-500">{student.email}</p>
                      </div>
                    </td>
                    <td>{student.rollNo}</td>
                    <td>{student.department}</td>
                    <td>{student.semester || '-'}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'w-6 h-6 rounded flex items-center justify-center',
                            student.hasFaceData
                              ? 'bg-green-100 text-green-600'
                              : 'bg-gray-100 text-gray-400'
                          )}
                          title={student.hasFaceData ? 'Face Enrolled' : 'Face Not Enrolled'}
                        >
                          <Camera className="w-4 h-4" />
                        </span>
                        <span
                          className={cn(
                            'w-6 h-6 rounded flex items-center justify-center',
                            student.hasFingerprint
                              ? 'bg-green-100 text-green-600'
                              : 'bg-gray-100 text-gray-400'
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
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedStudentId(student._id);
                            setShowEnrollModal(true);
                          }}
                          className="btn-ghost btn-sm"
                          title="Enroll Biometrics"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(student._id)}
                          className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      {showModal && (
        <AddStudentModal
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Enroll Modal */}
      {showEnrollModal && selectedStudentId && (
        <EnrollModal
          studentId={selectedStudentId}
          onClose={() => {
            setShowEnrollModal(false);
            setSelectedStudentId(null);
          }}
        />
      )}
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
  
  // State for showing credentials after creation
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
      
      // Show credentials modal instead of closing
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

  // Show credentials screen after successful creation
  if (createdCredentials) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Student Created Successfully!</h2>
              <p className="text-gray-600 mt-1">Share these credentials with the student</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium text-gray-900">{createdCredentials.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Roll No:</span>
                  <span className="font-medium text-gray-900">{createdCredentials.rollNo}</span>
                </div>
                <hr className="border-gray-200" />
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium text-gray-900">{createdCredentials.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Key className="w-4 h-4" />
                    Password:
                  </span>
                  <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {createdCredentials.password}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Please save or share these credentials now. 
                The password won't be shown again. The student can change their password after logging in.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCopyCredentials}
                className="flex-1 btn-secondary flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copy to Clipboard
                  </>
                )}
              </button>
              <button onClick={onClose} className="flex-1 btn-primary">
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Student</h2>

          {error && (
            <div className="alert-error mb-4">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                className="input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="label">Roll Number</label>
              <input
                type="text"
                className="input"
                value={formData.rollNo}
                onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                placeholder="e.g., CS2024001"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Password will be auto-generated as: {formData.rollNo || 'RollNo'}@XXXX
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Department</label>
                <input
                  type="text"
                  className="input"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g., Computer Science"
                  required
                />
              </div>
              <div>
                <label className="label">Semester</label>
                <select
                  className="input"
                  value={formData.semester}
                  onChange={(e) =>
                    setFormData({ ...formData, semester: parseInt(e.target.value) })
                  }
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <option key={sem} value={sem}>
                      {sem}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Creating...' : 'Create Student'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
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

  const student = useQuery(api.students.getById, { id: studentId });
  const enrollFingerprintMutation = useMutation(api.students.enrollFingerprint);

  function cn(...classes: (string | boolean | undefined)[]): string {
    return classes.filter(Boolean).join(' ');
  }

  const handleEnrollFingerprint = async () => {
    if (!student) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Use the fingerprint service to capture
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
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
          <div className="p-6 text-center">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Enroll Biometrics
          </h2>
          <p className="text-gray-600 mb-4">
            Student: {student.name} ({student.rollNo})
          </p>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-4">
            <button
              onClick={() => setTab('face')}
              className={cn(
                'px-4 py-2 font-medium border-b-2 -mb-px',
                tab === 'face'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <Camera className="w-4 h-4 inline mr-2" />
              Face
            </button>
            <button
              onClick={() => setTab('fingerprint')}
              className={cn(
                'px-4 py-2 font-medium border-b-2 -mb-px',
                tab === 'fingerprint'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <Fingerprint className="w-4 h-4 inline mr-2" />
              Fingerprint
            </button>
          </div>

          {error && (
            <div className="alert-error mb-4">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="alert-success mb-4">
              <Check className="w-5 h-5" />
              <span>{message}</span>
            </div>
          )}

          {tab === 'face' ? (
            <div className="text-center py-8">
              <div className="w-32 h-32 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Camera className="w-12 h-12 text-gray-400" />
              </div>
              <p className="text-gray-600 mb-4">
                Face enrollment requires the webcam component.
                <br />
                Go to the Kiosk page to capture face images.
              </p>
              <div className="flex items-center justify-center gap-2">
                <span
                  className={cn(
                    'badge',
                    student.hasFaceData ? 'badge-success' : 'badge-gray'
                  )}
                >
                  {student.hasFaceData ? 'Enrolled' : 'Not Enrolled'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-32 h-32 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Fingerprint className="w-12 h-12 text-gray-400" />
              </div>
              <p className="text-gray-600 mb-4">
                Fingerprint enrollment uses simulated tokens.
                <br />
                Click below to generate a fingerprint token.
              </p>
              <button
                onClick={handleEnrollFingerprint}
                disabled={loading || student.hasFingerprint}
                className="btn-primary"
              >
                {loading
                  ? 'Enrolling...'
                  : student.hasFingerprint
                  ? 'Already Enrolled'
                  : 'Enroll Fingerprint'}
              </button>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-gray-200 mt-4">
            <button onClick={onClose} className="btn-secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
