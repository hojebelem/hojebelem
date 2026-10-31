import { format, fromZonedTime, toZonedTime } from "date-fns-tz";

export const TIMEZONE = "America/Belem";
export type EventOverride = "CANCELLED" | "POSTPONED" | null;

export type EventTiming = { startAt: Date; endAt?: Date | null; statusOverride?: EventOverride };

export function startOfTodayInBelem(now = new Date()) {
  return fromZonedTime(`${format(toZonedTime(now, TIMEZONE), "yyyy-MM-dd")}T00:00:00`, TIMEZONE);
}

export function isEventEnded(event: EventTiming, now = new Date()) {
  // Com endAt, encerra no horário final; sem ele, ao fim do dia do início
  if (event.endAt) return event.endAt < now;
  const eventDay = format(toZonedTime(event.startAt, TIMEZONE), "yyyy-MM-dd");
  const today = format(toZonedTime(now, TIMEZONE), "yyyy-MM-dd");
  return eventDay < today;
}

export function getEventStatus(event: EventTiming, now = new Date()) {
  if (event.statusOverride === "CANCELLED") return "Cancelado";
  if (event.statusOverride === "POSTPONED") return "Adiado";
  if (isEventEnded(event, now)) return "Já encerrou";
  const eventDay = format(toZonedTime(event.startAt, TIMEZONE), "yyyy-MM-dd");
  const today = format(toZonedTime(now, TIMEZONE), "yyyy-MM-dd");
  const tomorrow = format(toZonedTime(new Date(now.getTime() + 86_400_000), TIMEZONE), "yyyy-MM-dd");
  if (eventDay < today) return "É Hoje";
  if (eventDay === today) return "É Hoje";
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
