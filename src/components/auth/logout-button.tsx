"use client";

import { forwardRef, useState } from "react";
import type { ReactNode } from "react";

interface LogoutButtonProps {
  children: ReactNode;
  className?: string;
  title?: string;
}

/** Invalidate the server session; only navigate away after success. */
export const LogoutButton = forwardRef<HTMLButtonElement, LogoutButtonProps>(
  function LogoutButton({ children, className, title }, ref) {
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");

    async function logout() {
      if (pending) return;
      setPending(true);
      setError("");
      try {
        const response = await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!response.ok) throw new Error("No se pudo cerrar la sesión. Intenta nuevamente.");
        window.location.replace("/login");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudo cerrar la sesión.");
        setPending(false);
      }
    }

    return (
      <button
        ref={ref}
        type="button"
        className={className}
        title={error || title}
        aria-label={title || "Cerrar sesión"}
        disabled={pending}
        onClick={() => void logout()}
      >
        {pending ? "Cerrando sesión…" : children}
        {error && <span role="alert" className="text-xs text-red-500">{error}</span>}
      </button>
    );
  },
);
