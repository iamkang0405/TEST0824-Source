export default async function handler(request, response) {
  const requestUrl = new URL(request.url, `https://${request.headers.host || 'localhost'}`);
  const start = request.query?.start || requestUrl.searchParams.get('start');
  const goal = request.query?.goal || requestUrl.searchParams.get('goal');
  if (!start || !goal) return response.status(400).json({ message: '출발지와 도착지가 필요합니다.' });
  const clientId = (process.env.NAVER_MAP_CLIENT_ID || process.env.NAVER_DIRECTION_CLIENT_ID || '').trim();
  const clientSecret = (process.env.NAVER_MAP_CLIENT_SECRET || process.env.NAVER_DIRECTION_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) return response.status(500).json({ message: 'Directions 15 환경변수가 없습니다.' });
  const url = `https://naveropenapi.apigw.ntruss.com/map-direction-15/v1/driving?start=${encodeURIComponent(start)}&goal=${encodeURIComponent(goal)}&option=traoptimal&lang=ko`;
  const result = await fetch(url, { headers: { 'x-ncp-apigw-api-key-id': clientId, 'x-ncp-apigw-api-key': clientSecret } });
  const data = await result.json();
  if (!result.ok || String(data.code) !== '0') return response.status(result.ok ? 422 : result.status).json({ message: data.message || data.errorMessage || `Directions 15 오류(${data.code ?? result.status})` });
  const route = data.route?.traoptimal?.[0];
  return response.status(200).json({ summary: route.summary, path: route.path });
}
