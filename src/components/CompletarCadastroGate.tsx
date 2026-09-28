"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthRole } from "./AuthRoleProvider";

// Rodada 40 — quem entrou pelo "Entrar com o Google" pela primeira vez e
// fechou o app antes de terminar /login/completar fica logado sem ter
// escolhido o tipo de conta nem aceitado os Termos. Aqui mandamos essa
// pessoa de volta para terminar, em qualquer página — menos nas que ela
// precisa conseguir abrir nesse meio-tempo (o próprio login/completar e os
// textos dos Termos, da Política de Privacidade e o "É seguro?").
const LIVRES = ["/login", "/auth", "/termos", "/privacidade", "/seguro"];

export default function CompletarCadastroGate() {
  const { cadastroIncompleto } = useAuthRole();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!cadastroIncompleto) return;
    if (LIVRES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return;
    router.replace("/login/completar");
  }, [cadastroIncompleto, pathname, router]);

  return null;
}
