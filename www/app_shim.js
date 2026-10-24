// アプリ版の中だけで読む(scripts/copy_www.py が www/index.html の main.js の前に差し込む)。Web 版には入れない。
// - 共有: WebView には navigator.share が無いので、@capacitor/share と @capacitor/filesystem で同じ形の物を用意する
// - 外のページ(X の投稿画面・フォロー): Capacitor が外のブラウザ/アプリで開く(location へ入れる)
// - 戻るボタン: 画面ごとの「もどる」を押す。タイトルなら閉じる
(function () {
  'use strict';
  var C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;
  var P = C.Plugins || {};
  document.documentElement.classList.add('in-app');

  function blobToB64(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { var s = String(r.result); res(s.slice(s.indexOf(',') + 1)); };
      r.onerror = function () { rej(r.error); };
      r.readAsDataURL(blob);
    });
  }
  function abortErr() { try { return new DOMException('canceled', 'AbortError'); } catch (e) { var x = new Error('canceled'); x.name = 'AbortError'; return x; } }

  navigator.canShare = function (data) { return !!(P.Share && data && (data.files || data.url || data.text)); };
  navigator.share = async function (data) {
    data = data || {};
    var opts = {};
    if (data.title) opts.title = data.title;
    var text = data.text || '';
    if (data.url) text = text ? text + '\n' + data.url : data.url;
    if (text) opts.text = text;
    if (data.files && data.files.length) {
      var uris = [];
      for (var i = 0; i < data.files.length; i++) {
        var f = data.files[i];
        var name = (f.name || ('rakugaki-' + i)).replace(/[\/:*?"<>|\s#%]/g, '') || ('rakugaki-' + i);
        var w = await P.Filesystem.writeFile({ path: 'share/' + Date.now() + '-' + name, data: await blobToB64(f), directory: 'CACHE', recursive: true });
        uris.push(w.uri);
      }
      opts.files = uris;
    }
    opts.dialogTitle = window.L ? window.L('らくがき運動会') : 'らくがき運動会';
    try { await P.Share.share(opts); }
    catch (e) { var m = String(e && (e.message || e)); if (/cancel/i.test(m)) throw abortErr(); throw e; }
  };

  // 外のページは外のアプリ/ブラウザで開く(このアプリの画面は残る)
  function openOut(url) { if (!url || /^#/.test(url)) return; var a = document.createElement('a'); a.href = url; location.href = a.href; }
  window.open = function (url) { openOut(url); return null; };
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a || ev.defaultPrevented) return;
    var href = a.getAttribute('href') || '';
    if (/^https?:/i.test(href) && a.host !== location.host) { ev.preventDefault(); openOut(a.href); }
  });

  // 戻るボタン
  var BACK = { drawScreen: 'drawBackBtn', prepScreen: 'prepBackBtn', linkScreen: 'linkHomeBtn', roomScreen: 'roomLeaveBtn', galleryScreen: 'galBackBtn', resultScreen: 'homeBtn', albumScreen: 'albumBackBtn', petScreen: 'petBackBtn', taScreen: 'taBackBtn', rankScreen: 'rankBackBtn', fullScreen: 'fullBackBtn' };
  function el(id) { return document.getElementById(id); }
  function onBack() {
    var cur = typeof curScreen !== 'undefined' ? curScreen : 'titleScreen';
    if (cur === 'titleScreen') {
      var credit = el('creditBox'); if (credit && !credit.classList.contains('hidden')) { credit.classList.add('hidden'); return; }
      var vs = el('vsMenu'); if (vs && !vs.classList.contains('hidden')) { el('vsBackBtn').click(); return; }
      if (P.App) P.App.exitApp();
      return;
    }
    if (cur === 'race') { try { if (typeof Room !== 'undefined' && Room.code) Room.leave(); } catch (e) { } goTitle(); return; }
    var b = el(BACK[cur]);
    if (b) b.click(); else goTitle();
  }
  window.__appBack = onBack; // 試験用
  if (P.App) P.App.addListener('backButton', onBack);
})();
