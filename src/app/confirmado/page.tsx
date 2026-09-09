import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CheckCircle2, XCircle } from "lucide-react";

export default async function ConfirmadoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (erro || !user) {
    return (
      <div className="mx-auto max-w-sm text-center">
        <div className="card">
          <XCircle className="mx-auto mb-3 text-red-600" size={40} />
          <h1 className="mb-2 text-xl font-bold">Não foi possível confirmar</h1>
          <p className="mb-4 text-sm text-neutral-500">
            Este link de confirmação é inválido ou já expirou. Se você já
            confirmou antes, é só entrar normalmente — ou refaça o cadastro
            para receber um novo link.
          </p>
          <Link href="/login" className="btn-primary inline-block">
            Ir para o login
          </Link>
        </div>
      </div>
    );
  }

  const { data: gerente } = await supabase
    .from("gerentes_pap")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  const ehGerente = !!gerente || user.user_metadata?.tipo_conta === "gerente_pap";
  const destino = ehGerente ? "/gerente-pap" : "/perfil";
  const rotulo = ehGerente ? "Continuar para o cadastro do meu PAP" : "Continuar para meu perfil";

  return (
    <div className="mx-auto max-w-sm text-center">
      <div className="card">
        <CheckCircle2 className="mx-auto mb-3 text-green-600" size={40} />
        <h1 className="mb-2 text-xl font-bold">E-mail confirmado com sucesso!</h1>
        <p className="mb-4 text-sm text-neutral-500">
          {ehGerente
            ? "Sua conta de Gerente de PAP está pronta. Continue para cadastrar os dados do seu Ponto de Apoio ao Peregrino."
            : "Sua conta está pronta. Continue para completar seu perfil de peregrino."}
        </p>
        <Link href={destino} className="btn-primary inline-block">
          {rotulo}
        </Link>
      </div>
    </div>
  );
}
