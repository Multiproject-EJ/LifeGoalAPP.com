export const SITES = {
  "www.harmony-sheets.com": {
    supabaseUrl: "https://jvjmmzbbipnlzhzzyncx.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2am1temJiaXBubHpoenp5bmN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgxNTA0MDksImV4cCI6MjA5Nzc4NjQwOX0.ZwC_RBxyLZJgx3M9A4Vw4AJolLK3G60pMN5ldnlkAA8",
    redirectTo: "https://www.harmony-sheets.com/auth/callback"
  },
  "harmony-sheets.com": {
    supabaseUrl: "https://jvjmmzbbipnlzhzzyncx.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2am1temJiaXBubHpoenp5bmN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgxNTA0MDksImV4cCI6MjA5Nzc4NjQwOX0.ZwC_RBxyLZJgx3M9A4Vw4AJolLK3G60pMN5ldnlkAA8",
    redirectTo: "https://harmony-sheets.com/auth/callback"
  },
  "www.lifegoalapp.com": {
    supabaseUrl: "https://muanayogiboxooftkyny.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11YW5heW9naWJveG9vZnRreW55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNzgxNzMsImV4cCI6MjA3Nzk1NDE3M30.jJdaGXC1LEOZU9yPl-o5G2PF80OlmtNm0W4Vx5Fj1X8",
    redirectTo: "https://www.lifegoalapp.com/auth/callback"
  },
  "lifegoalapp.com": {
    supabaseUrl: "https://muanayogiboxooftkyny.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11YW5heW9naWJveG9vZnRreW55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNzgxNzMsImV4cCI6MjA3Nzk1NDE3M30.jJdaGXC1LEOZU9yPl-o5G2PF80OlmtNm0W4Vx5Fj1X8",
    redirectTo: "https://lifegoalapp.com/auth/callback"
  }
};

export function getSiteConfig() {
  return SITES[location.hostname] || SITES["www.lifegoalapp.com"];
}
