import { requireUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Exercise } from '@/lib/models/Exercise';
import { WorkoutSession } from '@/lib/models/WorkoutSession';
import { WorkoutSet } from '@/lib/models/WorkoutSet';
import { WorkoutsClient } from './workouts-client';
import mongoose from 'mongoose';
import type {
  Exercise as ExerciseType,
  WorkoutSession as WorkoutSessionType,
  WorkoutSet as WorkoutSetType,
} from '@/lib/types';

interface WorkoutSetWithExercise extends WorkoutSetType {
  exercises?: {
    name: string;
    muscle_group: string;
    rep_range_low: number;
    rep_range_high: number;
  } | null;
}

interface WorkoutSessionWithSets extends WorkoutSessionType {
  workout_sets?: WorkoutSetWithExercise[];
}

export interface ProgressionPoint {
  id: string;
  date: string;
  displayDate: string;
  exerciseId: string;
  exerciseName: string;
  weightKg: number;
  reps: number;
  score: number; // weightKg * reps
  est1RM: number;
  isPR: boolean;
  setNo: number;
}

export default async function WorkoutsPage() {
  const session = await requireUser();
  await connectDB();

  const userObjId = new mongoose.Types.ObjectId(session.userId);

  // Fetch exercises catalog
  const rawExercises = await Exercise.find({
    $or: [{ ownerId: null }, { ownerId: userObjId }],
  })
    .sort({ name: 1 })
    .lean();

  const exercises: ExerciseType[] = rawExercises.map((ex) => ({
    id: ex._id.toString(),
    name: ex.name,
    muscle_group: ex.muscleGroup,
    equipment_id: ex.equipmentId ? ex.equipmentId.toString() : null,
    owner_id: ex.ownerId ? ex.ownerId.toString() : null,
    rep_range_low: ex.repRangeLow,
    rep_range_high: ex.repRangeHigh,
    created_at: ex.createdAt?.toISOString() || '',
  }));

  // Fetch all non-warmup sets for strict PR detection and progression graph
  const allUserSets = await WorkoutSet.find({
    userId: userObjId,
    isWarmup: false,
  })
    .populate('exerciseId', 'name muscleGroup')
    .sort({ createdAt: 1 })
    .lean();

  // Find the single highest weight set for each exercise
  const highestSetIdByExercise = new Map<string, string>();
  const topMetricByExercise = new Map<string, { weight: number; reps: number; id: string }>();

  for (const s of allUserSets) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exRef = s.exerciseId as any;
    const exId = exRef?._id ? exRef._id.toString() : s.exerciseId.toString();
    const curr = topMetricByExercise.get(exId);
    if (!curr || s.weightKg > curr.weight || (s.weightKg === curr.weight && s.reps > curr.reps)) {
      topMetricByExercise.set(exId, { weight: s.weightKg, reps: s.reps, id: s._id.toString() });
      highestSetIdByExercise.set(exId, s._id.toString());
    }
  }

  // Clean up any stale PR flags in MongoDB so that only the highest set per exercise holds isPR: true
  const stalePRIds: mongoose.Types.ObjectId[] = [];
  const missingPRIds: mongoose.Types.ObjectId[] = [];
  for (const s of allUserSets) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exRef = s.exerciseId as any;
    const exId = exRef?._id ? exRef._id.toString() : s.exerciseId.toString();
    const isTop = highestSetIdByExercise.get(exId) === s._id.toString();
    if (s.isPR && !isTop) {
      stalePRIds.push(s._id);
    } else if (!s.isPR && isTop) {
      missingPRIds.push(s._id);
    }
  }

  if (stalePRIds.length > 0) {
    await WorkoutSet.updateMany({ _id: { $in: stalePRIds } }, { $set: { isPR: false } });
  }
  if (missingPRIds.length > 0) {
    await WorkoutSet.updateMany({ _id: { $in: missingPRIds } }, { $set: { isPR: true } });
  }

  // Build progression points for the growth graph generator
  const progressionSets: ProgressionPoint[] = allUserSets.map((s) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exRef = s.exerciseId as any;
    const exId = exRef?._id ? exRef._id.toString() : s.exerciseId.toString();
    const weight = Number(s.weightKg) || 0;
    const reps = Number(s.reps) || 0;
    const score = Math.round(weight * reps * 10) / 10;
    const dateObj = s.createdAt ? new Date(s.createdAt) : new Date();
    const displayDate = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      id: s._id.toString(),
      date: dateObj.toISOString(),
      displayDate,
      exerciseId: exId,
      exerciseName: exRef?.name || 'Exercise',
      weightKg: weight,
      reps,
      score,
      est1RM: s.est1RM || 0,
      isPR: highestSetIdByExercise.get(exId) === s._id.toString(),
      setNo: s.setNo,
    };
  });

  // Fetch active session (endedAt is null)
  const rawActiveSession = await WorkoutSession.findOne({
    userId: userObjId,
    endedAt: null,
  })
    .sort({ startedAt: -1 })
    .lean();

  let activeSession: WorkoutSessionWithSets | null = null;

  if (rawActiveSession) {
    const rawSets = await WorkoutSet.find({
      sessionId: rawActiveSession._id,
      userId: userObjId,
    })
      .populate('exerciseId', 'name muscleGroup repRangeLow repRangeHigh')
      .sort({ setNo: 1 })
      .lean();

    activeSession = {
      id: rawActiveSession._id.toString(),
      user_id: session.userId,
      started_at: rawActiveSession.startedAt.toISOString(),
      ended_at: null,
      routine_id: null,
      notes: rawActiveSession.notes || null,
      created_at: rawActiveSession.createdAt?.toISOString() || '',
      workout_sets: rawSets.map((s) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const exRef = s.exerciseId as any;
        const exId = exRef?._id ? exRef._id.toString() : s.exerciseId.toString();
        const isPR = !s.isWarmup && highestSetIdByExercise.get(exId) === s._id.toString();

        return {
          id: s._id.toString(),
          session_id: rawActiveSession._id.toString(),
          user_id: session.userId,
          exercise_id: exId,
          set_no: s.setNo,
          weight_kg: s.weightKg,
          reps: s.reps,
          rpe: s.rpe ?? null,
          is_warmup: s.isWarmup,
          est_1rm: s.est1RM ?? null,
          is_pr: isPR,
          client_id: s.clientId,
          created_at: s.createdAt?.toISOString() || '',
          exercises: exRef?.name
            ? {
                name: exRef.name,
                muscle_group: exRef.muscleGroup,
                rep_range_low: exRef.repRangeLow,
                rep_range_high: exRef.repRangeHigh,
              }
            : null,
        };
      }),
    };
  }

  // Fetch recent completed sessions (endedAt is not null)
  const rawRecentSessions = await WorkoutSession.find({
    userId: userObjId,
    endedAt: { $ne: null },
  })
    .sort({ startedAt: -1 })
    .limit(10)
    .lean();

  const recentSessions: WorkoutSessionWithSets[] = await Promise.all(
    rawRecentSessions.map(async (sess) => {
      const rawSets = await WorkoutSet.find({
        sessionId: sess._id,
        userId: userObjId,
      })
        .populate('exerciseId', 'name muscleGroup repRangeLow repRangeHigh')
        .sort({ setNo: 1 })
        .lean();

      return {
        id: sess._id.toString(),
        user_id: session.userId,
        started_at: sess.startedAt.toISOString(),
        ended_at: sess.endedAt ? sess.endedAt.toISOString() : null,
        routine_id: null,
        notes: sess.notes || null,
        created_at: sess.createdAt?.toISOString() || '',
        workout_sets: rawSets.map((s) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const exRef = s.exerciseId as any;
          const exId = exRef?._id ? exRef._id.toString() : s.exerciseId.toString();
          const isPR = !s.isWarmup && highestSetIdByExercise.get(exId) === s._id.toString();

          return {
            id: s._id.toString(),
            session_id: sess._id.toString(),
            user_id: session.userId,
            exercise_id: exId,
            set_no: s.setNo,
            weight_kg: s.weightKg,
            reps: s.reps,
            rpe: s.rpe ?? null,
            is_warmup: s.isWarmup,
            est_1rm: s.est1RM ?? null,
            is_pr: isPR,
            client_id: s.clientId,
            created_at: s.createdAt?.toISOString() || '',
            exercises: exRef?.name
              ? {
                  name: exRef.name,
                  muscle_group: exRef.muscleGroup,
                  rep_range_low: exRef.repRangeLow,
                  rep_range_high: exRef.repRangeHigh,
                }
              : null,
          };
        }),
      };
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight text-brand-100">Workout Logger &amp; PR Tracker</h1>
        <p className="text-sm text-brand-400">
          Track sets with live 1RM calculation, progressive overload guidance, and PR detection.
        </p>
      </div>

      <WorkoutsClient
        activeSession={activeSession}
        exercises={exercises}
        recentSessions={recentSessions}
        progressionSets={progressionSets}
      />
    </div>
  );
}
