import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
  wordmark?: boolean;
  href?: string;
}

const SIZE_MAP = {
  xs: { w: 80,  h: 32  },
  sm: { w: 100, h: 40  },
  md: { w: 120, h: 48  },
  lg: { w: 160, h: 64  },
};

export function Logo({ className, size = "md", href = "/" }: LogoProps) {
  const { w, h } = SIZE_MAP[size];

  return (
    <Link href={href} className={cn("flex-none inline-flex items-center group", className)}>
      <Image
        src="/logo.png"
        alt="Smarkin — Growth & Success"
        width={w}
        height={h}
        className="object-contain transition-opacity duration-150 group-hover:opacity-90"
        priority
      />
    </Link>
  );
}
