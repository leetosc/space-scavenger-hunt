import { auth } from "@space-scavenger-hunt/auth";
import prisma from "@space-scavenger-hunt/db";
import { env } from "@space-scavenger-hunt/env/server";

export async function bootstrapAdmin(): Promise<void> {
  const existingAdminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  if (existingAdminCount > 0) {
    return;
  }

  const adminUsername = env.ADMIN_USERNAME;
  const adminEmail = `${adminUsername}@${env.USER_EMAIL_DOMAIN}`.toLowerCase();

  const existingByUsername = await prisma.user.findUnique({
    where: { username: adminUsername },
  });

  if (existingByUsername) {
    await prisma.user.update({
      where: { id: existingByUsername.id },
      data: { role: "ADMIN" },
    });
    console.log(`[bootstrap] Promoted existing user "${adminUsername}" to ADMIN.`);
    return;
  }

  try {
    await auth.api.signUpEmail({
      body: {
        name: adminUsername,
        email: adminEmail,
        password: env.ADMIN_PASSWORD,
        username: adminUsername,
      },
    });
  } catch (error) {
    console.error("[bootstrap] Failed to sign up admin via Better Auth:", error);
    throw error;
  }

  await prisma.user.update({
    where: { email: adminEmail },
    data: { role: "ADMIN" },
  });

  console.log(
    `[bootstrap] Created initial admin user "${adminUsername}". Sign in with this username and ADMIN_PASSWORD.`,
  );
}
