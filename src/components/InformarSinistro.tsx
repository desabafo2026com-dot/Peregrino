"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIAS_SINISTRO, TIPOS_POR_CATEGORIA } from "@/lib/constants";
import type { CategoriaSinistro } from "@/types/database";
import { TriangleAlert, X } from "lucide-react";

interface Props {
  rotaId: string | null;
}

// Mensagem mostrada após o envio, explicando quando o relato fica visível
// para outros peregrinos — chuva é publicada na hora (informação útil mas
// que perde valor rápido); as demais categorias esperam a administração
// revisar por até 30 minutos antes de aparecerem como "não confirmado", e
// tudo que não for confirmado some do público depois de 1 hora.
function mensagemPublicacao(categoria: CategoriaSinistro) {
  if (categoria === "chuva") {
    return "Obrigado! Seu aviso de chuva já está visível no mapa para outros peregrinos e fica ativo por cerca de 1 hora.";
  }
  return "Obrigado! Seu relato foi enviado para revisão da administração. Se ninguém revisar antes, ele é publicado automaticamente como \"não confirmado\" em até 30 minutos, e fica visível por até 1 hora.";
}

export default function InformarSinistro({ rotaId }: Props) {
  const [aberto, setAberto] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaSinistro>("sinistro");
  const [tipo, setTipo] = useState(TIPOS_POR_CATEGORIA.sinistro[0].value);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const tiposDisponiveis = TIPOS_POR_CATEGORIA[categoria] ?? [];
  const precisaEspecificar = categoria === "outros" && tipo === "especificar";

  function trocarCategoria(novaCategoria: CategoriaSinistro) {
    setCategoria(novaCategoria);
    setTipo(TIPOS_POR_CATEGORIA[novaCategoria][0].value);
  }

  function obterPosicao(): Promise<GeolocationPosition | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!titulo.trim()) {
      setErro("Descreva brevemente o que está acontecendo no título.");
      return;
    }
    if (precisaEspecificar && !descricao.trim()) {
      setErro("Especifique nos detalhes o que está acontecendo.");
      return;
    }
    setLoading(true);
    const pos = await obterPosicao();
    if (!pos) {
      setLoading(false);
      setErro("Não foi possível acessar sua localização. Ative o GPS e tente novamente.");
      return;
    }
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { error } = await supabase.from("riscos_informados").insert({
      user_id: user.id,
      titulo,
      descricao: descricao || null,
      categoria,
      tipo,
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      rota_id: rotaId,
    });
    setLoading(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setSucesso(mensagemPublicacao(categoria));
    setTitulo("");
    setDescricao("");
    trocarCategoria("sinistro");
    setTimeout(() => {
      setAberto(false);
      setSucesso(null);
    }, 4000);
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
      >
        <TriangleAlert size={16} /> Informar sinistro ou suspeita
      </button>
    );
  }

  return (
    <div className="card border-red-200 dark:border-red-900">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-bold text-red-700">
          <TriangleAlert size={18} /> Informar sinistro ou suspeita
        </h3>
        <button onClick={() => setAberto(false)} aria-label="Fechar">
          <X size={18} />
        </button>
      </div>
      <p className="mb-3 text-xs text-neutral-500">
        Usaremos sua localização atual. Relatos de chuva ficam visíveis na
        hora; os demais aguardam revisão da administração (publicação
        automática em até 30 minutos, se ninguém revisar antes).
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="label">Categoria</label>
          <select
            className="input"
            value={categoria}
            onChange={(e) => trocarCategoria(e.target.value as CategoriaSinistro)}
          >
            {CATEGORIAS_SINISTRO.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Tipo</label>
          <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {tiposDisponiveis.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">O que está acontecendo?</label>
          <input
            required
            className="input"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: acidente na pista, cão bravo solto..."
          />
        </div>
        <div>
          <label className="label">
            Detalhes{precisaEspecificar ? "" : " (opcional)"}
          </label>
          <textarea
            required={precisaEspecificar}
            className="input"
            rows={2}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </div>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        {sucesso && (
          <div className="flex flex-col gap-1">
            <p className="text-sm text-green-700">{sucesso}</p>
            <p className="text-sm font-semibold text-red-700">
              Em caso de urgência, ligue para o órgão competente!
            </p>
          </div>
        )}
        <button disabled={loading} className="btn-primary">
          {loading ? "Enviando..." : "Enviar relato"}
        </button>
      </form>
    </div>
  );
}
