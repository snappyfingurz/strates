'use server';

import { requireUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { WorkoutSession } from '@/lib/models/WorkoutSession';
import { WorkoutSet } from '@/lib/models/WorkoutSet';
import { workoutSetSchema, workoutSessionSchema } from '@/lib/schemas';
import { estimate1RM, checkIsPR } from '@/lib/workout';
import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';

export type ActionResponse = {
  error?: string;
  success?: string;
  sessionId?: string;
  setId?: string;
  isPR?: boolean;
};

export async function startWorkoutSession(formData: FormData): Promise<ActionResponse> {
  const session = await requireUser();

  const notes = (formData.get('notes') as string)?.trim() || undefined;

  const parsed = workoutSessionSchema.safeParse({ notes });
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  await connectDB();

  const newSession = await WorkoutSession.create({
    userId: new mongoose.Types.ObjectId(session.userId),
    startedAt: new Date(),
    notes: parsed.data.notes || undefined,
  });

  revalidatePath('/workouts');
  revalidatePath('/dashboard');
  return {
    success: 'Workout session started!',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sessionId: (newSession as any)._id.toString(),
  };
}

export async function finishWorkoutSession(sessionId: string): Promise<ActionResponse> {
  const session = await requireUser();

  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    return { error: 'Invalid session ID' };
  }

  await connectDB();

  // Strict ownership check: filter by BOTH _id and userId
  const updated = await WorkoutSession.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(sessionId),
      userId: new mongoose.Types.ObjectId(session.userId),
    },
    {
      $set: { endedAt: new Date() },
    },
    { new: true }
  );

  if (!updated) {
    return { error: 'Workout session not found.' };
  }

  revalidatePath('/workouts');
  revalidatePath('/dashboard');
  return { success: 'Workout completed! Great work.' };
}

export async function logWorkoutSet(formData: FormData): Promise<ActionResponse> {
  const session = await requireUser();

  const sessionId = formData.get('session_id') as string;
  const exerciseId = formData.get('exercise_id') as string;
  const setNo = Number(formData.get('set_no'));
  const weightKg = Number(formData.get('weight_kg'));
  const reps = Number(formData.get('reps'));
  const rpe = formData.get('rpe') ? Number(formData.get('rpe')) : undefined;
  const isWarmup = formData.get('is_warmup') === 'true';
  const clientId = (formData.get('client_id') as string) || `set-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  if (!mongoose.Types.ObjectId.isValid(sessionId) || !mongoose.Types.ObjectId.isValid(exerciseId)) {
    return { error: 'Invalid session or exercise ID' };
  }

  const parsed = workoutSetSchema.safeParse({
    session_id: sessionId,
    exercise_id: exerciseId,
    set_no: setNo,
    weight_kg: weightKg,
    reps,
    rpe,
    is_warmup: isWarmup,
    client_id: clientId,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  await connectDB();
  const userObjId = new mongoose.Types.ObjectId(session.userId);
  const sessionObjId = new mongoose.Types.ObjectId(sessionId);
  const exerciseObjId = new mongoose.Types.ObjectId(exerciseId);

  // Verify the session belongs to this user
  const activeSession = await WorkoutSession.findOne({
    _id: sessionObjId,
    userId: userObjId,
  });

  if (!activeSession) {
    return { error: 'Active workout session not found.' };
  }

  // Calculate estimated 1RM
  const est1RM = estimate1RM(weightKg, reps, 'epley');

  // Check for personal record: only the highest weight (with tie-break on reps) gets the PR
  const previousSets = await WorkoutSet.find({
    userId: userObjId,
    exerciseId: exerciseObjId,
    isWarmup: false,
  })
    .select('weightKg reps est1RM')
    .lean();

  let isPR = false;
  if (!isWarmup) {
    if (previousSets.length === 0) {
      isPR = true;
    } else {
      const maxWeight = Math.max(...previousSets.map((s) => s.weightKg));
      const setsAtMax = previousSets.filter((s) => s.weightKg === maxWeight);
      const maxRepsAtMaxWeight = Math.max(...setsAtMax.map((s) => s.reps));

      if (weightKg > maxWeight || (weightKg === maxWeight && reps > maxRepsAtMaxWeight)) {
        isPR = true;
      }
    }
  }

  // If this set is a new PR, remove PR badge from all previous sets of this exercise
  if (isPR) {
    await WorkoutSet.updateMany(
      {
        userId: userObjId,
        exerciseId: exerciseObjId,
      },
      { $set: { isPR: false } }
    );
  }

  try {
    const inserted = await WorkoutSet.create({
      sessionId: sessionObjId,
      userId: userObjId,
      exerciseId: exerciseObjId,
      setNo,
      weightKg,
      reps,
      rpe: parsed.data.rpe,
      isWarmup,
      est1RM,
      isPR,
      clientId,
    });

    revalidatePath('/workouts');
    revalidatePath('/dashboard');
    return {
      success: isPR ? 'New Personal Record (PR) logged!' : 'Set logged successfully.',
      setId: inserted._id.toString(),
      isPR,
    };
  } catch (err: unknown) {
    // Idempotency: duplicate key error handling
    if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
      return { success: 'Set already logged.' };
    }
    throw err;
  }
}

export async function deleteWorkoutSet(setId: string): Promise<ActionResponse> {
  const session = await requireUser();

  if (!mongoose.Types.ObjectId.isValid(setId)) {
    return { error: 'Invalid set ID' };
  }

  await connectDB();
  const userObjId = new mongoose.Types.ObjectId(session.userId);

  // Strict ownership check: filter by BOTH _id and userId
  const deleted = await WorkoutSet.findOneAndDelete({
    _id: new mongoose.Types.ObjectId(setId),
    userId: userObjId,
  });

  if (!deleted) {
    return { error: 'Workout set not found.' };
  }

  // If deleted set was the PR set, re-assign PR to remaining highest set
  if (deleted.isPR) {
    const remainingSets = await WorkoutSet.find({
      userId: userObjId,
      exerciseId: deleted.exerciseId,
      isWarmup: false,
    })
      .sort({ weightKg: -1, reps: -1, est1RM: -1 })
      .limit(1);

    if (remainingSets.length > 0) {
      await WorkoutSet.updateMany(
        { userId: userObjId, exerciseId: deleted.exerciseId },
        { $set: { isPR: false } }
      );
      await WorkoutSet.findByIdAndUpdate(remainingSets[0]._id, { $set: { isPR: true } });
    }
  }

  revalidatePath('/workouts');
  revalidatePath('/dashboard');
  return { success: 'Set deleted.' };
}
