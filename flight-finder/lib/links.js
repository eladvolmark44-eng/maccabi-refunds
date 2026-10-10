// קישורי השוואה לאותה טיסה באתרים השונים.

const compact = (d) => d.slice(2, 10).replaceAll('-', ''); // 2026-10-15 -> 261015

export function compareLinks(t, marker) {
  const o = t.originAirport || t.origin;
  const dest = t.destinationAirport || t.destination;
  const out = t.depart.slice(0, 10);
  const back = t.return.slice(0, 10);
  const links = {
    google: `https://www.google.com/travel/flights?q=${encodeURIComponent(`Flights from ${o} to ${dest} on ${out} through ${back}`)}`,
    skyscanner: `https://www.skyscanner.co.il/transport/flights/${o.toLowerCase()}/${dest.toLowerCase()}/${compact(out)}/${compact(back)}/`,
    kayak: `https://www.kayak.com/flights/${o}-${dest}/${out}/${back}`,
  };
  if (t.bookingPath) {
    const url = new URL(t.bookingPath, 'https://www.aviasales.com');
    if (marker) url.searchParams.set('marker', marker);
    links.aviasales = url.toString();
  }
  return links;
}
