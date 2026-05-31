import cron from 'node-cron';
import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import Owner from '@/models/Owner';
import Notification from '@/models/Notification';
import { sendExpiryAlert } from '@/lib/mailer';

export async function processCronRun(now = new Date()) {
  await dbConnect();
  const owners = await Owner.find({});
  let totalAlerts = 0;

  for (const owner of owners) {
    const scheduledTime = owner.notificationTime || '19:40';
    const [hour, minute] = scheduledTime.split(':').map((value) => Number(value));
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) continue;

    const scheduledDate = new Date(now);
    scheduledDate.setHours(hour, minute, 0, 0);
    if (now < scheduledDate) continue;

    const members = await Member.find({ ownerId: owner._id, status: 'active' }).lean();
    const expiring = members
      .map((m) => {
        if (!m.currentPlan?.endDate) return null;
        const end = new Date(m.currentPlan.endDate);
        const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 7 && daysLeft >= 0) {
          return { ...m, daysLeft };
        }
        return null;
      })
      .filter(Boolean);

    if (expiring.length === 0) continue;

    let alertsCreatedForOwner = 0;

    for (const m of expiring) {
      const existing = await Notification.findOne({
        ownerId: owner._id,
        memberId: m._id,
      });
      if (!existing) {
        await Notification.create({
          ownerId: owner._id,
          memberId: m._id,
          memberName: m.name,
          memberSerialId: m.serialId,
          daysLeft: m.daysLeft,
        });
        totalAlerts++;
        alertsCreatedForOwner++;
      }
    }

    if (alertsCreatedForOwner > 0) {
      try {
        await sendExpiryAlert({
          to: owner.email,
          ownerName: owner.name,
          members: expiring.map((m) => ({ name: m.name, daysLeft: m.daysLeft })),
        });
      } catch (emailErr) {
        console.error('Email error for owner', owner.email, emailErr.message);
      }
    }
  }

  await Member.updateMany(
    { status: 'active', 'currentPlan.endDate': { $lt: now } },
    { status: 'expired' }
  );

  return { message: `Cron ran. ${totalAlerts} alerts created.` };
}

export function initializeInternalCron() {
  if (globalThis.__gymproCronInitialized) return;
  globalThis.__gymproCronInitialized = true;

  cron.schedule('* * * * *', async () => {
    try {
      const result = await processCronRun();
      console.log('[GymPro cron] run complete:', result.message);
    } catch (err) {
      console.error('[GymPro cron] run failed:', err);
    }
  });
}
