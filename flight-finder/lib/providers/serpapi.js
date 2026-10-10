// SerpApi - Google Flights: בדיקת מחיר עדכני לזוג תאריכים מסוים (Google משווה בין חברות וסוכנויות).
// תיעוד: https://serpapi.com/google-flights-api

export async function verifyPrice({ origin, destination, depart, ret, currency, directOnly, apiKey }) {
  const params = new URLSearchParams({
    engine: 'google_flights',
    departure_id: origin,
    arrival_id: destination,
    outbound_date: depart,
    return_date: ret,
    type: '1',
    currency,
    hl: 'en',
    api_key: apiKey,
  });
  if (directOnly) params.set('stops', '1');

  const res = await fetch(`https://serpapi.com/search.json?${params}`);
  const body = await res.json();
  if (!res.ok || body.error) throw new Error(body.error || `SerpApi ${res.status}`);

  const flights = [...(body.best_flights || []), ...(body.other_flights || [])].filter((f) => f.price);
  flights.sort((a, b) => a.price - b.price);
  const cheapest = flights[0];
  return {
    price: cheapest ? cheapest.price : null,
    airline: cheapest?.flights?.[0]?.airline ?? null,
    url: body.search_metadata?.google_flights_url ?? null,
  };
}
