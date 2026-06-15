import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Server-side admin check. Call from a server function whose middleware has
 * already validated the JWT (via requireSupabaseAuth) and provided `userId`.
 * Throws a 403 Response if the caller is not an admin.
 */
export async function assertAdmin(userId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data || data.role !== "admin") {
    throw new Response("Forbidden: admin role required", { status: 403 });
  }
}
