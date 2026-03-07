import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api, setToken, clearToken } from "../api/client";
import type { User } from "../lib/types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (idToken: string) => Promise<void>;
  devLogin: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .getMe()
      .then((u) => setUser(u))
      .catch(() => {
        clearToken();
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (idToken: string) => {
    const res = await api.googleSignIn(idToken);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const devLogin = useCallback(async () => {
    const res = await api.devLogin();
    setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, devLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
