"use client";

import { authClient } from "@/lib/auth-client";

export default function Dashboard({ session }: { session: typeof authClient.$Infer.Session }) {
  return (
    <div className="space-y-2 text-sm">
      <p>
        Signed in as <strong>{session.user.name}</strong>
      </p>
    </div>
  );
}
