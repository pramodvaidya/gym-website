import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import Owner from '@/models/Owner';

export async function GET(req, { params }) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const owner = await Owner.findOne({ email: session.user.email });
    const member = await Member.findOne({ _id: params.id, ownerId: owner._id }).lean();
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    const now = new Date();
    let daysLeft = null;
    if (member.currentPlan?.endDate) {
      daysLeft = Math.ceil((new Date(member.currentPlan.endDate) - now) / (1000 * 60 * 60 * 24));
    }

    return NextResponse.json({ member: { ...member, daysLeft } });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const owner = await Owner.findOne({ email: session.user.email });
    const body = await req.json();
    const { action, planName, durationUnit = 'months', durationValue, durationMonths, fee, startDate } = body;

    const unit = durationUnit === 'days' ? 'days' : 'months';
    const duration = durationValue ?? durationMonths;
    if (action === 'renew' && !duration) {
      return NextResponse.json({ error: 'Invalid plan duration' }, { status: 400 });
    }

    const member = await Member.findOne({ _id: params.id, ownerId: owner._id });
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    if (action === 'renew') {
      const start = new Date(startDate);
      const end = new Date(start);
      if (unit === 'days') {
        end.setDate(end.getDate() + parseInt(duration));
      } else {
        end.setMonth(end.getMonth() + parseInt(duration));
      }
      const planEntry = {
        planName,
        durationUnit: unit,
        durationValue: parseInt(duration),
        fee,
        startDate: start,
        endDate: end,
      };
      if (unit === 'months') {
        planEntry.durationMonths = parseInt(duration);
      }
      member.planHistory.push(planEntry);
      member.currentPlan = planEntry;
      member.status = 'active';
      member.leftAt = null;
      await member.save();
      return NextResponse.json({ message: 'Member renewed', member });
    }

    if (action === 'left') {
      member.status = 'inactive';
      member.leftAt = new Date();
      await member.save();
      return NextResponse.json({ message: 'Member marked as left' });
    }

    if (action === 'update') {
      const { name, age, gender, mobile, photoUrl } = body;
      if (name) member.name = name;
      if (age) member.age = age;
      if (gender) member.gender = gender;
      if (mobile) member.mobile = mobile;
      if (photoUrl) member.photoUrl = photoUrl;
      await member.save();
      return NextResponse.json({ message: 'Member updated', member });
    }

    if (action === 'delete-membership') {
      const { password, planIndex } = body;
      if (password !== 'GYM') {
        return NextResponse.json({ error: 'Incorrect password' }, { status: 403 });
      }
      // planIndex is the index in planHistory to remove
      if (planIndex == null || planIndex < 0 || planIndex >= member.planHistory.length) {
        return NextResponse.json({ error: 'Invalid plan index' }, { status: 400 });
      }
      // Remove the plan from history
      member.planHistory.splice(planIndex, 1);
      // If the deleted plan was the current plan, reset it
      if (member.planHistory.length > 0) {
        member.currentPlan = member.planHistory[member.planHistory.length - 1];
        const now = new Date();
        const end = new Date(member.currentPlan.endDate);
        member.status = end >= now ? 'active' : 'expired';
      } else {
        member.currentPlan = null;
        member.status = 'inactive';
      }
      await member.save();
      return NextResponse.json({ message: 'Membership deleted successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
