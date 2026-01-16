// User Types
// Backend returns lowercase roles: 'admin', 'faculty', 'student'
export type UserRole = 'admin' | 'faculty' | 'student' | 'teacher' | 'ADMIN' | 'FACULTY' | 'STUDENT';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  student_id?: number | null;
  created_at: string;
  updated_at: string;
}

// Student Types
export interface Student {
  id: number;
  roll_no: string;
  name: string;
  email: string;
  department: string;
  college_id: string;
  // Backend returns these as has_face_data, has_fingerprint, has_id_card
  has_face_data?: boolean;
  has_fingerprint?: boolean;
  has_id_card?: boolean;
  // Legacy fields for compatibility
  face_embedding?: string | null;
  fingerprint_hash?: string | null;
  id_card_data?: string | null;
  is_enrolled: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentCreateInput {
  roll_no: string;
  name: string;
  email: string;
  department: string;
  college_id: string;
}

// Course Types
export interface Course {
  id: number;
  course_code: string;
  course_name: string;
  department: string;
  faculty_id: number;
  college_id: string;
  semester?: string | null;
  academic_year?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseCreateInput {
  course_code: string;
  course_name: string;
  department: string;
  college_id: string;
  semester?: string;
  academic_year?: string;
}

// Session Types
export interface Session {
  id: number;
  course_id: number;
  session_date: string;
  start_time: string;
  end_time: string;
  room_no?: string | null;
  building?: string | null;
  is_active: boolean;
  attendance_code?: string | null;
  course_name?: string;
  course_code?: string;
  created_at: string;
  updated_at: string;
}

// Helper to derive status from session
export function getSessionStatus(session: Session): 'active' | 'scheduled' | 'completed' {
  if (session.is_active) return 'active';
  const today = new Date().toISOString().split('T')[0];
  if (session.session_date >= today) return 'scheduled';
  return 'completed';
}

// Helper to derive location from session
export function getSessionLocation(session: Session): string {
  if (session.building && session.room_no) {
    return `${session.building} ${session.room_no}`;
  }
  if (session.room_no) return session.room_no;
  if (session.building) return session.building;
  return 'No location';
}

export interface SessionCreateInput {
  course_id: number;
  session_date: string;
  start_time: string;
  end_time: string;
  room_no?: string;
  building?: string;
}

// Attendance Types
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
export type VerificationMethod = 'face_qr' | 'fingerprint' | 'manual';

export interface Attendance {
  id: number;
  student_id: number;
  session_id: number;
  status: AttendanceStatus;
  face_confidence?: number | null;
  id_card_confidence?: number | null;
  fingerprint_match?: boolean | null;
  overall_confidence: number;
  verification_method?: string | null;
  marked_at: string;
  device_info?: string | null;
  ip_address?: string | null;
  student?: Student;
  session?: Session;
  student_name?: string;
  student_roll_no?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceMarkInput {
  session_code: string;
  verification_method: VerificationMethod;
  qr_data?: string;
  face_image?: string;
  fingerprint_token?: string;
  liveness_data?: LivenessData;
}

export interface LivenessData {
  blink_detected: boolean;
  movement_detected: boolean;
  frames_captured: number;
}

// Anomaly Types
export type AnomalyType = 
  | 'face_mismatch'
  | 'liveness_failed'
  | 'multiple_attempts'
  | 'location_mismatch'
  | 'time_anomaly'
  | 'proxy_suspected';

export type AnomalyStatus = 'pending' | 'resolved' | 'dismissed';

export interface Anomaly {
  id: number;
  student_id?: number | null;
  session_id?: number | null;
  anomaly_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  details?: string | null;
  is_resolved: boolean;
  resolved_by?: number | null;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  attempt_time: string;
  ip_address?: string | null;
  device_info?: string | null;
  student?: Student;
  session?: Session;
  created_at: string;
  updated_at: string;
}

// Analytics Types
export interface AttendanceStats {
  total_sessions: number;
  total_present: number;
  total_absent: number;
  total_late: number;
  attendance_rate: number;
}

export interface CourseAnalytics {
  course: Course;
  stats: AttendanceStats;
  recent_sessions: Session[];
  low_attendance_students: {
    student: Student;
    attendance_rate: number;
  }[];
}

export interface DashboardStats {
  total_students: number;
  total_courses: number;
  active_sessions: number;
  today_attendance_rate: number;
  recent_anomalies: DashboardAnomaly[];
  upcoming_sessions: DashboardSession[];
}

export interface DashboardAnomaly {
  id: number;
  anomaly_type: string;
  severity: string;
  reason: string;
  attempt_time: string;
  student_id?: number;
  session_id?: number;
  is_resolved: boolean;
  student_name?: string;
  student_roll_no?: string;
}

export interface DashboardSession {
  id: number;
  course_id: number;
  course_name?: string;
  course_code?: string;
  session_date: string;
  start_time: string;
  end_time: string;
  room_no?: string;
  building?: string;
  is_active: boolean;
}

// Backend returns this format for student attendance report
export interface StudentAttendanceRecord {
  session_id: number;
  course_id: number;
  course_name: string;
  course_code: string;
  session_date: string;
  status: string;
  verification_method?: string | null;
  marked_at: string;
}

export interface StudentAttendanceReport {
  student_id: number;
  student_name: string;
  roll_no: string;
  total_sessions: number;
  attended_sessions: number;
  attendance_percentage: number;
  records: StudentAttendanceRecord[];
}

// Derived type for course-wise stats (computed from records)
export interface CourseAttendanceStats {
  course_id: number;
  course_code: string;
  course_name: string;
  total_sessions: number;
  total_present: number;
  total_absent: number;
  attendance_rate: number;
}

// Helper function to compute course-wise stats from records
export function computeCourseStats(report: StudentAttendanceReport): CourseAttendanceStats[] {
  const courseMap = new Map<number, { code: string; name: string; present: number; total: number }>();
  
  for (const record of report.records) {
    if (!courseMap.has(record.course_id)) {
      courseMap.set(record.course_id, {
        code: record.course_code,
        name: record.course_name,
        present: 0,
        total: 0,
      });
    }
    const stats = courseMap.get(record.course_id)!;
    stats.total += 1;
    if (record.status === 'present' || record.status === 'late' || record.status === 'PRESENT' || record.status === 'LATE') {
      stats.present += 1;
    }
  }
  
  return Array.from(courseMap.entries()).map(([course_id, stats]) => ({
    course_id,
    course_code: stats.code,
    course_name: stats.name,
    total_sessions: stats.total,
    total_present: stats.present,
    total_absent: stats.total - stats.present,
    attendance_rate: stats.total > 0 ? (stats.present / stats.total) * 100 : 0,
  }));
}

// Enrollment Types
export interface EnrollmentResult {
  success: boolean;
  message: string;
  enrollment_type?: 'face' | 'fingerprint';
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Auth Types
export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  full_name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Form State Types
export interface FormState {
  isSubmitting: boolean;
  error: string | null;
  success: string | null;
}

// Filter Types
export interface AttendanceFilters {
  course_id?: number;
  date_from?: string;
  date_to?: string;
  status?: AttendanceStatus;
}

export interface StudentFilters {
  department?: string;
  semester?: number;
  search?: string;
}

// Kiosk Types
export interface KioskSession {
  id: number;
  course_id: number;
  course_name: string;
  course_code: string;
  session_date: string;
  start_time: string;
  end_time: string;
  room_no?: string | null;
  building?: string | null;
}

export interface VerificationResult {
  success: boolean;
  message: string;
  student?: Student;
  attendance?: Attendance;
  anomaly_detected?: boolean;
  anomaly_type?: AnomalyType;
}
