import Link from "next/link";
import VoltarButton from "@/components/VoltarButton";
import { TERMOS_VERSAO_ATUAL } from "@/lib/constants";
import { ScrollText } from "lucide-react";

export const metadata = {
  title: "Termos de Uso — O Peregrino",
};

// Página pública, sem exigir login — precisa poder ser lida antes de
// alguém criar conta, e compartilhada/linkada de fora do app.
export default function TermosDeUsoPage() {
  return (
    <div className="mx-auto max-w-2xl pb-10">
      <VoltarButton href="/" />
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold">
        <ScrollText size={22} className="text-amber-700 dark:text-amber-500" /> Termos de Uso
      </h1>
      <p className="mb-6 text-sm text-neutral-500">
        Versão {TERMOS_VERSAO_ATUAL} — leia também a{" "}
        <Link href="/privacidade" className="text-amber-700 underline dark:text-amber-500">
          Política de Privacidade
        </Link>
        , que trata especificamente do uso dos seus dados.
      </p>

      
      <div className="prose-app mt-6 flex flex-col gap-5 text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">
        <section>
          <h2 className="mb-1 text-base font-bold text-neutral-900 dark:text-neutral-50">
            1. Quem oferece este serviço
          </h2>
          <p>
            O aplicativo <strong>O Peregrino</strong> (&quot;o App&quot;) é oferecido pelo 
            desenvolvedor. Estes Termos de Uso
            regulam o uso do App por qualquer pessoa que crie uma conta ou
            utilize suas funcionalidades públicas (&quot;você&quot;).
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-neutral-900 dark:text-neutral-50">
            2. O que é o App
          </h2>
          <p>
            O App é uma ferramenta de apoio informativo e comunitário para
            quem caminha pela Rodovia Presidente Dutra em romaria até
            Aparecida-SP: mapa de Pontos de Apoio ao Peregrino (PAP), rotas,
            dicas de segurança, registro de check-ins e do trajeto,
            avisos de outros peregrinos sobre condições da via, certificado
            de conclusão e um botão de acesso rápido aos números oficiais
            de emergência.
          </p>
          <p>
            <strong>
              O App não é um serviço de socorro, resgate ou segurança
              pública, não substitui a sinalização oficial da rodovia nem o
              acionamento direto de PM (190), PRF (191), Bombeiros (193) ou
              SAMU (192)
            </strong>{" "}
            — o botão de emergência dentro do App apenas facilita ligar para
            esses números oficiais. Em qualquer emergência real, ligue
            diretamente para eles.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-neutral-900 dark:text-neutral-50">
            3. Cadastro e conta
          </h2>
          <p>
            Para usar a maior parte das funções você precisa criar uma conta
            com e-mail e senha. Você se compromete a: (a) fornecer
            informações verdadeiras; (b) manter sua senha em sigilo e nos
            avisar em caso de uso não autorizado da sua conta; (c) ter{" "}
            <strong>18 anos completos ou mais</strong> ao criar a conta.
            Menores de idade só devem participar da peregrinação e usar
            funções do App sob supervisão de um responsável legal, que deve
            ser o titular da conta usada durante o trajeto.
          </p>
          <p>
            Contas de <strong>Gerente de PAP</strong> são para quem
            representa um ponto de apoio (igreja, comércio, grupo
            voluntário, etc.) e se responsabiliza pela veracidade das
            informações cadastradas sobre aquele ponto (endereço, horário,
            serviços oferecidos, contato).
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-neutral-900 dark:text-neutral-50">
            4. Localização e dados durante a peregrinação
          </h2>
          <p>
            Ao iniciar uma peregrinação você pode autorizar o
            compartilhamento da sua localização em tempo real, usada para
            registrar seus check-ins, o local de sinistros que você
            informar, permitir que a administração avise sobre condições
            adversas na rota e, em caso de emergência, saber onde você
            está. Esse compartilhamento pode ser pausado a qualquer momento
            em &quot;Minha peregrinação&quot;. Os detalhes de uso desses
            dados estão na{" "}
            <Link href="/privacidade" className="text-amber-700 underline dark:text-amber-500">
              Política de Privacidade
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-neutral-900 dark:text-neutral-50">
            5. Conteúdo enviado por você
          </h2>
          <p>
            Relatos de sinistro/suspeita, fotos (de perfil, de PAP, de local
            de risco ou da arte do Certificado Plus) e mensagens de contato
            são de sua responsabilidade. Ao enviá-los, você garante que tem
            o direito de compartilhá-los e que as informações são
            verdadeiras, na medida do seu conhecimento. É proibido enviar
            conteúdo falso, ofensivo, discriminatório, que viole direitos de
            terceiros, ou usar o botão de emergência/relatos para trote.
          </p>
          <p>
            Relatos de sinistro/suspeita passam por um período de exposição
            pública temporária e podem ser revisados, editados ou removidos
            pela administração, conforme descrito nas próprias telas do App.
            Reservamo-nos o direito de remover qualquer conteúdo que viole
            estes Termos e de suspender contas que abusem dessas
            funcionalidades.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-neutral-900 dark:text-neutral-50">
            6. Limitação de responsabilidade
          </h2>
          <p>
            As informações sobre PAP, rotas e riscos vêm de cadastros
            próprios, de gerentes de PAP voluntários e de relatos de outros
            peregrinos — <strong>fazemos o possível para mantê-las corretas, mas
            não garantimos que estejam sempre completas, atualizadas ou
            disponíveis</strong> (um PAP pode fechar sem aviso, por exemplo).
            Use sempre seu bom senso, observe a sinalização real da rodovia
            e as orientações de autoridades locais.
          </p>
          <p>
            Pontos de Apoio ao Peregrino são mantidos por voluntários,
            igrejas, comércios ou organizações independentes — eles não são
            funcionários, prepostos ou representantes nossos, e não
            respondemos por atos, omissões ou pela qualidade do atendimento
            prestado por eles.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-neutral-900 dark:text-neutral-50">
            7. Certificado Plus, fotos e pagamentos
          </h2>
          <p>
            O certificado padrão de conclusão da peregrinação é gratuito. O{" "}
            <strong>Certificado Plus + arte de 5 fotos</strong> é um produto
            digital pago, processado pelo Mercado Pago — nós não recebemos
            nem armazenamos os dados do seu cartão ou meio de pagamento em
            nenhum momento, isso acontece inteiramente na plataforma do
            Mercado Pago.
          </p>
          <p>
            Por se tratar de conteúdo digital personalizado (gerado com
            fotos escolhidas por você, a partir dos dados reais da sua
            peregrinação) e entregue imediatamente após a confirmação do
            pagamento, o direito de arrependimento do art. 49 do Código de
            Defesa do Consumidor pode não se aplicar depois que uma arte já
            tiver sido gerada, baixada ou compartilhada — antes disso, ou em
            caso de cobrança indevida/duplicada, entre em contato pelo canal
            &quot;Falar com o desenvolvedor&quot; no seu perfil, ou pelo
            e-mail <strong>[E-MAIL DE CONTATO]</strong>, para pedir o
            estorno.
          </p>
          <p>
            Cupons de cortesia, quando fornecidos, liberam o Certificado
            Plus sem cobrança, são de uso único e não podem ser trocados por
            dinheiro.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-neutral-900 dark:text-neutral-50">
            8. Doações
          </h2>
          <p>
            O módulo &quot;Ajude o desenvolvedor&quot; aceita doações
            voluntárias e espontâneas para manter e melhorar o App. Doações
            não geram nenhuma contrapartida, produto ou serviço, e — por sua
            própria natureza de liberalidade — não são reembolsáveis, exceto
            em caso de cobrança duplicada ou erro comprovado.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-neutral-900 dark:text-neutral-50">
            9. Propriedade intelectual
          </h2>
          <p>
            A marca &quot;O Peregrino&quot;, o layout, os ícones e o código
            do App nos pertencem ou são licenciados para nós. O conteúdo que
            você envia continua seu, mas você nos concede uma licença não
            exclusiva para exibi-lo dentro do App (por exemplo, sua foto de
            perfil, ou a arte do Certificado Plus para você mesmo baixar e
            compartilhar).
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-neutral-900 dark:text-neutral-50">
            10. Suspensão e encerramento de conta
          </h2>
          <p>
            Podemos suspender ou encerrar contas que violem estes Termos,
            usem o App de forma fraudulenta ou coloquem em risco outros
            usuários. Você pode encerrar sua própria conta a qualquer
            momento pelo canal &quot;Falar com o desenvolvedor&quot; ou pelo
            e-mail de contato.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-neutral-900 dark:text-neutral-50">
            11. Alterações destes Termos
          </h2>
          <p>
            Podemos atualizar estes Termos conforme o App evolui. Mudanças
            relevantes serão sinalizadas dentro do App, com pedido de novo
            aceite quando necessário. A versão vigente é sempre a publicada
            nesta página.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-neutral-900 dark:text-neutral-50">
            12. Lei aplicável e contato
          </h2>
          <p>
            Estes Termos são regidos pela lei brasileira. Dúvidas, dicas ou
            reclamações podem ser enviadas pelo canal &quot;Falar com o
            desenvolvedor&quot; no seu perfil, ou pelo e-mail{" "}
            <strong>[E-MAIL DE CONTATO]</strong>.
          </p>
        </section>
      </div>
    </div>
  );
}
