"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { Printer, Download, Check, ShieldCheck, Phone, HeartPulse, Users, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CrachaPeregrino, DadosCracha, Profile } from "@/types/database";

const TIPOS_SANGUINEOS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const PADRAO: DadosCracha = {
  nome_exibicao: "completo",
  mostrar: { foto: true, cidade: true, telefone: false, grupo: false, sangue: false, saude: false, emergencia: true },
};

function juntar(dados: DadosCracha | null | undefined): DadosCracha {
  return { ...PADRAO, ...(dados ?? {}), mostrar: { ...PADRAO.mostrar, ...(dados?.mostrar ?? {}) } };
}

export default function CredencialEditor({ cracha, perfil }: { cracha: CrachaPeregrino; perfil: Profile }) {
  const [dados, setDados] = useState<DadosCracha>(() => juntar(cracha.dados));
  const [qr, setQr] = useState<string | null>(null);
  const [status, setStatus] = useState<"salvo" | "salvando" | "erro" | null>(null);
  const [gerando, setGerando] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const crachaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    QRCode.toDataURL(`${window.location.origin}/credencial/${cracha.codigo}`, {
      width: 300,
      margin: 0,
      color: { dark: "#3b2410" },
    }).then(setQr);
  }, [cracha.codigo]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  function atualizar(novo: DadosCracha) {
    setDados(novo);
    setStatus("salvando");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const supabase = createClient();
      const { error } = await supabase.rpc("salvar_cracha", { p_dados: novo });
      setStatus(error ? "erro" : "salvo");
    }, 700);
  }

  function marcar(campo: keyof NonNullable<DadosCracha["mostrar"]>, valor: boolean) {
    atualizar({ ...dados, mostrar: { ...dados.mostrar, [campo]: valor } });
  }

  function texto(campo: "grupo" | "sangue" | "saude" | "emergencia_nome" | "emergencia_telefone", valor: string) {
    atualizar({ ...dados, [campo]: valor });
  }

  async function baixar() {
    if (!crachaRef.current) return;
    setGerando(true);
    try {
      const { gerarPngDoElemento } = await import("@/lib/gerar-imagem");
      const url = await gerarPngDoElemento(crachaRef.current, {
        larguraFinal: Math.round(crachaRef.current.getBoundingClientRect().width * 3),
      });
      const link = document.createElement("a");
      link.download = `credencial-${cracha.codigo}.png`;
      link.href = url;
      link.click();
    } finally {
      setGerando(false);
    }
  }

  const m = dados.mostrar ?? {};
  const nome =
    dados.nome_exibicao === "primeiro" ? perfil.nome_completo.trim().split(/\s+/)[0] : perfil.nome_completo.trim();
  const cidade = [perfil.cidade, perfil.uf].filter(Boolean).join(" - ");
  const temFoto = !!perfil.avatar_url;

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      {/* Na impressão só o crachá aparece, no tamanho real (9 x 13 cm). */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #credencial-impressao, #credencial-impressao * { visibility: visible !important; }
          html, body { background: #fff !important; }
          #credencial-impressao { position: fixed; left: 1cm; top: 1cm; width: 9cm !important; box-shadow: none !important; }
          #credencial-impressao, #credencial-impressao * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>

      <div className="flex flex-col items-center gap-3 md:sticky md:top-20">
        <div
          id="credencial-impressao"
          ref={crachaRef}
          className="relative flex w-[300px] flex-col overflow-hidden rounded-2xl bg-[#fbf6ea] text-[#3b2410] shadow-xl"
          style={{ aspectRatio: "90 / 130", containerType: "inline-size", border: "1px dashed #b98d52" }}
        >
          {/* furo para o cordão */}
          <div className="absolute top-[2%] left-1/2 z-10 h-[2.4%] w-[18%] -translate-x-1/2 rounded-full bg-white ring-1 ring-[#b98d52]" />
          <div
            className="flex shrink-0 flex-col items-center px-[6%] pt-[7.5%] pb-[3%] text-white"
            style={{ background: "linear-gradient(180deg, #8f3f19 0%, #6b2d10 100%)" }}
          >
            <div className="flex items-center gap-[3cqw] whitespace-nowrap">
              <Image src="/icons/logo-emblema.png" alt="" width={48} height={48} style={{ width: "9cqw", height: "auto" }} className="rounded-md" />
              <span className="font-bold tracking-[0.16em]" style={{ fontSize: "4.4cqw" }}>
                O PEREGRINO
              </span>
            </div>
            <span className="mt-[1cqw] font-semibold tracking-[0.2em] whitespace-nowrap text-amber-200" style={{ fontSize: "3cqw" }}>
              CREDENCIAL DO PEREGRINO
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-[4cqw] px-[6%] pt-[4cqw]">
            {m.foto && temFoto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={perfil.avatar_url!}
                alt=""
                crossOrigin="anonymous"
                className="shrink-0 rounded-full object-cover ring-2 ring-[#b98d52]"
                style={{ width: "24cqw", height: "24cqw" }}
              />
            )}
            <div className={`min-w-0 flex-1 ${m.foto && temFoto ? "" : "text-center"}`}>
              <p
                className="font-extrabold leading-tight"
                style={{ fontSize: nome.length > 20 ? "5.6cqw" : "6.8cqw", textAlign: m.foto && temFoto ? "left" : "center" }}
              >
                {nome}
              </p>
              {m.cidade && cidade && (
                <p className="mt-[1cqw] font-medium" style={{ fontSize: "3.6cqw", textAlign: m.foto && temFoto ? "left" : "center" }}>
                  <MapPin size={12} className="mr-1 inline" style={{ width: "3.6cqw", height: "3.6cqw" }} />
                  {cidade}
                </p>
              )}
              {m.grupo && dados.grupo && (
                <p className="mt-[0.5cqw]" style={{ fontSize: "3.4cqw", textAlign: m.foto && temFoto ? "left" : "center" }}>
                  <Users size={12} className="mr-1 inline" style={{ width: "3.6cqw", height: "3.6cqw" }} />
                  {dados.grupo}
                </p>
              )}
            </div>
          </div>

          {(m.telefone || m.sangue || m.saude || m.emergencia) && (
            <div
              className="mx-[6%] mt-[3.5cqw] shrink-0 rounded-xl border border-red-300 bg-red-50 px-[4%] py-[2.2cqw] leading-snug"
              style={{ fontSize: "3.3cqw" }}
            >
              <p className="mb-[0.8cqw] font-bold text-red-700" style={{ fontSize: "3cqw", letterSpacing: "0.08em", textAlign: "left" }}>
                <HeartPulse size={12} className="mr-1 inline" style={{ width: "3.4cqw", height: "3.4cqw" }} />
                EM CASO DE EMERGÊNCIA
              </p>
              {m.emergencia && (dados.emergencia_nome || dados.emergencia_telefone) && (
                <p style={{ textAlign: "left" }}>
                  <span className="font-bold">Avisar:</span> {dados.emergencia_nome} {dados.emergencia_telefone}
                </p>
              )}
              {m.telefone && perfil.telefone && (
                <p style={{ textAlign: "left" }}>
                  <span className="font-bold">Meu telefone:</span> {perfil.telefone}
                </p>
              )}
              {m.sangue && dados.sangue && (
                <p style={{ textAlign: "left" }}>
                  <span className="font-bold">Tipo sanguíneo:</span> {dados.sangue}
                </p>
              )}
              {m.saude && dados.saude && (
                <p style={{ textAlign: "left" }}>
                  <span className="font-bold">Saúde:</span> {dados.saude}
                </p>
              )}
            </div>
          )}

          <div className="mt-auto flex shrink-0 items-center gap-[4cqw] px-[6%] pt-[3cqw] pb-[3cqw]">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="QR code da credencial" style={{ width: "22cqw", height: "22cqw" }} />
            ) : (
              <div style={{ width: "22cqw", height: "22cqw" }} />
            )}
            <div className="min-w-0">
              <p className="uppercase text-[#8f3f19]" style={{ fontSize: "2.7cqw", letterSpacing: "0.1em", textAlign: "left" }}>
                Código do peregrino
              </p>
              <p className="font-mono font-extrabold" style={{ fontSize: "6.2cqw", textAlign: "left" }}>
                {cracha.codigo}
              </p>
              <p className="text-[#6b4a2b]" style={{ fontSize: "2.7cqw", textAlign: "left" }}>
                <ShieldCheck size={10} className="mr-1 inline" style={{ width: "3cqw", height: "3cqw" }} />
                Leia o QR code para confirmar
              </p>
            </div>
          </div>
          <div
            className="flex shrink-0 items-center justify-center gap-1 bg-[#3b2410] py-[1.6cqw] font-semibold whitespace-nowrap text-amber-100"
            style={{ fontSize: "2.8cqw" }}
          >
            <Phone size={10} style={{ width: "3cqw", height: "3cqw" }} /> PM 190 · PRF 191 · SAMU 192 · Bombeiros 193
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => window.print()} className="btn-primary flex items-center gap-2">
            <Printer size={16} /> Imprimir
          </button>
          <button type="button" onClick={baixar} disabled={gerando} className="btn-secondary flex items-center gap-2">
            <Download size={16} /> {gerando ? "Gerando..." : "Baixar imagem"}
          </button>
        </div>
        <p className="max-w-[300px] text-center text-xs text-neutral-500">
          Tamanho do crachá impresso: 9 x 13 cm. Recorte na linha tracejada e, se puder, plastifique.
        </p>
      </div>

      <div className="card flex flex-1 flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-amber-800 dark:text-amber-500">O que aparece no crachá</h2>
          <span className="text-xs text-neutral-500">
            {status === "salvando" && "Salvando..."}
            {status === "salvo" && (
              <span className="flex items-center gap-1 text-green-700">
                <Check size={12} /> Salvo
              </span>
            )}
            {status === "erro" && <span className="text-red-600">Não foi possível salvar</span>}
          </span>
        </div>
        <p className="text-xs text-neutral-500" style={{ textAlign: "left" }}>
          Quem ler o QR code vê exatamente as mesmas informações que você escolher aqui — nada além disso.
        </p>

        <fieldset className="flex flex-col gap-1 text-sm">
          <legend className="mb-1 font-semibold">Nome</legend>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={dados.nome_exibicao !== "primeiro"}
              onChange={() => atualizar({ ...dados, nome_exibicao: "completo" })}
            />
            Nome completo
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={dados.nome_exibicao === "primeiro"}
              onChange={() => atualizar({ ...dados, nome_exibicao: "primeiro" })}
            />
            Só o primeiro nome
          </label>
        </fieldset>

        <div className="flex flex-col gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!m.foto} disabled={!temFoto} onChange={(e) => marcar("foto", e.target.checked)} />
            Minha foto {!temFoto && <span className="text-xs text-neutral-400">(adicione uma foto em Meu perfil)</span>}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!m.cidade} onChange={(e) => marcar("cidade", e.target.checked)} />
            Minha cidade {cidade && <span className="text-xs text-neutral-400">({cidade})</span>}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!m.telefone}
              disabled={!perfil.telefone}
              onChange={(e) => marcar("telefone", e.target.checked)}
            />
            Meu telefone {!perfil.telefone && <span className="text-xs text-neutral-400">(sem telefone no perfil)</span>}
          </label>

          <div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!m.grupo} onChange={(e) => marcar("grupo", e.target.checked)} />
              Grupo ou romaria
            </label>
            {m.grupo && (
              <input
                className="input mt-1"
                maxLength={40}
                placeholder="Ex.: Romaria São José de Juiz de Fora"
                value={dados.grupo ?? ""}
                onChange={(e) => texto("grupo", e.target.value)}
              />
            )}
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!m.emergencia} onChange={(e) => marcar("emergencia", e.target.checked)} />
              Contato de emergência
            </label>
            {m.emergencia && (
              <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                <input
                  className="input"
                  maxLength={30}
                  placeholder="Nome (ex.: Maria, esposa)"
                  value={dados.emergencia_nome ?? ""}
                  onChange={(e) => texto("emergencia_nome", e.target.value)}
                />
                <input
                  className="input"
                  maxLength={20}
                  inputMode="tel"
                  placeholder="Telefone"
                  value={dados.emergencia_telefone ?? ""}
                  onChange={(e) => texto("emergencia_telefone", e.target.value)}
                />
              </div>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!m.sangue} onChange={(e) => marcar("sangue", e.target.checked)} />
              Tipo sanguíneo
            </label>
            {m.sangue && (
              <select className="input mt-1" value={dados.sangue ?? ""} onChange={(e) => texto("sangue", e.target.value)}>
                <option value="">Escolha</option>
                {TIPOS_SANGUINEOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!m.saude} onChange={(e) => marcar("saude", e.target.checked)} />
              Alergias, remédios ou condição de saúde
            </label>
            {m.saude && (
              <input
                className="input mt-1"
                maxLength={70}
                placeholder="Ex.: alérgico a dipirona; diabético"
                value={dados.saude ?? ""}
                onChange={(e) => texto("saude", e.target.value)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
