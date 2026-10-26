import { prisma } from "@/server/db";

let cachedAccountId: string | null = null;

export async function getCurrentAccountId(): Promise<string> {
  if (cachedAccountId) {
    const exists = await prisma.account.findUnique({
      where: { id: cachedAccountId },
      select: { id: true },
    });
    if (exists) return exists.id;
    cachedAccountId = null;
  }

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

export interface CurrentAccount {
  id: string;
  name: string;
  user: {
    name: string;
    role: string;
  };
}

export async function getCurrentAccount(): Promise<CurrentAccount> {
  let accountId = await getCurrentAccountId();
  let account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      users: {
        take: 1,
      },
    },
  });

  if (!account) {
    resetCachedAccountId();
    accountId = await getCurrentAccountId();
    account = await prisma.account.findUniqueOrThrow({
      where: { id: accountId },
      include: {
        users: {
          take: 1,
        },
      },
    });
  }

  const currentUser = account.users[0] ?? {
    name: "Anmol K.",
    role: "OWNER",
  };

  const roleStr = currentUser.role.toString();
  const roleTitleCase =
    roleStr.charAt(0).toUpperCase() + roleStr.slice(1).toLowerCase();

  return {
    id: account.id,
    name: account.name,
    user: {
      name: currentUser.name,
      role: roleTitleCase,
    },
  };
}
