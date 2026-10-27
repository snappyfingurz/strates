'use client';

import { useState, useTransition, useEffect } from 'react';
import { startWorkoutSession, finishWorkoutSession, logWorkoutSet, deleteWorkoutSet } from './actions';
import type { Exercise, WorkoutSession, WorkoutSet } from '@/lib/types';
import { estimate1RM, getProgressiveOverloadAdvice, calculateWorkoutVolume } from '@/lib/workout';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { ProgressionPoint } from './page';

interface WorkoutSetWithExercise extends WorkoutSet {
  exercises?: {
    name: string;
    muscle_group: string;
    rep_range_low: number;
    rep_range_high: number;
  } | null;
}

interface WorkoutSessionWithSets extends WorkoutSession {
  workout_sets?: WorkoutSetWithExercise[];
}

interface WorkoutsClientProps {
  activeSession: WorkoutSessionWithSets | null;
  exercises: Exercise[];
  recentSessions: WorkoutSessionWithSets[];
  progressionSets?: ProgressionPoint[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ProgressionPoint & { label: string };
  }>;
}

function ProgressionTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border-[2.5px] border-black p-3.5 rounded-xl shadow-[4px_4px_0px_#000] text-xs space-y-2 min-w-[220px]">
        <div className="flex items-center justify-between gap-2 border-b-2 border-black/10 pb-1.5">
          <span className="font-bold text-black text-sm">{data.exerciseName}</span>
          <span className="text-[10px] bg-black text-white px-1.5 py-0.5 rounded font-mono font-bold">
            Set #{data.setNo}
          </span>
        </div>
        <p className="text-[11px] text-gray-500 font-medium">{data.displayDate}</p>

        {/* Highlighted Weight * Reps Calculation */}
        <div className="bg-[#f0f3f8] border-2 border-black/30 p-2.5 rounded-lg space-y-0.5">
          <p className="text-[10px] text-gray-600 uppercase font-black tracking-wider">Weight × Reps Score</p>
          <p className="text-base font-black text-black">
            {data.weightKg} kg × {data.reps} reps = <span className="underline decoration-2">{data.score} score</span>
          </p>
        </div>

        <div className="flex items-center justify-between text-[11px] text-gray-700 pt-0.5">
          <span>Est. 1RM: <strong>{data.est1RM} kg</strong></span>
          {data.isPR && (
            <span className="bg-black text-white font-black text-[10px] px-2 py-0.5 rounded-full border border-black shadow-[1px_1px_0px_#000]">
              ★ PR
            </span>
          )}
        </div>
      </div>
    );
  }
  return null;
}

export function WorkoutsClient({
  activeSession,
  exercises,
  recentSessions,
  progressionSets = [],
}: WorkoutsClientProps) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(
    exercises[0]?.id ?? ''
  );
  const [weightKg, setWeightKg] = useState<string>('60');
  const [reps, setReps] = useState<string>('8');
  const [rpe, setRpe] = useState<string>('8');
  const [isWarmup, setIsWarmup] = useState<boolean>(false);
  const [sessionNotes, setSessionNotes] = useState('');

  // Growth graph state
  const [chartExerciseFilter, setChartExerciseFilter] = useState<string>('all');
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId);

  // Active session sets
  const activeSets = activeSession?.workout_sets ?? [];
  const exerciseSets = activeSets.filter((s) => s.exercise_id === selectedExerciseId);
  const nextSetNo = exerciseSets.length + 1;

  const numWeight = parseFloat(weightKg) || 0;
  const numReps = parseInt(reps, 10) || 0;
  const numRpe = rpe ? parseFloat(rpe) : undefined;

  // Live 1RM estimate
  const liveEst1RM = estimate1RM(numWeight, numReps, 'epley');

  // Progressive overload advice
  const overloadAdvice = selectedExercise
    ? getProgressiveOverloadAdvice(numWeight, numReps, selectedExercise.rep_range_low, selectedExercise.rep_range_high)
    : null;

  // Total session volume
  const totalVolume = calculateWorkoutVolume(activeSets);

  function handleStartSession(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const formData = new FormData();
    if (sessionNotes) formData.append('notes', sessionNotes);

    startTransition(async () => {
      const res = await startWorkoutSession(formData);
      if (res.error) setMessage({ type: 'error', text: res.error });
      else setMessage({ type: 'success', text: res.success! });
    });
  }

  function handleFinishSession() {
    if (!activeSession) return;
    setMessage(null);
    startTransition(async () => {
      const res = await finishWorkoutSession(activeSession.id);
      if (res.error) setMessage({ type: 'error', text: res.error });
      else setMessage({ type: 'success', text: res.success! });
    });
  }

  function handleLogSet(e: React.FormEvent) {
    e.preventDefault();
    if (!activeSession || !selectedExerciseId || numWeight < 0 || numReps <= 0) return;

    setMessage(null);
    const formData = new FormData();
    formData.append('session_id', activeSession.id);
    formData.append('exercise_id', selectedExerciseId);
    formData.append('set_no', String(nextSetNo));
    formData.append('weight_kg', String(numWeight));
    formData.append('reps', String(numReps));
    if (numRpe !== undefined) formData.append('rpe', String(numRpe));
    formData.append('is_warmup', String(isWarmup));

    startTransition(async () => {
      const res = await logWorkoutSet(formData);
      if (res.error) {
        setMessage({ type: 'error', text: res.error });
      } else {
        setMessage({
          type: 'success',
          text: res.isPR ? '🎉 NEW PERSONAL RECORD! Set recorded.' : 'Set recorded.',
        });
      }
    });
  }

  function handleDeleteSet(setId: string) {
    startTransition(async () => {
      const res = await deleteWorkoutSet(setId);
      if (res.error) setMessage({ type: 'error', text: res.error });
    });
  }

  // Active sets formatted for the progression graph
  const activeProgressionSets: ProgressionPoint[] = activeSets
    .filter((s) => !s.is_warmup)
    .map((s) => {
      const w = Number(s.weight_kg) || 0;
      const r = Number(s.reps) || 0;
      const dateObj = s.created_at ? new Date(s.created_at) : new Date();
      return {
        id: s.id,
        date: dateObj.toISOString(),
        displayDate: dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        exerciseId: s.exercise_id,
        exerciseName: s.exercises?.name || 'Exercise',
        weightKg: w,
        reps: r,
        score: Math.round(w * r * 10) / 10,
        est1RM: s.est_1rm || 0,
        isPR: !!s.is_pr,
        setNo: s.set_no,
      };
    });

  // Combine progression sets and active sets (deduped by id)
  const combinedHistory = [
    ...progressionSets,
    ...activeProgressionSets.filter((a) => !progressionSets.some((p) => p.id === a.id)),
  ];

  // Filtered chart data
  const filteredProgression = chartExerciseFilter === 'all'
    ? combinedHistory
    : combinedHistory.filter((s) => s.exerciseId === chartExerciseFilter);

  const chartData = filteredProgression.map((item, idx) => ({
    ...item,
    pointIndex: idx + 1,
    label: `${item.displayDate} (#${item.setNo})`,
  }));

  const maxScore = chartData.length > 0 ? Math.max(...chartData.map((d) => d.score)) : 0;
  const bestSet = chartData.find((d) => d.score === maxScore);
  const avgScore = chartData.length > 0
    ? Math.round((chartData.reduce((acc, curr) => acc + curr.score, 0) / chartData.length) * 10) / 10
    : 0;

  return (
    <div className="space-y-6">
      {/* Status banner */}
      {message && (
        <div className={`p-4 rounded-xl text-sm ${message.type === 'error' ? 'bg-danger-500/10 border border-danger-500/20 text-danger-400' : 'bg-success-400/10 border border-success-400/20 text-success-400'}`}>
          {message.text}
        </div>
      )}

      {/* ACTIVE WORKOUT SESSION */}
      {activeSession ? (
        <div className="space-y-6">
          <div className="glass-card p-6 border-accent-500/40 bg-accent-500/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-700">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent-400 animate-pulse" />
                  <h2 className="text-xl font-bold text-brand-100">Active Workout Session</h2>
                </div>
                <p className="text-xs text-brand-400 mt-1">
                  Started at {new Date(activeSession.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {activeSession.notes && ` • ${activeSession.notes}`}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-brand-400 uppercase font-semibold">Total Volume</p>
                  <p className="text-lg font-bold text-accent-400">{totalVolume.toLocaleString()} kg</p>
                </div>
                <button
                  onClick={handleFinishSession}
                  disabled={isPending}
                  className="btn btn-accent btn-sm"
                >
                  {isPending ? 'Finishing…' : 'Finish Workout'}
                </button>
              </div>
            </div>

            {/* Set Logging Form */}
            <form onSubmit={handleLogSet} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="sm:col-span-2">
                  <label className="label">Exercise</label>
                  <select
                    value={selectedExerciseId}
                    onChange={(e) => setSelectedExerciseId(e.target.value)}
                    className="input-field"
                  >
                    {exercises.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name} ({ex.muscle_group})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    value={weightKg}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setWeightKg(e.target.value.replace(/^0+(?=\d)/, ''))}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="label">Reps</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={reps}
                    placeholder="1"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setReps(e.target.value.replace(/^0+(?=\d)/, ''))}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="label">RPE (1-10)</label>
                  <input
                    type="number"
                    step="0.5"
                    min={1}
                    max={10}
                    value={rpe}
                    placeholder="8"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setRpe(e.target.value.replace(/^0+(?=\d)/, ''))}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Set auxiliary options and live estimations */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-surface-900/80 border border-surface-700 text-xs">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-brand-300">
                    <input
                      type="checkbox"
                      checked={isWarmup}
                      onChange={(e) => setIsWarmup(e.target.checked)}
                      className="rounded border-surface-600 text-brand-500 focus:ring-0"
                    />
                    Warmup Set
                  </label>
                  <span className="text-brand-500">•</span>
                  <span className="text-brand-400">
                    Est. 1RM: <strong className="text-brand-200">{liveEst1RM} kg</strong>
                  </span>
                  {selectedExercise && (
                    <>
                      <span className="text-brand-500">•</span>
                      <span className="text-brand-400">
                        Target: <strong className="text-brand-200">{selectedExercise.rep_range_low}-{selectedExercise.rep_range_high} reps</strong>
                      </span>
                    </>
                  )}
                </div>

                {overloadAdvice && !isWarmup && (
                  <span className="text-brand-300 font-medium">
                    💡 {overloadAdvice.message}
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="btn btn-primary w-full sm:w-auto"
              >
                {isPending ? 'Logging Set…' : 'Log Set'}
              </button>
            </form>

            {/* Sets Table */}
            <div className="mt-6 pt-4 border-t border-surface-700">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-400 mb-3">
                Current Session Sets ({activeSets.length})
              </h3>

              {activeSets.length === 0 ? (
                <p className="text-xs text-brand-500 text-center py-4">No sets logged yet in this session.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-surface-700 text-brand-400 uppercase">
                        <th className="py-2 pr-3">Exercise</th>
                        <th className="py-2 px-3">Set</th>
                        <th className="py-2 px-3">Weight</th>
                        <th className="py-2 px-3">Reps</th>
                        <th className="py-2 px-3">RPE</th>
                        <th className="py-2 px-3">Est. 1RM</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 pl-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-800">
                      {activeSets.map((s) => (
                        <tr key={s.id} className="text-brand-200">
                          <td className="py-2.5 pr-3 font-semibold text-brand-100">
                            {s.exercises?.name ?? 'Exercise'}
                          </td>
                          <td className="py-2.5 px-3">#{s.set_no}</td>
                          <td className="py-2.5 px-3">{s.weight_kg} kg</td>
                          <td className="py-2.5 px-3">{s.reps}</td>
                          <td className="py-2.5 px-3">{s.rpe ?? '-'}</td>
                          <td className="py-2.5 px-3 font-mono">{s.est_1rm ?? '-'} kg</td>
                          <td className="py-2.5 px-3">
                            {s.is_pr && (
                              <span className="badge badge-pr">★ PR</span>
                            )}
                            {s.is_warmup && (
                              <span className="badge badge-warmup">Warmup</span>
                            )}
                          </td>
                          <td className="py-2.5 pl-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteSet(s.id)}
                              className="text-brand-500 hover:text-danger-400 p-1"
                              title="Delete set"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* START WORKOUT CARD */
        <div className="glass-card p-8 text-center max-w-xl mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent-500/20 flex items-center justify-center text-accent-500">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-brand-100 mb-2">Ready to Train?</h2>
          <p className="text-sm text-brand-400 mb-6">
            Start a live session to track your working sets, calculate 1RM in real time, and break personal records.
          </p>

          <form onSubmit={handleStartSession} className="space-y-4 max-w-md mx-auto">
            <input
              type="text"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="Session notes (e.g. Push Day A, Heavy Bench)"
              className="input-field text-sm"
            />
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-accent w-full"
            >
              {isPending ? 'Starting…' : 'Start Workout Session'}
            </button>
          </form>
        </div>
      )}

      {/* WORKOUT GROWTH & PROGRESSION GENERATOR */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-surface-700">
          <div>
            <h2 className="text-lg font-bold text-brand-100 flex items-center gap-2">
              <svg className="w-5 h-5 text-accent-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
              Growth &amp; Progression Generator
            </h2>
            <p className="text-xs text-brand-400 mt-0.5">
              Visualizes progressive overload over time where Score = Weight (kg) × Reps. Hover over any point for calculation details.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <label className="text-xs font-bold text-brand-300 uppercase tracking-wider">Exercise:</label>
            <select
              value={chartExerciseFilter}
              onChange={(e) => setChartExerciseFilter(e.target.value)}
              className="input-field text-xs py-1.5 px-3 min-w-[180px]"
            >
              <option value="all">All Exercises</option>
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Stat Highlights */}
        {chartData.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-surface-800/80 border border-surface-600/40">
              <span className="text-[10px] uppercase font-bold text-brand-400 block">Sets Tracked</span>
              <span className="text-xl font-black text-brand-100">{chartData.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-surface-800/80 border border-surface-600/40">
              <span className="text-[10px] uppercase font-bold text-brand-400 block">Peak Set Score</span>
              <span className="text-xl font-black text-accent-400">
                {maxScore} <span className="text-xs font-normal text-brand-400">({bestSet?.weightKg}kg × {bestSet?.reps})</span>
              </span>
            </div>
            <div className="p-3 rounded-xl bg-surface-800/80 border border-surface-600/40">
              <span className="text-[10px] uppercase font-bold text-brand-400 block">Average Score</span>
              <span className="text-xl font-black text-brand-200">{avgScore}</span>
            </div>
          </div>
        )}

        {/* Chart View */}
        <div className="w-full h-80 pt-2">
          {!isMounted ? (
            <div className="h-full w-full flex items-center justify-center text-xs text-brand-500 animate-pulse">
              Loading Progression Generator…
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full w-full flex flex-col items-center justify-center border-2 border-dashed border-surface-700 rounded-xl text-center p-6 text-brand-500">
              <svg className="w-10 h-10 mb-2 text-brand-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
              <p className="text-sm font-semibold text-brand-300">No data points logged yet</p>
              <p className="text-xs text-brand-400 mt-1 max-w-sm">
                Log working sets in your session to plot your progression score (Weight × Reps) over time.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 15, right: 25, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.6} />
                <XAxis
                  dataKey="label"
                  stroke="#475569"
                  tick={{ fontSize: 10, fill: '#334155' }}
                  tickLine={{ stroke: '#334155' }}
                />
                <YAxis
                  stroke="#475569"
                  tick={{ fontSize: 10, fill: '#334155' }}
                  tickLine={{ stroke: '#334155' }}
                  domain={['auto', 'auto']}
                  label={{ value: 'Score (kg × reps)', angle: -90, position: 'insideLeft', offset: 15, style: { fontSize: 10, fill: '#64748b', fontWeight: 'bold' } }}
                />
                <Tooltip content={<ProgressionTooltip />} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#000000"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#ffffff', stroke: '#000000', strokeWidth: 2 }}
                  activeDot={{ r: 8, fill: '#000000', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* PAST WORKOUTS HISTORY */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold text-brand-100 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          Past Workout Sessions
        </h2>

        {recentSessions.length === 0 ? (
          <p className="text-sm text-brand-500 text-center py-6">
            No completed workouts recorded yet. Start your first session above!
          </p>
        ) : (
          <div className="space-y-3">
            {recentSessions.map((session) => {
              const sets = session.workout_sets ?? [];
              const volume = calculateWorkoutVolume(sets);
              const prCount = sets.filter((s) => s.is_pr).length;

              return (
                <div
                  key={session.id}
                  className="p-4 rounded-xl bg-surface-800/50 border border-surface-600/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-brand-100 text-sm">
                        {session.notes || 'Workout Session'}
                      </p>
                      {prCount > 0 && (
                        <span className="badge badge-pr">
                          ★ {prCount} {prCount === 1 ? 'PR' : 'PRs'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-brand-400 mt-1">
                      {new Date(session.started_at).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                      {' • '}
                      {new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 text-xs text-brand-300">
                    <div>
                      <span className="text-brand-500 block uppercase text-[10px]">Sets</span>
                      <strong className="text-brand-100">{sets.length}</strong>
                    </div>
                    <div>
                      <span className="text-brand-500 block uppercase text-[10px]">Volume</span>
                      <strong className="text-accent-400">{volume.toLocaleString()} kg</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
