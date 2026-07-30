/* ============================================================
   🗺 구글맵 헬퍼 — index.html / admin.html 공용
   ============================================================ */

/* ⚠️ 여기에 본인의 Google Maps API 키를 넣으세요.
   1. Google Cloud Console → 프로젝트 선택
   2. "API 및 서비스" → "라이브러리"에서 다음 2개 사용 설정:
      - Maps JavaScript API
      - Geocoding API
   3. "사용자 인증 정보" → API 키 생성
   4. 키 제한 설정 권장: HTTP 리퍼러 제한을 본인의 깃허브 페이지 주소로 지정
      (예: https://본인계정.github.io/*)
   5. 아래에 붙여넣기 */
const GOOGLE_MAPS_API_KEY = "AIzaSyCzHPdcvkMJOjmieetYDQfoZOPPO4vPuk8";

function isMapsConfigured(){
  return GOOGLE_MAPS_API_KEY && !GOOGLE_MAPS_API_KEY.startsWith("PASTE_");
}

let _mapsLoadPromise = null;
function loadGoogleMaps(){
  if(_mapsLoadPromise) return _mapsLoadPromise;
  _mapsLoadPromise = new Promise((resolve, reject) => {
    if(!isMapsConfigured()){ reject(new Error("not configured")); return; }
    if(window.google && window.google.maps){ resolve(); return; }
    window.__onGoogleMapsLoaded = () => resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=__onGoogleMapsLoaded`;
    script.onerror = () => reject(new Error("script load failed"));
    document.head.appendChild(script);
  });
  return _mapsLoadPromise;
}

const _geocodeCache = {}; // mapsQ 문자열 → {lat,lng} 캐시 (같은 세션 내 재조회 방지)
let _geocoder = null;

function geocodeOne(query){
  if(_geocodeCache[query]) return Promise.resolve(_geocodeCache[query]);
  if(!_geocoder) _geocoder = new google.maps.Geocoder();
  return _geocoder.geocode({ address: query }).then(res => {
    const loc = res.results[0]?.geometry?.location;
    if(!loc) return null;
    const point = { lat: loc.lat(), lng: loc.lng() };
    _geocodeCache[query] = point;
    return point;
  }).catch(() => null);
}

const _dayMapRendered = {}; // containerId → true (한 번 그린 지도는 다시 안 그림)

/**
 * items: [{title, mapsQ}, ...] 순서대로 번호 마커 표시 + 선으로 연결
 */
async function renderDayMap(containerId, items){
  const container = document.getElementById(containerId);
  if(!container) return;

  if(!isMapsConfigured()){
    container.innerHTML = `<div class="map-placeholder">🗺 지도 표시 안 됨 — API 키 미설정</div>`;
    return;
  }
  if(_dayMapRendered[containerId]) return; // 이미 그렸으면 스킵 (탭 재방문 시)

  container.innerHTML = `<div class="map-placeholder">지도 불러오는 중...</div>`;

  try{
    await loadGoogleMaps();
  }catch(e){
    container.innerHTML = `<div class="map-placeholder">🗺 지도를 불러오지 못했어요 (API 키 확인 필요)</div>`;
    return;
  }

  const targets = items.filter(it => it.mapsQ);
  if(targets.length === 0){
    container.innerHTML = `<div class="map-placeholder">이 날짜엔 표시할 위치가 없어요</div>`;
    return;
  }

  const map = new google.maps.Map(container, {
    center: { lat: 40.3, lng: 140.6 }, // 아오모리·아키타 대략 중심
    zoom: 9,
    mapId: undefined,
  });

  const points = [];
  const bounds = new google.maps.LatLngBounds();

  for(let i = 0; i < targets.length; i++){
    const pt = await geocodeOne(targets[i].mapsQ);
    if(!pt) continue;
    points.push(pt);
    bounds.extend(pt);
    new google.maps.Marker({
      position: pt,
      map,
      label: { text: String(i+1), color: "#fff", fontWeight: "700", fontSize: "12px" },
      title: targets[i].title,
    });
  }

  if(points.length > 1){
    new google.maps.Polyline({
      path: points,
      map,
      strokeColor: "#a8432e",
      strokeOpacity: 0.85,
      strokeWeight: 2.5,
    });
  }
  if(points.length > 0) map.fitBounds(bounds, 40);

  _dayMapRendered[containerId] = true;
}
