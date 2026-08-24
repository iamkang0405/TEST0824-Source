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
  <header><p class="eyebrow">POHANG EXPLORER</p><h1>포항 핫플 나들이 추천기</h1><p>가고 싶은 분위기에 맞춰 포항 코스를 찾아보세요.</p></header>
  <main><aside><h2>추천 장소</h2><div id="place-list"></div><p id="status" class="status">네이버 지도를 불러오는 중입니다.</p></aside><section id="map" aria-label="포항 지도"></section></main>`;

const list = document.querySelector('#place-list');
list.innerHTML = places.map((place, index) => `<button class="place" data-index="${index}"><strong>${place.name}</strong><span>${place.category}</span></button>`).join('');

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

list.addEventListener('click', (event) => {
  const button = event.target.closest('.place');
  if (!button || !map) return;
  const index = Number(button.dataset.index);
  focusPlace(places[index], markers[index]);
});

window.navermap_authFailure = () => setStatus('인증 실패 · Client ID와 허용 도메인을 확인하세요.');

const clientId = __NAVER_MAP_CLIENT_ID__;
if (!clientId) {
  setStatus('NAVER_MAP_CLIENT_ID가 없습니다. .env 파일을 확인하세요.');
} else {
  window.initMap = initMap;
  const script = document.createElement('script');
  script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(clientId)}&callback=initMap`;
  script.async = true;
  document.head.appendChild(script);
}
