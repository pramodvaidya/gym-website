import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/db';
import Owner from '@/models/Owner';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const owner = await Owner.findOne({ email: session.user.email }).lean();
    if (!owner) return NextResponse.json({ error: 'Owner not found' }, { status: 404 });

    return NextResponse.json({
      themePreference: owner.themePreference || 'light',
      notificationTime: owner.notificationTime || '19:40',
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { themePreference, notificationTime } = body;

    await dbConnect();
    const owner = await Owner.findOne({ email: session.user.email });
    if (!owner) return NextResponse.json({ error: 'Owner not found' }, { status: 404 });

    if (themePreference === 'light' || themePreference === 'dark') owner.themePreference = themePreference;
    if (typeof notificationTime === 'string') owner.notificationTime = notificationTime;

    await owner.save();
    return NextResponse.json({ message: 'Settings updated' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
