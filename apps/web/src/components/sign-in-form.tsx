"use client";

import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Input } from "@space-scavenger-hunt/ui/components/input";
import { Label } from "@space-scavenger-hunt/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { motion } from "framer-motion";
import { Fingerprint, KeyRound, LogIn, RadioTower, Satellite, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";
import { staggerContainer, fadeInUp, scaleIn, buttonInteraction } from "@/lib/animations";

import Loader from "./loader";

export default function SignInForm({ nextPath = "/" }: { nextPath?: string }) {
  const router = useRouter();
  const { isPending } = authClient.useSession();
  const signUpHref = nextPath === "/" ? "/signup" : `/signup?next=${encodeURIComponent(nextPath)}`;

  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.username(
        {
          username: value.username,
          password: value.password,
        },
        {
          onSuccess: () => {
            router.push(nextPath);
            router.refresh();
            toast.success("Signed in");
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        username: z.string().min(3, "Username must be at least 3 characters"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    },
  });

  if (isPending) {
    return <Loader />;
  }

  return (
    <motion.div
      className="mx-auto mt-10 grid w-full max-w-5xl gap-6 p-4 sm:p-6 lg:grid-cols-[0.9fr_1.1fr]"
      variants={scaleIn}
      initial="hidden"
      animate="visible"
    >
      <motion.aside
        className="relative overflow-hidden border border-cyan-400/20 bg-slate-950/55 p-5 shadow-[0_0_34px_rgba(34,211,238,0.09)]"
        variants={fadeInUp}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.04)_1px,transparent_1px)] bg-[length:100%_14px,14px_100%]" />
        <div className="relative flex h-full min-h-[280px] flex-col justify-between gap-8">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300">
              <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]" />
              Access uplink
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-100">Mission Control</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Authenticate your crew signal to enter the scavenger hunt command network.
            </p>
          </div>

          <div className="grid grid-cols-3 border border-cyan-400/20 bg-slate-950/60 text-center">
            {[
              ["Link", "SECURE"],
              ["Mode", "LOGIN"],
              ["Relay", "READY"],
            ].map(([label, value]) => (
              <div key={label} className="border-r border-cyan-400/15 px-3 py-2 last:border-r-0">
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-300/70">
                  {label}
                </div>
                <div className="mt-1 truncate font-mono text-xs font-bold text-slate-100">{value}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <div className="flex items-center gap-2 border border-cyan-400/15 bg-slate-900/55 px-3 py-2">
              <Satellite className="size-3.5 text-cyan-300" />
              Orbital channel synchronized
            </div>
            <div className="flex items-center gap-2 border border-cyan-400/15 bg-slate-900/55 px-3 py-2">
              <ShieldCheck className="size-3.5 text-emerald-300" />
              Credentials encrypted in transit
            </div>
          </div>
        </div>
      </motion.aside>

      <motion.section
        className="overflow-hidden border border-cyan-400/25 bg-slate-950/55 shadow-[0_0_30px_rgba(34,211,238,0.08)] backdrop-blur"
        variants={fadeInUp}
      >
        <div className="border-b border-cyan-400/15 bg-[linear-gradient(90deg,rgba(34,211,238,0.14),rgba(15,23,42,0.6),rgba(132,204,22,0.08))] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center border border-cyan-400/35 bg-cyan-400/10 text-cyan-300 shadow-[inset_0_0_18px_rgba(34,211,238,0.12)]">
              <RadioTower className="size-4" />
            </div>
            <div>
              <h2 className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-slate-100">
                Identity Verification
              </h2>
              <p className="text-xs text-muted-foreground">Enter your mission credentials.</p>
            </div>
          </div>
        </div>

        <motion.form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="grid gap-4 p-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeInUp}>
            <form.Field name="username">
              {(field) => (
                <div className="border border-cyan-400/15 bg-slate-900/45 p-3 shadow-[inset_0_0_18px_rgba(15,23,42,0.8)]">
                  <Label
                    htmlFor={field.name}
                    className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300/75"
                  >
                    <Fingerprint className="size-3.5" />
                    Username
                  </Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    autoComplete="username"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="font-mono"
                  />
                  {field.state.meta.errors.map((error) => (
                    <motion.p
                      key={error?.message}
                      className="mt-2 text-sm text-red-400"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {error?.message}
                    </motion.p>
                  ))}
                </div>
              )}
            </form.Field>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <form.Field name="password">
              {(field) => (
                <div className="border border-cyan-400/15 bg-slate-900/45 p-3 shadow-[inset_0_0_18px_rgba(15,23,42,0.8)]">
                  <Label
                    htmlFor={field.name}
                    className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300/75"
                  >
                    <KeyRound className="size-3.5" />
                    Password
                  </Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="password"
                    autoComplete="current-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="font-mono"
                  />
                  {field.state.meta.errors.map((error) => (
                    <motion.p
                      key={error?.message}
                      className="mt-2 text-sm text-red-400"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {error?.message}
                    </motion.p>
                  ))}
                </div>
              )}
            </form.Field>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <form.Subscribe
              selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}
            >
              {({ canSubmit, isSubmitting }) => (
                <motion.div {...buttonInteraction}>
                  <Button type="submit" className="w-full" disabled={!canSubmit || isSubmitting}>
                    <LogIn data-icon="inline-start" className="size-4" />
                    {isSubmitting ? "Signing in..." : "Sign In"}
                  </Button>
                </motion.div>
              )}
            </form.Subscribe>
          </motion.div>
        </motion.form>

        <motion.div
          className="border-t border-cyan-400/15 bg-slate-950/35 px-4 py-3 text-center font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground"
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.4 }}
        >
          Don&apos;t have an account?{" "}
          <Link href={signUpHref} className="text-cyan-300 hover:text-cyan-100">
            Sign up
          </Link>
        </motion.div>
      </motion.section>
    </motion.div>
  );
}
