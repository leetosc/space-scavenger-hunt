"use client";

import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Input } from "@space-scavenger-hunt/ui/components/input";
import { Label } from "@space-scavenger-hunt/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Fingerprint,
  KeyRound,
  RadioTower,
  Rocket,
  Satellite,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";
import { staggerContainer, fadeInUp, scaleIn, buttonInteraction } from "@/lib/animations";
import { trpc } from "@/utils/trpc";

import { IconPicker } from "./icon-picker";
import Loader from "./loader";

export default function SignUpForm({ nextPath = "/" }: { nextPath?: string }) {
  const router = useRouter();
  const { isPending: sessionPending } = authClient.useSession();
  const loginHref = nextPath === "/" ? "/login" : `/login?next=${encodeURIComponent(nextPath)}`;

  const signUpMutation = useMutation(trpc.player.signUp.mutationOptions());

  const form = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      password: "",
      icon: "Rocket",
    },
    onSubmit: async ({ value }) => {
      try {
        await signUpMutation.mutateAsync({
          firstName: value.firstName,
          lastName: value.lastName,
          username: value.username,
          password: value.password,
          icon: value.icon,
        });

        await authClient.signIn.username(
          {
            username: value.username.trim().toLowerCase(),
            password: value.password,
          },
          {
            onSuccess: () => {
              router.push(`/onboarding?next=${encodeURIComponent(nextPath)}`);
              router.refresh();
              toast.success("Welcome aboard, astronaut!");
            },
            onError: () => {
              toast.error("Account created. Please sign in manually.");
              router.push(loginHref);
            },
          },
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sign-up failed. Try again.";
        toast.error(message);
      }
    },
    validators: {
      onSubmit: z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        username: z.string().min(3, "Username must be at least 3 characters"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        icon: z.string().min(1, "Choose an icon"),
      }),
    },
  });

  if (sessionPending) {
    return <Loader />;
  }

  return (
    <motion.div
      className="mx-auto mt-10 grid w-full max-w-6xl gap-6 p-4 sm:p-6 lg:grid-cols-[0.85fr_1.15fr]"
      variants={scaleIn}
      initial="hidden"
      animate="visible"
    >
      <motion.aside
        className="relative overflow-hidden border border-cyan-400/20 bg-slate-950/55 p-5 shadow-[0_0_34px_rgba(34,211,238,0.09)]"
        variants={fadeInUp}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.04)_1px,transparent_1px)] bg-[length:100%_14px,14px_100%]" />
        <div className="relative flex h-full min-h-[360px] flex-col justify-between gap-8">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300">
              <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]" />
              New crew uplink
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-100">Join the Mission</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Register your crew identity, choose a signal icon, and enter the mission network.
            </p>
          </div>

          <div className="grid grid-cols-3 border border-cyan-400/20 bg-slate-950/60 text-center">
            {[
              ["Mode", "SIGNUP"],
              ["Crew", "OPEN"],
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
              <Sparkles className="size-3.5 text-cyan-300" />
              Crew profile generated on launch
            </div>
            <div className="flex items-center gap-2 border border-cyan-400/15 bg-slate-900/55 px-3 py-2">
              <Satellite className="size-3.5 text-cyan-300" />
              Team assignment happens at kickoff
            </div>
            <div className="flex items-center gap-2 border border-cyan-400/15 bg-slate-900/55 px-3 py-2">
              <ShieldCheck className="size-3.5 text-emerald-300" />
              Access key secured after registration
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
                Crew Registration
              </h2>
              <p className="text-xs text-muted-foreground">Create your mission identity.</p>
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
          <motion.div className="grid gap-4 sm:grid-cols-2" variants={fadeInUp}>
            <form.Field name="firstName">
              {(field) => (
                <div className="border border-cyan-400/15 bg-slate-900/45 p-3 shadow-[inset_0_0_18px_rgba(15,23,42,0.8)]">
                  <Label
                    htmlFor={field.name}
                    className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300/75"
                  >
                    <UserRound className="size-3.5" />
                    First name
                  </Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    autoComplete="given-name"
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

            <form.Field name="lastName">
              {(field) => (
                <div className="border border-cyan-400/15 bg-slate-900/45 p-3 shadow-[inset_0_0_18px_rgba(15,23,42,0.8)]">
                  <Label
                    htmlFor={field.name}
                    className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300/75"
                  >
                    <BadgeCheck className="size-3.5" />
                    Last name
                  </Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    autoComplete="family-name"
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
                    autoComplete="new-password"
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
            <form.Field name="icon">
              {(field) => (
                <div className="border border-cyan-400/15 bg-slate-900/45 p-3 shadow-[inset_0_0_18px_rgba(15,23,42,0.8)]">
                  <Label className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300/75">
                    <Rocket className="size-3.5" />
                    Choose your icon
                  </Label>
                  <IconPicker
                    value={field.state.value}
                    onChange={(icon) => field.handleChange(icon)}
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
              selector={(state) => ({
                canSubmit: state.canSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {({ canSubmit, isSubmitting }) => (
                <motion.div {...buttonInteraction}>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!canSubmit || isSubmitting}
                  >
                    <RadioTower data-icon="inline-start" className="size-4" />
                    {isSubmitting ? "Creating account..." : "Sign Up"}
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
          transition={{ delay: 0.5 }}
        >
          Already have an account?{" "}
          <Link href={loginHref} className="text-cyan-300 hover:text-cyan-100">
            Sign in
          </Link>
        </motion.div>
      </motion.section>
    </motion.div>
  );
}
