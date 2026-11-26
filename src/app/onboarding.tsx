import { ProfileForm } from "@/components/ProfileForm";
import { Reveal, Screen, Title } from "@/components/ui";
import { useApp } from "@/lib/AppContext";

export default function Onboarding() {
  const { user, saveProfile } = useApp();
  return (
    <Screen>
      <Reveal>
        <Title sub="Tell us a bit about you so we can set a safe, realistic daily calorie goal.">
          Hi {user?.name?.split(" ")[0] ?? "there"}
        </Title>
      </Reveal>
      <ProfileForm submitLabel="Set my goal" onSubmit={async (p) => { await saveProfile(p); }} />
    </Screen>
  );
}
