// Admin user management Edge Function.
//
// This is the security boundary for the admin dashboard: the browser only ever
// holds the anon key, so nothing here would be possible through RLS alone. The
// function re-checks the caller's role with the service-role client before it
// touches `auth.admin`. Never skip that check.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Service-role client — bypasses RLS, which is why the admin check above is
// non-negotiable before any action runs.
const service = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface AdminUserView {
  id: string;
  email: string | null;
  name: string | null;
  role: string | null;
  disabled: boolean;
}

Deno.serve(async (req: Request) => {
  // CORS preflight.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed' }, 405);
  }

  // AUTH — the security boundary. Verify the caller is an admin before anything else.
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ ok: false, error: 'Missing authorization header' }, 401);
  }
  const token = authHeader.replace(/^Bearer\s+/i, '');

  const { data: authData, error: authError } = await service.auth.getUser(token);
  if (authError || !authData.user) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }

  const { data: callerProfile, error: profileError } = await service
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .single();
  if (profileError || callerProfile?.role !== 'ADMIN') {
    return json({ ok: false, error: 'Forbidden' }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const action = typeof body.action === 'string' ? body.action : '';

  switch (action) {
    case 'list': {
      try {
        const { data: authUsers, error: listError } = await service.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });
        if (listError) throw listError;

        const { data: profiles, error: profilesError } = await service
          .from('profiles')
          .select('id, name, role, email');
        if (profilesError) throw profilesError;

        const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

        const users: AdminUserView[] = (authUsers.users ?? []).map((u) => {
          const profile = profileById.get(u.id);
          return {
            id: u.id,
            email: profile?.email ?? u.email ?? null,
            name: profile?.name ?? null,
            role: profile?.role ?? null,
            disabled:
              !!u.banned_until && new Date(u.banned_until).getTime() > Date.now(),
          };
        });

        return json({ ok: true, users });
      } catch (error) {
        return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 400);
      }
    }

    case 'create': {
      try {
        const email = typeof body.email === 'string' ? body.email : '';
        const password = typeof body.password === 'string' ? body.password : '';
        const name = typeof body.name === 'string' ? body.name : '';
        const role = typeof body.role === 'string' ? body.role : 'CUSTOMER';

        const { data, error: createError } = await service.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name },
        });
        if (createError) throw createError;

        const { error: updateError } = await service
          .from('profiles')
          .update({ name, role })
          .eq('id', data.user.id);
        if (updateError) throw updateError;

        return json({ ok: true, user: { id: data.user.id } });
      } catch (error) {
        return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 400);
      }
    }

    case 'update': {
      try {
        const id = typeof body.id === 'string' ? body.id : '';
        const hasEmail = typeof body.email === 'string';
        const hasName = typeof body.name === 'string';
        const hasRole = typeof body.role === 'string';

        if (hasEmail) {
          const { error: emailError } = await service.auth.admin.updateUserById(id, {
            email: body.email as string,
          });
          if (emailError) throw emailError;
        }

        if (hasName || hasRole) {
          const patch: { name?: string; role?: string } = {};
          if (hasName) patch.name = body.name as string;
          if (hasRole) patch.role = body.role as string;
          const { error: profileError } = await service
            .from('profiles')
            .update(patch)
            .eq('id', id);
          if (profileError) throw profileError;
        }

        return json({ ok: true });
      } catch (error) {
        return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 400);
      }
    }

    case 'setDisabled': {
      try {
        const id = typeof body.id === 'string' ? body.id : '';
        const disabled = body.disabled === true;

        const { error } = await service.auth.admin.updateUserById(id, {
          ban_duration: disabled ? '876600h' : 'none',
        });
        if (error) throw error;

        return json({ ok: true });
      } catch (error) {
        return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 400);
      }
    }

    case 'delete': {
      try {
        const id = typeof body.id === 'string' ? body.id : '';

        const { error } = await service.auth.admin.deleteUser(id);
        if (error) throw error;

        return json({ ok: true });
      } catch (error) {
        return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 400);
      }
    }

    default:
      return json({ ok: false, error: `Unknown action: ${action}` }, 400);
  }
});
