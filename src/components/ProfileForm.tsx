"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MOTIVOS, SEXO_OPTIONS } from "@/lib/constants";
import type { Profile } from "@/types/database";

interface Props {
  userId: string;
  nomeInicial: string;
  telefoneInicial: string;
  perfilExistente?: Profile | null;
}

export default function ProfileForm({
  userId,
  nomeInicial,
  telefoneInicial,
  perfilExistente,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const [nomeCompleto, setNomeCompleto] = useState(
    perfilExistente?.nome_completo ?? nomeInicial
  );
  const [telefone, setTelefone] = useState(
    perfilExistente?.telefone ?? telefoneInicial
  );
  const [cidade, setCidade] = useState(perfilExistente?.cidade ?? "");
  const [fazParteGrupo, setFazParteGrupo] = useState(
    perfilExistente?.faz_parte_grupo ?? false
  );
  const [nomeGrupo, setNomeGrupo] = useState(perfilExistente?.nome_grupo ?? "");
  const [jaFezTrajeto, setJaFezTrajeto] = useState(
    perfilExistente?.ja_fez_trajeto ?? false
  );
  const [dataNascimento, setDataNascimento] = useState(
    perfilExistente?.data_nascimento ?? ""
  );
  const [sexo, setSexo] = useState(perfilExistente?.sexo ?? "");
  const [religiao, setReligiao] = useState(perfilExistente?.religiao ?? "");
  const [motivo, setMotivo] = useState(perfilExistente?.motivo ?? "");
  const [motivoOutro, setMotivoOutro] = useState(
    perfilExistente?.motivo_outro_desc ?? ""
  );
  const [carroApoio, setCarroApoio] = useState(
    perfilExistente?.tem_acompanhamento_carro_apoio ?? false
  );
  const [compartilharLocalizacao, setCompartilharLocalizacao] = useState(
    perfilExistente?.aceita_compartilhar_localizacao ?? false
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    setLoading(true);

    const supabase = createClient();
    const payload = {
      id: userId,
      nome_completo: nomeCompleto,
      telefone,
      cidade,
      faz_parte_grupo: fazParteGrupo,
      nome_grupo: fazParteGrupo ? nomeGrupo : null,
      ja_fez_trajeto: jaFezTrajeto,
      data_nascimento: dataNascimento,
      sexo,
      religiao: religiao || null,
      motivo,
      motivo_outro_desc: motivo === "outros" ? motivoOutro : null,
      tem_acompanhamento_carro_apoio: carroApoio,
      aceita_compartilhar_localizacao: compartilharLocalizacao,
      atualizado_em: new Date().toISOString(),
    };

    const { error } = await supabase.from("profiles").upsert(payload);
    setLoading(false);

    if (error) {
      setErro(error.message);
      return;
    }

    setSucesso("Perfil salvo com sucesso!");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <section className="card">
        <h2 className="mb-4 text-base font-bold text-amber-800 dark:text-amber-500">
          Dados básicos
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Nome completo</label>
            <input
              required
              className="input"
              value={nomeCompleto}
              onChange={(e) => setNomeCompleto(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Telefone</label>
            <input
              required
              className="input"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Cidade</label>
            <input
              required
              className="input"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              placeholder="Sua cidade de origem"
            />
          </div>
          <div>
            <label className="label">Data de nascimento</label>
            <input
              type="date"
              required
              className="input"
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Sexo</label>
            <select
              required
              className="input"
              value={sexo}
              onChange={(e) => setSexo(e.target.value as Profile["sexo"])}
            >
              <option value="" disabled>
                Selecione
              </option>
              {SEXO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Religião (opcional)</label>
            <input
              className="input"
              value={religiao ?? ""}
              onChange={(e) => setReligiao(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="mb-4 text-base font-bold text-amber-800 dark:text-amber-500">
          Sobre sua peregrinação
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="grupo"
              type="checkbox"
              className="h-4 w-4"
              checked={fazParteGrupo}
              onChange={(e) => setFazParteGrupo(e.target.checked)}
            />
            <label htmlFor="grupo" className="text-sm font-medium">
              Faço parte de um grupo de peregrinos
            </label>
          </div>
          {fazParteGrupo && (
            <div className="sm:col-span-2">
              <label className="label">Nome do grupo</label>
              <input
                className="input"
                value={nomeGrupo ?? ""}
                onChange={(e) => setNomeGrupo(e.target.value)}
              />
            </div>
          )}

          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="jafez"
              type="checkbox"
              className="h-4 w-4"
              checked={jaFezTrajeto}
              onChange={(e) => setJaFezTrajeto(e.target.checked)}
            />
            <label htmlFor="jafez" className="text-sm font-medium">
              Já fiz esse trajeto antes
            </label>
          </div>

          <div className="sm:col-span-2">
            <label className="label">Motivo da peregrinação</label>
            <select
              required
              className="input"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value as Profile["motivo"])}
            >
              <option value="" disabled>
                Selecione
              </option>
              {MOTIVOS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {motivo === "outros" && (
            <div className="sm:col-span-2">
              <label className="label">Descreva o motivo</label>
              <input
                className="input"
                value={motivoOutro ?? ""}
                onChange={(e) => setMotivoOutro(e.target.value)}
              />
            </div>
          )}

          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="carro"
              type="checkbox"
              className="h-4 w-4"
              checked={carroApoio}
              onChange={(e) => setCarroApoio(e.target.checked)}
            />
            <label htmlFor="carro" className="text-sm font-medium">
              Terei acompanhamento de carro de apoio
            </label>
          </div>
        </div>
      </section>

      <section className="card border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
        <h2 className="mb-2 text-base font-bold text-amber-800 dark:text-amber-500">
          Compartilhamento de localização
        </h2>
        <p className="mb-3 text-sm text-neutral-600 dark:text-neutral-300">
          Ao aceitar, sua localização poderá ser compartilhada com outros
          peregrinos autenticados durante os dias em que você marcar
          &quot;iniciar peregrinação&quot; — isso ajuda equipes de apoio e
          outros peregrinos a te localizar em caso de necessidade. Você pode
          desativar quando quiser.
        </p>
        <div className="flex items-center gap-2">
          <input
            id="localizacao"
            type="checkbox"
            className="h-4 w-4"
            checked={compartilharLocalizacao}
            onChange={(e) => setCompartilharLocalizacao(e.target.checked)}
          />
          <label htmlFor="localizacao" className="text-sm font-medium">
            Aceito compartilhar minha localização durante a caminhada
          </label>
        </div>
      </section>

      {erro && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {erro}
        </p>
      )}
      {sucesso && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          {sucesso}
        </p>
      )}

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Salvando..." : "Salvar perfil"}
      </button>
    </form>
  );
}
