"use client";

import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Input } from "@space-scavenger-hunt/ui/components/input";
import { Label } from "@space-scavenger-hunt/ui/components/label";
import { useForm } from "@tanstack/react-form";
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
        Mission Control
      </motion.h1>
      <motion.p
        className="mb-6 text-center text-sm text-muted-foreground"
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.1 }}
      >
        Sign in to join the scavenger hunt.
      </motion.p>

      <motion.form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
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
                    className="text-red-500"
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
                  autoComplete="current-password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.map((error) => (
                  <motion.p
                    key={error?.message}
                    className="text-red-500"
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
                  {isSubmitting ? "Signing in..." : "Sign In"}
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
        transition={{ delay: 0.4 }}
      >
        Don&apos;t have an account?{" "}
        <Link href={signUpHref} className="text-cyan-400 hover:underline">
          Sign up
        </Link>
      </motion.p>
    </motion.div>
  );
}
