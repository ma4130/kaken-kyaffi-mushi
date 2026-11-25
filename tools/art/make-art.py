"""虫バージョンの絵（SVG）を作るスクリプト。

    python tools/art/make-art.py

tools/art/svg/ に SVG を書き出す。PNG/WebP にするのは rasterize.ps1 の仕事。
ゲームの見た目を変えたいときは、ここの色や形を直して作り直す。
"""
import math
import os
import random

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'svg')
os.makedirs(OUT, exist_ok=True)


def save(name, w, h, body, defs=''):
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">'
           '<defs>%s</defs>%s</svg>') % (w, h, w, h, defs, body)
    with open(os.path.join(OUT, name + '.svg'), 'w', encoding='utf-8') as f:
        f.write(svg)


# ------------------------------------------------------------------
# 主人公：テントウムシ（400×340・正面）
# ------------------------------------------------------------------
def ladybug():
    defs = (
        '<radialGradient id="shell" cx="38%" cy="28%" r="78%">'
        '<stop offset="0" stop-color="#ff7a63"/><stop offset=".55" stop-color="#e8291c"/>'
        '<stop offset="1" stop-color="#a3130c"/></radialGradient>'
        '<radialGradient id="head" cx="45%" cy="30%" r="75%">'
        '<stop offset="0" stop-color="#44445a"/><stop offset="1" stop-color="#121219"/></radialGradient>'
    )
    b = []
    # 足
    b.append('<g stroke="#17171f" stroke-width="13" stroke-linecap="round" fill="none">'
             '<path d="M92 228 Q52 240 34 276"/><path d="M308 228 Q348 240 366 276"/>'
             '<path d="M118 268 Q92 296 86 324"/><path d="M282 268 Q308 296 314 324"/>'
             '<path d="M162 292 Q156 314 150 330"/><path d="M238 292 Q244 314 250 330"/></g>')
    # せなか（はね）
    b.append('<ellipse cx="200" cy="172" rx="152" ry="138" fill="url(#shell)" stroke="#5c0c07" stroke-width="7"/>')
    b.append('<path d="M200 36 V250" stroke="#2b0a08" stroke-width="8"/>')
    for (x, y, r) in [(124, 100, 25), (276, 100, 25), (92, 182, 22), (308, 182, 22),
                      (160, 148, 17), (240, 148, 17), (200, 70, 0)]:
        if r:
            b.append('<circle cx="%d" cy="%d" r="%d" fill="#1a0806"/>' % (x, y, r))
    b.append('<ellipse cx="138" cy="78" rx="44" ry="18" fill="#fff" opacity=".38" transform="rotate(-24 138 78)"/>')
    b.append('<ellipse cx="262" cy="70" rx="16" ry="8" fill="#fff" opacity=".30" transform="rotate(20 262 70)"/>')
    # しょっかく
    b.append('<g stroke="#17171f" stroke-width="9" stroke-linecap="round" fill="none">'
             '<path d="M172 200 Q150 140 104 128"/><path d="M228 200 Q250 140 296 128"/></g>'
             '<circle cx="102" cy="127" r="13" fill="#17171f"/><circle cx="298" cy="127" r="13" fill="#17171f"/>')
    # 顔
    b.append('<ellipse cx="200" cy="254" rx="102" ry="74" fill="url(#head)" stroke="#000" stroke-width="5"/>')
    for ex in (163, 237):
        b.append('<ellipse cx="%d" cy="244" rx="27" ry="31" fill="#fff"/>' % ex)
        b.append('<circle cx="%d" cy="251" r="16" fill="#111"/>' % (ex + 4))
        b.append('<circle cx="%d" cy="243" r="6.5" fill="#fff"/>' % (ex + 9))
    b.append('<ellipse cx="127" cy="282" rx="15" ry="9" fill="#ff8fb0" opacity=".75"/>')
    b.append('<ellipse cx="273" cy="282" rx="15" ry="9" fill="#ff8fb0" opacity=".75"/>')
    b.append('<path d="M178 288 Q200 310 222 288" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round"/>')
    save('ladybug', 400, 340, ''.join(b), defs)


# ------------------------------------------------------------------
# 障害物1：クモの巣（420×440）。左右の草のくきに張っていて、まん中にクモ
# ------------------------------------------------------------------
def web():
    cx, cy = 210, 200
    b = []
    # くき
    b.append('<g stroke-linecap="round" fill="none">'
             '<path d="M30 440 Q22 220 50 20" stroke="#3e8a2c" stroke-width="16"/>'
             '<path d="M390 440 Q400 230 368 30" stroke="#3e8a2c" stroke-width="16"/>'
             '<path d="M30 440 Q22 220 50 20" stroke="#7ccf55" stroke-width="5"/>'
             '<path d="M390 440 Q400 230 368 30" stroke="#7ccf55" stroke-width="5"/></g>')
    # 放射状の糸（端はくきと上下に届く）
    ends = [(48, 40), (130, 18), (210, 12), (290, 18), (370, 46), (392, 140), (394, 250),
            (392, 360), (300, 420), (210, 428), (120, 420), (28, 360), (26, 250), (28, 140)]
    spokes = ''.join('<path d="M%d %d L%d %d"/>' % (cx, cy, x, y) for (x, y) in ends)
    rings = ''
    for k in range(1, 8):
        t = k / 8.0
        pts = []
        for (x, y) in ends:
            pts.append('%.1f %.1f' % (cx + (x - cx) * t, cy + (y - cy) * t))
        rings += '<path d="M%s Z"/>' % ' L'.join(pts)
    b.append('<g stroke="#ffffff" stroke-width="4" fill="none" opacity=".92">%s%s</g>' % (spokes, rings))
    b.append('<g stroke="#bfe8ff" stroke-width="1.6" fill="none" opacity=".8">%s</g>' % rings)
    # 露のしずく
    random.seed(4)
    for _ in range(9):
        x, y = random.randint(80, 340), random.randint(60, 380)
        b.append('<circle cx="%d" cy="%d" r="4.5" fill="#e8fbff" stroke="#9fdcf5" stroke-width="1.5"/>' % (x, y))
    # クモ
    legs = ''
    for side in (-1, 1):
        for i, (a, l) in enumerate([(-55, 70), (-20, 78), (15, 74), (50, 66)]):
            ang = math.radians(a)
            kx = cx + side * math.cos(ang) * 40
            ky = cy + 10 + math.sin(ang) * 40 - 18
            ex = cx + side * math.cos(ang) * l
            ey = cy + 10 + math.sin(ang) * l + 22
            legs += '<path d="M%d %d Q%.0f %.0f %.0f %.0f"/>' % (cx, cy + 10, kx, ky, ex, ey)
    b.append('<g stroke="#2b1f3a" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round">%s</g>' % legs)
    b.append('<ellipse cx="%d" cy="%d" rx="34" ry="38" fill="#3b2a52" stroke="#1a1026" stroke-width="5"/>' % (cx, cy + 22))
    b.append('<path d="M%d %d l-12 16 h24 z" fill="#f2c94c"/>' % (cx, cy + 14))
    b.append('<circle cx="%d" cy="%d" r="24" fill="#4a3566" stroke="#1a1026" stroke-width="5"/>' % (cx, cy - 12))
    for ex in (-10, 10):
        b.append('<circle cx="%d" cy="%d" r="8" fill="#fff"/><circle cx="%d" cy="%d" r="4.5" fill="#c0182b"/>'
                 % (cx + ex, cy - 16, cx + ex, cy - 15))
    b.append('<path d="M%d %d q8 6 16 0" stroke="#fff" stroke-width="3" fill="none"/>' % (cx - 8, cy - 2))
    save('web', 420, 440, ''.join(b))


# ------------------------------------------------------------------
# 障害物2：カエル（380×300）
# ------------------------------------------------------------------
def frog():
    defs = ('<radialGradient id="fg" cx="45%" cy="30%" r="80%"><stop offset="0" stop-color="#9be36b"/>'
            '<stop offset="1" stop-color="#3d9a2e"/></radialGradient>')
    b = []
    # うしろ足
    b.append('<ellipse cx="70" cy="250" rx="70" ry="44" fill="#4aa83a" stroke="#1f5a18" stroke-width="6"/>')
    b.append('<ellipse cx="310" cy="250" rx="70" ry="44" fill="#4aa83a" stroke="#1f5a18" stroke-width="6"/>')
    # 体
    b.append('<ellipse cx="190" cy="196" rx="150" ry="100" fill="url(#fg)" stroke="#1f5a18" stroke-width="7"/>')
    b.append('<ellipse cx="190" cy="236" rx="92" ry="56" fill="#e9f7c9"/>')
    # 目
    for ex in (110, 270):
        b.append('<circle cx="%d" cy="88" r="56" fill="url(#fg)" stroke="#1f5a18" stroke-width="7"/>' % ex)
        b.append('<circle cx="%d" cy="86" r="38" fill="#fff"/>' % ex)
        b.append('<ellipse cx="%d" cy="92" rx="14" ry="24" fill="#111"/>' % (ex + (6 if ex < 190 else -6)))
        b.append('<circle cx="%d" cy="78" r="7" fill="#fff"/>' % (ex + (12 if ex < 190 else 0)))
    # 口と舌
    b.append('<path d="M92 170 Q190 250 288 170" stroke="#1f5a18" stroke-width="8" fill="#b8323f" stroke-linejoin="round"/>')
    b.append('<path d="M150 196 Q190 236 230 196 Q190 214 150 196Z" fill="#ff7f93"/>')
    b.append('<ellipse cx="96" cy="196" rx="18" ry="10" fill="#ff9fb3" opacity=".7"/>')
    b.append('<ellipse cx="284" cy="196" rx="18" ry="10" fill="#ff9fb3" opacity=".7"/>')
    # まえ足
    for fx in (130, 250):
        b.append('<path d="M%d 250 v34" stroke="#3d9a2e" stroke-width="20" stroke-linecap="round"/>' % fx)
        b.append('<path d="M%d 290 h44" stroke="#3d9a2e" stroke-width="14" stroke-linecap="round"/>' % (fx - 22))
    save('frog', 380, 300, ''.join(b), defs)


# ------------------------------------------------------------------
# 障害物3：カマキリ（320×440）
# ------------------------------------------------------------------
def mantis():
    g, gd, gl = '#5cc23c', '#246b17', '#a6e67d'
    b = []
    # 足
    b.append('<g stroke="%s" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none">'
             '<path d="M140 300 L80 350 L64 436"/><path d="M180 300 L240 350 L256 436"/>'
             '<path d="M145 330 L110 400 L118 438"/><path d="M175 330 L210 400 L202 438"/></g>' % gd)
    # おなか
    b.append('<ellipse cx="160" cy="352" rx="40" ry="80" fill="%s" stroke="%s" stroke-width="6"/>' % (g, gd))
    for y in (320, 350, 380):
        b.append('<path d="M128 %d Q160 %d 192 %d" stroke="%s" stroke-width="3" fill="none"/>' % (y, y + 10, y, gd))
    # むね
    b.append('<rect x="146" y="150" width="28" height="150" rx="14" fill="%s" stroke="%s" stroke-width="6"/>' % (g, gd))
    # かま（左右）
    for s in (-1, 1):
        ax = 160 + s * 14
        ex = 160 + s * 92
        tx = 160 + s * 70
        b.append('<path d="M%d 190 L%d 150 L%d 70" stroke="%s" stroke-width="22" stroke-linecap="round" '
                 'stroke-linejoin="round" fill="none"/>' % (ax, ex, tx, gd))
        b.append('<path d="M%d 190 L%d 150 L%d 70" stroke="%s" stroke-width="13" stroke-linecap="round" '
                 'stroke-linejoin="round" fill="none"/>' % (ax, ex, tx, g))
        # とげ
        for k in range(3):
            t = (k + 1) / 4.0
            px = ex + (tx - ex) * t
            py = 150 + (70 - 150) * t
            b.append('<path d="M%.0f %.0f l%d -4" stroke="%s" stroke-width="5" stroke-linecap="round"/>'
                     % (px - s * 4, py, -s * 14, gd))
    # 頭（さんかく）としょっかく
    b.append('<g stroke="%s" stroke-width="4" fill="none" stroke-linecap="round">'
             '<path d="M150 74 Q120 20 92 8"/><path d="M170 74 Q200 20 228 8"/></g>' % gd)
    b.append('<path d="M100 82 Q160 50 220 82 Q190 150 160 156 Q130 150 100 82Z" fill="%s" stroke="%s" '
             'stroke-width="6" stroke-linejoin="round"/>' % (g, gd))
    for ex in (114, 206):
        b.append('<ellipse cx="%d" cy="88" rx="24" ry="22" fill="%s" stroke="%s" stroke-width="5"/>' % (ex, gl, gd))
        b.append('<circle cx="%d" cy="90" r="9" fill="#111"/><circle cx="%d" cy="86" r="3.5" fill="#fff"/>'
                 % (ex + (6 if ex < 160 else -6), ex + (8 if ex < 160 else -4)))
    b.append('<path d="M144 128 L160 120 L176 128" stroke="%s" stroke-width="5" fill="none" stroke-linecap="round"/>' % gd)
    save('mantis', 320, 440, ''.join(b))


# ------------------------------------------------------------------
# アイテム：アブラムシ（220×180）。テントウムシの大好物
# ------------------------------------------------------------------
def aphid():
    b = []
    b.append('<g stroke="#4f8a2a" stroke-width="7" stroke-linecap="round" fill="none">'
             '<path d="M70 120 l-30 30"/><path d="M110 140 v32"/><path d="M150 120 l30 30"/>'
             '<path d="M84 50 Q70 18 46 12"/><path d="M136 50 Q150 18 174 12"/></g>')
    b.append('<ellipse cx="110" cy="100" rx="78" ry="62" fill="#b9ef7a" stroke="#4f8a2a" stroke-width="6"/>')
    b.append('<ellipse cx="88" cy="74" rx="26" ry="12" fill="#fff" opacity=".55" transform="rotate(-20 88 74)"/>')
    for ex in (86, 134):
        b.append('<circle cx="%d" cy="100" r="11" fill="#1d2a12"/><circle cx="%d" cy="96" r="4" fill="#fff"/>' % (ex, ex + 3))
    b.append('<path d="M98 120 Q110 132 122 120" stroke="#1d2a12" stroke-width="5" fill="none" stroke-linecap="round"/>')
    b.append('<ellipse cx="66" cy="122" rx="10" ry="6" fill="#ff9fb3" opacity=".8"/>')
    b.append('<ellipse cx="154" cy="122" rx="10" ry="6" fill="#ff9fb3" opacity=".8"/>')
    save('aphid', 220, 180, ''.join(b))


# ------------------------------------------------------------------
# 道ばたの花（ブイの代わり）：タンポポ・コスモス（200×420）
# ------------------------------------------------------------------
def flower(name, petal, petal_dark, center, n, pr, plen):
    b = []
    b.append('<path d="M100 420 Q92 300 100 150" stroke="#3e8a2c" stroke-width="12" fill="none" stroke-linecap="round"/>')
    b.append('<path d="M98 360 Q40 330 22 270 Q70 300 98 330Z" fill="#4fa53a" stroke="#2c6e20" stroke-width="4"/>')
    b.append('<path d="M100 300 Q160 270 178 214 Q130 246 100 272Z" fill="#4fa53a" stroke="#2c6e20" stroke-width="4"/>')
    petals = ''
    for i in range(n):
        a = 360.0 * i / n
        petals += ('<ellipse cx="100" cy="%d" rx="%d" ry="%d" transform="rotate(%.1f 100 120)"/>'
                   % (120 - plen, pr, plen, a))
    b.append('<g fill="%s" stroke="%s" stroke-width="3">%s</g>' % (petal, petal_dark, petals))
    b.append('<circle cx="100" cy="120" r="24" fill="%s" stroke="#b36b00" stroke-width="3"/>' % center)
    save(name, 200, 420, ''.join(b))


# ------------------------------------------------------------------
# 背景（1600×900）。水平線は高さの 0.42（= 378px）
# ------------------------------------------------------------------
HZ = 378


def background(name, sky, ground, hills, blade, sun=None, moon=False, stars=False, clouds=0.0, glow=None):
    W, H = 1600, 900
    defs = '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">'
    for off, col in sky:
        defs += '<stop offset="%s" stop-color="%s"/>' % (off, col)
    defs += '</linearGradient><linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">'
    for off, col in ground:
        defs += '<stop offset="%s" stop-color="%s"/>' % (off, col)
    defs += '</linearGradient>'
    defs += ('<radialGradient id="sunglow"><stop offset="0" stop-color="#fff6d8" stop-opacity=".95"/>'
             '<stop offset=".25" stop-color="#ffe9b0" stop-opacity=".45"/>'
             '<stop offset="1" stop-color="#ffe9b0" stop-opacity="0"/></radialGradient>')
    b = ['<rect width="%d" height="%d" fill="url(#sky)"/>' % (W, HZ + 2)]
    random.seed(name)
    if stars:
        for _ in range(140):
            x, y = random.uniform(0, W), random.uniform(0, HZ - 40)
            r = random.choice([0.9, 1.2, 1.6, 2.2])
            b.append('<circle cx="%.0f" cy="%.0f" r="%.1f" fill="#fff" opacity="%.2f"/>' % (x, y, r, random.uniform(.4, 1)))
    if sun:
        x, y, r, col = sun
        b.append('<circle cx="%d" cy="%d" r="%d" fill="url(#sunglow)"/>' % (x, y, r * 6))
        b.append('<circle cx="%d" cy="%d" r="%d" fill="%s"/>' % (x, y, r, col))
    if moon:
        b.append('<circle cx="1180" cy="120" r="150" fill="url(#sunglow)" opacity=".35"/>')
        b.append('<circle cx="1180" cy="120" r="46" fill="#fff8dc"/>')
        b.append('<circle cx="1200" cy="108" r="42" fill="%s"/>' % sky[0][1])
    for i in range(int(clouds * 5)):
        x, y, s = random.uniform(80, 1520), random.uniform(50, HZ - 150), random.uniform(.7, 1.3)
        c = ''.join('<circle cx="%.0f" cy="%.0f" r="%.0f"/>' % (x + dx * s, y + dy * s, rr * s)
                    for dx, dy, rr in [(-60, 12, 36), (0, 0, 52), (58, 14, 40), (20, 26, 42)])
        b.append('<g fill="#fff" opacity="%.2f">%s</g>' % (0.85 * min(1, clouds + .2), c))
    if glow:
        b.append('<ellipse cx="800" cy="%d" rx="1000" ry="90" fill="%s" opacity=".55"/>' % (HZ, glow))
    # 遠くの丘と森
    for k, (col, hgt, seed) in enumerate(hills):
        pts = ['0 %d' % (HZ + 2)]
        for x in range(0, W + 20, 20):
            t = x * 0.004 + seed
            y = HZ - hgt * (0.55 + 0.25 * math.sin(t * 1.3) + 0.15 * math.sin(t * 3.1 + 1) + 0.05 * math.sin(t * 9))
            pts.append('%d %.1f' % (x, y))
        pts.append('%d %d' % (W, HZ + 2))
        b.append('<path d="M%s Z" fill="%s"/>' % (' L'.join(pts), col))
        if k == len(hills) - 1:
            # 手前の丘には木のこんもり
            for x in range(-20, W + 40, 46):
                r = random.uniform(16, 30)
                b.append('<circle cx="%d" cy="%.0f" r="%.0f" fill="%s"/>' % (x, HZ - r * 0.6, r, col))
    # 地面（草原）
    b.append('<rect y="%d" width="%d" height="%d" fill="url(#gr)"/>' % (HZ, W, H - HZ))
    # 草原のすじ（奥ほど細かい）
    for i in range(40):
        y = HZ + (H - HZ) * (i / 40.0) ** 1.8
        b.append('<path d="M0 %.1f H%d" stroke="#000" stroke-opacity=".05" stroke-width="%.1f"/>' % (y, W, 1 + i * 0.12))
    # 水平線ぞいの小さな草
    for x in range(0, W, 7):
        h = random.uniform(6, 16)
        b.append('<path d="M%d %d q2 -%0.f %d -%.0f" stroke="%s" stroke-width="2" fill="none"/>'
                 % (x, HZ + 3, h, random.randint(-3, 3), h, blade[0]))
    # 両はしの大きな草（虫から見た巨大な草）
    def big_blade(x0, lean, height, width, col):
        top_x = x0 + lean
        return ('<path d="M%d %d Q%.0f %.0f %.0f %.0f Q%.0f %.0f %d %d Z" fill="%s"/>'
                % (x0 - width, H, x0 - width * 0.4 + lean * 0.3, H - height * 0.6, top_x, H - height,
                   x0 + width * 0.6 + lean * 0.4, H - height * 0.5, x0 + width, H, col))
    for x0, lean, hh, ww in [(30, 120, 820, 40), (110, 60, 700, 34), (-20, 200, 600, 46), (200, 140, 520, 30),
                             (1570, -120, 820, 40), (1490, -70, 690, 34), (1620, -190, 610, 46), (1400, -130, 500, 30)]:
        b.append(big_blade(x0, lean, hh, ww, blade[1]))
    for x0, lean, hh, ww in [(70, 90, 760, 22), (1530, -90, 760, 22), (160, 40, 600, 18), (1440, -40, 600, 18)]:
        b.append(big_blade(x0, lean, hh, ww, blade[2]))
    save(name, W, H, ''.join(b), defs)


# ------------------------------------------------------------------
# 上から降ってくるモードの障害物：クモ・どんぐり・雨つぶ・落ち葉
# （クモの糸はゲームの中で線として描く）
# ------------------------------------------------------------------
def spider():
    cx, cy = 120, 120
    legs = ''
    for side in (-1, 1):
        for a, l in [(-50, 78), (-15, 86), (20, 82), (55, 72)]:
            ang = math.radians(a)
            kx = cx + side * math.cos(ang) * 46
            ky = cy + math.sin(ang) * 46 - 22
            ex = cx + side * math.cos(ang) * l
            ey = cy + math.sin(ang) * l + 26
            legs += '<path d="M%d %d Q%.0f %.0f %.0f %.0f"/>' % (cx, cy, kx, ky, ex, ey)
    b = ['<g stroke="#2b1f3a" stroke-width="10" fill="none" stroke-linecap="round">%s</g>' % legs]
    b.append('<ellipse cx="120" cy="138" rx="44" ry="48" fill="#3b2a52" stroke="#1a1026" stroke-width="6"/>')
    b.append('<path d="M120 128 l-14 18 h28 z" fill="#f2c94c"/>')
    b.append('<circle cx="120" cy="96" r="32" fill="#4a3566" stroke="#1a1026" stroke-width="6"/>')
    for ex in (-13, 13):
        b.append('<circle cx="%d" cy="92" r="11" fill="#fff"/><circle cx="%d" cy="94" r="6" fill="#c0182b"/>' % (120 + ex, 120 + ex))
    b.append('<path d="M110 110 q10 8 20 0" stroke="#fff" stroke-width="4" fill="none"/>')
    b.append('<path d="M120 0 V64" stroke="#e8e8f0" stroke-width="3"/>')
    save('spider', 240, 220, ''.join(b))


def acorn():
    b = ['<path d="M110 8 q6 18 -2 30" stroke="#6b4423" stroke-width="10" fill="none" stroke-linecap="round"/>']
    b.append('<path d="M40 150 Q40 250 110 262 Q180 250 180 150 Z" fill="#c9843e" stroke="#6b4423" stroke-width="7"/>')
    b.append('<ellipse cx="86" cy="190" rx="14" ry="30" fill="#fff" opacity=".35"/>')
    b.append('<path d="M24 120 Q30 40 110 38 Q190 40 196 120 Q196 160 110 160 Q24 160 24 120Z" fill="#8a5a2b" stroke="#4e3015" stroke-width="7"/>')
    for x in range(44, 190, 22):
        b.append('<path d="M%d 64 l10 70" stroke="#6b4423" stroke-width="4"/>' % x)
    save('acorn', 220, 270, ''.join(b))


def raindrop():
    defs = ('<linearGradient id="rd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe9ff"/>'
            '<stop offset="1" stop-color="#3aa0e6"/></linearGradient>')
    b = ['<path d="M100 10 Q40 110 34 160 Q30 230 100 236 Q170 230 166 160 Q160 110 100 10Z" fill="url(#rd)" stroke="#1f6fae" stroke-width="7"/>']
    b.append('<ellipse cx="72" cy="150" rx="12" ry="30" fill="#fff" opacity=".6" transform="rotate(15 72 150)"/>')
    for ex in (82, 118):
        b.append('<circle cx="%d" cy="176" r="8" fill="#103a5e"/><circle cx="%d" cy="173" r="3" fill="#fff"/>' % (ex, ex + 2))
    b.append('<path d="M88 198 Q100 208 112 198" stroke="#103a5e" stroke-width="5" fill="none" stroke-linecap="round"/>')
    save('raindrop', 200, 246, defs=defs, body=''.join(b))


def leaf():
    b = ['<path d="M30 230 Q20 90 150 20 Q250 130 150 210 Q90 250 30 230Z" fill="#e8892c" stroke="#9a4a10" stroke-width="7"/>']
    b.append('<path d="M30 230 Q100 140 150 20" stroke="#9a4a10" stroke-width="6" fill="none"/>')
    for t in (0.3, 0.5, 0.7):
        x = 30 + 120 * t; y = 230 - 210 * t
        b.append('<path d="M%.0f %.0f q40 10 70 -10 M%.0f %.0f q-10 -30 -10 -60" stroke="#9a4a10" stroke-width="4" fill="none"/>' % (x, y, x, y))
    b.append('<path d="M30 230 l-18 16" stroke="#9a4a10" stroke-width="7" stroke-linecap="round"/>')
    save('leaf', 240, 260, ''.join(b))


ladybug()
web()
frog()
mantis()
aphid()
spider()
acorn()
raindrop()
leaf()
flower('dandelion', '#ffd23a', '#d99a00', '#ffb300', 22, 9, 44)
flower('cosmos', '#ff9cc8', '#d9578f', '#ffd23a', 8, 22, 46)

background('morning',
           sky=[(0, '#7fbde8'), (.6, '#cfe6f2'), (1, '#ffe2b8')],
           ground=[(0, '#8fcf5e'), (.3, '#5fae3e'), (1, '#2e7426')],
           hills=[('#a9c9b0', 120, 1.2), ('#7fae84', 80, 4.1), ('#5f9a5c', 46, 7.3)],
           blade=('#5aa63a', '#3d8a2a', '#6cc045'),
           sun=(330, 250, 48, '#fff4d0'), clouds=0.6, glow='#fff0c8')
background('day',
           sky=[(0, '#2f8fdc'), (.55, '#86c8ef'), (1, '#dff3fb')],
           ground=[(0, '#9ad866'), (.3, '#68b844'), (1, '#2f7c28')],
           hills=[('#9ec7c0', 120, 1.2), ('#6fae7a', 80, 4.1), ('#4f9a4c', 46, 7.3)],
           blade=('#5fb03c', '#3f922c', '#74cc4a'),
           sun=(1220, 90, 46, '#fffbea'), clouds=1.0)
background('sunset',
           sky=[(0, '#4a4488'), (.45, '#e47a62'), (.85, '#ffb36b'), (1, '#ffd38a')],
           ground=[(0, '#9a9a46'), (.3, '#6a7a34'), (1, '#2c3a1a')],
           hills=[('#a86a7a', 120, 1.2), ('#7a4e6a', 80, 4.1), ('#4e3a4e', 46, 7.3)],
           blade=('#6a7a30', '#3e4a22', '#7a8a3a'),
           sun=(800, 350, 60, '#ffcf7a'), clouds=0.4, glow='#ffb070')
background('night',
           sky=[(0, '#0a1230'), (.7, '#1f2e5e'), (1, '#33467a')],
           ground=[(0, '#2a4a3a'), (.3, '#1c3828'), (1, '#0a1810')],
           hills=[('#24345a', 120, 1.2), ('#1a2a46', 80, 4.1), ('#142236', 46, 7.3)],
           blade=('#1f3a28', '#12261a', '#24442e'),
           moon=True, stars=True)
print('wrote', sorted(os.listdir(OUT)))
