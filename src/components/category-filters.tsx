import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { eventsHref, EventsParams } from "./events-href";
import { ScrollRow } from "./scroll-row";

export function CategoryFilters({
  categories,
  selected,
  params = {},
}: {
  categories: { id: string; name: string; slug: string; icon: string }[];
  selected?: string;
  // parâmetros atuais da URL (data, ordem...), mantidos ao trocar a categoria
  params?: EventsParams;
}) {
  return (
    <div className="category-filter-area">
      <ScrollRow className="filter-scroll">
        <Link
          href={eventsHref(params, { categoria: undefined })}
          className={!selected ? "selected" : ""}
          scroll={false}
        >
          Todos
        </Link>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={eventsHref(params, { categoria: category.slug })}
            className={selected === category.slug ? "selected" : ""}
            scroll={false}
          >
            {category.icon} {category.name}
          </Link>
        ))}
      </ScrollRow>
      <Link className="categories-toggle" href="/explorar#categorias">
        <ChevronRight /> Ver todas as categorias
      </Link>
    </div>
  );
}
