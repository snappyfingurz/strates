import { requireUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Food } from '@/lib/models/Food';
import { FoodLog } from '@/lib/models/FoodLog';
import { FoodsClient } from './foods-client';
import mongoose from 'mongoose';
import type { Food as FoodType, FoodLog as FoodLogType } from '@/lib/types';

interface FoodLogWithFood extends FoodLogType {
  foods?: {
    name: string;
    brand: string | null;
  } | null;
}

export default async function FoodsPage() {
  const session = await requireUser();
  await connectDB();

  const userObjId = new mongoose.Types.ObjectId(session.userId);
  const today = new Date().toISOString().split('T')[0];

  // Fetch foods: global catalog (ownerId is null) + user's own created foods
  const rawFoods = await Food.find({
    $or: [{ ownerId: null }, { ownerId: userObjId }],
  })
    .sort({ name: 1 })
    .lean();

  const foods: FoodType[] = rawFoods.map((f) => ({
    id: f._id.toString(),
    owner_id: f.ownerId ? f.ownerId.toString() : null,
    name: f.name,
    brand: f.brand || null,
    barcode: f.barcode || null,
    kcal_100g: f.kcal100g,
    protein_100g: f.protein100g,
    carbs_100g: f.carbs100g,
    fat_100g: f.fat100g,
    fiber_100g: f.fiber100g || null,
    sugar_100g: f.sugar100g || null,
    serving_g: f.servingG || 100,
    source: f.source,
    needs_review: false,
    review_reason: null,
    image_path: null,
    created_at: f.createdAt?.toISOString() || '',
    updated_at: f.updatedAt?.toISOString() || '',
  }));

  // Fetch today's food logs populated with food details
  const rawLogs = await FoodLog.find({
    userId: userObjId,
    loggedOn: today,
  })
    .populate('foodId', 'name brand')
    .sort({ createdAt: 1 })
    .lean();

  const todayLogs: FoodLogWithFood[] = rawLogs.map((l) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const foodRef = l.foodId as any;
    return {
      id: l._id.toString(),
      user_id: session.userId,
      food_id: foodRef?._id ? foodRef._id.toString() : l.foodId.toString(),
      logged_on: l.loggedOn,
      meal: l.meal,
      quantity_g: l.quantityG,
      kcal: l.kcal,
      protein: l.protein,
      carbs: l.carbs,
      fat: l.fat,
      client_id: l.clientId,
      created_at: l.createdAt?.toISOString() || '',
      foods: foodRef?.name
        ? {
            name: foodRef.name,
            brand: foodRef.brand || null,
          }
        : null,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight text-brand-100">Nutrition &amp; Food Tracker</h1>
        <p className="text-sm text-brand-400">
          Search the food catalog, build custom meals, and track macros against your targets.
        </p>
      </div>

      <FoodsClient
        foods={foods}
        todayLogs={todayLogs}
        currentDate={today}
      />
    </div>
  );
}
