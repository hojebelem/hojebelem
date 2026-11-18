import { describe, expect, it } from "vitest";
import { eventDateRange, getEventStatus, isCollectorSource, isEventEnded, startOfTodayInBelem } from "./events";
const now = new Date("2026-08-14T12:00:00-03:00");
describe("getEventStatus em America/Belem",()=>{
  it("calcula datas e respeita overrides",()=>{
    expect(getEventStatus({startAt:new Date("2026-08-14T20:00:00-03:00")},now)).toBe("É Hoje");
    expect(getEventStatus({startAt:new Date("2026-08-15T20:00:00-03:00")},now)).toBe("É amanhã");
    expect(getEventStatus({startAt:new Date("2026-08-16T20:00:00-03:00")},now)).toBe("Em breve");
    expect(getEventStatus({startAt:new Date("2026-08-13T20:00:00-03:00")},now)).toBe("Já encerrou");
    expect(getEventStatus({startAt:now,statusOverride:"POSTPONED"},now)).toBe("Adiado");
    expect(getEventStatus({startAt:now,statusOverride:"CANCELLED"},now)).toBe("Cancelado");
  });
  it("começa o dia à meia-noite de Belém, não do servidor",()=>{
    expect(startOfTodayInBelem(new Date("2026-08-15T01:00:00Z")).toISOString()).toBe("2026-08-14T03:00:00.000Z");
  });
  it("usa o horário final quando ele foi informado",()=>{
    const ongoing={startAt:new Date("2026-08-13T20:00:00-03:00"),endAt:new Date("2026-08-14T14:00:00-03:00")};
    expect(isEventEnded(ongoing,now)).toBe(false);
    expect(getEventStatus(ongoing,now)).toBe("É Hoje");
    expect(isEventEnded({...ongoing,endAt:new Date("2026-08-14T11:00:00-03:00")},now)).toBe(true);
  });
});

// intervalo [from, to) em horário de Belém para o filtro "Quando" (?data=...)
describe("eventDateRange",()=>{
  const d=(s:string)=>new Date(`${s}-03:00`);
  // 14/08/2026 é sexta-feira
  it("hoje e amanhã",()=>{
    expect(eventDateRange("hoje",now)).toEqual({from:d("2026-08-14T00:00:00"),to:d("2026-08-15T00:00:00")});
    expect(eventDateRange("amanha",now)).toEqual({from:d("2026-08-15T00:00:00"),to:d("2026-08-16T00:00:00")});
  });
  it("fim de semana vai de sábado 00:00 até segunda 00:00",()=>{
    expect(eventDateRange("fim-de-semana",now)).toEqual({from:d("2026-08-15T00:00:00"),to:d("2026-08-17T00:00:00")});
  });
  it("no domingo, o fim de semana começa hoje",()=>{
    expect(eventDateRange("fim-de-semana",d("2026-08-16T10:00:00"))).toEqual({from:d("2026-08-16T00:00:00"),to:d("2026-08-17T00:00:00")});
  });
  it("aceita um dia no formato AAAA-MM-DD",()=>{
    expect(eventDateRange("2026-08-20",now)).toEqual({from:d("2026-08-20T00:00:00"),to:d("2026-08-21T00:00:00")});
  });
  it("valor desconhecido não filtra",()=>{
    expect(eventDateRange("qualquer",now)).toBeNull();
    expect(eventDateRange(undefined,now)).toBeNull();
  });
});

describe("isCollectorSource", () => {
  it("diferencia origens automatizadas de manual/organizador", () => {
    expect(isCollectorSource("sympla")).toBe(true);
    expect(isCollectorSource("shotgun")).toBe(true);
    expect(isCollectorSource("manual")).toBe(false);
    expect(isCollectorSource("organizador")).toBe(false);
    expect(isCollectorSource(null)).toBe(false);
  });
});
