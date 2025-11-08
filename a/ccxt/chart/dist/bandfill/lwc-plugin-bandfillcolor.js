var u = Object.defineProperty;
var g = (d, i, t) => i in d ? u(d, i, { enumerable: !0, configurable: !0, writable: !0, value: t }) : d[i] = t;
var _ = (d, i, t) => (g(d, typeof i != "symbol" ? i + "" : i, t), t);
import { customSeriesDefaultOptions as w } from "lightweight-charts";
const f = {
  //* Define the default values for all the series options.
  ...w,
  highLineColor: "#049981",
  lowLineColor: "#F23645",
  areaColor: "rgba(41, 98, 255, 0.2)",
  highLineWidth: 2,
  lowLineWidth: 2
};
class v {
  constructor() {
    _(this, "_data", null);
    _(this, "_options", null);
  }
  draw(i, t) {
    i.useBitmapCoordinateSpace(
      (o) => this._drawImpl(o, t)
    );
  }
  update(i, t) {
    this._data = i, this._options = t;
  }
  _drawColoredAreas(i, t, o, l, n, r) {
    if (o >= l)
      return;
    let h = o, s = t[o].color || r.areaColor;
    for (let e = o + 1; e <= l; e++) {
      const a = e < l ? t[e].color || r.areaColor : s;
      (e === l || a !== s) && (this._drawSegment(i, t, h, e, s), e < l && (h = e, s = a));
    }
  }
  _drawSegment(i, t, o, l, n) {
    if (o >= l)
      return;
    const r = new Path2D(), h = t[o];
    r.moveTo(h.x, h.low);
    for (let e = o + 1; e < l; e++)
      r.lineTo(t[e].x, t[e].low);
    const s = t[l - 1];
    r.lineTo(s.x, s.high);
    for (let e = l - 2; e >= o; e--)
      r.lineTo(t[e].x, t[e].high);
    r.closePath(), i.fillStyle = n, i.fill(r);
  }
  _drawImpl(i, t) {
    if (this._data === null || this._data.bars.length === 0 || this._data.visibleRange === null || this._options === null)
      return;
    const o = this._options, l = this._data.bars.map((a) => {
      const c = a;
      return {
        x: a.x * i.horizontalPixelRatio,
        high: t(a.originalData.high) * i.verticalPixelRatio,
        low: t(a.originalData.low) * i.verticalPixelRatio,
        color: c.barColor
      };
    }), n = i.context;
    n.lineJoin = "round", this._drawColoredAreas(n, l, this._data.visibleRange.from, this._data.visibleRange.to, i, o);
    const r = new Path2D(), h = new Path2D(), s = l[this._data.visibleRange.from];
    r.moveTo(s.x, s.low);
    for (let a = this._data.visibleRange.from + 1; a < this._data.visibleRange.to; a++) {
      const c = l[a];
      r.lineTo(c.x, c.low);
    }
    const e = l[this._data.visibleRange.to - 1];
    h.moveTo(e.x, e.high);
    for (let a = this._data.visibleRange.to - 2; a >= this._data.visibleRange.from; a--) {
      const c = l[a];
      h.lineTo(c.x, c.high);
    }
    n.strokeStyle = o.lowLineColor, n.lineWidth = o.lowLineWidth * i.verticalPixelRatio, n.stroke(r), n.strokeStyle = o.highLineColor, n.lineWidth = o.highLineWidth * i.verticalPixelRatio, n.stroke(h);
  }
}
class m {
  constructor() {
    _(this, "_renderer");
    this._renderer = new v();
  }
  priceValueBuilder(i) {
    const t = (i.low + i.high) / 2;
    return [i.low, i.high, t];
  }
  isWhitespace(i) {
    return i.low === void 0 || i.high === void 0;
  }
  renderer() {
    return this._renderer;
  }
  update(i, t) {
    this._renderer.update(i, t);
  }
  defaultOptions() {
    return f;
  }
}
export {
  m as Bandfillcolor
};
