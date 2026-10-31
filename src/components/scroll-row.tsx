"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export function ScrollRow({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ left: false, right: false });
  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    // só re-renderiza quando uma seta aparece ou some, não a cada quadro da rolagem
    setEdge((prev) =>
      prev.left === left && prev.right === right ? prev : { left, right },
    );
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [update]);
  const frame = useRef(0);
  useEffect(() => {
    const el = ref.current;
    // se a pessoa rolar com o trackpad ou o dedo, a animação para e não briga
    const stop = () => cancelAnimationFrame(frame.current);
    el?.addEventListener("wheel", stop, { passive: true });
    el?.addEventListener("touchstart", stop, { passive: true });
    return () => {
      stop();
      el?.removeEventListener("wheel", stop);
      el?.removeEventListener("touchstart", stop);
    };
  }, []);
  // anda uma "página" inteira e para no início de um card. Animado em JS porque
  // o Chrome no Windows desliga o scroll "smooth" nativo quando as animações do
  // sistema estão desligadas; o deslize é pedido pelo usuário, então continua.
  const go = (direction: 1 | -1) => {
    const el = ref.current;
    const items = el ? ([...el.children] as HTMLElement[]) : [];
    if (!el || !items.length) return;
    const base = items[0].offsetLeft;
    const max = el.scrollWidth - el.clientWidth;
    const raw = el.scrollLeft + direction * el.clientWidth;
    const snapped = items
      .map((item) => item.offsetLeft - base)
      .reduce((best, x) => (Math.abs(x - raw) < Math.abs(best - raw) ? x : best));
    const moved = direction === 1 ? snapped > el.scrollLeft + 4 : snapped < el.scrollLeft - 4;
    const to = Math.max(0, Math.min(max, moved ? snapped : raw));
    const from = el.scrollLeft;
    const duration = 700;
    const start = performance.now();
    cancelAnimationFrame(frame.current);
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      el.scrollLeft = from + (to - from) * eased;
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  };
  return (
    <div className="scroll-wrap">
      {edge.left && (
        <button
          type="button"
          className="scroll-arrow scroll-arrow-left"
          aria-label="Ver opções anteriores"
          onClick={() => go(-1)}
        >
          <ChevronLeft />
        </button>
      )}
      <div ref={ref} className={className} onScroll={update}>
        {children}
      </div>
      {edge.right && (
        <button
          type="button"
          className="scroll-arrow scroll-arrow-right"
          aria-label="Ver mais opções"
          onClick={() => go(1)}
        >
          <ChevronRight />
        </button>
      )}
    </div>
  );
}
