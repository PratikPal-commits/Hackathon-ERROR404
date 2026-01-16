'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import {
  Plus,
  Search,
  X,
  AlertCircle,
  Check,
  Loader2,
  Copy,
  CheckCircle,
  Key,
  Shield,
  Users,
  MoreVertical,
  UserCog,
  ToggleLeft,
  ToggleRight,
  Trash2,
  RefreshCw,
  Edit2,
} from 'lucide-react';

function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export default function FacultyPage() {
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'faculty'>('all');
  const [showModal, setShowModal] = useState(searchParams.get('action') === 'add');
  const [selectedFaculty, setSelectedFaculty] = useState<any | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  // Convex queries
  const faculty = useQuery(api.faculty.list, {
    role: roleFilter === 'all' ? undefined : roleFilter,
    search: searchTerm || undefined,
  });

  // Convex mutations
  const toggleActive = useMutation(api.faculty.toggleActive);
  const removeFaculty = useMutation(api.faculty.remove);
  const resetPassword = useMutation(api.faculty.resetPassword);

  const handleToggleActive = async (id: Id<'users'>) => {
    try {
      await toggleActive({ id });
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
    setActionMenuOpen(null);
  };

  const handleDelete = async (id: Id<'users'>) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      await removeFaculty({ id });
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
    setActionMenuOpen(null);
  };

  const handleResetPassword = async () => {
    if (!selectedFaculty) return;
    try {
      const result = await resetPassword({ id: selectedFaculty._id });
      alert(`Password reset successfully!\n\nNew password: ${result.generatedPassword}\n\nPlease share this with the user.`);
      setShowResetPasswordModal(false);
      setSelectedFaculty(null);
    } catch (err: any) {
      alert(err.message || 'Failed to reset password');
    }
    setActionMenuOpen(null);
  };

  const loading = faculty === undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search faculty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="input w-auto"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admins Only</option>
            <option value="faculty">Faculty Only</option>
          </select>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          Add Faculty
        </button>
      </div>

      {/* Faculty Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-600" />
                  </td>
                </tr>
              ) : faculty?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    No faculty found
                  </td>
                </tr>
              ) : (
                faculty?.map((user) => (
                  <tr key={user._id} className={!user.isActive ? 'bg-gray-50 opacity-75' : ''}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center',
                          user.role === 'admin' ? 'bg-red-100' : 'bg-blue-100'
                        )}>
                          {user.role === 'admin' ? (
                            <Shield className="w-5 h-5 text-red-600" />
                          ) : (
                            <Users className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{user.fullName}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={cn(
                        'badge',
                        user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                      )}>
                        {user.role === 'admin' ? 'Admin' : 'Faculty'}
                      </span>
                    </td>
                    <td>
                      <span className={cn(
                        'badge',
                        user.isActive ? 'badge-success' : 'badge-gray'
                      )}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-gray-500">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                      </span>
                    </td>
                    <td>
                      <div className="relative">
                        <button
                          onClick={() => setActionMenuOpen(actionMenuOpen === user._id ? null : user._id)}
                          className="btn-ghost btn-sm"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        
                        {actionMenuOpen === user._id && (
                          <>
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setActionMenuOpen(null)}
                            />
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                              <button
                                onClick={() => {
                                  setSelectedFaculty(user);
                                  setShowEditModal(true);
                                  setActionMenuOpen(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Edit2 className="w-4 h-4" />
                                Edit Details
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedFaculty(user);
                                  setShowResetPasswordModal(true);
                                  setActionMenuOpen(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Key className="w-4 h-4" />
                                Reset Password
                              </button>
                              <button
                                onClick={() => handleToggleActive(user._id)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                              >
                                {user.isActive ? (
                                  <>
                                    <ToggleLeft className="w-4 h-4" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <ToggleRight className="w-4 h-4" />
                                    Activate
                                  </>
                                )}
                              </button>
                              <hr className="my-1" />
                              <button
                                onClick={() => handleDelete(user._id)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete User
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Faculty Modal */}
      {showModal && (
        <AddFacultyModal onClose={() => setShowModal(false)} />
      )}

      {/* Edit Faculty Modal */}
      {showEditModal && selectedFaculty && (
        <EditFacultyModal
          faculty={selectedFaculty}
          onClose={() => {
            setShowEditModal(false);
            setSelectedFaculty(null);
          }}
        />
      )}

      {/* Reset Password Confirmation */}
      {showResetPasswordModal && selectedFaculty && (
        <div className="modal-overlay" onClick={() => setShowResetPasswordModal(false)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Key className="w-8 h-8 text-yellow-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Reset Password?</h2>
                <p className="text-gray-600 mt-2">
                  This will generate a new password for <strong>{selectedFaculty.fullName}</strong>.
                  The user will need to use the new password to log in.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowResetPasswordModal(false);
                    setSelectedFaculty(null);
                  }}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  className="flex-1 btn-primary bg-yellow-600 hover:bg-yellow-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add Faculty Modal Component
function AddFacultyModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: 'faculty' as 'admin' | 'faculty',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
    fullName: string;
    role: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const createFaculty = useMutation(api.faculty.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await createFaculty({
        email: formData.email,
        fullName: formData.fullName,
        role: formData.role,
      });
      
      setCreatedCredentials({
        email: formData.email,
        password: result.generatedPassword,
        fullName: formData.fullName,
        role: formData.role,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    
    const text = `${createdCredentials.role === 'admin' ? 'Admin' : 'Faculty'} Login Credentials
------------------------
Name: ${createdCredentials.fullName}
Role: ${createdCredentials.role === 'admin' ? 'Administrator' : 'Faculty'}
Email: ${createdCredentials.email}
Password: ${createdCredentials.password}

Note: The user can change their password after logging in.`;
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Show credentials screen after successful creation
  if (createdCredentials) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                {createdCredentials.role === 'admin' ? 'Admin' : 'Faculty'} Created Successfully!
              </h2>
              <p className="text-gray-600 mt-1">Share these credentials with the user</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium text-gray-900">{createdCredentials.fullName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Role:</span>
                  <span className={cn(
                    'badge',
                    createdCredentials.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                  )}>
                    {createdCredentials.role === 'admin' ? 'Admin' : 'Faculty'}
                  </span>
                </div>
                <hr className="border-gray-200" />
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium text-gray-900">{createdCredentials.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Key className="w-4 h-4" />
                    Password:
                  </span>
                  <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {createdCredentials.password}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Please save or share these credentials now. 
                The password won't be shown again. The user can change their password after logging in.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCopyCredentials}
                className="flex-1 btn-secondary flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copy to Clipboard
                  </>
                )}
              </button>
              <button onClick={onClose} className="flex-1 btn-primary">
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Faculty</h2>

          {error && (
            <div className="alert-error mb-4">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                className="input"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Password will be auto-generated as: {formData.email.split('@')[0] || 'email'}@XXXX
              </p>
            </div>

            <div>
              <label className="label">Role</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="faculty"
                    checked={formData.role === 'faculty'}
                    onChange={(e) => setFormData({ ...formData, role: 'faculty' })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Faculty</span>
                  </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={formData.role === 'admin'}
                    onChange={(e) => setFormData({ ...formData, role: 'admin' })}
                    className="w-4 h-4 text-red-600"
                  />
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-red-600" />
                    <span>Admin</span>
                  </div>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {formData.role === 'admin' 
                  ? 'Admins have full system access including faculty management.' 
                  : 'Faculty can manage students, courses, sessions, and attendance.'}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Edit Faculty Modal Component
function EditFacultyModal({ 
  faculty, 
  onClose 
}: { 
  faculty: any; 
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    fullName: faculty.fullName,
    email: faculty.email,
    role: faculty.role as 'admin' | 'faculty',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateFaculty = useMutation(api.faculty.update);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await updateFaculty({
        id: faculty._id,
        email: formData.email !== faculty.email ? formData.email : undefined,
        fullName: formData.fullName !== faculty.fullName ? formData.fullName : undefined,
        role: formData.role !== faculty.role ? formData.role : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit Faculty</h2>

          {error && (
            <div className="alert-error mb-4">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                className="input"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="label">Role</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="faculty"
                    checked={formData.role === 'faculty'}
                    onChange={() => setFormData({ ...formData, role: 'faculty' })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Faculty</span>
                  </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={formData.role === 'admin'}
                    onChange={() => setFormData({ ...formData, role: 'admin' })}
                    className="w-4 h-4 text-red-600"
                  />
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-red-600" />
                    <span>Admin</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
