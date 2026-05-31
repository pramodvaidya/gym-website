import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import Owner from '@/models/Owner';

export async function GET(req) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const owner = await Owner.findOne({ email: session.user.email });
    if (!owner) return NextResponse.json({ error: 'Owner not found' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const plan = searchParams.get('plan');
    const daysLeft = searchParams.get('daysLeft');

    let query = { ownerId: owner._id };
    if (status) query.status = status;
    if (plan) query['currentPlan.planName'] = plan;

    let members = await Member.find(query).sort({ serialId: 1 }).lean();

    // Add computed fields
    const now = new Date();
    members = members.map((m) => {
      let dl = null;
      let dse = null;
      if (m.currentPlan?.endDate) {
        const end = new Date(m.currentPlan.endDate);
        dl = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
        dse = dl < 0 ? Math.abs(dl) : 0;
      }
      return { ...m, daysLeft: dl, daysSinceExpired: dse };
    });

    if (daysLeft !== null && daysLeft !== undefined && daysLeft !== '') {
      const dl = parseInt(daysLeft);
      members = members.filter((m) => m.daysLeft !== null && m.daysLeft <= dl);
    }

    return NextResponse.json({ members });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const owner = await Owner.findOne({ email: session.user.email });
    if (!owner) return NextResponse.json({ error: 'Owner not found' }, { status: 404 });

    const body = await req.json();
    const { name, age, gender, mobile, photoUrl, planName, durationUnit = 'months', durationValue, durationMonths, fee, startDate } = body;

    if (!name || !age || !gender || !mobile || !planName || !startDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const unit = durationUnit === 'days' ? 'days' : 'months';
    const duration = durationValue ?? durationMonths;
    if (!duration) {
      return NextResponse.json({ error: 'Invalid plan duration' }, { status: 400 });
    }

    // Calculate end date
    const start = new Date(startDate);
    const end = new Date(start);
    if (unit === 'days') {
      end.setDate(end.getDate() + parseInt(duration));
    } else {
      end.setMonth(end.getMonth() + parseInt(duration));
    }

    // Increment serial counter (immutable, permanent)
    owner.memberCounter += 1;
    await owner.save();
    const serialId = owner.memberCounter;

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

    const member = await Member.create({
      serialId,
      ownerId: owner._id,
      name,
      age,
      gender,
      mobile,
      photoUrl: photoUrl || null,
      status: 'active',
      planHistory: [planEntry],
      currentPlan: planEntry,
    });

    return NextResponse.json({ message: 'Member added', member }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
