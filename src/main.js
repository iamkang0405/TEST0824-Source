import './style.css';

const places = [
  { name: '영일대해수욕장', category: '바다 · 산책', lat: 36.0566, lng: 129.3787 },
  { name: '죽도시장', category: '시장 · 먹거리', lat: 36.0357, lng: 129.3657 },
  { name: '호미곶', category: '일출 · 전망', lat: 36.0769, lng: 129.5689 },
  { name: '구룡포 근대문화거리', category: '문화 · 산책', lat: 35.9918, lng: 129.5532 }
];

let map;
let markers = [];
let infoWindow;

document.querySelector('#app').innerHTML = `
  <main class="explorer">
    <section id="map" aria-label="포항 전체 지도"></section>
    <div class="map-scrim"></div>
    <header class="brand"><p class="eyebrow">POHANG EXPLORER</p><h1>포항 핫플 나들이 추천기</h1><p>가고 싶은 분위기에 맞춰 포항 코스를 찾아보세요.</p></header>
    <aside class="planner panel">
      <div class="panel-heading"><div><p class="eyebrow">PLAN YOUR DAY</p><h2>나의 여행 조건</h2></div><span class="step">01</span></div>
      <label>테마</label><div class="chips" id="theme-chips"><button class="chip active" data-theme="힐링">힐링</button><button class="chip" data-theme="맛집 투어">맛집 투어</button><button class="chip" data-theme="액티비티">액티비티</button><button class="chip" data-theme="문화">문화</button></div>
      <label>인원</label><div class="people"><button class="counter" id="minus">−</button><strong id="people-count">2명</strong><button class="counter" id="plus">+</button></div>
      <label for="trip-date">여행 기간</label><input id="trip-date" type="date" />
      <div class="time-row"><div><label for="start-time">시작 시간</label><input id="start-time" type="time" value="10:00" /></div><div><label for="duration">가용 시간</label><select id="duration"><option>4시간</option><option>6시간</option><option>8시간</option></select></div></div>
      <label>이동 수단</label><div class="transport"><button class="transport-btn active">🚗 자차</button><button class="transport-btn">🚌 대중교통</button></div>
      <button class="primary-btn" id="recommend-btn">이 조건으로 코스 추천받기 <span>→</span></button>
      <p id="status" class="status">네이버 지도를 불러오는 중입니다.</p>
    </aside>
    <aside class="results panel">
      <div class="panel-heading"><div><p class="eyebrow">MY TRIP</p><h2>내가 선택한 여행지</h2></div><span class="count" id="selected-count">0곳</span></div>
      <div id="selected-list" class="selected-list"><div class="empty-state">왼쪽에서 조건을 고르면<br>추천 장소가 여기에 표시됩니다.</div></div>
      <div class="recommend-header"><h3>테마별 추천 여행지</h3><button class="text-btn">전체 보기</button></div>
      <div id="place-list" class="mini-place-list"></div>
    </aside>
  </main>`;

const list = document.querySelector('#place-list');
list.innerHTML = places.map((place, index) => `<button class="place" data-index="${index}"><span class="place-number">0${index + 1}</span><span><strong>${place.name}</strong><small>${place.category}</small></span><span class="add-place">+</span></button>`).join('');

function setStatus(message) { document.querySelector('#status').textContent = message; }

function initMap() {
  map = new naver.maps.Map('map', {
    center: new naver.maps.LatLng(36.0190, 129.3435),
    zoom: 11,
    zoomControl: true,
    zoomControlOptions: { position: naver.maps.Position.TOP_RIGHT }
  });
  infoWindow = new naver.maps.InfoWindow();
  places.forEach((place) => {
    const marker = new naver.maps.Marker({ map, position: new naver.maps.LatLng(place.lat, place.lng), title: place.name });
    markers.push(marker);
    naver.maps.Event.addListener(marker, 'click', () => focusPlace(place, marker));
  });
  setStatus('지도 연결 성공 · 장소를 선택해 보세요.');
}

function focusPlace(place, marker) {
  map.panTo(marker.getPosition());
  map.setZoom(14);
  infoWindow.setContent(`<div class="info"><strong>${place.name}</strong><span>${place.category}</span></div>`);
  infoWindow.open(map, marker);
}

const selected = [];
list.addEventListener('click', (event) => {
  const button = event.target.closest('.place');
  if (!button) return;
  const index = Number(button.dataset.index);
  const place = places[index];
  if (map) focusPlace(place, markers[index]);
  if (!selected.some((item) => item.name === place.name)) selected.push(place);
  renderSelected();
});

function renderSelected() {
  document.querySelector('#selected-count').textContent = `${selected.length}곳`;
  document.querySelector('#selected-list').innerHTML = selected.length ? selected.map((place, index) => `<div class="selected-place"><span class="route-number">${index + 1}</span><div><strong>${place.name}</strong><small>${place.category}</small></div><button data-remove="${place.name}">×</button></div>`).join('') : '<div class="empty-state">왼쪽에서 조건을 고르면<br>추천 장소가 여기에 표시됩니다.</div>';
}

document.querySelector('#selected-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove]');
  if (!button) return;
  const index = selected.findIndex((place) => place.name === button.dataset.remove);
  if (index >= 0) selected.splice(index, 1);
  renderSelected();
});

let people = 2;
document.querySelector('#minus').addEventListener('click', () => { people = Math.max(1, people - 1); document.querySelector('#people-count').textContent = `${people}명`; });
document.querySelector('#plus').addEventListener('click', () => { people = Math.min(20, people + 1); document.querySelector('#people-count').textContent = `${people}명`; });
document.querySelectorAll('.chip').forEach((chip) => chip.addEventListener('click', () => { document.querySelectorAll('.chip').forEach((item) => item.classList.remove('active')); chip.classList.add('active'); }));
document.querySelectorAll('.transport-btn').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('.transport-btn').forEach((item) => item.classList.remove('active')); button.classList.add('active'); }));
document.querySelector('#recommend-btn').addEventListener('click', () => { if (!selected.length) { places.slice(0, 2).forEach((place) => selected.push(place)); renderSelected(); } setStatus(`${document.querySelector('.chip.active').dataset.theme} 테마로 ${selected.length}곳 코스를 만들었습니다.`); });

window.navermap_authFailure = () => setStatus('인증 실패 · Client ID와 허용 도메인을 확인하세요.');

const clientId = __NAVER_MAP_CLIENT_ID__;
if (!clientId) {
  setStatus('NAVER_MAP_CLIENT_ID가 없습니다. .env 파일을 확인하세요.');
} else {
  const script = document.createElement('script');
  // callback으로 즉시 실행하면 일부 브라우저에서 naver 전역 객체보다
  // initMap이 먼저 실행되는 경우가 있어, API 로드 후 직접 준비 상태를 확인합니다.
  script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(clientId)}`;
  script.async = true;
  script.onload = () => {
    let attempts = 0;
    const waitForNaver = () => {
      if (window.naver?.maps) {
        initMap();
        return;
      }
      attempts += 1;
      if (attempts > 50) {
        setStatus('네이버 지도 API가 준비되지 않았습니다 · Client ID와 Dynamic Map 설정을 확인하세요.');
        return;
      }
      window.setTimeout(waitForNaver, 100);
    };
    waitForNaver();
  };
  script.onerror = () => setStatus('네이버 지도 API 로드 실패 · Client ID와 네이버 콘솔의 허용 도메인을 확인하세요.');
  document.head.appendChild(script);
}
