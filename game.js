/* ============================================================
   テントウムシの草むらサバイバル ― ゲーム世界と描画
   ------------------------------------------------------------
   このファイルは「草むらの風景・障害物・キャラクター」を <canvas> に
   描き、当たり判定とスコアを管理します。
   カメラや姿勢推定、画面遷移は main.js の担当です。

   奥行きの表現には本物の透視投影を使っています。
   障害物や波は (x, z) というワールド座標を持ち、project() で
   画面座標に変換されます。奥から手前へ一定の速度で近づくため、
   見た目の加速感は遠近法から自然に生まれます。
   ============================================================ */

window.Game = (function () {
  'use strict';

  /* ----------------------------------------------------------
     調整用パラメータ
     ---------------------------------------------------------- */
  var CONFIG = {
    /* --- 遊び方 ---
       'fall'        : 上から降ってくるものをよける（幼稚園児向けの既定）
       'perspective' : 道のむこうから近づいてくるものをよける（元のキャッフィー版と同じ） */
    mode: 'fall',

    /* --- 上から降ってくるモード --- */
    fallLanes: 3,             // 列の数（左・まん中・右。奇数にして、まん中に立っていても降ってくるように）
    fallAreaAspect: 1.3,      // 遊ぶ範囲の幅 ≦ 画面の高さ × この値（横長の画面で列が離れすぎないように）
    fallCharBottom: 0.93,     // テントウムシの足元の高さ（画面の高さに対する比率）
    fallCharLaneFill: 0.80,   // テントウムシの幅 ÷ 列の幅
    fallCharMaxHeight: 0.20,  // テントウムシの高さの上限（画面の高さに対する比率）
    fallObjLaneFill: 0.66,    // 降ってくるものの幅 ÷ 列の幅（下の scale をさらにかける）
    fallItemLaneFill: 0.50,   // アイテムの幅 ÷ 列の幅
    fallReservePx: 0,         // 画面の下にあるタッチ用ボタンの高さ。列がボタンの上まで来るときは、テントウムシをその上に立たせる（main.js が設定）

    /* --- 見え方（すべて画面サイズに対する比率なので解像度に依存しない） --- */
    focalRatio: 0.66,         // 焦点距離 = 画面高さ × この値。大きいほど望遠になる
    focalWidthRatio: 0.62,    // ただし 画面の幅 × この値 より大きくしない（縦長の画面向け）
    horizonRatio: 0.34,       // 水平線の高さ（画面高さに対する比率）
    playerScreenRatio: 0.82,  // キャラクターの足元が来る画面上の位置
    playerZ: 7,               // キャラクターの奥行き（ワールド単位）
    cameraFollow: 0.30,       // カメラがキャラクターを追う割合（0で固定カメラ）

    /* --- 航路 --- */
    laneCount: 7,
    laneHalfWidth: 7.0,       // 航路の半分の幅（ワールド単位）。レーン1本の幅は約2で以前と同じ
    spawnZ: 100,              // 障害物が現れる奥行き
    despawnZ: 2.5,            // これより手前に来た障害物は消す

    /* --- キャラクター --- */
    characterImage: 'assets/character.png',
    characterWorldHeight: 2.0, // キャラクターの高さ（ワールド単位）
    characterEdgeMargin: 1.8,  // 画面の端とキャラクターの中心との最小の間隔（ワールド単位）
    hitHalfWidth: 0.95,        // 当たり判定の半幅（ワールド単位）
    bobAmplitude: 0.06,        // 歩くときの上下の揺れ（ワールド単位）
    bobHz: 2.4,

    /* --- 動き --- */
    moveStiffness: 11.0,      // 追従バネの強さ
    moveDamping: 1.0,         // 減衰比（1.0で臨界減衰＝行き過ぎなし）
    moveMaxSpeed: 60,         // 最大移動速度（ワールド単位/秒）
    physicsStep: 1 / 120,     // 物理演算の固定ステップ

    /* --- 背景写真（朝→昼→夕方→夜）---
       horizon は写真の中で水平線がある高さ（写真の高さに対する比率）。
       ゲームの水平線と重なるように写真の位置と大きさを合わせる。
       写真が読み込めないときは、これまでどおり Canvas で描いた風景になる。 */
    backgrounds: [
      { src: 'assets/bg/morning.webp', horizon: 0.42, light: 0.92 },
      { src: 'assets/bg/day.webp',     horizon: 0.42, light: 1.00 },
      { src: 'assets/bg/sunset.webp',  horizon: 0.42, light: 0.78 },
      { src: 'assets/bg/night.webp',   horizon: 0.42, light: 0.45 },
    ],
    backgroundParallax: 0.25,  // キャラクターの移動に合わせて写真を横にずらす割合

    /* --- 草むらの演出 --- */
    waveRows: 30,             // 土の道に転がる小石の列の数
    waveSpan: 130,            // 小石の列を繰り返す奥行き
    buoySpacing: 8,           // 道ばたの花の間隔
    buoyCount: 14,            // 道ばたの花の数（左右それぞれ）
    flowerHeight: 3.4,        // 花の高さ（ワールド単位）
    flowerOffset: 0.9,        // 花を道の縁からどれだけ外に立てるか
    buoyImages: { left: 'assets/flowers/dandelion.png', right: 'assets/flowers/cosmos.png' },

    /* --- アイテム --- */
    itemsEnabled: false,      // アブラムシ・ハートを出すか（いまは出さない。よけるだけのゲーム）
    itemFirstDelay: 4.0,      // 最初のアイテムが出るまでの秒数
    itemInterval: 6.0,        // アイテムの出現間隔（秒）
    itemJitter: 2.0,          // 出現間隔のばらつき（秒）
    itemHalfWidth: 1.10,      // 取得判定の半幅（ワールド単位）
    heartChance: 0.28,        // ライフ回復アイテムが出る割合
    shrimpImage: 'assets/items/aphid.png',   // 得点アイテム＝アブラムシ（テントウムシの大好物）
    shrimpWidth: 1.5,         // アブラムシの表示幅（ワールド単位）
    heartImage: 'assets/items/heart-red.png',
    heartWidth: 1.43,         // 透過余白を含むハート画像の表示幅

    /* --- スコア --- */
    scorePerSecond: 10,
    scorePerDodge: 25,
    scorePerShrimp: 120,

    /* --- コンボ --- */
    comboPerStep: 5,          // これだけ続けてよけるごとに倍率が上がる
    comboStepBonus: 0.5,      // 1段階あたりの倍率の増分
    comboMaxMultiplier: 3.0,  // 倍率の上限

    invincibleSeconds: 1.8,
  };

  /* 難易度プリセット */
  var DIFFICULTY = {
    /* 幼稚園児が遊ぶので全体にやさしめ。
         bodyScale : テントウムシの当たり判定の大きさ（1 = 見た目どおり。小さいほど当たりにくい）
         doubles   : 2つ同時に出てくることがあるか */
    /* fallSpeed: 上から降ってくるモードの落ちる速さ（1秒に画面の高さの何倍） */
    easy:   { label: 'やさしい',   lives: 5, fallSpeed: 0.24, speed: 20, spawnStart: 2.6, spawnMin: 1.7,  ramp: 20, timeLimit: 20, hitScale: 0.80, bodyScale: 0.75, doubles: false },
    normal: { label: 'ふつう',     lives: 4, fallSpeed: 0.32, speed: 26, spawnStart: 2.0, spawnMin: 1.15, ramp: 20, timeLimit: 20, hitScale: 0.90, bodyScale: 0.85, doubles: false },
    hard:   { label: 'むずかしい', lives: 3, fallSpeed: 0.42, speed: 34, spawnStart: 1.5, spawnMin: 0.75, ramp: 20, timeLimit: 20, hitScale: 1.00, bodyScale: 0.95, doubles: true },
  };

  var OBSTACLE_KINDS = ['web', 'frog', 'mantis'];

  /* 上から降ってくるモードの障害物。scale は列の幅に対する大きさの倍率 */
  var FALL_KINDS = ['spider', 'acorn', 'raindrop', 'leaf'];
  var FALL_IMAGES = {
    spider:   { src: 'assets/falling/spider.png',   scale: 1.05 },  // 糸でおりてくるクモ
    acorn:    { src: 'assets/falling/acorn.png',    scale: 0.80 },  // どんぐり
    raindrop: { src: 'assets/falling/raindrop.png', scale: 0.72 },  // 雨つぶ
    leaf:     { src: 'assets/falling/leaf.png',     scale: 0.95 },  // 落ち葉（ゆらゆら）
  };

  /* 障害物の画像
       width  : 表示する幅（ワールド単位。高さは画像の縦横比から決まる）
       bottom : 画像の下端の高さ（ワールド単位。0 が地面）
     画像が読み込めないときは、Canvas で描いた図形で代用する。 */
  /* オフライン版（file:// で開く）では、当たり判定で画素を読む画像を data: URL で同梱している。
     file:// の画像をそのまま使うと Canvas が汚染され、getImageData が使えないため。 */
  function assetUrl(path) {
    var bundled = window.OFFLINE_ASSETS;
    return (bundled && bundled[path]) || path;
  }

  var OBSTACLE_IMAGES = {
    web:    { src: 'assets/obstacles/web.png',    width: 2.7, bottom: 0 },   // クモの巣
    frog:   { src: 'assets/obstacles/frog.png',   width: 2.3, bottom: 0 },   // カエル
    mantis: { src: 'assets/obstacles/mantis.png', width: 1.6, bottom: 0 },   // カマキリ
  };
  Object.keys(OBSTACLE_IMAGES).forEach(function (k) {
    var o = OBSTACLE_IMAGES[k];
    o.img = new Image();
    o.ready = false;
    o.img.onload = function () { o.ready = true; };
    o.img.src = assetUrl(o.src);
  });

  Object.keys(FALL_IMAGES).forEach(function (k) {
    var o = FALL_IMAGES[k];
    o.img = new Image();
    o.ready = false;
    o.img.onload = function () { o.ready = true; };
    o.img.src = assetUrl(o.src);
  });

  /* ----------------------------------------------------------
     内部状態
     ---------------------------------------------------------- */
  var falls = [];       // 上から降ってくる障害物
  var fallItems = [];   // 上から降ってくるアイテム

  var canvas = null, ctx = null;
  var W = 0, H = 0, dpr = 1;
  var cx = 0, horizonY = 0, focal = 0, camH = 0;

  var diffKey = 'normal';
  var D = DIFFICULTY.normal;

  var charX = 0;        // キャラクターのワールドX
  var charTargetX = 0;  // 目標X
  var charVelX = 0;     // 速度（ワールド単位/秒）
  var camX = 0;         // カメラのX

  var obstacles = [];
  var items = [];
  var particles = [];  // 画面座標で動く小さな粒（演出のみ）
  var floaters = [];   // 「+50」のように浮き上がる文字（演出のみ）
  var waterHits = [];   // 被弾時の水しぶきと波紋
  var buoys = [];
  var waveScroll = 0;
  var clock = 0;        // 演出用の累積時間

  var playing = false;
  var elapsed = 0;
  var lives = 3;
  var dodged = 0;
  var score = 0;
  var scoreAcc = 0;    // 小数を保ったスコア（表示は切り捨て）
  var combo = 0;
  var bestCombo = 0;
  var invincible = 0;
  var hitFlash = 0;
  var spawnTimer = 0;
  var itemTimer = 0;

  var listeners = {};

  /* キャラクター画像（読み込めなければ代替図形で継続） */
  var charImg = new Image();
  var charImgReady = false;
  charImg.onload = function () { charImgReady = true; };
  charImg.onerror = function () { charImgReady = false; };
  charImg.src = CONFIG.characterImage;

  /* 道ばたの花の画像（左はタンポポ、右はコスモス） */
  var buoyImg = {};
  ['left', 'right'].forEach(function (side) {
    var e = { img: new Image(), ready: false };
    e.img.onload = function () { e.ready = true; };
    e.img.src = CONFIG.buoyImages[side];
    buoyImg[side] = e;
  });

  /* 得点アイテム（アブラムシ）の画像 */
  var shrimpImg = { img: new Image(), ready: false };
  shrimpImg.img.onload = function () { shrimpImg.ready = true; };
  shrimpImg.img.src = assetUrl(CONFIG.shrimpImage);

  /* ライフ回復アイテム（ハート）の画像 */
  var heartImg = { img: new Image(), ready: false };
  heartImg.img.onload = function () { heartImg.ready = true; };
  heartImg.img.src = assetUrl(CONFIG.heartImage);

  /* 背景写真（1枚ずつ読み込み、読めたものだけ使う） */
  var bgImages = CONFIG.backgrounds.map(function (b) {
    var img = new Image();
    var entry = { img: img, ready: false, horizon: b.horizon, light: b.light };
    img.onload = function () { entry.ready = true; };
    img.src = b.src;
    return entry;
  });

  /* ----------------------------------------------------------
     小さな道具
     ---------------------------------------------------------- */
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function on(name, fn) { (listeners[name] || (listeners[name] = [])).push(fn); }
  function emit(name, payload) {
    var arr = listeners[name];
    if (!arr) return;
    for (var i = 0; i < arr.length; i++) arr[i](payload);
  }
  /* 画面の基準座標系に戻す（高解像度対応の倍率を含む） */
  function base() { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }

  /* ----------------------------------------------------------
     画面サイズ
     ---------------------------------------------------------- */
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';

    cx = W / 2;
    horizonY = H * CONFIG.horizonRatio;
    // 縦長の画面（スマホの縦持ち）では幅で決める。高さで決めると道もキャラクターも大きくなりすぎる
    focal = Math.min(H * CONFIG.focalRatio, W * CONFIG.focalWidthRatio);
    // キャラクターの足元がちょうど playerScreenRatio の高さに来るカメラ高さ（ワールド単位）
    camH = (CONFIG.playerScreenRatio - CONFIG.horizonRatio) * H * CONFIG.playerZ / focal;
    base();
  }

  /* ----------------------------------------------------------
     透視投影
       ワールド座標 (x, z) が画面のどこに来るかを求める。
       s は「そこにある1ワールド単位が何ピクセルになるか」。
     ---------------------------------------------------------- */
  function project(x, z) {
    var s = focal / Math.max(z, 0.4);
    return { x: cx + (x - camX) * s, y: horizonY + camH * s, s: s };
  }

  /* キャラクターが動ける端 = 一番外側のレーンの中心。
     道の縁（花の位置）まで行けると、外側のレーンの障害物の当たり判定から外れてしまい、
     端にいるだけで一度も当たらなくなるため。 */
  function maxCharX() {
    return laneX(CONFIG.laneCount - 1);
  }

  function laneX(i) {
    var w = (CONFIG.laneHalfWidth * 2) / CONFIG.laneCount;
    return -CONFIG.laneHalfWidth + w * (i + 0.5);
  }

  /* ----------------------------------------------------------
     初期化・リセット
     ---------------------------------------------------------- */
  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    resetBuoys();
    resetRun();
  }

  function resetBuoys() {
    buoys = [];
    for (var i = 0; i < CONFIG.buoyCount; i++) buoys.push(4 + i * CONFIG.buoySpacing);
  }

  function setDifficulty(key) {
    if (!DIFFICULTY[key]) return;
    diffKey = key;
    D = DIFFICULTY[key];
  }

  function resetRun() {
    charX = 0;
    charTargetX = 0;
    charVelX = 0;
    camX = 0;
    obstacles = [];
    falls = [];
    fallItems = [];
    items = [];
    particles = [];
    floaters = [];
    waterHits = [];
    elapsed = 0;
    lives = D.lives;
    dodged = 0;
    score = 0;
    scoreAcc = 0;
    combo = 0;
    bestCombo = 0;
    invincible = 0;
    hitFlash = 0;
    spawnTimer = D.spawnStart;
    itemTimer = CONFIG.itemFirstDelay;
    playing = false;
  }

  function start() {
    resetRun();
    playing = true;
  }

  function stop() { playing = false; }

  /* ----------------------------------------------------------
     入力
       nx: -1(左端) 〜 +1(右端)
     ---------------------------------------------------------- */
  function setInput(nx) {
    charTargetX = clamp(nx, -1, 1) * maxCharX();
  }

  /* ----------------------------------------------------------
     更新
     ---------------------------------------------------------- */
  function update(dt) {
    // 小刻みに判定し、高速な障害物が輪郭を飛び越えるのを抑える。
    var steps = Math.max(1, Math.ceil(dt / CONFIG.physicsStep));
    for (var step = 0; step < steps; step++) updateStep(dt / steps);
  }

  function updateStep(dt) {
    clock += dt;

    var speed = playing ? D.speed : D.speed * 0.35; // 待機中はゆっくり流す
    waveScroll += speed * dt;

    // 道ばたの花を流す
    for (var b = 0; b < buoys.length; b++) {
      buoys[b] -= speed * dt;
      if (buoys[b] < CONFIG.despawnZ) buoys[b] += CONFIG.buoyCount * CONFIG.buoySpacing;
    }

    moveCharacter(dt);

    if (invincible > 0) invincible = Math.max(0, invincible - dt);
    if (hitFlash > 0) hitFlash = Math.max(0, hitFlash - dt);
    updateEffects(dt);
    waterHits.forEach(function (hit) { hit.age += dt; });
    waterHits = waterHits.filter(function (hit) { return hit.age < hit.life; });
    if (!playing) return;

    elapsed += dt;

    if (CONFIG.mode === 'fall') updateFall(dt);
    else updatePerspective(dt, speed);

    scoreAcc += CONFIG.scorePerSecond * dt;
    score = Math.floor(scoreAcc);

    if (lives <= 0) {
      playing = false;
      emit('gameover', { reason: 'life' });
    } else if (elapsed >= D.timeLimit) {
      playing = false;
      emit('gameover', { reason: 'time' });
    }
  }

  /* 道のむこうから近づいてくるモードの、出現・当たり判定 */
  function updatePerspective(dt, speed) {
    // 障害物の出現
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnObstacle();
      spawnTimer = currentSpawnInterval();
    }

    // アイテムの出現
    itemTimer -= dt;
    if (itemTimer <= 0) {
      if (CONFIG.itemsEnabled) spawnItem();
      itemTimer = CONFIG.itemInterval + (Math.random() - 0.5) * 2 * CONFIG.itemJitter;
    }

    // 指定されたキャラクターの範囲と、障害物画像の不透明部分の接触を調べる。
    var hitHalf = CONFIG.hitHalfWidth * D.hitScale;
    for (var i = 0; i < obstacles.length; i++) {
      var ob = obstacles[i];
      ob.z -= speed * dt;
      if (!ob.resolved) {
        var touches = window.OutlineCollision.overlaps(characterSprite(), obstacleSprite(ob), dpr);
        // 画像が読み込めない場合だけ従来の判定を使う。
        if (touches === null) touches = ob.z <= CONFIG.playerZ && Math.abs(ob.x - charX) < hitHalf;
        if (touches) {
          ob.resolved = true;
          if (invincible <= 0) {
            lives -= 1;
            invincible = CONFIG.invincibleSeconds;
            hitFlash = 0;
            combo = 0;                       // コンボは被弾で途切れる
            waterSplash(charX, CONFIG.playerZ);
            emit('hit', { lives: lives, combo: combo });
          }
        } else if (ob.z <= CONFIG.despawnZ) {
          ob.resolved = true;
          dodged += 1;
          combo += 1;
          if (combo > bestCombo) bestCombo = combo;
          var gain = Math.round(CONFIG.scorePerDodge * multiplier());
          scoreAcc += gain;
          burst(ob.x, ob.z, 7, '#d6ffa8');
          emit('dodge', { dodged: dodged, combo: combo, multiplier: multiplier() });
        }
      }
    }
    obstacles = obstacles.filter(function (o) { return o.z > CONFIG.despawnZ; });

    // アイテムも透明な余白を除いた輪郭同士で取得判定する。
    for (var j = 0; j < items.length; j++) {
      var it = items[j];
      it.z -= speed * dt;
      var takes = !it.resolved && window.OutlineCollision.overlaps(characterSprite(), itemSprite(it), dpr);
      if (takes === null) takes = it.z <= CONFIG.playerZ && Math.abs(it.x - charX) < CONFIG.itemHalfWidth;
      if (!it.resolved && (takes || it.z <= CONFIG.despawnZ)) {
        it.resolved = true;
        if (takes) {
          it.taken = true;
          if (it.kind === 'heart') {
            if (lives < D.lives) lives += 1;
            popText(it.x, it.z, 'LIFE+1', '#ffb3c7');
            burst(it.x, it.z, 16, '#ffb3c7');
            emit('item', { kind: 'heart', lives: lives });
          } else {
            var pts = Math.round(CONFIG.scorePerShrimp * multiplier());
            scoreAcc += pts;
            popText(it.x, it.z, '+' + pts, '#ffd98a');
            burst(it.x, it.z, 16, '#ffd98a');
            emit('item', { kind: 'shrimp', points: pts });
          }
        }
      }
    }
    items = items.filter(function (o) { return o.z > CONFIG.despawnZ && !o.taken; });

  }

  /* ==========================================================
     上から降ってくるモード
       画面の座標（ピクセル）で動かす。列は fallLanes 本。
       テントウムシは画面の下を左右に動き、障害物はまっすぐ落ちてくる。
     ========================================================== */
  function fallGeom() {
    var areaW = Math.min(W, H * CONFIG.fallAreaAspect);
    var laneW = areaW / CONFIG.fallLanes;
    return { left: (W - areaW) / 2, areaW: areaW, laneW: laneW };
  }
  function fallLaneX(g, i) { return g.left + g.laneW * (i + 0.5); }

  /* テントウムシの位置（足元の中心）と高さ */
  function fallCharPlace() {
    var g = fallGeom();
    var aspect = charImgReady && charImg.naturalHeight ? charImg.naturalWidth / charImg.naturalHeight : 1.18;
    var h = Math.min(g.laneW * CONFIG.fallCharLaneFill / aspect, H * CONFIG.fallCharMaxHeight);
    var range = g.areaW / 2 - g.laneW / 2;
    var nx = maxCharX() > 0 ? charX / maxCharX() : 0;
    var bob = Math.sin(clock * Math.PI * 2 * CONFIG.bobHz) * h * 0.03;
    var feet = H * CONFIG.fallCharBottom;
    if (CONFIG.fallReservePx > 0 && g.left < CONFIG.fallReservePx) feet = Math.min(feet, H - CONFIG.fallReservePx - 10);
    return { x: W / 2 + nx * range, y: feet + bob, h: h };
  }

  function fallSprite(ob) {
    var art = FALL_IMAGES[ob.kind];
    var g = fallGeom();
    var w = g.laneW * CONFIG.fallObjLaneFill * (art ? art.scale : 1);
    var ratio = art && art.ready ? art.img.naturalHeight / art.img.naturalWidth : 1;
    var h = w * ratio;
    var sway = ob.kind === 'leaf' ? Math.sin(clock * 2.2 + ob.seed) * g.laneW * 0.12 : 0;
    return { img: art && art.ready ? art.img : null,
      x: fallLaneX(g, ob.lane) - w / 2 + sway, y: ob.y * H - h / 2, w: w, h: h };
  }

  function fallItemSprite(it) {
    var asset = it.kind === 'heart' ? heartImg : shrimpImg;
    var g = fallGeom();
    var w = g.laneW * CONFIG.fallItemLaneFill * (it.kind === 'heart' ? 0.8 : 1);
    var ratio = asset.ready ? asset.img.naturalHeight / asset.img.naturalWidth : 1;
    var h = w * ratio;
    return { img: asset.ready ? asset.img : null, x: fallLaneX(g, it.lane) - w / 2, y: it.y * H - h / 2, w: w, h: h };
  }

  /* 画像が使えないときの判定：同じ列で、高さが重なっていれば当たり */
  function fallFallbackTouch(sp) {
    var c = fallCharPlace();
    var cx = sp.x + sp.w / 2;
    return Math.abs(cx - c.x) < fallGeom().laneW * 0.5 && sp.y + sp.h > c.y - c.h * 0.8 && sp.y < c.y;
  }

  function spawnFall() {
    var lane = Math.floor(Math.random() * CONFIG.fallLanes);
    var kind = FALL_KINDS[Math.floor(Math.random() * FALL_KINDS.length)];
    falls.push({ lane: lane, y: -0.15, kind: kind, seed: Math.random() * Math.PI * 2, resolved: false });
    // むずかしいだけ、たまに別の列にもう1つ（全部の列はふさがない）
    if (D.doubles && CONFIG.fallLanes > 2 && elapsed > D.ramp * 0.35 && Math.random() < 0.35) {
      var other = (lane + 1 + Math.floor(Math.random() * (CONFIG.fallLanes - 1))) % CONFIG.fallLanes;
      falls.push({ lane: other, y: -0.22, kind: FALL_KINDS[Math.floor(Math.random() * FALL_KINDS.length)],
        seed: Math.random() * Math.PI * 2, resolved: false });
    }
  }

  function spawnFallItem() {
    var wantHeart = lives < D.lives && Math.random() < CONFIG.heartChance;
    fallItems.push({ lane: Math.floor(Math.random() * CONFIG.fallLanes), y: -0.12,
      kind: wantHeart ? 'heart' : 'shrimp', seed: Math.random() * Math.PI * 2, resolved: false, taken: false });
  }

  function updateFall(dt) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) { spawnFall(); spawnTimer = currentSpawnInterval(); }
    itemTimer -= dt;
    if (itemTimer <= 0) {
      if (CONFIG.itemsEnabled) spawnFallItem();
      itemTimer = CONFIG.itemInterval + (Math.random() - 0.5) * 2 * CONFIG.itemJitter;
    }

    var c = fallCharPlace();
    var charSp = characterSprite();
    for (var i = 0; i < falls.length; i++) {
      var ob = falls[i];
      ob.y += D.fallSpeed * dt;
      if (ob.resolved) continue;
      var sp = fallSprite(ob);
      var touches = sp.img ? window.OutlineCollision.overlaps(charSp, sp, dpr) : null;
      if (touches === null) touches = fallFallbackTouch(sp);
      if (touches) {
        ob.resolved = true;
        if (invincible <= 0) {
          lives -= 1;
          invincible = CONFIG.invincibleSeconds;
          hitFlash = 0;
          combo = 0;
          burstAt(c.x, c.y - c.h * 0.5, 22, '#e2c48a');
          burstAt(c.x, c.y - c.h * 0.5, 10, '#a8de6a');
          emit('hit', { lives: lives, combo: combo });
        }
      } else if (sp.y > c.y) {
        // テントウムシの足元より下まで落ちたら「よけた」
        ob.resolved = true;
        dodged += 1;
        combo += 1;
        if (combo > bestCombo) bestCombo = combo;
        var gain = Math.round(CONFIG.scorePerDodge * multiplier());
        scoreAcc += gain;
        burstAt(sp.x + sp.w / 2, c.y - 6, 7, '#d6ffa8');
        emit('dodge', { dodged: dodged, combo: combo, multiplier: multiplier() });
      }
    }
    falls = falls.filter(function (o) { return o.y < 1.25; });

    for (var j = 0; j < fallItems.length; j++) {
      var it = fallItems[j];
      it.y += D.fallSpeed * 0.9 * dt;
      if (it.resolved) continue;
      var isp = fallItemSprite(it);
      var takes = isp.img ? window.OutlineCollision.overlaps(charSp, isp, dpr) : null;
      if (takes === null) takes = fallFallbackTouch(isp);
      if (takes) {
        it.resolved = it.taken = true;
        var ix = isp.x + isp.w / 2, iy = isp.y + isp.h / 2;
        if (it.kind === 'heart') {
          if (lives < D.lives) lives += 1;
          popAt(ix, iy, 'LIFE+1', '#ffb3c7');
          burstAt(ix, iy, 16, '#ffb3c7');
          emit('item', { kind: 'heart', lives: lives });
        } else {
          var pts = Math.round(CONFIG.scorePerShrimp * multiplier());
          scoreAcc += pts;
          popAt(ix, iy, '+' + pts, '#ffd98a');
          burstAt(ix, iy, 16, '#ffd98a');
          emit('item', { kind: 'shrimp', points: pts });
        }
      } else if (isp.y > c.y) {
        it.resolved = true;
      }
    }
    fallItems = fallItems.filter(function (o) { return o.y < 1.25 && !o.taken; });
  }

  /* 地面：テントウムシが歩く土の帯と、列の目安 */
  function drawFallGround(showLanes) {
    var g = fallGeom();
    var light = sceneLight();
    var cp = fallCharPlace();
    var top = cp.y - cp.h * 0.35;
    ctx.save();
    var grd = ctx.createLinearGradient(0, top, 0, H);
    grd.addColorStop(0, 'rgba(214,186,130,0.0)');
    grd.addColorStop(0.25, 'rgba(206,174,118,0.85)');
    grd.addColorStop(1, 'rgba(150,112,70,0.95)');
    ctx.fillStyle = grd;
    ctx.fillRect(g.left - 20, top, g.areaW + 40, H - top);
    if (light < 0.99) {
      ctx.fillStyle = 'rgba(8,14,30,' + ((1 - light) * 0.7).toFixed(3) + ')';
      ctx.fillRect(g.left - 20, top, g.areaW + 40, H - top);
    }
    if (showLanes) {
      for (var i = 1; i < CONFIG.fallLanes; i++) {
        var x = g.left + g.laneW * i;
        var lg = ctx.createLinearGradient(0, 0, 0, H);
        lg.addColorStop(0, 'rgba(255,255,255,0)');
        lg.addColorStop(1, 'rgba(255,255,255,' + (0.18 * (0.5 + 0.5 * light)).toFixed(3) + ')');
        ctx.strokeStyle = lg;
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 12]);
        ctx.beginPath(); ctx.moveTo(x, H * 0.12); ctx.lineTo(x, H); ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  /* 落ちてくる場所の目印（地面の影）。近づくほど濃く大きくなる */
  function drawFallShadows() {
    var c = fallCharPlace();
    ctx.save();
    falls.forEach(function (ob) {
      if (ob.resolved && ob.y * H > c.y) return;
      var sp = fallSprite(ob);
      var t = clamp((sp.y + sp.h) / c.y, 0, 1);
      ctx.globalAlpha = 0.10 + 0.40 * t * t;
      ctx.fillStyle = '#2a1a08';
      ctx.beginPath();
      ctx.ellipse(sp.x + sp.w / 2, c.y - 2, sp.w * (0.25 + 0.25 * t), Math.max(2, sp.w * 0.08), 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawFallObjects() {
    var light = sceneLight();
    ctx.save();
    fallItems.forEach(function (it) {
      var sp = fallItemSprite(it);
      var glow = 0.55 + 0.45 * Math.sin(clock * 5 + it.seed);
      var tint = it.kind === 'heart' ? '255,140,180' : '255,214,120';
      var r = Math.max(sp.w, sp.h) * 0.75;
      var gr = ctx.createRadialGradient(sp.x + sp.w / 2, sp.y + sp.h / 2, 0, sp.x + sp.w / 2, sp.y + sp.h / 2, r);
      gr.addColorStop(0, 'rgba(' + tint + ',' + (0.5 * glow).toFixed(3) + ')');
      gr.addColorStop(1, 'rgba(' + tint + ',0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(sp.x + sp.w / 2, sp.y + sp.h / 2, r, 0, Math.PI * 2); ctx.fill();
      if (sp.img) ctx.drawImage(sp.img, sp.x, sp.y, sp.w, sp.h);
      else { ctx.fillStyle = 'rgb(' + tint + ')'; ctx.beginPath(); ctx.arc(sp.x + sp.w / 2, sp.y + sp.h / 2, sp.w / 2, 0, Math.PI * 2); ctx.fill(); }
    });
    if (light < 0.95) ctx.filter = 'brightness(' + (0.45 + 0.55 * light).toFixed(2) + ')';
    falls.forEach(function (ob) {
      var sp = fallSprite(ob);
      if (ob.kind === 'spider') {
        // クモの糸（画面の上から）
        ctx.strokeStyle = 'rgba(240,240,250,0.85)';
        ctx.lineWidth = Math.max(1.5, sp.w * 0.012);
        ctx.beginPath(); ctx.moveTo(sp.x + sp.w / 2, 0); ctx.lineTo(sp.x + sp.w / 2, sp.y + 2); ctx.stroke();
      }
      if (sp.img) ctx.drawImage(sp.img, sp.x, sp.y, sp.w, sp.h);
      else { ctx.fillStyle = '#7a5a3a'; ctx.beginPath(); ctx.arc(sp.x + sp.w / 2, sp.y + sp.h / 2, sp.w / 2, 0, Math.PI * 2); ctx.fill(); }
    });
    ctx.filter = 'none';
    ctx.restore();
  }

  /* 臨界減衰バネでキャラクターを目標位置へ滑らかに近づける。
     固定ステップで積分するので、低いフレームレートでも振動しない。 */
  function moveCharacter(dt) {
    var k = CONFIG.moveStiffness * CONFIG.moveStiffness;
    var c = 2 * CONFIG.moveDamping * CONFIG.moveStiffness;
    var remain = dt;
    while (remain > 0) {
      var h = Math.min(CONFIG.physicsStep, remain);
      var a = (charTargetX - charX) * k - charVelX * c;
      charVelX = clamp(charVelX + a * h, -CONFIG.moveMaxSpeed, CONFIG.moveMaxSpeed);
      charX += charVelX * h;
      remain -= h;
    }
    charX = clamp(charX, -maxCharX(), maxCharX());
    // カメラはキャラクターを控えめに追う（動いている感じが出る）
    camX += (charX * CONFIG.cameraFollow - camX) * (1 - Math.exp(-6 * dt));
    // 画面が狭い（スマホの縦持ちなど）ときは、キャラクターが画面の外に出ないようカメラを寄せる
    var sNear = focal / CONFIG.playerZ;
    if (sNear > 0) {
      var maxOff = Math.max(0, W / 2 / sNear - CONFIG.characterEdgeMargin);
      camX = clamp(camX, charX - maxOff, charX + maxOff);
    }
  }

  function currentSpawnInterval() {
    var p = Math.min(1, elapsed / D.ramp);
    return D.spawnStart + (D.spawnMin - D.spawnStart) * p;
  }

  function spawnObstacle() {
    var lane = Math.floor(Math.random() * CONFIG.laneCount);
    // たまに隣り合う2レーンをふさぐ（単調さを避ける）
    obstacles.push({
      x: laneX(lane),
      z: CONFIG.spawnZ,
      kind: OBSTACLE_KINDS[Math.floor(Math.random() * OBSTACLE_KINDS.length)],
      seed: Math.random() * Math.PI * 2,
      resolved: false,
    });
    if (D.doubles && elapsed > D.ramp * 0.35 && Math.random() < 0.35) {
      var other = (lane + 1 + Math.floor(Math.random() * (CONFIG.laneCount - 1))) % CONFIG.laneCount;
      obstacles.push({
        x: laneX(other),
        z: CONFIG.spawnZ + 2,
        kind: OBSTACLE_KINDS[Math.floor(Math.random() * OBSTACLE_KINDS.length)],
        seed: Math.random() * Math.PI * 2,
        resolved: false,
      });
    }
  }

  function spawnItem() {
    var lane = Math.floor(Math.random() * CONFIG.laneCount);
    var wantHeart = lives < D.lives && Math.random() < CONFIG.heartChance;
    items.push({
      x: laneX(lane),
      z: CONFIG.spawnZ,
      kind: wantHeart ? 'heart' : 'shrimp',
      seed: Math.random() * Math.PI * 2,
      resolved: false,
      taken: false,
    });
  }

  /* 現在のスコア倍率（コンボが伸びるほど上がる） */
  function multiplier() {
    var steps = Math.floor(combo / CONFIG.comboPerStep);
    return Math.min(CONFIG.comboMaxMultiplier, 1 + steps * CONFIG.comboStepBonus);
  }

  /* ----------------------------------------------------------
     演出（粒とポップ文字）
       どちらもゲーム進行には影響しない。画面座標で動かす。
     ---------------------------------------------------------- */
  function burst(x, z, count, color) {
    var p = project(x, z - 0.5);
    burstAt(p.x, p.y - p.s * 0.9, count, color, p.s);
  }
  function burstAt(px, py, count, color, scaleHint) {
    var sc = scaleHint || Math.min(W, H) * 0.06;
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = (40 + Math.random() * 150) * Math.min(2, sc / 40 + 0.6);
      particles.push({
        x: px, y: py,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 60,
        life: 0.45 + Math.random() * 0.35,
        age: 0,
        r: 1.5 + Math.random() * 2.5,
        color: color,
      });
    }
    if (particles.length > 240) particles.splice(0, particles.length - 240);
  }

  function popText(x, z, text, color) {
    var p = project(x, z - 0.5);
    popAt(p.x, p.y - p.s * 1.4, text, color);
  }
  function popAt(px, py, text, color) {
    floaters.push({ x: px, y: py, text: text, color: color, life: 0.9, age: 0 });
    if (floaters.length > 12) floaters.shift();
  }

  function updateEffects(dt) {
    var i;
    for (i = particles.length - 1; i >= 0; i--) {
      var q = particles[i];
      q.age += dt;
      if (q.age >= q.life) { particles.splice(i, 1); continue; }
      q.vy += 420 * dt;          // ゆるい重力
      q.x += q.vx * dt;
      q.y += q.vy * dt;
    }
    for (i = floaters.length - 1; i >= 0; i--) {
      var f = floaters[i];
      f.age += dt;
      if (f.age >= f.life) { floaters.splice(i, 1); continue; }
      f.y -= 46 * dt;
    }
  }

  function waterSplash(x, z) {
    var drops = [];
    for (var i = 0; i < 28; i++) {
      var side = i % 2 ? 1 : -1;
      drops.push({
        x: side * (0.65 + Math.random() * 0.75),
        vx: side * (0.7 + Math.random() * 2.2),
        vy: -(1.2 + Math.random() * 3.3),
        r: 0.025 + Math.random() * 0.05,
        life: 0.38 + Math.random() * 0.37
      });
    }
    waterHits.push({ x: x, z: z, age: 0, life: 1.05, drops: drops });
    if (waterHits.length > 4) waterHits.shift();
  }

  // 波紋はキャラクターの後ろ、水滴は手前に描く。
  function drawWaterHits(front) {
    base();
    ctx.save();
    waterHits.forEach(function (hit) {
      var p = project(hit.x, hit.z), t = hit.age;
      if (!front) {
        for (var ring = 0; ring < 3; ring++) {
          var age = t - ring * 0.10;
          if (age < 0 || age > 0.85) continue;
          var progress = age / 0.85;
          var radius = (0.8 + 2.0 * (1 - Math.pow(1-progress, 2))) * p.s;
          ctx.globalAlpha = Math.pow(1-progress, 1.5) * (ring === 0 ? 0.9 : 0.55);
          ctx.strokeStyle = ring === 1 ? '#e2c48a' : '#fff4d6';
          ctx.lineWidth = Math.max(1, (0.035 - progress * 0.02) * p.s);
          ctx.beginPath(); ctx.ellipse(p.x, p.y - 0.015*p.s, radius, radius*0.20, 0, 0, Math.PI*2); ctx.stroke();
        }
      } else {
        hit.drops.forEach(function (drop) {
          if (t > drop.life) return;
          var progress = t / drop.life;
          var dx = p.x + (drop.x + drop.vx*t) * p.s;
          var dy = p.y + (-0.10 + drop.vy*t + 4.5*t*t) * p.s;
          var radius = Math.max(1, drop.r * p.s * (1-progress*0.35));
          ctx.globalAlpha = Math.min(1, (1-progress)*2.5);
          ctx.strokeStyle = '#a8de6a'; ctx.lineWidth = radius * 1.3; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(dx-drop.vx*p.s*0.018, dy-(drop.vy+9*t)*p.s*0.018);ctx.lineTo(dx,dy);ctx.stroke();
          ctx.fillStyle = '#e8ffc8';ctx.beginPath();ctx.arc(dx,dy,radius,0,Math.PI*2);ctx.fill();
        });
      }
    });
    ctx.restore();
  }

  /* ==========================================================
     ここから描画
     ========================================================== */

  function drawSky() {
    var g = ctx.createLinearGradient(0, 0, 0, horizonY);
    g.addColorStop(0.00, '#2e86bd');
    g.addColorStop(0.48, '#84c9e9');
    g.addColorStop(0.86, '#cfeaf6');
    g.addColorStop(1.00, '#f0f7fa');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, horizonY + 1);
  }

  function sunPos() {
    return { x: W * 0.76, y: horizonY * 0.36, r: Math.max(22, Math.min(W, H) * 0.030) };
  }

  function drawSun() {
    var s = sunPos();
    var glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 6);
    glow.addColorStop(0.00, 'rgba(255,247,216,0.92)');
    glow.addColorStop(0.22, 'rgba(255,236,182,0.42)');
    glow.addColorStop(1.00, 'rgba(255,236,182,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fffaea';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
  }

  function drawClouds() {
    var list = [
      { x: 0.08, y: 0.30, s: 1.00, v: 0.0016 },
      { x: 0.38, y: 0.15, s: 0.70, v: 0.0023 },
      { x: 0.63, y: 0.42, s: 1.14, v: 0.0013 },
      { x: 0.88, y: 0.22, s: 0.62, v: 0.0028 },
    ];
    ctx.save();
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      var px = (((c.x + clock * c.v) % 1.3) - 0.15) * W;
      var py = horizonY * c.y;
      var r = Math.max(13, W * 0.030) * c.s;
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.beginPath();
      ctx.arc(px - r * 0.95, py + r * 0.20, r * 0.60, 0, Math.PI * 2);
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.arc(px + r * 1.00, py + r * 0.24, r * 0.68, 0, Math.PI * 2);
      ctx.arc(px + r * 0.34, py + r * 0.42, r * 0.74, 0, Math.PI * 2);
      ctx.fill();
      // 雲の下側をほんのり影に
      ctx.fillStyle = 'rgba(186,214,232,0.55)';
      ctx.beginPath();
      ctx.ellipse(px + r * 0.1, py + r * 0.52, r * 1.25, r * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /* 遠景の山並み（比良山地・比叡山をイメージしたシルエット） */
  function drawRidge(height, color, seed, offset) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, horizonY + 2);
    for (var x = 0; x <= W; x += 6) {
      var t = (x + offset) * 0.001;
      var n = Math.sin(t * 3.2 + seed) * 0.50 +
              Math.sin(t * 7.1 + seed * 2.1) * 0.30 +
              Math.sin(t * 15.1 + seed * 3.3) * 0.20;
      ctx.lineTo(x, horizonY + 2 - height * (0.52 + 0.48 * n));
    }
    ctx.lineTo(W, horizonY + 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /* 沖島をイメージした島影 */
  function drawIsland(px, w, h, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(px - w / 2, horizonY + 1);
    ctx.quadraticCurveTo(px - w * 0.16, horizonY + 1 - h, px, horizonY + 1 - h * 0.88);
    ctx.quadraticCurveTo(px + w * 0.20, horizonY + 1 - h * 1.06, px + w / 2, horizonY + 1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawLake() {
    var g = ctx.createLinearGradient(0, horizonY, 0, H);
    g.addColorStop(0.00, '#9ad866');
    g.addColorStop(0.20, '#68b844');
    g.addColorStop(1.00, '#1f5a1c');
    ctx.fillStyle = g;
    ctx.fillRect(0, horizonY, W, H - horizonY);
  }

  /* 太陽の光が湖面に伸びる道 */
  function drawSunGlitter() {
    var s = sunPos();
    ctx.save();
    var g = ctx.createLinearGradient(0, horizonY, 0, H);
    g.addColorStop(0.00, 'rgba(255,244,204,0.36)');
    g.addColorStop(0.55, 'rgba(255,238,180,0.10)');
    g.addColorStop(1.00, 'rgba(255,238,180,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(s.x - W * 0.018, horizonY);
    ctx.lineTo(s.x + W * 0.018, horizonY);
    ctx.lineTo(s.x + W * 0.20, H);
    ctx.lineTo(s.x - W * 0.20, H);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /* 土の道の小石と草。ワールドの奥行き z を持たせ、奥から手前へ流す。
     遠近法で自然に間隔が広がり、大きくなる（速さを感じる目印）。 */
  function drawWaves() {
    var span = CONFIG.waveSpan, count = CONFIG.waveRows;
    var light = sceneLight();
    ctx.save();
    for (var i = 0; i < count; i++) {
      var raw = (i * (span / count) + waveScroll) % span;
      var z = ((raw + span) % span) + 2.5;
      if (z > CONFIG.spawnZ) continue;
      var fade = clamp((CONFIG.spawnZ - z) / 25, 0, 1);
      // 列ごとに決まった位置（乱数の代わりに sin で散らす）
      for (var k = 0; k < 3; k++) {
        var x = Math.sin(i * 12.9898 + k * 78.233) * CONFIG.laneHalfWidth * 0.92;
        var p = project(x, z);
        if (p.y > H + 40 || p.y < horizonY) continue;
        var r = Math.max(0.6, (0.10 + 0.06 * ((i + k) % 3)) * p.s);
        ctx.globalAlpha = fade * (0.45 + 0.4 * light);
        ctx.fillStyle = 'rgba(60,40,20,0.35)';
        ctx.beginPath(); ctx.ellipse(p.x + r * 0.2, p.y + r * 0.15, r * 1.1, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = k === 1 ? '#d8c9a8' : '#b9a27a';
        ctx.beginPath(); ctx.ellipse(p.x, p.y - r * 0.25, r, r * 0.62, 0, 0, Math.PI * 2); ctx.fill();
      }
      // 道の縁の草むら（左右）
      for (var side = -1; side <= 1; side += 2) {
        var q = project(side * (CONFIG.laneHalfWidth + 0.25), z);
        if (q.y > H + 40 || q.y < horizonY) continue;
        var hgt = Math.max(1, 0.55 * q.s), wd = Math.max(1, 0.06 * q.s);
        ctx.globalAlpha = fade;
        ctx.strokeStyle = light > 0.6 ? '#4f9e33' : '#2a5a24';
        ctx.lineWidth = wd;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (var b = -2; b <= 2; b++) {
          var bx = q.x + b * 0.13 * q.s;
          ctx.moveTo(bx, q.y);
          ctx.quadraticCurveTo(bx + b * 0.05 * q.s, q.y - hgt * 0.6, bx + b * 0.18 * q.s, q.y - hgt * (1 - Math.abs(b) * 0.15));
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* ----------------------------------------------------------
     時間帯
       プレイの進み具合 0〜1 を、0=朝 1=昼 2=夕方 3=夜 の連続値にする。
       待機中は elapsed が 0 なので朝、結果画面では終わった時刻のまま。
     ---------------------------------------------------------- */
  function dayPhase() {
    return clamp(elapsed / D.timeLimit, 0, 1) * (bgImages.length - 1);
  }

  function smooth(t) { return t * t * (3 - 2 * t); }

  /* 今の時間帯の明るさ（波や航路の線を夜は控えめにするため） */
  function sceneLight() {
    var ph = dayPhase(), i = Math.floor(ph), t = smooth(ph - i);
    var a = bgImages[i], b = bgImages[Math.min(i + 1, bgImages.length - 1)];
    return a.light + (b.light - a.light) * t;
  }

  /* 写真1枚を、水平線がゲームの水平線に重なるように画面いっぱいに描く */
  function drawPhoto(entry, alpha) {
    var img = entry.img, iw = img.naturalWidth, ih = img.naturalHeight;
    var hr = entry.horizon;
    var over = W * CONFIG.backgroundParallax * 0.1;          // 横にずらす分の余白
    var sc = Math.max(
      (W + over * 2) / iw,
      horizonY / (hr * ih),
      (H - horizonY) / ((1 - hr) * ih)
    );
    var dw = iw * sc, dh = ih * sc;
    var dx = (W - dw) / 2 - camX / CONFIG.laneHalfWidth * over;
    var dy = horizonY - hr * dh;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.globalAlpha = 1;
  }

  /* 時間帯に合わせて2枚の写真を重ねて切り替える。使えなければ false */
  function drawPhotoBackdrop() {
    var ph = dayPhase(), i = Math.floor(ph), t = smooth(ph - i);
    var a = bgImages[i], b = bgImages[Math.min(i + 1, bgImages.length - 1)];
    if (!a.ready) return false;
    drawPhoto(a, 1);
    if (b !== a && b.ready && t > 0.001) drawPhoto(b, t);
    return true;
  }

  /* テントウムシが歩く土の道。左右の縁を遠近に合わせた台形で描く。 */
  function drawChannel() {
    var farZ = CONFIG.spawnZ * 1.6, nearZ = 0.6;
    var L = CONFIG.laneHalfWidth + 0.35;
    var a = project(-L, farZ), b = project(L, farZ), c = project(L, nearZ), d = project(-L, nearZ);
    var light = sceneLight();
    ctx.save();
    var g = ctx.createLinearGradient(0, horizonY, 0, H);
    g.addColorStop(0.00, '#e6d3a4');
    g.addColorStop(0.35, '#cfb07a');
    g.addColorStop(1.00, '#9a7448');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
    // 奥は空気でかすませ、縁は少し暗く
    var haze = ctx.createLinearGradient(0, horizonY, 0, horizonY + (H - horizonY) * 0.25);
    haze.addColorStop(0, 'rgba(210,230,200,' + (0.55 * light * light).toFixed(3) + ')');
    haze.addColorStop(1, 'rgba(210,230,200,0)');
    ctx.fillStyle = haze;
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,60,30,0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(d.x, d.y); ctx.moveTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.stroke();
    // 夕方・夜は道も暗く
    if (light < 0.99) {
      ctx.fillStyle = 'rgba(8,14,30,' + ((1 - light) * 0.85).toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /* レーンの目安線（プレイ中だけ薄く表示） */
  function drawLaneGuides() {
    var farZ = CONFIG.spawnZ * 0.55, nearZ = CONFIG.despawnZ;
    var w = (CONFIG.laneHalfWidth * 2) / CONFIG.laneCount;
    ctx.save();
    for (var i = 1; i < CONFIG.laneCount; i++) {
      var x = -CONFIG.laneHalfWidth + w * i;
      var a = project(x, farZ), b = project(x, nearZ);
      var g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      g.addColorStop(0.00, 'rgba(255,255,255,0)');
      g.addColorStop(1.00, 'rgba(255,255,255,0.16)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.restore();
  }

  /* 道ばたに咲く花（左はタンポポ、右はコスモス）。速さを感じる目印になる */
  function drawBuoys() {
    var light = sceneLight();
    var zs = buoys.slice().sort(function (a, b) { return b - a; }); // 奥から手前の順に描く
    ctx.save();
    for (var i = 0; i < zs.length; i++) {
      var z = zs[i];
      for (var side = -1; side <= 1; side += 2) {
        var p = project(side * (CONFIG.laneHalfWidth + CONFIG.flowerOffset), z);
        if (p.y < horizonY || p.y > H + 400) continue;
        var e = buoyImg[side < 0 ? 'left' : 'right'];
        var h = Math.max(2, CONFIG.flowerHeight * p.s);
        var w = e.ready ? h * e.img.naturalWidth / e.img.naturalHeight : h * 0.48;
        var sway = Math.sin(clock * 1.5 + z * 0.3 + side) * 0.08 * p.s;
        var fade = clamp((CONFIG.spawnZ - z) / 25, 0, 1);
        ctx.globalAlpha = fade * 0.3;
        ctx.fillStyle = '#1d2a10';
        ctx.beginPath(); ctx.ellipse(p.x, p.y, w * 0.35, Math.max(1, 0.1 * p.s), 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = fade;
        if (e.ready) {
          // 夕方・夜は花も暗く見せる（filter は花の絵だけにかかる）
          if (light < 0.95) ctx.filter = 'brightness(' + (0.35 + 0.65 * light).toFixed(2) + ')';
          ctx.drawImage(e.img, p.x - w / 2 + sway, p.y - h, w, h);
          ctx.filter = 'none';
        } else {
          ctx.fillStyle = side < 0 ? '#ffd23a' : '#ff9cc8';
          ctx.beginPath(); ctx.arc(p.x + sway, p.y - h * 0.7, w * 0.4, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* ----------------------------------------------------------
     障害物
       図形は「1ワールド単位 = 1」の座標で描き、
       ctx.scale(s, s) で遠近に合わせて拡大する。
     ---------------------------------------------------------- */
  function drawObstacles() {
    // 夜は障害物も少し沈んだ色に見えるよう、明るさに合わせて濃さを抑える
    var lightFactor = 0.75 + 0.25 * sceneLight();
    var sorted = obstacles.slice().sort(function (a, b) { return b.z - a.z; });
    for (var i = 0; i < sorted.length; i++) {
      var ob = sorted[i];
      var p = project(ob.x, ob.z);
      if (p.y < horizonY - 20 || p.y > H + 200) continue;

      var alpha = clamp((CONFIG.spawnZ - ob.z) / 30, 0, 1);
      var sway = Math.sin(clock * 2.0 + ob.seed) * 0.06;

      var art = OBSTACLE_IMAGES[ob.kind];
      ctx.save();
      ctx.globalAlpha = alpha * lightFactor;
      if (art && art.ready) {
        drawObstacleImage(art, ob, p, sway, alpha);
      } else {
        // 画像がないときの代わりの図形
        ctx.translate(p.x + sway * p.s, p.y - 0.95 * p.s);
        ctx.scale(p.s, p.s);
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        if (ob.kind === 'web') drawNet();
        else if (ob.kind === 'mantis') drawHook();
        else drawWire();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /* ----------------------------------------------------------
     アイテム（アブラムシ＝得点、ハート＝ライフ回復）
     ---------------------------------------------------------- */
  function drawItems() {
    var sorted = items.slice().sort(function (a, b) { return b.z - a.z; });
    for (var i = 0; i < sorted.length; i++) {
      var it = sorted[i];
      var p = project(it.x, it.z);
      if (p.y < horizonY - 20 || p.y > H + 200) continue;

      var alpha = clamp((CONFIG.spawnZ - it.z) / 30, 0, 1);
      var bob = Math.sin(clock * 2.4 + it.seed) * 0.12;
      var glow = 0.55 + 0.45 * Math.sin(clock * 5 + it.seed);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y - (1.0 + bob) * p.s);
      ctx.scale(p.s, p.s);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      // 後光
      var g = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.85);
      var tint = it.kind === 'heart' ? '255,140,180' : '255,214,120';
      g.addColorStop(0, 'rgba(' + tint + ',' + (0.45 * glow).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + tint + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, 0.85, 0, Math.PI * 2); ctx.fill();

      if (it.kind === 'heart') {
        if (heartImg.ready) drawItemImage(heartImg.img, CONFIG.heartWidth);
        else drawHeartIcon();
      }
      else if (shrimpImg.ready) drawItemImage(shrimpImg.img, CONFIG.shrimpWidth);
      else drawShellIcon();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /* アイテム画像は透過を保ち、縦横比を変えずに中心へ描く */
  function drawItemImage(img, w) {
    var h = w * img.naturalHeight / img.naturalWidth;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
  }

  /* 描画と同じ座標・縦横比・揺れを使う。後光や地面の影は判定に含めない。 */
  /* テントウムシの足元の中心 (x, y) と高さ h（画面のピクセル） */
  function charPlace() {
    if (CONFIG.mode === 'fall') return fallCharPlace();
    var p = project(charX, CONFIG.playerZ);
    var bob = Math.sin(clock * Math.PI * 2 * CONFIG.bobHz) * CONFIG.bobAmplitude * p.s;
    return { x: p.x, y: p.y + bob, h: CONFIG.characterWorldHeight * p.s };
  }

  function characterSprite() {
    if (!charImgReady || !charImg.naturalHeight) return null;
    var c = charPlace();
    var p = { x: c.x };
    var h = c.h;
    var w = h * charImg.naturalWidth / charImg.naturalHeight;
    // 難易度に合わせて判定を中心へ縮める（見た目は変えない）
    var k = D.bodyScale || 1, cy = c.y - h / 2;
    return { img: window.OutlineCollision.markedRegion(charImg),
      x: p.x - w * k / 2, y: cy - h * k / 2, w: w * k, h: h * k };
  }

  function obstacleSprite(ob) {
    var art = OBSTACLE_IMAGES[ob.kind];
    if (!art || !art.ready) return null;
    var p = project(ob.x, ob.z);
    var w = art.width * p.s;
    var h = w * art.img.naturalHeight / art.img.naturalWidth;
    return { img: art.img,
      x: p.x + Math.sin(clock * 2.0 + ob.seed) * 0.06 * p.s - w / 2,
      y: p.y - art.bottom * p.s - h + Math.sin(clock * 1.7 + ob.seed) * 0.05 * p.s,
      w: w, h: h };
  }

  function itemSprite(it) {
    var asset = it.kind === 'heart' ? heartImg : shrimpImg;
    if (!asset.ready) return null;
    var p = project(it.x, it.z);
    var w = (it.kind === 'heart' ? CONFIG.heartWidth : CONFIG.shrimpWidth) * p.s;
    var h = w * asset.img.naturalHeight / asset.img.naturalWidth;
    var bob = Math.sin(clock * 2.4 + it.seed) * 0.12;
    return { img: asset.img, x: p.x - w / 2, y: p.y - (1.0 + bob) * p.s - h / 2, w: w, h: h };
  }

  /* アブラムシの画像が読み込めないときの代わりの図形 */
  function drawShellIcon() {
    ctx.fillStyle = '#ffd98a';
    ctx.strokeStyle = 'rgba(120,74,20,0.75)';
    ctx.lineWidth = 0.045;
    ctx.beginPath();
    ctx.moveTo(-0.42, 0.10);
    ctx.quadraticCurveTo(-0.34, -0.44, 0, -0.44);
    ctx.quadraticCurveTo(0.34, -0.44, 0.42, 0.10);
    ctx.quadraticCurveTo(0, 0.34, -0.42, 0.10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 0.028;
    for (var i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 0.11, -0.36);
      ctx.lineTo(i * 0.19, 0.16);
      ctx.stroke();
    }
  }

  function drawHeartIcon() {
    ctx.fillStyle = '#ff7fa6';
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 0.045;
    ctx.beginPath();
    ctx.moveTo(0, 0.36);
    ctx.bezierCurveTo(-0.62, -0.10, -0.34, -0.56, 0, -0.24);
    ctx.bezierCurveTo(0.34, -0.56, 0.62, -0.10, 0, 0.36);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  /* 粒とポップ文字（画面座標のまま描く） */
  function drawEffects() {
    var i;
    base();
    for (i = 0; i < particles.length; i++) {
      var q = particles[i];
      var t = 1 - q.age / q.life;
      ctx.globalAlpha = Math.max(0, t);
      ctx.fillStyle = q.color;
      ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (0.4 + t * 0.9), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (i = 0; i < floaters.length; i++) {
      var f = floaters[i];
      var k = 1 - f.age / f.life;
      ctx.globalAlpha = Math.max(0, Math.min(1, k * 1.6));
      ctx.font = '700 ' + Math.round(Math.max(16, H * 0.032)) + 'px system-ui, sans-serif';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(8,20,8,0.7)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  /* 障害物の画像を、下端を地面の高さに合わせて描く。地面には影を落とす。 */
  function drawObstacleImage(art, ob, p, sway, alpha) {
    var img = art.img;
    var w = art.width * p.s;
    var h = w * img.naturalHeight / img.naturalWidth;
    var x = p.x + sway * p.s - w / 2;
    var bottomY = p.y - art.bottom * p.s;
    var bob = Math.sin(clock * 1.7 + ob.seed) * 0.05 * p.s;
    var y = bottomY - h + bob;

    ctx.save();
    ctx.globalAlpha *= 0.35;
    ctx.fillStyle = 'rgba(30,20,8,1)';
    ctx.beginPath();
    ctx.ellipse(p.x + sway * p.s, p.y + 0.04 * p.s, w * 0.45, Math.max(1, 0.14 * p.s), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.drawImage(img, x, y, w, h);
  }

  function drawNet() {
    var s = 0.95; // 半径（ワールド単位）
    ctx.strokeStyle = 'rgba(238,247,252,0.95)';
    ctx.lineWidth = 0.055;
    ctx.strokeRect(-s, -s, s * 2, s * 2);
    ctx.lineWidth = 0.035;
    ctx.strokeStyle = 'rgba(214,236,247,0.8)';
    var n = 4;
    for (var i = 1; i < n; i++) {
      var d = -s + (s * 2 / n) * i;
      ctx.beginPath(); ctx.moveTo(d, -s); ctx.lineTo(d, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s, d); ctx.lineTo(s, d); ctx.stroke();
    }
    // 浮き
    ctx.fillStyle = '#ffd07a';
    for (var k = -1; k <= 1; k++) {
      ctx.beginPath(); ctx.arc(k * s * 0.7, -s, 0.075, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawHook() {
    ctx.strokeStyle = 'rgba(244,250,255,0.95)';
    ctx.lineWidth = 0.075;
    ctx.beginPath();
    ctx.moveTo(0, -1.15);
    ctx.lineTo(0, 0.15);
    ctx.arc(-0.19, 0.15, 0.42, 0, Math.PI * 1.35, false);
    ctx.stroke();
    // 針先
    ctx.beginPath();
    ctx.moveTo(-0.30, -0.14);
    ctx.lineTo(-0.13, -0.36);
    ctx.stroke();
    // 糸
    ctx.strokeStyle = 'rgba(220,240,252,0.5)';
    ctx.lineWidth = 0.022;
    ctx.beginPath(); ctx.moveTo(0, -1.15); ctx.lineTo(0, -2.4); ctx.stroke();
    // 疑似餌
    ctx.fillStyle = '#ff8a4c';
    ctx.beginPath(); ctx.arc(0, -0.32, 0.10, 0, Math.PI * 2); ctx.fill();
  }

  function drawWire() {
    ctx.strokeStyle = 'rgba(232,244,252,0.92)';
    ctx.lineWidth = 0.06;
    ctx.beginPath();
    ctx.moveTo(-0.95, -1.0); ctx.lineTo(-0.95, 1.0);
    ctx.moveTo(0.95, -1.0);  ctx.lineTo(0.95, 1.0);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(214,236,247,0.7)';
    ctx.lineWidth = 0.028;
    for (var i = -2; i <= 2; i++) {
      var y = i * 0.36;
      ctx.beginPath();
      ctx.moveTo(-0.95, y);
      ctx.quadraticCurveTo(0, y + 0.10, 0.95, y);
      ctx.stroke();
    }
  }

  /* ----------------------------------------------------------
     キャラクター描画
     許可される変換：平行移動(translate) / 縦横比を保った拡大縮小(scale(s,s)) / 表示非表示(フェード)
     禁止：回転・傾き・左右反転・非均等スケール・色変更・部分切り出し・パーツ分割・重ね描画
     ---------------------------------------------------------- */
  function drawCharacter() {
    // カメラ映像などの変換が絶対に影響しないよう、描画直前に基準座標系へ戻す
    base();

    var c = charPlace();
    var px = c.x;
    var py = c.y;

    // 被弾直後は点滅（フェードのみ。色も形も変えない）
    var alpha = 1;
    if (invincible > 0) alpha = (Math.floor(invincible * 12) % 2 === 0) ? 0.35 : 1;

    if (charImgReady && charImg.naturalHeight) {
      var iw = charImg.naturalWidth, ih = charImg.naturalHeight;
      var k = c.h / ih; // 縦横比を保った単一スケール値
      ctx.save();
      ctx.globalAlpha = alpha;
      // translate → 均一 scale(k, k) の順のみを使用
      ctx.translate(px - (iw * k) / 2, py - ih * k);
      ctx.scale(k, k);
      ctx.drawImage(charImg, 0, 0, iw, ih);
      ctx.restore();
    } else {
      drawCharacterFallback(px, py, c.h, alpha);
    }
  }

  /* 画像が読み込めない場合の代替図形（シンプルなシルエット）
     ※ translate と 均一scale のみで配置し、回転や反転は一切行わない */
  function drawCharacterFallback(x, y, h, alpha) {
    var k = h / 200;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(k, k);
    ctx.fillStyle = '#2f7fb0';
    ctx.strokeStyle = '#123a52';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -180);
    ctx.quadraticCurveTo(70, -140, 70, -60);
    ctx.quadraticCurveTo(70, 20, 0, 20);
    ctx.quadraticCurveTo(-70, 20, -70, -60);
    ctx.quadraticCurveTo(-70, -140, 0, -180);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0d2636';
    ctx.beginPath();
    ctx.arc(-24, -120, 9, 0, Math.PI * 2);
    ctx.arc(24, -120, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* 被弾の演出は画面のふちだけを赤くする。
     キャラクター本体やその周囲の余白には一切重ねない。 */
  function drawHitVignette() {
    if (hitFlash <= 0) return;
    var a = (hitFlash / 0.3) * 0.55;
    var inner = Math.max(Math.min(W, H) * 0.52, CONFIG.characterWorldHeight * (focal / CONFIG.playerZ) * 1.5);
    ctx.save();
    ctx.globalAlpha = a;
    var g = ctx.createRadialGradient(W / 2, H / 2, inner, W / 2, H / 2, Math.max(W, H) * 0.78);
    g.addColorStop(0, 'rgba(255,40,40,0)');
    g.addColorStop(1, 'rgba(255,30,30,0.92)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  /* ----------------------------------------------------------
     1フレーム分の描画
     ---------------------------------------------------------- */
  function render(opts) {
    opts = opts || {};
    base();
    ctx.clearRect(0, 0, W, H);

    // 写真の背景が使えればそれを、なければ Canvas で描いた風景を使う
    if (!drawPhotoBackdrop()) {
      drawSky();
      drawSun();
      drawClouds();
      drawRidge(horizonY * 0.50, '#a6c8d8', 1.7, 0);
      drawRidge(horizonY * 0.34, '#6b96b0', 4.2, 120);
      drawRidge(horizonY * 0.20, '#456f8c', 9.1, 260);
      drawIsland(W * 0.23, Math.max(70, W * 0.10), Math.max(10, horizonY * 0.10), '#3c6884');
      drawIsland(W * 0.60, Math.max(40, W * 0.05), Math.max(6, horizonY * 0.055), '#40708c');
      drawLake();
    }
    if (CONFIG.mode === 'fall') {
      drawFallGround(opts.showLanes);
      if (opts.showObstacles !== false) { drawFallShadows(); drawFallObjects(); }
      if (opts.showCharacter !== false) drawCharacter();
      base();
      drawEffects();
      return;
    }
    drawWaves();
    drawChannel();
    if (opts.showLanes) drawLaneGuides();
    drawBuoys();

    if (opts.showObstacles !== false) { drawObstacles(); drawItems(); }

    // 手前を少し暗くしてキャラクターを引き立てる
    var g = ctx.createLinearGradient(0, H * 0.66, 0, H);
    g.addColorStop(0, 'rgba(8,20,8,0)');
    g.addColorStop(1, 'rgba(8,20,8,0.40)');
    ctx.fillStyle = g;
    ctx.fillRect(0, H * 0.66, W, H * 0.34);

    drawWaterHits(false);
    if (opts.showCharacter !== false) drawCharacter();
    drawWaterHits(true);

    base();
    drawEffects();
  }

  /* ----------------------------------------------------------
     外から使うもの
     ---------------------------------------------------------- */
  function getStats() {
    return {
      score: score,
      lives: lives,
      maxLives: D.lives,
      dodged: dodged,
      combo: combo,
      bestCombo: bestCombo,
      multiplier: multiplier(),
      elapsed: elapsed,
      dayPhase: dayPhase(),
      remain: Math.max(0, Math.ceil(D.timeLimit - elapsed)),
      timeLimit: D.timeLimit,
      difficulty: diffKey,
      difficultyLabel: D.label,
      playing: playing,
    };
  }

  return {
    CONFIG: CONFIG,
    DIFFICULTY: DIFFICULTY,
    init: init,
    resize: resize,
    setDifficulty: setDifficulty,
    /* 確認用：降ってくる障害物の列と高さ */
    getFalls: function () { return falls.filter(function (o) { return !o.resolved; }).map(function (o) { return { lane: o.lane, y: o.y }; }); },
    setMode: function (m) { CONFIG.mode = m === 'perspective' ? 'perspective' : 'fall'; resetRun(); },
    resetRun: resetRun,
    start: start,
    stop: stop,
    setInput: setInput,
    update: update,
    render: render,
    getStats: getStats,
    on: on,
  };
})();
