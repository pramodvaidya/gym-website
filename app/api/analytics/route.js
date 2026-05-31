import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/db';
import Owner from '@/models/Owner';
import Member from '@/models/Member';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const owner = await Owner.findOne({ email: session.user.email }).lean();
    if (!owner) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const now = new Date();
    const members = await Member.find({ ownerId: owner._id, status: 'active' }).lean();

    // Total revenue from active plans
    const totalRevenue = members.reduce((sum, m) => sum + (m.currentPlan?.fee || 0), 0);

    // Revenue by plan & Demographics
    const planBreakdown = {};
    const genderBreakdown = { Male: 0, Female: 0, Other: 0 };
    const ageBreakdown = { '<20': 0, '20-30': 0, '31-40': 0, '40+': 0 };

    members.forEach((m) => {
      const pn = m.currentPlan?.planName || 'Unknown';
      if (!planBreakdown[pn]) planBreakdown[pn] = { count: 0, revenue: 0 };
      planBreakdown[pn].count++;
      planBreakdown[pn].revenue += m.currentPlan?.fee || 0;

      if (m.gender === 'Male') genderBreakdown.Male++;
      else if (m.gender === 'Female') genderBreakdown.Female++;
      else genderBreakdown.Other++;

      if (m.age < 20) ageBreakdown['<20']++;
      else if (m.age <= 30) ageBreakdown['20-30']++;
      else if (m.age <= 40) ageBreakdown['31-40']++;
      else ageBreakdown['40+']++;
    });

    // Monthly revenue from plan history
    const allMembers = await Member.find({ ownerId: owner._id }).lean();
    const monthlyMap = {};
    allMembers.forEach((m) => {
      m.planHistory.forEach((ph) => {
        const d = new Date(ph.startDate);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyMap[key]) monthlyMap[key] = 0;
        monthlyMap[key] += ph.fee || 0;
      });
    });
    const monthlyRevenue = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, revenue]) => ({ month, revenue }));

    const totalMembers = await Member.countDocuments({ ownerId: owner._id });
    const activeMembers = await Member.countDocuments({ ownerId: owner._id, status: 'active' });
    const inactiveMembers = await Member.countDocuments({ ownerId: owner._id, status: 'inactive' });
    const expiredMembers = await Member.countDocuments({ ownerId: owner._id, status: 'expired' });
    const expiringSoon = members.filter((m) => {
      if (!m.currentPlan?.endDate) return false;
      const dl = Math.ceil((new Date(m.currentPlan.endDate) - now) / (1000 * 60 * 60 * 24));
      return dl <= 7 && dl >= 0;
    }).length;

    return NextResponse.json({
      totalRevenue,
      planBreakdown,
      genderBreakdown,
      ageBreakdown,
      monthlyRevenue,
      stats: { totalMembers, activeMembers, inactiveMembers, expiredMembers, expiringSoon },
      gymName: owner.gymName,
      ownerName: owner.name,
      plans: owner.plans,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
