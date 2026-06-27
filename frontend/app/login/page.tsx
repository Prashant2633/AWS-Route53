"use client";

import React, { useState } from "react";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../components/Notification";
import { api, APIError } from "../../lib/api";
import { CloudLightning } from "lucide-react";

interface LoginResponse {
  access_token: string;
  token_type: string;
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState("");

  const { login } = useAuth();
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError("");

    if (!username.trim() || !password.trim()) {
      setFieldError("Username and password are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await api.post<LoginResponse>("/api/auth/login", {
        username: username.trim(),
        password,
      });

      addToast("Successfully signed in", "success");
      await login(data.access_token);
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof APIError ? err.message : "Invalid credentials";
      addToast(errMsg, "error");
      setFieldError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A2332] flex flex-col items-center justify-center p-4">
      <div className="flex items-center gap-3 mb-8">
        <CloudLightning className="w-10 h-10 text-[#FF9900]" />
        <div className="flex flex-col">
          <span className="font-extrabold text-2xl tracking-wide text-white">
            AWS Route 53
          </span>
          <span className="text-xs text-[#8BA3BB] font-semibold tracking-wider">
            CONSOLE SIGN-IN CLONE
          </span>
        </div>
      </div>

      <div className="w-full max-w-md bg-[#0F1923] border border-[#1E2D3D] rounded-lg shadow-2xl overflow-hidden p-8">
        <h2 className="text-xl font-bold text-[#E8EDF2] mb-6">Sign in</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {fieldError && (
            <div className="p-3 bg-[#F85149]/10 border border-[#F85149]/30 rounded text-xs text-[#F85149] font-medium">
              {fieldError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#8BA3BB] uppercase tracking-wider mb-2">
              User name
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-[#1A2332] border border-[#1E2D3D] rounded-md text-sm text-[#E8EDF2] placeholder-[#5A7A9A] focus:outline-none focus:border-[#FF9900] transition-colors"
              placeholder="e.g. admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSubmitting}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8BA3BB] uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 bg-[#1A2332] border border-[#1E2D3D] rounded-md text-sm text-[#E8EDF2] placeholder-[#5A7A9A] focus:outline-none focus:border-[#FF9900] transition-colors"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2 bg-[#FF9900] hover:bg-[#e68a00] text-[#0F1923] text-sm font-extrabold rounded-md shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>

      <div className="mt-8 text-center text-xs text-[#5A7A9A] max-w-sm">
        <p>Default credentials: username <span className="font-mono text-[#8BA3BB]">admin</span> and password <span className="font-mono text-[#8BA3BB]">password123</span>.</p>
      </div>
    </div>
  );
}
