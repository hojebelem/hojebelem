import { CategoryGrid } from "@/components/category-grid";
import { EventSection } from "@/components/section";
import { getCategories, getEvents } from "@/lib/data";

export default async function Explore() {
  const [categories, events] = await Promise.all([
    getCategories(),
    getEvents(),
  ]);
  const featured = events.filter((event) => event.isFeatured);
  return (
    <div className="shell page-space">
      <div className="page-intro">
        <p>DESCUBRA BELÉM</p>
        <h1>Qual é a sua vibe?</h1>
        <span>Explore a cidade por tudo que ela tem a oferecer.</span>
      </div>
      <section id="categorias" className="all-categories">
        <CategoryGrid categories={categories} />
      </section>
      {featured.length > 0 && (
        <EventSection
          title="Em destaque"
          href="/eventos?destaque=1"
          events={featured}
        />
      )}
      {["musica-ao-vivo", "gastronomia", "teatro"].map((slug) => {
        const category = categories.find((item) => item.slug === slug);
        const filtered = events.filter((event) => event.category.slug === slug);
        return filtered.length > 0 ? (
          <EventSection
            key={slug}
            title={category?.name ?? slug}
            href={`/eventos?categoria=${slug}`}
            events={filtered}
          />
        ) : null;
      })}
    </div>
  );
}
