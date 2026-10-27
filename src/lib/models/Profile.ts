import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProfile extends Document {
  userId: mongoose.Types.ObjectId;
  sex?: 'male' | 'female';
  birthYear?: number;
  heightCm?: number;
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active';
  goal?: 'cut' | 'maintain' | 'bulk';
  unitSystem: 'metric' | 'imperial';
  createdAt: Date;
  updatedAt: Date;
}

const ProfileSchema = new Schema<IProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    sex: {
      type: String,
      enum: ['male', 'female'],
    },
    birthYear: {
      type: Number,
      min: 1900,
      max: new Date().getFullYear(),
    },
    heightCm: {
      type: Number,
      min: 50,
      max: 300,
    },
    activityLevel: {
      type: String,
      enum: ['sedentary', 'light', 'moderate', 'active'],
    },
    goal: {
      type: String,
      enum: ['cut', 'maintain', 'bulk'],
    },
    unitSystem: {
      type: String,
      enum: ['metric', 'imperial'],
      default: 'metric',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Profile: Model<IProfile> =
  mongoose.models.Profile || mongoose.model<IProfile>('Profile', ProfileSchema);

export default Profile;
