var c = Object.defineProperty;
var h = (r, e, t) => e in r ? c(r, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : r[e] = t;
var l = (r, e, t) => (h(r, typeof e != "symbol" ? e + "" : e, t), t);
class b {
  constructor() {
    l(this, "_data", null);
    l(this, "_options", null);
  }
  draw(e, t) {
    e.useBitmapCoordinateSpace(
      (o) => this._drawImpl(o, t)
    );
  }
  update(e, t) {
    this._data = e, this._options = t;
  }
  _drawImpl(e, t) {
    if (this._data === null || this._data.bars.length === 0 || this._data.visibleRange === null || this._options === null)
      return;
    const o = this._data.bars.map((i) => ({
      x: i.x * e.horizontalPixelRatio,
      upper: t(i.originalData.upper) * e.verticalPixelRatio,
      lower: t(i.originalData.lower) * e.verticalPixelRatio
    })), a = e.context, d = this._options.topColor ?? "rgba(0,150,255,0.3)", u = this._options.bottomColor ?? "rgba(0,150,255,0.0)";
    a.beginPath();
    const p = o[this._data.visibleRange.from];
    a.moveTo(p.x, p.upper);
    for (let i = this._data.visibleRange.from + 1; i < this._data.visibleRange.to; i++) {
      const s = o[i];
      a.lineTo(s.x, s.upper);
    }
    for (let i = this._data.visibleRange.to - 1; i >= this._data.visibleRange.from; i--) {
      const s = o[i];
      a.lineTo(s.x, s.lower);
    }
    a.closePath();
    const n = a.createLinearGradient(
      0,
      0,
      0,
      e.bitmapSize.height
    );
    n.addColorStop(0, d), n.addColorStop(1, u), a.fillStyle = n, a.fill();
  }
}
class _ {
  constructor() {
    l(this, "_renderer");
    this._renderer = new b();
  }
  update(e, t) {
    this._renderer.update(e, t);
  }
  renderer() {
    return this._renderer;
  }
  priceValueBuilder(e) {
    return [e.upper, e.lower];
  }
  isWhitespace(e) {
    return e.upper === void 0;
  }
  defaultOptions() {
    return {
      topColor: "rgba(0,150,255,0.3)",
      bottomColor: "rgba(0,150,255,0.0)",
      lastValueVisible: !1,
      title: "",
      visible: !0,
      priceScaleId: "right",
      priceLineVisible: !1,
      priceLineSource: 0,
      priceLineWidth: 1,
      priceLineStyle: 2,
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01
      },
      baseLineVisible: !1,
      baseLineColor: "#B2B5BE",
      baseLineWidth: 1,
      baseLineStyle: 0
    };
  }
}
class g extends _ {
  constructor() {
    super();
  }
}
export {
  g as BandSeries
};
