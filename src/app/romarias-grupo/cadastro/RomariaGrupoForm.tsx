"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UsersRound, Clock, CheckCircle2, XCircle } from "lucide-react";
import { STATUS_ROMARIA_GRUPO_LABELS } from "@/lib/constants";
import type { RomariaGrupo } from "@/types/database";

interface Props {
  userId: string;
  minhasRomariasIniciais: RomariaGrupo[];
}

const STATUS_COLOR: Record<string, string> = {
  pendente: "text-amber-700 dark:text-amber-500",
  aprovado: "text-green-700 dark:text-green-400",
  rejeitado: "text-red-700 dark:text-red-400",
};

export default function RomariaGrupoForm({ userId, minhasRomariasIniciais }: Props) {
  const router = useRouter();
  const [minhasRomarias, setMinhasRomarias] = useState(minhasRomariasIniciais);
  const [nome, setNome] = useState("");
  const [cidadeOrigem, setCidadeOrigem] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [previsaoDias, setPrevisaoDias] = useState("1");
  const [organizadorNome, setOrganizadorNome] = useState("");
  const [exibirOrganizador, setExibirOrganizador] = useState(false);
  const [organizadorTelefone, setOrganizadorTelefone] = useState("");
  const [exibirTelefone, setExibirTelefone] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!nome.trim() || !cidadeOrigem.trim() || !quantidade || !dataInicio || !previsaoDias) {
      setErro("Preencha nome, cidade de origem, quantidade, data de início e previsão de dias.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("romarias_grupo")
      .insert({
        user_id: userId,
        nome: nome.trim(),
        cidade_origem: cidadeOrigem.trim(),
        quantidade: Number(quantidade),
        data_inicio: dataInicio,
        previsao_dias: Number(previsaoDias),
        organizador_nome: organizadorNome.trim() || null,
        exibir_organizador: exibirOrganizador,
        organizador_telefone: organizadorTelefone.trim() || null,
        exibir_telefone: exibirTelefone,
      })
      .select()
      .single();
    setLoading(false);
    if (error) {
      setErro("Não foi possível enviar o cadastro agora. Tente novamente.");
      return;
    }
    setMinhasRomarias((prev) => [data as RomariaGrupo, ...prev]);
    setSucesso(true);
    setNome("");
    setCidadeOrigem("");
    setQuantidade("");
    setDataInicio("");
    setPrevisaoDias("1");
    setOrganizadorNome("");
    setExibirOrganizador(false);
    setOrganizadorTelefone("");
    setExibirTelefone(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {sucesso && (
        <div className="card flex items-start gap-2 border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
          <CheckCircle2 className="mt-0.5 shrink-0 text-green-600" size={20} />
          <p className="text-sm text-green-800 dark:text-green-300">
            Cadastro enviado! Ele fica pendente até a administração aprovar — depois disso aparece
            na lista pública da home enquanto estiver dentro do período previsto.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-amber-800 dark:text-amber-500">
          <UsersRound size={18} /> Dados da romaria em grupo
        </h2>
        <div>
          <label className="label">Nome do grupo/caravana</label>
          <input required className="input" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Cidade de origem</label>
            <input
              required
              className="input"
              placeholder="Ex.: Guarulhos-SP"
              value={cidadeOrigem}
              onChange={(e) => setCidadeOrigem(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Quantidade de pessoas</label>
            <input
              required
              type="number"
              min={1}
              className="input"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Data de início</label>
            <input
              required
              type="date"
              className="input"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Previsão de dias na estrada</label>
            <input
              required
              type="number"
              min={1}
              className="input"
              value={previsaoDias}
              onChange={(e) => setPrevisaoDias(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
          <p className="mb-3 text-sm font-semibold text-neutral-600 dark:text-neutral-300">
            Organizador (opcional)
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Nome do organizador</label>
              <input
                className="input"
                value={organizadorNome}
                onChange={(e) => setOrganizadorNome(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Telefone do organizador</label>
              <input
                className="input"
                value={organizadorTelefone}
                onChange={(e) => setOrganizadorTelefone(e.target.value)}
              />
            </div>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={exibirOrganizador}
              onChange={(e) => setExibirOrganizador(e.target.checked)}
            />
            Autorizo divulgar o nome do organizador publicamente
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={exibirTelefone}
              onChange={(e) => setExibirTelefone(e.target.checked)}
            />
            Autorizo divulgar o telefone do organizador publicamente
          </label>
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Enviando..." : "Enviar para aprovação"}
        </button>
      </form>

      {minhasRomarias.length > 0 && (
        <div>
          <h2 className="mb-3 text-base font-bold text-amber-800 dark:text-amber-500">
            Minhas romarias em grupo cadastradas
          </h2>
          <div className="flex flex-col gap-2">
            {minhasRomarias.map((r) => (
              <div key={r.id} className="card">
                <p className="flex items-center gap-2 font-semibold">
                  {r.status === "pendente" && <Clock size={14} className={STATUS_COLOR.pendente} />}
                  {r.status === "aprovado" && <CheckCircle2 size={14} className={STATUS_COLOR.aprovado} />}
                  {r.status === "rejeitado" && <XCircle size={14} className={STATUS_COLOR.rejeitado} />}
                  {r.nome}
                </p>
                <p className="text-xs text-neutral-500">
                  {r.cidade_origem} — {r.quantidade} pessoa(s) —{" "}
                  {new Date(r.data_inicio + "T00:00:00").toLocaleDateString("pt-BR")} ({r.previsao_dias}{" "}
                  dia(s))
                </p>
                <p className={`text-xs font-medium ${STATUS_COLOR[r.status]}`}>
                  {STATUS_ROMARIA_GRUPO_LABELS[r.status] ?? r.status}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
