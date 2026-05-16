import { HDate } from '@hebcal/core';
import { startOfWeek, addDays } from 'date-fns';

const daysOfWeekHebrew = [
  'יום ראשון',
  'יום שני',
  'יום שלישי',
  'יום רביעי',
  'יום חמישי',
  'יום שישי',
  'שבת',
];

const dayNameToIndex: Record<string, number> = {
  'Sunday': 0,
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Shabbat': 6,
};

// Hebrew month names
const HEBREW_MONTHS: Record<number, string> = {
  1:  'ניסן',
  2:  'אייר',
  3:  'סיוון',
  4:  'תמוז',
  5:  'אב',
  6:  'אלול',
  7:  'תשרי',
  8:  'חשוון',
  9:  'כסלו',
  10: 'טבת',
  11: 'שבט',
  12: 'אדר',
  13: 'אדר ב׳',
}

// Hebrew gematria digits
const ONES  = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט']
const TENS  = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ']
const HUNDREDS = { 100: 'ק', 200: 'ר', 300: 'ש', 400: 'ת', 500: 'תק', 600: 'תר', 700: 'תש', 800: 'תת', 900: 'תתק' } as Record<number, string>

function numToGematria(n: number): string {
  if (n === 15) return 'ט״ו'
  if (n === 16) return 'ט״ז'
  let result = ''
  let rem = n
  for (const h of [900, 800, 700, 600, 500, 400, 300, 200, 100]) {
    if (rem >= h) { result += HUNDREDS[h]; rem -= h }
  }
  const t = Math.floor(rem / 10)
  const o = rem % 10
  if (t > 0) result += TENS[t]
  if (o > 0) result += ONES[o]
  // Add geresh / gershayim
  if (result.length === 1) return result + '׳'
  return result.slice(0, -1) + '״' + result.slice(-1)
}

/**
 * Returns the full Hebrew date string:
 * e.g. "שבת, כ״ה אדר תשפ״ו"
 */
export function getHebrewDateString(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' 
    ? new Date(`${dateInput}T12:00:00`) 
    : dateInput
  const dayOfWeek = daysOfWeekHebrew[date.getDay()]
  
  const hdate = new HDate(date)
  const day = numToGematria(hdate.getDate())
  const month = HEBREW_MONTHS[hdate.getMonth()] ?? hdate.getMonthName()
  
  const yearNum = hdate.getFullYear() % 1000
  // Use short format "פו" Instead of "תשפו" for years in the 5700s
  const year = (yearNum > 700 && yearNum < 800) 
    ? numToGematria(yearNum % 100) 
    : numToGematria(yearNum || 1000)

  return `${dayOfWeek}, ${day} ${month} ${year}`
}

export function getDeliveryHebrewDate(createdAt: Date | string, deliveryDay: string, deliveryWeek: string, specialDateName?: string | null): string {
  // If deliveryWeek is an exact date string (e.g. "2026-04-15"), parse it directly
  if (deliveryWeek.includes('-')) {
    const baseStr = getHebrewDateString(new Date(deliveryWeek));
    return specialDateName ? `${baseStr} (${specialDateName})` : baseStr;
  }

  // 1. Determine the week of creation (Sunday as start)
  const createdDate = new Date(createdAt);
  const sundayOfCreationWeek = startOfWeek(createdDate, { weekStartsOn: 0 }); // 0 = Sunday
  
  // 2. Add weeks
  const weekOffset = deliveryWeek === 'NEXT_WEEK' ? 7 : 0;
  
  // 3. Add days for the specific day of week
  const dayOffset = dayNameToIndex[deliveryDay] ?? 0;
  
  // 4. Calculate exact delivery date
  const deliveryDate = addDays(sundayOfCreationWeek, weekOffset + dayOffset);
  
  const baseStr = getHebrewDateString(deliveryDate);
  return specialDateName ? `${baseStr} (${specialDateName})` : baseStr;
}

export function getShabbatDate(deliveryWeekRaw: any, createdAtRaw: any): Date | null {
  if (!createdAtRaw) return null;
  const createdAt = typeof createdAtRaw === 'string' ? new Date(createdAtRaw) : createdAtRaw;
  const dow = createdAt.getDay()
  const daysUntilSaturday = dow === 6 ? 0 : 6 - dow
  const currentWeekShabbat = new Date(createdAt)
  currentWeekShabbat.setDate(createdAt.getDate() + daysUntilSaturday)
  if (deliveryWeekRaw === 'NEXT_WEEK') {
    const nextWeekShabbat = new Date(currentWeekShabbat);
    nextWeekShabbat.setDate(nextWeekShabbat.getDate() + 7);
    return nextWeekShabbat;
  }
  if (deliveryWeekRaw === 'THIS_WEEK') {
    return currentWeekShabbat;
  }
  const deliveryWeek = typeof deliveryWeekRaw === 'string' ? new Date(deliveryWeekRaw) : deliveryWeekRaw;
  if (!isNaN(deliveryWeek.getTime())) {
    const dDow = deliveryWeek.getDay()
    const dUntilSat = dDow === 6 ? 0 : 6 - dDow
    deliveryWeek.setDate(deliveryWeek.getDate() + dUntilSat)
    return deliveryWeek;
  }
  return currentWeekShabbat;
}
