"use client";

import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Input } from "@space-scavenger-hunt/ui/components/input";
import { Label } from "@space-scavenger-hunt/ui/components/label";
import { cn } from "@space-scavenger-hunt/ui/lib/utils";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";
import { SPACE_ICONS } from "@/lib/icons";
import { trpc } from "@/utils/trpc";

import Loader from "./loader";

export default function SignUpForm() {
  const router = useRouter();
  const { isPending: sessionPending } = authClient.useSession();

  const signUpMutation = useMutation(trpc.player.signUp.mutationOptions());

  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
      icon: "Rocket",
    },
    onSubmit: async ({ value }) => {
      try {
        await signUpMutation.mutateAsync({
          username: value.username,
          password: value.password,
          icon: value.icon,
        });

        // Sign in automatically after sign-up
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
            onError: (error) => {
              // Account created but auto-login failed -- redirect to login
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
    <div className="mx-auto w-full mt-10 max-w-md p-6">
      <h1 className="mb-2 text-center text-3xl font-bold">Join the Mission</h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Create your account.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-5"
      >
        <div>
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
                  <p key={error?.message} className="text-red-500 text-sm">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <div>
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
                  <p key={error?.message} className="text-red-500 text-sm">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <div>
          <form.Field name="icon">
            {(field) => (
              <div className="space-y-2">
                <Label>Choose Your Icon</Label>
                <div className="grid grid-cols-5 sm:grid-cols-7 gap-2">
                  {SPACE_ICONS.map(({ name, icon: Icon }) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => field.handleChange(name)}
                      className={cn(
                        "flex items-center justify-center p-2 border transition-all",
                        "hover:border-cyan-400 hover:text-cyan-400",
                        field.state.value === name
                          ? "border-cyan-400 text-cyan-400 bg-cyan-400/10 shadow-[0_0_12px_rgba(34,211,238,0.25)]"
                          : "border-border/40 text-muted-foreground",
                      )}
                      title={name}
                    >
                      <Icon className="size-5" />
                    </button>
                  ))}
                </div>
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-red-500 text-sm">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
        >
          {({ canSubmit, isSubmitting }) => (
            <Button
              type="submit"
              className="w-full"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? "Creating account..." : "Sign Up"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-cyan-400 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
