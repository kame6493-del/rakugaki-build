// iOS アプリの中だけで読む(scripts/ios_strip.py が www/index.html の main.js の後に差し込む)。
// レースの手ごたえを本体の振動で返す。ネイティブ側は ios/App/App/SceneDelegate.swift の RaceFeelPlugin。
// 効果音の se() を包んで、自分の子に起きた事(音量の大きい音)だけを振動にする。能力や有利不利は何も伝えない。
(function () {
  'use strict';
  var C = window.Capacitor;
  if (!C || !C.getPlatform || C.getPlatform() !== 'ios' || typeof C.registerPlugin !== 'function') return;
  var Feel = C.registerPlugin('RaceFeel');
  var last = 0;
  function feel(kind) {
    var now = Date.now();
    if (kind !== 'start' && kind !== 'win' && kind !== 'lose' && now - last < 120) return;
    last = now;
    try { var p = Feel.feel({ kind: kind }); if (p && p.catch) p.catch(function () { }); } catch (e) { }
  }
  var MAP = { pistol: 'start', trip: 'bump', bonk: 'bump', knock: 'bump', item: 'item', fanfare: 'win', chan: 'lose' };
  var inRace = function () { try { return curScreen === 'race'; } catch (e) { return false; } };
  if (typeof window.se === 'function') {
    var orig = window.se;
    window.se = function (name, vol) {
      var r = orig.apply(this, arguments);
      var k = MAP[name];
      // 自分の子の音は 0.45 より大きい(ほかの子は 0.2〜0.25)
      if (k && inRace() && (vol == null || vol >= 0.45)) feel(k);
      return r;
    };
  }
  var pad = document.getElementById('pad');
  if (pad) pad.addEventListener('pointerdown', function () { feel('stroke'); }, { passive: true });
  window.__raceFeel = feel; // 試験用
})();
