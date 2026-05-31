import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const OwnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    gymName: { type: String, required: true, trim: true },
    gymLocation: { type: String, trim: true },
    plans: [
      {
        name: { type: String, required: true },      // e.g. "3 Month" or "7 Days"
        durationUnit: { type: String, enum: ['months', 'days'], default: 'months' },
        durationValue: { type: Number, required: true },
        durationMonths: { type: Number },
        fee: { type: Number, required: true },        // e.g. 2000
      },
    ],
    memberCounter: { type: Number, default: 0 },     // immutable serial ID tracker
    // UI and notification preferences
    themePreference: { type: String, enum: ['light', 'dark'], default: 'light' },
    notificationTime: { type: String, default: '19:40' }, // HH:MM (24h)
  },
  { timestamps: true }
);

OwnerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

OwnerSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.Owner || mongoose.model('Owner', OwnerSchema);
