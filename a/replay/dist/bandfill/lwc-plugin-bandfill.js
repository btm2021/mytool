var h = Object.defineProperty;
var _ = (s, t, o) => t in s ? h(s, t, { enumerable: !0, configurable: !0, writable: !0, value: o }) : s[t] = o;
var p = (s, t, o) => (_(s, typeof t != "symbol" ? t + "" : t, o), o);
class d {
  constructor(t) {
    p(this, "_options");
    p(this, "_points", []);
    p(this, "_chart", null);
    // renderer tách riêng để dùng trong paneView.renderer()
    p(this, "_renderer", {
      draw: (t) => {
        this._points.length < 2 || !this._chart || t.useBitmapCoordinateSpace((o) => {
          const e = o.context, a = this._chart.timeScale();
          e.save(), e.beginPath();
          for (let r = 0; r < this._points.length; r++) {
            const c = this._points[r], n = a.timeToCoordinate(c.time), l = this._options.upperSeries.priceToCoordinate(c.upper);
            n == null || l == null || (r === 0 ? e.moveTo(n, l) : e.lineTo(n, l));
          }
          for (let r = this._points.length - 1; r >= 0; r--) {
            const c = this._points[r], n = a.timeToCoordinate(c.time), l = this._options.lowerSeries.priceToCoordinate(c.lower);
            n == null || l == null || e.lineTo(n, l);
          }
          e.closePath();
          const i = e.createLinearGradient(0, 0, 0, e.canvas.height);
          i.addColorStop(0, this._options.topColor), i.addColorStop(1, this._options.bottomColor), e.fillStyle = i, e.fill(), e.restore();
        });
      }
    });
    p(this, "_paneView", {
      // renderer: function trả về renderer (đúng kiểu mới)
      renderer: () => this._renderer
    });
    this._options = {
      upperSeries: t.upperSeries,
      lowerSeries: t.lowerSeries,
      topColor: t.topColor ?? "rgba(0,150,255,0.30)",
      bottomColor: t.bottomColor ?? "rgba(0,150,255,0.00)"
    }, this._recompute();
  }
  // CHỮ KÝ CHUẨN (không đổi generic)
  attached(t) {
    this._chart = t.chart, this._recompute();
  }
  updateAllViews() {
    this._recompute();
  }
  paneViews() {
    return [this._paneView];
  }
  _recompute() {
    const t = this._options.upperSeries.data(), o = this._options.lowerSeries.data(), e = Math.min(t.length, o.length), a = [];
    for (let i = 0; i < e; i++)
      t[i].time === o[i].time && a.push({ time: t[i].time, upper: t[i].value, lower: o[i].value });
    this._points = a;
  }
}
export {
  d as BandFill
};
