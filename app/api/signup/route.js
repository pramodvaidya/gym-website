import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Owner from '@/models/Owner';

export async function POST(req) {
  try {
    await dbConnect();
    const { name, email, password, gymName, gymLocation, plans } = await req.json();

    if (!name || !email || !password || !gymName || !plans || plans.length === 0) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase();
    const exists = await Owner.findOne({ email: lowerEmail });
    if (exists) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const owner = await Owner.create({ name, email: lowerEmail, gymName, gymLocation, password, plans });
    return NextResponse.json(
      { message: 'Account created successfully', id: owner._id },
      { status: 201 }
    );
  } catch (err) {
    console.error('Signup error:', err);
    const msg = String(err.message || '').toLowerCase();
    if (msg.includes('mongod') || msg.includes('mongodb') || msg.includes('connection')) {
      return NextResponse.json({ error: 'Database connection error. Ensure MONGODB_URI in .env.local is set and valid.' }, { status: 500 });
    }
    if (msg.includes('please define mongodb_uri')) {
      return NextResponse.json({ error: 'MONGODB_URI missing. Add it to .env.local' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
