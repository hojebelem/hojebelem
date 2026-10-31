import Link from "next/link";
import { EventCard, CardEvent } from "./event-card";
import { ScrollRow } from "./scroll-row";

export function EventSection({
  title,
  eyebrow,
  events,
  href = "/eventos",
}: {
  title: string;
  eyebrow?: string;
  events: CardEvent[];
  href?: string;
}) {
  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          {eyebrow && <p>{eyebrow}</p>}
          <h2>{title}</h2>
        </div>
        <Link href={href}>
          Ver todos <span>→</span>
        </Link>
      </div>
      {events.length ? (
        <ScrollRow className="event-row">
          {events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </ScrollRow>
      ) : (
        <div className="empty-state">Nenhum evento por aqui ainda.</div>
      )}
    </section>
  );
}
