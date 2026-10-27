import { requireAdmin } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Equipment } from '@/lib/models/Equipment';
import { AuditLog } from '@/lib/models/AuditLog';
import { AdminClient } from './admin-client';
import type { AuditLog as AuditLogType, Equipment as EquipmentType } from '@/lib/types';

export default async function AdminPage() {
  // Strict admin authorization: throws 403 / redirects if not admin
  await requireAdmin();
  await connectDB();

  // Fetch pending equipment
  const rawPending = await Equipment.find({ status: 'pending' })
    .populate('submittedBy', 'displayName email')
    .sort({ createdAt: -1 })
    .lean();

  const pendingEquipment: EquipmentType[] = rawPending.map((eq) => ({
    id: eq._id.toString(),
    name: eq.name,
    muscle_group: eq.muscleGroup,
    image_path: eq.fileId ? `/api/files/${eq.fileId.toString()}` : null,
    status: eq.status,
    submitted_by: eq.submittedBy ? eq.submittedBy.toString() : '',
    reviewed_by: eq.reviewedBy ? eq.reviewedBy.toString() : null,
    review_note: eq.reviewNote || null,
    created_at: eq.createdAt?.toISOString() || '',
    updated_at: eq.updatedAt?.toISOString() || '',
  }));

  // Fetch recent audit logs
  const rawAudit = await AuditLog.find()
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const auditLogs: AuditLogType[] = rawAudit.map((log) => ({
    id: log._id.toString(),
    actor_id: log.actorId.toString(),
    action: log.action,
    entity: log.entity,
    entity_id: log.entityId.toString(),
    details: log.details as Record<string, unknown> | null,
    created_at: log.createdAt?.toISOString() || '',
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight text-brand-100">Admin Control Center</h1>
        <p className="text-sm text-brand-400">
          Moderate community equipment submissions, inspect audit logs, and maintain system integrity.
        </p>
      </div>

      <AdminClient
        pendingEquipment={pendingEquipment}
        auditLogs={auditLogs}
      />
    </div>
  );
}
