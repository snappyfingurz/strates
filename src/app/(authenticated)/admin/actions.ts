'use server';

import { requireAdmin } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Equipment } from '@/lib/models/Equipment';
import { AuditLog } from '@/lib/models/AuditLog';
import { equipmentReviewSchema } from '@/lib/schemas';
import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';

export type ActionResponse = {
  error?: string;
  success?: string;
};

export async function reviewEquipment(formData: FormData): Promise<ActionResponse> {
  // Strict admin authorization
  const admin = await requireAdmin();

  const equipmentId = formData.get('equipment_id') as string;
  const status = formData.get('status') as string;
  const reviewNote = (formData.get('review_note') as string)?.trim() || undefined;

  if (!mongoose.Types.ObjectId.isValid(equipmentId)) {
    return { error: 'Invalid equipment ID' };
  }

  const parsed = equipmentReviewSchema.safeParse({ status, review_note: reviewNote });
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  await connectDB();
  const eqObjId = new mongoose.Types.ObjectId(equipmentId);
  const adminObjId = new mongoose.Types.ObjectId(admin.userId);

  const updated = await Equipment.findByIdAndUpdate(
    eqObjId,
    {
      $set: {
        status: parsed.data.status,
        reviewedBy: adminObjId,
        reviewNote: parsed.data.review_note || null,
      },
    },
    { new: true }
  );

  if (!updated) {
    return { error: 'Equipment item not found.' };
  }

  // Create audit log entry
  await AuditLog.create({
    actorId: adminObjId,
    action: `equipment_${parsed.data.status}`,
    entity: 'equipment',
    entityId: eqObjId,
    details: {
      equipmentName: updated.name,
      reviewNote: parsed.data.review_note ?? null,
      reviewedAt: new Date(),
    },
  });

  revalidatePath('/admin');
  return { success: `Equipment marked as ${parsed.data.status}.` };
}
