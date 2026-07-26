import { Suspense } from "react";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <main className="container mx-auto max-w-sm px-6 py-16" data-testid="reset-password-page">
      <h1 className="text-2xl font-semibold">Set a new password</h1>
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
