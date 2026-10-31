import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { formatEventFullDate, getEventStatus } from "@/lib/events";
import { FavoriteButton } from "@/components/favorite-button";
import { isOptimizableImage } from "@/lib/images";
export type CardEvent = {
  id: string;
  slug: string;
  title: string;
  coverImageUrl: string;
  startAt: Date;
  endAt?: Date | null;
  venueName: string;
  price: number | null;
  statusOverride?: "CANCELLED" | "POSTPONED" | null;
  category: { name: string; slug: string; icon: string };
};
export function EventCard({ event }: { event: CardEvent }) {
  const status = getEventStatus(event),
    ended = status === "Já encerrou";
  return (
    <article className={`event-card${ended ? " event-card-ended" : ""}`}>
      <div className="event-image">
        <Link href={`/eventos/${event.slug}`} className="event-image-link">
          <Image
            src={event.coverImageUrl}
            unoptimized={!isOptimizableImage(event.coverImageUrl)}
            alt={`Capa do evento ${event.title}`}
            fill
            sizes="(max-width: 768px) 82vw, 360px"
            style={
              ended
                ? { filter: "blur(4px)", transform: "scale(1.06)" }
                : undefined
            }
          />
          {ended && (
            <span className="ended-image-shade">
              <b>ENCERRADO</b>
            </span>
          )}
          <span className="category-badge">
            {event.category.icon} {event.category.name}
          </span>
        </Link>
        <FavoriteButton eventId={event.id} />
      </div>
      <div className="event-body">
        <h3>
          <Link href={`/eventos/${event.slug}`}>{event.title}</Link>
        </h3>
        <p>
          <MapPin /> {event.venueName}
        </p>
        <p className="event-when">{formatEventFullDate(event.startAt)}</p>
        <div className="event-price">
          <span className={`event-tag${ended ? " ended-status-text" : ""}`}>
            {status}
          </span>
          <span className="event-price-value">
            <small>{event.price == null ? "entrada" : "a partir de"}</small>
            <strong>
              {event.price == null
                ? "Gratuito"
                : `R$ ${event.price.toFixed(2).replace(".", ",")}`}
            </strong>
          </span>
        </div>
      </div>
    </article>
  );
}
