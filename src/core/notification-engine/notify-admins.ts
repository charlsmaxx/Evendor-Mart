import "server-only";

import { prisma } from "@/core/infrastructure/prisma";
import { canAccessAdminSection } from "@/core/authorization-engine/permissions";
import { notifyUser } from "./service";

/** In-app notice to every admin who can access Settlements & Payments. */
export async function notifyFinanceAdmins(input: {
  title: string;
  body: string;
  link?: string;
}) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, role: true, adminRole: true, email: true },
  });
  const recipients = admins.filter((admin) => canAccessAdminSection(admin, "escrow"));
  await Promise.all(
    recipients.map((admin) =>
      notifyUser({
        userId: admin.id,
        title: input.title,
        body: input.body,
        link: input.link,
      })
    )
  );
}
