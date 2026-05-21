"use client";

import { Toaster } from "@space-scavenger-hunt/ui/components/sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { queryClient } from "@/utils/trpc";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {mounted ? <Toaster richColors /> : null}
      {children}
    </QueryClientProvider>
  );
}
