"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, createContext, useContext, useState, useEffect } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Simple auth context — stores user in localStorage for MVP
interface User {
  id: string;
  username: string;
  name: string;
  role: "admin" | "driver";
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  isLoading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("bus-tracker-user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem("bus-tracker-user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = (u: User) => {
    setUser(u);
    localStorage.setItem("bus-tracker-user", JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("bus-tracker-user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <AuthProvider>{children}</AuthProvider>
    </ConvexProvider>
  );
}
