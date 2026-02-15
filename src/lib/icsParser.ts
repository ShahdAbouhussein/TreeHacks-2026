export interface ParsedEvent {
  title: string;
  start: Date;
  end: Date;
  description: string;
  location: string;
  allDay: boolean;
}

// How far into the future to expand recurring events
const RECURRENCE_HORIZON_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

/**
 * Lightweight ICS parser — no dependencies.
 * Splits on VEVENT blocks, extracts fields, and expands RRULE recurrences.
 */
export function parseIcsFile(content: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];

  // Unfold long lines (RFC 5545 §3.1): a CRLF followed by a single space/tab
  const unfolded = content.replace(/\r?\n[ \t]/g, "");

  const blocks = unfolded.split("BEGIN:VEVENT");
  // First element is everything before the first VEVENT — skip it
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("END:VEVENT")[0];

    const get = (key: string): string => {
      // Match KEY;params:value  or  KEY:value
      const re = new RegExp(`^${key}[;:](.*)$`, "m");
      const m = block.match(re);
      if (!m) return "";
      const raw = m[1];
      const colonIdx = raw.indexOf(":");
      return colonIdx !== -1 ? raw.substring(colonIdx + 1) : raw;
    };

    const dtStartRaw = get("DTSTART");
    if (!dtStartRaw) continue;

    const start = parseIcsDate(dtStartRaw);
    if (isNaN(start.getTime())) continue;

    const dtEndRaw = get("DTEND");
    const end = dtEndRaw
      ? parseIcsDate(dtEndRaw)
      : new Date(start.getTime() + 60 * 60 * 1000);

    const allDay = dtStartRaw.length === 8 ||
      block.match(/DTSTART;VALUE=DATE[^-T]/) !== null;

    const title = get("SUMMARY") || "Untitled";
    const description = get("DESCRIPTION");
    const location = get("LOCATION");
    const duration = end.getTime() - start.getTime();

    const rrule = get("RRULE");

    if (!rrule) {
      // Single event
      events.push({ title, start, end, description, location, allDay });
      continue;
    }

    // Parse EXDATE (excluded dates)
    const exdateRaw = get("EXDATE");
    const exdates = new Set<string>();
    if (exdateRaw) {
      for (const d of exdateRaw.split(",")) {
        const parsed = parseIcsDate(d.trim());
        if (!isNaN(parsed.getTime())) {
          exdates.add(parsed.toISOString().slice(0, 10));
        }
      }
    }

    // Expand RRULE
    const occurrences = expandRRule(rrule, start, exdates);
    for (const occStart of occurrences) {
      events.push({
        title,
        start: occStart,
        end: new Date(occStart.getTime() + duration),
        description,
        location,
        allDay,
      });
    }
  }

  return events;
}

function parseIcsDate(v: string): Date {
  // Formats: 20250214T153000Z, 20250214T153000, 20250214
  const s = v.replace(/[^0-9TZ]/g, "");
  if (s.length === 8) {
    return new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00:00`);
  }
  const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}${s.endsWith("Z") ? "Z" : ""}`;
  return new Date(iso);
}

/**
 * Expand an RRULE into concrete occurrence start dates.
 * Supports FREQ=DAILY/WEEKLY/MONTHLY/YEARLY with INTERVAL, COUNT, UNTIL, BYDAY.
 */
function expandRRule(rrule: string, start: Date, exdates: Set<string>): Date[] {
  const parts: Record<string, string> = {};
  for (const part of rrule.split(";")) {
    const [k, v] = part.split("=");
    if (k && v) parts[k] = v;
  }

  const freq = parts.FREQ;
  if (!freq) return [start];

  const interval = parseInt(parts.INTERVAL || "1", 10);
  const count = parts.COUNT ? parseInt(parts.COUNT, 10) : undefined;
  const until = parts.UNTIL ? parseIcsDate(parts.UNTIL) : undefined;
  const horizon = new Date(start.getTime() + RECURRENCE_HORIZON_MS);
  const endDate = until && until < horizon ? until : horizon;

  // BYDAY for weekly recurrence (e.g. "MO,WE,FR")
  const byDay = parts.BYDAY ? parts.BYDAY.split(",") : [];
  const dayMap: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  const byDayNums = byDay.map((d) => dayMap[d]).filter((n) => n !== undefined);

  const results: Date[] = [];
  const maxOccurrences = count ?? 500; // safety cap

  if (freq === "WEEKLY" && byDayNums.length > 0) {
    // For WEEKLY+BYDAY: iterate week by week, emit matching days
    let weekStart = new Date(start);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // go to Sunday

    outer:
    while (weekStart <= endDate) {
      for (const dayNum of byDayNums) {
        const occ = new Date(weekStart);
        occ.setDate(weekStart.getDate() + dayNum);
        occ.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), 0);

        if (occ < start) continue;
        if (occ > endDate) break outer;
        if (exdates.has(occ.toISOString().slice(0, 10))) continue;

        results.push(occ);
        if (results.length >= maxOccurrences) break outer;
      }
      weekStart.setDate(weekStart.getDate() + 7 * interval);
    }
  } else {
    // DAILY, WEEKLY (no BYDAY), MONTHLY, YEARLY
    let current = new Date(start);

    while (current <= endDate && results.length < maxOccurrences) {
      if (!exdates.has(current.toISOString().slice(0, 10))) {
        results.push(new Date(current));
      }

      switch (freq) {
        case "DAILY":
          current.setDate(current.getDate() + interval);
          break;
        case "WEEKLY":
          current.setDate(current.getDate() + 7 * interval);
          break;
        case "MONTHLY":
          current.setMonth(current.getMonth() + interval);
          break;
        case "YEARLY":
          current.setFullYear(current.getFullYear() + interval);
          break;
        default:
          return results; // unsupported frequency
      }
    }
  }

  return results;
}
