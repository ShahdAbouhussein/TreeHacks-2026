export interface ParsedEvent {
  title: string;
  start: Date;
  end: Date;
  description: string;
  location: string;
  allDay: boolean;
}

/**
 * Lightweight ICS parser — no dependencies.
 * Splits on VEVENT blocks and extracts the fields we care about.
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
      // Strip any parameters before the value (e.g. DTSTART;VALUE=DATE:20250101)
      const raw = m[1];
      const colonIdx = raw.indexOf(":");
      // If the regex captured from after the first colon (key had no params), raw IS the value
      // If key line had params (;…:value), we need the part after the last ':'
      return colonIdx !== -1 ? raw.substring(colonIdx + 1) : raw;
    };

    const dtStartRaw = get("DTSTART");
    if (!dtStartRaw) continue;

    const parseDate = (v: string): Date => {
      // Formats: 20250214T153000Z, 20250214T153000, 20250214
      const s = v.replace(/[^0-9TZ]/g, "");
      if (s.length === 8) {
        // All-day: YYYYMMDD
        return new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00:00`);
      }
      // YYYYMMDDTHHMMSS(Z)
      const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}${s.endsWith("Z") ? "Z" : ""}`;
      return new Date(iso);
    };

    const start = parseDate(dtStartRaw);
    const dtEndRaw = get("DTEND");
    const end = dtEndRaw
      ? parseDate(dtEndRaw)
      : new Date(start.getTime() + 60 * 60 * 1000);

    const allDay = dtStartRaw.length === 8 ||
      block.match(/DTSTART;VALUE=DATE[^-T]/) !== null;

    events.push({
      title: get("SUMMARY") || "Untitled",
      start,
      end,
      description: get("DESCRIPTION"),
      location: get("LOCATION"),
      allDay,
    });
  }

  return events;
}
