'use client';

import { useState, useTransition } from 'react';
import { reviewEquipment } from './actions';
import type { AuditLog, Equipment } from '@/lib/types';

interface EquipmentWithSubmitter extends Equipment {
  profiles?: {
    display_name: string | null;
  } | null;
}

interface AdminClientProps {
  pendingEquipment: EquipmentWithSubmitter[];
  auditLogs: AuditLog[];
}

export function AdminClient({ pendingEquipment, auditLogs }: AdminClientProps) {
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAction(equipmentId: string, status: 'approved' | 'rejected') {
    setMessage(null);
    const formData = new FormData();
    formData.append('equipment_id', equipmentId);
    formData.append('status', status);
    if (reviewNote[equipmentId]) {
      formData.append('review_note', reviewNote[equipmentId]);
    }

    startTransition(async () => {
      const res = await reviewEquipment(formData);
      if (res.error) setMessage({ type: 'error', text: res.error });
      else setMessage({ type: 'success', text: res.success! });
    });
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-xl text-sm ${message.type === 'error' ? 'bg-danger-500/10 border border-danger-500/20 text-danger-400' : 'bg-success-400/10 border border-success-400/20 text-success-400'}`}>
          {message.text}
        </div>
      )}

      {/* Pending Equipment Review Queue */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold text-brand-100 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-warning-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          Pending Equipment Submissions
          {pendingEquipment.length > 0 && (
            <span className="badge badge-pending ml-2">{pendingEquipment.length} pending</span>
          )}
        </h2>

        {pendingEquipment.length === 0 ? (
          <p className="text-sm text-brand-500 text-center py-8">
            No equipment submissions waiting for review.
          </p>
        ) : (
          <div className="space-y-4">
            {pendingEquipment.map((eq) => (
              <div
                key={eq.id}
                className="p-5 rounded-xl bg-surface-800/60 border border-surface-600/40 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-brand-100">{eq.name}</h3>
                    <p className="text-xs text-brand-400">
                      Target Muscle: <strong className="text-brand-200">{eq.muscle_group}</strong>
                      {' • '}
                      Submitted {new Date(eq.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="badge badge-pending self-start sm:self-auto">Pending Review</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <input
                    type="text"
                    value={reviewNote[eq.id] ?? ''}
                    onChange={(e) =>
                      setReviewNote((prev) => ({ ...prev, [eq.id]: e.target.value }))
                    }
                    placeholder="Optional review note or feedback"
                    className="input-field text-xs flex-1"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleAction(eq.id, 'approved')}
                      className="btn btn-primary btn-sm"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleAction(eq.id, 'rejected')}
                      className="btn btn-secondary btn-sm text-danger-400 hover:border-danger-500/40"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit Log Stream */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold text-brand-100 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
          </svg>
          Recent Audit Logs
        </h2>

        {auditLogs.length === 0 ? (
          <p className="text-sm text-brand-500 text-center py-6">No audit records recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-surface-700 text-brand-400 uppercase">
                  <th className="py-2 pr-3">Timestamp</th>
                  <th className="py-2 px-3">Action</th>
                  <th className="py-2 px-3">Entity</th>
                  <th className="py-2 px-3">Entity ID</th>
                  <th className="py-2 pl-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="text-brand-300">
                    <td className="py-2.5 pr-3 text-brand-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-brand-200">{log.action}</span>
                    </td>
                    <td className="py-2.5 px-3 uppercase text-[11px]">{log.entity}</td>
                    <td className="py-2.5 px-3 font-mono text-brand-500 truncate max-w-[120px]">
                      {log.entity_id}
                    </td>
                    <td className="py-2.5 pl-3 text-brand-400 truncate max-w-[200px]">
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
