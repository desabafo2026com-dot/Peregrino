import { giroCarimbo, svgCarimbo, type DadosCarimbo } from "@/lib/carimbo-svg";

// Rodada 68 — carimbo do caderno de bordo: nome do PAP em volta, km no
// centro, cidade embaixo, com data e hora em que o peregrino leu o QR code.
// Rodada 71 — o desenho vem de lib/carimbo-svg (o mesmo usado no PDF).
export type { DadosCarimbo };

export default function CarimboPap({ carimbo, girar = true }: { carimbo: DadosCarimbo; girar?: boolean }) {
  const dt = new Date(carimbo.carimbado_em);
  const rotulo = `Carimbo ${carimbo.pap_nome}, ${dt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`;
  return (
    <div
      role="img"
      aria-label={rotulo}
      className="w-full [&>svg]:h-auto [&>svg]:w-full"
      style={{ transform: girar ? `rotate(${giroCarimbo(carimbo.id)}deg)` : undefined }}
      dangerouslySetInnerHTML={{ __html: svgCarimbo(carimbo) }}
    />
  );
}
