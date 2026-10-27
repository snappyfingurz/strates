import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import bcrypt from 'bcrypt';

// Load .env.local if present, else .env
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

import { User } from '../src/lib/models/User';
import { Profile } from '../src/lib/models/Profile';
import { Food } from '../src/lib/models/Food';
import { FoodLog } from '../src/lib/models/FoodLog';
import { BodyWeight } from '../src/lib/models/BodyWeight';
import { DailyTarget } from '../src/lib/models/DailyTarget';
import { Equipment } from '../src/lib/models/Equipment';
import { Exercise } from '../src/lib/models/Exercise';
import { WorkoutSession } from '../src/lib/models/WorkoutSession';
import { WorkoutSet } from '../src/lib/models/WorkoutSet';
import { estimate1RM } from '../src/lib/workout';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/strates';

async function seed() {
  console.log('Connecting to MongoDB at:', MONGODB_URI.replace(/:([^:@]+)@/, ':****@'));
  await mongoose.connect(MONGODB_URI);
  console.log('Connected successfully!');

  // Clear existing collections
  console.log('Clearing old collections...');
  await Promise.all([
    User.deleteMany({}),
    Profile.deleteMany({}),
    Food.deleteMany({}),
    FoodLog.deleteMany({}),
    BodyWeight.deleteMany({}),
    DailyTarget.deleteMany({}),
    Equipment.deleteMany({}),
    Exercise.deleteMany({}),
    WorkoutSession.deleteMany({}),
    WorkoutSet.deleteMany({}),
  ]);

  // 1. Create Users with bcrypt cost 12
  console.log('Creating Admin and Demo users...');
  const adminPasswordHash = await bcrypt.hash('AdminPassword123!', 12);
  const demoPasswordHash = await bcrypt.hash('DemoPassword123!', 12);

  const adminUser = await User.create({
    email: 'admin@strates.fit',
    passwordHash: adminPasswordHash,
    displayName: 'Strates Administrator',
    role: 'admin',
  });

  const demoUser = await User.create({
    email: 'demo@strates.fit',
    passwordHash: demoPasswordHash,
    displayName: 'Alex Liftwell',
    role: 'user',
  });

  // 2. Create Profile & Daily Target for Demo User
  console.log('Creating Demo User Profile & Target...');
  await Profile.create({
    userId: demoUser._id,
    sex: 'male',
    birthYear: 1998,
    heightCm: 180,
    activityLevel: 'moderate',
    goal: 'cut',
    unitSystem: 'metric',
  });

  await DailyTarget.create({
    userId: demoUser._id,
    effectiveFrom: new Date(Date.now() - 21 * 86400000).toISOString().split('T')[0],
    kcal: 2150,
    proteinG: 180,
    reason: 'Initial Cut Targets (-500 kcal deficit)',
  });

  // 3. Approved Equipment Library
  console.log('Creating Equipment Library...');
  const equipmentDocs = await Equipment.insertMany([
    {
      name: 'Olympic Barbell & Bumper Plates',
      normalizedName: 'olympic barbell bumper plates',
      muscleGroup: 'Full Body',
      status: 'approved',
      submittedBy: adminUser._id,
      reviewedBy: adminUser._id,
    },
    {
      name: 'Adjustable Dumbbells Set',
      normalizedName: 'adjustable dumbbells set',
      muscleGroup: 'Full Body',
      status: 'approved',
      submittedBy: adminUser._id,
      reviewedBy: adminUser._id,
    },
    {
      name: 'Power Squat Rack & Pull-up Bar',
      normalizedName: 'power squat rack pull up bar',
      muscleGroup: 'Legs / Back',
      status: 'approved',
      submittedBy: adminUser._id,
      reviewedBy: adminUser._id,
    },
    {
      name: 'Incline Adjustable Bench',
      normalizedName: 'incline adjustable bench',
      muscleGroup: 'Chest / Shoulders',
      status: 'approved',
      submittedBy: adminUser._id,
      reviewedBy: adminUser._id,
    },
    {
      name: 'Dual Cable Pulley Station',
      normalizedName: 'dual cable pulley station',
      muscleGroup: 'Upper Body',
      status: 'approved',
      submittedBy: adminUser._id,
      reviewedBy: adminUser._id,
    },
    {
      name: 'Plate-Loaded 45° Leg Press',
      normalizedName: 'plate loaded 45 leg press',
      muscleGroup: 'Legs',
      status: 'approved',
      submittedBy: adminUser._id,
      reviewedBy: adminUser._id,
    },
    {
      name: 'Lat Pulldown & Low Row Machine',
      normalizedName: 'lat pulldown low row machine',
      muscleGroup: 'Back',
      status: 'approved',
      submittedBy: adminUser._id,
      reviewedBy: adminUser._id,
    },
  ]);

  const eqBarbell = equipmentDocs[0]._id;
  const eqDumbbell = equipmentDocs[1]._id;
  const eqRack = equipmentDocs[2]._id;
  const eqBench = equipmentDocs[3]._id;
  const eqCable = equipmentDocs[4]._id;
  const eqLegPress = equipmentDocs[5]._id;
  const eqLat = equipmentDocs[6]._id;

  // 4. Standard Exercises
  console.log('Creating Exercise Catalog...');
  const exerciseDocs = await Exercise.insertMany([
    {
      name: 'Barbell Flat Bench Press',
      muscleGroup: 'Chest',
      equipmentId: eqBench,
      ownerId: null,
      repRangeLow: 6,
      repRangeHigh: 10,
    },
    {
      name: 'Incline Dumbbell Press',
      muscleGroup: 'Chest',
      equipmentId: eqDumbbell,
      ownerId: null,
      repRangeLow: 8,
      repRangeHigh: 12,
    },
    {
      name: 'Cable Chest Flye',
      muscleGroup: 'Chest',
      equipmentId: eqCable,
      ownerId: null,
      repRangeLow: 10,
      repRangeHigh: 15,
    },
    {
      name: 'Barbell Back Squat',
      muscleGroup: 'Legs',
      equipmentId: eqRack,
      ownerId: null,
      repRangeLow: 6,
      repRangeHigh: 10,
    },
    {
      name: 'Leg Press 45°',
      muscleGroup: 'Legs',
      equipmentId: eqLegPress,
      ownerId: null,
      repRangeLow: 10,
      repRangeHigh: 15,
    },
    {
      name: 'Barbell Conventional Deadlift',
      muscleGroup: 'Back',
      equipmentId: eqBarbell,
      ownerId: null,
      repRangeLow: 5,
      repRangeHigh: 8,
    },
    {
      name: 'Lat Pulldown (Wide Grip)',
      muscleGroup: 'Back',
      equipmentId: eqLat,
      ownerId: null,
      repRangeLow: 8,
      repRangeHigh: 12,
    },
    {
      name: 'Standing Overhead Barbell Press',
      muscleGroup: 'Shoulders',
      equipmentId: eqBarbell,
      ownerId: null,
      repRangeLow: 6,
      repRangeHigh: 10,
    },
    {
      name: 'Dumbbell Lateral Raise',
      muscleGroup: 'Shoulders',
      equipmentId: eqDumbbell,
      ownerId: null,
      repRangeLow: 12,
      repRangeHigh: 20,
    },
  ]);

  // 5. Global Food Library
  console.log('Creating Food Library...');
  const foodDocs = await Food.insertMany([
    {
      ownerId: null,
      name: 'Chicken Breast (Skinless, Raw)',
      normalizedName: 'chicken breast skinless raw',
      kcal100g: 165,
      protein100g: 31.0,
      carbs100g: 0.0,
      fat100g: 3.6,
      servingG: 150,
      source: 'manual',
    },
    {
      ownerId: null,
      name: 'Rolled Oats (Dry)',
      normalizedName: 'rolled oats dry',
      brand: 'Quaker',
      kcal100g: 389,
      protein100g: 16.9,
      carbs100g: 66.3,
      fat100g: 6.9,
      fiber100g: 10.6,
      servingG: 50,
      source: 'manual',
    },
    {
      ownerId: null,
      name: 'Greek Yogurt 0% Fat',
      normalizedName: 'greek yogurt 0 fat',
      brand: 'Fage',
      kcal100g: 57,
      protein100g: 10.3,
      carbs100g: 4.0,
      fat100g: 0.0,
      servingG: 170,
      source: 'manual',
    },
    {
      ownerId: null,
      name: 'Large Whole Egg',
      normalizedName: 'large whole egg',
      kcal100g: 143,
      protein100g: 12.6,
      carbs100g: 0.7,
      fat100g: 9.5,
      servingG: 50,
      source: 'manual',
    },
    {
      ownerId: null,
      name: 'White Basmati Rice (Cooked)',
      normalizedName: 'white basmati rice cooked',
      kcal100g: 130,
      protein100g: 2.7,
      carbs100g: 28.2,
      fat100g: 0.3,
      servingG: 200,
      source: 'manual',
    },
    {
      ownerId: null,
      name: 'Gold Standard 100% Whey',
      normalizedName: 'gold standard 100 whey',
      brand: 'Optimum Nutrition',
      kcal100g: 375,
      protein100g: 78.1,
      carbs100g: 9.4,
      fat100g: 3.1,
      servingG: 32,
      source: 'manual',
    },
    {
      ownerId: null,
      name: 'Natural Peanut Butter',
      normalizedName: 'natural peanut butter',
      kcal100g: 588,
      protein100g: 25.0,
      carbs100g: 20.0,
      fat100g: 50.0,
      servingG: 30,
      source: 'manual',
    },
    {
      ownerId: null,
      name: 'Steamed Broccoli',
      normalizedName: 'steamed broccoli',
      kcal100g: 35,
      protein100g: 2.4,
      carbs100g: 7.2,
      fat100g: 0.4,
      servingG: 150,
      source: 'manual',
    },
  ]);

  // 6. Generate 3 Weeks of Historical Data for Demo User
  console.log('Generating 3 weeks of historical weigh-ins, meals, and workouts...');
  const foodLogsToInsert = [];
  const weightsToInsert = [];
  const workoutSessionsToInsert = [];
  const workoutSetsToInsert = [];

  let currentWeight = 84.5;
  const now = new Date();

  for (let dayOffset = 21; dayOffset >= 0; dayOffset--) {
    const date = new Date(now.getTime() - dayOffset * 86400000);
    const dateStr = date.toISOString().split('T')[0];

    // Weight progress: decreasing smoothly from 84.5 to ~82.6
    currentWeight -= 0.08 + (Math.random() * 0.06 - 0.03);
    weightsToInsert.push({
      userId: demoUser._id,
      measuredOn: dateStr,
      weightKg: Math.round(currentWeight * 10) / 10,
    });

    // Daily Food Logs: Breakfast, Lunch, Dinner, Snack
    // Breakfast: Oats + Whey + Peanut butter
    foodLogsToInsert.push({
      userId: demoUser._id,
      foodId: foodDocs[1]._id, // Oats
      loggedOn: dateStr,
      meal: 'breakfast',
      quantityG: 60,
      kcal: 233,
      protein: 10.1,
      carbs: 39.8,
      fat: 4.1,
      clientId: `seed-${dateStr}-breakfast-1`,
    });
    foodLogsToInsert.push({
      userId: demoUser._id,
      foodId: foodDocs[5]._id, // Whey
      loggedOn: dateStr,
      meal: 'breakfast',
      quantityG: 35,
      kcal: 131,
      protein: 27.3,
      carbs: 3.3,
      fat: 1.1,
      clientId: `seed-${dateStr}-breakfast-2`,
    });

    // Lunch: Chicken + Rice + Broccoli
    foodLogsToInsert.push({
      userId: demoUser._id,
      foodId: foodDocs[0]._id, // Chicken
      loggedOn: dateStr,
      meal: 'lunch',
      quantityG: 200,
      kcal: 330,
      protein: 62.0,
      carbs: 0.0,
      fat: 7.2,
      clientId: `seed-${dateStr}-lunch-1`,
    });
    foodLogsToInsert.push({
      userId: demoUser._id,
      foodId: foodDocs[4]._id, // Rice
      loggedOn: dateStr,
      meal: 'lunch',
      quantityG: 220,
      kcal: 286,
      protein: 5.9,
      carbs: 62.0,
      fat: 0.7,
      clientId: `seed-${dateStr}-lunch-2`,
    });

    // Dinner: Eggs + Greek Yogurt + Broccoli
    foodLogsToInsert.push({
      userId: demoUser._id,
      foodId: foodDocs[3]._id, // Eggs
      loggedOn: dateStr,
      meal: 'dinner',
      quantityG: 150,
      kcal: 215,
      protein: 18.9,
      carbs: 1.1,
      fat: 14.3,
      clientId: `seed-${dateStr}-dinner-1`,
    });
    foodLogsToInsert.push({
      userId: demoUser._id,
      foodId: foodDocs[2]._id, // Greek yogurt
      loggedOn: dateStr,
      meal: 'dinner',
      quantityG: 200,
      kcal: 114,
      protein: 20.6,
      carbs: 8.0,
      fat: 0.0,
      clientId: `seed-${dateStr}-dinner-2`,
    });

    // Snacks: Peanut butter
    foodLogsToInsert.push({
      userId: demoUser._id,
      foodId: foodDocs[6]._id, // Peanut butter
      loggedOn: dateStr,
      meal: 'snack',
      quantityG: 30,
      kcal: 176,
      protein: 7.5,
      carbs: 6.0,
      fat: 15.0,
      clientId: `seed-${dateStr}-snack-1`,
    });
  }

  // Insert weights and food logs
  await BodyWeight.insertMany(weightsToInsert);
  await FoodLog.insertMany(foodLogsToInsert);

  // 3 Workouts per week (Day 20, 18, 16, 13, 11, 9, 6, 4, 1)
  const workoutDays = [20, 18, 16, 13, 11, 9, 6, 4, 1];
  let benchBase = 80;
  let squatBase = 110;

  for (let i = 0; i < workoutDays.length; i++) {
    const daysAgo = workoutDays[i];
    const sessionDate = new Date(now.getTime() - daysAgo * 86400000);
    sessionDate.setHours(17, 30, 0, 0);

    const isPush = i % 3 === 0;
    const isLegs = i % 3 === 1;
    const sessionNotes = isPush
      ? `Push Day (Heavy Bench Week ${Math.floor(i / 3) + 1})`
      : isLegs
      ? `Legs & Quads (Volume Week ${Math.floor(i / 3) + 1})`
      : `Pull & Upper Back Week ${Math.floor(i / 3) + 1}`;

    const session = await WorkoutSession.create({
      userId: demoUser._id,
      startedAt: sessionDate,
      endedAt: new Date(sessionDate.getTime() + 65 * 60000), // 65 min workout
      notes: sessionNotes,
    });

    if (isPush) {
      // Bench press with progressive overload
      benchBase += 2.5;
      const exBench = exerciseDocs[0]._id;

      // Set 1 (warmup)
      workoutSetsToInsert.push({
        sessionId: session._id,
        userId: demoUser._id,
        exerciseId: exBench,
        setNo: 1,
        weightKg: 50,
        reps: 10,
        rpe: 6,
        isWarmup: true,
        est1RM: estimate1RM(50, 10),
        isPR: false,
        clientId: `seed-set-${session._id}-1`,
      });

      // Set 2 (working set)
      const est1 = estimate1RM(benchBase, 8);
      workoutSetsToInsert.push({
        sessionId: session._id,
        userId: demoUser._id,
        exerciseId: exBench,
        setNo: 2,
        weightKg: benchBase,
        reps: 8,
        rpe: 8.5,
        isWarmup: false,
        est1RM: est1,
        isPR: i > 0, // PR from progressive overload
        clientId: `seed-set-${session._id}-2`,
      });

      // Set 3 (working set)
      workoutSetsToInsert.push({
        sessionId: session._id,
        userId: demoUser._id,
        exerciseId: exBench,
        setNo: 3,
        weightKg: benchBase,
        reps: 7,
        rpe: 9,
        isWarmup: false,
        est1RM: estimate1RM(benchBase, 7),
        isPR: false,
        clientId: `seed-set-${session._id}-3`,
      });
    } else if (isLegs) {
      // Squat session
      squatBase += 5;
      const exSquat = exerciseDocs[3]._id;

      workoutSetsToInsert.push({
        sessionId: session._id,
        userId: demoUser._id,
        exerciseId: exSquat,
        setNo: 1,
        weightKg: 70,
        reps: 10,
        rpe: 6,
        isWarmup: true,
        est1RM: estimate1RM(70, 10),
        isPR: false,
        clientId: `seed-set-${session._id}-1`,
      });

      workoutSetsToInsert.push({
        sessionId: session._id,
        userId: demoUser._id,
        exerciseId: exSquat,
        setNo: 2,
        weightKg: squatBase,
        reps: 8,
        rpe: 8.5,
        isWarmup: false,
        est1RM: estimate1RM(squatBase, 8),
        isPR: true,
        clientId: `seed-set-${session._id}-2`,
      });
    } else {
      // Pull session
      const exDeadlift = exerciseDocs[5]._id;
      workoutSetsToInsert.push({
        sessionId: session._id,
        userId: demoUser._id,
        exerciseId: exDeadlift,
        setNo: 1,
        weightKg: 130,
        reps: 6,
        rpe: 8,
        isWarmup: false,
        est1RM: estimate1RM(130, 6),
        isPR: true,
        clientId: `seed-set-${session._id}-1`,
      });
    }
  }

  await WorkoutSet.insertMany(workoutSetsToInsert);

  console.log('✅ Seed completed successfully!');
  console.log('----------------------------------------------------');
  console.log('Demo Account:  demo@strates.fit  / DemoPassword123!');
  console.log('Admin Account: admin@strates.fit / AdminPassword123!');
  console.log('----------------------------------------------------');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
