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
function closePlaceInfo() { if (infoWindow) infoWindow.close(); }
const dayColors = ['#1769e0', '#e05b38', '#8b5cf6', '#159a70', '#d18b19'];
function markerIcon(day, order) {
  const color = dayColors[(day - 1) % dayColors.length];
  return { content: `<div class="route-pin" style="--pin-color:${color}"><span>${order}</span></div>`, anchor: new naver.maps.Point(15, 36) };
}

document.querySelector('#app').innerHTML = `
  <main class="explorer">
    <section id="map" aria-label="포항 전체 지도"></section>
    <div class="map-scrim"></div>
    <button class="peek-tab peek-top" id="peek-top" aria-label="추천기 열기"><span>추천기 열기</span><b aria-hidden="true">⌄</b></button>
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
      <div class="panel-heading"><div><p class="eyebrow">MY TRIP</p><h2>내가 선택한 여행지</h2></div><div class="heading-actions"><span class="count" id="selected-count">0곳</span><button id="report-button" class="report-button" type="button">보고서</button></div></div>
      <div class="place-search"><label for="place-search-input">여행지 직접 추가</label><div class="place-search-row"><input id="place-search-input" type="search" placeholder="포항 장소 검색" autocomplete="off"><button id="place-search-button" type="button">검색</button></div><div id="place-search-results" class="place-search-results" aria-live="polite"></div></div>
      <div id="day-tabs" class="day-tabs"><button class="day-tab active" data-day="0">1일차</button></div>
      <div class="day-theme"><span>이 날의 테마</span><select id="day-theme-select"><option>힐링</option><option>맛집 투어</option><option>액티비티</option><option>문화</option></select></div>
      <div id="selected-list" class="selected-list"><div class="empty-state compact-empty">아래 추천 명소에서<br>여행지를 추가해 보세요.</div></div>
    </aside>
    <section class="recommend-dock" aria-label="추천 명소"><div class="dock-heading"><p class="eyebrow">FOR YOUR DAY</p><h3>추천 명소</h3><button class="text-btn">전체 보기</button></div><div id="place-list" class="mini-place-list"></div></section>
    <div id="report-modal" class="report-modal hidden" role="dialog" aria-modal="true" aria-labelledby="report-title"><div class="report-sheet"><button id="report-close" class="report-close" type="button" aria-label="닫기">×</button><div id="report-content"></div><div id="report-route" class="report-route"></div><div class="report-share"><div><strong>이 일정 공유하기</strong><small>QR코드를 스캔하면 같은 일정으로 열립니다.</small><button id="report-image-button" class="report-image-button" type="button">보고서 이미지 저장</button></div><img id="report-qr" alt="여행 일정 공유 QR코드"></div></div></div>
  </main>`;

const list = document.querySelector('#place-list');
let recommendationVelocity = 0;
let recommendationFrame = null;
function animateRecommendationScroll() {
  recommendationFrame = requestAnimationFrame(() => {
    list.scrollLeft += recommendationVelocity;
    recommendationVelocity *= 0.9;
    if (Math.abs(recommendationVelocity) > 0.15) animateRecommendationScroll();
    else { recommendationVelocity = 0; recommendationFrame = null; }
  });
}
list.addEventListener('wheel', (event) => {
  if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
  event.preventDefault();
  const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? list.clientWidth : 1;
  recommendationVelocity += event.deltaY * multiplier * 0.22;
  recommendationVelocity = Math.max(-42, Math.min(42, recommendationVelocity));
  if (!recommendationFrame) animateRecommendationScroll();
}, { passive: false });
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
    closePlaceInfo();
    const explorer = document.querySelector('.explorer');
    if (!explorer.classList.contains('panels-collapsed')) explorer.classList.add('panels-collapsed');
  });
  setStatus('지도 연결 성공 · 장소를 선택해 보세요.');
}

function focusPlace(place, marker) {
  const target = marker.getPosition();
  map.setCenter(target);
  window.requestAnimationFrame(() => {
    const mapEl = document.querySelector('#map');
    const leftPanel = document.querySelector('.planner').getBoundingClientRect();
    const rightPanel = document.querySelector('.results').getBoundingClientRect();
    const dock = document.querySelector('.recommend-dock').getBoundingClientRect();
    const mapRect = mapEl.getBoundingClientRect();
    const visibleLeft = Math.max(mapRect.left, leftPanel.right);
    const visibleRight = Math.min(mapRect.right, rightPanel.left);
    const visibleTop = mapRect.top;
    const visibleBottom = Math.min(mapRect.bottom, dock.top);
    const targetX = (visibleLeft + visibleRight) / 2 - mapRect.left;
    const targetY = (visibleTop + visibleBottom) / 2 - mapRect.top;
    const centerX = mapRect.width / 2;
    const centerY = mapRect.height / 2;
    map.panBy(new naver.maps.Point(targetX - centerX, targetY - centerY));
  });
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
    // 일차를 바꿔도 전체 여행 경로의 핀은 계속 표시하고 색상으로 일차를 구분합니다.
    entry.marker.setMap(map);
  });
}
list.addEventListener('click', (event) => {
  closePlaceInfo();
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

function addSearchedPlace(item) {
  const place = {
    id: `naver-${item.mapx}-${item.mapy}`,
    name: item.title.replace(/<[^>]*>/g, ''), category: item.category || '검색 장소',
    address: item.roadAddress || item.address || '', description: '네이버 지역 검색 결과',
    lat: Number(item.mapy) / 10000000, lng: Number(item.mapx) / 10000000,
    themes: ['힐링'], companions: ['혼자', '연인', '가족', '친구', '동료'], weather: ['맑음', '흐림', '비', '눈'],
    space_type: '실내·실외', stay_minutes: 60, image_url: '', official_url: item.link || ''
  };
  const existingIndex = places.findIndex((candidate) => candidate.id === place.id);
  if (existingIndex >= 0) return places[existingIndex];
  places.push(place);
  const marker = new naver.maps.Marker({ position: new naver.maps.LatLng(place.lat, place.lng), map: null, title: place.name });
  naver.maps.Event.addListener(marker, 'click', () => focusPlace(place, marker));
  markers.push(marker);
  return place;
}
function renderNaverSearchResults(items = []) {
  const container = document.querySelector('#place-search-results');
  container.innerHTML = items.length ? items.map((item, index) => `<button class="search-result" type="button" data-search-index="${index}"><span><strong>${item.title.replace(/<[^>]*>/g, '')}</strong><small>${item.category || '장소'} · ${item.roadAddress || item.address || ''}</small></span><b>+</b></button>`).join('') : '<p class="search-empty">검색 결과가 없습니다.</p>';
  container._items = items;
}
document.querySelector('#place-search-button').addEventListener('click', async () => {
  const input = document.querySelector('#place-search-input'); const query = input.value.trim();
  if (!query) return;
  const container = document.querySelector('#place-search-results'); container.innerHTML = '<p class="search-empty">네이버에서 검색 중입니다...</p>';
  try {
    const response = await fetch(`/api/search-local?query=${encodeURIComponent(query)}`); const data = await response.json();
    if (!response.ok) throw new Error(data.message || '검색에 실패했습니다.');
    renderNaverSearchResults(data.items);
  } catch (error) { container.innerHTML = `<p class="search-empty">${error.message}</p>`; }
});
document.querySelector('#place-search-input').addEventListener('keydown', (event) => { if (event.key === 'Enter') document.querySelector('#place-search-button').click(); });
document.querySelector('#place-search-results').addEventListener('click', (event) => {
  const button = event.target.closest('[data-search-index]'); const container = document.querySelector('#place-search-results');
  if (!button || !container._items) return;
  const place = addSearchedPlace(container._items[Number(button.dataset.searchIndex)]);
  if (!currentPlaces().some((item) => item.id === place.id)) currentPlaces().push(place);
  renderSelected(); syncMapMarkers(); if (map) focusPlace(place, markers[places.indexOf(place)]);
  button.querySelector('b').textContent = '추가됨'; button.disabled = true;
});

document.querySelector('#selected-list').addEventListener('click', (event) => {
  closePlaceInfo();
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
document.addEventListener('click', (event) => {
  if (!event.target.closest('.route-pin')) closePlaceInfo();
}, true);

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
function distanceKm(a, b) {
  const lat = (b.lat - a.lat) * Math.PI / 180; const lng = (b.lng - a.lng) * Math.PI / 180;
  const x = lng * Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180); const y = lat;
  return Math.sqrt(x * x + y * y) * 6371;
}
function travelMinutes(a, b, transport) {
  const km = distanceKm(a, b);
  return Math.max(5, Math.round(km / (transport === '대중교통' ? 0.35 : 0.58) * 60) + 5);
}
function seasonForDate(date) {
  if (!date) return '사계절';
  const month = Number(date.slice(5, 7));
  if (month <= 2 || month === 12) return '겨울';
  if (month <= 5) return '봄';
  if (month <= 8) return '여름';
  return '가을';
}
function isEventActive(place, date) {
  return Boolean(place.event_start && place.event_end && date && date >= place.event_start && date <= place.event_end);
}
function recommendDayRoute(dayIndex, date, theme, usedIds) {
  const weather = document.querySelector('#weather').value;
  const transport = document.querySelector('.transport-btn.active')?.textContent.includes('대중') ? '대중교통' : '자차';
  const availableMinutes = Number.parseInt(document.querySelector('#duration').value, 10) * 60;
  const people = Number.parseInt(document.querySelector('#people-count').textContent, 10);
  const season = seasonForDate(date);
  const badWeather = ['비', '눈'].includes(weather);
  const candidates = places.filter((place) => {
    if (usedIds.has(place.id)) return false;
    if (place.recommended_day && !place.recommended_day.split('|').includes(String(dayIndex + 1))) return false;
    if (!place.transport_tags.split('|').includes(transport)) return false;
    if (badWeather && !place.space_type.includes('실내') && !place.weather.includes(weather)) return false;
    return true;
  }).map((place) => {
    let score = Number(place.priority) || 0;
    if (place.themes.includes(theme)) score += 8;
    if (place.weather.includes(weather)) score += 4;
    if (badWeather && place.space_type.includes('실내')) score += 6;
    if (place.companions.includes(people === 1 ? '혼자' : people >= 4 ? '가족' : '연인') || place.companions.includes('친구')) score += 2;
    if (place.season_tags.includes(season) || place.season_tags.includes('사계절')) score += 2;
    if (isEventActive(place, date)) score += 7;
    return { place, score };
  }).sort((a, b) => b.score - a.score);
  const route = []; let totalMinutes = 0; let previous = null;
  while (candidates.length && route.length < 5) {
    const nextIndex = previous ? candidates.reduce((best, item, index) => {
      const bestValue = candidates[best] ? candidates[best].score - distanceKm(previous, candidates[best].place) * 2 : -Infinity;
      const value = item.score - distanceKm(previous, item.place) * 2;
      return value > bestValue ? index : best;
    }, 0) : 0;
    const next = candidates.splice(nextIndex, 1)[0].place;
    const move = previous ? travelMinutes(previous, next, transport) : 0;
    const stay = Number(next.stay_minutes) || 60;
    if (route.length && totalMinutes + move + stay > availableMinutes) continue;
    route.push(next); totalMinutes += move + stay; previous = next;
  }
  return route;
}
function recommendItinerary() {
  const startDate = calendarStart || new Date().toISOString().slice(0, 10);
  const dates = dayPlans.map((_, index) => {
    const date = new Date(`${startDate}T00:00:00`); date.setDate(date.getDate() + index);
    return date.toISOString().slice(0, 10);
  });
  const theme = document.querySelector('.chip.active')?.dataset.theme || '힐링';
  const usedIds = new Set();
  dayPlans.forEach((plan, index) => { plan.theme = theme; plan.places = recommendDayRoute(index, dates[index], theme, usedIds); plan.places.forEach((place) => usedIds.add(place.id)); });
  currentDay = 0; renderDayTabs(dayPlans.length); renderSelected(); syncMapMarkers();
  setStatus(`${theme} 테마 기준으로 ${dayPlans.length}일 코스를 추천해 선택한 여행지에 반영했습니다.`);
}
document.querySelector('#recommend-btn').addEventListener('click', recommendItinerary);

function encodeTripState() {
  const state = { days: dayPlans.map((plan) => ({ theme: plan.theme, places: plan.places.map((place) => places.some((item) => item.id === place.id) ? place.id : { id: place.id, name: place.name, category: place.category, address: place.address, lat: place.lat, lng: place.lng, stay_minutes: place.stay_minutes, themes: place.themes, companions: place.companions, weather: place.weather, space_type: place.space_type }) })) };
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
}
function renderReport() {
  const totalPlaces = dayPlans.reduce((sum, plan) => sum + plan.places.length, 0);
  const totalMinutes = dayPlans.reduce((sum, plan) => sum + plan.places.reduce((daySum, place) => daySum + (Number(place.stay_minutes) || 60), 0), 0);
  const start = calendarStart || ''; const report = document.querySelector('#report-content');
  report.innerHTML = `<p class="report-kicker">POHANG EXPLORER</p><h2 id="report-title">포항 나들이 일정 보고서</h2><p class="report-date">${start ? `${start.replaceAll('-', '.')}부터 ${dayPlans.length}일 일정` : '나만의 포항 여행 일정'}</p><div class="report-stats"><span><b>${totalPlaces}</b><small>선택 장소</small></span><span><b>${Math.round(totalMinutes / 60)}시간</b><small>예상 체류</small></span><span><b>${dayPlans.length}일</b><small>여행 기간</small></span></div>${dayPlans.map((plan, dayIndex) => `<section class="report-day"><h3><i>${dayIndex + 1}</i>${dayIndex + 1}일차 · ${plan.theme}</h3>${plan.places.length ? plan.places.map((place, index) => `<div class="report-place"><b>${index + 1}</b><img src="${placeImage(place)}" alt=""><div><strong>${place.name}</strong><small>${place.category} · ${place.stay_minutes || 60}분</small><p>${place.address || '포항 여행 추천 장소'}</p></div></div>`).join('') : '<p class="report-empty">아직 선택한 여행지가 없습니다.</p>'}</section>`).join('')}<p class="report-tip">여행 조건과 장소를 바꾸면 보고서를 다시 생성할 수 있습니다.</p>`;
  const shareUrl = `${window.location.origin}${window.location.pathname}#trip=${encodeURIComponent(encodeTripState())}`;
  document.querySelector('#report-qr').src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareUrl)}`;
}
async function loadReportRoutes() {
  const routeBox = document.querySelector('#report-route');
  routeBox.innerHTML = '<p class="route-loading">자차 이동 경로를 계산하는 중입니다...</p>';
  const routes = [];
  for (const plan of dayPlans) {
    const dayRoutes = [];
    for (let index = 0; index < plan.places.length - 1; index += 1) {
      const from = plan.places[index]; const to = plan.places[index + 1];
      try {
        const response = await fetch(`/api/directions15?start=${from.lng},${from.lat}&goal=${to.lng},${to.lat}`);
        const data = await response.json(); if (!response.ok) throw new Error(data.message);
        dayRoutes.push({ from, to, ...data });
      } catch (error) { dayRoutes.push({ from, to, error: error.message }); }
    }
    routes.push(dayRoutes);
  }
  const allPaths = routes.flatMap((day) => day.flatMap((route) => route.path || []));
  routeBox.innerHTML = `<div class="report-route-heading"><div><p class="report-kicker">ROUTE SUMMARY</p><h3>여행 경로와 이동시간</h3></div><a class="transit-link" href="${routes.flat()[0] ? `https://map.naver.com/p/directions/${routes.flat()[0].from.lng},${routes.flat()[0].from.lat},${encodeURIComponent(routes.flat()[0].from.name)}/${routes.flat()[0].to.lng},${routes.flat()[0].to.lat},${encodeURIComponent(routes.flat()[0].to.name)}/-/transit` : 'https://map.naver.com'}" target="_blank" rel="noreferrer">대중교통으로 보기 ↗</a></div><div id="report-route-map" class="report-route-map"></div>${routes.map((dayRoutes, dayIndex) => dayRoutes.length ? `<div class="report-segments"><strong>${dayIndex + 1}일차 이동 구간</strong>${dayRoutes.map((route) => route.summary ? `<p>${route.from.name} <span>→</span> ${route.to.name}<b>${Math.round(route.summary.duration / 60000)}분 · ${(route.summary.distance / 1000).toFixed(1)}km</b><a href="https://map.naver.com/p/directions/${route.from.lng},${route.from.lat},${encodeURIComponent(route.from.name)}/${route.to.lng},${route.to.lat},${encodeURIComponent(route.to.name)}/-/transit" target="_blank" rel="noreferrer">대중교통</a></p>` : `<p>${route.from.name} → ${route.to.name}<b>경로를 계산하지 못했습니다.</b></p>`).join('')}</div>` : '').join('')}`;
  if (window.naver?.maps && allPaths.length) {
    const routeMap = new naver.maps.Map('report-route-map', { center: new naver.maps.LatLng(allPaths[0][1], allPaths[0][0]), zoom: 11, scaleControl: false, mapDataControl: false });
    const bounds = new naver.maps.LatLngBounds();
    routes.flat().forEach((route) => (route.path || []).forEach(([lng, lat]) => bounds.extend(new naver.maps.LatLng(lat, lng))));
    new naver.maps.Polyline({ map: routeMap, path: allPaths.map(([lng, lat]) => new naver.maps.LatLng(lat, lng)), strokeColor: '#1769e0', strokeWeight: 4, strokeOpacity: .8 });
    routeMap.fitBounds(bounds, 30);
  }
}
document.querySelector('#report-button').addEventListener('click', async () => { renderReport(); document.querySelector('#report-modal').classList.remove('hidden'); await loadReportRoutes(); });
document.querySelector('#report-close').addEventListener('click', () => document.querySelector('#report-modal').classList.add('hidden'));
document.querySelector('#report-modal').addEventListener('click', (event) => { if (event.target.id === 'report-modal') event.currentTarget.classList.add('hidden'); });
document.querySelector('#report-image-button').addEventListener('click', async () => {
  const button = document.querySelector('#report-image-button'); button.disabled = true; button.textContent = '이미지 만드는 중...';
  try {
    if (!window.html2canvas) await new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'; script.onload = resolve; script.onerror = reject; document.head.appendChild(script); });
    const canvas = await window.html2canvas(document.querySelector('.report-sheet'), { backgroundColor: '#ffffff', scale: 2, useCORS: true, ignoreElements: (element) => element.classList.contains('report-close'), onclone: (clonedDocument) => { const clonedSheet = clonedDocument.querySelector('.report-sheet'); clonedSheet.style.maxHeight = 'none'; clonedSheet.style.height = 'auto'; clonedSheet.style.overflow = 'visible'; clonedSheet.style.position = 'relative'; clonedSheet.querySelector('.report-close')?.remove(); } });
    const link = document.createElement('a'); link.download = 'pohang-itinerary-report.png'; link.href = canvas.toDataURL('image/png'); link.click();
  } catch { setStatus('보고서 이미지를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
  button.disabled = false; button.textContent = '보고서 이미지 저장';
});
function loadSharedTrip() {
  const encoded = new URLSearchParams(window.location.hash.slice(1)).get('trip');
  if (!encoded) return;
  try {
    const state = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    const sharedPlaces = state.days.flatMap((day) => day.places).filter((place) => typeof place !== 'string' && !places.some((item) => item.id === place.id));
    places.push(...sharedPlaces); dayPlans = state.days.map((day) => ({ theme: day.theme, places: day.places.map((place) => typeof place === 'string' ? places.find((item) => item.id === place) : place).filter(Boolean) })); currentDay = 0;
    renderDayTabs(dayPlans.length); renderSelected(); setStatus('공유받은 여행 일정을 불러왔습니다.');
  } catch { setStatus('공유 일정 링크를 읽지 못했습니다.'); }
}
loadSharedTrip();

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
