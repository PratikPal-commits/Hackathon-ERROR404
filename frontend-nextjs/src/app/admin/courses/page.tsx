'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { Plus, Search, Users, AlertCircle, X, Loader2, BookOpen } from 'lucide-react';
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

export default function CoursesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64">
      <Loader2 className="w-12 h-12 animate-spin text-sky-600" />
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            type="text"
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white border-slate-200"
          />
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-sky-600 hover:bg-sky-700 shadow-lg shadow-sky-600/25">
          <Plus className="w-5 h-5 mr-2" />
          Add Course
        </Button>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-12 h-12 animate-spin text-sky-600" />
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="text-center py-12 text-slate-500">No courses found</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCourses.map((course) => (
            <Card key={course._id} className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 mb-2">{course.courseCode}</Badge>
                    <h3 className="font-semibold text-slate-900">{course.courseName}</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {course.department} {course.semester && `- Semester ${course.semester}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(course._id)}
                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">View students</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCourseId(course._id);
                      setShowStudentsModal(true);
                    }}
                    className="text-sky-600 hover:text-sky-700 hover:bg-sky-50"
                  >
                    Manage
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Course Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <AddCourseModal onClose={() => setShowModal(false)} />
        </DialogContent>
      </Dialog>

      {/* Manage Students Modal */}
      <Dialog open={showStudentsModal && !!selectedCourseId} onOpenChange={(open) => { setShowStudentsModal(open); if (!open) setSelectedCourseId(null); }}>
        <DialogContent className="sm:max-w-lg">
          {selectedCourseId && (
            <ManageStudentsModal
              courseId={selectedCourseId}
              onClose={() => {
                setShowStudentsModal(false);
                setSelectedCourseId(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
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
    <>
      <DialogHeader>
        <DialogTitle>Add New Course</DialogTitle>
      </DialogHeader>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Course Code</Label>
          <Input
            type="text"
            placeholder="CS101"
            value={formData.courseCode}
            onChange={(e) => setFormData({ ...formData, courseCode: e.target.value })}
            className="mt-1"
            required
          />
        </div>

        <div>
          <Label>Course Name</Label>
          <Input
            type="text"
            placeholder="Introduction to Computer Science"
            value={formData.courseName}
            onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
            className="mt-1"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Department</Label>
            <Input
              type="text"
              placeholder="Computer Science"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label>Semester</Label>
            <Select value={formData.semester} onValueChange={(val) => setFormData({ ...formData, semester: val })}>
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
            {loading ? 'Creating...' : 'Create Course'}
          </Button>
        </div>
      </form>
    </>
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
    <>
      <DialogHeader>
        <DialogTitle>Manage Students</DialogTitle>
        {course && (
          <p className="text-slate-600 text-sm">
            {course.courseCode} - {course.courseName}
          </p>
        )}
      </DialogHeader>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          type="text"
          placeholder="Search students..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-sky-600" />
          </div>
        ) : (
          <div className="space-y-2">
            {filteredStudents.map((student) => (
              <div
                key={student._id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
              >
                <div>
                  <p className="font-medium text-slate-900">{student.name}</p>
                  <p className="text-sm text-slate-500">{student.rollNo}</p>
                </div>
                <Button
                  variant={isEnrolled(student._id) ? 'destructive' : 'default'}
                  size="sm"
                  onClick={() => handleToggleEnrollment(student._id)}
                  className={isEnrolled(student._id) ? '' : 'bg-sky-600 hover:bg-sky-700'}
                >
                  {isEnrolled(student._id) ? 'Remove' : 'Add'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-slate-200 mt-4">
        <span className="text-sm text-slate-600">
          {enrolledStudents?.length || 0} students enrolled
        </span>
        <Button variant="outline" onClick={onClose}>
          Done
        </Button>
      </div>
    </>
  );
}
