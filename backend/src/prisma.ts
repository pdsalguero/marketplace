// src/prisma.ts
import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();
export default prisma;

declare global {
  // evita múltiples instancias en dev con ts-node-dev
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}


