// מצב דמו: מחירים מומצאים (אך יציבים) כשאין מפתח API, כדי שאפשר יהיה לראות את האתר עובד.

import { candidateDates } from '../pattern.js';

const AIRLINES = ['W6', 'FR', 'LY', '6H', 'IZ', 'A3', 'U2', 'PC'];

function hash(s) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function searchDemo({ origin, destinations, pattern, currency }) {
  const dests = destinations.length ? destinations : ['ATH', 'LCA', 'BUD', 'ROM', 'PRG'];
  const trips = [];
  for (const destination of dests) {
    for (const { depart, return: ret } of candidateDates(pattern)) {
      const h = hash(`${origin}${destination}${depart}${ret}`);
      if (h % 5 === 0) continue; // לא בכל תאריך יש מחיר
      const transfers = h % 7 === 0 ? 1 : 0;
      trips.push({
        origin,
        destination,
        originAirport: origin,
        destinationAirport: destination,
        depart: `${depart}T${String(6 + (h % 16)).padStart(2, '0')}:${h % 2 ? '30' : '05'}:00+03:00`,
        return: `${ret}T${String(8 + ((h >> 4) % 14)).padStart(2, '0')}:15:00+03:00`,
        price: 450 + (h % 1400),
        currency,
        airline: AIRLINES[h % AIRLINES.length],
        transfers,
        returnTransfers: transfers,
        source: 'דמו',
      });
    }
  }
  return trips;
}
