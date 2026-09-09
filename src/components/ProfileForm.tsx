"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SEXO_OPTIONS, RELIGIOES, AVATARES_PEREGRINO } from "@/lib/constants";
import { CIDADES_POR_UF, UF_OPTIONS } from "@/lib/cidades";
import { validarNomeCompleto } from "@/lib/validation";
import { Upload, ShieldCheck } from "lucide-react";
import type { Profile } from "@/types/database";

interface Props {
  userId: string;
  nomeInicial: string;
  telefoneInicial: string;
  aceitaCompartilharInicial?: boolean;
  perfilExistente?: Profile | null;
}

export default function ProfileForm({
  userId,
  nomeInicial,
  telefoneInicial,
  aceitaCompartilharInicial = false,
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
  const [dataNascimento, setDataNascimento] = useState(
    perfilExistente?.data_nascimento ?? ""
  );
  const [sexo, setSexo] = useState(perfilExistente?.sexo ?? "");
  const [religiao, setReligiao] = useState(perfilExistente?.religiao ?? "");
  const [religiaoOutra, setReligiaoOutra] = useState(
    perfilExistente?.religiao_outro_desc ?? ""
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
      data_nascimento: dataNascimento,
      sexo,
      religiao: religiao || null,
      religiao_outro_desc: religiao === "outros" ? religiaoOutra : null,
      aceita_compartilhar_localizacao:
        perfilExistente?.aceita_compartilhar_localizacao ?? aceitaCompartilharInicial,
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
              value={dataNascimento ?? ""}
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
              value={sexo ?? ""}
              onChange={(e) => setSexo(e.target.value)}
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

      <section className="card border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
        <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-amber-800 dark:text-amber-500">
          <ShieldCheck size={18} /> Compartilhamento de localização
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Ao aceitar os termos no cadastro, você já autorizou o
          compartilhamento da sua localização durante o trajeto, do início ao
          fim de cada peregrinação. Ela{" "}
          <strong>não é usada para que outros peregrinos vejam onde você
          está</strong> — serve apenas para que a equipe de apoio possa avisar
          sobre condições adversas na rota e para te localizar em caso de
          emergência. O compartilhamento é ativado automaticamente quando você
          inicia uma peregrinação, e você pode pausá-lo a qualquer momento na
          página &quot;Minha peregrinação&quot;.
        </p>
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
