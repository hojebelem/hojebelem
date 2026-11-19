import Link from "next/link";

export const metadata = { title: "Política de privacidade" };

export default function Privacy() {
  return (
    <article className="legal-page shell page-space">
      <p className="eyebrow">LGPD</p>
      <h1>Política de privacidade</h1>
      <section>
        <p>
          Esta política explica quais dados pessoais a Hoje Belém trata, para
          quê e quais são os seus direitos, conforme a Lei Geral de Proteção de
          Dados (Lei nº 13.709/2018).
        </p>
        <h2>Dados que coletamos</h2>
        <p>
          Ao criar uma conta: nome, e-mail e senha (guardada de forma
          criptografada). Se você entrar com o Google, recebemos nome, e-mail e
          foto do perfil. Também guardamos os eventos que você salva nos
          favoritos e os eventos que você envia para divulgação.
        </p>
        <h2>Para que usamos</h2>
        <p>
          Para identificar sua conta, manter seus favoritos, revisar e publicar
          os eventos que você envia e proteger a plataforma contra abuso. A
          base legal é a execução do serviço que você pediu ao criar a conta.
        </p>
        <h2>Com quem compartilhamos</h2>
        <p>
          Não vendemos seus dados. Eles ficam em provedores de hospedagem, banco
          de dados e envio de e-mails transacionais (como redefinição de senha)
          contratados para operar o site. Ao clicar em links de compra ou de
          redes sociais, você sai da Hoje Belém e passa a seguir a política
          daquele serviço.
        </p>
        <h2>Cookies</h2>
        <p>
          Usamos cookies para manter você conectado. Se anúncios estiverem
          ativos, o Google pode usar cookies próprios para exibi-los.
        </p>
        <h2>Seus direitos</h2>
        <p>
          Você pode pedir acesso, correção ou exclusão dos seus dados. Nome,
          foto, senha e exclusão da conta podem ser feitos diretamente em{" "}
          <Link href="/perfil/editar">Editar perfil</Link>; para outros pedidos,
          fale com a gente pela página de <Link href="/contato">contato</Link>.
        </p>
        <h2>Mudanças nesta política</h2>
        <p>
          Esta política pode ser atualizada. A versão em vigor é sempre a
          publicada nesta página.
        </p>
      </section>
    </article>
  );
}
