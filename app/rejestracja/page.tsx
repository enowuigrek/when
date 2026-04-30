"use client";

import { useActionState } from "react";
import { registerAction, type RegisterState } from "./actions";
import Link from "next/link";

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  placeholder,
  hint,
  error,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-zinc-300">
        {label}
        {!required && <span className="ml-1 text-zinc-600">(opcjonalnie)</span>}
      </span>
      <input
        type={type}
        name={name}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        className={`w-full rounded-md border px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 bg-zinc-900/60 focus:outline-none focus:ring-2 focus:ring-zinc-700/50 transition-colors ${
          error
            ? "border-red-700 focus:border-red-600"
            : "border-zinc-800 focus:border-zinc-600"
        }`}
      />
      {hint && !error && (
        <span className="mt-1 block text-xs text-zinc-600">{hint}</span>
      )}
      {error && (
        <span className="mt-1 block text-xs text-red-400">{error}</span>
      )}
    </label>
  );
}

export default function RejestrPage() {
  const [state, action, pending] = useActionState<RegisterState, FormData>(
    registerAction,
    { status: "idle" }
  );

  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const globalError =
    state.status === "error" && !Object.keys(fieldErrors).length
      ? state.message
      : null;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-16">
      <Link href="/" className="mb-10 flex items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="when" className="h-8 logo-adaptive" />
      </Link>

      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-xl backdrop-blur-sm">
          <h1 className="mb-1 text-xl font-semibold text-zinc-100">Utwórz konto</h1>
          <p className="mb-6 text-sm text-zinc-500">
            Bezpłatny dostęp. Bez karty kredytowej.
          </p>

          <form action={action} className="space-y-4">
            <Field
              label="Nazwa firmy"
              name="business_name"
              autoComplete="organization"
              placeholder="np. Barber Studio Kowalski"
              hint="Wyświetlana klientom podczas rezerwacji"
              error={fieldErrors.business_name}
            />

            <Field
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="twoj@email.pl"
              hint="Służy do logowania i powiadomień"
              error={fieldErrors.email}
            />

            <Field
              label="Telefon"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+48 500 000 000"
              hint="Widoczny na stronie rezerwacji"
              error={fieldErrors.phone}
              required={false}
            />

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Hasło"
                name="password"
                type="password"
                autoComplete="new-password"
                hint="Min. 8 znaków"
                error={fieldErrors.password}
              />
              <Field
                label="Powtórz hasło"
                name="password2"
                type="password"
                autoComplete="new-password"
                error={fieldErrors.password2}
              />
            </div>

            {globalError && (
              <p className="rounded-md border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">
                {globalError}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="mt-2 w-full rounded-full bg-[var(--color-accent,#d4a26a)] px-4 py-2.5 font-semibold text-zinc-950 transition-colors hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Tworzenie konta…" : "Załóż konto →"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-600">
          Masz już konto?{" "}
          <Link
            href="/admin/login"
            className="text-zinc-400 underline hover:text-zinc-200 transition-colors"
          >
            Zaloguj się
          </Link>
        </p>
      </div>
    </div>
  );
}
