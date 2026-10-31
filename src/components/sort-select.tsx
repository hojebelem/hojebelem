"use client";
import { useRouter } from "next/navigation";
import { eventsHref, EventsParams } from "./events-href";

export function SortSelect({ params }: { params: EventsParams }) {
  const router = useRouter();
  return (
    <select
      aria-label="Ordenar eventos"
      value={params.ordem === "preco" ? "preco" : "data"}
      onChange={(event) =>
        router.push(
          eventsHref(params, {
            ordem: event.target.value === "preco" ? "preco" : undefined,
          }),
          { scroll: false },
        )
      }
    >
      <option value="data">Mais próximos</option>
      <option value="preco">Menor preço</option>
    </select>
  );
}
