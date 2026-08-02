"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { ToastContainer } from "@/components/ui/Toast";

export function DashboardToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    if (searchParams.get("success") === "1") {
      showToast("Analysis request created successfully.", "success");
      // Remove query param without re-render
      router.replace("/dashboard", { scroll: false });
    }
  }, [searchParams, showToast, router]);

  return <ToastContainer toasts={toasts} removeToast={removeToast} />;
}
