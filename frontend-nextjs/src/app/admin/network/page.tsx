'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import {
  Plus,
  Search,
  Wifi,
  WifiOff,
  Trash2,
  Clock,
  Building2,
  Shield,
  Smartphone,
  AlertCircle,
  Check,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import { useAuth } from '@/app/providers';
import { cn, formatRelativeTime } from '@/lib/utils';

type NetworkType = 'campus' | 'temporary';

export default function NetworkPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState<'all' | NetworkType>('all');

  // Convex queries
  const networks = useQuery(api.networks.list, {});

  // Convex mutations
  const deleteNetwork = useMutation(api.networks.remove);
  const toggleActive = useMutation(api.networks.toggleActive);
  const extendExpiry = useMutation(api.networks.extendExpiry);

  const filteredNetworks = networks?.filter((network) => {
    const matchesSearch =
      network.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      network.ipRange.toLowerCase().includes(searchTerm.toLowerCase()) ||
      network.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || network.networkType === filterType;

    return matchesSearch && matchesType;
  }) || [];

  const handleDelete = async (id: Id<'allowedNetworks'>) => {
    if (!confirm('Are you sure you want to delete this network?')) return;
    try {
      await deleteNetwork({ id });
    } catch (err: any) {
      alert(err.message || 'Failed to delete network');
    }
  };

  const handleToggleActive = async (id: Id<'allowedNetworks'>) => {
    try {
      await toggleActive({ id });
    } catch (err: any) {
      alert(err.message || 'Failed to toggle network status');
    }
  };

  const handleExtendExpiry = async (id: Id<'allowedNetworks'>) => {
    try {
      await extendExpiry({ id, hours: 24 });
    } catch (err: any) {
      alert(err.message || 'Failed to extend expiry');
    }
  };

  const isAdmin = user?.role === 'admin';
  const loading = networks === undefined;

  // Check if network is expired
  const isExpired = (expiresAt?: number) => {
    if (!expiresAt) return false;
    return expiresAt < Date.now();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search networks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | NetworkType)}
            className="input w-auto"
          >
            <option value="all">All Networks</option>
            <option value="campus">Campus Networks</option>
            <option value="temporary">Temporary Networks</option>
          </select>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          Add Network
        </button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-value">{networks?.filter((n) => n.networkType === 'campus').length || 0}</p>
              <p className="stat-label">Campus Networks</p>
            </div>
            <Building2 className="w-10 h-10 text-blue-600 opacity-20" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-value">{networks?.filter((n) => n.networkType === 'temporary' && !isExpired(n.expiresAt)).length || 0}</p>
              <p className="stat-label">Active Temporary</p>
            </div>
            <Smartphone className="w-10 h-10 text-green-600 opacity-20" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-value">{networks?.filter((n) => n.isActive && !isExpired(n.expiresAt)).length || 0}</p>
              <p className="stat-label">Total Active</p>
            </div>
            <Wifi className="w-10 h-10 text-primary-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Networks Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Network</th>
                <th>IP Range</th>
                <th>Location</th>
                <th>Type</th>
                <th>Status</th>
                <th>Added By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-600" />
                  </td>
                </tr>
              ) : filteredNetworks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    No networks found
                  </td>
                </tr>
              ) : (
                filteredNetworks.map((network) => {
                  const expired = isExpired(network.expiresAt);
                  return (
                    <tr key={network._id} className={cn(expired && 'bg-gray-50 opacity-60')}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-10 h-10 rounded-lg flex items-center justify-center',
                              network.networkType === 'campus'
                                ? 'bg-blue-100 text-blue-600'
                                : 'bg-green-100 text-green-600'
                            )}
                          >
                            {network.networkType === 'campus' ? (
                              <Building2 className="w-5 h-5" />
                            ) : (
                              <Smartphone className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{network.name}</p>
                            {network.expiresAt && (
                              <p className="text-xs text-gray-500">
                                {expired ? (
                                  <span className="text-red-600">Expired</span>
                                ) : (
                                  <>Expires {formatRelativeTime(new Date(network.expiresAt))}</>
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {network.ipRange}
                        </code>
                      </td>
                      <td>{network.location}</td>
                      <td>
                        <span
                          className={cn(
                            'badge',
                            network.networkType === 'campus'
                              ? 'badge-info'
                              : 'badge-success'
                          )}
                        >
                          {network.networkType === 'campus' ? 'Campus' : 'Temporary'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleActive(network._id)}
                          className={cn(
                            'flex items-center gap-1.5 px-2 py-1 rounded-full text-sm font-medium transition-colors',
                            network.isActive && !expired
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          )}
                        >
                          {network.isActive && !expired ? (
                            <>
                              <Wifi className="w-3.5 h-3.5" />
                              Active
                            </>
                          ) : (
                            <>
                              <WifiOff className="w-3.5 h-3.5" />
                              Inactive
                            </>
                          )}
                        </button>
                      </td>
                      <td>
                        <div>
                          <p className="text-sm">{network.addedByName}</p>
                          <p className="text-xs text-gray-500 capitalize">{network.addedByRole}</p>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {network.networkType === 'temporary' && !expired && (
                            <button
                              onClick={() => handleExtendExpiry(network._id)}
                              className="btn-ghost btn-sm"
                              title="Extend by 24 hours"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                          {(isAdmin || network.networkType === 'temporary') && (
                            <button
                              onClick={() => handleDelete(network._id)}
                              className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
                              title="Delete network"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Network Verification</p>
            <p>
              Students can only mark attendance when connected to an allowed network.
              {isAdmin ? (
                <> You can add permanent campus networks.</>
              ) : (
                <> As a teacher, you can add temporary networks (e.g., mobile hotspot) that expire after 24 hours.</>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Add Network Modal */}
      {showModal && user && (
        <AddNetworkModal
          onClose={() => setShowModal(false)}
          userId={user.id as Id<'users'>}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}

// Add Network Modal Component
function AddNetworkModal({
  onClose,
  userId,
  isAdmin,
}: {
  onClose: () => void;
  userId: Id<'users'>;
  isAdmin: boolean;
}) {
  const [formData, setFormData] = useState({
    name: '',
    ipRange: '',
    location: '',
    networkType: (isAdmin ? 'campus' : 'temporary') as NetworkType,
    expiryHours: 24,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const createNetwork = useMutation(api.networks.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const expiresAt =
        formData.networkType === 'temporary'
          ? Date.now() + formData.expiryHours * 60 * 60 * 1000
          : undefined;

      await createNetwork({
        name: formData.name,
        ipRange: formData.ipRange,
        location: formData.location,
        networkType: formData.networkType,
        addedBy: userId,
        expiresAt,
      });

      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to add network');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Network Added!</h2>
            <p className="text-gray-600 mt-1">The network has been added successfully.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Add Allowed Network</h2>
            <button onClick={onClose} className="btn-ghost btn-icon">
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="alert-error mb-4">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Network Name</label>
              <input
                type="text"
                className="input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Main Campus WiFi"
                required
              />
            </div>

            <div>
              <label className="label">IP Range (CIDR notation)</label>
              <input
                type="text"
                className="input font-mono"
                value={formData.ipRange}
                onChange={(e) => setFormData({ ...formData, ipRange: e.target.value })}
                placeholder="e.g., 192.168.1.0/24 or 10.0.0.1"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Use CIDR notation for ranges (192.168.1.0/24) or single IP (192.168.1.1)
              </p>
            </div>

            <div>
              <label className="label">Location</label>
              <input
                type="text"
                className="input"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Engineering Block, Room 101"
                required
              />
            </div>

            {isAdmin && (
              <div>
                <label className="label">Network Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, networkType: 'campus' })}
                    className={cn(
                      'p-3 rounded-lg border-2 text-left transition-colors',
                      formData.networkType === 'campus'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <Building2 className={cn('w-5 h-5 mb-1', formData.networkType === 'campus' ? 'text-blue-600' : 'text-gray-400')} />
                    <p className="font-medium text-sm">Campus Network</p>
                    <p className="text-xs text-gray-500">Permanent, no expiry</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, networkType: 'temporary' })}
                    className={cn(
                      'p-3 rounded-lg border-2 text-left transition-colors',
                      formData.networkType === 'temporary'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <Smartphone className={cn('w-5 h-5 mb-1', formData.networkType === 'temporary' ? 'text-green-600' : 'text-gray-400')} />
                    <p className="font-medium text-sm">Temporary Network</p>
                    <p className="text-xs text-gray-500">Expires after set time</p>
                  </button>
                </div>
              </div>
            )}

            {formData.networkType === 'temporary' && (
              <div>
                <label className="label">Expiry Duration</label>
                <select
                  className="input"
                  value={formData.expiryHours}
                  onChange={(e) => setFormData({ ...formData, expiryHours: parseInt(e.target.value) })}
                >
                  <option value={1}>1 hour</option>
                  <option value={2}>2 hours</option>
                  <option value={4}>4 hours</option>
                  <option value={8}>8 hours</option>
                  <option value={12}>12 hours</option>
                  <option value={24}>24 hours</option>
                  <option value={48}>48 hours</option>
                  <option value={72}>72 hours (3 days)</option>
                </select>
              </div>
            )}

            {!isAdmin && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex gap-2">
                  <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                  <p className="text-sm text-yellow-800">
                    As a teacher, you can only add temporary networks. Use this for your mobile hotspot when campus WiFi is down.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Network
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
