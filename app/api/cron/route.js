import { NextResponse } from 'next/server';
import { processCronRun, initializeInternalCron } from '@/lib/cronScheduler';

initializeInternalCron();

export async function GET(req) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processCronRun();
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}
