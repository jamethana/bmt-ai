import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createServerClient() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("bmt_session")?.value;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const client = createClient(url, key, { auth: { persistSession: false } });
  // We use custom auth; pass user id via header if needed for RLS
  return { client, sessionToken };
}
