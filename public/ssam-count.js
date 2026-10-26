/* ssam-count — «오늘 ○명 · 누적 ○명» 한 줄(선행쌤 공용 카운터 · 2026-10-26).
 * 쓰는 법: 이 파일을 앱에 복사하고 <script src="/ssam-count.js" data-app="<앱 id>" defer></script>
 * 놓는 자리: [data-ssam-count] 가 있으면 그 안, 없으면 선행쌤 배너([data-gb=site-link]) 바로 위, 그것도 없으면 body 맨 앞.
 *   data-place="host" 면 [data-ssam-count] 가 있는 화면에서만 그린다(세기는 어느 화면에서나 — 여러 쪽짜리 앱).
 * 개인정보 0 — 기기에 무작위 id 하나만 두고(localStorage) 서버는 그걸 한 번 더 바꾼 값으로 센다. 실패하면 아무것도 안 그린다. */
(function () {
  var API = 'https://ssam-count.simssijjang-korea.workers.dev/hit';
  var me = document.currentScript;
  var app = (me && me.dataset.app) || '';
  var hostOnly = !!(me && me.dataset.place === 'host');
  if (!app || typeof fetch !== 'function') return;
  // 로컬 개발·시험 화면은 세지 않는다(출처 미등록 → 콘솔 CORS 오류가 게임 e2e 의 «콘솔 에러 0»을 깬다 · 2026-10-26 미현상 verify-all)
  var h = location.hostname;
  if (location.protocol === 'file:' || h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || /\.(test|localhost)$/.test(h)) return;
  var did = '';
  try {
    did = localStorage.getItem('ssam.did') || '';
    if (!/^[a-z0-9]{16,64}$/.test(did)) {
      var a = new Uint8Array(16); crypto.getRandomValues(a);
      did = Array.prototype.map.call(a, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
      localStorage.setItem('ssam.did', did);
    }
  } catch (e) { return; }
  function fmt(n) { return Number(n || 0).toLocaleString('ko-KR'); }
  function draw(c) {
    var el = document.createElement('div');
    el.setAttribute('data-ssam-count-line', '');
    el.setAttribute('aria-label', '오늘 이용자 ' + fmt(c.today) + '명, 누적 ' + fmt(c.total) + '명');
    el.style.cssText = 'display:flex;justify-content:center;gap:6px;margin:6px auto;font:500 13px/1.4 system-ui,-apple-system,"Apple SD Gothic Neo",sans-serif;color:inherit;opacity:.75;';
    el.innerHTML = '<span>오늘 <b>' + fmt(c.today) + '</b>명</span><span aria-hidden="true">·</span><span>누적 <b>' + fmt(c.total) + '</b>명</span>';
    var host = document.querySelector('[data-ssam-count]');
    if (host) { host.innerHTML = ''; host.appendChild(el); return; }
    if (hostOnly) return;
    var site = document.querySelector('[data-gb="site-link"]');
    if (site && site.parentNode) { site.parentNode.insertBefore(el, site); return; }
    document.body.insertBefore(el, document.body.firstChild);
  }
  function go() {
    fetch(API + '?app=' + encodeURIComponent(app), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ app: app, did: did }) })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (c) {
        if (!c || typeof c.today !== 'number') return;
        // 페이지 다 뜬 뒤(+0.5초) 그린다 — React·Next 가 화면을 «이어받는»(hydration) 도중에 끼우면 지워지거나 오류가 난다
        var t = 0;
        function wait() { if (document.querySelector('[data-ssam-count],[data-gb="site-link"]') || ++t > 20) draw(c); else setTimeout(wait, 250); }
        function later() { setTimeout(wait, 500); }
        if (document.readyState === 'complete') later(); else window.addEventListener('load', later);
      })
      .catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
