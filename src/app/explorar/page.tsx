import { CategoryGrid } from "@/components/category-grid";
import { EventSection } from "@/components/section";
import { getCategories, getEvents } from "@/lib/data";

const HIGHLIGHT_SLUGS = ["musica-ao-vivo", "gastronomia", "teatro"] as const;

export default async function Explore() {
  const [categories, featured, ...byCategory] = await Promise.all([
    getCategories(),
    getEvents({ featured: true, limit: 24 }),
    ...HIGHLIGHT_SLUGS.map((slug) => getEvents({ category: slug, limit: 24 })),
  ]);
  return (
    <div className="shell page-space">
      <div className="page-intro">
        <h1>Explore por categoria</h1>
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
      {HIGHLIGHT_SLUGS.map((slug, index) => {
        const category = categories.find((item) => item.slug === slug);
        const filtered = byCategory[index];
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
