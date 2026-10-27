import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBodyWeight extends Document {
  userId: mongoose.Types.ObjectId;
  measuredOn: string; // YYYY-MM-DD
  weightKg: number;
  createdAt: Date;
}

const BodyWeightSchema = new Schema<IBodyWeight>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    measuredOn: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    weightKg: {
      type: Number,
      required: true,
      min: 20,
      max: 500,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Unique index: one weight per user per date
BodyWeightSchema.index({ userId: 1, measuredOn: 1 }, { unique: true });

export const BodyWeight: Model<IBodyWeight> =
  mongoose.models.BodyWeight || mongoose.model<IBodyWeight>('BodyWeight', BodyWeightSchema);

export default BodyWeight;
