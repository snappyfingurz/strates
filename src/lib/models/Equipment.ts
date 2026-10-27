import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEquipment extends Document {
  name: string;
  normalizedName: string;
  muscleGroup: string;
  fileId?: mongoose.Types.ObjectId | null;
  status: 'pending' | 'approved' | 'rejected';
  submittedBy: mongoose.Types.ObjectId;
  reviewedBy?: mongoose.Types.ObjectId | null;
  reviewNote?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const EquipmentSchema = new Schema<IEquipment>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    muscleGroup: {
      type: String,
      required: true,
      trim: true,
    },
    fileId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
      required: true,
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewNote: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

EquipmentSchema.pre('validate', function () {
  if (this.name) {
    this.normalizedName = this.name.toLowerCase().trim();
  }
});

export const Equipment: Model<IEquipment> =
  mongoose.models.Equipment || mongoose.model<IEquipment>('Equipment', EquipmentSchema);

export default Equipment;
