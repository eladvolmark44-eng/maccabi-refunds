export function sendJson(res, status, body, cacheSeconds = 0) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (cacheSeconds) res.setHeader('Cache-Control', `s-maxage=${cacheSeconds}, stale-while-revalidate`);
  res.end(JSON.stringify(body));
}
