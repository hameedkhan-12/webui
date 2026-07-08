import { AuthLayout } from "@/components/AuthLayout";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <AuthLayout mode="sign-up">
      <SignUp
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "shadow-none border-0 p-0 bg-transparent",
            headerTitle: "hidden",
            headerSubtitle: "hidden",
            socialButtonsBlockButton:
              "border border-black/10 bg-white rounded-[10px] text-[13px] font-medium hover:border-black/40 hover:shadow-sm transition-all",
            dividerLine: "bg-black/10",
            dividerText: "text-[11px] uppercase tracking-widest text-black/40",
            formFieldLabel: "text-[12px] font-medium text-[#0F0E0D]",
            formFieldInput:
              "rounded-[10px] border-[1.5px] border-black/10 text-[14px] focus:border-[#2D4A3E] focus:ring-2 focus:ring-[#2D4A3E]/10 transition-all",
            formButtonPrimary:
              "bg-[#0F0E0D] hover:bg-[#2D4A3E] rounded-[10px] text-[14px] font-bold tracking-wide transition-all hover:-translate-y-px hover:shadow-lg",
            footerActionText: "text-[12px] text-black/50",
            footerActionLink: "text-[#2D4A3E] font-medium hover:underline",
            formResendCodeLink: "text-[#2D4A3E] font-medium",
          },
          layout: {
            socialButtonsPlacement: "top",
            showOptionalFields: false,
          },
        }}
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/dashboard"
      />
    </AuthLayout>
  );
}