import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const testPassword = process.env.BOOTSTRAP_TEST_PASSWORD;

if (!supabaseUrl || !serviceRoleKey || !adminPassword || !testPassword) {
  throw new Error(
    "Defina NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BOOTSTRAP_ADMIN_PASSWORD e BOOTSTRAP_TEST_PASSWORD como variáveis de ambiente.",
  );
}

if (adminPassword.length < 12 || testPassword.length < 12) {
  throw new Error("As senhas de bootstrap devem ter no mínimo 12 caracteres.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const users = [
  {
    email: "daniel.lima@nagumo.com.br",
    displayName: "Daniel Lima",
    role: "00",
    password: adminPassword,
  },
  {
    email: "teste@nagumo.com",
    displayName: "Usuário de Teste",
    role: "03",
    password: testPassword,
  },
] as const;

for (const user of users) {
  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw new Error(`Não foi possível consultar os usuários: ${listError.message}`);

  const existing = existingUsers.users.find(
    (candidate) => candidate.email?.toLowerCase() === user.email,
  );
  const result = existing
    ? await supabase.auth.admin.updateUserById(existing.id, {
        password: user.password,
        email_confirm: true,
        user_metadata: { display_name: user.displayName },
      })
    : await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { display_name: user.displayName },
      });

  if (result.error || !result.data.user) {
    throw new Error(
      `Não foi possível provisionar ${user.email}: ${result.error?.message ?? "usuário ausente"}`,
    );
  }

  const { error: roleError } = await supabase.from("user_roles").upsert(
    {
      user_id: result.data.user.id,
      email: user.email,
      display_name: user.displayName,
      role: user.role,
    },
    { onConflict: "user_id" },
  );
  if (roleError) {
    throw new Error(`Não foi possível definir o nível de ${user.email}: ${roleError.message}`);
  }

  console.info(`Conta provisionada: ${user.email} (nível ${user.role}).`);
}
