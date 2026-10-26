/**
 * Utilidades de fecha/hora. Todas las fechas se almacenan en UTC y solo se
 * convierten a la zona institucional para presentación y para el corte del día.
 */

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;

export function minutesBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / MS_PER_MINUTE));
}

export function hoursBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / MS_PER_HOUR);
}

export function roundHours(value: number): number {
  return Math.round(value * 10) / 10;
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * MS_PER_HOUR);
}

type ZonedParts = { year: number; month: number; day: number };

/** Desfase de la zona horaria (minutos) para una fecha concreta. */
export function timezoneOffsetMinutes(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
  });
  const part = formatter.formatToParts(date).find((item) => item.type === 'timeZoneName');
  const value = part?.value ?? 'GMT+00:00';
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(value);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3]));
}

export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  return {
    year: Number(parts.find((p) => p.type === 'year')?.value ?? 0),
    month: Number(parts.find((p) => p.type === 'month')?.value ?? 0),
    day: Number(parts.find((p) => p.type === 'day')?.value ?? 0),
  };
}

/** Año institucional (evita que un registro del 1 de enero caiga en el año anterior). */
export function institutionYear(date: Date, timeZone: string): number {
  return zonedParts(date, timeZone).year;
}

/** Inicio del día institucional expresado en UTC. */
export function startOfInstitutionDay(date: Date, timeZone: string): Date {
  const { year, month, day } = zonedParts(date, timeZone);
  const offset = timezoneOffsetMinutes(date, timeZone);
  return new Date(Date.UTC(year, month - 1, day) - offset * MS_PER_MINUTE);
}

/** Fin del día institucional (exclusivo) expresado en UTC. */
export function endOfInstitutionDay(date: Date, timeZone: string): Date {
  return new Date(startOfInstitutionDay(date, timeZone).getTime() + 24 * MS_PER_HOUR);
}
