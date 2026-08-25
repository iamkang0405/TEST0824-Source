export default async function handler(request, response) {
  const query = String(request.query?.query || '').trim();
  if (!query) return response.status(400).json({ message: '검색어를 입력해 주세요.' });

  const clientId = process.env.NAVER_SEARCH_CLIENT_ID;
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return response.status(500).json({ message: '검색 API 환경변수가 설정되지 않았습니다.' });

  const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(`포항 ${query}`)}&display=5&start=1&sort=random`;
  const result = await fetch(url, { headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret } });
  const data = await result.json();
  if (!result.ok) return response.status(result.status).json({ message: data.errorMessage || '네이버 장소 검색에 실패했습니다.' });
  return response.status(200).json({ items: data.items || [] });
}
