import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/db';
import Notification from '@/models/Notification';
import Owner from '@/models/Owner';

export async function GET(req) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const owner = await Owner.findOne({ email: session.user.email });
    const notifications = await Notification.aggregate([
      { $match: { ownerId: owner._id } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$memberId', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
      { $limit: 50 },
    ]);

    const unreadCount = notifications.filter((n) => !n.read).length;
    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const owner = await Owner.findOne({ email: session.user.email });
    await Notification.updateMany({ ownerId: owner._id, read: false }, { read: true });
    return NextResponse.json({ message: 'All notifications marked as read' });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
