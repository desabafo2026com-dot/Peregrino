"use client";

import { useState } from "react";
import { Search, Images } from "lucide-react";
import type { CompraRomariaPlus } from "@/types/database";

export interface CompraComCertificado
  extends Pick<CompraRomariaPlus, "id" | "criado_em" | "pago_em"> {
  certificados: { nome_peregrino: string; codigo: string } | null;
  quantidadeFotos?: number;
}

// Lista de admin com o registro de quem adquiriu o Certificado Plus + arte
// de 5 fotos: data da compra e quantas fotos já foram criadas. A partir da
// Rodada 18 a administração não vê mais a imagem nem pode substituí-la —
// só o registro de data e usuário, a pedido do usuário.
export default function RomariaPlusAdminClient({
  comprasIniciais,
}: {
  comprasIniciais: (CompraComCertificado & { quantidadeFotos: number })[];
}) {
  const [busca, setBusca] = useState("");

  const filtradas = comprasIniciais.filter((c) => {
    if (!busca.trim()) return true;
    const termo = busca.toLowerCase();
    return (
      (c.certificados?.nome_peregrino ?? "").toLowerCase().includes(termo) ||
      (c.certificados?.codigo ?? "").toLowerCase().includes(termo)
    );
  });

  if (comprasIniciais.length === 0) {
    return <p className="text-sm text-neutral-400">Nenhuma compra da Romaria Plus paga ainda.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400" size={16} />
        <input
          className="input pl-9"
          placeholder="Buscar por nome ou código..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {filtradas.map((c) => (
          <div key={c.id} className="card flex flex-col gap-1">
            <p className="font-semibold">{c.certificados?.nome_peregrino ?? "Peregrino"}</p>
            <p className="text-xs text-neutral-500">Código: {c.certificados?.codigo ?? "-"}</p>
            <p className="text-xs text-neutral-500">
              Pago em: {c.pago_em ? new Date(c.pago_em).toLocaleDateString("pt-BR") : "-"}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-500">
              <Images size={13} /> {c.quantidadeFotos ?? 0} de 5 fotos criadas
            </p>
          </div>
        ))}
        {filtradas.length === 0 && <p className="text-sm text-neutral-400">Nenhum resultado.</p>}
      </div>
    </div>
  );
}
