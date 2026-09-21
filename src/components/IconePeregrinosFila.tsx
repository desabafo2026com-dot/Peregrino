// Ícone próprio (Rodada 27, pedido do usuário: "o símbolo pode ser uns 6
// bonequinhos em fila como está já"; ajustado na Rodada 28 a pedido do
// usuário — "ficou muito pequeno, era do tamanho que estava mas com mais uns
// dois bonecos") — agora 8 pequenas figuras de peregrino caminhando, uma
// atrás da outra, no lugar do ícone genérico UsersRound usado até aqui para
// o recurso de Romaria de Peregrinos (antes "Romaria em Grupo"). Desenhado
// no mesmo estilo de traço (stroke, sem preenchimento) da biblioteca
// lucide-react já usada em todo o resto do app.
//
// Bug corrigido na Rodada 28: o viewBox é bem mais largo que alto (a "fila"
// de bonequinhos), mas o componente forçava width=height=size — como um SVG
// sempre respeita as proporções do viewBox (preserveAspectRatio padrão),
// isso fazia o desenho inteiro encolher para caber na altura, sobrando uma
// faixa enorme de espaço vazio nas laterais e deixando cada bonequinho
// minúsculo. Agora `size` continua controlando a ALTURA (compatível com o
// uso como ícone lucide), e a largura é calculada a partir da proporção real
// do viewBox — o desenho passa a ocupar seu espaço por inteiro, do tamanho
// que sempre foi pretendido.
interface Props {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

const CENTROS = [10, 29, 48, 67, 86, 105, 124, 143];
const VIEWBOX_LARGURA = 154;
const VIEWBOX_ALTURA = 24;

export default function IconePeregrinosFila({ size = 24, className, style }: Props) {
  const altura = size;
  const largura = typeof size === "number" ? (size * VIEWBOX_LARGURA) / VIEWBOX_ALTURA : size;

  return (
    <svg
      width={largura}
      height={altura}
      viewBox={`0 0 ${VIEWBOX_LARGURA} ${VIEWBOX_ALTURA}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {CENTROS.map((cx, i) => (
        <g key={i} transform={`translate(${cx},0)`}>
          {/* cabeça */}
          <circle cx="0" cy="3.1" r="2.3" />
          {/* tronco */}
          <line x1="0" y1="5.4" x2="0" y2="14" />
          {/* pernas caminhando */}
          <line x1="0" y1="14" x2="-3.2" y2="21" />
          <line x1="0" y1="14" x2="3" y2="20" />
          {/* braços balançando (alternados, para sugerir movimento em fila) */}
          {i % 2 === 0 ? (
            <>
              <line x1="0" y1="8" x2="-3" y2="11.5" />
              <line x1="0" y1="8" x2="2.6" y2="6" />
            </>
          ) : (
            <>
              <line x1="0" y1="8" x2="3" y2="11.5" />
              <line x1="0" y1="8" x2="-2.6" y2="6" />
            </>
          )}
        </g>
      ))}
    </svg>
  );
}
