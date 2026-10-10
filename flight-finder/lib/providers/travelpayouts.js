// Travelpayouts / Aviasales Data API - מחירים שנמצאו בחיפושים של משתמשים ב-48 השעות האחרונות.
// תיעוד: https://support.travelpayouts.com/hc/en-us/articles/203956163

const BASE = 'https://api.travelpayouts.com/aviasales/v3/prices_for_dates';

export async function searchMonth({ origin, destination, month, currency, directOnly, token }) {
  const params = new URLSearchParams({
    origin,
    departure_at: month,
    one_way: 'false',
    direct: directOnly ? 'true' : 'false',
    sorting: 'price',
    limit: '1000',
    currency,
    token,
  });
  if (destination) params.set('destination', destination);

  const res = await fetch(`${BASE}?${params}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Travelpayouts ${res.status}`);
  const body = await res.json();
  if (!body.success) throw new Error(body.error || 'Travelpayouts error');

  return (body.data || []).map((f) => ({
    origin: f.origin,
    destination: f.destination,
    originAirport: f.origin_airport,
    destinationAirport: f.destination_airport,
    depart: f.departure_at,
    return: f.return_at,
    price: f.price,
    currency: (body.currency || currency).toUpperCase(),
    airline: f.airline,
    flightNumber: f.flight_number,
    transfers: f.transfers ?? 0,
    returnTransfers: f.return_transfers ?? 0,
    bookingPath: f.link,
    source: 'Aviasales',
  }));
}
