import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Mark attendance
export const mark = mutation({
  args: {
    sessionCode: v.string(),
    studentId: v.id("students"),
    verificationMethod: v.union(
      v.literal("face_qr"),
      v.literal("fingerprint"),
      v.literal("manual")
    ),
    faceConfidence: v.optional(v.number()),
    fingerprintMatch: v.optional(v.boolean()),
    qrScanned: v.optional(v.boolean()),
    deviceInfo: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    isKiosk: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Find session by code
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_code", (q) => q.eq("attendanceCode", args.sessionCode))
      .first();

    if (!session) {
      throw new Error("Invalid session code");
    }

    if (!session.isActive) {
      throw new Error("Session is not active for attendance");
    }

    // Check for duplicate attendance
    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_student_session", (q) =>
        q.eq("studentId", args.studentId).eq("sessionId", session._id)
      )
      .first();

    if (existing) {
      // Log anomaly for duplicate attempt
      await ctx.db.insert("anomalies", {
        studentId: args.studentId,
        sessionId: session._id,
        anomalyType: "duplicate_attendance",
        severity: "medium",
        reason: "Student attempted to mark attendance again",
        isResolved: false,
        attemptTime: Date.now(),
        ipAddress: args.ipAddress,
        deviceInfo: args.deviceInfo,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      throw new Error("Attendance already marked for this session");
    }

    // Check if student is enrolled in the course
    const enrollment = await ctx.db
      .query("courseEnrollments")
      .withIndex("by_course_student", (q) =>
        q.eq("courseId", session.courseId).eq("studentId", args.studentId)
      )
      .first();

    if (!enrollment) {
      throw new Error("Student is not enrolled in this course");
    }

    // Calculate overall confidence
    let overallConfidence = 0;
    if (args.verificationMethod === "face_qr") {
      overallConfidence = args.faceConfidence || 0;
      if (args.qrScanned) overallConfidence = Math.min(100, overallConfidence + 10);
    } else if (args.verificationMethod === "fingerprint") {
      overallConfidence = args.fingerprintMatch ? 95 : 0;
    } else {
      overallConfidence = 100; // Manual entry by teacher
    }

    // Determine status based on time
    const now = new Date();
    const sessionStart = new Date(`${session.sessionDate}T${session.startTime}`);
    const lateThreshold = new Date(sessionStart.getTime() + 15 * 60 * 1000); // 15 minutes

    let status: "present" | "late" = "present";
    if (now > lateThreshold) {
      status = "late";
    }

    const attendanceId = await ctx.db.insert("attendance", {
      studentId: args.studentId,
      sessionId: session._id,
      status,
      verificationMethod: args.verificationMethod,
      faceConfidence: args.faceConfidence,
      fingerprintMatch: args.fingerprintMatch,
      qrScanned: args.qrScanned,
      overallConfidence,
      markedAt: Date.now(),
      deviceInfo: args.deviceInfo,
      ipAddress: args.ipAddress,
      isKiosk: args.isKiosk,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Get student info for response
    const student = await ctx.db.get(args.studentId);

    return {
      success: true,
      message: `Attendance marked as ${status}`,
      attendanceId,
      student: student
        ? { name: student.name, rollNo: student.rollNo }
        : null,
      status,
    };
  },
});

// Mark attendance manually (by teacher)
export const markManual = mutation({
  args: {
    sessionId: v.id("sessions"),
    studentId: v.id("students"),
    status: v.union(
      v.literal("present"),
      v.literal("absent"),
      v.literal("late"),
      v.literal("excused")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    // Check for existing attendance
    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_student_session", (q) =>
        q.eq("studentId", args.studentId).eq("sessionId", args.sessionId)
      )
      .first();

    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        status: args.status,
        verificationMethod: "manual",
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    // Create new attendance record
    const attendanceId = await ctx.db.insert("attendance", {
      studentId: args.studentId,
      sessionId: args.sessionId,
      status: args.status,
      verificationMethod: "manual",
      overallConfidence: 100,
      markedAt: Date.now(),
      isKiosk: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return attendanceId;
  },
});

// Get attendance for a session
export const getBySession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const attendances = await ctx.db
      .query("attendance")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const attendancesWithStudent = await Promise.all(
      attendances.map(async (att) => {
        const student = await ctx.db.get(att.studentId);
        return {
          ...att,
          studentName: student?.name || "Unknown",
          studentRollNo: student?.rollNo || "Unknown",
        };
      })
    );

    return attendancesWithStudent;
  },
});

// Get attendance for a student
export const getByStudent = query({
  args: {
    studentId: v.id("students"),
    courseId: v.optional(v.id("courses")),
  },
  handler: async (ctx, args) => {
    const attendances = await ctx.db
      .query("attendance")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .collect();

    const attendancesWithDetails = await Promise.all(
      attendances.map(async (att) => {
        const session = await ctx.db.get(att.sessionId);
        if (!session) return null;
        if (args.courseId && session.courseId !== args.courseId) return null;

        const course = await ctx.db.get(session.courseId);
        return {
          ...att,
          sessionDate: session.sessionDate,
          startTime: session.startTime,
          endTime: session.endTime,
          courseName: course?.courseName || "Unknown",
          courseCode: course?.courseCode || "Unknown",
        };
      })
    );

    return attendancesWithDetails.filter((a) => a !== null);
  },
});

// Update attendance status
export const updateStatus = mutation({
  args: {
    id: v.id("attendance"),
    status: v.union(
      v.literal("present"),
      v.literal("absent"),
      v.literal("late"),
      v.literal("excused")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

// Get session attendance summary
export const getSessionSummary = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const attendances = await ctx.db
      .query("attendance")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Get enrolled students count
    const enrollments = await ctx.db
      .query("courseEnrollments")
      .withIndex("by_course", (q) => q.eq("courseId", session.courseId))
      .collect();

    const present = attendances.filter((a) => a.status === "present").length;
    const late = attendances.filter((a) => a.status === "late").length;
    const absent = enrollments.length - present - late;

    return {
      totalEnrolled: enrollments.length,
      present,
      late,
      absent,
      attendanceRate:
        enrollments.length > 0
          ? ((present + late) / enrollments.length) * 100
          : 0,
    };
  },
});

// Verify face and mark attendance (used by kiosk)
export const verifyAndMark = mutation({
  args: {
    sessionCode: v.string(),
    qrData: v.string(),
    faceConfidence: v.number(),
    deviceInfo: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Parse QR code to get student
    const parts = args.qrData.split(":");
    if (parts.length < 3 || parts[0] !== "SMARTATTEND") {
      throw new Error("Invalid QR code format");
    }

    const rollNo = parts[2];
    const student = await ctx.db
      .query("students")
      .withIndex("by_roll_no", (q) => q.eq("rollNo", rollNo))
      .first();

    if (!student) {
      throw new Error("Student not found");
    }

    // Check face confidence threshold
    if (args.faceConfidence < 70) {
      // Log anomaly for face mismatch
      const session = await ctx.db
        .query("sessions")
        .withIndex("by_code", (q) => q.eq("attendanceCode", args.sessionCode))
        .first();

      await ctx.db.insert("anomalies", {
        studentId: student._id,
        sessionId: session?._id,
        anomalyType: "face_mismatch",
        severity: args.faceConfidence < 50 ? "high" : "medium",
        reason: `Face confidence too low: ${args.faceConfidence}%`,
        isResolved: false,
        attemptTime: Date.now(),
        ipAddress: args.ipAddress,
        deviceInfo: args.deviceInfo,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      throw new Error("Face verification failed. Please try again or contact staff.");
    }

    // Find session by code
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_code", (q) => q.eq("attendanceCode", args.sessionCode))
      .first();

    if (!session) {
      throw new Error("Invalid session code");
    }

    if (!session.isActive) {
      throw new Error("Session is not active for attendance");
    }

    // Check for duplicate attendance
    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_student_session", (q) =>
        q.eq("studentId", student._id).eq("sessionId", session._id)
      )
      .first();

    if (existing) {
      await ctx.db.insert("anomalies", {
        studentId: student._id,
        sessionId: session._id,
        anomalyType: "duplicate_attendance",
        severity: "medium",
        reason: "Student attempted to mark attendance again",
        isResolved: false,
        attemptTime: Date.now(),
        ipAddress: args.ipAddress,
        deviceInfo: args.deviceInfo,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      return {
        success: false,
        message: "Attendance already marked",
        student: { name: student.name, rollNo: student.rollNo },
      };
    }

    // Check enrollment
    const enrollment = await ctx.db
      .query("courseEnrollments")
      .withIndex("by_course_student", (q) =>
        q.eq("courseId", session.courseId).eq("studentId", student._id)
      )
      .first();

    if (!enrollment) {
      return {
        success: false,
        message: "Student is not enrolled in this course",
        student: { name: student.name, rollNo: student.rollNo },
      };
    }

    // Determine status based on time
    const now = new Date();
    const sessionStart = new Date(`${session.sessionDate}T${session.startTime}`);
    const lateThreshold = new Date(sessionStart.getTime() + 15 * 60 * 1000);

    let status: "present" | "late" = "present";
    if (now > lateThreshold) {
      status = "late";
    }

    await ctx.db.insert("attendance", {
      studentId: student._id,
      sessionId: session._id,
      status,
      verificationMethod: "face_qr",
      faceConfidence: args.faceConfidence,
      qrScanned: true,
      overallConfidence: args.faceConfidence,
      markedAt: Date.now(),
      deviceInfo: args.deviceInfo,
      ipAddress: args.ipAddress,
      isKiosk: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: `Welcome ${student.name}! Attendance marked as ${status}.`,
      student: { name: student.name, rollNo: student.rollNo },
      status,
    };
  },
});

// Verify fingerprint and mark attendance
export const verifyFingerprintAndMark = mutation({
  args: {
    sessionCode: v.string(),
    fingerprintHash: v.string(),
    deviceInfo: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find student by fingerprint hash
    const students = await ctx.db.query("students").collect();
    const student = students.find(
      (s) => s.fingerprintHash === args.fingerprintHash
    );

    if (!student) {
      throw new Error("Fingerprint not recognized. Please use QR code or contact staff.");
    }

    // Find session by code
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_code", (q) => q.eq("attendanceCode", args.sessionCode))
      .first();

    if (!session) {
      throw new Error("Invalid session code");
    }

    if (!session.isActive) {
      throw new Error("Session is not active for attendance");
    }

    // Check for duplicate
    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_student_session", (q) =>
        q.eq("studentId", student._id).eq("sessionId", session._id)
      )
      .first();

    if (existing) {
      return {
        success: false,
        message: "Attendance already marked",
        student: { name: student.name, rollNo: student.rollNo },
      };
    }

    // Check enrollment
    const enrollment = await ctx.db
      .query("courseEnrollments")
      .withIndex("by_course_student", (q) =>
        q.eq("courseId", session.courseId).eq("studentId", student._id)
      )
      .first();

    if (!enrollment) {
      return {
        success: false,
        message: "Student is not enrolled in this course",
        student: { name: student.name, rollNo: student.rollNo },
      };
    }

    // Determine status
    const now = new Date();
    const sessionStart = new Date(`${session.sessionDate}T${session.startTime}`);
    const lateThreshold = new Date(sessionStart.getTime() + 15 * 60 * 1000);

    let status: "present" | "late" = "present";
    if (now > lateThreshold) {
      status = "late";
    }

    await ctx.db.insert("attendance", {
      studentId: student._id,
      sessionId: session._id,
      status,
      verificationMethod: "fingerprint",
      fingerprintMatch: true,
      overallConfidence: 95,
      markedAt: Date.now(),
      deviceInfo: args.deviceInfo,
      ipAddress: args.ipAddress,
      isKiosk: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: `Welcome ${student.name}! Attendance marked as ${status}.`,
      student: { name: student.name, rollNo: student.rollNo },
      status,
    };
  },
});

// Mark attendance via WebAuthn fingerprint (client verifies, then calls this with student ID)
export const markWithWebAuthn = mutation({
  args: {
    sessionCode: v.string(),
    studentId: v.id("students"),
    newCounter: v.number(),
    deviceInfo: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get student
    const student = await ctx.db.get(args.studentId);
    if (!student) {
      throw new Error("Student not found");
    }

    // Update WebAuthn counter to prevent replay attacks
    await ctx.db.patch(args.studentId, {
      webauthnCounter: args.newCounter,
    });

    // Find session by code
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_code", (q) => q.eq("attendanceCode", args.sessionCode))
      .first();

    if (!session) {
      throw new Error("Invalid session code");
    }

    if (!session.isActive) {
      throw new Error("Session is not active for attendance");
    }

    // Check for duplicate
    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_student_session", (q) =>
        q.eq("studentId", student._id).eq("sessionId", session._id)
      )
      .first();

    if (existing) {
      return {
        success: false,
        message: "Attendance already marked",
        student: { name: student.name, rollNo: student.rollNo },
      };
    }

    // Check enrollment
    const enrollment = await ctx.db
      .query("courseEnrollments")
      .withIndex("by_course_student", (q) =>
        q.eq("courseId", session.courseId).eq("studentId", student._id)
      )
      .first();

    if (!enrollment) {
      return {
        success: false,
        message: "Student is not enrolled in this course",
        student: { name: student.name, rollNo: student.rollNo },
      };
    }

    // Determine status
    const now = new Date();
    const sessionStart = new Date(`${session.sessionDate}T${session.startTime}`);
    const lateThreshold = new Date(sessionStart.getTime() + 15 * 60 * 1000);

    let status: "present" | "late" = "present";
    if (now > lateThreshold) {
      status = "late";
    }

    await ctx.db.insert("attendance", {
      studentId: student._id,
      sessionId: session._id,
      status,
      verificationMethod: "fingerprint",
      fingerprintMatch: true,
      overallConfidence: 98, // Higher confidence for WebAuthn
      markedAt: Date.now(),
      deviceInfo: args.deviceInfo,
      ipAddress: args.ipAddress,
      isKiosk: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: `Welcome ${student.name}! Attendance marked as ${status}.`,
      student: { name: student.name, rollNo: student.rollNo },
      status,
    };
  },
});
