import Link from "next/link";
import VoltarButton from "@/components/VoltarButton";
import { TERMOS_VERSAO_ATUAL } from "@/lib/constants";
import { ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Política de Privacidade — O Peregrino",
};

// Página pública, sem exigir login (a LGPD exige que a política possa ser
// consultada antes mesmo de criar conta e a qualquer momento depois).
export default function PoliticaDePrivacidadePage() {
  return (
    <div className="mx-auto max-w-2xl pb-10">
      <VoltarButton href="/" />
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold">
        <ShieldCheck size={22} className="text-amber-700 dark:text-amber-500" /> Política de
        Privacidade
      </h1>
      <p className="mb-6 text-sm text-neutral-500">
        Versão {TERMOS_VERSAO_ATUAL} — leia também os{" "}
        <Link href="/termos" className="text-amber-700 underline dark:text-amber-500">
          Termos de Uso
        </Link>
        .
      </p>

     
      <div className="prose-app mt-6 flex flex-col gap-5 text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">
        <section>
          <h2 className="mb-1 text-base font-bold text-neutral-900 dark:text-neutral-50">
            1. Quem trata seus dados (controlador)
          </h2>
          <p>
            O DESENVOLVEDOR é quem decide como e por que os
            dados pessoais tratados neste App são usados (o
            &quot;controlador&quot;, na linguagem da Lei Geral de Proteção
            de Dados — LGPD). Dúvidas ou pedidos sobre seus dados podem ser
            enviados pelo canal &quot;Falar com o desenvolvedor&quot; no seu
            perfil, ou pelo e-mail{" "}
            <strong>[E-MAIL DE CONTATO/PRIVACIDADE]</strong>.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-neutral-900 dark:text-neutral-50">
            2. Quais dados coletamos, para quê e com que base legal
          </h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Cadastro:</strong> nome completo, telefone (opcional),
              e-mail e senha — para criar e proteger sua conta.{" "}
              <em>Base legal: execução de contrato.</em>
            </li>
            <li>
              <strong>Perfil de peregrino:</strong> cidade de origem, data
              de nascimento, sexo, motivo da peregrinação, se caminha em
              grupo, meio de transporte — para personalizar sua experiência
              e gerar seu certificado. <em>Base legal: execução de contrato.</em>
            </li>
            <li>
              <strong>Religião (campo opcional):</strong> este é um{" "}
              <strong>dado pessoal sensível</strong> conforme o art. 5º, II,
              da LGPD. Só coletamos se você preencher esse campo por
              vontade própria, e usamos apenas para contexto pessoal do seu
              perfil — nunca para fins de perfilamento, publicidade ou
              qualquer decisão automatizada. <em>Base legal: seu consentimento
              específico e destacado, dado ao preencher o campo.</em> Você
              pode apagar essa informação a qualquer momento em seu perfil.
            </li>
            <li>
              <strong>Localização em tempo real:</strong> durante uma
              peregrinação ativa, se você autorizar — para registrar
              check-ins, o local de sinistros que você informar, permitir
              avisos da administração sobre condições da rota e localizar
              você em caso de emergência. <em>Base legal: seu consentimento,
              revogável a qualquer momento pausando o compartilhamento em
              &quot;Minha peregrinação&quot;.</em>
            </li>
            <li>
              <strong>Fotos:</strong> foto de perfil, foto de um Ponto de
              Apoio, foto de um local de risco, e as fotos que você mesmo
              escolhe para a arte do Certificado Plus. <em>Base legal:
              execução de contrato / seu consentimento ao fazer o upload.</em>
            </li>
            <li>
              <strong>Relatos de sinistro/suspeita e mensagens de
              contato:</strong> o texto que você envia nessas
              funcionalidades. <em>Base legal: execução de contrato e nosso
              legítimo interesse em manter a segurança de outros peregrinos.</em>
            </li>
            <li>
              <strong>Dados de pagamento:</strong> guardamos apenas o
              status da compra/doação e identificadores da transação no
              Mercado Pago (nunca o número do seu cartão ou dados
              bancários, que ficam só com o Mercado Pago).{" "}
              <em>Base legal: execução de contrato e cumprimento de obrigação
              legal (fiscal/contábil).</em>
            </li>
            <li>
              <strong>Dados técnicos:</strong> preferência de tema
              claro/escuro (guardada só no seu próprio aparelho) e os
              dados de sessão necessários para manter você logado.{" "}
              <em>Base legal: execução de contrato.</em>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-neutral-900 dark:text-neutral-50">
            3. O que é visível publicamente
          </h2>
          <p>
            Um Ponto de Apoio (PAP) aparece no mapa público com nome,
            localização aproximada ou exata, horário e serviços — o{" "}
            <strong>telefone só aparece se o próprio gerente autorizar</strong>{" "}
            explicitamente no cadastro, e ele pode ligar/desligar essa
            permissão quando quiser. Seu certificado, quando você o
            compartilha, mostra seu nome e os dados reais da sua
            peregrinação — a decisão de compartilhar é sempre sua. Relatos
            de sinistro/suspeita ficam visíveis publicamente por tempo
            limitado, sem exibir seu nome.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-neutral-900 dark:text-neutral-50">
            4. Com quem compartilhamos dados
          </h2>
          <p>
            Usamos fornecedores de tecnologia que processam dados em nosso
            nome (&quot;operadores&quot;, na LGPD), sempre limitados ao
            necessário para o App funcionar:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Supabase</strong> — banco de dados, autenticação e
              armazenamento de arquivos;
            </li>
            <li>
              <strong>Vercel</strong> — hospedagem da aplicação;
            </li>
            <li>
              <strong>Mercado Pago</strong> — processamento de pagamentos e
              doações.
            </li>
          </ul>
          <p>
            Não vendemos seus dados pessoais a terceiros, nem os usamos para
            publicidade. Administradores do App têm acesso a dados
            necessários para moderação, segurança e suporte (por exemplo,
            localização de peregrinos em andamento, para casos de
            emergência), sempre dentro do que a função exige.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-neutral-900 dark:text-neutral-50">
            5. Por quanto tempo guardamos seus dados
          </h2>
          <p>
            Guardamos seus dados enquanto sua conta existir e por mais o
            tempo necessário para cumprir obrigações legais (por exemplo,
            registros de pagamento, que a legislação fiscal brasileira
            exige manter por alguns anos) ou para resolver disputas. Dados
            de localização de uma peregrinação já concluída ficam
            associados ao seu histórico de check-ins/certificado, e podem
            ser apagados a seu pedido, ressalvadas as exceções legais
            acima.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-neutral-900 dark:text-neutral-50">
            6. Seus direitos (art. 18 da LGPD)
          </h2>
          <p>Você pode, a qualquer momento e gratuitamente, pedir:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>confirmação de que tratamos seus dados, e acesso a eles;</li>
            <li>correção de dados incompletos, inexatos ou desatualizados;</li>
            <li>
              anonimização, bloqueio ou eliminação de dados desnecessários
              ou tratados fora da lei;
            </li>
            <li>portabilidade dos seus dados a outro fornecedor;</li>
            <li>
              informação sobre com quem compartilhamos seus dados e sobre a
              possibilidade de não fornecer consentimento;
            </li>
            <li>revogação do consentimento, a qualquer momento;</li>
            <li>eliminação dos dados tratados com base no consentimento.</li>
          </ul>
          <p>
            Hoje, esses pedidos são feitos pelo canal &quot;Falar com o
            desenvolvedor&quot; no seu perfil, ou pelo e-mail{" "}
            <strong>[E-MAIL DE CONTATO/PRIVACIDADE]</strong>, e são
            atendidos manualmente enquanto o App não tem uma função de
            autoatendimento para isso (previsto para uma próxima
            atualização).
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-neutral-900 dark:text-neutral-50">
            7. Segurança da informação
          </h2>
          <p>
            Todo o tráfego entre o App e nossos servidores é criptografado
            (HTTPS). O banco de dados usa controle de acesso por linha
            (Row Level Security) — cada pessoa só acessa, por padrão, os
            próprios dados; funções administrativas têm regras específicas
            e auditáveis. Nenhum sistema é 100% imune a falhas, e nos
            comprometemos a agir rapidamente e avisar as autoridades e
            pessoas afetadas, conforme a LGPD exige, caso ocorra algum
            incidente de segurança relevante.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-neutral-900 dark:text-neutral-50">
            8. Crianças e adolescentes
          </h2>
          <p>
            O App é destinado a maiores de 18 anos. Se você caminha com
            filhos ou dependentes menores de idade, a conta e a
            responsabilidade pelo uso do App durante o trajeto devem ser
            de um responsável legal adulto — não coletamos intencionalmente
            dados de crianças por conta própria.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-neutral-900 dark:text-neutral-50">
            9. Cookies e armazenamento local
          </h2>
          <p>
            Usamos armazenamento local do seu próprio navegador/aparelho
            apenas para lembrar sua preferência de tema (claro/escuro) e
            para manter sua sessão de login — não usamos cookies de
            rastreamento publicitário nem compartilhamos esses dados com
            terceiros de marketing.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-bold text-neutral-900 dark:text-neutral-50">
            10. Alterações desta Política
          </h2>
          <p>
            Podemos atualizar esta Política conforme o App evolui. Mudanças
            relevantes serão sinalizadas dentro do App, com pedido de novo
            aceite quando necessário. A versão vigente é sempre a publicada
            nesta página.
          </p>
        </section>
      </div>
    </div>
  );
}
