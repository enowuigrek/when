import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth/admin-session";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Logowanie",
  robots: { index: false },
};

export default async function LoginPage() {
  if (await isAdminAuthenticated()) redirect("/admin");

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="when" className="h-7 logo-adaptive" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Panel właściciela
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Zaloguj się żeby zobaczyć rezerwacje.
        </p>
        <div className="mt-8">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
