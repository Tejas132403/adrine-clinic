"use client";

import { forwardRef, useId } from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";

const CONTROL_BASE =
  "w-full rounded-md border bg-white text-sm text-ink placeholder:text-slate-400 transition-colors " +
  "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 disabled:bg-slate-50 disabled:text-slate-500";

function controlClasses(error?: string): string {
  return cn(CONTROL_BASE, error ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/20" : "border-slate-300");
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="field-error" role="alert">
      <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

type FieldProps = {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function Field({ label, htmlFor, error, hint, required, className, children }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="label-field" htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-ink-soft">{hint}</p> : null}
      <FieldError message={error} />
    </div>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const control = (
    <input
      ref={ref}
      id={inputId}
      aria-invalid={error ? true : undefined}
      className={cn(controlClasses(error), "h-9 px-3", className)}
      {...props}
    />
  );

  if (!label) {
    return (
      <>
        {control}
        <FieldError message={error} />
      </>
    );
  }

  return (
    <Field label={label} htmlFor={inputId} error={error} hint={hint} required={props.required}>
      {control}
    </Field>
  );
});

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, className, id, children, ...props },
  ref,
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  const control = (
    <div className="relative">
      <select
        ref={ref}
        id={selectId}
        aria-invalid={error ? true : undefined}
        className={cn(controlClasses(error), "h-9 appearance-none pl-3 pr-9", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
        aria-hidden
      />
    </div>
  );

  if (!label) {
    return (
      <>
        {control}
        <FieldError message={error} />
      </>
    );
  }

  return (
    <Field label={label} htmlFor={selectId} error={error} hint={hint} required={props.required}>
      {control}
    </Field>
  );
});

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  const control = (
    <textarea
      ref={ref}
      id={textareaId}
      aria-invalid={error ? true : undefined}
      className={cn(controlClasses(error), "min-h-24 px-3 py-2 leading-relaxed", className)}
      {...props}
    />
  );

  if (!label) {
    return (
      <>
        {control}
        <FieldError message={error} />
      </>
    );
  }

  return (
    <Field label={label} htmlFor={textareaId} error={error} hint={hint} required={props.required}>
      {control}
    </Field>
  );
});
