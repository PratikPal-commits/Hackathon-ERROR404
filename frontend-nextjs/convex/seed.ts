import { mutation } from "./_generated/server";

// Simple hash function for demo
function simpleHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16) + "_hashed";
}

// Generate QR code data for student
function generateQRCode(rollNo: string, collegeId: string): string {
  return `SMARTATTEND:${collegeId}:${rollNo}:${Date.now()}`;
}

// Seed demo data
export const seedDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Create admin user
    const adminId = await ctx.db.insert("users", {
      email: "admin@smartattend.com",
      passwordHash: simpleHash("admin123"),
      fullName: "System Administrator",
      role: "admin",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Create faculty users
    const faculty1Id = await ctx.db.insert("users", {
      email: "prof.sharma@college.edu",
      passwordHash: simpleHash("faculty123"),
      fullName: "Dr. Rajesh Sharma",
      role: "faculty",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const faculty2Id = await ctx.db.insert("users", {
      email: "prof.patel@college.edu",
      passwordHash: simpleHash("faculty123"),
      fullName: "Dr. Priya Patel",
      role: "faculty",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Create students
    const studentsData = [
      { rollNo: "CS2024001", name: "Amit Kumar", email: "amit@student.edu", department: "Computer Science", semester: 5 },
      { rollNo: "CS2024002", name: "Priya Singh", email: "priya@student.edu", department: "Computer Science", semester: 5 },
      { rollNo: "CS2024003", name: "Rahul Verma", email: "rahul@student.edu", department: "Computer Science", semester: 5 },
      { rollNo: "CS2024004", name: "Sneha Gupta", email: "sneha@student.edu", department: "Computer Science", semester: 5 },
      { rollNo: "CS2024005", name: "Vikram Reddy", email: "vikram@student.edu", department: "Computer Science", semester: 5 },
      { rollNo: "EC2024001", name: "Anita Sharma", email: "anita@student.edu", department: "Electronics", semester: 5 },
      { rollNo: "EC2024002", name: "Karan Mehta", email: "karan@student.edu", department: "Electronics", semester: 5 },
      { rollNo: "ME2024001", name: "Deepak Rao", email: "deepak@student.edu", department: "Mechanical", semester: 5 },
    ];

    const studentIds: any[] = [];
    for (const s of studentsData) {
      const studentId = await ctx.db.insert("students", {
        rollNo: s.rollNo,
        name: s.name,
        email: s.email,
        department: s.department,
        collegeId: "COLLEGE001",
        semester: s.semester,
        hasFaceData: Math.random() > 0.3, // 70% have face data
        hasFingerprint: Math.random() > 0.5, // 50% have fingerprint
        hasIdCard: true,
        qrCode: generateQRCode(s.rollNo, "COLLEGE001"),
        isEnrolled: true,
        createdAt: now,
        updatedAt: now,
      });
      studentIds.push({ id: studentId, ...s });

      // Create user account for student
      await ctx.db.insert("users", {
        email: s.email,
        passwordHash: simpleHash("student123"),
        fullName: s.name,
        role: "student",
        isActive: true,
        studentId,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Create courses
    const course1Id = await ctx.db.insert("courses", {
      courseCode: "CS501",
      courseName: "Machine Learning",
      department: "Computer Science",
      facultyId: faculty1Id,
      collegeId: "COLLEGE001",
      semester: "Fall 2024",
      academicYear: "2024-25",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const course2Id = await ctx.db.insert("courses", {
      courseCode: "CS502",
      courseName: "Database Systems",
      department: "Computer Science",
      facultyId: faculty1Id,
      collegeId: "COLLEGE001",
      semester: "Fall 2024",
      academicYear: "2024-25",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const course3Id = await ctx.db.insert("courses", {
      courseCode: "EC501",
      courseName: "Digital Signal Processing",
      department: "Electronics",
      facultyId: faculty2Id,
      collegeId: "COLLEGE001",
      semester: "Fall 2024",
      academicYear: "2024-25",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Enroll students in courses
    for (const student of studentIds) {
      if (student.department === "Computer Science") {
        await ctx.db.insert("courseEnrollments", {
          courseId: course1Id,
          studentId: student.id,
          enrolledAt: now,
        });
        await ctx.db.insert("courseEnrollments", {
          courseId: course2Id,
          studentId: student.id,
          enrolledAt: now,
        });
      }
      if (student.department === "Electronics") {
        await ctx.db.insert("courseEnrollments", {
          courseId: course3Id,
          studentId: student.id,
          enrolledAt: now,
        });
      }
    }

    // Create timetable entries
    // CS501 - Monday and Wednesday 9:00 AM
    await ctx.db.insert("timetable", {
      courseId: course1Id,
      dayOfWeek: 1, // Monday
      startTime: "09:00",
      endTime: "10:00",
      roomNo: "CS-101",
      building: "Main Block",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("timetable", {
      courseId: course1Id,
      dayOfWeek: 3, // Wednesday
      startTime: "09:00",
      endTime: "10:00",
      roomNo: "CS-101",
      building: "Main Block",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // CS502 - Tuesday and Thursday 11:00 AM
    await ctx.db.insert("timetable", {
      courseId: course2Id,
      dayOfWeek: 2, // Tuesday
      startTime: "11:00",
      endTime: "12:00",
      roomNo: "CS-102",
      building: "Main Block",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("timetable", {
      courseId: course2Id,
      dayOfWeek: 4, // Thursday
      startTime: "11:00",
      endTime: "12:00",
      roomNo: "CS-102",
      building: "Main Block",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // EC501 - Monday and Friday 2:00 PM
    await ctx.db.insert("timetable", {
      courseId: course3Id,
      dayOfWeek: 1, // Monday
      startTime: "14:00",
      endTime: "15:00",
      roomNo: "EC-201",
      building: "Electronics Block",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("timetable", {
      courseId: course3Id,
      dayOfWeek: 5, // Friday
      startTime: "14:00",
      endTime: "15:00",
      roomNo: "EC-201",
      building: "Electronics Block",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Create some past sessions with attendance
    const today = new Date();
    for (let i = 7; i > 0; i--) {
      const sessionDate = new Date(today);
      sessionDate.setDate(sessionDate.getDate() - i);
      const dateStr = sessionDate.toISOString().split("T")[0];
      const dayOfWeek = sessionDate.getDay();

      // Create session for CS501 on Monday/Wednesday
      if (dayOfWeek === 1 || dayOfWeek === 3) {
        const sessionId = await ctx.db.insert("sessions", {
          courseId: course1Id,
          sessionDate: dateStr,
          startTime: "09:00",
          endTime: "10:00",
          roomNo: "CS-101",
          building: "Main Block",
          isActive: false,
          createdManually: false,
          createdAt: now,
          updatedAt: now,
        });

        // Mark attendance for some students
        for (const student of studentIds.filter((s) => s.department === "Computer Science")) {
          const isPresent = Math.random() > 0.2; // 80% attendance rate
          await ctx.db.insert("attendance", {
            studentId: student.id,
            sessionId,
            status: isPresent ? "present" : "absent",
            verificationMethod: "face_qr",
            faceConfidence: isPresent ? 85 + Math.random() * 15 : undefined,
            qrScanned: isPresent,
            overallConfidence: isPresent ? 90 : 0,
            markedAt: new Date(`${dateStr}T09:05:00`).getTime(),
            isKiosk: true,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      // Create session for CS502 on Tuesday/Thursday
      if (dayOfWeek === 2 || dayOfWeek === 4) {
        const sessionId = await ctx.db.insert("sessions", {
          courseId: course2Id,
          sessionDate: dateStr,
          startTime: "11:00",
          endTime: "12:00",
          roomNo: "CS-102",
          building: "Main Block",
          isActive: false,
          createdManually: false,
          createdAt: now,
          updatedAt: now,
        });

        for (const student of studentIds.filter((s) => s.department === "Computer Science")) {
          const isPresent = Math.random() > 0.25;
          await ctx.db.insert("attendance", {
            studentId: student.id,
            sessionId,
            status: isPresent ? "present" : "absent",
            verificationMethod: "face_qr",
            faceConfidence: isPresent ? 85 + Math.random() * 15 : undefined,
            qrScanned: isPresent,
            overallConfidence: isPresent ? 90 : 0,
            markedAt: new Date(`${dateStr}T11:05:00`).getTime(),
            isKiosk: true,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }

    // Create today's active session
    const todayStr = today.toISOString().split("T")[0];
    const activeSessionId = await ctx.db.insert("sessions", {
      courseId: course1Id,
      sessionDate: todayStr,
      startTime: "09:00",
      endTime: "10:00",
      roomNo: "CS-101",
      building: "Main Block",
      isActive: true,
      attendanceCode: "ABC123",
      createdManually: false,
      createdAt: now,
      updatedAt: now,
    });

    // Create some anomalies
    await ctx.db.insert("anomalies", {
      studentId: studentIds[0].id,
      sessionId: activeSessionId,
      anomalyType: "duplicate_attendance",
      severity: "medium",
      reason: "Student attempted to mark attendance multiple times",
      isResolved: false,
      attemptTime: now - 3600000,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("anomalies", {
      studentId: studentIds[1].id,
      anomalyType: "face_mismatch",
      severity: "high",
      reason: "Face verification confidence below threshold (45%)",
      isResolved: false,
      attemptTime: now - 7200000,
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      message: "Demo data seeded successfully",
      data: {
        users: { admin: 1, faculty: 2, students: studentsData.length },
        courses: 3,
        timetableEntries: 6,
        activeSessions: 1,
        anomalies: 2,
      },
    };
  },
});

// Clear all data (for reset)
export const clearAllData = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete all data from all tables
    const tables = [
      "anomalies",
      "attendance",
      "sessions",
      "timetable",
      "courseEnrollments",
      "courses",
      "students",
      "authSessions",
      "users",
    ];

    for (const table of tables) {
      const docs = await ctx.db.query(table as any).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
    }

    return { success: true, message: "All data cleared" };
  },
});
