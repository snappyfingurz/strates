'use client';

import { useState, useTransition } from 'react';
import { createFood, logFoodItem, deleteFoodLog } from './actions';
import type { Food, FoodLog, MealType } from '@/lib/types';
import { calculateExpectedCalories, calculatePortionNutrition, validateMacroSum } from '@/lib/nutrition';

interface FoodLogWithFood extends FoodLog {
  foods?: {
    name: string;
    brand: string | null;
  } | null;
}

interface FoodsClientProps {
  foods: Food[];
  todayLogs: FoodLogWithFood[];
  currentDate: string;
}

const MEALS: { key: MealType; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snacks' },
];

export function FoodsClient({ foods, todayLogs, currentDate }: FoodsClientProps) {
  const [search, setSearch] = useState('');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [logGrams, setLogGrams] = useState<string>('100');
  const [selectedMeal, setSelectedMeal] = useState<MealType>('breakfast');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Food form state
  const [newName, setNewName] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newProtein, setNewProtein] = useState<string>('');
  const [newCarbs, setNewCarbs] = useState<string>('');
  const [newFat, setNewFat] = useState<string>('');
  const [newKcal, setNewKcal] = useState<string>('');
  const [newServing, setNewServing] = useState<string>('100');

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredFoods = foods.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    (f.brand && f.brand.toLowerCase().includes(search.toLowerCase()))
  );

  const totals = todayLogs.reduce(
    (acc, log) => ({
      kcal: acc.kcal + Number(log.kcal),
      protein: acc.protein + Number(log.protein),
      carbs: acc.carbs + Number(log.carbs),
      fat: acc.fat + Number(log.fat),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Auto-calculate suggested calories when macros change in creator
  function updateMacros(pStr: string, cStr: string, fStr: string) {
    const p = parseFloat(pStr) || 0;
    const c = parseFloat(cStr) || 0;
    const f = parseFloat(fStr) || 0;
    setNewProtein(pStr);
    setNewCarbs(cStr);
    setNewFat(fStr);
    const expected = calculateExpectedCalories(p, c, f);
    setNewKcal(expected > 0 ? String(expected) : '');
  }

  function handleLogSubmit(e: React.FormEvent) {
    e.preventDefault();
    const grams = parseFloat(logGrams) || 0;
    if (!selectedFood || grams <= 0) return;

    setMessage(null);
    const formData = new FormData();
    formData.append('food_id', selectedFood.id);
    formData.append('quantity_g', String(grams));
    formData.append('meal', selectedMeal);
    formData.append('logged_on', currentDate);

    startTransition(async () => {
      const res = await logFoodItem(formData);
      if (res.error) {
        setMessage({ type: 'error', text: res.error });
      } else {
        setMessage({ type: 'success', text: `Logged ${grams}g of ${selectedFood.name}` });
        setSelectedFood(null);
        setLogGrams('100');
      }
    });
  }

  function handleCreateFood(e: React.FormEvent) {
    e.preventDefault();
    const p = parseFloat(newProtein) || 0;
    const c = parseFloat(newCarbs) || 0;
    const f = parseFloat(newFat) || 0;
    const s = parseFloat(newServing) || 100;
    const k = parseFloat(newKcal) || calculateExpectedCalories(p, c, f);

    if (!validateMacroSum(p, c, f)) {
      setMessage({ type: 'error', text: 'Sum of protein, carbs, and fat per 100g cannot exceed 102g.' });
      return;
    }

    setMessage(null);
    const formData = new FormData();
    formData.append('name', newName);
    if (newBrand) formData.append('brand', newBrand);
    formData.append('protein_100g', String(p));
    formData.append('carbs_100g', String(c));
    formData.append('fat_100g', String(f));
    formData.append('kcal_100g', String(k));
    formData.append('serving_g', String(s));

    startTransition(async () => {
      const res = await createFood(formData);
      if (res.error) {
        setMessage({ type: 'error', text: res.error });
      } else {
        setMessage({ type: 'success', text: 'Food item successfully added to catalog!' });
        setShowCreateModal(false);
        setNewName('');
        setNewBrand('');
        setNewProtein('');
        setNewCarbs('');
        setNewFat('');
        setNewKcal('');
        setNewServing('100');
      }
    });
  }

  function handleDeleteLog(id: string) {
    startTransition(async () => {
      const res = await deleteFoodLog(id);
      if (res.error) {
        setMessage({ type: 'error', text: res.error });
      }
    });
  }

  const livePortionMacros = selectedFood
    ? calculatePortionNutrition(selectedFood, parseFloat(logGrams) || 0)
    : null;

  return (
    <div className="space-y-6">
      {/* Top Banner Message */}
      {message && (
        <div className={`p-4 rounded-xl text-sm ${message.type === 'error' ? 'bg-danger-500/10 border border-danger-500/20 text-danger-400' : 'bg-success-400/10 border border-success-400/20 text-success-400'}`}>
          {message.text}
        </div>
      )}

      {/* Daily Summary Bar */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-brand-100">Today&apos;s Nutrition</h2>
            <p className="text-xs text-brand-400">{currentDate}</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary btn-sm flex items-center gap-1.5 self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Custom
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-surface-800/80 p-3.5 rounded-xl border border-surface-600/40">
            <p className="text-xs text-brand-400 uppercase font-semibold">Calories</p>
            <p className="text-2xl font-bold text-brand-100 mt-1">{Math.round(totals.kcal)} <span className="text-xs text-brand-500 font-normal">kcal</span></p>
          </div>
          <div className="bg-surface-800/80 p-3.5 rounded-xl border border-surface-600/40">
            <p className="text-xs text-brand-400 uppercase font-semibold">Protein</p>
            <p className="text-2xl font-bold text-accent-400 mt-1">{Math.round(totals.protein)} <span className="text-xs text-brand-500 font-normal">g</span></p>
          </div>
          <div className="bg-surface-800/80 p-3.5 rounded-xl border border-surface-600/40">
            <p className="text-xs text-brand-400 uppercase font-semibold">Carbs</p>
            <p className="text-2xl font-bold text-brand-300 mt-1">{Math.round(totals.carbs)} <span className="text-xs text-brand-500 font-normal">g</span></p>
          </div>
          <div className="bg-surface-800/80 p-3.5 rounded-xl border border-surface-600/40">
            <p className="text-xs text-brand-400 uppercase font-semibold">Fat</p>
            <p className="text-2xl font-bold text-brand-300 mt-1">{Math.round(totals.fat)} <span className="text-xs text-brand-500 font-normal">g</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1 & 2: Food Library & Logger */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-brand-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                Food Catalog
              </h2>
              <div className="w-full sm:w-64">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search chicken, oats, rice..."
                  className="input-field text-sm py-1.5"
                />
              </div>
            </div>

            {filteredFoods.length === 0 ? (
              <div className="text-center py-8 text-brand-500 text-sm">
                No foods found matching &quot;{search}&quot;. Click &quot;Create Food&quot; above to add one.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                {filteredFoods.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => {
                      setSelectedFood(f);
                      setLogGrams(f.serving_g ? String(f.serving_g) : '100');
                    }}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                      selectedFood?.id === f.id
                        ? 'bg-brand-600/20 border-brand-400 shadow-lg shadow-brand-500/10'
                        : 'bg-surface-800/60 border-surface-600/40 hover:bg-surface-700/60 hover:border-surface-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <p className="font-semibold text-brand-100 text-sm">{f.name}</p>
                      <span className="text-xs font-bold text-brand-300 ml-2 whitespace-nowrap">
                        {Math.round(f.kcal_100g)} kcal
                      </span>
                    </div>
                    {f.brand && <p className="text-xs text-brand-400 mt-0.5">{f.brand}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-brand-400">
                      <span>P: <strong className="text-accent-400">{f.protein_100g}g</strong></span>
                      <span>C: <strong className="text-brand-200">{f.carbs_100g}g</strong></span>
                      <span>F: <strong className="text-brand-200">{f.fat_100g}g</strong></span>
                      <span className="text-brand-500 text-[10px]">/ 100g</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Portion Log Card (when food is selected) */}
          {selectedFood && (
            <div className="glass-card p-6 border-brand-500/40 bg-brand-900/20 animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-brand-100">Log: {selectedFood.name}</h3>
                  <p className="text-xs text-brand-400">{selectedFood.brand ?? 'Standard entry'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFood(null)}
                  className="text-xs text-brand-500 hover:text-brand-300"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleLogSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Portion (grams)</label>
                    <input
                      type="number"
                      min={1}
                      max={5000}
                      value={logGrams}
                      placeholder="100"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setLogGrams(e.target.value.replace(/^0+(?=\d)/, ''))}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="label">Meal</label>
                    <select
                      value={selectedMeal}
                      onChange={(e) => setSelectedMeal(e.target.value as MealType)}
                      className="input-field"
                    >
                      {MEALS.map((m) => (
                        <option key={m.key} value={m.key}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {livePortionMacros && (
                  <div className="p-3 rounded-xl bg-surface-900/80 border border-surface-700 grid grid-cols-4 gap-2 text-center text-xs">
                    <div>
                      <p className="text-brand-500">Calories</p>
                      <p className="text-base font-bold text-brand-100 mt-0.5">{livePortionMacros.kcal}</p>
                    </div>
                    <div>
                      <p className="text-brand-500">Protein</p>
                      <p className="text-base font-bold text-accent-400 mt-0.5">{livePortionMacros.protein}g</p>
                    </div>
                    <div>
                      <p className="text-brand-500">Carbs</p>
                      <p className="text-base font-bold text-brand-200 mt-0.5">{livePortionMacros.carbs}g</p>
                    </div>
                    <div>
                      <p className="text-brand-500">Fat</p>
                      <p className="text-base font-bold text-brand-200 mt-0.5">{livePortionMacros.fat}g</p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending || (parseFloat(logGrams) || 0) <= 0}
                  className="btn btn-accent w-full"
                >
                  {isPending ? 'Logging…' : `Add to ${MEALS.find(m => m.key === selectedMeal)?.label}`}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Column 3: Today's Logged Items by Meal */}
        <div className="space-y-4">
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-brand-100 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-brand-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
              Today&apos;s Meals
            </h2>

            {todayLogs.length === 0 ? (
              <p className="text-xs text-brand-500 text-center py-6">
                No foods logged yet for today. Select a food from the catalog to log.
              </p>
            ) : (
              <div className="space-y-4">
                {MEALS.map((meal) => {
                  const mealLogs = todayLogs.filter((l) => l.meal === meal.key);
                  if (mealLogs.length === 0) return null;
                  const mealKcal = mealLogs.reduce((acc, l) => acc + Number(l.kcal), 0);

                  return (
                    <div key={meal.key} className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-brand-400 border-b border-surface-700 pb-1">
                        <span>{meal.label}</span>
                        <span>{Math.round(mealKcal)} kcal</span>
                      </div>
                      <ul className="space-y-2">
                        {mealLogs.map((log) => (
                          <li
                            key={log.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-surface-800/50 text-xs"
                          >
                            <div className="truncate pr-2">
                              <p className="font-semibold text-brand-200 truncate">
                                {log.foods?.name ?? 'Food'}
                              </p>
                              <p className="text-[11px] text-brand-500">
                                {log.quantity_g}g • {Math.round(log.kcal)} kcal (P: {Math.round(log.protein)}g)
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteLog(log.id)}
                              className="text-brand-600 hover:text-danger-400 p-1 transition-colors"
                              title="Delete entry"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Food Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 w-full max-w-lg animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-brand-100">Create Custom Food</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-brand-500 hover:text-brand-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFood} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="label">Food Name</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Whey Isolate Protein"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="label">Brand (optional)</label>
                  <input
                    type="text"
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    placeholder="e.g. Optimum Nutrition"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="label">Standard Serving (g)</label>
                  <input
                    type="number"
                    min={1}
                    value={newServing}
                    placeholder="100"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNewServing(e.target.value.replace(/^0+(?=\d)/, ''))}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-900/90 border border-surface-700 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-400">Nutritional Values per 100g</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="label">Protein (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      max={100}
                      value={newProtein}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => updateMacros(e.target.value.replace(/^0+(?=\d)/, ''), newCarbs, newFat)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Carbs (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      max={100}
                      value={newCarbs}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => updateMacros(newProtein, e.target.value.replace(/^0+(?=\d)/, ''), newFat)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Fat (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      max={100}
                      value={newFat}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => updateMacros(newProtein, newCarbs, e.target.value.replace(/^0+(?=\d)/, ''))}
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Calories per 100g (kcal)</label>
                  <input
                    type="number"
                    min={0}
                    max={900}
                    value={newKcal}
                    placeholder="Auto-calculated"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNewKcal(e.target.value.replace(/^0+(?=\d)/, ''))}
                    className="input-field"
                  />
                  <p className="text-[11px] text-brand-500 mt-1">
                    Auto-estimated via Atwater (4P + 4C + 9F = {newKcal || '0'} kcal).
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !newName}
                  className="btn btn-primary btn-sm"
                >
                  {isPending ? 'Saving…' : 'Save Food'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
