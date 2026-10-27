import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { obterClienteSupabase } from "@/lib/supabase";
import "@/lib/os-store";
import "@/lib/cadastro-store";
import "@/lib/supervisao-store";

export type AccessRole = "00" | "01" | "02" | "03";
export type UserProfile = {
  user_id: string;
  email: string;
  display_name: string;
  role: AccessRole;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

// Fast Refresh can preserve the mounted provider while re-evaluating this module.
// Keep its context identity so refreshed consumers read that same provider.
const AuthContext =
  (import.meta.hot?.data?.["authContext"] as
    ReturnType<typeof createContext<AuthContextValue | null>> | undefined) ??
  createContext<AuthContextValue | null>(null);
if (import.meta.hot?.data) import.meta.hot.data["authContext"] = AuthContext;

function isAccessRole(value: unknown): value is AccessRole {
  return value === "00" || value === "01" || value === "02" || value === "03";
}

export function mapearPerfilUsuario(data: unknown): UserProfile | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const userId = typeof row["id"] === "string" ? row["id"] : row["user_id"];
  const displayName = typeof row["nome"] === "string" ? row["nome"] : row["display_name"];
  const role = isAccessRole(row["nivel_acesso"]) ? row["nivel_acesso"] : row["role"];
  const email = row["email"];
  if (
    typeof userId !== "string" ||
    typeof email !== "string" ||
    typeof displayName !== "string" ||
    !isAccessRole(role)
  ) {
    return null;
  }
  return { user_id: userId, email, display_name: displayName, role };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = async (userId: string) => {
    const { data, error: profileError } = await obterClienteSupabase()
      .from("user_roles")
      .select("user_id, display_name, email, role")
      .eq("user_id", userId)
      .maybeSingle();
    if (profileError)
      throw new Error(`Não foi possível carregar o perfil: ${profileError.message}`);
    const userProfile = mapearPerfilUsuario(data);
    if (!userProfile) {
      setProfile(null);
      setError("Esta conta ainda não possui um nível de acesso atribuído.");
      return;
    }
    setProfile(userProfile);
    setError(null);
  };

  useEffect(() => {
    let active = true;
    let generation = 0;
    let subscription: { unsubscribe: () => void } | undefined;

    try {
      const supabase = obterClienteSupabase();
      const authChange = supabase.auth.onAuthStateChange((event, nextSession) => {
        if (!["INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) return;
        generation += 1;
        const currentGeneration = generation;
        setSession(nextSession);
        setProfile(null);
        if (event !== "INITIAL_SESSION") {
          void router.invalidate();
          if (event !== "SIGNED_OUT") void queryClient.invalidateQueries();
        }
        if (!nextSession) {
          setProfile(null);
          setError(null);
          setLoading(false);
          return;
        }

        setLoading(true);
        window.setTimeout(() => {
          void loadProfile(nextSession.user.id)
            .catch((cause: unknown) => {
              if (!active || currentGeneration !== generation) return;
              console.error("Erro ao verificar o nível de acesso do usuário.", cause);
              setProfile(null);
              setError(cause instanceof Error ? cause.message : "Erro ao validar o usuário.");
            })
            .finally(() => {
              if (active && currentGeneration === generation) setLoading(false);
            });
        }, 0);
      });
      subscription = authChange.data.subscription;

      const initialGeneration = generation;
      void supabase.auth
        .getUser()
        .then(async ({ data, error: sessionError }) => {
          if (sessionError && sessionError.name !== "AuthSessionMissingError") throw sessionError;
          if (!active || generation !== initialGeneration) return;
          const currentGeneration = ++generation;
          if (data.user) {
            const { data: sessionData } = await supabase.auth.getSession();
            setSession(sessionData.session);
            await loadProfile(data.user.id);
          } else {
            setProfile(null);
            setError(null);
          }
          if (active && currentGeneration === generation) setLoading(false);
        })
        .catch((cause: unknown) => {
          if (!active) return;
          console.error("Não foi possível restaurar a sessão do usuário.", cause);
          setError("Não foi possível verificar a sessão. Atualize a página e tente novamente.");
          setLoading(false);
        });

      const mostrarErroPersistencia = (event: Event) => {
        const mensagem = (event as CustomEvent<string>).detail;
        toast.error(mensagem || "Não foi possível salvar as alterações.");
      };
      window.addEventListener("app-state-error", mostrarErroPersistencia);
      const removerListener = () =>
        window.removeEventListener("app-state-error", mostrarErroPersistencia);
      const cancelar = subscription?.unsubscribe.bind(subscription);
      subscription = {
        unsubscribe: () => {
          cancelar?.();
          removerListener();
        },
      };
    } catch (cause) {
      console.error("Não foi possível inicializar a autenticação.", cause);
      setError(cause instanceof Error ? cause.message : "Configuração de autenticação inválida.");
      setLoading(false);
    }

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [router, queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      error,
      signOut: async () => {
        await queryClient.cancelQueries();
        queryClient.clear();
        const { error: signOutError } = await obterClienteSupabase().auth.signOut();
        if (signOutError) {
          toast.error("Não foi possível sair. Tente novamente.");
          return;
        }
        await navigate({ to: "/login", replace: true });
      },
      refreshProfile: async () => {
        if (!session) return;
        await loadProfile(session.user.id);
      },
    }),
    [session, profile, loading, error, queryClient, navigate],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth deve ser utilizado dentro de AuthProvider.");
  return value;
}

export const podeEditar = (role: AccessRole | null | undefined) => role === "00" || role === "01";
export const podeBaixar = (role: AccessRole | null | undefined) =>
  role === "00" || role === "01" || role === "02";
export const ehAdministrador = (role: AccessRole | null | undefined) => role === "00";

export const NIVEIS_ACESSO: { value: AccessRole; label: string }[] = [
  { value: "00", label: "Nível 00 — Administrador" },
  { value: "01", label: "Nível 01 — Visualizar, editar e baixar" },
  { value: "02", label: "Nível 02 — Visualizar e baixar" },
  { value: "03", label: "Nível 03 — Apenas visualizar" },
];
