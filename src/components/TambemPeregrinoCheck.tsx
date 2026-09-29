"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuthRole } from "./AuthRoleProvider";
import type { GerentePap } from "@/types/database";

// Rodada 38 — antes, uma conta de gerente que também caminha precisava ir
// até /peregrinacao e preencher o formulário completo de perfil (Passo 2
// de 2) só para o menu inferior passar a mostrar os dois ícones. Esse
// caminho continua existindo (ver perfilCompleto em /perfil), mas agora
// basta marcar este check: ele cria uma linha mínima em `profiles` (nome e
// telefone já vindos do cadastro de gerente — mesmo padrão de criação
// mínima já usado por registrar_aceite_termos), o suficiente para
// AuthRoleProvider.temPerfilPeregrino virar true e o BottomNav passar a
// mostrar "Minha peregrinação" ao lado de "Meu PAP". Quem quiser completar
// cidade/data de nascimento/etc. para começar a caminhada de verdade ainda
// faz isso em /perfil, normalmente.
export default function TambemPeregrinoCheck({
  gerente,
  temPerfil,
}: {
  gerente: GerentePap;
  temPerfil: boolean;
}) {
  const { recarregar } = useAuthRole();
  const [marcado, setMarcado] = useState(temPerfil);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function marcarTambemPeregrino() {
    setSalvando(true);
    setErro(null);
    const supabase = createClient();
    const { error } = await supabase.from("profiles").insert({
      id: gerente.id,
      nome_completo: gerente.nome_completo,
      telefone: gerente.telefone,
    });
    // Rodada 45 — com a Migration 40 todo gerente já ganha o perfil de
    // peregrino automaticamente; se ele já existir (código 23505, chave
    // duplicada), é só recarregar para o menu mostrar os dois ícones.
    if (error && error.code !== "23505") {
      setSalvando(false);
      setErro("Não foi possível salvar: " + error.message);
      return;
    }
    // Recarrega para o BottomNav (AuthRoleProvider) já buscar o perfil novo
    // e mostrar os dois ícones — mesmo padrão do Rodada 35 (ProfileForm).
    recarregar();
  }

  if (temPerfil) {
    return (
      <div className="mt-6 border-t border-neutral-200 pt-4 text-center dark:border-neutral-800">
        <p className="mb-2 text-sm text-neutral-500">
          Você também tem cadastro de peregrino nesta conta.
        </p>
        <Link href="/peregrinacao" className="btn-secondary inline-block text-sm">
          Ir para Minha peregrinação
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-800">
      <label className="flex items-start justify-center gap-2 text-center text-sm text-neutral-600 dark:text-neutral-300">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={marcado}
          disabled={salvando}
          onChange={(e) => {
            setMarcado(e.target.checked);
            if (e.target.checked) marcarTambemPeregrino();
          }}
        />
        Também sou peregrino — vou caminhar até Aparecida
      </label>
      <p className="mt-1 text-center text-xs text-neutral-400">
        Marque para o ícone &quot;Minha peregrinação&quot; aparecer também no menu, usando esta
        mesma conta.
      </p>
      {erro && <p className="mt-2 text-center text-xs text-red-600 dark:text-red-400">{erro}</p>}
    </div>
  );
}
