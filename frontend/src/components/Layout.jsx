import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, CheckSquare, LogOut, ShieldCheck } from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return children;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <div className="p-6 border-b">
          <div className="flex items-center gap-2 text-blue-600">
            <ShieldCheck className="w-8 h-8" />
            <span className="font-bold text-lg">SafeAttend</span>
          </div>
        </div>
        <nav className="mt-6">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-3 transition ${
                isActive ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </NavLink>
          {user.role === 'student' && (
            <NavLink
              to="/mark"
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-3 transition ${
                  isActive ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <CheckSquare className="w-5 h-5" />
              <span>Mark Attendance</span>
            </NavLink>
          )}
        </nav>
        <div className="absolute bottom-0 w-64 p-6 border-t">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 text-gray-600 hover:text-red-600 transition w-full"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <header className="bg-white shadow-sm px-8 py-4 flex justify-between items-center">
          <h2 className="text-xl font-medium text-gray-800 capitalize">{user.role} Portal</h2>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-bold text-gray-800">{user.full_name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
              {user.full_name.charAt(0)}
            </div>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
};

export default Layout;
