export function parseDueDateParts(dueDateStr?: string): { date: string; time: string } {
  if (!dueDateStr || dueDateStr === 'No date') return { date: '', time: '' };
  const s = dueDateStr.trim();

  // Check if standard ISO format YYYY-MM-DD or YYYY-MM-DDTHH:mm or YYYY-MM-DD HH:mm
  const isoMatch = s.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/);
  if (isoMatch) {
    return { date: isoMatch[1], time: isoMatch[2] || '' };
  }

  // Check if "MMM DD" or "DD MMM" format, e.g. "Oct 21" or "Oct 21, 14:00" or "21 Okt 2026, 14:00"
  const monthNames: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', mei: '05', may: '05',
    jun: '06', jul: '07', agu: '08', ags: '08', aug: '08', sep: '09',
    okt: '10', oct: '10', nov: '11', des: '12', dec: '12'
  };

  // Format 1: "Oct 21" or "Oct 21, 2026, 14:00" or "Oct 21, 14:00"
  const match1 = s.match(/([a-zA-Z]{3,})\s+(\d{1,2})(?:[,\s]+(\d{4}))?(?:[,\s]+(\d{1,2}:\d{2}))?/);
  if (match1) {
    const monthKey = match1[1].toLowerCase().slice(0, 3);
    if (monthNames[monthKey]) {
      const m = monthNames[monthKey];
      const d = match1[2].padStart(2, '0');
      const y = match1[3] || String(new Date().getFullYear());
      const t = match1[4] || '';
      return { date: `${y}-${m}-${d}`, time: t };
    }
  }

  // Format 2: "21 Oct 2026, 14:00" or "21 Okt, 14:00"
  const match2 = s.match(/(\d{1,2})\s+([a-zA-Z]{3,})(?:[,\s]+(\d{4}))?(?:[,\s]+(\d{1,2}:\d{2}))?/);
  if (match2) {
    const monthKey = match2[2].toLowerCase().slice(0, 3);
    if (monthNames[monthKey]) {
      const d = match2[1].padStart(2, '0');
      const m = monthNames[monthKey];
      const y = match2[3] || String(new Date().getFullYear());
      const t = match2[4] || '';
      return { date: `${y}-${m}-${d}`, time: t };
    }
  }

  return { date: '', time: '' };
}

export function formatTaskDueDate(dateStr?: string, timeStr?: string): string {
  if (!dateStr || dateStr.trim() === '') return 'No date';
  
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return dateStr;

  const monthShort = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const trimmedTime = timeStr?.trim();
  if (trimmedTime) {
    return `${monthShort}, ${trimmedTime}`;
  }
  return monthShort;
}

export function parseAnyDate(dateStr?: string): Date | null {
  if (!dateStr || dateStr === 'No date') return null;
  const s = dateStr.trim();
  const lower = s.toLowerCase();

  if (lower === 'today' || lower === 'hari ini') return new Date();
  if (lower === 'tomorrow' || lower === 'besok') {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }
  if (lower === 'lusa') {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d;
  }

  const { date, time } = parseDueDateParts(s);
  if (date) {
    const [y, m, d] = date.split('-').map(Number);
    let hours = 23;
    let minutes = 59;
    if (time) {
      const [h, min] = time.split(':').map(Number);
      if (!isNaN(h)) hours = h;
      if (!isNaN(min)) minutes = min;
    }
    return new Date(y, m - 1, d, hours, minutes, 0);
  }

  const direct = new Date(s.includes('T') ? s : `${s}T00:00:00`);
  if (!isNaN(direct.getTime())) {
    return direct;
  }

  return null;
}
