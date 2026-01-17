'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { Plus, Search, Users, AlertCircle, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/app/providers';

export default function CoursesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64">
      <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
    </div>}>
      <CoursesForm />
    </Suspense>
  );
}

function CoursesForm() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(searchParams.get('action') === 'add');
  const [selectedCourseId, setSelectedCourseId] = useState<Id<'courses'> | null>(null);
  const [showStudentsModal, setShowStudentsModal] = useState(false);

  // Convex queries
  const courses = useQuery(api.courses.list, {});

  // Convex mutations
  const deleteCourse = useMutation(api.courses.remove);

  const filteredCourses = courses?.filter(
    (course) =>
      course.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.courseCode.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleDelete = async (id: Id<'courses'>) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      await deleteCourse({ id });
    } catch (err: any) {
      alert(err.message || 'Failed to delete course');
    }
  };

  const loading = courses === undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          Add Course
        </button>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No courses found</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCourses.map((course) => (
            <div key={course._id} className="card">
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="badge badge-info mb-2">{course.courseCode}</span>
                    <h3 className="font-semibold text-gray-900">{course.courseName}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {course.department} {course.semester && `- Semester ${course.semester}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(course._id)}
                    className="btn-ghost btn-icon text-gray-400 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">View students</span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCourseId(course._id);
                      setShowStudentsModal(true);
                    }}
                    className="btn-ghost btn-sm text-blue-600"
                  >
                    Manage
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Course Modal */}
      {showModal && (
        <AddCourseModal
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Manage Students Modal */}
      {showStudentsModal && selectedCourseId && (
        <ManageStudentsModal
          courseId={selectedCourseId}
          onClose={() => {
            setShowStudentsModal(false);
            setSelectedCourseId(null);
          }}
        />
      )}
    </div>
  );
}

// Add Course Modal
function AddCourseModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    courseCode: '',
    courseName: '',
    department: '',
    semester: '1',
    collegeId: 'DEMO',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createCourse = useMutation(api.courses.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!user?.id) {
        throw new Error('User not found');
      }
      
      await createCourse({
        courseCode: formData.courseCode,
        courseName: formData.courseName,
        department: formData.department,
        facultyId: user.id as Id<'users'>,
        collegeId: formData.collegeId,
        semester: formData.semester,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Course</h2>

          {error && (
            <div className="alert-error mb-4">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Course Code</label>
              <input
                type="text"
                className="input"
                placeholder="CS101"
                value={formData.courseCode}
                onChange={(e) => setFormData({ ...formData, courseCode: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="label">Course Name</label>
              <input
                type="text"
                className="input"
                placeholder="Introduction to Computer Science"
                value={formData.courseName}
                onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Department</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Computer Science"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Semester</label>
                <select
                  className="input"
                  value={formData.semester}
                  onChange={(e) =>
                    setFormData({ ...formData, semester: e.target.value })
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
                {loading ? 'Creating...' : 'Create Course'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Manage Students Modal
function ManageStudentsModal({
  courseId,
  onClose,
}: {
  courseId: Id<'courses'>;
  onClose: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');

  // Convex queries
  const course = useQuery(api.courses.getById, { id: courseId });
  const enrolledStudents = useQuery(api.courses.getEnrolledStudents, { courseId });
  const allStudents = useQuery(api.students.list, {});

  // Convex mutations
  const enrollStudent = useMutation(api.courses.enrollStudent);
  const unenrollStudent = useMutation(api.courses.unenrollStudent);

  const loading = enrolledStudents === undefined || allStudents === undefined;

  const isEnrolled = (studentId: Id<'students'>) =>
    enrolledStudents?.some((s) => s._id === studentId) || false;

  const handleToggleEnrollment = async (studentId: Id<'students'>) => {
    try {
      if (isEnrolled(studentId)) {
        await unenrollStudent({ courseId, studentId });
      } else {
        await enrollStudent({ courseId, studentId });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update enrollment');
    }
  };

  const filteredStudents = allStudents?.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNo.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Manage Students
          </h2>
          {course && (
            <p className="text-gray-600 mb-4">
              {course.courseCode} - {course.courseName}
            </p>
          )}

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="space-y-2">
                {filteredStudents.map((student) => (
                  <div
                    key={student._id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{student.name}</p>
                      <p className="text-sm text-gray-500">{student.rollNo}</p>
                    </div>
                    <button
                      onClick={() => handleToggleEnrollment(student._id)}
                      className={
                        isEnrolled(student._id)
                          ? 'btn-danger btn-sm'
                          : 'btn-primary btn-sm'
                      }
                    >
                      {isEnrolled(student._id) ? 'Remove' : 'Add'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-gray-200 mt-4">
            <span className="text-sm text-gray-600">
              {enrolledStudents?.length || 0} students enrolled
            </span>
            <button onClick={onClose} className="btn-secondary">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
