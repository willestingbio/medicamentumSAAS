import { defineConfig } from '@prisma/internals';
import { withAccelerate } from '@prisma/extension-accelerate';

export default defineConfig({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});
