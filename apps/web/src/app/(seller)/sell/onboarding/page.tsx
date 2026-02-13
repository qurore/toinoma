import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StepIndicator } from "@/components/onboarding/step-indicator";
import { TosStep } from "@/components/onboarding/tos-step";
import { ProfileStep } from "@/components/onboarding/profile-step";
import { StripeStep } from "@/components/onboarding/stripe-step";

export default async function SellerOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; stripe_return?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/sell/onboarding");
  }

  const { data: profile } = await supabase
    .from("seller_profiles")
    .select("tos_accepted_at, seller_display_name, stripe_account_id")
    .eq("id", user.id)
    .single();

  // Determine the real step based on DB state (not just URL param)
  const params = await searchParams;
  const stripeReturn = params.stripe_return === "true";

  let currentStep: number;
  if (!profile?.tos_accepted_at) {
    currentStep = 1;
  } else if (
    !profile.seller_display_name ||
    profile.seller_display_name === "__pending__"
  ) {
    currentStep = 2;
  } else {
    currentStep = 3;
  }

  // Allow URL param to advance (but never skip a required step)
  const requestedStep = params.step ? parseInt(params.step, 10) : currentStep;
  const step = Math.min(requestedStep, currentStep);

  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <div className="mb-10">
        <h1 className="mb-2 text-center text-2xl font-bold tracking-tight">
          販売者登録
        </h1>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          3つのステップで販売者登録を完了しましょう
        </p>
        <StepIndicator currentStep={step} />
      </div>

      {step === 1 && <TosStep />}
      {step === 2 && <ProfileStep />}
      {step === 3 && (
        <StripeStep
          stripeReturn={stripeReturn}
          stripeAccountId={profile?.stripe_account_id}
        />
      )}
    </main>
  );
}
