"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { eventsHref, EventsParams } from "./events-href";

const PRESETS = [
  { value: "hoje", label: "Hoje" },
  { value: "amanha", label: "Amanhã" },
  { value: "fim-de-semana", label: "Fim de semana" },
];

export function DateFilters({ params }: { params: EventsParams }) {
  const router = useRouter();
  const selected = params.data;
  const customDay = selected && /^\d{4}-\d{2}-\d{2}$/.test(selected) ? selected : "";
  return (
    <div className="date-filters">
      <span>Quando</span>
      <div className="filter-scroll">
        <Link
          href={eventsHref(params, { data: undefined })}
          className={!selected ? "selected" : ""}
          scroll={false}
        >
          Todos
        </Link>
        {PRESETS.map((preset) => (
          <Link
            key={preset.value}
            href={eventsHref(params, { data: preset.value })}
            className={selected === preset.value ? "selected" : ""}
            scroll={false}
          >
            {preset.label}
          </Link>
        ))}
        <input
          type="date"
          aria-label="Escolher uma data"
          className={customDay ? "selected" : ""}
          value={customDay}
          onChange={(event) =>
            router.push(
              eventsHref(params, { data: event.target.value || undefined }),
              { scroll: false },
            )
          }
        />
      </div>
    </div>
  );
}
