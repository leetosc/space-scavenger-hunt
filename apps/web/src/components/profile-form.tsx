"use client";

import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import { Input } from "@space-scavenger-hunt/ui/components/input";
import { Label } from "@space-scavenger-hunt/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  RadioTower,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";
import {
  staggerContainer,
  staggerContainerSlow,
  fadeInUp,
  scaleIn,
  buttonInteraction,
} from "@/lib/animations";
import { trpc } from "@/utils/trpc";

import { IconPicker } from "./icon-picker";
import Loader from "./loader";
import { TeamIcon } from "./team-icon";

export default function ProfileForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = authClient.useSession();

  const meQuery = useQuery({
    ...trpc.player.me.queryOptions(),
    enabled: !!session,
  });

  const updateMutation = useMutation({
    ...trpc.player.updateMe.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.player.me.queryKey() });
      toast.success("Profile updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const changePasswordMutation = useMutation({
    ...trpc.player.changePassword.mutationOptions(),
    onSuccess: () => {
      toast.success("Password updated");
      passwordForm.reset();
    },
    onError: (err) => toast.error(err.message),
  });

  const profileForm = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      icon: "Rocket",
    },
    onSubmit: async ({ value }) => {
      const me = queryClient.getQueryData(trpc.player.me.queryKey());
      await updateMutation.mutateAsync({
        firstName: value.firstName,
        lastName: value.lastName,
        ...(me?.player ? { icon: value.icon } : {}),
      });
    },
    validators: {
      onSubmit: z.object({
        firstName: z.string().min(1, "First name is required").max(40),
        lastName: z.string().min(1, "Last name is required").max(40),
        icon: z.string().min(1, "Choose an icon"),
      }),
    },
  });

  const passwordForm = useForm({
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      await changePasswordMutation.mutateAsync({
        newPassword: value.newPassword,
      });
    },
    validators: {
      onSubmit: z
        .object({
          newPassword: z.string().min(8, "New password must be at least 8 characters"),
          confirmPassword: z.string().min(1, "Confirm your new password"),
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
          message: "New passwords do not match",
          path: ["confirmPassword"],
        }),
    },
  });

  useEffect(() => {
    if (sessionPending) return;
    if (!session) router.push("/login");
  }, [sessionPending, session, router]);

  useEffect(() => {
    const user = meQuery.data?.user;
    if (!user) return;
    profileForm.setFieldValue("firstName", user.firstName);
    profileForm.setFieldValue("lastName", user.lastName);
    if (meQuery.data?.player) {
      profileForm.setFieldValue("icon", meQuery.data.player.icon ?? "Rocket");
    }
  }, [
    meQuery.data?.user?.id,
    meQuery.data?.user?.firstName,
    meQuery.data?.user?.lastName,
    meQuery.data?.player?.icon,
  ]);

  if (sessionPending) {
    return <Loader />;
  }

  if (!session) {
    return null;
  }

  const user = meQuery.data?.user ?? {
    username: session.user.username ?? session.user.name,
    firstName: "",
    lastName: "",
  };
  const player = meQuery.data?.player;
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Crew member";

  return (
    <motion.div
      className="mx-auto mt-10 w-full max-w-5xl space-y-6 p-4 sm:p-6"
      variants={staggerContainerSlow}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
        variants={fadeInUp}
      >
        <div>
          <div className="mb-2 inline-flex items-center gap-2 border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300">
            <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]" />
            Personal uplink
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Your Profile</h1>
          <p className="text-sm text-muted-foreground">
            Identity signal <span className="font-mono text-cyan-300">{displayName}</span> / account{" "}
            <span className="font-mono text-foreground">{user.username ?? "unknown"}</span>
          </p>
        </div>
        <div className="grid grid-cols-3 border border-cyan-400/20 bg-slate-950/50 text-center shadow-[0_0_24px_rgba(34,211,238,0.08)]">
          {[
            ["Role", meQuery.data?.user.role ?? "PLAYER"],
            ["Profile", player ? "PLAYER" : "ADMIN"],
            ["Team", player?.team?.name ?? "OPEN"],
          ].map(([label, value]) => (
            <div key={label} className="min-w-24 border-r border-cyan-400/15 px-3 py-2 last:border-r-0">
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-300/70">
                {label}
              </div>
              <div className="mt-1 truncate font-mono text-xs font-bold text-slate-100">{value}</div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={scaleIn}>
        <Card className="overflow-hidden border-cyan-400/25 bg-slate-950/55 p-0 shadow-[0_0_30px_rgba(34,211,238,0.08)] backdrop-blur">
          <div className="border-b border-cyan-400/15 bg-[linear-gradient(90deg,rgba(34,211,238,0.14),rgba(15,23,42,0.6),rgba(132,204,22,0.08))] px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center border border-cyan-400/35 bg-cyan-400/10 text-cyan-300 shadow-[inset_0_0_18px_rgba(34,211,238,0.12)]">
                  <UserRound className="size-4" />
                </div>
                <div>
                  <h2 className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-slate-100">
                    Identity Configuration
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Update your crew name, icon, and visible profile signal.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 border border-cyan-400/20 bg-slate-950/70 px-2.5 py-1.5 text-xs">
                <span className="text-muted-foreground">Signal</span>
                <span className="font-mono font-semibold text-cyan-300">ONLINE</span>
              </div>
            </div>
          </div>
          {meQuery.isPending ? (
            <Loader />
          ) : (
            <motion.form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                profileForm.handleSubmit();
              }}
              className="grid gap-4 p-4"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <motion.div
                className="border border-cyan-400/15 bg-slate-900/45 p-3 shadow-[inset_0_0_18px_rgba(15,23,42,0.8)]"
                variants={fadeInUp}
              >
                <Label
                  htmlFor="username"
                  className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300/75"
                >
                  <Fingerprint className="size-3.5" />
                  Username
                </Label>
                <Input
                  id="username"
                  value={user.username ?? ""}
                  disabled
                  className="font-mono opacity-70"
                />
                <p className="text-xs text-muted-foreground">
                  Used to sign in. Cannot be changed.
                </p>
              </motion.div>

              <motion.div className="grid gap-4 sm:grid-cols-2" variants={fadeInUp}>
                <profileForm.Field name="firstName">
                  {(field) => (
                    <div className="border border-cyan-400/15 bg-slate-900/45 p-3 shadow-[inset_0_0_18px_rgba(15,23,42,0.8)]">
                      <Label
                        htmlFor={field.name}
                        className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300/75"
                      >
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
                          className="text-red-500 text-sm"
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          {error?.message}
                        </motion.p>
                      ))}
                    </div>
                  )}
                </profileForm.Field>

                <profileForm.Field name="lastName">
                  {(field) => (
                    <div className="border border-cyan-400/15 bg-slate-900/45 p-3 shadow-[inset_0_0_18px_rgba(15,23,42,0.8)]">
                      <Label
                        htmlFor={field.name}
                        className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300/75"
                      >
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
                          className="text-red-500 text-sm"
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          {error?.message}
                        </motion.p>
                      ))}
                    </div>
                  )}
                </profileForm.Field>
              </motion.div>

              {player && (
                <>
                  <motion.div variants={fadeInUp}>
                    <profileForm.Field name="icon">
                      {(field) => (
                        <div className="border border-cyan-400/15 bg-slate-900/45 p-3 shadow-[inset_0_0_18px_rgba(15,23,42,0.8)]">
                          <Label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300/75">
                            Crew icon
                          </Label>
                          <IconPicker
                            value={field.state.value}
                            onChange={(icon) => field.handleChange(icon)}
                          />
                          {field.state.meta.errors.map((error) => (
                            <motion.p
                              key={error?.message}
                              className="text-red-500 text-sm"
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                            >
                              {error?.message}
                            </motion.p>
                          ))}
                        </div>
                      )}
                    </profileForm.Field>
                  </motion.div>

                  {player.team && (
                    <motion.div
                      className="flex items-center justify-between gap-3 border border-cyan-400/15 bg-slate-900/45 p-3 shadow-[inset_0_0_18px_rgba(15,23,42,0.8)]"
                      variants={fadeInUp}
                      style={{
                        borderColor: player.team.color ? `${player.team.color}55` : undefined,
                        boxShadow: player.team.color ? `inset 0 0 18px rgba(15,23,42,0.8), 0 0 18px ${player.team.color}14` : undefined,
                      }}
                    >
                      <div className="min-w-0">
                        <Label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300/75">
                          Team vector
                        </Label>
                        <p className="truncate font-mono text-sm font-bold text-slate-100">
                          {player.team.name}
                        </p>
                      </div>
                      <TeamIcon
                        icon={null}
                        color={player.team.color}
                        name={player.team.name}
                        className="h-10 w-10 text-sm shadow-[0_0_18px_rgba(255,255,255,0.08)]"
                      />
                    </motion.div>
                  )}
                </>
              )}

              <motion.div variants={fadeInUp}>
                <profileForm.Subscribe
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
                        disabled={!canSubmit || isSubmitting || updateMutation.isPending}
                      >
                        <Save data-icon="inline-start" className="size-4" />
                        {isSubmitting || updateMutation.isPending ? "Saving..." : "Save profile"}
                      </Button>
                    </motion.div>
                  )}
                </profileForm.Subscribe>
              </motion.div>
            </motion.form>
          )}
        </Card>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <Card className="overflow-hidden border-cyan-400/20 bg-slate-950/50 p-0 shadow-[0_0_28px_rgba(34,211,238,0.07)]">
          <div className="border-b border-cyan-400/15 bg-slate-900/55 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                <LockKeyhole className="size-4" />
              </div>
              <div>
                <h2 className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-slate-100">
                  Security Protocol
                </h2>
                <p className="text-xs text-muted-foreground">Rotate your password access key.</p>
              </div>
            </div>
          </div>
          <motion.form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              passwordForm.handleSubmit();
            }}
            className="grid gap-4 p-4"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={fadeInUp}>
              <passwordForm.Field name="newPassword">
                {(field) => (
                  <div className="border border-cyan-400/15 bg-slate-900/45 p-3 shadow-[inset_0_0_18px_rgba(15,23,42,0.8)]">
                    <Label
                      htmlFor={field.name}
                      className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300/75"
                    >
                      <KeyRound className="size-3.5" />
                      New password
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
                        className="text-red-500 text-sm"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        {error?.message}
                      </motion.p>
                    ))}
                  </div>
                )}
              </passwordForm.Field>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <passwordForm.Field name="confirmPassword">
                {(field) => (
                  <div className="border border-cyan-400/15 bg-slate-900/45 p-3 shadow-[inset_0_0_18px_rgba(15,23,42,0.8)]">
                    <Label
                      htmlFor={field.name}
                      className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300/75"
                    >
                      <ShieldCheck className="size-3.5" />
                      Confirm new password
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
                        className="text-red-500 text-sm"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        {error?.message}
                      </motion.p>
                    ))}
                  </div>
                )}
              </passwordForm.Field>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <passwordForm.Subscribe
                selector={(state) => ({
                  canSubmit: state.canSubmit,
                  isSubmitting: state.isSubmitting,
                })}
              >
                {({ canSubmit, isSubmitting }) => (
                  <motion.div {...buttonInteraction}>
                    <Button
                      type="submit"
                      variant="outline"
                      className="w-full border-cyan-400/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20"
                      disabled={
                        !canSubmit || isSubmitting || changePasswordMutation.isPending
                      }
                    >
                      <RadioTower data-icon="inline-start" className="size-4" />
                      {isSubmitting || changePasswordMutation.isPending
                        ? "Updating..."
                        : "Update password"}
                    </Button>
                  </motion.div>
                )}
              </passwordForm.Subscribe>
            </motion.div>
          </motion.form>
        </Card>
      </motion.div>
    </motion.div>
  );
}
