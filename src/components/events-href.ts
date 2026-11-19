export type EventsParams = Partial<
  Record<
    "q" | "categoria" | "preco" | "ordem" | "destaque" | "data" | "bairro" | "visao" | "pagina",
    string
  >
>;

// URL de /eventos com os parâmetros atuais, trocando só os de `changes`
// (valor undefined remove o parâmetro). Mudar qualquer filtro volta à página 1.
export function eventsHref(params: EventsParams, changes: EventsParams) {
  const merged: EventsParams = { ...params, pagina: undefined, ...changes };
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) search.set(key, value);
  }
  const text = search.toString();
  return text ? `/eventos?${text}` : "/eventos";
}
