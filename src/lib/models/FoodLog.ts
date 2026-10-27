import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFoodLog extends Document {
  userId: mongoose.Types.ObjectId;
  foodId: mongoose.Types.ObjectId;
  loggedOn: string; // YYYY-MM-DD
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  quantityG: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  clientId: string;
  createdAt: Date;
}

const FoodLogSchema = new Schema<IFoodLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    foodId: {
      type: Schema.Types.ObjectId,
      ref: 'Food',
      required: true,
      index: true,
    },
    loggedOn: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },
    meal: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'snack'],
      required: true,
    },
    quantityG: {
      type: Number,
      required: true,
      min: 0.1,
      max: 10000,
    },
    kcal: {
      type: Number,
      required: true,
      min: 0,
    },
    protein: {
      type: Number,
      required: true,
      min: 0,
    },
    carbs: {
      type: Number,
      required: true,
      min: 0,
    },
    fat: {
      type: Number,
      required: true,
      min: 0,
    },
    clientId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Idempotency: compound unique index on userId + clientId
FoodLogSchema.index({ userId: 1, clientId: 1 }, { unique: true });
// Query optimization for daily user logs
FoodLogSchema.index({ userId: 1, loggedOn: 1 });

export const FoodLog: Model<IFoodLog> =
  mongoose.models.FoodLog || mongoose.model<IFoodLog>('FoodLog', FoodLogSchema);

export default FoodLog;
