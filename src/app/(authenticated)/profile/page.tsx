import { requireUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Profile } from '@/lib/models/Profile';
import { BodyWeight } from '@/lib/models/BodyWeight';
import { DailyTarget } from '@/lib/models/DailyTarget';
import { ProfileClient } from './profile-client';
import mongoose from 'mongoose';
import type { BodyWeight as BodyWeightType, DailyTarget as DailyTargetType, Profile as ProfileType } from '@/lib/types';

export default async function ProfilePage() {
  const session = await requireUser();
  await connectDB();

  const userObjId = new mongoose.Types.ObjectId(session.userId);

  // Fetch profile
  const rawProfile = await Profile.findOne({ userId: userObjId }).lean();
  const profile: ProfileType | null = rawProfile
    ? {
        id: rawProfile._id.toString(),
        display_name: session.displayName || null,
        role: session.role,
        sex: rawProfile.sex || null,
        birth_year: rawProfile.birthYear ?? null,
        height_cm: rawProfile.heightCm ?? null,
        activity_level: rawProfile.activityLevel || null,
        goal: rawProfile.goal || null,
        unit_system: rawProfile.unitSystem || 'metric',
        created_at: rawProfile.createdAt?.toISOString() || '',
        updated_at: rawProfile.updatedAt?.toISOString() || '',
      }
    : null;

  // Fetch latest 10 weights
  const rawWeights = await BodyWeight.find({ userId: userObjId })
    .sort({ measuredOn: -1 })
    .limit(10)
    .lean();

  const weightHistory: BodyWeightType[] = rawWeights.map((w) => ({
    id: w._id.toString(),
    user_id: session.userId,
    measured_on: w.measuredOn,
    weight_kg: w.weightKg,
    created_at: w.createdAt?.toISOString() || '',
  }));

  const latestWeight = weightHistory.length > 0 ? weightHistory[0] : null;

  // Fetch active target
  const rawTarget = await DailyTarget.findOne({ userId: userObjId })
    .sort({ effectiveFrom: -1 })
    .lean();

  const currentTarget: DailyTargetType | null = rawTarget
    ? {
        id: rawTarget._id.toString(),
        user_id: session.userId,
        effective_from: rawTarget.effectiveFrom,
        kcal: rawTarget.kcal,
        protein_g: rawTarget.proteinG,
        reason: rawTarget.reason,
        created_at: rawTarget.createdAt?.toISOString() || '',
      }
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight text-brand-100">Profile &amp; Settings</h1>
        <p className="text-sm text-brand-400">
          Manage your personal biometric stats, fitness goals, and caloric targets.
        </p>
      </div>

      <ProfileClient
        profile={profile}
        latestWeight={latestWeight}
        weightHistory={weightHistory}
        currentTarget={currentTarget}
      />
    </div>
  );
}
