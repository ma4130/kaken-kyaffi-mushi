# テントウムシの草むらサバイバル（キャッフィーの虫バージョン）

「キャッフィーの琵琶湖サバイバル」（[ma4130/kaken-kyaffi](https://github.com/ma4130/kaken-kyaffi)）の虫バージョンです。
カメラの前で体を左右に動かして、テントウムシを操作します。草むらの土の道を進みながら、正面から迫ってくる **クモの巣・カエル・カマキリ** をよけ続けます。

## 公開URL

https://ma4130.github.io/kaken-kyaffi-mushi/

ビルドは不要です。GitHub Pages にそのまま置くだけで動きます。

## 元のゲームとのちがい

| | キャッフィー版 | 虫バージョン |
|---|---|---|
| 主人公 | キャッフィー | テントウムシ |
| 場所 | 琵琶湖の航路 | 草むらの土の道 |
| 障害物 | 網・釣り針・ペットボトル | クモの巣・カエル・カマキリ（テントウムシの天敵） |
| 得点アイテム | エビ | アブラムシ（テントウムシの大好物） |
| 道の目印 | ブイとロープ | 道ばたのタンポポとコスモス、小石、草 |
| 当たったとき | 水しぶき | 土けむりと葉っぱ |
| 環境音 | 湖のさざ波 | そよ風・虫の声・小鳥 |
| 背景 | 琵琶湖の写真（朝→昼→夕方→夜） | 草原のイラスト（朝→昼→夕方→夜） |

遊び方・難易度・スコア・コンボ・ランキング・設定パネル・カメラ操作は元のゲームと同じです。
記録と設定は元のゲームとは別に保存されます（`localStorage` のキーが `mushi_survival_*`）。

## 操作方法

| 操作 | カメラ | マウス | キーボード |
|---|---|---|---|
| スタート | 両手を肩より上に挙げる | 「▶ スタート」「ゲーム開始」 | Space / Enter |
| 左右の移動 | 体を左右に動かす | （非対応） | ← → |
| ストップ（中断） | （非対応） | 「■ ストップ」 | Esc |
| リトライ | 両手を肩より上に挙げる | 「もう一度」 | Space / Enter |

難易度は画面右下の「設定」か、タイトル画面で 1・2・3 キー（やさしい・ふつう・むずかしい）で変えられます。

| 難易度 | ライフ | 障害物の速度 | 出現間隔（開始→最短） |
|---|---|---|---|
| やさしい | 5 | 26 | 1.90秒 → 1.05秒 |
| ふつう | 3 | 34 | 1.50秒 → 0.70秒 |
| むずかしい | 2 | 46 | 1.15秒 → 0.48秒 |

制限時間は60秒。スコアは「生存1秒ごとに10点」＋「よけた障害物1つにつき25点」＋「アブラムシ1匹につき120点」（コンボ倍率つき）。ハートはライフを1回復します。

## ローカルで動かす

カメラとモデルの読み込みには `http(s)://` での配信が必要です。

```bash
python -m http.server 8000
```

ブラウザで `http://localhost:8000/` を開きます。カメラが使えないときは、エラー画面の「キーボード（← →）で遊ぶ」で遊べます。

## オフライン版（ダブルクリックで開ける版）

```bash
node tools/build-offline.mjs
```

`offline/テントウムシの草むらサバイバル/` とその `.zip` ができます（Git には入れません）。

## 絵と音の作り方

絵はすべて `tools/art/make-art.py` が SVG で描いています。形や色を変えたら、次の順で作り直します。

```bash
python tools/art/make-art.py
```

```bash
powershell -ExecutionPolicy Bypass -File tools/art/rasterize.ps1
```

```bash
python tools/art/finish-art.py
```

- `make-art.py` … テントウムシ・クモの巣・カエル・カマキリ・アブラムシ・花・背景4枚の SVG を `tools/art/svg/` に書く
- `rasterize.ps1` … Edge のヘッドレスで透過 PNG にする（`tools/art/png/`）
- `finish-art.py` … `assets/` に置く（背景は WebP）
- `make-sound.py` … 草むらの環境音 `assets/audio/meadow.wav` を作る（numpy が必要）

背景の水平線は画像の高さの 0.42 の位置にあり、`game.js` の `CONFIG.backgrounds` の `horizon` と合わせています。

## ファイル構成

```
index.html              マークアップ
style.css               見た目（色は :root 変数で一元管理）
game.js                 草むら・障害物・テントウムシの描画、当たり判定、スコア
character-hit-region.js テントウムシの当たり判定の範囲（せなかと顔の楕円）
outline-collision.js    画像の不透明部分どうしの当たり判定
sound.js                環境音と効果音
main.js                 カメラ・姿勢推定・画面遷移・UI・設定・記録
assets/character.png    テントウムシ（400×340・背景透過）
assets/bg/              背景（morning / day / sunset / night）
assets/obstacles/       web（クモの巣）/ frog（カエル）/ mantis（カマキリ）
assets/items/           aphid（アブラムシ）/ heart-red（ハート）
assets/flowers/         dandelion（タンポポ）/ cosmos（コスモス）
assets/audio/meadow.wav 草むらの環境音
tools/                  オフライン版と絵・音を作るスクリプト
```

## 技術構成

- 姿勢推定: MediaPipe Tasks Vision の `PoseLandmarker`（CDN経由）
- 描画: Canvas 2D（透視投影）
- 効果音: Web Audio API で合成
- フレームワーク不使用、素のJavaScript
