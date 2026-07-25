import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export default function OtpPage() {
  return (
    <Suspense>
      <AuthForm mode="otp" />
    </Suspense>
  );
}
