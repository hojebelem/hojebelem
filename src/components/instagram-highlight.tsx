import Image from "next/image";
import { MapPin } from "lucide-react";

const posts = [
  { src: "/images/hero-musica.webp", alt: "Show em Belém" },
  {
    src: "/images/hero-gastronomia.webp",
    alt: "Experiência gastronômica em Belém",
  },
  { src: "/images/hero-belem.webp", alt: "Evento cultural em Belém" },
];

export function InstagramHighlight() {
  return (
    <section className="instagram-highlight">
      <div className="instagram-copy">
        <h2>Hoje Belém no Instagram</h2>
        <span>
          Destaques da programação semanal e novidades em @hojebelem.
        </span>
        <a
          href="https://www.instagram.com/hojebelem/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Seguir @hojebelem <b>→</b>
        </a>
      </div>
      <div
        className="instagram-visual"
        aria-label="Prévia do perfil da Hoje Belém no Instagram"
      >
        <div className="instagram-phone">
          <div className="phone-speaker" />
          <div className="instagram-profile-head">
            <div className="mini-avatar">HB</div>
            <div>
              <b>hojebelem</b>
              <span>
                <MapPin /> Belém, Pará
              </span>
            </div>
            <button type="button" tabIndex={-1}>
              Seguir
            </button>
          </div>
          <div className="instagram-posts">
            {posts.map((post) => (
              <div key={post.src}>
                <Image src={post.src} alt={post.alt} fill sizes="140px" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
