import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/db';
import Owner from '@/models/Owner';
import Member from '@/models/Member';

// GET all plans for this owner
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const owner = await Owner.findOne({ email: session.user.email }).lean();
    if (!owner) return NextResponse.json({ error: 'Owner not found' }, { status: 404 });

    const planNames = owner.plans.map((plan) => plan.name);
    const usage = await Member.aggregate([
      {
        $match: {
          ownerId: owner._id,
          'currentPlan.planName': { $in: planNames },
          'currentPlan.endDate': { $gt: new Date() },
        },
      },
      {
        $group: {
          _id: '$currentPlan.planName',
          count: { $sum: 1 },
        },
      },
    ]);

    const usageMap = usage.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const plans = owner.plans.map((plan) => ({
      ...plan,
      activeMembers: usageMap[plan.name] || 0,
    }));

    return NextResponse.json({ plans });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST — add a new plan
export async function POST(req) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const owner = await Owner.findOne({ email: session.user.email });
    if (!owner) return NextResponse.json({ error: 'Owner not found' }, { status: 404 });

    const { name, durationUnit = 'months', durationValue, fee } = await req.json();
    if (!name || !durationValue || !fee) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const unit = durationUnit === 'days' ? 'days' : 'months';
    const exists = owner.plans.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      return NextResponse.json({ error: 'A plan with this name already exists' }, { status: 409 });
    }

    const plan = {
      name,
      durationUnit: unit,
      durationValue: Number(durationValue),
      fee: Number(fee),
    };
    if (unit === 'months') plan.durationMonths = Number(durationValue);

    // Normalize any existing plans for backward compatibility (some older docs may have only durationMonths)
    owner.plans = (owner.plans || []).map(p => {
      if (p.durationValue === undefined || p.durationValue === null) {
        p.durationValue = p.durationMonths ?? p.durationValue ?? 0;
      }
      if (!p.durationUnit) p.durationUnit = 'months';
      if (p.durationUnit === 'months' && (p.durationMonths === undefined || p.durationMonths === null)) {
        p.durationMonths = p.durationValue;
      }
      return p;
    });

    owner.plans.push(plan);
    await owner.save();

    return NextResponse.json({ message: 'Plan added', plans: owner.plans }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT — update an existing plan by index
export async function PUT(req) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const owner = await Owner.findOne({ email: session.user.email });
    if (!owner) return NextResponse.json({ error: 'Owner not found' }, { status: 404 });

    const { index, name, durationUnit = 'months', durationValue, fee } = await req.json();
    if (index === undefined || index < 0 || index >= owner.plans.length) {
      return NextResponse.json({ error: 'Invalid plan index' }, { status: 400 });
    }

    const planToEdit = owner.plans[index];
    const activeMembers = await Member.countDocuments({
      ownerId: owner._id,
      'currentPlan.planName': planToEdit.name,
      'currentPlan.endDate': { $gt: new Date() },
    });

    if (activeMembers > 0) {
      return NextResponse.json(
        {
          error: `Cannot edit "${planToEdit.name}" while ${activeMembers} active member${activeMembers === 1 ? '' : 's'} remain on this plan.`,
        },
        { status: 400 }
      );
    }

    if (name) owner.plans[index].name = name;
    if (durationValue !== undefined) {
      const unit = durationUnit === 'days' ? 'days' : 'months';
      owner.plans[index].durationUnit = unit;
      owner.plans[index].durationValue = Number(durationValue);
      if (unit === 'months') {
        owner.plans[index].durationMonths = Number(durationValue);
      } else {
        owner.plans[index].durationMonths = undefined;
      }
    }
    if (fee !== undefined) owner.plans[index].fee = Number(fee);
    owner.markModified('plans');
    // Normalize existing plans before saving (compatibility)
    owner.plans = (owner.plans || []).map(p => {
      if (p.durationValue === undefined || p.durationValue === null) {
        p.durationValue = p.durationMonths ?? p.durationValue ?? 0;
      }
      if (!p.durationUnit) p.durationUnit = 'months';
      if (p.durationUnit === 'months' && (p.durationMonths === undefined || p.durationMonths === null)) {
        p.durationMonths = p.durationValue;
      }
      return p;
    });

    await owner.save();

    return NextResponse.json({ message: 'Plan updated', plans: owner.plans });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE — remove a plan by index
export async function DELETE(req) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const owner = await Owner.findOne({ email: session.user.email });
    if (!owner) return NextResponse.json({ error: 'Owner not found' }, { status: 404 });

    const { index } = await req.json();
    if (index === undefined || index < 0 || index >= owner.plans.length) {
      return NextResponse.json({ error: 'Invalid plan index' }, { status: 400 });
    }

    const planToRemove = owner.plans[index];
    const activeMembers = await Member.countDocuments({
      ownerId: owner._id,
      'currentPlan.planName': planToRemove.name,
      'currentPlan.endDate': { $gt: new Date() },
    });

    if (activeMembers > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete "${planToRemove.name}" while ${activeMembers} active member${activeMembers === 1 ? '' : 's'} remain on this plan.`,
        },
        { status: 400 }
      );
    }

    owner.plans.splice(index, 1);
    owner.markModified('plans');
    await owner.save();

    return NextResponse.json({ message: 'Plan removed', plans: owner.plans });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
