import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuthAttempt extends Document {
  key: string;
  attempts: number;
  createdAt: Date;
}

const AuthAttemptSchema = new Schema<IAuthAttempt>({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  attempts: {
    type: Number,
    default: 1,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 900, // 15 minutes TTL index
  },
});

export const AuthAttempt: Model<IAuthAttempt> =
  mongoose.models.AuthAttempt || mongoose.model<IAuthAttempt>('AuthAttempt', AuthAttemptSchema);

export default AuthAttempt;
