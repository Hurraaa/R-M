// Geliştirici performans paneli. renderer.info + kare zamanlamalarını okur.
// Davranışı değiştirmez; sadece ölçüm. 'P' tuşu veya URL'de #perf ile açılır.
// Çoklu render-pass (portal RTT + composer) için renderer.info.autoReset=false
// gerektirir; her kare başında reset() PortalGame tarafından çağrılır.
export class PerfMonitor {
  constructor() {
    this.enabled = location.hash.includes("perf");
    this.logicMs = 0;
    this.portalMs = 0;
    this.renderMs = 0;
    this.frameMs = 16.7;
    this.fps = 60;
    this._lastT = performance.now();
    this._acc = 0;
    this._frames = 0;
    this._snap = null;
    this.el = null;
    this._ensureEl();
  }

  _ensureEl() {
    if (this.el || typeof document === "undefined") return;
    const el = document.createElement("div");
    el.id = "perf-panel";
    el.style.cssText =
      "position:fixed;top:8px;left:8px;z-index:9999;font:11px/1.5 ui-monospace,Menlo,Consolas,monospace;" +
      "color:#9ff0c0;background:rgba(8,14,12,.82);border:1px solid #2f6f55;border-radius:8px;" +
      "padding:8px 10px;white-space:pre;pointer-events:none;text-shadow:0 0 4px #000;display:none;";
    (document.body || document.documentElement).appendChild(el);
    this.el = el;
    if (this.enabled) el.style.display = "block";
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.el) this.el.style.display = this.enabled ? "block" : "none";
  }

  // PortalGame her karede çağırır
  sample(logicMs, portalMs, renderMs, renderer, portals) {
    const now = performance.now();
    const frameMs = now - this._lastT;
    this._lastT = now;
    // üstel ortalama (yumuşak)
    const k = 0.1;
    this.frameMs += (frameMs - this.frameMs) * k;
    this.logicMs += (logicMs - this.logicMs) * k;
    this.portalMs += (portalMs - this.portalMs) * k;
    this.renderMs += (renderMs - this.renderMs) * k;
    this.fps = 1000 / Math.max(0.01, this.frameMs);

    this._acc += frameMs;
    this._frames++;
    if (!this.enabled || !this.el) return;
    if (this._acc < 250) return; // ~4 Hz panel güncelle
    this._acc = 0;

    const info = renderer.info;
    const rttW = portals?.a?.view?.width ?? 0;
    const rttH = portals?.a?.view?.height ?? 0;
    const both = portals?.a?.active && portals?.b?.active;
    this.el.textContent =
      `FPS        ${this.fps.toFixed(0)}  (${this.frameMs.toFixed(1)} ms)\n` +
      `logic/fizik ${this.logicMs.toFixed(2)} ms\n` +
      `portal RTT  ${this.portalMs.toFixed(2)} ms  ${both ? `${rttW}x${rttH}` : "(kapalı)"}\n` +
      `render+bloom ${this.renderMs.toFixed(2)} ms\n` +
      `draw calls  ${info.render.calls}\n` +
      `triangles   ${(info.render.triangles / 1000).toFixed(0)}k\n` +
      `geometriler ${info.memory.geometries}\n` +
      `texture'lar ${info.memory.textures}\n` +
      `programlar  ${info.programs ? info.programs.length : "?"}`;
  }
}
