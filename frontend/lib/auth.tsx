"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "./api";

export interface User {
  id: string;
  username: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("route53_token");
      if (!token) {
        setLoading(false);
        return;
      }
      const data = await api.get<User>("/api/auth/me");
      setUser(data);
    } catch (err) {
      console.error("Failed to load user profile:", err);
      localStorage.removeItem("route53_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (loading) return;

    const token = localStorage.getItem("route53_token");
    if (!token && pathname !== "/login") {
      router.push("/login");
    } else if (token && pathname === "/login") {
      router.push("/hosted-zones");
    }
  }, [user, loading, pathname, router]);

  const login = async (token: string) => {
    localStorage.setItem("route53_token", token);
    setLoading(true);
    try {
      const data = await api.get<User>("/api/auth/me");
      setUser(data);
      router.push("/hosted-zones");
    } catch (err) {
      localStorage.removeItem("route53_token");
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("route53_token");
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
