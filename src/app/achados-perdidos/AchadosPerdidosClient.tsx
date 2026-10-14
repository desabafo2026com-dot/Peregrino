"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Search, Phone, MapPin, CalendarDays, Trash2, CircleCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { dataBR, dataHoraBR, hojeISO } from "@/lib/datas-br";

export interface AnuncioPublico {
  id: string;
  tipo: "perdido" | "achado";
  titulo: string;
  descricao: string | null;
  local_texto: string | null;
  km: number | null;
  data_ocorrido: string | null;
  contato: string | null;
  tem_contato: boolean;
  nome: string;
  cidade: string | null;
  criado_em: string;
  expira_em: string;
}

export interface MeuAnuncio {
  id: string;
  tipo: "perdido" | "achado";
  titulo: string;
  status: "aberto" | "resolvido";
  ativo: boolean;
  expira_em: string;
}

function normalizar(t: string) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export default function AchadosPerdidosClient({
  userId,
  anuncios,
  meusIniciais,
}: {
  userId: string | null;
  anuncios: AnuncioPublico[];
  meusIniciais: MeuAnuncio[];
}) {
  const [filtro, setFiltro] = useState<"todos" | "perdido" | "achado">("todos");
  const [busca, setBusca] = useState("");
  const [meus, setMeus] = useState(meusIniciais);
  const [formAberto, setFormAberto] = useState(false);
  const [tipo, setTipo] = useState<"perdido" | "achado">("perdido");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [local, setLocal] = useState("");
  const [km, setKm] = useState("");
  const [data, setData] = useState("");
  const [contato, setContato] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const hoje = hojeISO();

  const lista = useMemo(() => {
    const termo = normalizar(busca.trim());
    return anuncios.filter(
      (a) =>
        (filtro === "todos" || a.tipo === filtro) &&
        (!termo || normalizar(`${a.titulo} ${a.descricao ?? ""} ${a.local_texto ?? ""}`).includes(termo))
    );
  }, [anuncios, filtro, busca]);

  async function publicar(e: React.FormEvent) {
    e.preventDefault();
    setAviso(null);
    if (!userId) return;
    if (titulo.trim().length < 3) return setAviso({ ok: false, texto: "Diga o que foi perdido ou achado." });
    const kmNum = km.trim() ? Number(km.replace(",", ".")) : null;
    if (kmNum != null && (Number.isNaN(kmNum) || kmNum < 0 || kmNum > 500)) {
      return setAviso({ ok: false, texto: "O km deve ser um número entre 0 e 500." });
    }
    setSalvando(true);
    const { data: novo, error } = await createClient()
      .from("achados_perdidos")
      .insert({
        user_id: userId,
        tipo,
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        local_texto: local.trim() || null,
        km: kmNum,
        data_ocorrido: data || null,
        contato: contato.trim() || null,
      })
      .select("id, tipo, titulo, status, ativo, expira_em")
      .single();
    setSalvando(false);
    if (error || !novo) return setAviso({ ok: false, texto: "Não foi possível publicar agora. Tente novamente." });
    setMeus((m) => [novo as MeuAnuncio, ...m]);
    setTitulo("");
    setDescricao("");
    setLocal("");
    setKm("");
    setData("");
    setContato("");
    setFormAberto(false);
    setAviso({ ok: true, texto: "Publicado! Ele fica na lista por 60 dias ou até você marcar como resolvido." });
  }

  async function resolver(id: string) {
    const { error } = await createClient().from("achados_perdidos").update({ status: "resolvido" }).eq("id", id);
    if (!error) setMeus((m) => m.map((a) => (a.id === id ? { ...a, status: "resolvido" } : a)));
  }

  async function apagar(id: string) {
    if (!confirm("Apagar este anúncio?")) return;
    const { error } = await createClient().from("achados_perdidos").delete().eq("id", id);
    if (!error) setMeus((m) => m.filter((a) => a.id !== id));
  }

  return (
    <div className="flex flex-col gap-4">
      {aviso && (
        <p className={`flex items-center gap-1 text-sm ${aviso.ok ? "text-green-700 dark:text-green-400" : "text-red-600"}`}>
          {aviso.ok && <Check size={16} />} {aviso.texto}
        </p>
      )}

      {!userId ? (
        <Link href="/login?redirect=/achados-perdidos" className="btn-primary text-center">
          Entrar para publicar e ver os contatos
        </Link>
      ) : !formAberto ? (
        <button type="button" onClick={() => setFormAberto(true)} className="btn-primary">
          Publicar: perdi ou achei algo
        </button>
      ) : (
        <form onSubmit={publicar} className="card flex flex-col gap-3">
          <div className="flex gap-2">
            {(
              [
                ["perdido", "Perdi"],
                ["achado", "Achei"],
              ] as const
            ).map(([v, r]) => (
              <button
                key={v}
                type="button"
                onClick={() => setTipo(v)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${
                  tipo === v ? "bg-amber-800 text-white" : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium">
            O quê?
            <input
              className="input"
              maxLength={80}
              placeholder="Ex.: Carteira marrom, documento, celular, cajado..."
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Detalhes (opcional)
            <textarea
              className="input"
              rows={3}
              maxLength={500}
              placeholder={tipo === "achado" ? "Não descreva tudo: deixe um detalhe para o dono confirmar que é dele." : "Cor, marca, o que tinha dentro..."}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 flex flex-col gap-1 text-sm font-medium">
              Onde?
              <input
                className="input"
                maxLength={120}
                placeholder={tipo === "achado" ? "Ex.: deixei no PAP Mãezinha, em Taubaté" : "Ex.: perto do PAP X, Jacareí"}
                value={local}
                onChange={(e) => setLocal(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Km (se souber)
              <input className="input" inputMode="decimal" value={km} onChange={(e) => setKm(e.target.value.replace(/[^\d.,]/g, "").slice(0, 5))} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Quando?
              <input type="date" className="input" max={hoje} value={data} onChange={(e) => setData(e.target.value)} />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Contato (opcional)
            <input
              className="input"
              maxLength={80}
              placeholder="WhatsApp ou telefone"
              value={contato}
              onChange={(e) => setContato(e.target.value)}
            />
            <span className="text-xs font-normal text-neutral-500">Aparece só para quem está logado no app.</span>
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={salvando} className="btn-primary flex-1">
              {salvando ? "Publicando..." : "Publicar"}
            </button>
            <button type="button" onClick={() => setFormAberto(false)} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {meus.length > 0 && (
        <section className="card flex flex-col gap-2">
          <h2 className="text-sm font-bold">Meus anúncios</h2>
          {meus.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0">
                <strong>{a.tipo === "perdido" ? "Perdi" : "Achei"}:</strong> {a.titulo}
                <span className="ml-1 text-xs text-neutral-500">
                  {a.status === "resolvido" ? "· resolvido" : !a.ativo ? "· oculto pela administração" : `· até ${dataHoraBR(a.expira_em).split(" às")[0]}`}
                </span>
              </span>
              <span className="flex shrink-0 gap-2">
                {a.status === "aberto" && (
                  <button type="button" onClick={() => resolver(a.id)} className="flex items-center gap-1 text-xs font-semibold text-green-700">
                    <CircleCheck size={14} /> Resolvido
                  </button>
                )}
                <button type="button" onClick={() => apagar(a.id)} className="text-red-600" aria-label="Apagar">
                  <Trash2 size={14} />
                </button>
              </span>
            </div>
          ))}
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["todos", "Todos"],
            ["perdido", "Perdidos"],
            ["achado", "Achados"],
          ] as const
        ).map(([v, r]) => (
          <button
            key={v}
            type="button"
            onClick={() => setFiltro(v)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              filtro === v ? "bg-amber-800 text-white" : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
            }`}
          >
            {r}
          </button>
        ))}
        <div className="relative min-w-[10rem] flex-1">
          <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400" />
          <input
            className="input"
            style={{ paddingLeft: "2rem" }}
            placeholder="Buscar"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      {lista.length === 0 ? (
        <p className="card text-sm text-neutral-500">Nenhum anúncio {busca ? "encontrado" : "no momento"}.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {lista.map((a) => (
            <li key={a.id} className="card flex flex-col gap-1">
              <p className="flex items-center gap-2 font-bold">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    a.tipo === "perdido"
                      ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                      : "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                  }`}
                >
                  {a.tipo === "perdido" ? "Perdido" : "Achado"}
                </span>
                {a.titulo}
              </p>
              {a.descricao && (
                <p className="text-sm text-neutral-700 dark:text-neutral-200" style={{ textAlign: "left" }}>
                  {a.descricao}
                </p>
              )}
              <p className="flex flex-wrap gap-x-3 text-xs text-neutral-500">
                {(a.local_texto || a.km != null) && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} /> {[a.local_texto, a.km != null ? `km ${a.km}` : null].filter(Boolean).join(" · ")}
                  </span>
                )}
                {a.data_ocorrido && (
                  <span className="flex items-center gap-1">
                    <CalendarDays size={12} /> {dataBR(a.data_ocorrido)}
                  </span>
                )}
                <span>
                  por {a.nome}
                  {a.cidade ? `, de ${a.cidade}` : ""}
                </span>
              </p>
              {a.contato && a.contato.replace(/\D/g, "").length < 10 ? (
                <p className="flex items-center gap-1 text-sm font-semibold">
                  <Phone size={14} /> {a.contato}
                </p>
              ) : a.contato ? (
                <a
                  href={`https://wa.me/55${a.contato.replace(/\D/g, "").replace(/^55/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-fit items-center gap-1 text-sm font-semibold text-green-700 underline"
                >
                  <Phone size={14} /> {a.contato}
                </a>
              ) : (
                a.tem_contato &&
                !userId && <p className="text-xs text-neutral-500">Entre no app para ver o contato.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
