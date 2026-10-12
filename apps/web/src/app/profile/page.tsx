import ProfileForm from "@/components/profile-form";
import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata({
  title: "Your Profile",
  description: "Update your player name and profile for Luke & Leo's birthday scavenger hunt.",
  path: "/profile",
});

export default function ProfilePage() {
  return <ProfileForm />;
}
