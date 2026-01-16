import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - for authentication and roles
  users: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    fullName: v.string(),
    role: v.union(v.literal("admin"), v.literal("faculty"), v.literal("student")),
    isActive: v.boolean(),
    studentId: v.optional(v.id("students")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_student", ["studentId"]),

  // Students table - student profile and biometric data
  students: defineTable({
    rollNo: v.string(),
    name: v.string(),
    email: v.string(),
    department: v.string(),
    collegeId: v.string(),
    semester: v.optional(v.number()),
    // Face recognition data
    faceEmbedding: v.optional(v.array(v.number())), // 128-dimensional face embedding
    faceImageUrl: v.optional(v.string()), // Reference face image
    hasFaceData: v.boolean(),
    // Fingerprint data (simulated)
    fingerprintHash: v.optional(v.string()), // Simulated fingerprint hash
    hasFingerprint: v.boolean(),
    // QR Code for ID card
    qrCode: v.optional(v.string()),
    hasIdCard: v.boolean(),
    // Enrollment status
    isEnrolled: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_roll_no", ["rollNo"])
    .index("by_department", ["department"])
    .index("by_college", ["collegeId"]),

  // Courses table
  courses: defineTable({
    courseCode: v.string(),
    courseName: v.string(),
    department: v.string(),
    facultyId: v.id("users"),
    collegeId: v.string(),
    semester: v.optional(v.string()),
    academicYear: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_faculty", ["facultyId"])
    .index("by_department", ["department"])
    .index("by_code", ["courseCode"]),

  // Course enrollments - which students are in which courses
  courseEnrollments: defineTable({
    courseId: v.id("courses"),
    studentId: v.id("students"),
    enrolledAt: v.number(),
  })
    .index("by_course", ["courseId"])
    .index("by_student", ["studentId"])
    .index("by_course_student", ["courseId", "studentId"]),

  // Timetable entries - for auto-creating sessions
  timetable: defineTable({
    courseId: v.id("courses"),
    dayOfWeek: v.number(), // 0 = Sunday, 1 = Monday, etc.
    startTime: v.string(), // "09:00"
    endTime: v.string(), // "10:00"
    roomNo: v.optional(v.string()),
    building: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_course", ["courseId"])
    .index("by_day", ["dayOfWeek"]),

  // Sessions table - actual class instances
  sessions: defineTable({
    courseId: v.id("courses"),
    sessionDate: v.string(), // "2024-01-15"
    startTime: v.string(),
    endTime: v.string(),
    roomNo: v.optional(v.string()),
    building: v.optional(v.string()),
    isActive: v.boolean(), // Whether attendance can be marked
    attendanceCode: v.optional(v.string()), // 6-digit code for the session
    timetableId: v.optional(v.id("timetable")), // Reference to timetable if auto-created
    createdManually: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_course", ["courseId"])
    .index("by_date", ["sessionDate"])
    .index("by_code", ["attendanceCode"])
    .index("by_active", ["isActive"]),

  // Attendance records
  attendance: defineTable({
    studentId: v.id("students"),
    sessionId: v.id("sessions"),
    status: v.union(
      v.literal("present"),
      v.literal("absent"),
      v.literal("late"),
      v.literal("excused")
    ),
    // Verification details
    verificationMethod: v.union(
      v.literal("face_qr"),
      v.literal("fingerprint"),
      v.literal("manual")
    ),
    faceConfidence: v.optional(v.number()), // 0-100
    fingerprintMatch: v.optional(v.boolean()),
    qrScanned: v.optional(v.boolean()),
    overallConfidence: v.number(),
    // Metadata
    markedAt: v.number(),
    deviceInfo: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    isKiosk: v.boolean(), // Whether marked at kiosk or student app
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_student", ["studentId"])
    .index("by_session", ["sessionId"])
    .index("by_student_session", ["studentId", "sessionId"]),

  // Anomalies detected during attendance
  anomalies: defineTable({
    studentId: v.optional(v.id("students")),
    sessionId: v.optional(v.id("sessions")),
    anomalyType: v.union(
      v.literal("face_mismatch"),
      v.literal("liveness_failed"),
      v.literal("multiple_attempts"),
      v.literal("duplicate_attendance"),
      v.literal("location_mismatch"),
      v.literal("time_anomaly"),
      v.literal("proxy_suspected")
    ),
    severity: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),
    reason: v.string(),
    details: v.optional(v.string()),
    capturedImageUrl: v.optional(v.string()), // Image at time of anomaly
    isResolved: v.boolean(),
    resolvedBy: v.optional(v.id("users")),
    resolutionNotes: v.optional(v.string()),
    resolvedAt: v.optional(v.number()),
    attemptTime: v.number(),
    ipAddress: v.optional(v.string()),
    deviceInfo: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_student", ["studentId"])
    .index("by_session", ["sessionId"])
    .index("by_type", ["anomalyType"])
    .index("by_severity", ["severity"])
    .index("by_resolved", ["isResolved"]),

  // Auth sessions for JWT-like token management
  authSessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),

  // Allowed networks for attendance verification (IP-based)
  allowedNetworks: defineTable({
    name: v.string(),
    ipRange: v.string(), // CIDR notation e.g., "192.168.1.0/24" or single IP "192.168.1.1"
    location: v.string(), // e.g., "Main Campus", "Engineering Block"
    networkType: v.union(
      v.literal("campus"), // Permanent campus network (admin only)
      v.literal("temporary") // Temporary network like teacher's hotspot
    ),
    isActive: v.boolean(),
    addedBy: v.id("users"), // Admin or teacher who added this
    expiresAt: v.optional(v.number()), // For temporary networks
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_type", ["networkType"])
    .index("by_active", ["isActive"])
    .index("by_added_by", ["addedBy"]),
});
