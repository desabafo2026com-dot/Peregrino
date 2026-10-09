"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { comprimirImagem, CACHE_UM_ANO } from "@/lib/comprimir-imagem";
import { SEXO_OPTIONS, RELIGIOES, AVATARES_PEREGRINO, normalizarReligiaoAntiga } from "@/lib/constants";
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
  // Rodada 59 — destino depois de completar o perfil pela 1ª vez (painel,
  // área do gerente ou Minha peregrinação do organizador) e se marca a
  // conta como organizador de Romaria.
  destinoPrimeiroCadastro?: string;
  marcarOrganizador?: boolean;
  // Rodada 62 — fora de Minha peregrinação só o nome é obrigatório (é o que
  // o certificado precisa). Para planejar/iniciar a peregrinação o perfil
  // completo é exigido (modoPeregrinacao) e, ao salvar, volta para lá.
  modoPeregrinacao?: boolean;
  voltarPara?: string;
}

function isoParaTexto(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}
function mascaraData(valor: string) {
  const d = valor.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}
function textoParaIso(texto: string) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
}
function dataNascimentoValida(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  const data = new Date(Date.UTC(a, m - 1, d));
  if (data.getUTCFullYear() !== a || data.getUTCMonth() !== m - 1 || data.getUTCDate() !== d) return false;
  const anoAtual = new Date().getFullYear();
  return a >= anoAtual - 110 && a <= anoAtual - 5;
}

export default function ProfileForm({
  userId,
  nomeInicial,
  telefoneInicial,
  aceitaCompartilharInicial = false,
  perfilExistente,
  destinoPrimeiroCadastro = "/painel",
  marcarOrganizador = false,
  modoPeregrinacao = false,
  voltarPara,
}: Props) {
  // Rodada 62b — nome, data de nascimento, estado, cidade e sexo são sempre
  // obrigatórios; o telefone só em Minha peregrinação.
  const obrigatorio = true;
  const telefoneObrigatorio = modoPeregrinacao;
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
  // Data digitada (DD/MM/AAAA) — mais fácil que o calendário do celular
  // para escolher o ano de nascimento.
  const [dataTexto, setDataTexto] = useState(() => isoParaTexto(perfilExistente?.data_nascimento ?? ""));
  const [dataNascimento, setDataNascimento] = useState(
    perfilExistente?.data_nascimento ?? ""
  );
  const [sexo, setSexo] = useState(perfilExistente?.sexo ?? "");
  // Rodada 25: a lista de religiões foi simplificada para 3 opções — ver
  // normalizarReligiaoAntiga em constants.ts para o mapeamento de um valor
  // salvo antes dessa mudança (ex.: "evangelica", "ateu") para a opção nova
  // mais coerente, só para preencher o formulário ao reabrir um perfil já
  // existente.
  const [religiao, setReligiao] = useState(
    normalizarReligiaoAntiga(perfilExistente?.religiao)
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
    // Rodada 61 — a foto é reduzida antes do envio, então aceita fotos
    // grandes direto da câmera.
    if (file.size > 25 * 1024 * 1024) {
      setErro("A foto deve ter no máximo 25MB.");
      return;
    }
    setEnviandoFoto(true);
    setErro(null);
    const supabase = createClient();
    const reduzida = await comprimirImagem(file, { maxLado: 480 });
    const ext = reduzida.type === "image/jpeg" ? "jpg" : file.name.split(".").pop() || "jpg";
    const path = `${userId}/foto-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, reduzida, { upsert: true, cacheControl: CACHE_UM_ANO, contentType: reduzida.type || undefined });
    setEnviandoFoto(false);
    if (uploadError) {
      setErro("Não foi possível enviar a foto: " + uploadError.message);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
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
    if (obrigatorio) {
      if (telefoneObrigatorio && !telefone?.trim()) {
        setErro("Informe um telefone para contato.");
        return;
      }
      if (!dataNascimento || !dataNascimentoValida(dataNascimento)) {
        setErro("Informe sua data de nascimento no formato DD/MM/AAAA.");
        return;
      }
      if (!cidade) {
        setErro("Selecione sua cidade de origem.");
        return;
      }
      if (!sexo) {
        setErro("Selecione o sexo.");
        return;
      }
    } else if (buscaCidade.trim() && !cidade) {
      setErro("Escolha a cidade na lista de sugestões (ou apague o campo).");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const payload = {
      id: userId,
      nome_completo: nomeCompleto,
      telefone: telefone?.trim() || null,
      uf,
      cidade: cidade || null,
      data_nascimento: dataNascimento || null,
      sexo: sexo || null,
      religiao: religiao || null,
      // Rodada 25: "outras" não pede mais especificação — a coluna
      // religiao_outro_desc continua existindo no banco (perfis antigos
      // mantêm o texto que já tinham), só deixou de ser preenchida a
      // partir de agora.
      religiao_outro_desc: null,
      aceita_compartilhar_localizacao:
        perfilExistente?.aceita_compartilhar_localizacao ?? aceitaCompartilharInicial,
      avatar_url: avatarUrl || null,
      atualizado_em: new Date().toISOString(),
      ...(marcarOrganizador ? { is_organizador: true } : {}),
    };

    const { error } = await supabase.from("profiles").upsert(payload);
    setLoading(false);

    if (error) {
      setErro(error.message);
      return;
    }

    // Rodada 35 — bug relatado: uma conta de Gerente de PAP que completava
    // aqui o cadastro de peregrino pela primeira vez (perfilExistente nulo,
    // ver "Passo 2 de 2" acima) continuava sem o ícone "Minha peregrinação"
    // no menu inferior. Causa: AuthRoleProvider (root layout) só relê
    // is_admin/is_gerente/temPerfilPeregrino no mount ou num evento de auth
    // do Supabase — router.refresh() só atualiza os Server Components desta
    // página, não esse estado do provider, que fica com o valor antigo
    // (temPerfilPeregrino: false) até um reload completo. Como essa conta
    // acabou de ganhar sua primeira linha em profiles — o exato dado que
    // decide qual menu aparece —, recarrega a página inteira para refletir
    // o novo papel de uma vez. Numa edição normal (perfil já existia antes)
    // isso não muda nada relevante para o menu, então mantém o comportamento
    // já existente (sem reload, com a mensagem de sucesso visível).
    // Rodada 56 — ao completar o perfil pela primeira vez (sem linha antes,
    // ou com a linha mínima do cadastro, ainda sem cidade), vai para o
    // painel inicial (/painel), com recarga completa pelo mesmo motivo acima.
    if (voltarPara) {
      window.location.href = voltarPara;
      return;
    }
    if (!perfilExistente) {
      // Recarga completa de propósito (atualiza o menu, ver acima).
      window.location.href = destinoPrimeiroCadastro;
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
            <label className="label">Telefone{!telefoneObrigatorio && " (opcional)"}</label>
            <input
              required={telefoneObrigatorio}
              className="input"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Data de nascimento</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="bday"
              placeholder="DD/MM/AAAA"
              maxLength={10}
              required={obrigatorio}
              className="input"
              value={dataTexto}
              onChange={(e) => {
                const texto = mascaraData(e.target.value);
                setDataTexto(texto);
                setDataNascimento(textoParaIso(texto));
              }}
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
              required={obrigatorio}
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
              required={obrigatorio}
              className="input"
              value={sexo ?? ""}
              onChange={(e) => setSexo(e.target.value)}
            >
              <option value="" disabled={obrigatorio}>
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
        </div>
      </section>

      <section className="card border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
        <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-amber-800 dark:text-amber-500">
          <ShieldCheck size={18} /> Compartilhamento de localização
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Ao aceitar os termos no cadastro, você declara que autoriza o
          compartilhamento da sua localização durante o trajeto, do início ao
          fim de cada peregrinação. Ela serve para{" "}
          <strong>registro dos check-ins</strong>,{" "}
          <strong>registro do local de sinistros informados</strong>, para
          que a equipe de apoio possa avisar sobre condições adversas na rota
          ou para localização em caso de emergência. O compartilhamento é
          ativado automaticamente quando você inicia uma peregrinação, e você
          pode pausá-lo a qualquer momento na página &quot;Minha
          peregrinação&quot;.
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
        {loading ? "Salvando..." : modoPeregrinacao ? "Salvar e continuar para a peregrinação" : "Salvar perfil"}
      </button>
    </form>
  );
}
