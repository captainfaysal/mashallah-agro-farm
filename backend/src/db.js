import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer;

export const connect = async () => {
  if (mongoose.connection.readyState === 1) return;

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  const connectionUri = uri || (await createMemoryMongoUri());
  await mongoose.connect(connectionUri);
};

async function createMemoryMongoUri() {
  memoryServer = await MongoMemoryServer.create();
  const uri = memoryServer.getUri();
  process.env.MONGODB_URI = uri;
  return uri;
}

export const closeDatabase = async () => {
  if (memoryServer) {
    await mongoose.disconnect();
    await memoryServer.stop();
    return;
  }
  await mongoose.disconnect();
};

export const n = (v) => Number(v ?? 0);
