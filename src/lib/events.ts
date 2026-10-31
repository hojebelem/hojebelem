import { format, fromZonedTime, toZonedTime } from "date-fns-tz";

export const TIMEZONE = "America/Belem";
export type EventOverride = "CANCELLED" | "POSTPONED" | null;

export type EventTiming = { startAt: Date; endAt?: Date | null; statusOverride?: EventOverride };

// "yyyy-MM-dd" do dia em Belém; texto nesse formato compara certo com < e ===
function dayInBelem(date: Date) {
  return format(toZonedTime(date, TIMEZONE), "yyyy-MM-dd");
}

export function startOfTodayInBelem(now = new Date()) {
  return fromZonedTime(`${dayInBelem(now)}T00:00:00`, TIMEZONE);
}

export function isEventEnded(event: EventTiming, now = new Date()) {
  // Com endAt, encerra no horário final; sem ele, ao fim do dia do início
  if (event.endAt) return event.endAt < now;
  return dayInBelem(event.startAt) < dayInBelem(now);
}

export function getEventStatus(event: EventTiming, now = new Date()) {
  if (event.statusOverride === "CANCELLED") return "Cancelado";
  if (event.statusOverride === "POSTPONED") return "Adiado";
  if (isEventEnded(event, now)) return "Já encerrou";
  const eventDay = dayInBelem(event.startAt);
  const today = dayInBelem(now);
  const tomorrow = dayInBelem(new Date(now.getTime() + 86_400_000));
  // começou antes e ainda não acabou (evento de vários dias) também é "hoje"
  if (eventDay <= today) return "É Hoje";
  if (eventDay === tomorrow) return "É amanhã";
  return "Em breve";
}

export function formatEventDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, day: "2-digit", month: "short" }).format(date).replace(".", "");
}

// "Sábado, 31 de Out às 16:00"
export function formatEventFullDate(date: Date) {
  const part = (type: string) =>
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: TIMEZONE,
      weekday: "long",
      day: "numeric",
      month: "short",
    })
      .formatToParts(date)
      .find((p) => p.type === type)?.value ?? "";
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const month = cap(part("month").replace(".", ""));
  return `${cap(part("weekday"))}, ${part("day")} de ${month} às ${formatEventTime(date)}`;
}

export function formatEventTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit" }).format(date);
}

const DAY_MS = 86_400_000; // Belém não tem horário de verão, então todo dia tem 24h
const SATURDAY = 6;
const DAYS_IN_WEEK = 7;
const DAY_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

// Intervalo [from, to) do filtro "Quando" (?data=): hoje, amanha, fim-de-semana ou AAAA-MM-DD
export function eventDateRange(value: string | undefined, now = new Date()): { from: Date; to: Date } | null {
  const today = startOfTodayInBelem(now);
  const range = (from: Date, days: number) => ({ from, to: new Date(from.getTime() + days * DAY_MS) });
  if (value === "hoje") return range(today, 1);
  if (value === "amanha") return range(new Date(today.getTime() + DAY_MS), 1);
  if (value === "fim-de-semana") {
    const weekday = toZonedTime(now, TIMEZONE).getDay(); // 0 = domingo
    const onWeekend = weekday === 0 || weekday === SATURDAY;
    const from = onWeekend ? today : new Date(today.getTime() + (SATURDAY - weekday) * DAY_MS);
    const nextMonday = new Date(today.getTime() + (((DAYS_IN_WEEK + 1 - weekday) % DAYS_IN_WEEK) || DAYS_IN_WEEK) * DAY_MS);
    return { from, to: nextMonday };
  }
  if (value && DAY_FORMAT.test(value)) {
    const from = fromZonedTime(`${value}T00:00:00`, TIMEZONE);
    // rejeita datas que não existem (ex.: 2026-02-31)
    if (Number.isNaN(from.getTime()) || dayInBelem(from) !== value) return null;
    return range(from, 1);
  }
  return null;
}
