import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SignOutButton from "./sign-out-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="max-w-md w-full space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold" style={{ color: "var(--color-foreground)" }}>
            Hola, {user.user_metadata?.full_name?.split(" ")[0] ?? "dev"} 👋
          </h1>
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            {user.email}
          </p>
        </div>

        <div
          className="rounded-xl p-6 space-y-2"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--color-muted)" }}>
            Tu dashboard está listo.
          </p>
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            Empieza a construir desde aquí.
          </p>
        </div>

        <SignOutButton />
      </div>
    </main>
  );
}
