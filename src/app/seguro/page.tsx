import Link from "next/link";
import VoltarButton from "@/components/VoltarButton";
import { ShieldCheck } from "lucide-react";

export const metadata = {
  title: "O app é seguro? — O Peregrino",
  description:
    "Por que o O Peregrino não está na loja de aplicativos, o que ele faz e não faz com seus dados, e como falar com a gente.",
};

// Rodada 41 — pedido do usuário depois do relato de que parte do público
// tinha receio de se cadastrar num app "fora da loja". Página pública (sem
// login), pensada para ser linkada nos grupos e a partir da tela de login.
// Tudo aqui precisa bater com o que o app realmente faz e com a Política de
// Privacidade (/privacidade) — ao mudar um comportamento descrito aqui,
// atualizar esta página junto.

const CONTATO_EMAIL = "contato.operegrino116@gmail.com";

function Pergunta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <h2 className="mb-2 text-base font-bold text-neutral-900 dark:text-neutral-50">{titulo}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">
        {children}
      </div>
    </section>
  );
}

export default function SeguroPage() {
  return (
    <div className="mx-auto max-w-2xl pb-10">
      <VoltarButton href="/" />
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold">
        <ShieldCheck size={24} className="text-amber-700 dark:text-amber-500" /> O app é seguro?
      </h1>
      <p className="mb-6 text-sm text-neutral-500">
        Respostas diretas para as dúvidas mais comuns de quem está conhecendo o O Peregrino.
      </p>

      <div className="flex flex-col gap-4">
        <Pergunta titulo="O que é o O Peregrino?">
          <p>
            Um aplicativo <strong>gratuito</strong> de apoio para quem caminha pela Rodovia
            Presidente Dutra até o Santuário de Aparecida: mapa dos Pontos de Apoio ao Peregrino
            (PAP), rotas com os trechos de maior risco, hotéis e restaurantes no caminho, registro
            da sua peregrinação e um botão de emergência que liga direto para PM, PRF, Bombeiros
            ou SAMU.
          </p>
        </Pergunta>

        <Pergunta titulo="Por que ele não está na Play Store nem na App Store?">
          <p>
            Porque o app <strong>ainda está em fase de testes</strong>. Publicar nas lojas exige
            adaptar o código e passar pela revisão da Google e da Apple, um processo que leva
            semanas — e não havia tempo para isso antes da temporada de romarias. Preferimos
            colocar o app para funcionar agora, para já ajudar quem está na estrada.
          </p>
          <p>Além disso, abrir direto pelo navegador tem vantagens para quem usa:</p>
          <ul className="list-disc pl-5">
            <li>não precisa baixar nada nem liberar espaço no celular;</li>
            <li>está sempre na versão mais nova — correções chegam na hora, sem atualizar pela loja;</li>
            <li>funciona do mesmo jeito em Android e iPhone;</li>
            <li>
              se quiser, dá para{" "}
              <Link href="/instalar" className="text-amber-700 underline dark:text-amber-500">
                colocar um atalho na tela inicial
              </Link>
              , que abre como um aplicativo.
            </li>
          </ul>
        </Pergunta>

        <Pergunta titulo="Colocar o atalho na tela inicial instala alguma coisa?">
          <p>
            Não. &quot;Adicionar à tela inicial&quot; só cria um ícone que abre esta mesma página,
            sem a barra do navegador. Nenhum programa é instalado e o atalho não ganha acesso a
            nada do seu celular. Para tirar, é só apagar o ícone.
          </p>
        </Pergunta>

        <Pergunta titulo="Preciso me cadastrar para usar?">
          <p>
            <strong>Não.</strong> O mapa de PAP, as rotas e pontos de risco, e os hotéis e
            restaurantes podem ser vistos sem conta nenhuma. O cadastro só é necessário para
            registrar a sua peregrinação: planejar a caminhada, fazer check-in nos pontos e
            receber o certificado de conclusão.
          </p>
        </Pergunta>

        <Pergunta titulo='Por que o e-mail de confirmação vem de "Supabase", em inglês?'>
          <p>
            O Supabase é a empresa que guarda, com segurança, as contas e os dados do app. Quando
            alguém se cadastra com e-mail e senha, ele envia automaticamente essa mensagem
            (assunto &quot;Confirm Your Signup&quot;) com um link para confirmar que o e-mail é seu.
            É esperado e seguro.
          </p>
          <p>
            Se preferir, use o botão <strong>&quot;Continuar com o Google&quot;</strong> na tela de
            entrar: você usa a conta Google que já está no celular, sem criar senha e sem e-mail
            de confirmação.
          </p>
        </Pergunta>

        <Pergunta titulo="O que o app nunca pede">
          <ul className="list-disc pl-5">
            <li>acesso aos seus contatos, mensagens, microfone ou galeria de fotos;</li>
            <li>número de cartão, senha de banco ou CPF;</li>
            <li>que você baixe ou instale qualquer arquivo.</li>
          </ul>
          <p>
            Fotos só são enviadas quando você mesmo escolhe uma (por exemplo, a foto do perfil ou
            do seu PAP).
          </p>
        </Pergunta>

        <Pergunta titulo="E a minha localização?">
          <p>
            O app só usa sua localização quando você usa uma função que precisa dela — por
            exemplo, durante uma peregrinação que você iniciou, para registrar os check-ins e
            para que você possa ser localizado numa emergência. O compartilhamento pode ser
            pausado a qualquer momento em &quot;Minha peregrinação&quot;.
          </p>
        </Pergunta>

        <Pergunta titulo="O app cobra alguma coisa?">
          <p>
            O uso do app é gratuito. Existem extras opcionais — a arte especial do certificado
            (Romaria Plus) e doações para manter o app — que só são cobrados se você escolher. O
            pagamento é feito no site do Mercado Pago: o app nunca vê nem guarda os dados do seu
            cartão.
          </p>
        </Pergunta>

        <Pergunta titulo="O que acontece com os meus dados?">
          <p>
            Seus dados não são vendidos nem usados para propaganda. Você pode excluir sua conta a
            qualquer momento em <strong>Perfil</strong>. Os detalhes estão na{" "}
            <Link href="/privacidade" className="text-amber-700 underline dark:text-amber-500">
              Política de Privacidade
            </Link>{" "}
            e nos{" "}
            <Link href="/termos" className="text-amber-700 underline dark:text-amber-500">
              Termos de Uso
            </Link>
            .
          </p>
        </Pergunta>

        <Pergunta titulo="Ficou com alguma dúvida?">
          <p>
            Escreva para{" "}
            <a href={`mailto:${CONTATO_EMAIL}`} className="text-amber-700 underline dark:text-amber-500">
              {CONTATO_EMAIL}
            </a>
            . Se já tiver conta, também dá para falar com a gente pelo seu Perfil, em &quot;Falar
            com o desenvolvedor&quot;.
          </p>
          <p className="text-xs text-neutral-500">
            Importante: o app não é um serviço de resgate. Em emergência, ligue direto para PM
            (190), PRF (191), Bombeiros (193) ou SAMU (192) — o botão vermelho do app faz isso.
          </p>
        </Pergunta>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link href="/mapa" className="btn-secondary flex-1 text-center">
          Ver o mapa sem cadastro
        </Link>
        <Link href="/login" className="btn-primary flex-1 text-center">
          Entrar ou cadastrar
        </Link>
      </div>
    </div>
  );
}
