// supabase/functions/actions-cleanup/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();
    let deletedCount = 0;
    let migratedCount = 0;
    const errors: string[] = [];

    // 1. Delete expired NICE TO DO actions
    const { data: deletedActions, error: deleteError } = await supabase
      .from('actions')
      .delete()
      .eq('category', 'nice_to_do')
      .eq('completed', false)
      .lt('expires_at', now)
      .select('id');

    if (deleteError) {
      errors.push(`Delete error: ${deleteError.message}`);
    } else {
      deletedCount = deletedActions?.length ?? 0;
    }

    // 2. Get expired PROJECT actions for migration
    const { data: projectActions, error: fetchError } = await supabase
      .from('actions')
      .select('*')
      .eq('category', 'project')
      .eq('completed', false)
      .is('migrated_to_project_id', null)
      .lt('expires_at', now);

    if (fetchError) {
      errors.push(`Fetch error: ${fetchError.message}`);
    } else if (projectActions && projectActions.length > 0) {
      // Migrate each PROJECT action
      for (const action of projectActions) {
        try {
          // Create project
          const { data: project, error: projectError } = await supabase
            .from('projects')
            .insert({
              user_id: action.user_id,
              title: action.title,
              description: `Migrated from action: ${action.title}${action.notes ? `\n\nNotes: ${action.notes}` : ''}`,
              status: 'planning',
            })
            .select()
            .single();

          if (projectError) {
            errors.push(`Project creation error for action ${action.id}: ${projectError.message}`);
            continue;
          }

          // Update action to mark as migrated
          const { error: updateError } = await supabase
            .from('actions')
            .update({
              completed: true,
              completed_at: now,
              migrated_to_project_id: project.id,
            })
            .eq('id', action.id);

          if (updateError) {
            errors.push(`Action update error for ${action.id}: ${updateError.message}`);
          } else {
            migratedCount++;
          }
        } catch (err) {
          errors.push(`Migration error for action ${action.id}: ${err.message}`);
        }
      }
    }

    const response = {
      success: errors.length === 0,
      timestamp: now,
      deletedCount,
      migratedCount,
      errors: errors.length > 0 ? errors : undefined,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
