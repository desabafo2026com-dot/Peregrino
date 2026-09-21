// Ícone próprio (Rodada 27, pedido do usuário: "o símbolo pode ser uns 6
// bonequinhos em fila como está já") — 6 pequenas figuras de peregrino
// caminhando, uma atrás da outra, no lugar do ícone genérico UsersRound
// usado até aqui para o recurso de Romaria de Peregrinos (antes "Romaria em
// Grupo"). Desenhado no mesmo estilo de traço (stroke, sem preenchimento)
// da biblioteca lucide-react já usada em todo o resto do app, para se
// misturar visualmente com os demais ícones — aceita as mesmas props
// (size/className/style) para ser um substituto direto de qualquer ícone
// lucide nos componentes que já usavam UsersRound.
interface Props {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

const CENTROS = [10, 29, 48, 67, 86, 105];

export default function IconePeregrinosFila({ size = 24, className, style }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 24"
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
