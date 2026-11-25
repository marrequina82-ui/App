import { router } from "expo-router";
import { ProfileForm } from "@/components/ProfileForm";
import { Screen } from "@/components/ui";
import { useApp } from "@/lib/AppContext";

export default function Goals() {
  const { profile, saveProfile } = useApp();
  return (
    <Screen edges={["bottom"]}>
      <ProfileForm
        initial={profile}
        submitLabel="Save goals"
        onSubmit={async (p) => {
          await saveProfile(p);
          router.back();
        }}
      />
    </Screen>
  );
}
