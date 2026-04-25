"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {}
  );

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm text-zinc-300">Hasło</span>
        <input
          type="password"
          name="password"
          required
          autoFocus
          className="w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700/50"
        />
      </label>
      {state.error && (
        <p className="rounded-md border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-[var(--color-accent)] px-4 py-2.5 font-medium text-zinc-950 transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
      >
        {pending ? "Logowanie…" : "Zaloguj"}
      </button>
    </form>
  );
}
