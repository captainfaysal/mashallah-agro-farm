import mongoose from 'mongoose';
export const connect = () => mongoose.connect(process.env.MONGODB_URI);
export const n = (v) => Number(v ?? 0);
