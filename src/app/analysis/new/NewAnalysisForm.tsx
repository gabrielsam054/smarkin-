"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { createAnalysisRequest } from "./actions";

const COUNTRIES = [
  { value: "Worldwide", label: "🌍 Worldwide" },
  { value: "Ghana", label: "🇬🇭 Ghana" },
  { value: "Nigeria", label: "🇳🇬 Nigeria" },
  { value: "Kenya", label: "🇰🇪 Kenya" },
  { value: "South Africa", label: "🇿🇦 South Africa" },
  { value: "United States", label: "🇺🇸 United States" },
  { value: "United Kingdom", label: "🇬🇧 United Kingdom" },
  { value: "Canada", label: "🇨🇦 Canada" },
  { value: "Australia", label: "🇦🇺 Australia" },
];

const BUSINESS_TYPES = [
  { value: "Ecommerce", label: "Ecommerce" },
  { value: "Local Business", label: "Local Business" },
  { value: "Digital Product", label: "Digital Product" },
  { value: "Service", label: "Service" },
  { value: "SaaS", label: "SaaS" },
  { value: "Coaching", label: "Coaching" },
  { value: "Real Estate", label: "Real Estate" },
  { value: "Education", label: "Education" },
  { value: "Fashion", label: "Fashion" },
  { value: "Beauty", label: "Beauty" },
  { value: "Food", label: "Food" },
  { value: "Fitness", label: "Fitness" },
];

const OBJECTIVES = [
  { value: "Sales", label: "💰 Sales" },
  { value: "Leads", label: "🎯 Leads" },
  { value: "Traffic", label: "🌐 Traffic" },
  { value: "Awareness", label: "📣 Awareness" },
  { value: "App Installs", label: "📱 App Installs" },
];

export function NewAnalysisForm() {
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Client-side validation
    const productName = formData.get("productName") as string;
    if (!productName?.trim()) {
      setErrors({ productName: "Product name is required." });
      return;
    }

    // Attach image file if present
    if (imageFile) {
      formData.set("image", imageFile);
    }

    startTransition(async () => {
      const result = await createAnalysisRequest(formData);

      if (result?.error) {
        showToast(result.error, "error");
        return;
      }

      // redirect happens server-side on success — but show toast first
      // via query param detection on dashboard
      showToast("Analysis request created successfully.", "success");
      setTimeout(() => router.push("/dashboard?success=1"), 800);
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product Name */}
        <Input
          label="Product Name"
          name="productName"
          type="text"
          placeholder="e.g. Premium Whey Protein Powder"
          required
          error={errors.productName}
          disabled={isPending}
        />

        {/* Product Description */}
        <Textarea
          label="Product Description"
          name="description"
          placeholder="Describe what your product does, who it's for, and what makes it unique..."
          className="min-h-[120px]"
          disabled={isPending}
        />

        {/* Image Upload */}
        <ImageUpload
          value={imageFile}
          onChange={setImageFile}
          disabled={isPending}
        />

        {/* Country + Business Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Select
            label="Target Country"
            name="country"
            options={COUNTRIES}
            defaultValue="Worldwide"
            disabled={isPending}
          />
          <Select
            label="Business Type"
            name="businessType"
            options={BUSINESS_TYPES}
            defaultValue="Ecommerce"
            disabled={isPending}
          />
        </div>

        {/* Objective */}
        <Select
          label="Campaign Objective"
          name="objective"
          options={OBJECTIVES}
          defaultValue="Sales"
          disabled={isPending}
        />

        {/* Submit */}
        <div className="pt-2">
          <Button
            type="submit"
            size="xl"
            loading={isPending}
            className="w-full gap-3 text-base"
            disabled={isPending}
          >
            <Zap size={18} />
            Analyze Audience
          </Button>
          <p className="text-center text-xs text-text-muted font-mono mt-4">
            Your analysis will be queued and processed by the AI engine
          </p>
        </div>
      </form>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
}
