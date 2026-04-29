# VR 全景房间浏览系统 - 产品需求文档 (PRD)

## 1. 项目概述

**项目名称：** VR Panorama Viewer
**项目路径：** `/Users/demon/vr-panorama-viewer`
**技术栈：** Vite + React + TypeScript + Pannellum
**端口：** 5174
**访问地址：** `http://192.168.50.92:5174`

### 核心功能
一个沉浸式 VR 全景房间浏览系统，用户可以在 11 个房间之间切换，体验不同装修风格（白模、意式、法式、现代、原木），并通过户型图进行快速导航。

---

## 2. 功能列表

### 2.1 风格切换
- **5 种风格：** 白模、意式风、法式风、现代风、原木风
- 切换风格后，全景图同步更新
- 当前选中风格高亮显示

### 2.2 房间切换
- **11 个房间：** 主卧A、主卧B、主卫、次卧A、次卧B、公卫、厨房、客厅、餐厅、走廊、阳台
- 每个房间对应独立的全景图资源
- 房间按钮支持滚动选择

### 2.3 全景查看器
- 360° 全景图浏览（使用 Pannellum）
- 支持鼠标拖拽/触摸滑动旋转视角
- 显示当前 yaw/pitch/fov 角度
- 加载状态与错误状态展示

### 2.4 户型图导航
- SVG 户型图展示
- 当前房间高亮标注
- 热点房间标记（可跳转）
- 房间轮廓多边形显示

### 2.5 状态面板
- 显示当前房间名称
- 显示当前风格
- 显示房间尺寸
- 显示全景图加载状态（正常/缺失）

### 2.6 图例说明
- 标注当前房间
- 标注热点可达房间
- 标注房间轮廓

---

## 3. 数据结构

### 房间数据 (`src/data/rooms.ts`)
```typescript
interface Room {
  id: string;              // 房间唯一标识，全局统一
  name: string;             // 中文显示名
  size: { width: number; depth: number }; // 米
  polygon: [number, number][]; // 户型图坐标点
  hotpots: { yaw: number; pitch: number; targetRoomId: string }[];
  panoramaMissing?: boolean; // 是否缺失全景图
}
```

### 风格数据 (`src/data/styles.ts`)
```typescript
interface Style {
  id: string;
  name: string;
  prefix: string; // 全景图路径前缀
  color: string; // UI 主题色
}
```

### 风格列表
| ID | 名称 | 路径前缀 | 主题色 |
|---|---|---|---|
| white | 白模 | white | #9CA3AF |
| italian | 意式风 | italian | #92400E |
| french | 法式风 | french | #7C3AED |
| modern | 现代风 | modern | #1E40AF |
| wood | 原木风 | wood | #92400E |

### 房间列表
| ID | 名称 |
|---|---|
| master-bedroom-a | 主卧A |
| master-bedroom-b | 主卧B |
| master-bathroom | 主卫 |
| second-bedroom-a | 次卧A |
| second-bedroom-b | 次卧B |
| bathroom-public | 公卫 |
| kitchen | 厨房 |
| living-room | 客厅 |
| dining-room | 餐厅 |
| corridor | 走廊 |
| balcony | 阳台 |

---

## 4. 组件结构

```
src/
├── main.tsx                    # 入口
├── App.tsx                     # 主组件，状态管理
├── styles.css                  # 全局样式
├── types/
│   └── index.ts               # TypeScript 接口定义
├── data/
│   ├── rooms.ts               # 房间数据
│   └── styles.ts              # 风格数据
├── utils/
│   ├── panoramaPath.ts        # 全景图路径生成
│   ├── preloadImages.ts        # 图片预加载
│   └── floorplanAuto.ts       # 户型图自动分析
└── components/
    ├── Layout/
    │   ├── AppShell.tsx       # 整体布局容器
    │   └── AppShell.css
    ├── Sidebar/
    │   ├── Sidebar.tsx        # 侧边栏主组件
    │   ├── StyleSelector.tsx   # 风格选择器
    │   └── RoomSelector.tsx   # 房间选择器
    ├── Panorama/
    │   ├── PanoramaViewer.tsx  # 全景查看器主组件
    │   ├── PanoramaHeader.tsx  # 全景窗口头部信息
    │   └── PanoramaFallback.tsx # 加载/错误状态
    └── Floorplan/
        ├── FloorplanMap.tsx   # 户型图主组件
        └── MiniLegend.tsx     # 迷你图例
```

---

## 5. 页面布局

```
┌─────────────────────────────────────────────────────────────┐
│  品牌标题                    dEmOn mUsIc (或项目标题)         │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│   侧边栏     │              全景查看器                       │
│   - 风格选择  │              - Pannellum 全景图              │
│   - 房间选择  │              - 头部信息（房间名/角度）         │
│   - 状态面板  │              - 加载状态/错误提示             │
│              │                                              │
│              ├──────────────────────────────────────────────┤
│              │              户型图 + 图例                  │
│              │              - SVG 户型图                    │
│              │              - 当前房间高亮                   │
│              │              - 热点标记                      │
└──────────────┴──────────────────────────────────────────────┘
```

---

## 6. 资源路径

### 图片文件夹结构

```
public/
└── panoramas/
    ├── white/          # 白模风格  (11 张)
    ├── italian/        # 意式风格  (11 张)
    ├── french/         # 法式风格  (11 张)
    ├── modern/         # 现代风格  (11 张)
    ├── wood/           # 原木风格  (11 张)
    └── placeholder/    # 占位图
        └── missing-panorama.svg
```

### 图片命名规则

```
{房间ID}.{jpg|png}
```

| 规则 | 说明 |
|------|------|
| 全部小写 | `master-bedroom-a.jpg` |
| 用 `-` 连字符 | 不是下划线，不是空格 |
| 扩展名统一 | 要么全 `.jpg`，要么全 `.png` |

### 源文件夹（可选自定义）

支持配置自定义源文件夹路径，配置后系统从该路径读取图片：

```
E:/panorama-source/
├── white/              ← 全景图 (11张)
├── italian/            ← 全景图 (11张)
├── french/             ← 全景图 (11张)
├── modern/             ← 全景图 (11张)
├── wood/               ← 全景图 (11张)
└── floorplan.jpg       ← 白底户型图 (1张)

总计：55 张全景图 + 1 张户型图
```

---

## 7. 热区配置

### 白底户型图的作用

白底户型图是 **测试页的输入图片**，用于自动识别房间热区。

**工作流程：**

```
白底户型图 (输入)
      ↓
┌────────────────────────────────────┐
│  TestFloorplanLab 图像分析算法      │
│  - BFS 洪水填充                    │
│  - 识别白色封闭区域                │
│  - 输出房间多边形坐标              │
└────────────────────────────────────┘
      ↓
热区配置数据 (输出)
      ↓
保存到 localStorage
      ↓
首页户型图导航使用
```

**加载方式：**
- 方便管理：放在 `E:/panorama-source/floorplan.jpg`
- 实际加载：测试页通过「上传」按钮选择该文件

**简单说：**
- 白底户型图是用来**自动生成**热区多边形坐标的原材料
- 首页实际用的是算法输出的**热区坐标数据**，不是原始图片
- 配置完成后白底户型图不需要保留在项目中

### 测试页内置示例

测试页内置了 `src/image/test.png` 等示例图，用于演示和调试。

---

## 8. 依赖清单

```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "pannellum": "^2.5.x"
  },
  "devDependencies": {
    "vite": "^5.x",
    "typescript": "^5.x",
    "@types/react": "^18.x",
    "@types/react-dom": "^18.x"
  }
}
```

安装命令：`npm install`

启动命令：`npm run dev`

---

## 9. 待优化项

- [ ] 全景图资源补充（目前大部分房间标记为 missing）
- [ ] 热点跳转功能实现（hotpots 数据已定义）
- [ ] 全景图切换过渡动画
- [ ] 响应式布局优化（适配移动端）
- [ ] 自定义源文件夹配置功能

---

## 10. 版本历史

| 版本 | 日期 | 说明 |
|---|---|---|
| 1.0.0 | 2026-04-27 | 初始版本，重建完整项目结构 |
| 2.0.0 | 2026-04-27 | 统一房间 ID（11个），新增主卫，完善图片命名规范，补充热区配置说明 |
