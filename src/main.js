import './style.css';
import placesCsv from '../data/pohang_places_template.csv?raw';

function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]; const next = text[i + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && next === '\n') i += 1; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const headers = rows.shift();
  return rows.filter((values) => values.some(Boolean)).map((values) => Object.fromEntries(headers.map((key, index) => [key, values[index] || ''])));
}

const places = parseCsv(placesCsv).map((place) => ({
  ...place,
  category: place.category.replace('·', ' · '),
  lat: Number(place.latitude), lng: Number(place.longitude),
  themes: place.theme_tags.split('|'), companions: place.companion_tags.split('|'), weather: place.weather_tags.split('|')
}));
const fallbackImages = {
  '맛집 투어': 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=360&q=80',
  '문화': 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=360&q=80',
  '액티비티': 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=360&q=80',
  '힐링': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=360&q=80'
};
function placeImage(place) { return place.image_url || fallbackImages[place.themes[0]] || fallbackImages.힐링; }

let map;
let markers = [];
let infoWindow;
const dayColors = ['#1769e0', '#e05b38', '#8b5cf6', '#159a70', '#d18b19'];
function markerIcon(day, order) {
  const color = dayColors[(day - 1) % dayColors.length];
  return { content: `<div class="route-pin" style="--pin-color:${color}"><span>${order}</span></div>`, anchor: new naver.maps.Point(15, 36) };
}

document.querySelector('#app').innerHTML = `
  <main class="explorer">
    <section id="map" aria-label="포항 전체 지도"></section>
    <div class="map-scrim"></div>
    <button class="peek-tab peek-top" id="peek-top" aria-label="추천기 열기">⌄</button>
    <button class="peek-tab peek-left" id="peek-left" aria-label="추천기 열기">›</button>
    <button class="peek-tab peek-right" id="peek-right" aria-label="추천기 열기">‹</button>
    <header class="brand"><p class="eyebrow">POHANG EXPLORER</p><h1>포항 핫플 나들이 추천기</h1></header>
    <aside class="planner panel">
      <div class="panel-heading"><div><p class="eyebrow">PLAN YOUR DAY</p><h2>나의 여행 조건</h2></div><span class="step">01</span></div>
      <label>테마</label><div class="chips" id="theme-chips"><button class="chip active" data-theme="힐링">힐링</button><button class="chip" data-theme="맛집 투어">맛집 투어</button><button class="chip" data-theme="액티비티">액티비티</button><button class="chip" data-theme="문화">문화</button></div>
      <label>인원</label><div class="people"><button class="counter" id="minus">−</button><strong id="people-count">2명</strong><button class="counter" id="plus">+</button></div>
      <label>여행 기간 <span class="date-help" id="trip-summary">날짜를 선택해 주세요</span></label><button class="calendar-trigger" id="calendar-trigger">📅 여행 날짜 선택</button><div id="calendar" class="calendar hidden"></div>
      <div class="time-row"><div><label for="start-time">시작 시간</label><input id="start-time" type="time" value="10:00" /></div><div><label for="duration">가용 시간</label><select id="duration"><option>4시간</option><option>6시간</option><option>8시간</option></select></div></div>
      <div class="condition-row"><div><label for="weather">날씨</label><select id="weather"><option>맑음</option><option>흐림</option><option>비</option><option>눈</option><option>바람</option></select></div></div>
      <label>이동 수단</label><div class="transport"><button class="transport-btn active">🚗 자차</button><button class="transport-btn">🚌 대중교통</button></div>
      <button class="primary-btn" id="recommend-btn">이 조건으로 코스 추천받기 <span>→</span></button>
      <p id="status" class="status">네이버 지도를 불러오는 중입니다.</p>
    </aside>
    <aside class="results panel">
      <div class="panel-heading"><div><p class="eyebrow">MY TRIP</p><h2>내가 선택한 여행지</h2></div><span class="count" id="selected-count">0곳</span></div>
      <div id="day-tabs" class="day-tabs"><button class="day-tab active" data-day="0">1일차</button></div>
      <div class="day-theme"><span>이 날의 테마</span><select id="day-theme-select"><option>힐링</option><option>맛집 투어</option><option>액티비티</option><option>문화</option></select></div>
      <div id="selected-list" class="selected-list"><div class="empty-state compact-empty">아래 추천 명소에서<br>여행지를 추가해 보세요.</div></div>
    </aside>
    <section class="recommend-dock" aria-label="추천 명소"><div class="dock-heading"><p class="eyebrow">FOR YOUR DAY</p><h3>추천 명소</h3><button class="text-btn">전체 보기</button></div><div id="place-list" class="mini-place-list"></div></section>
  </main>`;

const list = document.querySelector('#place-list');
function renderRecommendedPlaces(theme = document.querySelector('.chip.active')?.dataset.theme || '힐링') {
  const filtered = places.filter((place) => place.themes.includes(theme));
  const visible = filtered.length ? filtered : places;
  list.innerHTML = visible.map((place) => { const index = places.indexOf(place); return `<button class="place" data-index="${index}"><img class="place-thumb" src="${placeImage(place)}" alt="${place.name}" loading="lazy"><span class="place-copy"><strong>${place.name}</strong><small>${place.category} · ${place.stay_minutes || 60}분</small></span><span class="add-place">+</span></button>`; }).join('');
}
renderRecommendedPlaces();

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
    const marker = new naver.maps.Marker({ map: null, position: new naver.maps.LatLng(place.lat, place.lng), title: place.name });
    markers.push(marker);
    naver.maps.Event.addListener(marker, 'click', () => focusPlace(place, marker));
  });
  syncMapMarkers();
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
function syncMapMarkers() {
  if (!map || !markers.length || typeof dayPlans === 'undefined') return;
  const activeEntries = [];
  markers.forEach((marker, index) => {
    const place = places[index];
    const dayIndex = dayPlans.findIndex((plan) => plan.places.some((item) => item.id === place.id));
    if (dayIndex < 0) {
      marker.setMap(null);
      return;
    }
    const order = dayPlans[dayIndex].places.findIndex((item) => item.id === place.id) + 1;
    activeEntries.push({ marker, place, dayIndex, order });
  });
  const groups = new Map();
  activeEntries.forEach((entry) => {
    const key = `${entry.place.lat.toFixed(3)}:${entry.place.lng.toFixed(3)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  });
  activeEntries.forEach((entry) => {
    const key = `${entry.place.lat.toFixed(3)}:${entry.place.lng.toFixed(3)}`;
    const group = groups.get(key);
    const groupIndex = group.indexOf(entry);
    const angle = (Math.PI * 2 * groupIndex) / Math.max(group.length, 1);
    const radius = group.length > 1 ? 0.00035 : 0;
    entry.marker.setPosition(new naver.maps.LatLng(entry.place.lat + Math.sin(angle) * radius, entry.place.lng + Math.cos(angle) * radius));
    entry.marker.setIcon(markerIcon(entry.dayIndex + 1, entry.order));
    entry.marker.setMap(entry.dayIndex === currentDay ? map : null);
  });
}
list.addEventListener('click', (event) => {
  const button = event.target.closest('.place');
  if (!button) return;
  const index = Number(button.dataset.index);
  const place = places[index];
  if (map) focusPlace(place, markers[index]);
  if (!currentPlaces().some((item) => item.id === place.id)) currentPlaces().push(place);
  syncMapMarkers();
  renderSelected();
});

function renderSelected() {
const selected = currentPlaces();
  document.querySelector('#selected-count').textContent = `${selected.length}곳`;
  document.querySelector('#selected-list').innerHTML = selected.length ? selected.map((place, index) => `<div class="selected-place"><span class="route-number">${index + 1}</span><img class="route-thumb" src="${placeImage(place)}" alt="${place.name}" loading="lazy"><div class="route-copy"><strong>${place.name}</strong><small>${place.category} · ${place.stay_minutes || 60}분</small></div><button data-remove="${place.name}">×</button></div>`).join('') : '<div class="empty-state">이 날짜에 갈 장소를<br>아래 추천 목록에서 추가해 보세요.</div>';
}

document.querySelector('#selected-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove]');
  if (!button) return;
  const index = currentPlaces().findIndex((place) => place.name === button.dataset.remove);
  if (index >= 0) currentPlaces().splice(index, 1);
  syncMapMarkers();
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
    renderDayTabs(days); renderSelected(); syncMapMarkers();
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
document.querySelectorAll('.chip').forEach((chip) => chip.addEventListener('click', () => { document.querySelectorAll('.chip').forEach((item) => item.classList.remove('active')); chip.classList.add('active'); renderRecommendedPlaces(chip.dataset.theme); }));
document.querySelectorAll('.transport-btn').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('.transport-btn').forEach((item) => item.classList.remove('active')); button.classList.add('active'); }));
document.querySelector('#recommend-btn').addEventListener('click', () => { const selected = currentPlaces(); if (!selected.length) { places.slice(0, 2).forEach((place) => selected.push(place)); renderSelected(); syncMapMarkers(); } setStatus(`${dayPlans[currentDay].theme} 테마로 ${currentDay + 1}일차 ${selected.length}곳 코스를 만들었습니다.`); });

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
