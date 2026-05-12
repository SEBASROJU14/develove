import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LoginButton from "./login-button";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <div className="max-w-md w-full space-y-8">
        <div className="space-y-3">
          <h1 className="text-5xl font-bold tracking-tight" style={{ color: "var(--color-foreground)" }}>
            develove
          </h1>
          <p className="text-lg" style={{ color: "var(--color-muted)" }}>
            Build with love, ship with purpose.
          </p>
        </div>

        <div className="h-px w-full" style={{ background: "var(--color-border)" }} />

        <LoginButton />
      </div>
    </main>
  );
}
