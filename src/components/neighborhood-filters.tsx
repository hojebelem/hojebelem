import Link from "next/link";
import { BELEM_NEIGHBORHOODS } from "@/lib/events";
import { eventsHref, EventsParams } from "./events-href";

export function NeighborhoodFilters({ params }: { params: EventsParams }) {
  const selected = params.bairro;
  return (
    <div className="date-filters neighborhood-filters">
      <span>Bairro</span>
      <div className="filter-scroll">
        <Link
          href={eventsHref(params, { bairro: undefined })}
          className={!selected ? "selected" : ""}
          scroll={false}
        >
          Todos
        </Link>
        {BELEM_NEIGHBORHOODS.map((bairro) => (
          <Link
            key={bairro.slug}
            href={eventsHref(params, { bairro: bairro.slug })}
            className={selected === bairro.slug ? "selected" : ""}
            scroll={false}
          >
            {bairro.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
