import mongoose from 'mongoose';

const PlanHistorySchema = new mongoose.Schema({
  planName: { type: String, required: true },
  durationUnit: { type: String, enum: ['months', 'days'], required: true, default: 'months' },
  durationValue: { type: Number, required: true },
  durationMonths: { type: Number },
  fee: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  addedAt: { type: Date, default: Date.now },
});

const MemberSchema = new mongoose.Schema(
  {
    serialId: { type: Number, required: true }, // immutable, permanent
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', required: true },
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    mobile: { type: String, required: true },
    photoUrl: { type: String, default: null },
    status: { type: String, enum: ['active', 'inactive', 'expired'], default: 'active' },
    planHistory: [PlanHistorySchema],
    currentPlan: {
      planName: String,
      durationUnit: { type: String, enum: ['months', 'days'], default: 'months' },
      durationValue: Number,
      durationMonths: Number,
      fee: Number,
      startDate: Date,
      endDate: Date,
    },
    leftAt: { type: Date, default: null }, // when marked "Left"
  },
  { timestamps: true }
);

// Virtual: days left
MemberSchema.virtual('daysLeft').get(function () {
  if (!this.currentPlan?.endDate) return null;
  const now = new Date();
  const end = new Date(this.currentPlan.endDate);
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return diff;
});

// Virtual: days since expired
MemberSchema.virtual('daysSinceExpired').get(function () {
  if (!this.currentPlan?.endDate) return null;
  const now = new Date();
  const end = new Date(this.currentPlan.endDate);
  if (end > now) return 0;
  return Math.floor((now - end) / (1000 * 60 * 60 * 24));
});

MemberSchema.set('toJSON', { virtuals: true });
MemberSchema.set('toObject', { virtuals: true });

export default mongoose.models.Member || mongoose.model('Member', MemberSchema);
