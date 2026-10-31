import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  CalendarPlus,
  Clock3,
  ExternalLink,
  MapPin,
} from "lucide-react";
import { getEvent } from "@/lib/data";
import {
  formatEventDate,
  formatEventTime,
  getEventStatus,
  isEventEnded,
} from "@/lib/events";
import { ShareButton } from "@/components/share-button";
import { BackButton } from "@/components/back-button";

// "20:00" ou "20:00 às 23:00"; se termina em outro dia, "20:00 até 02 nov, 02:00"
function formatEventTimeRange(start: Date, end: Date | null) {
  if (!end) return formatEventTime(start);
  const sameDay = formatEventDate(start) === formatEventDate(end);
  return sameDay
    ? `${formatEventTime(start)} às ${formatEventTime(end)}`
    : `${formatEventTime(start)} até ${formatEventDate(end)}, ${formatEventTime(end)}`;
}

// link do Google Agenda já preenchido; sem hora final, assume 2 horas
function googleCalendarUrl(e: {
  title: string;
  startAt: Date;
  endAt: Date | null;
  venueName: string;
  address: string;
  externalPurchaseLink: string;
}) {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const end = e.endAt ?? new Date(e.startAt.getTime() + 2 * 3_600_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${stamp(e.startAt)}/${stamp(end)}`,
    location: `${e.venueName}, ${e.address}, Belém - PA`,
    details: e.externalPurchaseLink,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
import { FavoriteButton } from "@/components/favorite-button";
import { GoogleAdSlot } from "@/components/google-ads";
import { isOptimizableImage } from "@/lib/images";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const e = await getEvent((await params).slug);
  if (!e) return { title: "Evento não encontrado" };
  return {
    title: e.title,
    description: e.description.slice(0, 150),
    alternates: { canonical: `/eventos/${e.slug}` },
    openGraph: {
      title: e.title,
      description: e.description.slice(0, 150),
      images: [e.coverImageUrl],
    },
  };
}

export default async function EventDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const e = await getEvent((await params).slug);
  if (!e) notFound();
  const ended = isEventEnded(e);
  // dados estruturados: o Google mostra o evento com data e local na busca
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.title,
    description: e.description,
    startDate: e.startAt.toISOString(),
    ...(e.endAt ? { endDate: e.endAt.toISOString() } : {}),
    eventStatus:
      e.statusOverride === "CANCELLED"
        ? "https://schema.org/EventCancelled"
        : e.statusOverride === "POSTPONED"
          ? "https://schema.org/EventPostponed"
          : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    image: [e.coverImageUrl],
    location: {
      "@type": "Place",
      name: e.venueName,
      address: `${e.address}, Belém - PA`,
    },
    offers: {
      "@type": "Offer",
      url: e.externalPurchaseLink,
      price: e.price ?? 0,
      priceCurrency: "BRL",
    },
  };
  return (
    <div className={`detail-page${ended ? " detail-page-ended" : ""}`}>
      <script
        type="application/ld+json"
        // "<" escapado para o texto do evento não fechar a tag script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="detail-cover">
        <Image
          src={e.coverImageUrl}
          unoptimized={!isOptimizableImage(e.coverImageUrl)}
          alt={`Capa de ${e.title}`}
          fill
          preload
          sizes="100vw"
          style={
            ended
              ? { filter: "blur(6px)", transform: "scale(1.04)" }
              : undefined
          }
        />
        <div className="detail-shade" />
        {ended && <div className="detail-ended-badge">ENCERRADO</div>}
        <div className="detail-actions shell">
          <BackButton />
          <div>
            <ShareButton />
            <FavoriteButton eventId={e.id} className="circle-action" />
          </div>
        </div>
        <div className="detail-title shell">
          <span className="category-badge">
            {e.category.icon} {e.category.name}
          </span>
          <h1>{e.title}</h1>
          <p>
            <MapPin /> {e.venueName}, Belém
          </p>
        </div>
      </div>
      <div className="detail-layout shell">
        <article className="detail-content">
          <div className="detail-facts">
            <div>
              <CalendarDays />
              <span>
                <small>DATA</small>
                <b>
                  {formatEventDate(e.startAt)} • {getEventStatus(e)}
                </b>
              </span>
            </div>
            <div>
              <Clock3 />
              <span>
                <small>HORÁRIO</small>
                <b>{formatEventTimeRange(e.startAt, e.endAt)}</b>
              </span>
            </div>
            <div>
              <MapPin />
              <span>
                <small>LOCAL</small>
                <b>{e.venueName}</b>
              </span>
            </div>
          </div>
          <section>
            <p className="eyebrow">SOBRE O EVENTO</p>
            <p className="description">{e.description}</p>
          </section>
          <GoogleAdSlot
            slot={process.env.NEXT_PUBLIC_ADSENSE_DETAIL_SLOT}
            format="rectangle"
          />
          <section>
            <p className="eyebrow">ONDE VAI SER</p>
            <h2>{e.venueName}</h2>
            <p>{e.address}</p>
            <a
              className="detail-link"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${e.venueName}, ${e.address}, Belém - PA`)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MapPin /> Ver no mapa
            </a>
          </section>
        </article>
        <aside className={`booking-card${ended ? " booking-card-ended" : ""}`}>
          <p>Ingresso</p>
          <div>
            {e.price == null ? (
              <strong>Gratuito</strong>
            ) : (
              <>
                <small>a partir de</small>
                <strong>R$ {e.price.toFixed(2).replace(".", ",")}</strong>
              </>
            )}
          </div>
          {ended ? (
            <button className="ended-booking-button" type="button" disabled>
              Evento encerrado
            </button>
          ) : (
            <a
              className="gradient-button"
              href={e.externalPurchaseLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              Reservar agora <ExternalLink />
            </a>
          )}
          {!ended && e.socialLink && (
            <a
              className="secondary-button"
              href={e.socialLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver evento
            </a>
          )}
          {!ended && (
            <a
              className="detail-link"
              href={googleCalendarUrl(e)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <CalendarPlus /> Adicionar à agenda
            </a>
          )}
          <small>
            {ended
              ? "A venda de ingressos não está mais disponível."
              : "Você será direcionado para a plataforma do organizador."}
          </small>
          {"source" in e && e.source === "sympla" && (
            <small>Informações e ingressos via Sympla.</small>
          )}
        </aside>
      </div>
      <div className={`mobile-book${ended ? " mobile-book-ended" : ""}`}>
        <div>
          <small>Ingresso</small>
          <b>
            {ended
              ? "Encerrado"
              : e.price == null
                ? "Gratuito"
                : `R$ ${e.price.toFixed(2).replace(".", ",")}`}
          </b>
        </div>
        {ended ? (
          <button type="button" disabled>
            Evento encerrado
          </button>
        ) : (
          <a
            href={e.externalPurchaseLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            Reservar agora
          </a>
        )}
      </div>
    </div>
  );
}
