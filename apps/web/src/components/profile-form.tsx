"use client";

import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import { Input } from "@space-scavenger-hunt/ui/components/input";
import { Label } from "@space-scavenger-hunt/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

import { IconPicker } from "./icon-picker";
import Loader from "./loader";

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

  return (
    <div className="mx-auto w-full mt-10 max-w-md p-6 space-y-6">
      <div>
        <h1 className="mb-2 text-center text-3xl font-bold">Your Profile</h1>
        <p className="text-center text-sm text-muted-foreground">
          Update your name, icon, and password.
        </p>
      </div>

      <Card className="p-6">
        {meQuery.isPending ? (
          <Loader />
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              profileForm.handleSubmit();
            }}
            className="space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={user.username ?? ""}
                disabled
                className="opacity-60"
              />
              <p className="text-xs text-muted-foreground">
                Used to sign in. Cannot be changed.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <profileForm.Field name="firstName">
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
                      <p key={error?.message} className="text-red-500 text-sm">
                        {error?.message}
                      </p>
                    ))}
                  </div>
                )}
              </profileForm.Field>

              <profileForm.Field name="lastName">
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
                      <p key={error?.message} className="text-red-500 text-sm">
                        {error?.message}
                      </p>
                    ))}
                  </div>
                )}
              </profileForm.Field>
            </div>

            {player && (
              <>
                <profileForm.Field name="icon">
                  {(field) => (
                    <div className="space-y-2">
                      <Label>Icon</Label>
                      <IconPicker
                        value={field.state.value}
                        onChange={(icon) => field.handleChange(icon)}
                      />
                      {field.state.meta.errors.map((error) => (
                        <p key={error?.message} className="text-red-500 text-sm">
                          {error?.message}
                        </p>
                      ))}
                    </div>
                  )}
                </profileForm.Field>

                {player.team && (
                  <div className="space-y-2">
                    <Label>Team</Label>
                    <p className="text-sm">{player.team.name}</p>
                  </div>
                )}
              </>
            )}

            <profileForm.Subscribe
              selector={(state) => ({
                canSubmit: state.canSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {({ canSubmit, isSubmitting }) => (
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!canSubmit || isSubmitting || updateMutation.isPending}
                >
                  {isSubmitting || updateMutation.isPending ? "Saving..." : "Save profile"}
                </Button>
              )}
            </profileForm.Subscribe>
          </form>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Change password</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            passwordForm.handleSubmit();
          }}
          className="space-y-4"
        >
          <passwordForm.Field name="newPassword">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>New password</Label>
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
          </passwordForm.Field>

          <passwordForm.Field name="confirmPassword">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Confirm new password</Label>
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
          </passwordForm.Field>

          <passwordForm.Subscribe
            selector={(state) => ({
              canSubmit: state.canSubmit,
              isSubmitting: state.isSubmitting,
            })}
          >
            {({ canSubmit, isSubmitting }) => (
              <Button
                type="submit"
                variant="outline"
                className="w-full"
                disabled={
                  !canSubmit || isSubmitting || changePasswordMutation.isPending
                }
              >
                {isSubmitting || changePasswordMutation.isPending
                  ? "Updating..."
                  : "Update password"}
              </Button>
            )}
          </passwordForm.Subscribe>
        </form>
      </Card>
    </div>
  );
}
