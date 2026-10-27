import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFood extends Document {
  ownerId?: mongoose.Types.ObjectId | null;
  name: string;
  normalizedName: string;
  brand?: string;
  barcode?: string;
  kcal100g: number;
  protein100g: number;
  carbs100g: number;
  fat100g: number;
  fiber100g?: number | null;
  sugar100g?: number | null;
  servingG?: number | null;
  source: 'barcode' | 'label_scan' | 'manual';
  createdAt: Date;
  updatedAt: Date;
}

const FoodSchema = new Schema<IFood>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    barcode: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    kcal100g: {
      type: Number,
      required: true,
      min: 0,
      max: 900,
    },
    protein100g: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    carbs100g: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    fat100g: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    fiber100g: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    sugar100g: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    servingG: {
      type: Number,
      min: 1,
      default: 100,
    },
    source: {
      type: String,
      enum: ['barcode', 'label_scan', 'manual'],
      default: 'manual',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

FoodSchema.pre('validate', function () {
  if (this.name) {
    this.normalizedName = this.name.toLowerCase().trim();
  }
});

export const Food: Model<IFood> =
  mongoose.models.Food || mongoose.model<IFood>('Food', FoodSchema);

export default Food;
