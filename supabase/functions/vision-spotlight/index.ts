// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (url.pathname.endsWith("/health")) return new Response("ok");
  if (url.pathname.endsWith("/subscribe") && req.method === "POST") {
    const jwt = req.headers.get("Authorization")?.replace("Bearer ","");
    const u = await supabase.auth.getUser(jwt || "");
    if (!u.data.user) return new Response("unauthorized", { status: 401 });
    const body = await req.json();
    const { endpoint, keys } = body || {};
    await supabase.from("push_subscriptions").upsert({
      user_id: u.data.user.id, endpoint, p256dh: keys?.p256dh, auth: keys?.auth
    });
    return new Response("subscribed");
  }
  if (url.pathname.endsWith("/test") && req.method === "POST") {
    return new Response("sent"); // TODO: implement push send via VAPID later
  }
  return new Response("not found", { status: 404 });
});
