import Link from "next/link";
import { EventCard } from "@/components/event-card";
import { SearchForm } from "@/components/search-form";
import { CategoryFilters } from "@/components/category-filters";
import { DateFilters } from "@/components/date-filters";
import { SortSelect } from "@/components/sort-select";
import { eventsHref } from "@/components/events-href";
import { GoogleAdSlot } from "@/components/google-ads";
import {
  countEvents,
  EVENTS_PAGE_SIZE,
  getCategories,
  getEvents,
} from "@/lib/data";

const MAX_PAGES = 20;

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    categoria?: string;
    preco?: string;
    filtros?: string;
    data?: string;
    ordem?: string;
    destaque?: string;
    pagina?: string;
  }>;
}) {
  const p = await searchParams;
  const page = Math.min(
    Math.max(Number.parseInt(p.pagina ?? "", 10) || 1, 1),
    MAX_PAGES,
  );
  const filters = {
    search: p.q,
    category: p.categoria,
    price: p.preco,
    date: p.data,
    featured: p.destaque === "1",
  };
  const [events, categories] = await Promise.all([
    getEvents({ ...filters, sort: p.ordem === "preco" ? "preco" : "data", page }),
    getCategories(),
  ]);
  const mayHaveMore = events.length >= EVENTS_PAGE_SIZE * page;
  const total = mayHaveMore ? await countEvents(filters) : events.length;
  const params = {
    q: p.q,
    categoria: p.categoria,
    preco: p.preco,
    ordem: p.ordem,
    destaque: p.destaque,
    data: p.data,
  };
  return (
    <div className="shell page-space">
      <div className="page-intro">
        <p>AGENDA DA CIDADE</p>
        <h1>Eventos em Belém</h1>
        <span>Encontre o próximo lugar onde você quer estar.</span>
      </div>
      <SearchForm
        defaultValue={p.q}
        categories={categories}
        defaultCategory={p.categoria}
        defaultPrice={p.preco}
        filtersOpen={p.filtros === "1" || Boolean(p.preco)}
        keep={{ data: p.data, ordem: p.ordem, destaque: p.destaque }}
      />
      <DateFilters params={params} />
      <CategoryFilters
        categories={categories}
        selected={p.categoria}
        params={params}
      />
      <div className="results-meta">
        <b>
          {total} {total === 1 ? "evento encontrado" : "eventos encontrados"}
        </b>
        <SortSelect params={params} />
      </div>
      <GoogleAdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_LIST_SLOT} />
      {events.length ? (
        <div className="event-grid">
          {events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <b>Nenhum evento encontrado</b>
          <p>Tente outro termo ou remova um dos filtros.</p>
        </div>
      )}
      {total > events.length && page < MAX_PAGES && (
        <div className="load-more">
          <Link
            href={eventsHref(params, { pagina: String(page + 1) })}
            scroll={false}
          >
            Carregar mais eventos
          </Link>
        </div>
      )}
    </div>
  );
}
