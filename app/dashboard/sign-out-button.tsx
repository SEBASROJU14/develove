"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <button
      onClick={signOut}
      className="text-sm cursor-pointer transition-colors"
      style={{ color: "var(--color-muted)" }}
      onMouseOver={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = "var(--color-foreground)";
      }}
      onMouseOut={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = "var(--color-muted)";
      }}
    >
      Cerrar sesión
    </button>
  );
}
