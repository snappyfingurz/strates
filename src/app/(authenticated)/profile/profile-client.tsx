'use client';

import { useState, useTransition } from 'react';
import { updateProfile, logBodyWeight, recalculateTargets } from './actions';
import type { BodyWeight, DailyTarget, Profile } from '@/lib/types';

interface ProfileClientProps {
  profile: Profile | null;
  latestWeight: BodyWeight | null;
  weightHistory: BodyWeight[];
  currentTarget: DailyTarget | null;
}

export function ProfileClient({
  profile,
  latestWeight,
  weightHistory,
  currentTarget,
}: ProfileClientProps) {
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [weightMsg, setWeightMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [targetMsg, setTargetMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isProfilePending, startProfileTransition] = useTransition();
  const [isWeightPending, startWeightTransition] = useTransition();
  const [isTargetPending, startTargetTransition] = useTransition();

  const todayStr = new Date().toISOString().split('T')[0];

  function handleProfileSubmit(formData: FormData) {
    setProfileMsg(null);
    startProfileTransition(async () => {
      const res = await updateProfile(formData);
      if (res.error) setProfileMsg({ type: 'error', text: res.error });
      else if (res.success) setProfileMsg({ type: 'success', text: res.success });
    });
  }

  function handleWeightSubmit(formData: FormData) {
    setWeightMsg(null);
    startWeightTransition(async () => {
      const res = await logBodyWeight(formData);
      if (res.error) setWeightMsg({ type: 'error', text: res.error });
      else if (res.success) setWeightMsg({ type: 'success', text: res.success });
    });
  }

  function handleRecalculate() {
    setTargetMsg(null);
    startTargetTransition(async () => {
      const res = await recalculateTargets();
      if (res.error) setTargetMsg({ type: 'error', text: res.error });
      else if (res.success) setTargetMsg({ type: 'success', text: res.success });
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Column 1 & 2: Personal info and Targets */}
      <div className="lg:col-span-2 space-y-6">
        {/* Profile Card */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold text-brand-100 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            Personal Parameters
          </h2>

          {profileMsg && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${profileMsg.type === 'error' ? 'bg-danger-500/10 border border-danger-500/20 text-danger-400' : 'bg-success-400/10 border border-success-400/20 text-success-400'}`}>
              {profileMsg.text}
            </div>
          )}

          <form action={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Display Name</label>
                <input
                  type="text"
                  name="display_name"
                  defaultValue={profile?.display_name ?? ''}
                  className="input-field"
                  placeholder="e.g. Alex"
                />
              </div>

              <div>
                <label className="label">Biological Sex</label>
                <select
                  name="sex"
                  defaultValue={profile?.sex ?? ''}
                  className="input-field"
                >
                  <option value="">Select Sex</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div>
                <label className="label">Birth Year</label>
                <input
                  type="number"
                  name="birth_year"
                  defaultValue={profile?.birth_year ?? 1998}
                  min={1920}
                  max={new Date().getFullYear()}
                  className="input-field"
                />
              </div>

              <div>
                <label className="label">Height (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  name="height_cm"
                  defaultValue={profile?.height_cm ?? ''}
                  placeholder="e.g. 178"
                  className="input-field"
                />
              </div>

              <div>
                <label className="label">Activity Level</label>
                <select
                  name="activity_level"
                  defaultValue={profile?.activity_level ?? 'moderate'}
                  className="input-field"
                >
                  <option value="sedentary">Sedentary (desk job, little exercise)</option>
                  <option value="light">Light (exercise 1-3 days/week)</option>
                  <option value="moderate">Moderate (exercise 3-5 days/week)</option>
                  <option value="active">Active (intense exercise 6-7 days/week)</option>
                </select>
              </div>

              <div>
                <label className="label">Fitness Goal</label>
                <select
                  name="goal"
                  defaultValue={profile?.goal ?? 'maintain'}
                  className="input-field"
                >
                  <option value="cut">Cut (-500 kcal / high protein)</option>
                  <option value="maintain">Maintain (energy balance)</option>
                  <option value="bulk">Bulk (+300 kcal / lean mass)</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isProfilePending}
                className="btn btn-primary"
              >
                {isProfilePending ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Nutrition Target Card */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-brand-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-accent-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
                Current Nutrition Target
              </h2>
              <p className="text-xs text-brand-400 mt-0.5">
                Calculated using Mifflin-St Jeor equation and body metrics
              </p>
            </div>
            <button
              onClick={handleRecalculate}
              disabled={isTargetPending}
              className="btn btn-secondary btn-sm"
            >
              {isTargetPending ? 'Recalculating...' : 'Recalculate'}
            </button>
          </div>

          {targetMsg && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${targetMsg.type === 'error' ? 'bg-danger-500/10 border border-danger-500/20 text-danger-400' : 'bg-success-400/10 border border-success-400/20 text-success-400'}`}>
              {targetMsg.text}
            </div>
          )}

          {currentTarget ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-surface-800/80 p-4 rounded-xl border border-surface-600/40">
                <p className="text-xs text-brand-400 uppercase font-semibold">Daily Calories</p>
                <p className="text-2xl font-bold text-brand-100 mt-1">{Math.round(currentTarget.kcal)} <span className="text-xs text-brand-500 font-normal">kcal</span></p>
              </div>
              <div className="bg-surface-800/80 p-4 rounded-xl border border-surface-600/40">
                <p className="text-xs text-brand-400 uppercase font-semibold">Daily Protein</p>
                <p className="text-2xl font-bold text-accent-400 mt-1">{Math.round(currentTarget.protein_g)} <span className="text-xs text-brand-500 font-normal">g</span></p>
              </div>
              <div className="col-span-2 sm:col-span-1 bg-surface-800/80 p-4 rounded-xl border border-surface-600/40">
                <p className="text-xs text-brand-400 uppercase font-semibold">Target Basis</p>
                <p className="text-sm font-medium text-brand-300 mt-1 truncate">{currentTarget.reason}</p>
                <p className="text-xs text-brand-500 mt-0.5">From {currentTarget.effective_from}</p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-surface-800/50 border border-dashed border-surface-600 text-center">
              <p className="text-sm text-brand-400">No active targets set yet.</p>
              <p className="text-xs text-brand-500 mt-1">Complete your profile and log a weigh-in to generate science-backed targets.</p>
            </div>
          )}
        </div>
      </div>

      {/* Column 3: Weigh-in Card & History */}
      <div className="space-y-6">
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold text-brand-100 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-brand-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-16.5-.52c-1.01.143-2.01.317-3 .52m16.5 0a48.667 48.667 0 0 1 3.75 5.53m-19.5-5.53A48.667 48.667 0 0 0 3 10.5m19.5 0a48.667 48.667 0 0 1-3.75 5.53m-12-11.06A48.667 48.667 0 0 0 3 10.5m0 0a48.667 48.667 0 0 0 3.75 5.53" />
            </svg>
            Weigh In
          </h2>

          {latestWeight && (
            <div className="mb-4 p-3 rounded-xl bg-brand-600/10 border border-brand-500/20 text-center">
              <p className="text-xs uppercase tracking-wider text-brand-400">Latest Reading</p>
              <p className="text-3xl font-black text-brand-100 mt-1">
                {latestWeight.weight_kg} <span className="text-sm font-normal text-brand-400">kg</span>
              </p>
              <p className="text-xs text-brand-500 mt-0.5">{latestWeight.measured_on}</p>
            </div>
          )}

          {weightMsg && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${weightMsg.type === 'error' ? 'bg-danger-500/10 border border-danger-500/20 text-danger-400' : 'bg-success-400/10 border border-success-400/20 text-success-400'}`}>
              {weightMsg.text}
            </div>
          )}

          <form action={handleWeightSubmit} className="space-y-4">
            <div>
              <label className="label">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                name="weight_kg"
                required
                min={20}
                max={400}
                placeholder="e.g. 82.5"
                className="input-field"
              />
            </div>

            <div>
              <label className="label">Date</label>
              <input
                type="date"
                name="measured_on"
                defaultValue={todayStr}
                required
                className="input-field"
              />
            </div>

            <button
              type="submit"
              disabled={isWeightPending}
              className="btn btn-accent w-full"
            >
              {isWeightPending ? 'Logging...' : 'Log Weight'}
            </button>
          </form>

          {/* Recent Weight Log list */}
          <div className="mt-6 pt-4 border-t border-surface-700">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-400 mb-3">
              Recent History
            </h3>
            {weightHistory.length === 0 ? (
              <p className="text-xs text-brand-500">No weigh-ins yet.</p>
            ) : (
              <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {weightHistory.map((w) => (
                  <li key={w.id} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-surface-800/40">
                    <span className="text-brand-400">{w.measured_on}</span>
                    <span className="font-bold text-brand-200">{w.weight_kg} kg</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
