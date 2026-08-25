# 포항 핫플 나들이 추천기 — 네이버 지도 테스트

스티치 디자인과 PRD를 바탕으로 만든 첫 번째 지도 연동 초안입니다.

이 프로젝트는 `.env`의 `NAVER_MAP_CLIENT_ID`를 읽어 실제 네이버 지도만 표시합니다. 키가 없거나 잘못되면 데모 지도를 대신 보여주지 않고 오류 상태를 표시합니다.

## 실행 방법

1. `.env`에 값을 입력합니다.
2. 터미널에서 `npm install`을 실행합니다.
3. `npm run dev`를 실행합니다.
4. 브라우저에서 표시된 `http://localhost:5173` 주소로 접속합니다.

## 네이버 콘솔 설정

- Maps 애플리케이션에서 `Dynamic Map`을 활성화합니다.
- 테스트용 허용 도메인에 `http://localhost:5500`을 등록합니다.
- 배포 후에는 실제 GitHub Pages/Vercel 도메인도 허용 목록에 추가합니다.

## 보안 주의

- Client Secret은 이 HTML 파일에 넣지 않습니다.
- 실제 키를 코드에 넣은 상태로 GitHub에 커밋하지 않습니다.
- 최종 배포 단계에서는 Client ID도 환경 변수 방식으로 관리하고, Client Secret은 서버에서만 사용합니다.

## 다음 개발 단계

- 장소 데이터를 별도 파일로 분리
- 추천 입력 폼 연결
- 코스별 마커와 이동 경로 표시
- 장소 상세 패널 및 저장 기능 추가
- Vercel 배포용 앱 구조로 전환

## 장소 CSV 작성 방법

장소 데이터는 `data/pohang_places_template.csv`를 복사해 작성합니다. 한 줄에 장소 하나를 입력하면 됩니다. 여러 테마·인원·날씨·계절·이벤트를 가질 수 있으므로 해당 칸은 `|`로 구분합니다.

중요한 컬럼:

- `theme_tags`: 힐링, 맛집 투어, 액티비티, 문화 중 하나 이상
- `companion_tags`: 혼자, 연인, 가족, 동료, 친구 중 하나 이상
- `weather_tags`: 맑음, 흐림, 비, 눈, 바람, 야간 등
- `space_type`: 실내, 실외, 실내·실외
- `season_tags`: 사계절, 봄, 여름, 가을, 겨울 중 하나 이상
- `event_name`, `event_start`, `event_end`: 계절·기간 이벤트 정보
- `recommended_day`: 1일차·2일차·3일차 등 우선 추천 일차를 `|`로 구분
- `priority`: 숫자가 낮을수록 우선 추천
- `latitude`, `longitude`: 네이버 지도 마커 위치
- `stay_minutes`: 권장 체류 시간(분)
- `transport_tags`: 자차, 대중교통, 도보 등
- `parking`: 주차 정보

날짜 형식은 반드시 `YYYY-MM-DD`로 입력합니다. 예: `2026-12-31`.

예를 들어 비 오는 날 가족 여행이라면 `companion_tags`에 `가족`, `weather_tags`에 `비`, `space_type`에 `실내`가 포함된 장소를 우선 추천할 수 있습니다.
