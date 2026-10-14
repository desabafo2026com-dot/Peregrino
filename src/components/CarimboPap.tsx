import { dataHoraCarimbo, giroCarimbo, svgCarimbo, type DadosCarimbo } from "@/lib/carimbo-svg";

// Rodada 68 — carimbo do caderno de bordo: nome do PAP em volta, km no
// centro, cidade embaixo, com data e hora em que o peregrino leu o QR code.
// Rodada 71 — o desenho vem de lib/carimbo-svg (o mesmo usado no PDF).
// Rodada 72 — se o PAP tiver carimbo próprio (imagem enviada pelo admin),
// mostra a imagem com a data e a hora embaixo.
export type { DadosCarimbo };

export default function CarimboPap({ carimbo, girar = true }: { carimbo: DadosCarimbo; girar?: boolean }) {
  const { data, hora } = dataHoraCarimbo(carimbo.carimbado_em);
  const rotulo = `Carimbo ${carimbo.pap_nome}, ${data}`;
  const transform = girar ? `rotate(${giroCarimbo(carimbo.id)}deg)` : undefined;
  if (carimbo.imagem_url) {
    return (
      <div role="img" aria-label={rotulo} className="flex w-full flex-col items-center" style={{ transform }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={carimbo.imagem_url} alt="" className="aspect-square w-full object-contain" />
        <span className="mt-0.5 text-[10px] font-bold text-neutral-600" style={{ textAlign: "center" }}>
          {data} · {hora}
        </span>
      </div>
    );
  }
  return (
    <div
      role="img"
      aria-label={rotulo}
      className="w-full [&>svg]:h-auto [&>svg]:w-full"
      style={{ transform }}
      dangerouslySetInnerHTML={{ __html: svgCarimbo(carimbo) }}
    />
  );
}
