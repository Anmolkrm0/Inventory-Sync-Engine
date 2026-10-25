import { prisma } from "@/server/db";

let cachedAccountId: string | null = null;

export async function getCurrentAccountId(): Promise<string> {
  if (cachedAccountId) return cachedAccountId;

  const account = await prisma.account.findFirst({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (!account) {
    throw new Error("No seeded account found. Please run the seed script.");
  }

  cachedAccountId = account.id;
  return account.id;
}

export function resetCachedAccountId() {
  cachedAccountId = null;
}
