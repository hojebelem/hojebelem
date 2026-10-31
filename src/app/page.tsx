import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SearchForm } from "@/components/search-form";
import { CategoryRow } from "@/components/category-row";
import { EventSection } from "@/components/section";
import { getCategories, getEvents } from "@/lib/data";
import { formatEventFullDate, getEventStatus } from "@/lib/events";
import { HeroSlideshow } from "@/components/hero-slideshow";
import { HeroCarousel } from "@/components/hero-carousel";
import { InstagramHighlight } from "@/components/instagram-highlight";
import { SignupHighlight } from "@/components/signup-highlight";
import { GoogleAdSlot } from "@/components/google-ads";
export default async function Home() {
  const [events, categories] = await Promise.all([
    getEvents(),
    getCategories(),
  ]);
  const today = events.filter((e) => getEventStatus(e) === "É Hoje"),
    tomorrow = events.filter((e) => getEventStatus(e) === "É amanhã"),
    later = events.filter((e) => !today.includes(e) && !tomorrow.includes(e)),
    featured = events.filter((e) => e.isFeatured);
  // destaques no banner; sem destaque, os próximos eventos
  const heroEvents = (featured.length ? featured : events)
    .slice(0, 5)
    .map((e) => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      coverImageUrl: e.coverImageUrl,
      venueName: e.venueName,
      when: formatEventFullDate(e.startAt),
      status: getEventStatus(e),
    }));
  return (
    <>
      <section className={`hero${heroEvents.length ? " hero-events" : ""}`}>
        {heroEvents.length === 0 && (
          <>
            <HeroSlideshow />
            <div className="hero-overlay" />
          </>
        )}
        <div className="hero-inner">
          <div className="hero-copy">
            <h1>
              Descubra o que
              <br />
              acontece em <em>Belém.</em>
            </h1>
            <p>
              Shows, sabores, encontros e experiências para viver a cidade do
              seu jeito.
            </p>
            <SearchForm />
            <Link className="hero-link" href="/explorar">
              Explorar todos os eventos <ArrowUpRight />
            </Link>
          </div>
          {heroEvents.length > 0 && <HeroCarousel events={heroEvents} />}
        </div>
      </section>
      <div className="shell">
        <section className="categories-section">
          <div className="section-heading">
            <div>
              <p>ENCONTRE SEU ROLÊ</p>
              <h2>Explore por categoria</h2>
            </div>
            <Link href="/explorar">Ver todas →</Link>
          </div>
          <CategoryRow categories={categories} />
        </section>
        {today.length > 0 && (
          <EventSection
            eyebrow="ACONTECE AGORA"
            title="Hoje em Belém"
            href="/eventos?data=hoje"
            events={today}
          />
        )}
        {tomorrow.length > 0 && (
          <EventSection
            eyebrow="PROGRAME-SE"
            title="Amanhã"
            href="/eventos?data=amanha"
            events={tomorrow}
          />
        )}
        {later.length > 0 && (
          <EventSection
            eyebrow="NOS PRÓXIMOS DIAS"
            title="Em breve"
            events={later}
          />
        )}
        {events.length === 0 && (
          <EventSection title="Próximos eventos" events={[]} />
        )}
        <GoogleAdSlot
          slot={process.env.NEXT_PUBLIC_ADSENSE_HOME_SLOT}
          className="ad-home"
        />
        <InstagramHighlight />
        {featured.length > 0 && (
          <EventSection
            eyebrow="ESCOLHAS DA CURADORIA"
            title="Destaques"
            href="/eventos?destaque=1"
            events={featured}
          />
        )}
      </div>
      <SignupHighlight />
    </>
  );
}
