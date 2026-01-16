'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { AlertTriangle, Check, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/app/providers';

function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function getAnomalySeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'badge badge-danger';
    case 'high': return 'badge badge-danger';
    case 'medium': return 'badge badge-warning';
    case 'low': return 'badge badge-info';
    default: return 'badge badge-gray';
  }
}

function getAnomalyTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    face_mismatch: 'Face Mismatch',
    liveness_failed: 'Liveness Check Failed',
    multiple_attempts: 'Multiple Attempts',
    duplicate_attendance: 'Duplicate Attendance',
    location_mismatch: 'Location Mismatch',
    time_anomaly: 'Time Anomaly',
    proxy_suspected: 'Proxy Suspected',
  };
  return labels[type] || type;
}

export default function AnomaliesPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'pending' | 'resolved' | 'all'>('pending');

  // Convex queries
  const anomalies = useQuery(
    api.anomalies.list,
    filter === 'all' 
      ? {} 
      : { isResolved: filter === 'resolved' }
  );

  // Convex mutations
  const resolveAnomaly = useMutation(api.anomalies.resolve);
  const dismissAnomaly = useMutation(api.anomalies.dismiss);

  const handleResolve = async (anomalyId: Id<'anomalies'>) => {
    const notes = prompt('Enter resolution notes:');
    if (!notes) return;

    try {
      if (!user?.id) return;
      await resolveAnomaly({
        id: anomalyId,
        resolvedBy: user.id as Id<'users'>,
        resolutionNotes: notes,
      });
    } catch (err: any) {
      alert(err.message || 'Failed to resolve anomaly');
    }
  };

  const handleDismiss = async (anomalyId: Id<'anomalies'>) => {
    const reason = prompt('Enter dismissal reason:');
    if (!reason) return;

    try {
      if (!user?.id) return;
      await dismissAnomaly({
        id: anomalyId,
        resolvedBy: user.id as Id<'users'>,
        reason,
      });
    } catch (err: any) {
      alert(err.message || 'Failed to dismiss anomaly');
    }
  };

  const loading = anomalies === undefined;

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex border-b border-gray-200">
        {(['pending', 'resolved', 'all'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={cn(
              'px-4 py-2 font-medium border-b-2 -mb-px capitalize',
              filter === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Anomalies List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
        </div>
      ) : anomalies.length === 0 ? (
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No anomalies found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {anomalies.map((anomaly) => (
            <div key={anomaly._id} className="card">
              <div className="card-body">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                        anomaly.severity === 'high' || anomaly.severity === 'critical'
                          ? 'bg-red-100'
                          : anomaly.severity === 'medium'
                          ? 'bg-yellow-100'
                          : 'bg-blue-100'
                      )}
                    >
                      <AlertTriangle
                        className={cn(
                          'w-5 h-5',
                          anomaly.severity === 'high' || anomaly.severity === 'critical'
                            ? 'text-red-600'
                            : anomaly.severity === 'medium'
                            ? 'text-yellow-600'
                            : 'text-blue-600'
                        )}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={getAnomalySeverityColor(anomaly.severity)}>
                          {anomaly.severity.toUpperCase()}
                        </span>
                        <h3 className="font-semibold text-gray-900">
                          {getAnomalyTypeLabel(anomaly.anomalyType)}
                        </h3>
                      </div>
                      <p className="text-gray-600 mb-2">{anomaly.reason}</p>
                      <div className="text-sm text-gray-500">
                        <p>
                          Student: {anomaly.studentName} ({anomaly.studentRollNo})
                        </p>
                        <p>Time: {formatDateTime(anomaly.attemptTime)}</p>
                        {anomaly.sessionDate && (
                          <p>Session: {anomaly.sessionDate} - {anomaly.courseName}</p>
                        )}
                        {anomaly.resolutionNotes && (
                          <p className="mt-2 text-gray-600">
                            <strong>Notes:</strong> {anomaly.resolutionNotes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {!anomaly.isResolved && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleResolve(anomaly._id)}
                        className="btn-primary btn-sm"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Resolve
                      </button>
                      <button
                        onClick={() => handleDismiss(anomaly._id)}
                        className="btn-secondary btn-sm"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Dismiss
                      </button>
                    </div>
                  )}

                  {anomaly.isResolved && (
                    <span className="badge badge-success">
                      RESOLVED
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
