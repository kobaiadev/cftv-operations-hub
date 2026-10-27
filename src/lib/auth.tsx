import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { sincronizarEstadoApp } from "@/lib/app-state";
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
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isAccessRole(value: unknown): value is AccessRole {
  return value === "00" || value === "01" || value === "02" || value === "03";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = async (userId: string) => {
    const { data, error: profileError } = await obterClienteSupabase()
      .from("user_roles")
      .select("user_id, email, display_name, role")
      .eq("user_id", userId)
      .maybeSingle();
    if (profileError)
      throw new Error(`Não foi possível carregar o perfil: ${profileError.message}`);
    if (!data || !isAccessRole(data.role)) {
      setProfile(null);
      setError("Esta conta ainda não possui um nível de acesso atribuído.");
      return;
    }
    await sincronizarEstadoApp(data.role, userId);
    setProfile(data as UserProfile);
    setError(null);
  };

  useEffect(() => {
    let active = true;
    let generation = 0;
    let subscription: { unsubscribe: () => void } | undefined;

    try {
      const supabase = obterClienteSupabase();
      const authChange = supabase.auth.onAuthStateChange((_event, nextSession) => {
        generation += 1;
        const currentGeneration = generation;
        setSession(nextSession);
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
        .getSession()
        .then(async ({ data, error: sessionError }) => {
          if (sessionError) throw sessionError;
          if (!active || generation !== initialGeneration) return;
          const currentGeneration = ++generation;
          setSession(data.session);
          if (data.session) {
            await loadProfile(data.session.user.id);
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
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      error,
      refreshProfile: async () => {
        if (!session) return;
        await loadProfile(session.user.id);
      },
    }),
    [session, profile, loading, error],
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
