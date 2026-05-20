# 剧本杀体验卡 H5 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把剧本杀体验卡设计稿做成可交互纯静态 H5：点"使用"按钮，剩余次数 −1 且使用记录新增一条。

**Architecture:** 整张设计稿（抹掉旧数字与示意记录后的"干净底图"）用 `<img>` 铺满舞台；舞台上叠一层与图片完全重合的交互层，仅含 3 个用百分比/`cqw` 锚定的元素（剩余次数数字、使用记录列表、按钮透明热区）。纯逻辑抽到 `js/state.js`（Node 单测覆盖），DOM 与 localStorage 粘合在 `js/app.js`。

**Tech Stack:** 原生 HTML/CSS/JavaScript（零依赖、零构建）；Python + Pillow 生成图片资源；Node 内置 `node:test` 跑单测。

---

## 文件结构

```
script-kill-card-h5/
├─ index.html              页面骨架
├─ css/style.css           布局与三元素样式
├─ js/state.js             纯逻辑（UMD：浏览器全局 + Node require），被单测覆盖
├─ js/app.js               DOM 渲染 + localStorage 粘合（浏览器）
├─ assets/bg.png           干净底图（build 生成）
├─ assets/icon-record.png  记录行图标（build 生成）
├─ reference/original-design.png  原始设计稿（已存在，仅供比对）
├─ tools/build-assets.py   由原图生成 assets/
├─ tests/state.test.js     state.js 的 node:test 单测
└─ docs/                   设计文档 + 本计划
```

职责边界：`state.js` 只有纯函数、不碰 DOM/localStorage/Date.now；`app.js` 只做 I/O 与渲染、不含业务规则；`build-assets.py` 一次性生成资源、与运行时无关。

---

## Task 1: 生成图片资源

把原图里"烘焙进去"的旧数字 `23` 与 5 条示意记录抹掉，生成干净底图；并抠出记录行图标。

**Files:**
- Create: `tools/build-assets.py`
- Generates: `assets/bg.png`, `assets/icon-record.png`

- [ ] **Step 1: 写资源生成脚本**

创建 `tools/build-assets.py`：

```python
"""从 reference/original-design.png 生成 assets/bg.png 与 assets/icon-record.png。
用法（项目根目录）：python tools/build-assets.py
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'reference', 'original-design.png')
ASSETS = os.path.join(ROOT, 'assets')


def avg_col(px, x, y0, y1):
    n = y1 - y0
    s = [0, 0, 0]
    for y in range(y0, y1):
        p = px[x, y]
        s[0] += p[0]; s[1] += p[1]; s[2] += p[2]
    return [s[0] / n, s[1] / n, s[2] / n]


def erase(px, box, top_sample, bot_sample):
    """按列在 top_sample / bot_sample 两条纯背景带之间垂直线性插值填充 box。"""
    x0, y0, x1, y1 = box
    span = y1 - y0
    for x in range(x0, x1):
        c_top = avg_col(px, x, top_sample[0], top_sample[1])
        c_bot = avg_col(px, x, bot_sample[0], bot_sample[1])
        for y in range(y0, y1):
            t = (y - y0) / span
            px[x, y] = (
                round(c_top[0] * (1 - t) + c_bot[0] * t),
                round(c_top[1] * (1 - t) + c_bot[1] * t),
                round(c_top[2] * (1 - t) + c_bot[2] * t),
            )


def build_bg():
    im = Image.open(SRC).convert('RGB')
    px = im.load()
    # 抹除旧数字 23（背后纯深蓝、无纹理）
    erase(px, (415, 808, 512, 888), (795, 807), (889, 901))
    # 抹除 5 条示意记录（面板有横向暗角，按列插值保留）
    erase(px, (205, 1178, 712, 1416), (1172, 1178), (1417, 1445))
    out = os.path.join(ASSETS, 'bg.png')
    im.save(out)
    print('wrote', out, im.size)


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
```

- [ ] **Step 2: 运行脚本**

Run: `python tools/build-assets.py`
Expected: 输出两行 `wrote .../assets/bg.png (941, 1672)` 与 `wrote .../assets/icon-record.png (...)`，`assets/` 下出现两个文件。

- [ ] **Step 3: 验证干净底图无残留**

用下面脚本裁出两处抹除区放大检查：

```python
from PIL import Image
im = Image.open('assets/bg.png')
im.crop((380, 780, 600, 900)).resize((660, 360)).save('assets/_check_num.png')
im.crop((190, 1140, 740, 1460)).resize((1100, 640)).save('assets/_check_rec.png')
```

Run: `python -c "<上面脚本>"` 后用图片查看器/浏览器打开两张 `_check_*.png`。
Expected: 数字区只剩 `剩余次数` 与 `/30`、原 `23` 消失且无色块/缝隙；记录面板只剩 `使用记录` 表头、5 行示意记录消失且面板背景平滑无补丁痕迹。
检查通过后删除临时文件：`python -c "import os;[os.remove('assets/'+f) for f in ('_check_num.png','_check_rec.png')]"`

- [ ] **Step 4: 提交**

```bash
git add tools/build-assets.py assets/bg.png assets/icon-record.png
git commit -m "build: 生成干净底图与记录图标"
```

---

## Task 2: 状态逻辑 state.js（TDD）

纯函数模块：次数/记录的初始值、使用一次的状态转移、日期时间格式化、localStorage 序列化。UMD 包装，浏览器与 Node 共用。

**Files:**
- Create: `js/state.js`
- Test: `tests/state.test.js`

- [ ] **Step 1: 写失败的测试**

创建 `tests/state.test.js`：

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../js/state.js');

test('formatDate 补零到 YYYY-MM-DD', () => {
  assert.equal(S.formatDate(new Date(2026, 4, 2)), '2026-05-02');
  assert.equal(S.formatDate(new Date(2026, 11, 25)), '2026-12-25');
});

test('formatTime 补零到 HH:MM', () => {
  assert.equal(S.formatTime(new Date(2026, 4, 2, 9, 5)), '09:05');
  assert.equal(S.formatTime(new Date(2026, 4, 2, 21, 45)), '21:45');
});

test('initialState 为 30 次、空记录', () => {
  assert.deepEqual(S.initialState(), { count: 30, records: [] });
});

test('applyUse 次数 -1 并在底部追加一条记录', () => {
  const next = S.applyUse(S.initialState(), new Date(2026, 4, 20, 14, 8));
  assert.equal(next.count, 29);
  assert.deepEqual(next.records, [{ date: '2026-05-20', time: '14:08' }]);
});

test('applyUse 多次调用按顺序追加到底部', () => {
  let s = S.initialState();
  s = S.applyUse(s, new Date(2026, 4, 1, 10, 0));
  s = S.applyUse(s, new Date(2026, 4, 2, 11, 0));
  assert.equal(s.count, 28);
  assert.equal(s.records.length, 2);
  assert.equal(s.records[1].date, '2026-05-02');
});

test('applyUse 在 count 为 0 时不做任何改动', () => {
  const zero = { count: 0, records: [{ date: '2026-05-01', time: '10:00' }] };
  const next = S.applyUse(zero, new Date());
  assert.equal(next.count, 0);
  assert.equal(next.records.length, 1);
});

test('applyUse 不修改入参', () => {
  const s = S.initialState();
  S.applyUse(s, new Date());
  assert.equal(s.count, 30);
  assert.equal(s.records.length, 0);
});

test('serialize/deserialize 往返一致', () => {
  const s = { count: 27, records: [{ date: '2026-05-20', time: '09:00' }] };
  assert.deepEqual(S.deserialize(S.serialize(s)), s);
});

test('deserialize 对坏输入回退到 initialState', () => {
  assert.deepEqual(S.deserialize(null), { count: 30, records: [] });
  assert.deepEqual(S.deserialize('not json'), { count: 30, records: [] });
  assert.deepEqual(S.deserialize('{"count":"x"}'), { count: 30, records: [] });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/state.test.js`
Expected: FAIL — 报 `Cannot find module '../js/state.js'`。

- [ ] **Step 3: 实现 state.js**

创建 `js/state.js`：

```js
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CardState = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var MAX_USES = 30;
  var STORAGE_KEY = 'script_kill_card_state';

  function pad2(n) { return String(n).padStart(2, '0'); }

  function formatDate(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function formatTime(d) {
    return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  function initialState() {
    return { count: MAX_USES, records: [] };
  }

  function applyUse(state, now) {
    if (state.count <= 0) return state;
    return {
      count: state.count - 1,
      records: state.records.concat([{ date: formatDate(now), time: formatTime(now) }])
    };
  }

  function serialize(state) {
    return JSON.stringify({ count: state.count, records: state.records });
  }

  function deserialize(json) {
    try {
      var s = JSON.parse(json);
      if (s && typeof s.count === 'number' && Array.isArray(s.records)) {
        return { count: s.count, records: s.records };
      }
    } catch (e) { /* 落到下面回退 */ }
    return initialState();
  }

  return {
    MAX_USES: MAX_USES, STORAGE_KEY: STORAGE_KEY,
    pad2: pad2, formatDate: formatDate, formatTime: formatTime,
    initialState: initialState, applyUse: applyUse,
    serialize: serialize, deserialize: deserialize
  };
});
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/state.test.js`
Expected: PASS — 9 个测试全部通过（`pass 9` / `fail 0`）。

- [ ] **Step 5: 提交**

```bash
git add js/state.js tests/state.test.js
git commit -m "feat: 体验卡状态逻辑 + 单测"
```

---

## Task 3: 页面骨架 index.html

**Files:**
- Create: `index.html`

- [ ] **Step 1: 写 HTML**

创建 `index.html`：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>剧本杀体验卡</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div class="stage">
    <img class="bg" src="assets/bg.png" alt="剧本杀体验卡">
    <div class="overlay">
      <div class="count" id="count"></div>
      <div class="records" id="records"></div>
      <button class="use-hit" id="useBtn" type="button" aria-label="使用"></button>
    </div>
  </div>
  <script src="js/state.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: 提交**

```bash
git add index.html
git commit -m "feat: 页面骨架"
```

---

## Task 4: 样式 style.css

锚定式定位：`.overlay` 与 `<img>` 完全重合并设 `container-type: inline-size`；位置用 `%`，字号/行高用 `cqw`（= 设计像素 ÷ 941 × 100）。

**Files:**
- Create: `css/style.css`

- [ ] **Step 1: 写 CSS**

创建 `css/style.css`：

```css
* { margin: 0; padding: 0; box-sizing: border-box; }

html, body { background: #0A0A12; min-height: 100%; }
body { display: flex; justify-content: center; }

.stage { position: relative; width: min(100vw, 480px); }

.bg { display: block; width: 100%; height: auto; }

.overlay {
  position: absolute;
  inset: 0;
  container-type: inline-size;
}

/* 剩余次数数字（替换原图 23；/30 属底图不动） */
.count {
  position: absolute;
  right: 46.227%;          /* 435/941，右对齐锚定 x506 */
  top: 50.718%;            /* 848/1672，数字竖直中心 */
  transform: translateY(-50%);
  font-family: Georgia, 'Times New Roman', 'Songti SC', serif;
  font-weight: 600;
  font-size: 7.86cqw;      /* 设计 ≈74px，字形高 52px */
  line-height: 1;
  white-space: nowrap;
  background: linear-gradient(180deg, #FFF6E2 0%, #F2DBAE 55%, #E4C088 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 0 0.5cqw rgba(255, 214, 150, 0.4);
}

/* 使用按钮透明热区 */
.use-hit {
  position: absolute;
  left: 30.818%;           /* 290/941 */
  top: 58.852%;            /* 984/1672 */
  width: 39.532%;          /* 372/941 */
  height: 5.024%;          /* 84/1672 */
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.use-hit:disabled { cursor: default; }

/* 使用记录列表 */
.records {
  position: absolute;
  left: 21.785%;           /* 205/941 */
  top: 70.694%;            /* 1182/1672 */
  width: 53.879%;          /* 507/941 */
  height: 16.029%;         /* 268/1672 */
  overflow-y: auto;
  scrollbar-width: none;
}
.records::-webkit-scrollbar { display: none; }

.record-row {
  display: flex;
  align-items: center;
  height: 4.78cqw;         /* 设计 45px */
  font-family: Georgia, 'Times New Roman', 'Songti SC', serif;
  font-size: 2.44cqw;      /* 设计 ≈23px */
  color: #C2AAA0;
  white-space: nowrap;
}
.record-row .r-icon {
  flex: none;
  width: 2.76cqw;          /* 设计 ≈26px */
  height: 2.76cqw;
  margin-left: 5.74cqw;    /* 设计 54px：图标左边缘 */
  object-fit: contain;
}
.record-row .r-date { margin-left: 3.08cqw; }   /* 设计 29px：图标到日期 */
.record-row .r-time { margin-left: auto; margin-right: 3.29cqw; } /* 设计 31px：距右边缘 */
```

- [ ] **Step 2: 提交**

```bash
git add css/style.css
git commit -m "feat: 布局与三元素样式"
```

---

## Task 5: 交互粘合 app.js

读 localStorage → 渲染 → 绑定点击 → 写回。业务规则全部来自 `state.js`。

**Files:**
- Create: `js/app.js`

- [ ] **Step 1: 写 app.js**

创建 `js/app.js`：

```js
(function () {
  'use strict';

  var S = window.CardState;
  var countEl = document.getElementById('count');
  var recordsEl = document.getElementById('records');
  var useBtn = document.getElementById('useBtn');

  var state = S.deserialize(localStorage.getItem(S.STORAGE_KEY));

  function save() {
    localStorage.setItem(S.STORAGE_KEY, S.serialize(state));
  }

  function renderCount() {
    countEl.textContent = String(state.count);
  }

  function renderRecords() {
    recordsEl.textContent = '';
    state.records.forEach(function (rec) {
      var row = document.createElement('div');
      row.className = 'record-row';

      var icon = document.createElement('img');
      icon.className = 'r-icon';
      icon.src = 'assets/icon-record.png';
      icon.alt = '';

      var date = document.createElement('span');
      date.className = 'r-date';
      date.textContent = rec.date;

      var time = document.createElement('span');
      time.className = 'r-time';
      time.textContent = rec.time;

      row.appendChild(icon);
      row.appendChild(date);
      row.appendChild(time);
      recordsEl.appendChild(row);
    });
    recordsEl.scrollTop = recordsEl.scrollHeight;
  }

  function renderButton() {
    useBtn.disabled = state.count <= 0;
  }

  function render() {
    renderCount();
    renderRecords();
    renderButton();
  }

  useBtn.addEventListener('click', function () {
    if (state.count <= 0) return;
    state = S.applyUse(state, new Date());
    save();
    render();
  });

  render();
})();
```

- [ ] **Step 2: 提交**

```bash
git add js/app.js
git commit -m "feat: 渲染与点击交互"
```

---

## Task 6: 浏览器验收与微调

资源、逻辑、页面齐全后，在浏览器实跑并按验收清单逐项确认；对必须靠肉眼的两处做微调。

**Files:**
- Modify（仅微调）: `css/style.css`

- [ ] **Step 1: 打开页面**

用浏览器打开 `index.html`（可直接双击；本项目用普通 `<script>`，file:// 即可运行）。

- [ ] **Step 2: 三元素对位检查**

把浏览器窗口分别调到约 360 / 390 / 430 / 桌面宽度。每个宽度下确认：剩余次数数字、按钮热区、记录面板与底图严丝合缝、不随屏宽错位。
对照 `reference/original-design.png`：数字应落在 `剩余次数` 与 `/30` 之间、与 `/30` 垂直对齐。

- [ ] **Step 3: 微调数字与图标（仅在偏差可见时）**

- 数字与 `/30` 垂直略有错位：调 `.count` 的 `transform`，例如 `translateY(calc(-50% + 0.6cqw))`；字形偏大/小：微调 `font-size`（7.86cqw 上下）。
- 记录图标偏大/小或不居中：微调 `.record-row .r-icon` 的 `width`/`height`/`margin-left`。
- 目标：与 `reference/original-design.png` 比对到肉眼无差。金色数字字体若与原稿不完全一致属已知风险（见设计文档 §11）。

- [ ] **Step 4: 跑功能验收清单**

逐项验证（对应设计文档 §13）：
- [ ] 初始：剩余次数显示 `30`，记录列表为空
- [ ] 点"使用"：数字变 `29`，列表底部新增一条当前真实日期时间，自动滚到底
- [ ] 连点多次：逐次 −1、逐条新增，不丢不重
- [ ] 记录超过可见行数（约 6 条以上）：面板内部滚动，不撑破版面
- [ ] 点到剩余次数为 `0`：再点按钮无任何响应
- [ ] 刷新页面：剩余次数与记录列表保持不变
- [ ] 清除该站点 localStorage 后刷新：回到初始 `30` / 空列表

- [ ] **Step 5: 提交微调（若 Step 3 改动了 CSS）**

```bash
git add css/style.css
git commit -m "style: 数字与图标对位微调"
```

---

## Self-Review 结论

- **Spec 覆盖：** 设计文档 §4 资源→Task1；§7.1 数字→Task4 `.count`+Task5 `renderCount`；§7.2 按钮→Task4 `.use-hit`+Task5 click；§7.3 记录→Task4 `.records`/`.record-row`+Task5 `renderRecords`；§8 交互→Task5；§9 初始状态/§10 持久化→Task2 `initialState`/`deserialize`+Task5；§13 验收→Task6。无遗漏。
- **类型/命名一致：** `state.js` 导出 `STORAGE_KEY/initialState/applyUse/serialize/deserialize` 与 `app.js`、`state.test.js` 引用一致；`count`/`records`/`record.date`/`record.time` 字段全程一致。
- **占位符：** 无 TBD/TODO；Step 3 的"微调"是针对栅格图必然存在的肉眼校准步骤，目标与可调项已写明，非占位。
