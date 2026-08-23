// נתוני לוח המשחקים של מכבי חיפה לעונת 2026/27 (מתוך מקורות רשמיים וסיקור ספורט, מעודכן ל-23.8.2026)
// אפשר להוסיף/לערוך משחקים גם דרך הממשק עצמו (כפתור "הוסף משחק").
// שדה final: false = המועד טרם אושר סופית ע"י ההתאחדות/המועדון (או משחק עתידי בלוח הרגיל).

const SEASON_GAMES_SEED = [
  // גביע הטוטו - מוקדמות (שוחקו)
  { date: "2026-07-28", competition: "גביע הטוטו", opponent: "עירוני קריית שמונה", venue: "מרים", home: false, final: true },
  { date: "2026-08-04", competition: "גביע הטוטו", opponent: "עירוני דורות טבריה", venue: "סמי עופר", home: true, final: true },
  { date: "2026-08-08", competition: "גביע הטוטו", opponent: "בני סכנין", venue: "דוחא", home: false, final: true },

  // ליגת Winner - מחזור ראשון (הלוך)
  { date: "2026-08-22", competition: "ליגת Winner", opponent: "הפועל רמת גן", venue: "סמי עופר", home: true, final: true },
  { date: "2026-08-29", competition: "ליגת Winner", opponent: "מכבי תל אביב", venue: "בלומפילד", home: false, final: false },
  { date: "2026-09-05", competition: "ליגת Winner", opponent: "הפועל פתח תקווה", venue: "סמי עופר", home: true, final: false },
  { date: "2026-09-14", competition: "ליגת Winner", opponent: "עירוני קריית שמונה", venue: "מרים", home: false, final: false },
  { date: "2026-09-19", competition: "ליגת Winner", opponent: "עירוני דורות טבריה", venue: "סמי עופר", home: true, final: false },
  { date: "2026-10-10", competition: "ליגת Winner", opponent: "הפועל ירושלים", venue: "טדי", home: false, final: false },
  { date: "2026-10-17", competition: "ליגת Winner", opponent: "מכבי פתח תקווה", venue: "שלמה ביטוח", home: false, final: false },
  { date: "2026-10-24", competition: "ליגת Winner", opponent: "הפועל באר שבע", venue: "סמי עופר", home: true, final: false },
  { date: "2026-10-31", competition: "ליגת Winner", opponent: "הפועל תל אביב", venue: "בלומפילד", home: false, final: false },
  { date: "2026-11-07", competition: "ליגת Winner", opponent: "מכבי נתניה", venue: "סמי עופר", home: true, final: false },
  { date: "2026-11-28", competition: "ליגת Winner", opponent: "בני סכנין", venue: "דוחא", home: false, final: false },
  { date: "2026-12-01", competition: "ליגת Winner", opponent: "בית\"ר ירושלים", venue: "סמי עופר", home: true, final: false },
  { date: "2026-12-05", competition: "ליגת Winner", opponent: "הפועל חיפה", venue: "סמי עופר", home: true, final: false },
  { date: "2026-12-12", competition: "ליגת Winner", opponent: "הפועל רמת גן", venue: "רמת גן", home: false, final: false },
  { date: "2026-12-19", competition: "ליגת Winner", opponent: "מכבי תל אביב", venue: "סמי עופר", home: true, final: false },
  { date: "2026-12-29", competition: "ליגת Winner", opponent: "הפועל פתח תקווה", venue: "שלמה ביטוח", home: false, final: false },
  { date: "2027-01-02", competition: "ליגת Winner", opponent: "עירוני קריית שמונה", venue: "סמי עופר", home: true, final: false },

  // ליגת Winner - מחזור שני (חזור)
  { date: "2027-01-09", competition: "ליגת Winner", opponent: "עירוני דורות טבריה", venue: "טבריה", home: false, final: false },
  { date: "2027-01-16", competition: "ליגת Winner", opponent: "הפועל ירושלים", venue: "סמי עופר", home: true, final: false },
  { date: "2027-01-23", competition: "ליגת Winner", opponent: "מכבי פתח תקווה", venue: "סמי עופר", home: true, final: false },
  { date: "2027-01-30", competition: "ליגת Winner", opponent: "הפועל באר שבע", venue: "טרנר", home: false, final: false },
  { date: "2027-02-06", competition: "ליגת Winner", opponent: "הפועל תל אביב", venue: "סמי עופר", home: true, final: false },
  { date: "2027-02-13", competition: "ליגת Winner", opponent: "מכבי נתניה", venue: "נתניה", home: false, final: false },
  { date: "2027-02-20", competition: "ליגת Winner", opponent: "בני סכנין", venue: "סמי עופר", home: true, final: false },
  { date: "2027-02-27", competition: "ליגת Winner", opponent: "בית\"ר ירושלים", venue: "טדי", home: false, final: false },
  { date: "2027-03-06", competition: "ליגת Winner", opponent: "הפועל חיפה", venue: "סמי עופר", home: false, final: false },
];
