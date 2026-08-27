/**
 * 흰 화면 자가복구 스크립트 — 리액트가 죽어 있어도 돌아야 하므로 인라인 ES5 문자열이다.
 *
 * 왜 필요한가 (2026-08-27, 학교 웨일북 실측 재현):
 * 배포할 때마다 `/_next/static/chunks/*` 의 해시 파일명이 바뀌고, Cloudflare Workers
 * Assets 는 **이전 배포의 청크를 더 이상 서빙하지 않는다**(실측: 옛 해시 → 404).
 * 그런데 학교 기기는 낡은 HTML 을 오래 들고 있는 경우가 있다(탭을 며칠씩 열어 둠,
 * 회선이 끊긴 순간의 캐시 응답, 뒤로가기 복원). 그러면
 *   낡은 HTML → 사라진 청크 요청 → 404 → 리액트가 아예 마운트되지 않음
 * 이 되고, **아무 예외도 던지지 않은 채** 화면이 비어 버린다(스크립트 404 는
 * window.onerror 가 아니라 캡처 단계 error 이벤트로만 온다). 그래서 에러 바운더리도
 * 안 걸리고, 학생 입장에선 "쿠키를 전부 지워야 열리는" 흰 화면이 된다.
 *
 * 대응 3단:
 *  ① 정적 자산(script/link)의 로드 실패를 캡처 단계에서 잡아 즉시 1회 재적재
 *  ② 동적 import 실패(ChunkLoadError 계열)도 같은 경로로
 *  ③ 아무 신호 없이 조용히 죽는 경우 대비 — load 완료 후에도 리액트가 마운트되지
 *     않았으면(=워치독) 재적재. load 이후에만 보므로 "느린 회선" 오탐이 없다.
 *
 * 안전장치: 60초 쿨다운(무한 새로고침 금지) · 오프라인이면 시도하지 않음 ·
 * 재적재로도 살아나지 않으면 흰 화면 대신 안내 카드를 직접 그린다.
 * localStorage(학습 진도)는 절대 건드리지 않는다 — 지우는 건 캐시뿐이다.
 */
export const RECOVERY_SCRIPT = `(function(){
try{
var K='echotale:recovered';
var dark=function(){try{return document.documentElement.classList.contains('dark')}catch(e){return false}};
function clearCaches(done){
  try{
    if(window.caches&&caches.keys){
      caches.keys().then(function(ks){return Promise.all(ks.map(function(k){return caches.delete(k)}))}).then(done,done);
      return;
    }
  }catch(e){}
  done();
}
function card(){
  try{
    if(document.getElementById('et-recovery')||!document.body) return;
    var d=dark();
    var w=document.createElement('div');
    w.id='et-recovery';
    w.setAttribute('style','position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center;font-family:system-ui,-apple-system,sans-serif;background:'+(d?'#14181c':'#ffffff')+';color:'+(d?'#e8eaed':'#1f2937'));
    w.innerHTML='<div style="font-size:44px">🌧️</div>'
      +'<div style="font-size:19px;font-weight:800">앱을 새로 받아야 해요</div>'
      +'<div style="font-size:14px;line-height:1.7;max-width:22em;color:'+(d?'#9aa4af':'#6b7280')+'">에코테일이 업데이트돼서 기기에 남아 있던 예전 화면이 열리지 않았어요.<br>아래 버튼을 누르면 새로 열려요. <b>학습 기록은 그대로 남아요.</b></div>'
      +'<button id="et-recovery-btn" style="margin-top:4px;border:0;border-radius:999px;padding:14px 28px;font-size:16px;font-weight:800;cursor:pointer;background:#7c9885;color:#fff">새로 열기</button>';
    document.body.appendChild(w);
    var b=document.getElementById('et-recovery-btn');
    if(b) b.onclick=function(){
      b.disabled=true;b.textContent='여는 중…';
      try{sessionStorage.removeItem(K)}catch(e){}
      clearCaches(function(){location.reload()});
    };
  }catch(e){}
}
function recover(){
  if(window.__etRecovering) return;
  try{if(navigator.onLine===false) return}catch(e){}
  var now=Date.now(),last=0;
  try{last=+(sessionStorage.getItem(K)||0)||0}catch(e){}
  if(now-last<60000){card();return;}   // 이미 한 번 새로 받았는데도 안 되면 안내 카드
  window.__etRecovering=true;
  try{sessionStorage.setItem(K,String(now))}catch(e){}
  clearCaches(function(){try{location.reload()}catch(e){}});
}
addEventListener('error',function(e){
  var t=e&&e.target;
  if(!t||!t.tagName) return;                       // 자산 로드 실패만(스크립트 예외 아님)
  var u=t.src||t.href||'';
  if(u.indexOf('/_next/static/')>-1) recover();
},true);
addEventListener('unhandledrejection',function(e){
  var r=e&&e.reason,m=(r&&(r.message||r.name))||'';
  if(/ChunkLoadError|Loading chunk|dynamically imported module|Importing a module script failed/i.test(String(m))) recover();
});
var arm=function(){setTimeout(function(){if(!window.__etAlive) recover()},3000)};
if(document.readyState==='complete') arm(); else addEventListener('load',arm);
}catch(e){}
})();`;
