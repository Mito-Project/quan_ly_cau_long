import { createBrowserClient } from "@supabase/ssr";

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const qrUrl = (path: string | null) =>
  path ? supabase.storage.from("qr").getPublicUrl(path).data.publicUrl : null;
