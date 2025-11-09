import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://muanayogiboxoofktkynv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11YW5heW9naWJveG9vZnRreW55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNzgxNzMsImV4cCI6MjA3Nzk1NDE3M30.jJdaGXC1LEOZU9yPl-o5G2PF80OlmtNm0W4Vx5Fj1X8";

export const REDIRECT_TO = "https://www.lifegoalapp.com/auth/callback";
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
