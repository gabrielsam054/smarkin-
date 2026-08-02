"use client";

import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";

export function LogoutButton() {
  const { signOut } = useAuth();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={signOut}
      className="gap-2"
    >
      <LogOut size={14} />
      Sign Out
    </Button>
  );
}
