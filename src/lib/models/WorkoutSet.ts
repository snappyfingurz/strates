import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWorkoutSet extends Document {
  sessionId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  exerciseId: mongoose.Types.ObjectId;
  setNo: number;
  weightKg: number;
  reps: number;
  rpe?: number | null;
  isWarmup: boolean;
  est1RM?: number | null;
  isPR: boolean;
  clientId: string;
  createdAt: Date;
}

const WorkoutSetSchema = new Schema<IWorkoutSet>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'WorkoutSession',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    exerciseId: {
      type: Schema.Types.ObjectId,
      ref: 'Exercise',
      required: true,
      index: true,
    },
    setNo: {
      type: Number,
      required: true,
      min: 1,
    },
    weightKg: {
      type: Number,
      required: true,
      min: 0,
    },
    reps: {
      type: Number,
      required: true,
      min: 1,
    },
    rpe: {
      type: Number,
      min: 1,
      max: 10,
      default: null,
    },
    isWarmup: {
      type: Boolean,
      default: false,
    },
    est1RM: {
      type: Number,
      default: null,
    },
    isPR: {
      type: Boolean,
      default: false,
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
WorkoutSetSchema.index({ userId: 1, clientId: 1 }, { unique: true });
// Fast lookup of PR records by exercise
WorkoutSetSchema.index({ userId: 1, exerciseId: 1, est1RM: -1 });

export const WorkoutSet: Model<IWorkoutSet> =
  mongoose.models.WorkoutSet || mongoose.model<IWorkoutSet>('WorkoutSet', WorkoutSetSchema);

export default WorkoutSet;
