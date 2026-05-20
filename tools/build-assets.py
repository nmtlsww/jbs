"""从 reference/original-design.png 生成 assets/bg.png 与 assets/icon-record.png。
用法（项目根目录）：python tools/build-assets.py

bg.png：抹掉原图里"烘焙进去"的旧数字 23 与 5 条示意记录，其余像素完全不动。
  填充法：按列在上下两条"纯背景带"之间垂直线性插值（保留竖直渐变与横向暗角），
  再叠加与周边等强度的颗粒噪声（避免平滑补丁在有纹理背景上显形）。
icon-record.png：从原图第 1 行图标（剧本杀面具）抠出、去背、收紧。
"""
import os
import cv2
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'reference', 'original-design.png')
ASSETS = os.path.join(ROOT, 'assets')

# 待抹除矩形 (x0, y0, x1, y1)
NUMBER_BOX = (415, 812, 512, 886)        # 旧数字 23（右侧不碰 /30）
RECORDS_BOX = (205, 1180, 712, 1415)     # 5 条示意记录（表头下方、面板边框内）


def _smooth_x(colors, k=15):
    """对每列颜色沿 x 做盒式平滑，消除列间噪声造成的竖条纹。colors: (W,3)。"""
    pad = np.pad(colors, ((k, k), (0, 0)), mode='edge')
    ker = np.ones(2 * k + 1) / (2 * k + 1)
    return np.stack([np.convolve(pad[:, c], ker, 'valid') for c in range(3)], axis=1)


def _grain_std(arr, box):
    """量取某块纯背景的颗粒强度（高频 std）。"""
    x0, y0, x1, y1 = box
    patch = arr[y0:y1, x0:x1].astype(np.float32)
    blur = cv2.GaussianBlur(patch, (0, 0), 1.6)
    return float(np.clip(np.std(patch - blur), 0.5, 6.0))


def _fill(arr, box, top_strip, bot_strip, grain, rng):
    """按列在 top_strip / bot_strip 两条纯背景带之间垂直插值填充 box，并叠加颗粒噪声。"""
    x0, y0, x1, y1 = box
    h = y1 - y0
    top = _smooth_x(arr[top_strip[0]:top_strip[1], x0:x1].astype(np.float32).mean(axis=0))
    bot = _smooth_x(arr[bot_strip[0]:bot_strip[1], x0:x1].astype(np.float32).mean(axis=0))
    t = np.linspace(0, 1, h)[:, None, None]
    grad = top[None] * (1 - t) + bot[None] * t          # (h, w, 3)
    grad = grad + rng.normal(0, grain, grad.shape)
    arr[y0:y1, x0:x1] = np.clip(grad, 0, 255).astype(np.uint8)


def build_bg():
    arr = cv2.imread(SRC)  # BGR uint8
    rng = np.random.default_rng(7)
    # 数字区：卡片背景近似纯深蓝，用下方纯净卡片色做平填
    g = _grain_std(arr, (430, 892, 510, 935))
    _fill(arr, NUMBER_BOX, (890, 906), (890, 906), g, rng)
    # 记录区：面板有竖直渐变 + 横向暗角，上下两带插值
    g = _grain_std(arr, (240, 1418, 660, 1445))
    _fill(arr, RECORDS_BOX, (1172, 1179), (1416, 1444), g, rng)
    # 抹掉烘焙的"3"（徽章"30次卡"、卡片"/30"），页面用 DOM 在原位叠"2"
    mask = np.zeros(arr.shape[:2], np.uint8)
    mask[472:521, 394:426] = 255   # 徽章 "30" 的 "3"
    mask[845:876, 524:545] = 255   # 卡片 "/30" 的 "3"
    arr = cv2.inpaint(arr, mask, 3, cv2.INPAINT_TELEA)
    out = os.path.join(ASSETS, 'bg.png')
    cv2.imwrite(out, arr)
    print('wrote', out, (arr.shape[1], arr.shape[0]))


def build_icon():
    im = Image.open(SRC).convert('RGBA').crop((250, 1186, 296, 1230))
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, _ = px[x, y]
            maxc = max(r, g, b)
            alpha = 0 if maxc < 45 else min(255, int(maxc * 1.4))
            px[x, y] = (r, g, b, alpha)
    bbox = im.getbbox()  # 收紧到非透明像素
    if bbox:
        im = im.crop(bbox)
    out = os.path.join(ASSETS, 'icon-record.png')
    im.save(out)
    print('wrote', out, im.size)


if __name__ == '__main__':
    os.makedirs(ASSETS, exist_ok=True)
    build_bg()
    build_icon()
