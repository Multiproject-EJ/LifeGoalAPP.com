import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSiteConfig } from "./site-config.js";

const cfg = getSiteConfig();
export const REDIRECT_TO = cfg.redirectTo;
export const supabase = createClient(cfg.supabaseUrl, cfg.anonKey);
