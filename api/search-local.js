export default async function handler(request, response) {
  const query = String(request.query?.query || '').trim();
  if (!query) return response.status(400).json({ message: '검색어를 입력해 주세요.' });

  // 올바른 이름은 CLIENT입니다. 기존 Vercel에 CLlENT(소문자 l)로 저장된 경우도 잠시 호환합니다.
  const clientId = process.env.NAVER_SEARCH_CLIENT_ID || process.env.NAVER_SEARCH_CLlENT_ID;
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET || process.env.NAVER_SEARCH_CLlENT_SECRET;
  if (!clientId || !clientSecret) return response.status(500).json({ message: '검색 API 환경변수가 설정되지 않았습니다.' });

  const url = `https://naverapihub.apigw.ntruss.com/search/v1/local?query=${encodeURIComponent(`포항 ${query}`)}&display=5&start=1&sort=random&format=json`;
  const result = await fetch(url, { headers: { 'X-NCP-APIGW-API-KEY-ID': clientId, 'X-NCP-APIGW-API-KEY': clientSecret } });
  const data = await result.json();
  if (!result.ok) {
    const message = result.status === 401 ? '검색 API 인증 실패입니다. 네이버 개발자센터 검색 API용 Client ID와 Client Secret인지 확인해 주세요.' : (data.errorMessage || '네이버 장소 검색에 실패했습니다.');
    return response.status(result.status).json({ message });
  }
  return response.status(200).json({ items: data.items || [] });
}
