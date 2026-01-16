import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Create a new course
export const create = mutation({
  args: {
    courseCode: v.string(),
    courseName: v.string(),
    department: v.string(),
    facultyId: v.id("users"),
    collegeId: v.string(),
    semester: v.optional(v.string()),
    academicYear: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if course code already exists
    const existing = await ctx.db
      .query("courses")
      .withIndex("by_code", (q) => q.eq("courseCode", args.courseCode))
      .first();

    if (existing) {
      throw new Error("Course with this code already exists");
    }

    const now = Date.now();
    const courseId = await ctx.db.insert("courses", {
      courseCode: args.courseCode,
      courseName: args.courseName,
      department: args.department,
      facultyId: args.facultyId,
      collegeId: args.collegeId,
      semester: args.semester,
      academicYear: args.academicYear,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return courseId;
  },
});

// Get all courses
export const list = query({
  args: {
    department: v.optional(v.string()),
    facultyId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    let courses = await ctx.db.query("courses").collect();

    if (args.department) {
      courses = courses.filter((c) => c.department === args.department);
    }

    if (args.facultyId) {
      courses = courses.filter((c) => c.facultyId === args.facultyId);
    }

    // Get faculty names
    const coursesWithFaculty = await Promise.all(
      courses.map(async (course) => {
        const faculty = await ctx.db.get(course.facultyId);
        return {
          ...course,
          facultyName: faculty?.fullName || "Unknown",
        };
      })
    );

    return coursesWithFaculty;
  },
});

// Get course by ID
export const getById = query({
  args: { id: v.id("courses") },
  handler: async (ctx, args) => {
    const course = await ctx.db.get(args.id);
    if (!course) return null;

    const faculty = await ctx.db.get(course.facultyId);
    return {
      ...course,
      facultyName: faculty?.fullName || "Unknown",
    };
  },
});

// Update course
export const update = mutation({
  args: {
    id: v.id("courses"),
    courseName: v.optional(v.string()),
    department: v.optional(v.string()),
    semester: v.optional(v.string()),
    academicYear: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const course = await ctx.db.get(id);

    if (!course) {
      throw new Error("Course not found");
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

// Delete course
export const remove = mutation({
  args: { id: v.id("courses") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Enroll student in course (admin/faculty only)
export const enrollStudent = mutation({
  args: {
    courseId: v.id("courses"),
    studentId: v.id("students"),
    token: v.optional(v.string()), // Optional auth token for verification
  },
  handler: async (ctx, args) => {
    // Note: In production, you'd verify the token and check user role
    // For now, we trust the frontend to only expose this to teachers/admins
    
    // Check if already enrolled
    const existing = await ctx.db
      .query("courseEnrollments")
      .withIndex("by_course_student", (q) =>
        q.eq("courseId", args.courseId).eq("studentId", args.studentId)
      )
      .first();

    if (existing) {
      throw new Error("Student already enrolled in this course");
    }

    await ctx.db.insert("courseEnrollments", {
      courseId: args.courseId,
      studentId: args.studentId,
      enrolledAt: Date.now(),
    });

    return { success: true };
  },
});

// Unenroll student from course (admin/faculty only)
export const unenrollStudent = mutation({
  args: {
    courseId: v.id("courses"),
    studentId: v.id("students"),
    token: v.optional(v.string()), // Optional auth token for verification
  },
  handler: async (ctx, args) => {
    // Note: In production, you'd verify the token and check user role
    // For now, we trust the frontend to only expose this to teachers/admins
    
    const enrollment = await ctx.db
      .query("courseEnrollments")
      .withIndex("by_course_student", (q) =>
        q.eq("courseId", args.courseId).eq("studentId", args.studentId)
      )
      .first();

    if (enrollment) {
      await ctx.db.delete(enrollment._id);
    }

    return { success: true };
  },
});

// Get enrolled students for a course
export const getEnrolledStudents = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const enrollments = await ctx.db
      .query("courseEnrollments")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    const students = await Promise.all(
      enrollments.map(async (e) => {
        const student = await ctx.db.get(e.studentId);
        return student
          ? {
              ...student,
              enrolledAt: e.enrolledAt,
            }
          : null;
      })
    );

    return students.filter((s) => s !== null);
  },
});

// Get courses for a student
export const getStudentCourses = query({
  args: { studentId: v.id("students") },
  handler: async (ctx, args) => {
    const enrollments = await ctx.db
      .query("courseEnrollments")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .collect();

    const courses = await Promise.all(
      enrollments.map(async (e) => {
        const course = await ctx.db.get(e.courseId);
        if (!course) return null;
        const faculty = await ctx.db.get(course.facultyId);
        return {
          ...course,
          facultyName: faculty?.fullName || "Unknown",
          enrolledAt: e.enrolledAt,
        };
      })
    );

    return courses.filter((c) => c !== null);
  },
});

// Get course analytics
export const getAnalytics = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const course = await ctx.db.get(args.courseId);
    if (!course) {
      throw new Error("Course not found");
    }

    // Get all sessions for this course
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    // Get all attendance records for these sessions
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;

    for (const session of sessions) {
      const attendances = await ctx.db
        .query("attendance")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect();

      for (const att of attendances) {
        if (att.status === "present") totalPresent++;
        else if (att.status === "absent") totalAbsent++;
        else if (att.status === "late") totalLate++;
      }
    }

    const totalRecords = totalPresent + totalAbsent + totalLate;

    return {
      course,
      stats: {
        totalSessions: sessions.length,
        totalPresent,
        totalAbsent,
        totalLate,
        attendanceRate: totalRecords > 0 ? ((totalPresent + totalLate) / totalRecords) * 100 : 0,
      },
      recentSessions: sessions.slice(-5),
    };
  },
});
