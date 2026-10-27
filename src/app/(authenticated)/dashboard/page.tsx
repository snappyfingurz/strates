import { requireUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { DailyTarget } from '@/lib/models/DailyTarget';
import { FoodLog } from '@/lib/models/FoodLog';
import { BodyWeight } from '@/lib/models/BodyWeight';
import { WorkoutSession } from '@/lib/models/WorkoutSession';
import { WorkoutSet } from '@/lib/models/WorkoutSet';
import type {
  BodyWeight as BodyWeightType,
  DailyTarget as DailyTargetType,
  WorkoutSession as WorkoutSessionType,
  WorkoutSet as WorkoutSetType,
} from '@/lib/types';
import Link from 'next/link';
import mongoose from 'mongoose';

interface WorkoutSetWithExercise extends WorkoutSetType {
  exercises?: {
    name: string;
  } | null;
}

interface WorkoutSessionWithSets extends WorkoutSessionType {
  workout_sets?: WorkoutSetWithExercise[];
}

export default async function DashboardPage() {
  const session = await requireUser();
  await connectDB();

  const userObjId = new mongoose.Types.ObjectId(session.userId);
  const today = new Date().toISOString().split('T')[0];

  // Fetch current active target
  const rawTarget = await DailyTarget.findOne({ userId: userObjId })
    .sort({ effectiveFrom: -1 })
    .lean();

  const target: DailyTargetType | null = rawTarget
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

  // Fetch today's food logs
  const todayLogs = await FoodLog.find({
    userId: userObjId,
    loggedOn: today,
  }).lean();

  const totals = todayLogs.reduce(
    (acc, log) => ({
      kcal: acc.kcal + Number(log.kcal),
      protein: acc.protein + Number(log.protein),
      carbs: acc.carbs + Number(log.carbs),
      fat: acc.fat + Number(log.fat),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Meal breakdown
  const mealKcal = {
    breakfast: todayLogs.filter((l) => l.meal === 'breakfast').reduce((s, l) => s + Number(l.kcal), 0),
    lunch: todayLogs.filter((l) => l.meal === 'lunch').reduce((s, l) => s + Number(l.kcal), 0),
    dinner: todayLogs.filter((l) => l.meal === 'dinner').reduce((s, l) => s + Number(l.kcal), 0),
    snack: todayLogs.filter((l) => l.meal === 'snack').reduce((s, l) => s + Number(l.kcal), 0),
  };

  // Fetch latest weight
  const rawWeight = await BodyWeight.findOne({ userId: userObjId })
    .sort({ measuredOn: -1 })
    .lean();

  const latestWeight: BodyWeightType | null = rawWeight
    ? {
        id: rawWeight._id.toString(),
        user_id: session.userId,
        measured_on: rawWeight.measuredOn,
        weight_kg: rawWeight.weightKg,
        created_at: rawWeight.createdAt?.toISOString() || '',
      }
    : null;

  // Fetch recent workouts
  const rawRecentWorkouts = await WorkoutSession.find({
    userId: userObjId,
  })
    .sort({ startedAt: -1 })
    .limit(3)
    .lean();

  const recentWorkouts: WorkoutSessionWithSets[] = await Promise.all(
    rawRecentWorkouts.map(async (w) => {
      const rawSets = await WorkoutSet.find({
        sessionId: w._id,
        userId: userObjId,
      })
        .populate('exerciseId', 'name')
        .lean();

      return {
        id: w._id.toString(),
        user_id: session.userId,
        started_at: w.startedAt.toISOString(),
        ended_at: w.endedAt ? w.endedAt.toISOString() : null,
        routine_id: null,
        notes: w.notes || null,
        created_at: w.createdAt?.toISOString() || '',
        workout_sets: rawSets.map((s) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const exRef = s.exerciseId as any;
          return {
            id: s._id.toString(),
            session_id: w._id.toString(),
            user_id: session.userId,
            exercise_id: exRef?._id ? exRef._id.toString() : s.exerciseId.toString(),
            set_no: s.setNo,
            weight_kg: s.weightKg,
            reps: s.reps,
            rpe: s.rpe ?? null,
            is_warmup: s.isWarmup,
            est_1rm: s.est1RM ?? null,
            is_pr: s.isPR,
            client_id: s.clientId,
            created_at: s.createdAt?.toISOString() || '',
            exercises: exRef?.name ? { name: exRef.name } : null,
          };
        }),
      };
    })
  );

  const hasTarget = !!target;
  const kcalPercent = hasTarget ? Math.min((totals.kcal / target.kcal) * 100, 100) : 0;
  const proteinPercent = hasTarget ? Math.min((totals.protein / target.protein_g) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-brand-100">Performance Dashboard</h1>
          <p className="text-sm text-brand-400">
            Real-time daily macros, training volume, and biometric progression.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/foods" className="btn btn-primary btn-sm">
            + Log Food
          </Link>
          <Link href="/workouts" className="btn btn-accent btn-sm">
            + Start Workout
          </Link>
        </div>
      </div>

      {!hasTarget && (
        <div className="glass-card p-6 border-l-4 border-l-warning-400">
          <h2 className="font-semibold text-warning-400 mb-1">Set up your biometric profile</h2>
          <p className="text-sm text-brand-400">
            Calculate your personalized BMR, TDEE, and daily caloric &amp; protein targets.
          </p>
          <Link href="/profile" className="btn btn-primary btn-sm mt-3 inline-flex">
            Go to Profile →
          </Link>
        </div>
      )}

      {/* Macro cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Calories */}
        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-500 mb-2">Calories</p>
          <p className="text-3xl font-bold text-brand-100">
            {Math.round(totals.kcal)}
            {hasTarget && (
              <span className="text-base font-normal text-brand-500"> / {Math.round(target.kcal)}</span>
            )}
          </p>
          {hasTarget && (
            <div className="mt-3 progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${kcalPercent}%`,
                  background:
                    kcalPercent > 100
                      ? 'var(--color-danger-400)'
                      : kcalPercent > 90
                      ? 'var(--color-warning-400)'
                      : 'var(--color-brand-500)',
                }}
              />
            </div>
          )}
        </div>

        {/* Protein */}
        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-500 mb-2">Protein</p>
          <p className="text-3xl font-bold text-brand-100">
            {Math.round(totals.protein)}g
            {hasTarget && (
              <span className="text-base font-normal text-brand-500"> / {Math.round(target.protein_g)}g</span>
            )}
          </p>
          {hasTarget && (
            <div className="mt-3 progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${proteinPercent}%`,
                  background: 'var(--color-accent-500)',
                }}
              />
            </div>
          )}
        </div>

        {/* Carbs */}
        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-500 mb-2">Carbs</p>
          <p className="text-3xl font-bold text-brand-100">
            {Math.round(totals.carbs)}g
          </p>
          <p className="text-xs text-brand-500 mt-2">Energy &amp; Glycogen</p>
        </div>

        {/* Fat */}
        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-500 mb-2">Fat</p>
          <p className="text-3xl font-bold text-brand-100">
            {Math.round(totals.fat)}g
          </p>
          <p className="text-xs text-brand-500 mt-2">Hormonal Health</p>
        </div>
      </div>

      {/* Grid: Meals breakdown & Biometrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meal Breakdown Card */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-brand-100 flex items-center gap-2">
              <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Today&apos;s Meal Timing
            </h2>
            <Link href="/foods" className="text-xs text-brand-300 hover:text-brand-100">
              Manage Foods →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-surface-800/60 border border-surface-600/40 text-center">
              <p className="text-xs text-brand-400 font-semibold uppercase">Breakfast</p>
              <p className="text-lg font-bold text-brand-100 mt-1">{Math.round(mealKcal.breakfast)}</p>
              <span className="text-[10px] text-brand-500">kcal</span>
            </div>
            <div className="p-3 rounded-xl bg-surface-800/60 border border-surface-600/40 text-center">
              <p className="text-xs text-brand-400 font-semibold uppercase">Lunch</p>
              <p className="text-lg font-bold text-brand-100 mt-1">{Math.round(mealKcal.lunch)}</p>
              <span className="text-[10px] text-brand-500">kcal</span>
            </div>
            <div className="p-3 rounded-xl bg-surface-800/60 border border-surface-600/40 text-center">
              <p className="text-xs text-brand-400 font-semibold uppercase">Dinner</p>
              <p className="text-lg font-bold text-brand-100 mt-1">{Math.round(mealKcal.dinner)}</p>
              <span className="text-[10px] text-brand-500">kcal</span>
            </div>
            <div className="p-3 rounded-xl bg-surface-800/60 border border-surface-600/40 text-center">
              <p className="text-xs text-brand-400 font-semibold uppercase">Snacks</p>
              <p className="text-lg font-bold text-brand-100 mt-1">{Math.round(mealKcal.snack)}</p>
              <span className="text-[10px] text-brand-500">kcal</span>
            </div>
          </div>
        </div>

        {/* Biometrics Card */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-brand-100 flex items-center gap-2">
              <svg className="w-5 h-5 text-accent-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-16.5-.52c-1.01.143-2.01.317-3 .52m16.5 0a48.667 48.667 0 0 1 3.75 5.53m-19.5-5.53A48.667 48.667 0 0 0 3 10.5m19.5 0a48.667 48.667 0 0 1-3.75 5.53m-12-11.06A48.667 48.667 0 0 0 3 10.5m0 0a48.667 48.667 0 0 0 3.75 5.53" />
              </svg>
              Biometric Status
            </h2>
            <Link href="/profile" className="text-xs text-brand-300 hover:text-brand-100">
              Weigh In →
            </Link>
          </div>

          <div className="flex items-center justify-around py-3">
            <div className="text-center">
              <p className="text-xs text-brand-400 font-semibold uppercase">Latest Weight</p>
              <p className="text-3xl font-black text-brand-100 mt-1">
                {latestWeight ? latestWeight.weight_kg : '--'}{' '}
                <span className="text-sm font-normal text-brand-400">kg</span>
              </p>
              <p className="text-[11px] text-brand-500 mt-0.5">
                {latestWeight ? latestWeight.measured_on : 'No weigh-ins'}
              </p>
            </div>

            <div className="h-10 w-px bg-surface-700" />

            <div className="text-center">
              <p className="text-xs text-brand-400 font-semibold uppercase">Calorie Target</p>
              <p className="text-3xl font-black text-accent-400 mt-1">
                {hasTarget ? Math.round(target.kcal) : '--'}{' '}
                <span className="text-sm font-normal text-brand-400">kcal</span>
              </p>
              <p className="text-[11px] text-brand-500 mt-0.5">
                {hasTarget ? `${Math.round(target.protein_g)}g protein` : 'Unconfigured'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Training Sessions */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-brand-100 flex items-center gap-2">
            <svg className="w-5 h-5 text-accent-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            Recent Training Sessions
          </h2>
          <Link href="/workouts" className="text-xs text-brand-300 hover:text-brand-100">
            View All Workouts →
          </Link>
        </div>

        {recentWorkouts.length === 0 ? (
          <div className="text-center py-6 text-sm text-brand-500">
            No workouts logged yet.{' '}
            <Link href="/workouts" className="text-brand-300 underline underline-offset-2">
              Start your first session
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentWorkouts.map((w) => {
              const sets = w.workout_sets ?? [];
              const prCount = sets.filter((s) => s.is_pr).length;
              return (
                <div
                  key={w.id}
                  className="p-3.5 rounded-xl bg-surface-800/50 border border-surface-600/40 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-brand-100 text-sm">
                        {w.notes || 'Workout Session'}
                      </p>
                      {prCount > 0 && (
                        <span className="badge badge-pr">★ {prCount} PR</span>
                      )}
                    </div>
                    <p className="text-xs text-brand-400 mt-0.5">
                      {new Date(w.started_at).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                      {' • '}
                      {sets.length} {sets.length === 1 ? 'set' : 'sets'}
                    </p>
                  </div>
                  <Link href="/workouts" className="btn btn-secondary btn-sm text-xs">
                    View
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
