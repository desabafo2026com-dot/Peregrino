"use client";

import { useState } from "react";
import { Sun, Moon } from "lucide-react";

function aplicarTema(tema: "light" | "dark") {
  document.documentElement.classList.toggle("dark", tema === "dark");
  try {
    localStorage.setItem("tema", tema);
  } catch {
    // localStorage indisponível — ignora, o tema só não persiste entre visitas.
  }
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [tema, setTema] = useState<"light" | "dark">(() => {
    if (typeof document === "undefined") return "light";
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });

  function alternar() {
    const novo = tema === "dark" ? "light" : "dark";
    setTema(novo);
    aplicarTema(novo);
  }

  return (
    <button
      onClick={alternar}
      suppressHydrationWarning
      aria-label={tema === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
      title={tema === "dark" ? "Modo claro" : "Modo escuro"}
      className={`flex items-center justify-center rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900 ${className}`}
    >
      {tema === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
