import 'dotenv/config';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { User } from '../src/models.js';

await mongoose.connect(process.env.MONGODB_URI);

for (const n of [1, 2]) {
  const email = process.env[`OWNER${n}_EMAIL`];
  const pw = process.env[`OWNER${n}_PASSWORD`];
  if (!email || !pw) continue;
  const hash = await bcrypt.hash(pw, 12);
  const existing = await User.findOne({ email });
  if (existing) {
    await User.updateOne({ email }, { password: hash });
  } else {
    await User.create({ name: process.env[`OWNER${n}_NAME`] || `Owner ${n}`, email, password: hash });
  }
  console.log('Owner ready:', email);
}

await mongoose.disconnect();
