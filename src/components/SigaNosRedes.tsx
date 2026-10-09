import { Camera, Music2, SquarePlay } from "lucide-react";

// Rodada 62 — "Siga-nos nas redes sociais", logo abaixo de compartilhar.
const REDES = [
  { nome: "YouTube", usuario: "@Dutra-OPeregrino", href: "https://www.youtube.com/@Dutra-OPeregrino", Icone: SquarePlay, cor: "#dc2626" },
  { nome: "TikTok", usuario: "@dutra.operegrino", href: "https://www.tiktok.com/@dutra.operegrino", Icone: Music2, cor: "#111111" },
  { nome: "Instagram", usuario: "@dutraoperegrino", href: "https://www.instagram.com/dutraoperegrino/", Icone: Camera, cor: "#c13584" },
];

export default function SigaNosRedes({ className = "" }: { className?: string }) {
  return (
    <section className={`card flex flex-col gap-3 ${className}`}>
      <h2 className="text-center font-bold text-amber-800 dark:text-amber-500">Siga-nos nas redes sociais</h2>
      <div className="grid grid-cols-3 gap-2">
        {REDES.map(({ nome, usuario, href, Icone, cor }) => (
          <a
            key={nome}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1 rounded-xl border border-neutral-200 px-2 py-3 text-center transition hover:border-amber-400 dark:border-neutral-800"
            aria-label={`${nome} ${usuario}`}
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full text-white"
              style={{ background: cor }}
            >
              <Icone size={20} />
            </span>
            <span className="text-sm font-bold">{nome}</span>
            <span className="text-[11px] break-all text-neutral-500">{usuario}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
