'use server';

import { requireUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Food } from '@/lib/models/Food';
import { FoodLog } from '@/lib/models/FoodLog';
import { foodSchema, foodLogSchema } from '@/lib/schemas';
import { calculatePortionNutrition } from '@/lib/nutrition';
import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import type { MealType } from '@/lib/types';

export type ActionResponse = {
  error?: string;
  success?: string;
  foodId?: string;
};

export async function createFood(formData: FormData): Promise<ActionResponse> {
  const session = await requireUser();

  const raw = {
    name: (formData.get('name') as string)?.trim(),
    brand: (formData.get('brand') as string)?.trim() || undefined,
    barcode: (formData.get('barcode') as string)?.trim() || undefined,
    kcal_100g: Number(formData.get('kcal_100g')),
    protein_100g: Number(formData.get('protein_100g')),
    carbs_100g: Number(formData.get('carbs_100g')),
    fat_100g: Number(formData.get('fat_100g')),
    fiber_100g: formData.get('fiber_100g') ? Number(formData.get('fiber_100g')) : undefined,
    sugar_100g: formData.get('sugar_100g') ? Number(formData.get('sugar_100g')) : undefined,
    serving_g: formData.get('serving_g') ? Number(formData.get('serving_g')) : undefined,
  };

  const parsed = foodSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  await connectDB();

  const newFood = await Food.create({
    ownerId: new mongoose.Types.ObjectId(session.userId),
    name: parsed.data.name,
    brand: parsed.data.brand || undefined,
    barcode: parsed.data.barcode || undefined,
    kcal100g: parsed.data.kcal_100g,
    protein100g: parsed.data.protein_100g,
    carbs100g: parsed.data.carbs_100g,
    fat100g: parsed.data.fat_100g,
    fiber100g: parsed.data.fiber_100g ?? null,
    sugar100g: parsed.data.sugar_100g ?? null,
    servingG: parsed.data.serving_g || 100,
    source: 'manual',
  });

  revalidatePath('/foods');
  revalidatePath('/dashboard');
  return {
    success: 'Food item created successfully!',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    foodId: (newFood as any)._id.toString(),
  };
}

export async function logFoodItem(formData: FormData): Promise<ActionResponse> {
  const session = await requireUser();

  const foodId = formData.get('food_id') as string;
  const quantityG = Number(formData.get('quantity_g'));
  const meal = formData.get('meal') as MealType;
  const loggedOn = (formData.get('logged_on') as string) || new Date().toISOString().split('T')[0];
  const clientId = (formData.get('client_id') as string) || `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  if (!mongoose.Types.ObjectId.isValid(foodId)) {
    return { error: 'Invalid food ID' };
  }

  const parsed = foodLogSchema.safeParse({
    food_id: foodId,
    logged_on: loggedOn,
    meal,
    quantity_g: quantityG,
    client_id: clientId,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  await connectDB();
  const userObjId = new mongoose.Types.ObjectId(session.userId);

  // Check food in global library OR user's own foods
  const food = await Food.findOne({
    _id: new mongoose.Types.ObjectId(foodId),
    $or: [{ ownerId: null }, { ownerId: userObjId }],
  }).lean();

  if (!food) {
    return { error: 'Selected food not found.' };
  }

  // Calculate snapshot macros
  const macros = calculatePortionNutrition(
    {
      kcal_100g: food.kcal100g,
      protein_100g: food.protein100g,
      carbs_100g: food.carbs100g,
      fat_100g: food.fat100g,
      fiber_100g: food.fiber100g ?? null,
      sugar_100g: food.sugar100g ?? null,
    },
    quantityG
  );

  // Enforce idempotency: gracefully handle duplicate key (code 11000)
  try {
    await FoodLog.create({
      userId: userObjId,
      foodId: food._id,
      loggedOn,
      meal,
      quantityG,
      kcal: macros.kcal,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      clientId,
    });
  } catch (err: unknown) {
    // Mongo duplicate key error (E11000)
    if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
      // Idempotent retry: return existing record gracefully
      return { success: 'Food log already processed.' };
    }
    throw err;
  }

  revalidatePath('/foods');
  revalidatePath('/dashboard');
  return { success: 'Food logged successfully!' };
}

export async function deleteFoodLog(logId: string): Promise<ActionResponse> {
  const session = await requireUser();

  if (!mongoose.Types.ObjectId.isValid(logId)) {
    return { error: 'Invalid log ID' };
  }

  await connectDB();

  // Strict ownership check: filter by BOTH _id and userId
  const result = await FoodLog.findOneAndDelete({
    _id: new mongoose.Types.ObjectId(logId),
    userId: new mongoose.Types.ObjectId(session.userId),
  });

  if (!result) {
    return { error: 'Food log entry not found.' };
  }

  revalidatePath('/foods');
  revalidatePath('/dashboard');
  return { success: 'Food log deleted.' };
}
