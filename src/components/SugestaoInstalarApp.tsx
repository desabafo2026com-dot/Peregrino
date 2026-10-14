"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Check, Smartphone } from "lucide-react";
import { useInstalarApp, detectarAparelho, type SistemaAparelho, type NavegadorAparelho } from "@/lib/instalar-app";
import { GuiaInstalacao, Janela } from "@/components/BotaoInstalarApp";

// Rodada 67 — ao abrir o site pelo celular (sem o app instalado), aparece
// uma janela sugerindo instalar no telefone. Se a pessoa tocar em "Agora
// não", só volta a aparecer depois de 3 dias; e no máximo uma vez por
// visita. Não aparece no computador, com o app já instalado, nem em páginas
// de login/cadastro/administração (para não atrapalhar).
const CHAVE_ADIADO = "peregrino_instalar_adiado_ate";
const CHAVE_SESSAO = "peregrino_instalar_sugerido";
const TRES_DIAS_MS = 3 * 24 * 60 * 60 * 1000;
const PREFIXOS_SEM_SUGESTAO = ["/admin", "/login", "/cadastro", "/perfil", "/auth", "/termos", "/privacidade", "/confirmado"];

function podeSugerirAgora(): boolean {
  try {
    if (window.sessionStorage.getItem(CHAVE_SESSAO)) return false;
    const adiado = Number(window.localStorage.getItem(CHAVE_ADIADO) ?? 0);
    if (adiado && Date.now() < adiado) return false;
  } catch {
    // sem armazenamento: segue e mostra (só uma vez, já que o estado some)
  }
  return true;
}

function marcarSugerido() {
  try {
    window.sessionStorage.setItem(CHAVE_SESSAO, "1");
  } catch {}
}

function adiar() {
  try {
    window.localStorage.setItem(CHAVE_ADIADO, String(Date.now() + TRES_DIAS_MS));
  } catch {}
}

export default function SugestaoInstalarApp() {
  const pathname = usePathname();
  const { podeInstalarDireto, jaInstalado, instalar } = useInstalarApp();
  const [aberta, setAberta] = useState(false);
  const [guia, setGuia] = useState<null | { sistema: SistemaAparelho; navegador: NavegadorAparelho }>(null);
  const [instalado, setInstalado] = useState(false);

  useEffect(() => {
    if (jaInstalado) return;
    if (!pathname || PREFIXOS_SEM_SUGESTAO.some((p) => pathname.startsWith(p))) return;
    const aparelho = detectarAparelho();
    if (aparelho.sistema === "outro") return; // computador
    // Rodada 72 — dentro do Instagram/Facebook etc. quem cuida é o aviso
    // "Abra no navegador" (AbrirNoNavegador).
    if (aparelho.navegador === "app-interno") return;
    if (!podeSugerirAgora()) return;
    const t = setTimeout(() => {
      marcarSugerido();
      setAberta(true);
    }, 1500);
    return () => clearTimeout(t);
  }, [pathname, jaInstalado]);

  function fecharAgoraNao() {
    adiar();
    setAberta(false);
    setGuia(null);
  }

  async function instalarAgora() {
    if (podeInstalarDireto) {
      const r = await instalar();
      if (r === "instalado") {
        setInstalado(true);
        return;
      }
      if (r === "recusado") {
        fecharAgoraNao();
        return;
      }
    }
    setGuia(detectarAparelho());
  }

  if (!aberta) return null;

  return createPortal(
    <Janela onFechar={fecharAgoraNao}>
      {instalado ? (
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
            <Check size={26} />
          </span>
          <p className="font-bold" style={{ textAlign: "center" }}>
            Pronto! App instalado.
          </p>
          <p className="text-sm text-neutral-600 dark:text-neutral-300" style={{ textAlign: "center" }}>
            O ícone do O Peregrino está na tela inicial do seu celular.
          </p>
          <button type="button" onClick={() => setAberta(false)} className="btn-primary mt-2 w-full">
            Ok
          </button>
        </div>
      ) : guia ? (
        <GuiaInstalacao sistema={guia.sistema} navegador={guia.navegador} />
      ) : (
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <Image
            src="/icons/icon-192.png"
            alt="Ícone do app O Peregrino"
            width={72}
            height={72}
            className="h-[72px] w-[72px] rounded-2xl shadow-md"
          />
          <p className="text-lg font-bold" style={{ textAlign: "center" }}>
            Instale O Peregrino no seu telefone
          </p>
          <p className="text-sm text-neutral-600 dark:text-neutral-300" style={{ textAlign: "center" }}>
            Fica com um ícone na tela inicial, abre mais rápido e você não precisa procurar o link durante a
            caminhada. É grátis e não ocupa quase nada de espaço.
          </p>
          <button
            type="button"
            onClick={instalarAgora}
            className="btn-primary mt-1 flex w-full items-center justify-center gap-2"
          >
            <Smartphone size={18} /> Instalar no telefone
          </button>
          <button type="button" onClick={fecharAgoraNao} className="text-sm text-neutral-500 underline">
            Agora não
          </button>
        </div>
      )}
    </Janela>,
    document.body
  );
}
