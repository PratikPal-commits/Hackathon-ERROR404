import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Simple hash function for password (same as in seed.ts)
function simpleHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16) + "_hashed";
}

// Generate a simple password: rollNo@XXXX (4 random digits)
function generatePassword(rollNo: string): string {
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `${rollNo}@${randomDigits}`;
}

// Generate QR code data for student
function generateQRCode(rollNo: string, collegeId: string): string {
  return `SMARTATTEND:${collegeId}:${rollNo}:${Date.now()}`;
}

// Create a new student (creates both users and students records)
export const create = mutation({
  args: {
    rollNo: v.string(),
    name: v.string(),
    email: v.string(),
    department: v.string(),
    collegeId: v.string(),
    semester: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if email already exists in users table
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new Error("A user with this email already exists");
    }

    // Check if roll number already exists in students table
    const existingStudent = await ctx.db
      .query("students")
      .withIndex("by_roll_no", (q) => q.eq("rollNo", args.rollNo))
      .first();

    if (existingStudent) {
      throw new Error("Student with this roll number already exists");
    }

    // Generate password: rollNo@XXXX
    const generatedPassword = generatePassword(args.rollNo);
    const passwordHash = simpleHash(generatedPassword);

    const now = Date.now();
    const qrCode = generateQRCode(args.rollNo, args.collegeId);

    // 1. Create students record first
    const studentId = await ctx.db.insert("students", {
      rollNo: args.rollNo,
      name: args.name,
      email: args.email,
      department: args.department,
      collegeId: args.collegeId,
      semester: args.semester,
      hasFaceData: false,
      hasFingerprint: false,
      hasIdCard: true,
      qrCode,
      isEnrolled: false,
      createdAt: now,
      updatedAt: now,
    });

    // 2. Create users record with link to student
    await ctx.db.insert("users", {
      email: args.email,
      passwordHash,
      fullName: args.name,
      role: "student",
      isActive: true,
      studentId,
      createdAt: now,
      updatedAt: now,
    });

    // Return both studentId and the generated password for teacher to share
    return { 
      studentId, 
      generatedPassword,
      message: `Student created successfully. Password: ${generatedPassword}`
    };
  },
});

// Get all students
export const list = query({
  args: {
    department: v.optional(v.string()),
    semester: v.optional(v.number()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let students = await ctx.db.query("students").collect();

    if (args.department) {
      students = students.filter((s) => s.department === args.department);
    }

    if (args.semester) {
      students = students.filter((s) => s.semester === args.semester);
    }

    if (args.search) {
      const searchLower = args.search.toLowerCase();
      students = students.filter(
        (s) =>
          s.name.toLowerCase().includes(searchLower) ||
          s.rollNo.toLowerCase().includes(searchLower) ||
          s.email.toLowerCase().includes(searchLower)
      );
    }

    return students;
  },
});

// Get student by ID
export const getById = query({
  args: { id: v.id("students") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get student by roll number
export const getByRollNo = query({
  args: { rollNo: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("students")
      .withIndex("by_roll_no", (q) => q.eq("rollNo", args.rollNo))
      .first();
  },
});

// Get student by email
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("students")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Get student by QR code data
export const getByQRCode = query({
  args: { qrData: v.string() },
  handler: async (ctx, args) => {
    // Parse QR code data: SMARTATTEND:collegeId:rollNo:timestamp
    const parts = args.qrData.split(":");
    if (parts.length < 3 || parts[0] !== "SMARTATTEND") {
      return null;
    }

    const rollNo = parts[2];
    return await ctx.db
      .query("students")
      .withIndex("by_roll_no", (q) => q.eq("rollNo", rollNo))
      .first();
  },
});

// Update student (also syncs changes to linked user account)
export const update = mutation({
  args: {
    id: v.id("students"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    department: v.optional(v.string()),
    semester: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const student = await ctx.db.get(id);
    
    if (!student) {
      throw new Error("Student not found");
    }

    // If email is being changed, check it's not already taken
    if (updates.email && updates.email !== student.email) {
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", updates.email!))
        .first();

      if (existingUser) {
        throw new Error("A user with this email already exists");
      }
    }

    // Update student record
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    // Sync changes to linked user account
    const linkedUser = await ctx.db
      .query("users")
      .withIndex("by_student", (q) => q.eq("studentId", id))
      .first();

    if (linkedUser) {
      const userUpdates: { fullName?: string; email?: string; updatedAt: number } = {
        updatedAt: Date.now(),
      };

      if (updates.name) {
        userUpdates.fullName = updates.name;
      }
      if (updates.email) {
        userUpdates.email = updates.email;
      }

      await ctx.db.patch(linkedUser._id, userUpdates);
    }

    return await ctx.db.get(id);
  },
});

// Delete student (also deletes linked user account)
export const remove = mutation({
  args: { id: v.id("students") },
  handler: async (ctx, args) => {
    // Find and delete linked user account
    const linkedUser = await ctx.db
      .query("users")
      .withIndex("by_student", (q) => q.eq("studentId", args.id))
      .first();

    if (linkedUser) {
      // Also delete any auth sessions for this user
      const authSessions = await ctx.db
        .query("authSessions")
        .withIndex("by_user", (q) => q.eq("userId", linkedUser._id))
        .collect();
      
      for (const session of authSessions) {
        await ctx.db.delete(session._id);
      }

      await ctx.db.delete(linkedUser._id);
    }

    // Delete course enrollments for this student
    const enrollments = await ctx.db
      .query("courseEnrollments")
      .withIndex("by_student", (q) => q.eq("studentId", args.id))
      .collect();

    for (const enrollment of enrollments) {
      await ctx.db.delete(enrollment._id);
    }

    // Delete attendance records for this student
    const attendanceRecords = await ctx.db
      .query("attendance")
      .withIndex("by_student", (q) => q.eq("studentId", args.id))
      .collect();

    for (const record of attendanceRecords) {
      await ctx.db.delete(record._id);
    }

    // Delete anomalies for this student
    const anomalies = await ctx.db
      .query("anomalies")
      .withIndex("by_student", (q) => q.eq("studentId", args.id))
      .collect();

    for (const anomaly of anomalies) {
      await ctx.db.delete(anomaly._id);
    }

    // Finally delete the student
    await ctx.db.delete(args.id);
    
    return { success: true, message: "Student and all related data deleted" };
  },
});

// Enroll face data for student
export const enrollFace = mutation({
  args: {
    id: v.id("students"),
    faceEmbedding: v.array(v.number()),
    faceImageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const student = await ctx.db.get(args.id);
    if (!student) {
      throw new Error("Student not found");
    }

    await ctx.db.patch(args.id, {
      faceEmbedding: args.faceEmbedding,
      faceImageUrl: args.faceImageUrl,
      hasFaceData: true,
      isEnrolled: true,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Face enrolled successfully" };
  },
});

// Enroll fingerprint for student (simulated)
export const enrollFingerprint = mutation({
  args: {
    id: v.id("students"),
    fingerprintHash: v.string(),
  },
  handler: async (ctx, args) => {
    const student = await ctx.db.get(args.id);
    if (!student) {
      throw new Error("Student not found");
    }

    await ctx.db.patch(args.id, {
      fingerprintHash: args.fingerprintHash,
      hasFingerprint: true,
      isEnrolled: true,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Fingerprint enrolled successfully" };
  },
});

// Get enrollment status
export const getEnrollmentStatus = query({
  args: { id: v.id("students") },
  handler: async (ctx, args) => {
    const student = await ctx.db.get(args.id);
    if (!student) {
      return null;
    }

    return {
      faceEnrolled: student.hasFaceData,
      fingerprintEnrolled: student.hasFingerprint,
      idCardEnrolled: student.hasIdCard,
      isFullyEnrolled: student.isEnrolled,
    };
  },
});

// Get students for a course
export const getByCourse = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const enrollments = await ctx.db
      .query("courseEnrollments")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    const students = await Promise.all(
      enrollments.map((e) => ctx.db.get(e.studentId))
    );

    return students.filter((s) => s !== null);
  },
});

// Get student attendance report
export const getAttendanceReport = query({
  args: { id: v.id("students") },
  handler: async (ctx, args) => {
    const student = await ctx.db.get(args.id);
    if (!student) {
      throw new Error("Student not found");
    }

    const attendanceRecords = await ctx.db
      .query("attendance")
      .withIndex("by_student", (q) => q.eq("studentId", args.id))
      .collect();

    // Get session and course details for each record
    const records = await Promise.all(
      attendanceRecords.map(async (att) => {
        const session = await ctx.db.get(att.sessionId);
        if (!session) return null;
        
        const course = await ctx.db.get(session.courseId);
        if (!course) return null;

        return {
          sessionId: att.sessionId,
          courseId: session.courseId,
          courseName: course.courseName,
          courseCode: course.courseCode,
          sessionDate: session.sessionDate,
          status: att.status,
          verificationMethod: att.verificationMethod,
          markedAt: att.markedAt,
        };
      })
    );

    const validRecords = records.filter((r) => r !== null);
    const presentCount = validRecords.filter(
      (r) => r!.status === "present" || r!.status === "late"
    ).length;

    return {
      studentId: args.id,
      studentName: student.name,
      rollNo: student.rollNo,
      totalSessions: validRecords.length,
      attendedSessions: presentCount,
      attendancePercentage:
        validRecords.length > 0
          ? (presentCount / validRecords.length) * 100
          : 0,
      records: validRecords,
    };
  },
});
