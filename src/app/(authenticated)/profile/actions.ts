'use server';

import { requireUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Profile } from '@/lib/models/Profile';
import { BodyWeight } from '@/lib/models/BodyWeight';
import { DailyTarget } from '@/lib/models/DailyTarget';
import { profileSchema, bodyWeightSchema } from '@/lib/schemas';
import { calculateDailyTargets } from '@/lib/targets';
import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import type { ActivityLevel, Goal, Sex } from '@/lib/types';

export type ActionResponse = {
  error?: string;
  success?: string;
};

export async function updateProfile(formData: FormData): Promise<ActionResponse> {
  const session = await requireUser();

  const raw = {
    display_name: (formData.get('display_name') as string) || undefined,
    sex: (formData.get('sex') as string) || undefined,
    birth_year: formData.get('birth_year') ? Number(formData.get('birth_year')) : undefined,
    height_cm: formData.get('height_cm') ? Number(formData.get('height_cm')) : undefined,
    activity_level: (formData.get('activity_level') as string) || undefined,
    goal: (formData.get('goal') as string) || undefined,
    unit_system: (formData.get('unit_system') as string) || 'metric',
  };

  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  await connectDB();

  await Profile.findOneAndUpdate(
    { userId: new mongoose.Types.ObjectId(session.userId) },
    {
      $set: {
        sex: parsed.data.sex,
        birthYear: parsed.data.birth_year,
        heightCm: parsed.data.height_cm,
        activityLevel: parsed.data.activity_level,
        goal: parsed.data.goal,
        unitSystem: parsed.data.unit_system,
      },
    },
    { upsert: true, new: true }
  );

  revalidatePath('/profile');
  revalidatePath('/dashboard');
  return { success: 'Profile updated successfully.' };
}

export async function logBodyWeight(formData: FormData): Promise<ActionResponse> {
  const session = await requireUser();

  const raw = {
    measured_on: (formData.get('measured_on') as string) || new Date().toISOString().split('T')[0],
    weight_kg: Number(formData.get('weight_kg')),
  };

  const parsed = bodyWeightSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  await connectDB();
  const userObjId = new mongoose.Types.ObjectId(session.userId);

  // Upsert weight entry for today
  await BodyWeight.findOneAndUpdate(
    { userId: userObjId, measuredOn: parsed.data.measured_on },
    {
      $set: {
        weightKg: parsed.data.weight_kg,
      },
    },
    { upsert: true, new: true }
  );

  // Auto-recalculate target if user has full biometric profile
  const profile = await Profile.findOne({ userId: userObjId }).lean();

  if (
    profile &&
    profile.sex &&
    profile.birthYear &&
    profile.heightCm &&
    profile.activityLevel &&
    profile.goal
  ) {
    const targets = calculateDailyTargets({
      sex: profile.sex as Sex,
      birthYear: profile.birthYear,
      heightCm: Number(profile.heightCm),
      weightKg: parsed.data.weight_kg,
      activityLevel: profile.activityLevel as ActivityLevel,
      goal: profile.goal as Goal,
    });

    await DailyTarget.create({
      userId: userObjId,
      effectiveFrom: parsed.data.measured_on,
      kcal: targets.targetKcal,
      proteinG: targets.proteinG,
      reason: `Updated from weigh-in (${parsed.data.weight_kg}kg)`,
    });
  }

  revalidatePath('/profile');
  revalidatePath('/dashboard');
  return { success: 'Weight recorded and targets updated!' };
}

export async function recalculateTargets(): Promise<ActionResponse> {
  const session = await requireUser();
  await connectDB();

  const userObjId = new mongoose.Types.ObjectId(session.userId);
  const profile = await Profile.findOne({ userId: userObjId }).lean();

  if (
    !profile ||
    !profile.sex ||
    !profile.birthYear ||
    !profile.heightCm ||
    !profile.activityLevel ||
    !profile.goal
  ) {
    return { error: 'Please fill in sex, birth year, height, activity level, and goal first.' };
  }

  const latestWeight = await BodyWeight.findOne({ userId: userObjId })
    .sort({ measuredOn: -1 })
    .lean();

  if (!latestWeight) {
    return { error: 'Please log at least one body weight reading first.' };
  }

  const targets = calculateDailyTargets({
    sex: profile.sex as Sex,
    birthYear: profile.birthYear,
    heightCm: Number(profile.heightCm),
    weightKg: Number(latestWeight.weightKg),
    activityLevel: profile.activityLevel as ActivityLevel,
    goal: profile.goal as Goal,
  });

  const today = new Date().toISOString().split('T')[0];

  await DailyTarget.create({
    userId: userObjId,
    effectiveFrom: today,
    kcal: targets.targetKcal,
    proteinG: targets.proteinG,
    reason: `Recalculated for goal: ${profile.goal}`,
  });

  revalidatePath('/profile');
  revalidatePath('/dashboard');
  return { success: 'Daily targets recalculated successfully!' };
}
