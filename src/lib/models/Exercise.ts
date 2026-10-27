import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IExercise extends Document {
  name: string;
  muscleGroup: string;
  equipmentId?: mongoose.Types.ObjectId | null;
  ownerId?: mongoose.Types.ObjectId | null;
  repRangeLow: number;
  repRangeHigh: number;
  createdAt: Date;
  updatedAt: Date;
}

const ExerciseSchema = new Schema<IExercise>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    muscleGroup: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    equipmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Equipment',
      default: null,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    repRangeLow: {
      type: Number,
      default: 8,
      min: 1,
    },
    repRangeHigh: {
      type: Number,
      default: 12,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

export const Exercise: Model<IExercise> =
  mongoose.models.Exercise || mongoose.model<IExercise>('Exercise', ExerciseSchema);

export default Exercise;
