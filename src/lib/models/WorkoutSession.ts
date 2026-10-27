import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWorkoutSession extends Document {
  userId: mongoose.Types.ObjectId;
  startedAt: Date;
  endedAt?: Date | null;
  notes?: string;
  createdAt: Date;
}

const WorkoutSessionSchema = new Schema<IWorkoutSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

WorkoutSessionSchema.index({ userId: 1, startedAt: -1 });

export const WorkoutSession: Model<IWorkoutSession> =
  mongoose.models.WorkoutSession ||
  mongoose.model<IWorkoutSession>('WorkoutSession', WorkoutSessionSchema);

export default WorkoutSession;
