"use client";

import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface LogoutButtonProps {
  iconOnly?: boolean;
}

export function LogoutButton({ iconOnly }: LogoutButtonProps) {
  const { signOut } = useAuth();

  if (iconOnly) {
    return (
      <button
        onClick={signOut}
        title="Sign out"
        className="w-7 h-7 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-3 transition-all duration-150 ml-auto flex-none"
      >
        <LogOut size={13} />
      </button>
    );
  }

  return (
    <button
      onClick={signOut}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-all duration-150 w-full"
    >
      <LogOut size={14} className="flex-none" />
      Sign out
    </button>
  );
}
