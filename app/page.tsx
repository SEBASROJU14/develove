import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
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
          <Image src="/logo.png" alt="develove" width={220} height={72} className="h-16 w-auto mx-auto" />
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
