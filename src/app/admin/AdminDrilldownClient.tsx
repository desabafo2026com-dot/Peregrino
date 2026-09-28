"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { intervalToDuration, formatDuration } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users,
  Radio,
  Flag as FlagIcon,
  CalendarPlus,
  CalendarDays,
  CalendarClock,
  Award,
  CalendarCheck,
  MapPinned,
  Link2,
  Sun,
  Clock,
  CheckCircle2,
  TriangleAlert,
  Megaphone,
  Search,
  X,
  Check,
  Ban,
  Pencil,
  Save,
  AlertTriangle,
  MessageCircle,
  MailWarning,
  UserPlus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  MEIO_TRANSPORTE_LABELS,
  STATUS_PAP_LABELS,
  SENTIDO_PISTA_LABELS,
  SENTIDO_KM_ABREV,
  STATUS_RISCO_INFORMADO_LABELS,
  CATEGORIA_SINISTRO_LABELS,
  CATEGORIAS_SINISTRO,
  TIPOS_POR_CATEGORIA,
  NIVEL_RISCO_LABELS,
  papAtivoHoje,
  hojeISO,
} from "@/lib/constants";
import type { StatusRiscoInformado, StatusRomariaGrupo } from "@/types/database";

export interface RomariaGrupoLinha {
  id: string;
  nome: string;
  cidadeOrigem: string;
  quantidade: number;
  dataInicio: string;
  previsaoDias: number;
  organizadorNome: string | null;
  exibirOrganizador: boolean;
  organizadorTelefone: string | null;
  exibirTelefone: boolean;
  meioDeslocamento: string;
  meioDeslocamentoOutroDesc: string | null;
  status: StatusRomariaGrupo;
  criadoEm: string;
}

export interface PeregrinoLinha {
  id: string;
  nome: string;
  status: "em_andamento" | "concluida" | "sem_peregrinacao";
  local: string;
  meioTransporte: string | null;
  meioTransporteOutroDesc?: string | null;
  rotaNome: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  checkinsCount: number;
}

export interface PeregrinacaoLinha {
  id: string;
  nome: string;
  local: string;
  status: "planejada" | "em_andamento" | "concluida" | "cancelada";
  rotaNome: string | null;
  meioTransporte: string | null;
  meioTransporteOutroDesc?: string | null;
  dataInicioPrevista: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  checkinsCount: number;
  temCertificado: boolean;
}

export interface PapLinha {
  id: string;
  nome: string;
  cidade: string | null;
  kmReferencia: number | null;
  sentidoPista: string | null;
  statusAprovacao: string;
  ativo: boolean;
  datasFuncionamento: string[];
  gerenteNome: string | null;
  vinculadoPreCadastro: boolean;
  criadoEm: string;
}

export interface RiscoLinha {
  id: string;
  titulo: string;
  tipo: string;
  nivelRisco: number;
  kmReferencia: number | null;
  sentido: string | null;
  rotaNome: string | null;
}

export interface GerenteLinha {
  id: string;
  nome: string;
  telefone: string;
  nomeOrganizacao: string | null;
  status: string;
  papNomes: string[];
  criadoEm: string;
}

// Rodada 41 — uma conta de acesso (auth.users), vinda de cadastros_admin()
// (Migration 39). Inclui quem ainda não confirmou o e-mail, que não aparece
// em nenhuma outra lista do painel por ainda não ter conseguido entrar.
export interface CadastroLinha {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  tipoConta: string | null;
  criadoEm: string;
  confirmado: boolean;
  viaGoogle: boolean;
}

// Link de WhatsApp a partir do telefone digitado no cadastro (formatos
// variados: "(12) 99876-5432", "12998765432", "+55 12 ..."). Sem DDI,
// assume Brasil. Devolve null quando não dá para montar um número válido.
function linkWhatsApp(telefone: string | null, nome: string) {
  if (!telefone) return null;
  let digitos = telefone.replace(/\D/g, "");
  if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`;
  if (digitos.length < 12 || digitos.length > 13) return null;
  const primeiroNome = nome.split(" ")[0];
  const texto = `Olá, ${primeiroNome}! Aqui é da equipe do app O Peregrino. Vi que você começou o cadastro e talvez não tenha conseguido confirmar o e-mail. Posso ajudar? Se preferir, na tela de entrar tem o botão "Continuar com o Google", que dispensa o e-mail de confirmação.`;
  return `https://wa.me/${digitos}?text=${encodeURIComponent(texto)}`;
}

export interface RiscoInformadoLinha {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: string;
  tipo: string;
  nivelRisco: number;
  latitude: number;
  longitude: number;
  kmReferencia: number | null;
  rotaId: string | null;
  rotaNome: string | null;
  nomeInformante: string;
  status: StatusRiscoInformado;
  criadoEm: string;
}

function tempoDecorrido(inicio: string | null, fim: string | null) {
  if (!inicio) return "-";
  const fimData = fim ? new Date(fim) : new Date();
  const duracao = intervalToDuration({ start: new Date(inicio), end: fimData });
  const texto = formatDuration(duracao, { format: ["days", "hours", "minutes"], locale: ptBR, zero: false });
  return texto || "menos de 1 minuto";
}

function meioLabel(meio: string | null, outroDesc?: string | null) {
  if (!meio) return "-";
  if (meio === "outros") return outroDesc || "outros";
  return MEIO_TRANSPORTE_LABELS[meio] ?? meio;
}

// Mesma regra de visibilidade pública calculada na política de RLS da
// migration 11 (ver riscos_informados_select_publicos): "chuva" fica
// pública assim que enviada, as demais só depois de 30min sem revisão —
// e tudo que não foi confirmado some do público depois de 1h. Um relato
// "pendente" que já está nessa janela é visto pelos peregrinos sem que a
// administração tenha feito nada ainda — por isso merece destaque próprio.
function publicadoSemRevisao(r: RiscoInformadoLinha, agora: number) {
  if (r.status !== "pendente") return false;
  const idadeMin = (agora - new Date(r.criadoEm).getTime()) / 60000;
  if (idadeMin >= 60) return false;
  if (r.categoria === "chuva") return true;
  return idadeMin >= 30;
}

const PAGE_SIZE = 50;

type Categoria =
  | { tipo: "peregrino"; titulo: string; dados: PeregrinoLinha[] }
  | { tipo: "peregrinacao"; titulo: string; dados: PeregrinacaoLinha[] }
  | { tipo: "pap"; titulo: string; dados: PapLinha[] }
  | { tipo: "risco"; titulo: string; dados: RiscoLinha[] }
  | { tipo: "gerente"; titulo: string; dados: GerenteLinha[] }
  | { tipo: "cadastro"; titulo: string; dados: CadastroLinha[] }
  // "filtro" em vez de uma lista fixa: assim a lista aberta no modal
  // reflete confirmações/edições feitas sem precisar fechar e reabrir.
  | { tipo: "riscoInformado"; titulo: string; filtro: "todos" | "semRevisao" }
  | { tipo: "romariaGrupo"; titulo: string; filtro: "todas" | "pendentes" | "hoje" };

interface Props {
  peregrinosCadastrados: PeregrinoLinha[];
  peregrinosAtivos: PeregrinoLinha[];
  peregrinacoesIniciadasHoje: PeregrinacaoLinha[];
  peregrinacoesPlanejadas: PeregrinacaoLinha[];
  peregrinacoesPlanejadasHoje: PeregrinacaoLinha[];
  peregrinacoesConcluidasHoje: PeregrinacaoLinha[];
  peregrinacoesConcluidasTotal: PeregrinacaoLinha[];
  peregrinacoesConcluidasSemSucesso: PeregrinacaoLinha[];
  papCadastrados: PapLinha[];
  papAtivos: PapLinha[];
  papPendentes: PapLinha[];
  papConfirmados: PapLinha[];
  papVinculados: PapLinha[];
  riscosCadastrados: RiscoLinha[];
  riscosInformados: RiscoInformadoLinha[];
  gerentesCadastrados: GerenteLinha[];
  romariasGrupo: RomariaGrupoLinha[];
  mensagensNovas: number;
  cadastros: CadastroLinha[] | null;
  cadastrosNovos7d: CadastroLinha[];
}

// flex-1 (em vez de largura fixa) faz cada card crescer para preencher
// junto com os outros da mesma linha — inclusive numa última linha
// incompleta, que já não fica mais nem à esquerda (bug da Rodada 13) nem
// isolada num bloco pequeno centralizado (Rodada 14): agora ocupa a
// largura toda da linha, sem sobrar vão nas laterais. `max-w` evita que um
// card sozinho numa linha vire um retângulo exagerado de ponta a ponta.
function Card({
  icon: Icon,
  label,
  value,
  onClick,
  destaque,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  onClick: () => void;
  destaque?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`card flex min-w-[100px] max-w-[220px] flex-1 flex-col items-center justify-center gap-1 text-center transition hover:border-amber-300 ${
        destaque ? "border-amber-400" : ""
      }`}
    >
      <Icon className="text-amber-700" size={20} />
      <p className="text-2xl font-bold text-amber-800 dark:text-amber-500">{value}</p>
      {/* textAlign inline (Rodada 29): mesmo bug de CSS da Rodada 28 (regra
          global "p { text-align: justify }" sem @layer, que vence qualquer
          utilitário Tailwind) — só ficava visível nos rótulos mais longos
          ("Concluídas com sucesso"/"Concluídas sem sucesso"), que quebram em
          duas linhas dentro do card. */}
      <p className="text-xs text-neutral-500" style={{ textAlign: "center" }}>
        {label}
      </p>
    </button>
  );
}

export default function AdminDrilldownClient({
  peregrinosCadastrados,
  peregrinosAtivos,
  peregrinacoesIniciadasHoje,
  peregrinacoesPlanejadas,
  peregrinacoesPlanejadasHoje,
  peregrinacoesConcluidasHoje,
  peregrinacoesConcluidasTotal,
  peregrinacoesConcluidasSemSucesso,
  papCadastrados,
  papAtivos,
  papPendentes,
  papConfirmados,
  papVinculados,
  riscosCadastrados,
  riscosInformados: riscosInformadosIniciais,
  gerentesCadastrados,
  romariasGrupo: romariasGrupoIniciais,
  mensagensNovas,
  cadastros,
  cadastrosNovos7d,
}: Props) {
  const router = useRouter();
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [riscosInformados, setRiscosInformados] = useState(riscosInformadosIniciais);
  const [romariasGrupo, setRomariasGrupo] = useState(romariasGrupoIniciais);
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [erroLiberarCertificado, setErroLiberarCertificado] = useState<{ id: string; mensagem: string } | null>(
    null
  );
  const [edicao, setEdicao] = useState<{
    id: string;
    titulo: string;
    descricao: string;
    categoria: string;
    tipo: string;
    nivelRisco: string;
  } | null>(null);
  const [agora, setAgora] = useState(() => Date.now());

  // Atualiza a cada minuto para que "publicado sem revisão" reflita a
  // janela de tempo mesmo se o admin deixar a página aberta.
  useEffect(() => {
    const timer = setInterval(() => setAgora(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const pendentesCount = riscosInformados.filter((r) => r.status === "pendente").length;
  const publicadosSemRevisao = useMemo(
    () => riscosInformados.filter((r) => publicadoSemRevisao(r, agora)),
    [riscosInformados, agora]
  );

  const romariasGrupoPendentes = useMemo(
    () => romariasGrupo.filter((r) => r.status === "pendente"),
    [romariasGrupo]
  );
  const romariasGrupoPrevistasHoje = useMemo(
    () => romariasGrupo.filter((r) => r.dataInicio === hojeISO()),
    [romariasGrupo]
  );

  const cadastrosNaoConfirmados = useMemo(
    () => (cadastros ?? []).filter((c) => !c.confirmado && !c.viaGoogle),
    [cadastros]
  );
  const cadastrosGoogle = useMemo(() => (cadastros ?? []).filter((c) => c.viaGoogle), [cadastros]);

  function abrir(cat: Categoria) {
    setCategoria(cat);
    setBusca("");
    setPagina(1);
  }

  function fechar() {
    setCategoria(null);
  }

  const dadosBase = useMemo(() => {
    if (!categoria) return [];
    if (categoria.tipo === "riscoInformado") {
      return categoria.filtro === "semRevisao" ? publicadosSemRevisao : riscosInformados;
    }
    if (categoria.tipo === "romariaGrupo") {
      if (categoria.filtro === "pendentes") return romariasGrupoPendentes;
      if (categoria.filtro === "hoje") return romariasGrupoPrevistasHoje;
      return romariasGrupo;
    }
    return categoria.dados;
  }, [categoria, riscosInformados, publicadosSemRevisao, romariasGrupo, romariasGrupoPendentes, romariasGrupoPrevistasHoje]);

  const dadosFiltrados = useMemo(() => {
    if (!categoria) return [];
    const termo = busca.trim().toLowerCase();
    if (!termo) return dadosBase;
    return (dadosBase as unknown as Array<Record<string, unknown>>).filter((d) => {
      const nome = (d.nome as string) ?? (d.titulo as string) ?? "";
      const local = (d.local as string) ?? (d.cidade as string) ?? (d.cidadeOrigem as string) ?? "";
      const telefone = (d.telefone as string) ?? (d.organizadorTelefone as string) ?? "";
      const email = (d.email as string) ?? "";
      const papNomes = ((d.papNomes as string[]) ?? []).join(" ");
      return (
        nome.toLowerCase().includes(termo) ||
        local.toLowerCase().includes(termo) ||
        telefone.toLowerCase().includes(termo) ||
        email.toLowerCase().includes(termo) ||
        papNomes.toLowerCase().includes(termo)
      );
    });
  }, [categoria, busca, dadosBase]);

  const totalPaginas = Math.max(1, Math.ceil(dadosFiltrados.length / PAGE_SIZE));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const dadosPagina = dadosFiltrados.slice((paginaAtual - 1) * PAGE_SIZE, paginaAtual * PAGE_SIZE);

  async function aprovarRisco(r: RiscoInformadoLinha) {
    setProcessandoId(r.id);
    const supabase = createClient();
    const { data: novoPonto, error: erroInsert } = await supabase
      .from("pontos_risco")
      .insert({
        titulo: r.titulo,
        descricao: r.descricao,
        latitude: r.latitude,
        longitude: r.longitude,
        km_referencia: r.kmReferencia,
        tipo: r.tipo,
        nivel_risco: r.nivelRisco,
        rota_id: r.rotaId,
      })
      .select()
      .single();
    if (!erroInsert && novoPonto) {
      await supabase
        .from("riscos_informados")
        .update({ status: "aprovado", ponto_risco_id: novoPonto.id })
        .eq("id", r.id);
      setRiscosInformados((prev) =>
        prev.map((x) => (x.id === r.id ? { ...x, status: "aprovado" as const } : x))
      );
    }
    setProcessandoId(null);
    router.refresh();
  }

  async function rejeitarRisco(id: string) {
    setProcessandoId(id);
    const supabase = createClient();
    await supabase.from("riscos_informados").update({ status: "rejeitado" }).eq("id", id);
    setRiscosInformados((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status: "rejeitado" as const } : x))
    );
    setProcessandoId(null);
    router.refresh();
  }

  async function aprovarRomariaGrupo(id: string) {
    setProcessandoId(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("romarias_grupo")
      .update({ status: "aprovado", aprovado_em: new Date().toISOString() })
      .eq("id", id);
    if (!error) {
      setRomariasGrupo((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "aprovado" as const } : r))
      );
    }
    setProcessandoId(null);
    router.refresh();
  }

  async function rejeitarRomariaGrupo(id: string) {
    setProcessandoId(id);
    const supabase = createClient();
    const { error } = await supabase.from("romarias_grupo").update({ status: "rejeitado" }).eq("id", id);
    if (!error) {
      setRomariasGrupo((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "rejeitado" as const } : r))
      );
    }
    setProcessandoId(null);
    router.refresh();
  }

  // "Liberar certificado" (Rodada 28, pedido do usuário): para uma
  // peregrinação concluída sem certificado (ex.: faltou o check-in final em
  // Aparecida) — a administração usa isto só mediante alguma reclamação do
  // peregrino, depois de avaliar a lista "Concluídas sem sucesso". A função
  // no banco (liberar_certificado_manualmente) reconstrói os mesmos dados
  // que o próprio app calcularia ao encerrar normalmente.
  async function liberarCertificado(id: string) {
    setProcessandoId(id);
    setErroLiberarCertificado(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("liberar_certificado_manualmente", {
      p_peregrinacao_id: id,
    });
    setProcessandoId(null);
    if (error) {
      setErroLiberarCertificado({ id, mensagem: error.message });
      return;
    }
    setErroLiberarCertificado(null);
    // Remove da lista aberta no momento (se for a de "concluídas sem
    // sucesso") — o item já tem certificado agora, não pertence mais aqui.
    setCategoria((atual) =>
      atual && atual.tipo === "peregrinacao"
        ? { ...atual, dados: atual.dados.filter((p) => p.id !== id) }
        : atual
    );
    router.refresh();
  }

  function iniciarEdicao(r: RiscoInformadoLinha) {
    setEdicao({
      id: r.id,
      titulo: r.titulo,
      descricao: r.descricao ?? "",
      categoria: r.categoria,
      tipo: r.tipo,
      nivelRisco: String(r.nivelRisco),
    });
  }

  function cancelarEdicao() {
    setEdicao(null);
  }

  async function salvarEdicao() {
    if (!edicao) return;
    setProcessandoId(edicao.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("riscos_informados")
      .update({
        titulo: edicao.titulo,
        descricao: edicao.descricao || null,
        categoria: edicao.categoria,
        tipo: edicao.tipo,
        nivel_risco: Number(edicao.nivelRisco),
      })
      .eq("id", edicao.id);
    if (!error) {
      setRiscosInformados((prev) =>
        prev.map((x) =>
          x.id === edicao.id
            ? {
                ...x,
                titulo: edicao.titulo,
                descricao: edicao.descricao || null,
                categoria: edicao.categoria,
                tipo: edicao.tipo,
                nivelRisco: Number(edicao.nivelRisco),
              }
            : x
        )
      );
      setEdicao(null);
    }
    setProcessandoId(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {mensagensNovas > 0 && (
        <Link
          href="/admin/mensagens"
          className="card flex items-center justify-between gap-3 border-amber-400 bg-amber-50 dark:bg-amber-950/30"
        >
          <span className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-500">
            <MessageCircle size={18} />
            {mensagensNovas} {mensagensNovas > 1 ? "novas mensagens" : "nova mensagem"} em
            &quot;Falar com o desenvolvedor&quot;
          </span>
          <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Ver →</span>
        </Link>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold text-amber-800 dark:text-amber-500">Peregrinos</h2>
        <div className="flex flex-wrap gap-2">
          <Card
            icon={Users}
            label="Cadastrados"
            value={peregrinosCadastrados.length}
            onClick={() => abrir({ tipo: "peregrino", titulo: "Peregrinos cadastrados", dados: peregrinosCadastrados })}
          />
          <Card
            icon={Radio}
            label="Ativos"
            value={peregrinosAtivos.length}
            onClick={() => abrir({ tipo: "peregrino", titulo: "Peregrinos ativos agora", dados: peregrinosAtivos })}
          />
        </div>
      </section>

      {/* Rodada 41 — para medir se o "Continuar com o Google" e a prévia do
          link estão ajudando quem tinha receio de se cadastrar. */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-amber-800 dark:text-amber-500">Cadastros</h2>
        {cadastros === null ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            Para ver estes contadores, rode a <strong>Migration 39</strong> (arquivo
            peregrino_migration_39.sql) no SQL Editor do Supabase.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Card
                icon={MailWarning}
                label="Não confirmaram o e-mail"
                value={cadastrosNaoConfirmados.length}
                destaque={cadastrosNaoConfirmados.length > 0}
                onClick={() =>
                  abrir({
                    tipo: "cadastro",
                    titulo: "Começaram o cadastro por e-mail e não confirmaram",
                    dados: cadastrosNaoConfirmados,
                  })
                }
              />
              <Card
                icon={LogoGoogleMono}
                label="Entraram com Google"
                value={cadastrosGoogle.length}
                onClick={() => abrir({ tipo: "cadastro", titulo: "Contas que entram com o Google", dados: cadastrosGoogle })}
              />
              <Card
                icon={UserPlus}
                label="Novos (7 dias)"
                value={cadastrosNovos7d.length}
                onClick={() =>
                  abrir({ tipo: "cadastro", titulo: "Contas criadas nos últimos 7 dias", dados: cadastrosNovos7d })
                }
              />
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              Quem não confirmou o e-mail ainda não consegue entrar no app. Na lista, dá para
              chamar a pessoa no WhatsApp e sugerir o &quot;Continuar com o Google&quot;.
            </p>
          </>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-amber-800 dark:text-amber-500">Peregrinações</h2>
        <div className="flex flex-wrap gap-2">
          <Card
            icon={CalendarDays}
            label="Planejadas"
            value={peregrinacoesPlanejadas.length}
            onClick={() =>
              abrir({ tipo: "peregrinacao", titulo: "Peregrinações planejadas", dados: peregrinacoesPlanejadas })
            }
          />
          <Card
            icon={CalendarClock}
            label="Planejadas hoje"
            value={peregrinacoesPlanejadasHoje.length}
            onClick={() =>
              abrir({ tipo: "peregrinacao", titulo: "Peregrinações planejadas para hoje", dados: peregrinacoesPlanejadasHoje })
            }
          />
          <Card
            icon={CalendarPlus}
            label="Iniciadas hoje"
            value={peregrinacoesIniciadasHoje.length}
            onClick={() =>
              abrir({ tipo: "peregrinacao", titulo: "Peregrinações iniciadas hoje", dados: peregrinacoesIniciadasHoje })
            }
          />
          <Card
            icon={CalendarCheck}
            label="Concluídas hoje"
            value={peregrinacoesConcluidasHoje.length}
            onClick={() =>
              abrir({ tipo: "peregrinacao", titulo: "Peregrinações concluídas hoje", dados: peregrinacoesConcluidasHoje })
            }
          />
          <Card
            icon={Award}
            label="Concluídas com sucesso"
            value={peregrinacoesConcluidasTotal.length}
            onClick={() =>
              abrir({
                tipo: "peregrinacao",
                titulo: "Peregrinações concluídas com sucesso (com certificado)",
                dados: peregrinacoesConcluidasTotal,
              })
            }
          />
          <Card
            icon={AlertTriangle}
            label="Concluídas sem sucesso"
            value={peregrinacoesConcluidasSemSucesso.length}
            onClick={() =>
              abrir({
                tipo: "peregrinacao",
                titulo: "Peregrinações concluídas sem sucesso (sem certificado)",
                dados: peregrinacoesConcluidasSemSucesso,
              })
            }
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-amber-800 dark:text-amber-500">PAP</h2>
        <div className="flex flex-wrap gap-2">
          <Card
            icon={MapPinned}
            label="Cadastrados"
            value={papCadastrados.length}
            onClick={() => abrir({ tipo: "pap", titulo: "PAP cadastrados", dados: papCadastrados })}
          />
          <Card
            icon={Sun}
            label="Ativos"
            value={papAtivos.length}
            onClick={() => abrir({ tipo: "pap", titulo: "PAP ativos agora", dados: papAtivos })}
          />
          <Card
            icon={Clock}
            label="Pendentes"
            value={papPendentes.length}
            onClick={() => abrir({ tipo: "pap", titulo: "PAP pendentes de aprovação", dados: papPendentes })}
          />
          {/* Rodada 39 — novo card: mesmo critério que pinta o marcador de
              verde no mapa público (aprovado pela administração, com ou sem
              gerente_id, com ou sem vínculo ao pré-cadastro). Adicionado
              porque "Vinculados" abaixo, apesar do nome, só conta PAP que
              vieram de uma reivindicação da lista pública — um PAP
              "vinculado a um gerente" e aprovado (o que a legenda do mapa
              chama de "vinculado") podia aparecer verde no mapa e mesmo
              assim mostrar 0 aqui. */}
          <Card
            icon={CheckCircle2}
            label="Confirmados"
            value={papConfirmados.length}
            onClick={() =>
              abrir({
                tipo: "pap",
                titulo: "PAP confirmados (aprovados — mesmo critério do marcador verde no mapa)",
                dados: papConfirmados,
              })
            }
          />
          <Card
            icon={Link2}
            label="Vinc. lista pública"
            value={papVinculados.length}
            onClick={() =>
              abrir({ tipo: "pap", titulo: "PAP vinculados da lista pública pré-cadastrada", dados: papVinculados })
            }
          />
          <Card
            icon={Users}
            label="Gerentes de PAP"
            value={gerentesCadastrados.length}
            onClick={() => abrir({ tipo: "gerente", titulo: "Gerentes de PAP cadastrados", dados: gerentesCadastrados })}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-amber-800 dark:text-amber-500">Romarias de Peregrinos</h2>
        <div className="flex flex-wrap gap-2">
          <Card
            icon={Users}
            label="Cadastradas"
            value={romariasGrupo.length}
            onClick={() => abrir({ tipo: "romariaGrupo", titulo: "Romarias de Peregrinos cadastradas", filtro: "todas" })}
          />
          <Card
            icon={Clock}
            label="Pendentes"
            value={romariasGrupoPendentes.length}
            destaque={romariasGrupoPendentes.length > 0}
            onClick={() =>
              abrir({ tipo: "romariaGrupo", titulo: "Romarias de Peregrinos pendentes de aprovação", filtro: "pendentes" })
            }
          />
          <Card
            icon={CalendarClock}
            label="Previstas hoje"
            value={romariasGrupoPrevistasHoje.length}
            onClick={() =>
              abrir({ tipo: "romariaGrupo", titulo: "Romarias de Peregrinos com início hoje", filtro: "hoje" })
            }
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-amber-800 dark:text-amber-500">Riscos</h2>
        <div className="flex flex-wrap gap-2">
          <Card
            icon={FlagIcon}
            label="Cadastrados"
            value={riscosCadastrados.length}
            onClick={() => abrir({ tipo: "risco", titulo: "Locais de risco cadastrados", dados: riscosCadastrados })}
          />
          <Card
            icon={Megaphone}
            label="Aguardando revisão"
            value={pendentesCount}
            destaque={pendentesCount > 0}
            onClick={() =>
              abrir({ tipo: "riscoInformado", titulo: "Riscos informados por peregrinos", filtro: "todos" })
            }
          />
          <Card
            icon={AlertTriangle}
            label="Publicados sem revisão"
            value={publicadosSemRevisao.length}
            destaque={publicadosSemRevisao.length > 0}
            onClick={() =>
              abrir({
                tipo: "riscoInformado",
                titulo: "Já visíveis a outros peregrinos, sem revisão da administração",
                filtro: "semRevisao",
              })
            }
          />
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          &quot;Publicados sem revisão&quot; já aparecem no mapa e no trajeto para os
          demais peregrinos (chuva na hora; os demais, depois de 30 minutos) mesmo
          sem confirmação — vale priorizar a revisão desses.
        </p>
      </section>

      {categoria && (
        // z-50 (Rodada 34): o botão de emergência é fixed/z-40 e é renderizado
        // depois do conteúdo da página (ver layout.tsx), então com o mesmo
        // z-40 ele ficava por cima deste modal em telas pequenas, cobrindo o
        // botão de fechar (X) e impedindo fechar o modal. z-50 é o mesmo
        // usado pelo modal do próprio botão de emergência — convenção já
        // existente no app para "sempre por cima de tudo".
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-neutral-800">
              <h3 className="font-bold text-amber-800 dark:text-amber-500">{categoria.titulo}</h3>
              <button onClick={fechar} aria-label="Fechar">
                <X size={20} />
              </button>
            </div>
            <div className="border-b border-neutral-200 p-3 dark:border-neutral-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                <input
                  autoFocus
                  className="input pl-9"
                  placeholder="Buscar por nome ou local..."
                  value={busca}
                  onChange={(e) => {
                    setBusca(e.target.value);
                    setPagina(1);
                  }}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-2">
                {categoria.tipo === "peregrino" &&
                  (dadosPagina as PeregrinoLinha[]).map((p) => (
                    <div key={p.id} className="card">
                      <p className="flex items-center gap-2 font-semibold">
                        {p.status === "em_andamento" && <Radio size={16} className="text-green-600" />}
                        {p.status === "concluida" && <Award size={16} className="text-amber-700" />}
                        {p.nome}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Local: {p.local}
                        {p.rotaNome ? ` — ${p.rotaNome}` : ""}
                        {p.meioTransporte ? ` — ${meioLabel(p.meioTransporte, p.meioTransporteOutroDesc)}` : ""}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Início: {p.dataInicio ? new Date(p.dataInicio).toLocaleString("pt-BR") : "-"}
                        {" — "}Tempo: {p.status === "sem_peregrinacao" ? "-" : tempoDecorrido(p.dataInicio, p.dataFim)}
                        {" — "}
                        {p.checkinsCount} check-in(s)
                      </p>
                    </div>
                  ))}

                {categoria.tipo === "peregrinacao" &&
                  (dadosPagina as PeregrinacaoLinha[]).map((p) => (
                    <div key={p.id} className="card">
                      <p className="flex items-center gap-2 font-semibold">
                        {p.temCertificado && <Award size={16} className="text-amber-700" />}
                        {p.nome}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Local: {p.local}
                        {p.rotaNome ? ` — ${p.rotaNome}` : ""}
                        {p.meioTransporte ? ` — ${meioLabel(p.meioTransporte, p.meioTransporteOutroDesc)}` : ""}
                      </p>
                      {p.status === "planejada" ? (
                        <p className="text-xs text-neutral-500">
                          Data prevista de início:{" "}
                          {p.dataInicioPrevista
                            ? new Date(p.dataInicioPrevista).toLocaleDateString("pt-BR")
                            : "não informada"}
                        </p>
                      ) : (
                        <p className="text-xs text-neutral-500">
                          Início: {p.dataInicio ? new Date(p.dataInicio).toLocaleString("pt-BR") : "-"}
                          {" — "}Fim: {p.dataFim ? new Date(p.dataFim).toLocaleString("pt-BR") : "-"}
                          {" — "}
                          {p.checkinsCount} check-in(s)
                          {p.temCertificado ? " — com certificado" : ""}
                        </p>
                      )}
                      {p.status === "concluida" && !p.temCertificado && (
                        <div className="mt-2 flex flex-col items-start gap-1">
                          <button
                            type="button"
                            disabled={processandoId === p.id}
                            onClick={() => liberarCertificado(p.id)}
                            className="flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-200 disabled:opacity-60 dark:bg-amber-950/40 dark:text-amber-400"
                          >
                            <Award size={13} />
                            {processandoId === p.id ? "Liberando..." : "Liberar certificado"}
                          </button>
                          {erroLiberarCertificado?.id === p.id && (
                            <p className="text-xs text-red-600">{erroLiberarCertificado.mensagem}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                {categoria.tipo === "pap" &&
                  (dadosPagina as PapLinha[]).map((p) => (
                    <div key={p.id} className="card">
                      <p className="flex items-center gap-2 font-semibold">
                        <MapPinned size={16} className="text-amber-700" />
                        {p.nome}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {p.cidade ?? "cidade não informada"}
                        {p.sentidoPista ? ` — ${SENTIDO_PISTA_LABELS[p.sentidoPista] ?? p.sentidoPista}` : ""}
                        {p.kmReferencia != null ? ` — km ${p.kmReferencia}` : ""}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {p.statusAprovacao === "pre_cadastro_sem_gerente"
                          ? `${STATUS_PAP_LABELS[p.statusAprovacao]} — ${
                              papAtivoHoje(p.datasFuncionamento) ? "ativo hoje" : "inativo hoje"
                            }`
                          : `${p.gerenteNome ? `Gerente: ${p.gerenteNome}` : "Cadastrado pela administração"} — ${
                              STATUS_PAP_LABELS[p.statusAprovacao] ?? p.statusAprovacao
                            } — ${p.ativo && papAtivoHoje(p.datasFuncionamento) ? "ativo hoje" : "inativo hoje"}`}
                      </p>
                    </div>
                  ))}

                {categoria.tipo === "gerente" &&
                  (dadosPagina as GerenteLinha[]).map((g) => (
                    <div key={g.id} className="card">
                      <p className="flex items-center gap-2 font-semibold">
                        <Users size={16} className="text-amber-700" />
                        {g.nome}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Tel: {g.telefone}
                        {g.nomeOrganizacao ? ` — ${g.nomeOrganizacao}` : ""}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {g.papNomes.length > 0 ? `PAP: ${g.papNomes.join(", ")}` : "Ainda sem PAP cadastrado"}
                      </p>
                    </div>
                  ))}

                {categoria.tipo === "cadastro" &&
                  (dadosPagina as CadastroLinha[]).map((c) => {
                    const whats = !c.confirmado && !c.viaGoogle ? linkWhatsApp(c.telefone, c.nome) : null;
                    return (
                      <div key={c.id} className="card">
                        <p className="flex flex-wrap items-center gap-2 font-semibold">
                          {c.nome}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              c.viaGoogle
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                : c.confirmado
                                  ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                            }`}
                          >
                            {c.viaGoogle ? "Google" : c.confirmado ? "E-mail confirmado" : "E-mail não confirmado"}
                          </span>
                        </p>
                        <p className="text-xs text-neutral-500">
                          {c.email}
                          {c.telefone ? ` — Tel: ${c.telefone}` : ""}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {c.tipoConta === "gerente_pap"
                            ? "Gerente de PAP"
                            : c.tipoConta === "peregrino"
                              ? "Peregrino"
                              : "Tipo de conta não escolhido"}{" "}
                          — criada em {new Date(c.criadoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                        </p>
                        {whats && (
                          <a
                            href={whats}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 dark:text-green-400"
                          >
                            <MessageCircle size={14} /> Chamar no WhatsApp
                          </a>
                        )}
                      </div>
                    );
                  })}

                {categoria.tipo === "romariaGrupo" &&
                  (dadosPagina as RomariaGrupoLinha[]).map((r) => {
                    const fim = new Date(r.dataInicio + "T00:00:00");
                    fim.setDate(fim.getDate() + r.previsaoDias - 1);
                    return (
                      <div key={r.id} className="card">
                        <p className="flex items-center gap-2 font-semibold">
                          <Users size={16} className="text-amber-700" />
                          {r.nome}
                        </p>
                        <p className="text-xs text-neutral-500">
                          Origem: {r.cidadeOrigem} — {r.quantidade} pessoa(s)
                        </p>
                        <p className="text-xs text-neutral-500">
                          {new Date(r.dataInicio + "T00:00:00").toLocaleDateString("pt-BR")} até{" "}
                          {fim.toLocaleDateString("pt-BR")} ({r.previsaoDias} dia(s) previsto(s))
                        </p>
                        <p className="text-xs text-neutral-500">
                          Deslocamento: {meioLabel(r.meioDeslocamento, r.meioDeslocamentoOutroDesc)}
                        </p>
                        {(r.organizadorNome || r.organizadorTelefone) && (
                          <p className="text-xs text-neutral-500">
                            {r.organizadorNome ? `Organizador: ${r.organizadorNome}` : ""}
                            {r.organizadorNome && r.organizadorTelefone ? " — " : ""}
                            {r.organizadorTelefone ? `Tel: ${r.organizadorTelefone}` : ""}
                            {!r.exibirOrganizador && !r.exibirTelefone ? " (não autorizado para divulgação pública)" : ""}
                          </p>
                        )}
                        <p className="mt-1 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-medium text-neutral-500">
                            {r.status === "pendente" ? "Pendente" : r.status === "aprovado" ? "Aprovada" : "Rejeitada"}
                          </span>
                          {r.status === "pendente" && (
                            <span className="flex gap-2">
                              <button
                                disabled={processandoId === r.id}
                                onClick={() => aprovarRomariaGrupo(r.id)}
                                className="flex items-center gap-1 rounded-lg bg-green-100 px-2 py-1 text-xs font-semibold text-green-800 hover:bg-green-200 dark:bg-green-950/40 dark:text-green-300"
                              >
                                <Check size={14} /> Aprovar
                              </button>
                              <button
                                disabled={processandoId === r.id}
                                onClick={() => rejeitarRomariaGrupo(r.id)}
                                className="flex items-center gap-1 rounded-lg bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-400"
                              >
                                <Ban size={14} /> Rejeitar
                              </button>
                            </span>
                          )}
                        </p>
                      </div>
                    );
                  })}

                {categoria.tipo === "risco" &&
                  (dadosPagina as RiscoLinha[]).map((r) => (
                    <div key={r.id} className="card">
                      <p className="flex items-center gap-2 font-semibold">
                        <TriangleAlert size={16} className={r.nivelRisco >= 4 ? "text-red-600" : "text-yellow-500"} />
                        {r.titulo}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Tipo: {r.tipo} — Nível de risco: {NIVEL_RISCO_LABELS[r.nivelRisco] ?? r.nivelRisco}
                        {r.kmReferencia != null
                          ? ` — km ${r.kmReferencia}${r.sentido ? ` ${SENTIDO_KM_ABREV[r.sentido] ?? ""}` : ""}`
                          : ""}
                        {r.rotaNome ? ` — ${r.rotaNome}` : ""}
                      </p>
                    </div>
                  ))}

                {categoria.tipo === "riscoInformado" &&
                  (dadosPagina as RiscoInformadoLinha[]).map((r) =>
                    edicao?.id === r.id ? (
                      <div key={r.id} className="card border-amber-300 dark:border-amber-800">
                        <p className="mb-3 text-sm font-semibold text-amber-800 dark:text-amber-500">
                          Editando relato
                        </p>
                        <div className="flex flex-col gap-3">
                          <div>
                            <label className="label">Título</label>
                            <input
                              className="input"
                              value={edicao.titulo}
                              onChange={(e) => setEdicao({ ...edicao, titulo: e.target.value })}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="label">Categoria</label>
                              <select
                                className="input"
                                value={edicao.categoria}
                                onChange={(e) => {
                                  const novaCategoria = e.target.value;
                                  setEdicao({
                                    ...edicao,
                                    categoria: novaCategoria,
                                    tipo: TIPOS_POR_CATEGORIA[novaCategoria]?.[0]?.value ?? edicao.tipo,
                                  });
                                }}
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
                              <select
                                className="input"
                                value={edicao.tipo}
                                onChange={(e) => setEdicao({ ...edicao, tipo: e.target.value })}
                              >
                                {(TIPOS_POR_CATEGORIA[edicao.categoria] ?? []).map((t) => (
                                  <option key={t.value} value={t.value}>
                                    {t.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="label">Nível de risco</label>
                            <select
                              className="input"
                              value={edicao.nivelRisco}
                              onChange={(e) => setEdicao({ ...edicao, nivelRisco: e.target.value })}
                            >
                              {Object.entries(NIVEL_RISCO_LABELS).map(([v, label]) => (
                                <option key={v} value={v}>
                                  {v} — {label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="label">Descrição</label>
                            <textarea
                              className="input"
                              rows={2}
                              value={edicao.descricao}
                              onChange={(e) => setEdicao({ ...edicao, descricao: e.target.value })}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button onClick={cancelarEdicao} className="btn-secondary text-xs">
                              Cancelar
                            </button>
                            <button
                              disabled={processandoId === r.id}
                              onClick={salvarEdicao}
                              className="flex items-center gap-1 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
                            >
                              <Save size={14} /> Salvar
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div key={r.id} className="card">
                        <p className="flex items-center gap-2 font-semibold">
                          <Megaphone size={16} className="text-amber-700" />
                          {r.titulo}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {CATEGORIA_SINISTRO_LABELS[r.categoria] ?? r.categoria} — {r.tipo}
                          {" — "}Informado por {r.nomeInformante} — {new Date(r.criadoEm).toLocaleString("pt-BR")}
                          {r.rotaNome ? ` — ${r.rotaNome}` : ""}
                          {r.kmReferencia != null ? ` — km ${r.kmReferencia}` : ""}
                        </p>
                        {r.descricao && <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">{r.descricao}</p>}
                        {r.latitude != null && r.longitude != null && (
                          <p className="mt-1 text-xs text-neutral-500">
                            Localização: {r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}
                            {" — "}
                            <a
                              href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-amber-700 hover:underline"
                            >
                              ver no mapa
                            </a>
                          </p>
                        )}
                        <p className="mt-1 flex flex-wrap items-center justify-between gap-2">
                          <span className="flex flex-wrap items-center gap-2 text-xs font-medium text-neutral-500">
                            {STATUS_RISCO_INFORMADO_LABELS[r.status] ?? r.status}
                            {publicadoSemRevisao(r, agora) && (
                              <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300">
                                <AlertTriangle size={12} /> publicado sem revisão
                              </span>
                            )}
                          </span>
                          {r.status === "pendente" && (
                            <span className="flex gap-2">
                              <button
                                disabled={processandoId === r.id}
                                onClick={() => aprovarRisco(r)}
                                className="flex items-center gap-1 rounded-lg bg-green-100 px-2 py-1 text-xs font-semibold text-green-800 hover:bg-green-200 dark:bg-green-950/40 dark:text-green-300"
                              >
                                <Check size={14} /> Confirmar
                              </button>
                              <button
                                disabled={processandoId === r.id}
                                onClick={() => iniciarEdicao(r)}
                                className="flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                              >
                                <Pencil size={14} /> Editar
                              </button>
                              <button
                                disabled={processandoId === r.id}
                                onClick={() => rejeitarRisco(r.id)}
                                className="flex items-center gap-1 rounded-lg bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-400"
                              >
                                <Ban size={14} /> Rejeitar
                              </button>
                            </span>
                          )}
                        </p>
                      </div>
                    )
                  )}

                {dadosPagina.length === 0 && (
                  <p className="text-sm text-neutral-400">Nenhum registro encontrado.</p>
                )}
              </div>
            </div>
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between border-t border-neutral-200 p-3 text-sm dark:border-neutral-800">
                <button
                  disabled={paginaAtual <= 1}
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  className="btn-secondary disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-neutral-500">
                  Página {paginaAtual} de {totalPaginas} — {dadosFiltrados.length} registro(s)
                </span>
                <button
                  disabled={paginaAtual >= totalPaginas}
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  className="btn-secondary disabled:opacity-40"
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Ícone "G" simples (de uma cor só, herda a cor do card) para o contador de
// contas que entram com o Google — o lucide-react não traz logos de marca.
function LogoGoogleMono({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.64 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.96S8.78 6.26 12 6.26c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.68 3.7 14.55 2.8 12 2.8 6.92 2.8 2.8 6.92 2.8 12s4.12 9.2 9.2 9.2c5.31 0 8.83-3.73 8.83-8.99 0-.6-.07-1.06-.15-1.51z"
      />
    </svg>
  );
}
