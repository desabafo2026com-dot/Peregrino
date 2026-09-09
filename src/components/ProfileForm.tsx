"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MOTIVOS, SEXO_OPTIONS, RELIGIOES, AVATARES_PEREGRINO } from "@/lib/constants";
import { CIDADES_POR_UF, UF_OPTIONS } from "@/lib/cidades";
import { validarNomeCompleto } from "@/lib/validation";
import { Upload } from "lucide-react";
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
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nomeCompleto, setNomeCompleto] = useState(
    perfilExistente?.nome_completo ?? nomeInicial
  );
  const [telefone, setTelefone] = useState(
    perfilExistente?.telefone ?? telefoneInicial
  );
  const [uf, setUf] = useState(perfilExistente?.uf ?? "SP");
  const [cidade, setCidade] = useState(perfilExistente?.cidade ?? "");
  const [buscaCidade, setBuscaCidade] = useState(perfilExistente?.cidade ?? "");
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
  const [religiaoOutra, setReligiaoOutra] = useState(
    perfilExistente?.religiao_outro_desc ?? ""
  );
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
  const [avatarUrl, setAvatarUrl] = useState(perfilExistente?.avatar_url ?? "");

  const cidadesDoEstado = useMemo(() => CIDADES_POR_UF[uf] ?? [], [uf]);
  const sugestoesCidade = useMemo(() => {
    if (!buscaCidade) return cidadesDoEstado.slice(0, 8);
    const termo = buscaCidade
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    return cidadesDoEstado
      .filter((c) =>
        c
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .includes(termo)
      )
      .slice(0, 8);
  }, [buscaCidade, cidadesDoEstado]);

  async function handleUploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setErro("A foto deve ter no máximo 3MB.");
      return;
    }
    setEnviandoFoto(true);
    setErro(null);
    const supabase = createClient();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/foto.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    setEnviandoFoto(false);
    if (uploadError) {
      setErro("Não foi possível enviar a foto: " + uploadError.message);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(null);

    const erroNome = validarNomeCompleto(nomeCompleto);
    if (erroNome) {
      setErro(erroNome);
      return;
    }
    if (!cidade) {
      setErro("Selecione sua cidade de origem.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const payload = {
      id: userId,
      nome_completo: nomeCompleto,
      telefone,
      uf,
      cidade,
      faz_parte_grupo: fazParteGrupo,
      nome_grupo: fazParteGrupo ? nomeGrupo : null,
      ja_fez_trajeto: jaFezTrajeto,
      data_nascimento: dataNascimento,
      sexo,
      religiao: religiao || null,
      religiao_outro_desc: religiao === "outros" ? religiaoOutra : null,
      motivo,
      motivo_outro_desc: motivo === "outros" ? motivoOutro : null,
      tem_acompanhamento_carro_apoio: carroApoio,
      aceita_compartilhar_localizacao: compartilharLocalizacao,
      avatar_url: avatarUrl || null,
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
          Foto de perfil
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-amber-200 bg-neutral-100 dark:border-amber-900 dark:bg-neutral-800">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Sua foto ou avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                Sem foto
              </div>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={enviandoFoto}
              className="btn-secondary flex items-center gap-2"
            >
              <Upload size={16} /> {enviandoFoto ? "Enviando..." : "Enviar foto"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUploadFoto}
            />
          </div>
        </div>
        <p className="mb-2 mt-4 text-sm text-neutral-500">
          Ou escolha um avatar de peregrino:
        </p>
        <div className="flex flex-wrap gap-2">
          {AVATARES_PEREGRINO.map((a) => (
            <button
              type="button"
              key={a}
              onClick={() => setAvatarUrl(a)}
              className={`h-14 w-14 overflow-hidden rounded-full border-2 ${
                avatarUrl === a ? "border-amber-600" : "border-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a} alt="Avatar de peregrino" className="h-full w-full" />
            </button>
          ))}
        </div>
      </section>

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
              placeholder="Nome e sobrenome"
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
            <label className="label">Estado</label>
            <select
              className="input"
              value={uf}
              onChange={(e) => {
                setUf(e.target.value);
                setCidade("");
                setBuscaCidade("");
              }}
            >
              {UF_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <label className="label">Cidade de origem</label>
            <input
              required
              className="input"
              value={buscaCidade}
              onChange={(e) => {
                setBuscaCidade(e.target.value);
                setCidade("");
              }}
              placeholder="Digite para buscar..."
              autoComplete="off"
            />
            {buscaCidade && !cidade && sugestoesCidade.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-neutral-200 bg-white text-sm shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                {sugestoesCidade.map((c) => (
                  <li key={c}>
                    <button
                      type="button"
                      onClick={() => {
                        setCidade(c);
                        setBuscaCidade(c);
                      }}
                      className="block w-full px-3 py-2 text-left hover:bg-amber-50 dark:hover:bg-amber-950/40"
                    >
                      {c}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {cidade && (
              <p className="mt-1 text-xs text-green-700 dark:text-green-400">
                Selecionada: {cidade} ({uf})
              </p>
            )}
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
          <div>
            <label className="label">Religião (opcional)</label>
            <select
              className="input"
              value={religiao ?? ""}
              onChange={(e) => setReligiao(e.target.value)}
            >
              <option value="">Prefiro não informar</option>
              {RELIGIOES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {religiao === "outros" && (
            <div className="sm:col-span-2">
              <label className="label">Qual?</label>
              <input
                className="input"
                value={religiaoOutra}
                onChange={(e) => setReligiaoOutra(e.target.value)}
              />
            </div>
          )}
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
          Sua localização <strong>não é usada para que outros peregrinos vejam
          onde você está</strong>. Ela serve apenas para que a equipe de apoio
          possa avisar você sobre condições adversas na rota (mau tempo,
          acidentes, riscos) e para conseguir te localizar em caso de
          emergência. Você pode desativar quando quiser.
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
