import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../lib/api";
import { buildSession, clearSession, loadSession, saveSession } from "../lib/session";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    loadSession()
      .then((storedSession) => {
        if (!isMounted) {
          return;
        }

        setSession(storedSession);
        setIsReady(true);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setSession(null);
        setIsReady(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const persistSession = async (authPayload) => {
    const nextSession = buildSession(authPayload);
    await saveSession(nextSession);
    setSession(nextSession);
    return nextSession;
  };

  const login = async (credentials) => {
    const response = await authApi.login(credentials);
    return persistSession(response);
  };

  const signup = async (payload) => {
    const response = await authApi.register(payload);
    return persistSession(response);
  };

  const logout = async () => {
    await clearSession();
    setSession(null);
  };

  const updateSession = async (updates) => {
    setSession((current) => {
      const next = {
        ...(current || {}),
        ...updates,
      };

      if (next?.token) {
        saveSession(next);
        return next;
      }

      clearSession();
      return null;
    });
  };

  const value = useMemo(
    () => ({
      session,
      isReady,
      isAuthenticated: Boolean(session?.token),
      login,
      signup,
      logout,
      updateSession,
    }),
    [isReady, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}