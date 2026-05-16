// Torah portion (Parasha) lookup — Israel schedule, year 5786 (2025-2026)
// User-confirmed:
//   Shabbat 2026-03-14 (כ"ה אדר  תשפ"ו) = ויקהל פקודי
//   Shabbat 2026-03-21 (ג' ניסן  תשפ"ו) = ויקרא

export const PARASHAS: { date: string; name: string }[] = [
  { date: '2025-10-04', name: 'בראשית' },
  { date: '2025-10-11', name: 'נח' },
  { date: '2025-10-18', name: 'לך לך' },
  { date: '2025-10-25', name: 'וירא' },
  { date: '2025-11-01', name: 'חיי שרה' },
  { date: '2025-11-08', name: 'תולדות' },
  { date: '2025-11-15', name: 'ויצא' },
  { date: '2025-11-22', name: 'וישלח' },
  { date: '2025-11-29', name: 'וישב' },
  { date: '2025-12-06', name: 'מקץ' },
  { date: '2025-12-13', name: 'ויגש' },
  { date: '2025-12-20', name: 'ויחי' },
  { date: '2025-12-27', name: 'שמות' },
  { date: '2026-01-03', name: 'וארא' },
  { date: '2026-01-10', name: 'בא' },
  { date: '2026-01-17', name: 'בשלח' },
  { date: '2026-01-24', name: 'יתרו' },
  { date: '2026-01-31', name: 'משפטים' },
  { date: '2026-02-07', name: 'תרומה' },
  { date: '2026-02-14', name: 'תצוה' },
  { date: '2026-02-21', name: 'כי תשא' },
  // Special Shabbatot (Zachor, Parah) fall on Feb-28 & Mar-07 — no separate entry needed;
  // the algorithm will return ויקהל פקודי for any date between כי תשא and Mar-14.
  { date: '2026-03-14', name: 'ויקהל פקודי' }, // כ"ה אדר — user-confirmed
  { date: '2026-03-21', name: 'ויקרא' },        // ג' ניסן  — user-confirmed
  { date: '2026-03-28', name: 'צו' },
  // Pesach starts 2 Nisan (Apr-2); Shabbat Apr-4 = Chol HaMoed (special reading)
  { date: '2026-04-11', name: 'שמיני' },
  { date: '2026-04-18', name: 'תזריע מצורע' },
  { date: '2026-04-25', name: 'אחרי מות קדושים' },
  { date: '2026-05-02', name: 'אמור' },
  { date: '2026-05-09', name: 'בהר בחוקתי' },
  { date: '2026-05-16', name: 'במדבר' },
  { date: '2026-05-23', name: 'נשא' },
  { date: '2026-05-30', name: 'בהעלותך' },
  { date: '2026-06-06', name: 'שלח' },
  { date: '2026-06-13', name: 'קרח' },
  { date: '2026-06-20', name: 'חקת' },
  { date: '2026-06-27', name: 'בלק' },
  { date: '2026-07-04', name: 'פינחס' },
  { date: '2026-07-11', name: 'מטות מסעי' },
  { date: '2026-07-18', name: 'דברים' },
  { date: '2026-07-25', name: 'ואתחנן' },
  { date: '2026-08-01', name: 'עקב' },
  { date: '2026-08-08', name: 'ראה' },
  { date: '2026-08-15', name: 'שופטים' },
  { date: '2026-08-22', name: 'כי תצא' },
  { date: '2026-08-29', name: 'כי תבוא' },
  { date: '2026-09-05', name: 'נצבים וילך' },
  { date: '2026-09-12', name: 'ראש השנה' },
  { date: '2026-09-19', name: 'האזינו' },
  { date: '2026-09-26', name: 'סוכות' },
]

/**
 * Returns the Shabbat date for the given delivery week.
 */
export function getShabbatDate(deliveryWeek: string, referenceDate?: Date): Date {
  const today = referenceDate || new Date()
  const dayOfWeek = today.getDay() // 0=Sun, 6=Sat
  const daysToSat = dayOfWeek === 6 ? 0 : 6 - dayOfWeek
  const shabbat = new Date(today)
  shabbat.setDate(shabbat.getDate() + daysToSat)
  if (deliveryWeek === 'NEXT_WEEK') shabbat.setDate(shabbat.getDate() + 7)
  return shabbat
}

/**
 * Returns the parasha name for the given date.
 * Finds the FIRST parasha whose date >= the target date (string comparison on YYYY-MM-DD).
 */
export function getParashaForDate(date: Date | null): string {
  if (!date) return "";
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const targetDateStr = `${yyyy}-${mm}-${dd}`

  for (const p of PARASHAS) {
    if (p.date >= targetDateStr) {
      return p.name
    }
  }

  return PARASHAS[PARASHAS.length - 1].name
}

/**
 * Returns the full parasha entry {date, name} for the given date.
 */
export function getParashaEntry(date: Date): { date: string; name: string } {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const targetDateStr = `${yyyy}-${mm}-${dd}`

  for (const p of PARASHAS) {
    if (p.date >= targetDateStr) {
      return p
    }
  }

  return PARASHAS[PARASHAS.length - 1]
}

/**
 * Convenience: returns the parasha for THIS_WEEK or NEXT_WEEK.
 */
export function getParasha(deliveryWeek: string): string {
  return getParashaForDate(getShabbatDate(deliveryWeek))
}
