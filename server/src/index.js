import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { createApp } from './app.js';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), override: true });

const port = Number(process.env.PORT ?? 4000);
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('MONGODB_URI is required. Copy .env.example to .env and configure MongoDB.');
  process.exit(1);
}

try {
  await mongoose.connect(mongoUri);
  const server = createApp().listen(port, () =>
    console.log(`Weekwise API listening on port ${port} (database: ${mongoose.connection.name})`),
  );
  const shutdown = async () => {
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  console.error('Could not connect to MongoDB:', error.message);
  process.exit(1);
}
