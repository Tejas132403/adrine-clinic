"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { authService } from "@/services/clinic.service";
import { ApiError } from "@/services/api";

const loginFormSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

const DEMO_ACCOUNTS = [
  { label: "Receptionist", email: "reception@clinic.com" },
  { label: "Doctor", email: "doctor@clinic.com" },
];

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError(null);
    try {
      await authService.login(values.email, values.password);
      const next = searchParams.get("next");
      router.replace(next && next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } catch (error) {
      setSubmitError(
        error instanceof ApiError ? error.message : "Unable to sign in right now. Please try again.",
      );
    }
  };

  const fillDemoAccount = (email: string) => {
    setValue("email", email, { shouldValidate: true });
    setValue("password", "Password123!", { shouldValidate: true });
    setSubmitError(null);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {submitError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] text-rose-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{submitError}</span>
        </div>
      ) : null}

      <Input
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@clinic.com"
        required
        error={errors.email?.message}
        {...register("email")}
      />

      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        required
        error={errors.password?.message}
        {...register("password")}
      />

      <Button type="submit" className="w-full" loading={isSubmitting}>
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>

      <div className="rounded-md border border-slate-200 bg-surface-subtle p-3">
        <p className="text-2xs font-semibold uppercase tracking-wider text-ink-soft">
          Demo accounts
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => fillDemoAccount(account.email)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-left text-xs text-slate-600 transition hover:border-brand-300 hover:text-brand-700"
            >
              <span className="block font-medium text-ink">{account.label}</span>
              <span className="block text-2xs text-ink-soft">{account.email}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-2xs text-ink-soft">Password for both accounts: Password123!</p>
      </div>
    </form>
  );
}
