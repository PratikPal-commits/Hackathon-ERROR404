import { v } from "convex/values";
import { query } from "./_generated/server";

// Dashboard stats for teachers/admins
export const getDashboard = query({
  args: { facultyId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    // Get total students
    const students = await ctx.db.query("students").collect();
    const totalStudents = students.length;

    // Get courses (filtered by faculty if provided)
    let courses = await ctx.db.query("courses").collect();
    if (args.facultyId) {
      courses = courses.filter((c) => c.facultyId === args.facultyId);
    }
    const totalCourses = courses.length;

    // Get active sessions
    const activeSessions = await ctx.db
      .query("sessions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Calculate today's attendance rate
    const today = new Date().toISOString().split("T")[0];
    const todaySessions = await ctx.db
      .query("sessions")
      .withIndex("by_date", (q) => q.eq("sessionDate", today))
      .collect();

    let totalAttended = 0;
    let totalExpected = 0;

    for (const session of todaySessions) {
      // Get enrolled students for this course
      const enrollments = await ctx.db
        .query("courseEnrollments")
        .withIndex("by_course", (q) => q.eq("courseId", session.courseId))
        .collect();
      totalExpected += enrollments.length;

      // Get actual attendance
      const attendance = await ctx.db
        .query("attendance")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect();
      totalAttended += attendance.filter(
        (a) => a.status === "present" || a.status === "late"
      ).length;
    }

    const todayAttendanceRate =
      totalExpected > 0 ? (totalAttended / totalExpected) * 100 : 0;

    // Get recent anomalies
    const anomalies = await ctx.db
      .query("anomalies")
      .withIndex("by_resolved", (q) => q.eq("isResolved", false))
      .collect();

    const recentAnomalies = await Promise.all(
      anomalies.slice(0, 5).map(async (anomaly) => {
        const student = anomaly.studentId
          ? await ctx.db.get(anomaly.studentId)
          : null;
        return {
          id: anomaly._id,
          anomalyType: anomaly.anomalyType,
          severity: anomaly.severity,
          reason: anomaly.reason,
          attemptTime: anomaly.attemptTime,
          studentId: anomaly.studentId,
          sessionId: anomaly.sessionId,
          isResolved: anomaly.isResolved,
          studentName: student?.name || "Unknown",
          studentRollNo: student?.rollNo || "Unknown",
        };
      })
    );

    // Get upcoming sessions
    const allSessions = await ctx.db.query("sessions").collect();
    const upcomingSessions = allSessions
      .filter((s) => s.sessionDate >= today)
      .sort((a, b) => {
        const dateCompare = a.sessionDate.localeCompare(b.sessionDate);
        if (dateCompare !== 0) return dateCompare;
        return a.startTime.localeCompare(b.startTime);
      })
      .slice(0, 5);

    const upcomingWithCourse = await Promise.all(
      upcomingSessions.map(async (session) => {
        const course = await ctx.db.get(session.courseId);
        return {
          id: session._id,
          courseId: session.courseId,
          courseName: course?.courseName || "Unknown",
          courseCode: course?.courseCode || "Unknown",
          sessionDate: session.sessionDate,
          startTime: session.startTime,
          endTime: session.endTime,
          roomNo: session.roomNo,
          building: session.building,
          isActive: session.isActive,
        };
      })
    );

    return {
      totalStudents,
      totalCourses,
      activeSessions: activeSessions.length,
      todayAttendanceRate,
      recentAnomalies,
      upcomingSessions: upcomingWithCourse,
    };
  },
});

// Course analytics
export const getCourseAnalytics = query({
  args: {
    courseId: v.id("courses"),
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const course = await ctx.db.get(args.courseId);
    if (!course) {
      throw new Error("Course not found");
    }

    // Get sessions in date range
    let sessions = await ctx.db
      .query("sessions")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    if (args.dateFrom) {
      sessions = sessions.filter((s) => s.sessionDate >= args.dateFrom!);
    }
    if (args.dateTo) {
      sessions = sessions.filter((s) => s.sessionDate <= args.dateTo!);
    }

    // Calculate attendance stats
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

    // Get enrolled students with low attendance
    const enrollments = await ctx.db
      .query("courseEnrollments")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    const studentStats = await Promise.all(
      enrollments.map(async (enrollment) => {
        const student = await ctx.db.get(enrollment.studentId);
        if (!student) return null;

        let present = 0;
        let total = 0;

        for (const session of sessions) {
          const att = await ctx.db
            .query("attendance")
            .withIndex("by_student_session", (q) =>
              q.eq("studentId", enrollment.studentId).eq("sessionId", session._id)
            )
            .first();

          total++;
          if (att && (att.status === "present" || att.status === "late")) {
            present++;
          }
        }

        const attendanceRate = total > 0 ? (present / total) * 100 : 0;

        return {
          student,
          attendanceRate,
        };
      })
    );

    const lowAttendanceStudents = studentStats
      .filter((s) => s !== null && s.attendanceRate < 75)
      .sort((a, b) => a!.attendanceRate - b!.attendanceRate);

    const faculty = await ctx.db.get(course.facultyId);

    return {
      course: {
        ...course,
        facultyName: faculty?.fullName || "Unknown",
      },
      stats: {
        totalSessions: sessions.length,
        totalPresent,
        totalAbsent,
        totalLate,
        attendanceRate:
          totalRecords > 0 ? ((totalPresent + totalLate) / totalRecords) * 100 : 0,
      },
      recentSessions: sessions.slice(-5),
      lowAttendanceStudents,
    };
  },
});

// Get students with low attendance
export const getLowAttendance = query({
  args: { threshold: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const threshold = args.threshold || 75;
    const students = await ctx.db.query("students").collect();

    const studentsWithRate = await Promise.all(
      students.map(async (student) => {
        const attendances = await ctx.db
          .query("attendance")
          .withIndex("by_student", (q) => q.eq("studentId", student._id))
          .collect();

        const total = attendances.length;
        const present = attendances.filter(
          (a) => a.status === "present" || a.status === "late"
        ).length;
        const attendanceRate = total > 0 ? (present / total) * 100 : 100;

        return {
          student,
          attendanceRate,
        };
      })
    );

    return studentsWithRate
      .filter((s) => s.attendanceRate < threshold)
      .sort((a, b) => a.attendanceRate - b.attendanceRate);
  },
});

// Get attendance trend over time
export const getAttendanceTrend = query({
  args: {
    days: v.optional(v.number()),
    courseId: v.optional(v.id("courses")),
  },
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let sessions = await ctx.db.query("sessions").collect();

    // Filter by date range
    sessions = sessions.filter((s) => {
      const sessionDate = new Date(s.sessionDate);
      return sessionDate >= startDate && sessionDate <= endDate;
    });

    if (args.courseId) {
      sessions = sessions.filter((s) => s.courseId === args.courseId);
    }

    // Group by date
    const dailyStats: Record<
      string,
      { date: string; present: number; absent: number; total: number }
    > = {};

    for (const session of sessions) {
      if (!dailyStats[session.sessionDate]) {
        dailyStats[session.sessionDate] = {
          date: session.sessionDate,
          present: 0,
          absent: 0,
          total: 0,
        };
      }

      const attendances = await ctx.db
        .query("attendance")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect();

      // Get enrolled count
      const enrollments = await ctx.db
        .query("courseEnrollments")
        .withIndex("by_course", (q) => q.eq("courseId", session.courseId))
        .collect();

      dailyStats[session.sessionDate].total += enrollments.length;

      for (const att of attendances) {
        if (att.status === "present" || att.status === "late") {
          dailyStats[session.sessionDate].present++;
        } else {
          dailyStats[session.sessionDate].absent++;
        }
      }
    }

    return Object.values(dailyStats).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  },
});
