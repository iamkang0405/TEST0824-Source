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
    <button class="peek-tab peek-top" id="peek-top" aria-label="추천기 열기">⌄</button>
    <button class="peek-tab peek-left" id="peek-left" aria-label="추천기 열기">›</button>
    <button class="peek-tab peek-right" id="peek-right" aria-label="추천기 열기">‹</button>
    <header class="brand"><p class="eyebrow">POHANG EXPLORER</p><h1>포항 핫플 나들이 추천기</h1><p>가고 싶은 분위기에 맞춰 포항 코스를 찾아보세요.</p></header>
    <aside class="planner panel">
      <div class="panel-heading"><div><p class="eyebrow">PLAN YOUR DAY</p><h2>나의 여행 조건</h2></div><span class="step">01</span></div>
      <label>테마</label><div class="chips" id="theme-chips"><button class="chip active" data-theme="힐링">힐링</button><button class="chip" data-theme="맛집 투어">맛집 투어</button><button class="chip" data-theme="액티비티">액티비티</button><button class="chip" data-theme="문화">문화</button></div>
      <label>인원</label><div class="people"><button class="counter" id="minus">−</button><strong id="people-count">2명</strong><button class="counter" id="plus">+</button></div>
      <label>여행 기간 <span class="date-help" id="trip-summary">날짜를 선택해 주세요</span></label><button class="calendar-trigger" id="calendar-trigger">📅 여행 날짜 선택</button><div id="calendar" class="calendar hidden"></div>
      <div class="time-row"><div><label for="start-time">시작 시간</label><input id="start-time" type="time" value="10:00" /></div><div><label for="duration">가용 시간</label><select id="duration"><option>4시간</option><option>6시간</option><option>8시간</option></select></div></div>
      <label>이동 수단</label><div class="transport"><button class="transport-btn active">🚗 자차</button><button class="transport-btn">🚌 대중교통</button></div>
      <button class="primary-btn" id="recommend-btn">이 조건으로 코스 추천받기 <span>→</span></button>
      <p id="status" class="status">네이버 지도를 불러오는 중입니다.</p>
    </aside>
    <aside class="results panel">
      <div class="panel-heading"><div><p class="eyebrow">MY TRIP</p><h2>내가 선택한 여행지</h2></div><span class="count" id="selected-count">0곳</span></div>
      <div id="day-tabs" class="day-tabs"><button class="day-tab active" data-day="0">1일차</button></div>
      <div class="day-theme"><span>이 날의 테마</span><select id="day-theme-select"><option>힐링</option><option>맛집 투어</option><option>액티비티</option><option>문화</option></select></div>
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
  naver.maps.Event.addListener(map, 'click', () => {
    const explorer = document.querySelector('.explorer');
    if (!explorer.classList.contains('panels-collapsed')) explorer.classList.add('panels-collapsed');
  });
  setStatus('지도 연결 성공 · 장소를 선택해 보세요.');
}

function focusPlace(place, marker) {
  map.panTo(marker.getPosition());
  map.setZoom(14);
  infoWindow.setContent(`<div class="info"><strong>${place.name}</strong><span>${place.category}</span></div>`);
  infoWindow.open(map, marker);
}

let currentDay = 0;
let dayPlans = [{ places: [], theme: '힐링' }];
function currentPlaces() { return dayPlans[currentDay].places; }
list.addEventListener('click', (event) => {
  const button = event.target.closest('.place');
  if (!button) return;
  const index = Number(button.dataset.index);
  const place = places[index];
  if (map) focusPlace(place, markers[index]);
  if (!currentPlaces().some((item) => item.name === place.name)) currentPlaces().push(place);
  renderSelected();
});

function renderSelected() {
const selected = currentPlaces();
  document.querySelector('#selected-count').textContent = `${selected.length}곳`;
  document.querySelector('#selected-list').innerHTML = selected.length ? selected.map((place, index) => `<div class="selected-place"><span class="route-number">${index + 1}</span><div><strong>${place.name}</strong><small>${place.category}</small></div><button data-remove="${place.name}">×</button></div>`).join('') : '<div class="empty-state">이 날짜에 갈 장소를<br>아래 추천 목록에서 추가해 보세요.</div>';
}

document.querySelector('#selected-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove]');
  if (!button) return;
  const index = currentPlaces().findIndex((place) => place.name === button.dataset.remove);
  if (index >= 0) currentPlaces().splice(index, 1);
  renderSelected();
});

function dateDiff(start, end) {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  return Math.round((endDate - startDate) / 86400000);
}
function renderDayTabs(days) {
  document.querySelector('#day-tabs').innerHTML = Array.from({ length: days }, (_, index) => `<button class="day-tab ${index === currentDay ? 'active' : ''}" data-day="${index}">${index + 1}일차</button>`).join('');
  document.querySelectorAll('.day-tab').forEach((button) => button.addEventListener('click', () => {
    currentDay = Number(button.dataset.day);
    document.querySelector('#day-theme-select').value = dayPlans[currentDay].theme;
    renderDayTabs(days); renderSelected();
  }));
}
function updateTripDates() {
  const start = document.querySelector('#start-date').value;
  const end = document.querySelector('#end-date').value;
  if (!start || !end) return;
  const nights = dateDiff(start, end);
  if (nights < 0) { document.querySelector('#trip-summary').textContent = '종료일은 시작일 이후로 선택해 주세요'; return; }
  const days = nights + 1;
  while (dayPlans.length < days) dayPlans.push({ places: [], theme: '힐링' });
  dayPlans = dayPlans.slice(0, days); currentDay = Math.min(currentDay, days - 1);
  document.querySelector('#trip-summary').textContent = `${nights}박 ${days}일`;
  renderDayTabs(days); renderSelected();
}
document.querySelector('#day-theme-select').addEventListener('change', (event) => { dayPlans[currentDay].theme = event.target.value; });

let calendarStart = null;
let calendarEnd = null;
let calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
const calendar = document.querySelector('#calendar');
const pad = (number) => String(number).padStart(2, '0');
const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
function renderCalendar() {
  const year = calendarMonth.getFullYear(); const month = calendarMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); const lastDate = new Date(year, month + 1, 0).getDate();
  let html = `<div class="calendar-head"><button data-calendar-prev>‹</button><strong>${year}년 ${month + 1}월</strong><button data-calendar-next>›</button></div><div class="weekdays"><span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span></div><div class="calendar-days">`;
  for (let i = 0; i < firstDay; i++) html += '<span></span>';
  for (let day = 1; day <= lastDate; day++) {
    const current = new Date(year, month, day); const key = dateKey(current);
    const isStart = calendarStart === key; const isEnd = calendarEnd === key;
    const inRange = calendarStart && calendarEnd && key > calendarStart && key < calendarEnd;
    html += `<button class="calendar-day ${isStart ? 'range-start' : ''} ${isEnd ? 'range-end' : ''} ${inRange ? 'in-range' : ''}" data-date="${key}">${day}</button>`;
  }
  html += '</div><p class="calendar-hint">첫 날짜와 마지막 날짜를 차례로 선택하세요.</p>'; calendar.innerHTML = html;
  calendar.querySelector('[data-calendar-prev]').addEventListener('click', (e) => { e.stopPropagation(); calendarMonth = new Date(year, month - 1, 1); renderCalendar(); });
  calendar.querySelector('[data-calendar-next]').addEventListener('click', (e) => { e.stopPropagation(); calendarMonth = new Date(year, month + 1, 1); renderCalendar(); });
  calendar.querySelectorAll('[data-date]').forEach((button) => button.addEventListener('click', (e) => { e.stopPropagation(); selectCalendarDate(button.dataset.date); }));
}
function selectCalendarDate(key) {
  if (!calendarStart || (calendarStart && calendarEnd)) { calendarStart = key; calendarEnd = null; }
  else if (key < calendarStart) { calendarEnd = calendarStart; calendarStart = key; }
  else calendarEnd = key;
  renderCalendar();
  if (calendarStart && calendarEnd) {
    const nights = dateDiff(calendarStart, calendarEnd); const days = nights + 1;
    while (dayPlans.length < days) dayPlans.push({ places: [], theme: '힐링' }); dayPlans = dayPlans.slice(0, days); currentDay = 0;
    document.querySelector('#trip-summary').textContent = `${nights}박 ${days}일`;
    document.querySelector('#calendar-trigger').textContent = `${calendarStart.replaceAll('-', '.')} ~ ${calendarEnd.replaceAll('-', '.')}`;
    renderDayTabs(days); renderSelected(); calendar.classList.add('hidden');
  } else document.querySelector('#trip-summary').textContent = '마지막 날짜를 선택해 주세요';
}
document.querySelector('#calendar-trigger').addEventListener('click', (event) => { event.stopPropagation(); calendar.classList.toggle('hidden'); renderCalendar(); });

const overlayItems = [document.querySelector('.brand'), document.querySelector('.planner'), document.querySelector('.results')];
function togglePanels() { document.querySelector('.explorer').classList.toggle('panels-collapsed'); }
overlayItems.forEach((item) => item.addEventListener('click', (event) => { if (document.querySelector('.explorer').classList.contains('panels-collapsed')) { event.stopPropagation(); togglePanels(); } }));
document.querySelectorAll('.peek-tab').forEach((tab) => tab.addEventListener('click', (event) => { event.stopPropagation(); document.querySelector('.explorer').classList.remove('panels-collapsed'); }));

let people = 2;
document.querySelector('#minus').addEventListener('click', () => { people = Math.max(1, people - 1); document.querySelector('#people-count').textContent = `${people}명`; });
document.querySelector('#plus').addEventListener('click', () => { people = Math.min(20, people + 1); document.querySelector('#people-count').textContent = `${people}명`; });
document.querySelectorAll('.chip').forEach((chip) => chip.addEventListener('click', () => { document.querySelectorAll('.chip').forEach((item) => item.classList.remove('active')); chip.classList.add('active'); }));
document.querySelectorAll('.transport-btn').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('.transport-btn').forEach((item) => item.classList.remove('active')); button.classList.add('active'); }));
document.querySelector('#recommend-btn').addEventListener('click', () => { const selected = currentPlaces(); if (!selected.length) { places.slice(0, 2).forEach((place) => selected.push(place)); renderSelected(); } setStatus(`${dayPlans[currentDay].theme} 테마로 ${currentDay + 1}일차 ${selected.length}곳 코스를 만들었습니다.`); });

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
