"use client";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type HeroEvent = {
  id: string;
  slug: string;
  title: string;
  coverImageUrl: string;
  venueName: string;
  when: string;
  status: string;
};

// posição de cada card em relação ao do meio: -2..2 aparecem, o resto some
const layout: Record<number, { x: number; scale: number; opacity: number }> = {
  0: { x: 0, scale: 1, opacity: 1 },
  1: { x: 46, scale: 0.8, opacity: 0.6 },
  2: { x: 78, scale: 0.64, opacity: 0.3 },
};

export function HeroCarousel({ events }: { events: HeroEvent[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = events.length;
  const go = (step: number) => setActive((a) => (a + step + count) % count);

  useEffect(() => {
    if (paused || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setActive((a) => (a + 1) % count),
      6000,
    );
    return () => window.clearInterval(timer);
  }, [paused, count]);

  const current = events[active];
  return (
    <div
      className="coverflow"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        className="coverflow-stage"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        {events.map((event, i) => {
          // menor distância circular até o card ativo
          let offset = i - active;
          if (offset > count / 2) offset -= count;
          if (offset < -count / 2) offset += count;
          const pos = layout[Math.abs(offset)];
          const center = offset === 0;
          return (
            <Link
              key={event.id}
              href={`/eventos/${event.slug}`}
              className={`coverflow-card${center ? " is-active" : ""}`}
              tabIndex={center ? 0 : -1}
              aria-hidden={!center}
              onClick={(e) => {
                if (!center) {
                  e.preventDefault();
                  setActive(i);
                }
              }}
              style={{
                transform: `translateX(${pos ? Math.sign(offset) * pos.x : 0}%) scale(${pos?.scale ?? 0.5})`,
                opacity: pos?.opacity ?? 0,
                zIndex: 10 - Math.abs(offset),
                pointerEvents: pos ? "auto" : "none",
              }}
            >
              <Image
                src={event.coverImageUrl}
                alt={center ? `Capa do evento ${event.title}` : ""}
                fill
                sizes="(max-width: 800px) 90vw, 460px"
                preload={i === 0}
              />
              {center && <span className="coverflow-tag">{event.status}</span>}
            </Link>
          );
        })}
      </div>
      {/* setas fora do palco: o palco tem máscara de esmaecimento nas bordas */}
      {count > 1 && (
          <>
            <button
              type="button"
              className="scroll-arrow coverflow-prev"
              aria-label="Evento anterior"
              onClick={() => go(-1)}
            >
              <ChevronLeft />
            </button>
            <button
              type="button"
              className="scroll-arrow coverflow-next"
              aria-label="Próximo evento"
              onClick={() => go(1)}
            >
              <ChevronRight />
            </button>
          </>
        )}
      {count > 1 && (
        <div className="coverflow-dots">
          {events.map((event, i) => (
            <button
              key={event.id}
              type="button"
              className={i === active ? "active" : ""}
              aria-label={`Mostrar ${event.title}`}
              aria-current={i === active ? "true" : undefined}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
      )}
      <Link href={`/eventos/${current.slug}`} className="coverflow-caption">
        <b>{current.title}</b>
        <span>
          <MapPin /> {current.venueName}
        </span>
        <span>{current.when}</span>
      </Link>
    </div>
  );
}
