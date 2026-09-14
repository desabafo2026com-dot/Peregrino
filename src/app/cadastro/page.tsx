import { redirect } from "next/navigation";

// O cadastro de peregrino agora faz parte do fluxo único de entrada por
// e-mail em /login (digita o e-mail, e se for novo, escolhe "sou
// peregrino"). Esta rota continua existindo só para não quebrar links
// antigos, e já leva direto para lá com o tipo pré-selecionado.
export default function CadastroPage() {
  redirect("/login?tipo=peregrino");
}
