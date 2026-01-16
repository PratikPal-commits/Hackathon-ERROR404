import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState({ present: 0, absent: 0, total: 0 });

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const response = await api.get(`/attendance/student/${user.student_id}`);
        setAttendance(response.data.attendances);
        
        const present = response.data.attendances.filter(a => a.status === 'present').length;
        setStats({
          present,
          absent: response.data.total - present,
          total: response.data.total
        });
      } catch (err) {
        console.error('Failed to fetch attendance');
      }
    };
    if (user?.student_id) fetchAttendance();
  }, [user]);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8">Welcome, {user.full_name}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-blue-500">
          <p className="text-gray-500 text-sm uppercase">Total Sessions</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-green-500">
          <p className="text-gray-500 text-sm uppercase">Present</p>
          <p className="text-2xl font-bold">{stats.present}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-red-500">
          <p className="text-gray-500 text-sm uppercase">Attendance Rate</p>
          <p className="text-2xl font-bold">
            {stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Recent Attendance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-sm uppercase">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Confidence</th>
                <th className="px-6 py-3">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {attendance.map((record) => (
                <tr key={record.id}>
                  <td className="px-6 py-4">
                    {new Date(record.marked_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      record.status === 'present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {(record.overall_confidence * 100).toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 text-gray-500 capitalize">
                    {record.verification_method.replace('_', ' ')}
                  </td>
                </tr>
              ))}
              {attendance.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-400">
                    No attendance records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
