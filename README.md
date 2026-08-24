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

장소 데이터는 `data/pohang_places_template.csv`를 복사해 작성합니다. 한 줄에 장소 하나를 입력하면 됩니다. `tags`, `companion`, `transport`처럼 여러 값을 넣는 칸은 `|`로 구분합니다.

중요한 컬럼:

- `theme`: 힐링, 맛집 투어, 액티비티, 문화 중 하나
- `season`: 사계절, 봄, 여름, 가을, 겨울 또는 조합
- `event`: 특정 계절/기간 이벤트명
- `day_priority`: 1일차에 우선 추천할지 나타내는 숫자
- `indoor_outdoor`: 실내, 실외, 실내·실외
- `latitude`, `longitude`: 네이버 지도 마커 위치
- `recommended_stay_min`: 권장 체류 시간(분)
- `companion`: 어울리는 동행 유형을 `|`로 구분

날짜를 직접 특정하는 이벤트는 추후 `event_start`, `event_end` 컬럼을 추가해 기간 필터로 확장할 수 있습니다.
