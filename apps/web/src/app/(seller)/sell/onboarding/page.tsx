import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StepIndicator } from "@/components/onboarding/step-indicator";
import { TosStep } from "@/components/onboarding/tos-step";
import { ProfileStep } from "@/components/onboarding/profile-step";
import { StripeStep } from "@/components/onboarding/stripe-step";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "販売者登録 - 問の間",
  description: "3つのステップで販売者登録を完了し、問題セットの販売を始めましょう。",
};

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

  // Step preview: heading + description for each step
  const stepPreviews = [
    {
      heading: "利用規約をご確認ください",
      description: "出品者利用規約をご確認の上、同意してください。",
    },
    {
      heading: "出品者プロフィールを設定します",
      description: "購入者に表示される販売者情報を入力してください。",
    },
    {
      heading: "収益受取の設定をします",
      description: "Stripeと連携して、収益の受け取りを設定します。",
    },
  ];

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <div className="mb-12">
        <h1 className="mb-1 text-center text-2xl font-bold tracking-tight">
          販売者登録
        </h1>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          3つのステップで販売者登録を完了しましょう
        </p>
        <StepIndicator currentStep={step} />
        <div className="mt-6 text-center">
          <p className="text-sm font-medium text-foreground">
            {stepPreviews[step - 1].heading}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {stepPreviews[step - 1].description}
          </p>
        </div>
      </div>

      {step === 1 && <TosStep />}
      {step === 2 && <ProfileStep />}
      {step === 3 && (
        <StripeStep
          stripeReturn={stripeReturn}
          stripeAccountId={profile?.stripe_account_id}
        />
      )}
    </div>
  );
}
