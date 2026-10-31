import Link from "next/link";

export const metadata = { title: "Termos de uso" };

export default function Terms() {
  return (
    <article className="legal-page shell page-space">
      <p className="eyebrow">TERMOS DE USO</p>
      <h1>Termos de uso</h1>
      <section>
        <p>
          Ao usar a Hoje Belém, você concorda com estes termos. Se não
          concordar, não use a plataforma.
        </p>
        <h2>O que a Hoje Belém faz</h2>
        <p>
          A Hoje Belém é uma plataforma de descoberta e divulgação de eventos
          em Belém/PA. Não vendemos, cobramos, reservamos nem emitimos
          ingressos: os links levam ao canal do organizador, com termos e
          políticas próprios.
        </p>
        <h2>Informações dos eventos</h2>
        <p>
          Datas, preços, locais e atrações são informados pelos organizadores
          ou coletados de plataformas públicas, e podem mudar sem aviso.
          Confirme os detalhes no link oficial antes de sair. Não garantimos a
          realização de eventos de terceiros.
        </p>
        <h2>Sua conta</h2>
        <p>
          Você é responsável pelos dados que informa e por manter sua senha em
          segurança. Podemos suspender contas usadas para spam, fraude ou
          conteúdo ilegal.
        </p>
        <h2>Eventos enviados por você</h2>
        <p>
          Ao enviar um evento pela página Divulgue seu evento, você declara que
          as informações são verdadeiras e que pode divulgá-las, e autoriza a
          Hoje Belém a publicá-las. A equipe pode editar, recusar ou remover
          eventos a qualquer momento.
        </p>
        <h2>Privacidade</h2>
        <p>
          Como tratamos seus dados está na{" "}
          <Link href="/privacidade">Política de privacidade</Link>.
        </p>
        <h2>Mudanças nestes termos</h2>
        <p>
          Estes termos podem ser atualizados. A versão em vigor é sempre a
          publicada nesta página.
        </p>
      </section>
    </article>
  );
}
