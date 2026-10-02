import { PrismaClient } from '@prisma/client';
import { measureDatabase } from './requestMetrics';

const prisma = new PrismaClient().$extends({
  query: { $allOperations: ({ args, query }) => measureDatabase(() => query(args)) },
});

export default prisma;
export type TransactionClient = Omit<typeof prisma, '$extends' | '$transaction' | '$connect' | '$disconnect'>;
