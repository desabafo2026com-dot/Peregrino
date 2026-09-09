"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function VoltarButton({
  href,
  label = "Voltar",
  className = "",
}: {
  href?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <button
      onClick={() => (href ? router.push(href) : router.back())}
      className={`mb-4 flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-amber-700 dark:text-neutral-400 dark:hover:text-amber-500 ${className}`}
    >
      <ArrowLeft size={16} /> {label}
    </button>
  );
}
