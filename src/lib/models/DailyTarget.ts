import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDailyTarget extends Document {
  userId: mongoose.Types.ObjectId;
  effectiveFrom: string; // YYYY-MM-DD
  kcal: number;
  proteinG: number;
  reason: string;
  createdAt: Date;
}

const DailyTargetSchema = new Schema<IDailyTarget>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    effectiveFrom: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    kcal: {
      type: Number,
      required: true,
      min: 500,
    },
    proteinG: {
      type: Number,
      required: true,
      min: 10,
    },
    reason: {
      type: String,
      default: 'initial',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

DailyTargetSchema.index({ userId: 1, effectiveFrom: -1 });

export const DailyTarget: Model<IDailyTarget> =
  mongoose.models.DailyTarget || mongoose.model<IDailyTarget>('DailyTarget', DailyTargetSchema);

export default DailyTarget;
