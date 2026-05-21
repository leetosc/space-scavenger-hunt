"use client";

import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Input } from "@space-scavenger-hunt/ui/components/input";
import { Label } from "@space-scavenger-hunt/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";
import {
  staggerContainer,
  fadeInUp,
  scaleIn,
  buttonInteraction,
} from "@/lib/animations";
import { trpc } from "@/utils/trpc";

import { IconPicker } from "./icon-picker";
import Loader from "./loader";

export default function SignUpForm() {
  const router = useRouter();
  const { isPending: sessionPending } = authClient.useSession();

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
              router.push("/");
              router.refresh();
              toast.success("Welcome aboard, astronaut!");
            },
            onError: () => {
              toast.error("Account created. Please sign in manually.");
              router.push("/login");
            },
          },
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Sign-up failed. Try again.";
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
      className="mx-auto w-full mt-10 max-w-md p-6"
      variants={scaleIn}
      initial="hidden"
      animate="visible"
    >
      <motion.h1
        className="mb-2 text-center text-3xl font-bold"
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
      >
        Join the Mission
      </motion.h1>
      <motion.p
        className="mb-6 text-center text-sm text-muted-foreground"
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.1 }}
      >
        Create your account.
      </motion.p>

      <motion.form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-5"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="grid grid-cols-2 gap-4" variants={fadeInUp}>
          <form.Field name="firstName">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>First name</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  autoComplete="given-name"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
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
          </form.Field>

          <form.Field name="lastName">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Last name</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  autoComplete="family-name"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
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
          </form.Field>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <form.Field name="username">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Username</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  autoComplete="username"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
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
          </form.Field>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <form.Field name="password">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Password</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="password"
                  autoComplete="new-password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
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
          </form.Field>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <form.Field name="icon">
            {(field) => (
              <div className="space-y-2">
                <Label>Choose Your Icon</Label>
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
                  {isSubmitting ? "Creating account..." : "Sign Up"}
                </Button>
              </motion.div>
            )}
          </form.Subscribe>
        </motion.div>
      </motion.form>

      <motion.p
        className="mt-6 text-center text-xs text-muted-foreground"
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.5 }}
      >
        Already have an account?{" "}
        <Link href="/login" className="text-cyan-400 hover:underline">
          Sign in
        </Link>
      </motion.p>
    </motion.div>
  );
}
