import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), getSession: vi.fn(), signOut: vi.fn(),
  maybeSingle: vi.fn(), invalidate: vi.fn(), invalidateQueries: vi.fn(),
  callback: undefined as ((event: string, session: unknown) => void) | undefined,
  sync: vi.fn(), refresh: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({ obterClienteSupabase: () => ({
  auth: {
    getUser: mocks.getUser, getSession: mocks.getSession, signOut: mocks.signOut,
    onAuthStateChange: (callback: typeof mocks.callback) => {
      mocks.callback = callback;
      callback?.("INITIAL_SESSION", { user: { id: "cached-user" } });
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    },
  },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }) }),
}) }));
vi.mock("@/lib/os-store", () => ({}));
vi.mock("@/lib/cadastro-store", () => ({}));
vi.mock("@/lib/supervisao-store", () => ({}));
vi.mock("@/lib/app-state", () => ({ sincronizarEstadoApp: mocks.sync }));
const router = { invalidate: mocks.invalidate };
const queryClient = { invalidateQueries: mocks.invalidateQueries };
const navigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({ useRouter: () => router, useNavigate: () => navigate }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => queryClient }));

import { AuthProvider, useAuth } from "@/lib/auth";

function State() {
  const { session, loading, profile } = useAuth();
  return <output>{loading ? "loading" : session ? `signed-in:${profile?.role}` : "signed-out"}</output>;
}

describe("session restoration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sync.mockResolvedValue(undefined);
    mocks.signOut.mockImplementation(async () => {
      mocks.callback?.("SIGNED_OUT", null);
      return { error: null };
    });
    mocks.maybeSingle.mockResolvedValue({ data: {
      user_id: "user-1", email: "user@example.test", display_name: "User", role: "03",
    }, error: null });
  });
  afterEach(cleanup);

  it("clears a revoked cached session locally instead of admitting it", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { code: "session_not_found" } });
    render(<AuthProvider><State /></AuthProvider>);
    await waitFor(() => expect(screen.getByText("signed-out")).toBeInTheDocument());
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
  });

  it("allows a new valid sign-in after clearing the old session", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: { code: "session_not_found" } });
    render(<AuthProvider><State /></AuthProvider>);
    await waitFor(() => expect(screen.getByText("signed-out")).toBeInTheDocument());
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const session = { user: { id: "user-1" } } as Session;
    mocks.getSession.mockResolvedValue({ data: { session }, error: null });
    act(() => mocks.callback?.("SIGNED_IN", session));
    await waitFor(() => expect(screen.getByText("signed-in:03")).toBeInTheDocument());
    expect(mocks.sync).toHaveBeenCalledWith("03", "user-1");
  });

  it("keeps the form available when no session exists", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { name: "AuthSessionMissingError" } });
    render(<AuthProvider><State /></AuthProvider>);
    await waitFor(() => expect(screen.getByText("signed-out")).toBeInTheDocument());
  });
});