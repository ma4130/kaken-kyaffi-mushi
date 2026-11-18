/* テントウムシ（assets/character.png 400×340）の当たり判定の範囲。
   せなかと顔をまとめた楕円を、画像の大きさに対する比率で表す。
   足としょっかくの先は含めない（少しだけやさしめ）。 */
window.CharacterHitRegion = (function () {
  var pts = [], cx = 0.5, cy = 0.53, rx = 0.37, ry = 0.43;
  for (var i = 0; i < 32; i++) {
    var a = (i / 32) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
})();
