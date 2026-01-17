'use client';

import { useState, Suspense } from 'react';
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
  ToggleLeft,
  ToggleRight,
  Trash2,
  RefreshCw,
  Edit2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function FacultyPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64">
      <Loader2 className="w-12 h-12 animate-spin text-sky-600" />
    </div>}>
      <FacultyForm />
    </Suspense>
  );
}

function FacultyForm() {
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search faculty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-slate-200"
            />
          </div>
          <Select value={roleFilter} onValueChange={(val) => setRoleFilter(val as any)}>
            <SelectTrigger className="w-[180px] bg-white border-slate-200">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admins Only</SelectItem>
              <SelectItem value="faculty">Faculty Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-sky-600 hover:bg-sky-700 shadow-lg shadow-sky-600/25">
          <Plus className="w-5 h-5 mr-2" />
          Add Faculty
        </Button>
      </div>

      {/* Faculty Table */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-sky-600" />
                  </td>
                </tr>
              ) : faculty?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">
                    No faculty found
                  </td>
                </tr>
              ) : (
                faculty?.map((user) => (
                  <tr key={user._id} className={cn('hover:bg-slate-50 transition-colors', !user.isActive && 'bg-slate-50 opacity-75')}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center',
                          user.role === 'admin' ? 'bg-red-100' : 'bg-sky-100'
                        )}>
                          {user.role === 'admin' ? (
                            <Shield className="w-5 h-5 text-red-600" />
                          ) : (
                            <Users className="w-5 h-5 text-sky-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{user.fullName}</p>
                          <p className="text-sm text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={user.role === 'admin' ? 'destructive' : 'default'} className={user.role === 'admin' ? '' : 'bg-sky-100 text-sky-700 hover:bg-sky-100'}>
                        {user.role === 'admin' ? 'Admin' : 'Faculty'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={user.isActive ? 'default' : 'secondary'} className={user.isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-500">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setActionMenuOpen(actionMenuOpen === user._id ? null : user._id)}
                          className="h-8 w-8"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                        
                        {actionMenuOpen === user._id && (
                          <>
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setActionMenuOpen(null)}
                            />
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20">
                              <button
                                onClick={() => {
                                  setSelectedFaculty(user);
                                  setShowEditModal(true);
                                  setActionMenuOpen(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
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
                                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                              >
                                <Key className="w-4 h-4" />
                                Reset Password
                              </button>
                              <button
                                onClick={() => handleToggleActive(user._id)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
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
                              <hr className="my-1 border-slate-200" />
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
      </Card>

      {/* Add Faculty Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <AddFacultyModal onClose={() => setShowModal(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit Faculty Modal */}
      <Dialog open={showEditModal && !!selectedFaculty} onOpenChange={(open) => { setShowEditModal(open); if (!open) setSelectedFaculty(null); }}>
        <DialogContent className="sm:max-w-md">
          {selectedFaculty && (
            <EditFacultyModal
              faculty={selectedFaculty}
              onClose={() => {
                setShowEditModal(false);
                setSelectedFaculty(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Confirmation */}
      <Dialog open={showResetPasswordModal && !!selectedFaculty} onOpenChange={(open) => { setShowResetPasswordModal(open); if (!open) setSelectedFaculty(null); }}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Key className="w-8 h-8 text-amber-600" />
            </div>
            <DialogTitle className="text-xl">Reset Password?</DialogTitle>
            <p className="text-slate-600 mt-2">
              This will generate a new password for <strong>{selectedFaculty?.fullName}</strong>.
              The user will need to use the new password to log in.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowResetPasswordModal(false);
                setSelectedFaculty(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              className="flex-1 bg-amber-600 hover:bg-amber-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
      <>
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <DialogTitle className="text-xl">
            {createdCredentials.role === 'admin' ? 'Admin' : 'Faculty'} Created Successfully!
          </DialogTitle>
          <p className="text-slate-600 mt-1">Share these credentials with the user</p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Name:</span>
              <span className="font-medium text-slate-900">{createdCredentials.fullName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Role:</span>
              <Badge variant={createdCredentials.role === 'admin' ? 'destructive' : 'default'} className={createdCredentials.role === 'admin' ? '' : 'bg-sky-100 text-sky-700'}>
                {createdCredentials.role === 'admin' ? 'Admin' : 'Faculty'}
              </Badge>
            </div>
            <hr className="border-slate-200" />
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Email:</span>
              <span className="font-medium text-slate-900">{createdCredentials.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 flex items-center gap-1">
                <Key className="w-4 h-4" />
                Password:
              </span>
              <span className="font-mono font-bold text-sky-600 bg-sky-50 px-2 py-1 rounded">
                {createdCredentials.password}
              </span>
            </div>
          </div>
        </div>

        <Alert className="mb-6 bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Important:</strong> Please save or share these credentials now. 
            The password won't be shown again.
          </AlertDescription>
        </Alert>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleCopyCredentials}
            className="flex-1"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5 mr-2 text-emerald-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5 mr-2" />
                Copy to Clipboard
              </>
            )}
          </Button>
          <Button onClick={onClose} className="flex-1 bg-sky-600 hover:bg-sky-700">
            Done
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add New Faculty</DialogTitle>
      </DialogHeader>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Full Name</Label>
          <Input
            type="text"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className="mt-1"
            required
          />
        </div>

        <div>
          <Label>Email</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="mt-1"
            required
          />
          <p className="text-xs text-slate-500 mt-1">
            Password will be auto-generated as: {formData.email.split('@')[0] || 'email'}@XXXX
          </p>
        </div>

        <div>
          <Label>Role</Label>
          <div className="flex gap-4 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="role"
                value="faculty"
                checked={formData.role === 'faculty'}
                onChange={() => setFormData({ ...formData, role: 'faculty' })}
                className="w-4 h-4 text-sky-600"
              />
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-600" />
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
          <p className="text-xs text-slate-500 mt-2">
            {formData.role === 'admin' 
              ? 'Admins have full system access including faculty management.' 
              : 'Faculty can manage students, courses, sessions, and attendance.'}
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="bg-sky-600 hover:bg-sky-700">
            {loading ? 'Creating...' : 'Create User'}
          </Button>
        </div>
      </form>
    </>
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
    <>
      <DialogHeader>
        <DialogTitle>Edit Faculty</DialogTitle>
      </DialogHeader>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Full Name</Label>
          <Input
            type="text"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className="mt-1"
            required
          />
        </div>

        <div>
          <Label>Email</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="mt-1"
            required
          />
        </div>

        <div>
          <Label>Role</Label>
          <div className="flex gap-4 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="role"
                value="faculty"
                checked={formData.role === 'faculty'}
                onChange={() => setFormData({ ...formData, role: 'faculty' })}
                className="w-4 h-4 text-sky-600"
              />
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-600" />
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
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="bg-sky-600 hover:bg-sky-700">
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </>
  );
}
