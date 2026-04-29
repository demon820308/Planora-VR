import JSZip from 'jszip'
import pannellumCssRaw from 'pannellum/build/pannellum.css?raw'
import pannellumJsRaw from 'pannellum/build/pannellum.js?raw'

export interface OfflineExportRoom {
  id: string
  name: string
  polygon: string
  panoramaFileName: string | null
  defaultYaw?: number
  defaultPitch?: number
  defaultHfov?: number
}

export interface OfflineExportPayload {
  siteName: string
  styleName: string
  rooms: OfflineExportRoom[]
  currentRoomId: string
  floorplan: {
    fileName: string
    blob: Blob
    viewBox: {
      width: number
      height: number
    }
  }
  sidebarFloorplan?: {
    fileName: string
    blob: Blob
  } | null
  panoramas: Array<{
    fileName: string
    blob: Blob
  }>
}

const offlineCss = `
:root {
  color-scheme: light;
  --bg: #f0ede8;
  --panel: rgba(255, 255, 255, 0.76);
  --panel-strong: rgba(255, 255, 255, 0.9);
  --line: #e3dacf;
  --text: #272523;
  --muted: #5f5954;
  --accent: #b8997a;
  --accent-strong: #8b6b4a;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100%;
  font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  background: var(--bg);
  color: var(--text);
}

button {
  font: inherit;
}

.page {
  min-height: 100vh;
  padding: 14px;
  display: grid;
  grid-template-columns: 286px minmax(0, 1fr);
  gap: 14px;
}

.sidebar {
  display: grid;
  gap: 10px;
  align-content: start;
}

.card {
  background: var(--panel);
  border: 1px solid var(--line);
  backdrop-filter: blur(10px);
  border-radius: 18px;
  box-shadow: 0 2px 10px rgba(17, 12, 10, 0.08);
  overflow: hidden;
}

.sidebar-header {
  padding: 12px 14px;
}

.sidebar-tag {
  display: inline-block;
  margin-bottom: 6px;
  padding: 3px 8px;
  border-radius: 999px;
  background: #ebe8e3;
  font-size: 10px;
  color: #6f6861;
}

.sidebar-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.01em;
}

.sidebar-desc {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--muted);
}

.section {
  padding: 12px 14px;
}

.section-title {
  margin: 0 0 10px;
  font-size: 13px;
  color: #5f5954;
}

.style-pill {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 14px;
  background: var(--accent);
  color: #fff;
  font-weight: 700;
  font-size: 13px;
}

.room-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.room-button {
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.72);
  color: var(--text);
  border-radius: 14px;
  min-height: 40px;
  padding: 9px 12px;
  text-align: center;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;
}

.room-button.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
  font-weight: 700;
}

.room-button:hover {
  transform: translateY(-1px);
  border-color: #c8b6a2;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.status-item {
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #f8f6f3;
  padding: 9px;
}

.status-item strong {
  display: block;
  font-size: 11px;
  margin-bottom: 4px;
  color: #7a736d;
}

.status-item span {
  display: block;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.2;
  color: #2f2c29;
}

.preview-button {
  width: 100%;
  min-height: 140px;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: zoom-in;
}

.preview-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #f5f1eb;
}

.preview-empty {
  padding: 18px;
  min-height: 140px;
  display: grid;
  place-items: center;
  text-align: center;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.6;
}

.main {
  display: grid;
  grid-template-rows: minmax(0, 1fr) clamp(220px, 30vh, 290px);
  gap: 14px;
  min-width: 0;
}

.viewer-card {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
}

.viewer-header {
  padding: 14px 16px 10px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: start;
}

.viewer-header h2 {
  margin: 0;
  font-size: 22px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.viewer-header p {
  margin: 4px 0 0;
  font-size: 10px;
  color: #6f6861;
}

.viewer-metrics {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid #e3ddd6;
  background: rgba(255, 255, 255, 0.72);
  color: #544f4a;
  font-size: 10px;
  font-weight: 600;
}

.viewer-header-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.viewer-fullscreen-button {
  border-radius: 999px;
  border: 1px solid #e3ddd6;
  background: rgba(255, 255, 255, 0.72);
  color: #544f4a;
  padding: 6px 10px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease;
}

.viewer-fullscreen-button:hover {
  background: rgba(255, 255, 255, 0.9);
  border-color: #d1c2b2;
  color: #3f3934;
}

.viewer-stage {
  position: relative;
  min-height: 0;
  margin: 0 16px 16px;
  border-radius: 20px;
  overflow: hidden;
  background: #ddd8d1;
  border: 1px solid #d8d1c9;
}

.viewer-surface {
  width: 100%;
  height: 100%;
  min-height: 380px;
}

.viewer-surface .pnlm-container {
  background: #ddd8d1;
}

.viewer-surface .pnlm-controls-container {
  top: 14px;
  left: 14px;
}

.viewer-surface .pnlm-controls {
  margin-top: 8px;
  background-color: transparent;
  border: 0;
  border-radius: 10px;
  box-shadow: none;
  backdrop-filter: none;
}

.viewer-surface .pnlm-control:hover {
  background-color: rgba(255, 248, 241, 0.44);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
}

.viewer-surface .pnlm-zoom-controls {
  width: 28px;
  height: 56px;
  overflow: hidden;
  background-color: rgba(255, 251, 247, 0.2);
  border: 1px solid rgba(85, 68, 52, 0.26);
  border-radius: 10px;
  box-shadow: 0 8px 18px rgba(19, 13, 10, 0.12);
  backdrop-filter: blur(10px);
}

.viewer-surface .pnlm-zoom-in,
.viewer-surface .pnlm-zoom-out {
  width: 28px;
  height: 28px;
}

.viewer-surface .pnlm-zoom-out {
  border-top-color: rgba(67, 52, 39, 0.12);
}

.viewer-surface .pnlm-zoom-in {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Cpath d='M14 8v12M8 14h12' stroke='rgba(255,255,255,0.5)' stroke-width='2.4' stroke-linecap='round'/%3E%3C/svg%3E");
  background-size: 28px 28px;
  background-repeat: no-repeat;
  background-position: center;
}

.viewer-surface .pnlm-zoom-out {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Cpath d='M8 14h12' stroke='rgba(255,255,255,0.5)' stroke-width='2.4' stroke-linecap='round'/%3E%3C/svg%3E");
  background-size: 28px 28px;
  background-repeat: no-repeat;
  background-position: center;
}

.viewer-surface .pnlm-zoom-in:hover {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Cpath d='M14 8v12M8 14h12' stroke='rgba(255,255,255,0.9)' stroke-width='2.4' stroke-linecap='round'/%3E%3C/svg%3E");
}

.viewer-surface .pnlm-zoom-out:hover {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Cpath d='M8 14h12' stroke='rgba(255,255,255,0.9)' stroke-width='2.4' stroke-linecap='round'/%3E%3C/svg%3E");
}

.viewer-fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  text-align: center;
  color: var(--muted);
  background: linear-gradient(135deg, rgba(255,255,255,0.35), rgba(245,238,229,0.92));
  z-index: 2;
  pointer-events: none;
}

.floorplan-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 10px 14px;
}

.floorplan-panel {
  min-width: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.floorplan-canvas {
  position: relative;
  height: min(100%, 250px);
  width: auto;
  max-width: 100%;
  aspect-ratio: 1333 / 1180;
}

.floorplan-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.hotspot {
  fill: rgba(184, 153, 122, 0.18);
  stroke: #b8997a;
  stroke-width: 4;
  cursor: pointer;
  transition: fill 0.18s ease;
}

.hotspot:hover {
  fill: rgba(184, 153, 122, 0.3);
}

.hotspot.current {
  fill: rgba(184, 153, 122, 0.44);
  stroke: #8b6b4a;
}

.legend {
  width: 170px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid #e3ddd6;
  background: rgba(255, 255, 255, 0.78);
}

.legend-header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.legend-title {
  margin: 0;
  font-size: 10px;
  color: #6f6861;
}

.legend-expand {
  border: 0;
  background: transparent;
  color: var(--accent-strong);
  padding: 0;
  cursor: pointer;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
}

.legend-expand:hover {
  color: #6f5437;
  text-decoration: underline;
}

.legend-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 6px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: #59544f;
}

.legend-marker {
  width: 11px;
  height: 11px;
  border-radius: 3px;
}

.legend-marker.current {
  background: #b8997a;
  border: 2px solid #8b6b4a;
}

.legend-marker.hotspot {
  background: rgba(184, 153, 122, 0.35);
  border: 1px dashed #b8997a;
}

.legend-marker.outline {
  background: transparent;
  border: 1px solid #b5aea6;
}

.legend-note {
  margin: 8px 0 0;
  font-size: 9px;
  line-height: 1.5;
  color: #6a635d;
}

.lightbox {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: none;
  place-items: center;
  padding: 24px;
  background: rgba(24, 20, 16, 0.58);
  backdrop-filter: blur(10px);
}

.lightbox.open {
  display: grid;
}

.lightbox-dialog {
  width: min(1200px, 100%);
  max-height: min(92vh, 980px);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  background: rgba(255, 252, 247, 0.98);
  border: 1px solid var(--line);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 28px 60px rgba(28, 22, 16, 0.22);
}

.lightbox-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 18px 20px;
  border-bottom: 1px solid #ece3d8;
}

.lightbox-header h3 {
  margin: 0;
  font-size: 20px;
  letter-spacing: -0.03em;
}

.lightbox-close {
  border-radius: 999px;
  border: 1px solid #d9cfc3;
  background: rgba(255, 255, 255, 0.92);
  color: #2f2925;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.lightbox-stage {
  padding: 14px 16px 16px;
  overflow: hidden;
  display: grid;
  place-items: center;
}

.lightbox-floorplan {
  width: min(100%, calc((92vh - 96px) * 1333 / 1180));
  max-width: min(1100px, 100%);
  max-height: calc(92vh - 96px);
  aspect-ratio: 1333 / 1180;
}

.lightbox-image {
  display: block;
  width: auto;
  max-width: 100%;
  max-height: calc(92vh - 96px);
  object-fit: contain;
  background: #f5f1eb;
}

@media (max-width: 1100px) {
  .page {
    grid-template-columns: 1fr;
    padding: 12px;
  }

  .main {
    grid-template-rows: minmax(0, 1fr) clamp(240px, 32vh, 320px);
  }

  .floorplan-card {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .page {
    padding: 12px;
  }

  .viewer-header {
    flex-direction: column;
  }

  .status-grid,
  .room-grid {
    grid-template-columns: 1fr;
  }

  .floorplan-canvas {
    width: min(360px, 100%);
    height: auto;
  }

  .lightbox {
    padding: 12px;
  }
}
`

const buildOfflineHtml = () => `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Planora Offline</title>
    <link rel="stylesheet" href="./vendor/pannellum.css" />
    <link rel="stylesheet" href="./assets/app.css" />
  </head>
  <body>
    <div id="app"></div>
    <script src="./vendor/pannellum.js"></script>
    <script src="./assets/app.js"></script>
  </body>
</html>
`

const buildOfflineAppScript = (config: Record<string, unknown>) => `
window.__PLANORA_OFFLINE_CONFIG__ = ${JSON.stringify(config, null, 2)};

(function () {
  const config = window.__PLANORA_OFFLINE_CONFIG__;
  const rooms = Array.isArray(config.rooms) ? config.rooms : [];
  const styleName = config.styleName || '当前风格';
  let currentRoomId = config.currentRoomId || rooms[0]?.id || '';
  let viewer = null;
  let metricsIntervalId = null;

  const state = {
    floorplanLightboxOpen: false,
    previewLightboxOpen: false
  };

  const app = document.getElementById('app');
  if (!app) return;

  const buildRoomButtonsMarkup = () => rooms.map(room => (
    '<button class="room-button ' + (room.id === currentRoomId ? 'active' : '') + '" data-room-id="' + escapeAttr(room.id) + '">' +
      escapeHtml(room.name) +
    '</button>'
  )).join('');

  const buildFloorplanHotspotsMarkup = () => rooms.map(room => (
    '<polygon class="hotspot ' + (room.id === currentRoomId ? 'current' : '') + '" data-room-id="' + escapeAttr(room.id) + '" points="' + escapeAttr(room.polygon) + '"></polygon>'
  )).join('');

  const render = () => {
    const currentRoom = rooms.find(room => room.id === currentRoomId) || rooms[0] || null;
    const roomButtonsMarkup = buildRoomButtonsMarkup();
    const floorplanHotspotsMarkup = buildFloorplanHotspotsMarkup();
    const sidebarPreviewMarkup = config.sidebarFloorplanPath
      ? '<button type="button" class="preview-button" data-action="preview-floorplan"><img class="preview-image" src="' + escapeAttr(config.sidebarFloorplanPath) + '" alt="展示户型图" /></button>'
      : '<div class="preview-empty"><p>当前离线包未包含展示户型图。</p></div>';
    const panoramaFallbackMarkup = (!currentRoom || !currentRoom.panoramaPath)
      ? '<div class="viewer-fallback"><div><strong>当前房间没有导入全景图</strong><p>请回到在线设置页重新导入后再导出离线包。</p></div></div>'
      : '';
    const previewLightboxMarkup = config.sidebarFloorplanPath
      ? '<img class="lightbox-image" src="' + escapeAttr(config.sidebarFloorplanPath) + '" alt="展示户型图" />'
      : '<div class="preview-empty"><p>当前离线包未包含展示户型图。</p></div>';

    app.innerHTML = [
      '<div class="page">',
      '  <aside class="sidebar">',
      '    <section class="card sidebar-header">',
      '      <span class="sidebar-tag">离线浏览包</span>',
      '      <h1 class="sidebar-title">' + escapeHtml(config.siteName || 'Planora') + '</h1>',
      '      <p class="sidebar-desc">用于本地 VR 预览、房间切换和户型图导航。</p>',
      '    </section>',
      '    <section class="card section">',
      '      <h3 class="section-title">风格</h3>',
      '      <div class="style-pill">' + escapeHtml(styleName) + '</div>',
      '    </section>',
      '    <section class="card section">',
      '      <h3 class="section-title">房间</h3>',
      '      <div class="room-grid">' + roomButtonsMarkup + '</div>',
      '    </section>',
      '    <section class="card section">',
      '      <h3 class="section-title">当前状态</h3>',
      '      <div class="status-grid">',
      '        <div class="status-item"><strong>当前房间</strong><span>' + escapeHtml(currentRoom ? currentRoom.name : '--') + '</span></div>',
      '        <div class="status-item"><strong>当前风格</strong><span>' + escapeHtml(styleName) + '</span></div>',
      '      </div>',
      '    </section>',
      '    <section class="card">',
      '      ' + sidebarPreviewMarkup,
      '    </section>',
      '  </aside>',
      '  <main class="main">',
      '    <section class="card viewer-card">',
      '      <div class="viewer-header">',
      '        <div>',
      '          <h2>' + escapeHtml(currentRoom ? currentRoom.name : '未选择房间') + '</h2>',
      '          <p>' + escapeHtml(styleName) + '</p>',
      '        </div>',
      '        <div class="viewer-header-actions">',
      '          <div class="viewer-metrics" id="viewer-metrics">yaw 0° / pitch 0° / fov 100°</div>',
      '          <button type="button" class="viewer-fullscreen-button" data-action="toggle-viewer-fullscreen">全屏</button>',
      '        </div>',
      '      </div>',
      '      <div class="viewer-stage">',
      '        <div id="viewer" class="viewer-surface"></div>',
      '        ' + panoramaFallbackMarkup,
      '      </div>',
      '    </section>',
      '    <section class="card floorplan-card">',
      '      <div class="floorplan-panel">',
      '        <div class="floorplan-canvas">',
      '          <svg class="floorplan-svg" viewBox="0 0 ' + config.floorplan.viewBox.width + ' ' + config.floorplan.viewBox.height + '" preserveAspectRatio="xMidYMid meet">',
      '            <image href="' + escapeAttr(config.floorplan.path) + '" x="0" y="0" width="' + config.floorplan.viewBox.width + '" height="' + config.floorplan.viewBox.height + '" preserveAspectRatio="none"></image>',
      floorplanHotspotsMarkup,
      '          </svg>',
      '        </div>',
      '      </div>',
      '      <div class="legend">',
      '        <div class="legend-header">',
      '          <h4 class="legend-title">线框索引</h4>',
      '          <button type="button" class="legend-expand" data-action="expand-floorplan">放大SVG热区图</button>',
      '        </div>',
      '        <ul class="legend-list">',
      '          <li class="legend-item"><span class="legend-marker current"></span><span>当前房间</span></li>',
      '          <li class="legend-item"><span class="legend-marker hotspot"></span><span>热点可达</span></li>',
      '          <li class="legend-item"><span class="legend-marker outline"></span><span>房间轮廓</span></li>',
      '        </ul>',
      '        <p class="legend-note">点击线框区域可切换房间。离线包仅包含当前导出时已经配置完成的内容。</p>',
      '      </div>',
      '    </section>',
      '  </main>',
      '</div>',
      '<div class="lightbox ' + (state.floorplanLightboxOpen ? 'open' : '') + '" id="floorplan-lightbox">',
      '  <div class="lightbox-dialog">',
      '    <div class="lightbox-header">',
      '      <h3>SVG热区图放大预览</h3>',
      '      <button type="button" class="lightbox-close" data-action="close-floorplan-lightbox">关闭</button>',
      '    </div>',
      '    <div class="lightbox-stage">',
      '      <div class="lightbox-floorplan">',
      '        <svg class="floorplan-svg" viewBox="0 0 ' + config.floorplan.viewBox.width + ' ' + config.floorplan.viewBox.height + '" preserveAspectRatio="xMidYMid meet">',
      '          <image href="' + escapeAttr(config.floorplan.path) + '" x="0" y="0" width="' + config.floorplan.viewBox.width + '" height="' + config.floorplan.viewBox.height + '" preserveAspectRatio="none"></image>',
      floorplanHotspotsMarkup,
      '        </svg>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</div>',
      '<div class="lightbox ' + (state.previewLightboxOpen ? 'open' : '') + '" id="preview-lightbox">',
      '  <div class="lightbox-dialog">',
      '    <div class="lightbox-header">',
      '      <h3>展示户型图放大预览</h3>',
      '      <button type="button" class="lightbox-close" data-action="close-preview-lightbox">关闭</button>',
      '    </div>',
      '    <div class="lightbox-stage">',
      '      ' + previewLightboxMarkup,
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');

    bindEvents();
    initViewer(currentRoom);
  };

  const bindEvents = () => {
    app.querySelectorAll('[data-room-id]').forEach(node => {
      node.addEventListener('click', event => {
        event.stopPropagation();
        currentRoomId = node.getAttribute('data-room-id');
        render();
      });
    });

    app.querySelectorAll('[data-action="expand-floorplan"]').forEach(node => {
      node.addEventListener('click', () => {
        state.floorplanLightboxOpen = true;
        render();
      });
    });

    app.querySelectorAll('[data-action="preview-floorplan"]').forEach(node => {
      node.addEventListener('click', () => {
        state.previewLightboxOpen = true;
        render();
      });
    });

    app.querySelectorAll('[data-action="toggle-viewer-fullscreen"]').forEach(node => {
      node.addEventListener('click', async () => {
        const stage = app.querySelector('.viewer-stage');
        if (!stage) return;

        try {
          if (document.fullscreenElement) {
            await document.exitFullscreen();
            return;
          }
          if (typeof stage.requestFullscreen === 'function') {
            await stage.requestFullscreen();
          }
        } catch (error) {}
      });
    });

    app.querySelectorAll('[data-action="close-floorplan-lightbox"]').forEach(node => {
      node.addEventListener('click', () => {
        state.floorplanLightboxOpen = false;
        render();
      });
    });

    app.querySelectorAll('[data-action="close-preview-lightbox"]').forEach(node => {
      node.addEventListener('click', () => {
        state.previewLightboxOpen = false;
        render();
      });
    });

    document.querySelectorAll('#floorplan-lightbox, #preview-lightbox').forEach(node => {
      node.addEventListener('click', event => {
        if (event.target === node) {
          state.floorplanLightboxOpen = false;
          state.previewLightboxOpen = false;
          render();
        }
      });
    });
  };

  const initViewer = room => {
    const target = document.getElementById('viewer');
    const metrics = document.getElementById('viewer-metrics');
    if (!target) return;

    if (metricsIntervalId) {
      window.clearInterval(metricsIntervalId);
      metricsIntervalId = null;
    }

    if (viewer) {
      try { viewer.destroy(); } catch (error) {}
      viewer = null;
    }

    if (!room || !room.panoramaPath || !window.pannellum) {
      if (metrics) metrics.textContent = 'yaw 0° / pitch 0° / fov 100°';
      return;
    }

    viewer = window.pannellum.viewer(target, {
      type: 'equirectangular',
      panorama: room.panoramaPath,
      autoLoad: true,
      showControls: true,
      showFullscreenCtrl: false,
      compass: false,
      yaw: room.defaultYaw || 0,
      pitch: room.defaultPitch || 0,
      hfov: room.defaultHfov || 100
    });

    const sync = () => {
      if (!viewer || !metrics) return;
      const yaw = typeof viewer.getYaw === 'function' ? Math.round(viewer.getYaw()) : 0;
      const pitch = typeof viewer.getPitch === 'function' ? Math.round(viewer.getPitch()) : 0;
      const hfov = typeof viewer.getHfov === 'function' ? Math.round(viewer.getHfov()) : 100;
      metrics.textContent = 'yaw ' + yaw + '° / pitch ' + pitch + '° / fov ' + hfov + '°';
    };

    viewer.on('load', sync);
    viewer.on('animatefinished', sync);
    window.setTimeout(sync, 120);
    metricsIntervalId = window.setInterval(sync, 300);
  };

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  render();
})();
`

const dataUrlToBlob = async (dataUrl: string) => {
  const response = await fetch(dataUrl)
  return response.blob()
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('Failed to encode blob as data URL'))
    reader.readAsDataURL(blob)
  })

const sanitizeZipFileName = (value: string) =>
  value.replace(/[\\\\/:*?"<>|]/g, '-').trim() || 'current-style'

export const buildOfflinePackageName = (styleName: string) =>
  `planora-${sanitizeZipFileName(styleName)}-offline.zip`

export const exportOfflinePackage = async (payload: OfflineExportPayload) => {
  const zip = new JSZip()

  const floorplanDataUrl = await blobToDataUrl(payload.floorplan.blob)
  const sidebarFloorplanDataUrl = payload.sidebarFloorplan
    ? await blobToDataUrl(payload.sidebarFloorplan.blob)
    : null
  const panoramaDataUrlMap = new Map<string, string>()

  await Promise.all(
    payload.panoramas.map(async panorama => {
      panoramaDataUrlMap.set(panorama.fileName, await blobToDataUrl(panorama.blob))
    })
  )

  const config = {
    siteName: payload.siteName,
    styleName: payload.styleName,
    currentRoomId: payload.currentRoomId,
    rooms: payload.rooms.map(room => ({
      id: room.id,
      name: room.name,
      polygon: room.polygon,
      panoramaPath: room.panoramaFileName
        ? panoramaDataUrlMap.get(room.panoramaFileName) || null
        : null,
      defaultYaw: room.defaultYaw ?? 0,
      defaultPitch: room.defaultPitch ?? 0,
      defaultHfov: room.defaultHfov ?? 100
    })),
    floorplan: {
      path: floorplanDataUrl,
      viewBox: payload.floorplan.viewBox
    },
    sidebarFloorplanPath: sidebarFloorplanDataUrl
  }

  zip.file('index.html', buildOfflineHtml())
  zip.file('assets/app.css', offlineCss)
  zip.file('assets/app.js', buildOfflineAppScript(config))
  zip.file('vendor/pannellum.css', pannellumCssRaw)
  zip.file('vendor/pannellum.js', pannellumJsRaw)

  const blob = await zip.generateAsync({ type: 'blob' })
  const downloadUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = downloadUrl
  anchor.download = buildOfflinePackageName(payload.styleName)
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(downloadUrl)
}

export const convertDataUrlToNamedBlob = async (dataUrl: string, fallbackFileName: string) => {
  const blob = await dataUrlToBlob(dataUrl)
  return {
    fileName: fallbackFileName,
    blob
  }
}
