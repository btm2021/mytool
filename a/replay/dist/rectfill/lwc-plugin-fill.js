var x = Object.defineProperty;
var w = (i, e, t) => e in i ? x(i, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : i[e] = t;
var r = (i, e, t) => (w(i, typeof e != "symbol" ? e + "" : e, t), t);
import { isBusinessDay as m } from "lightweight-charts";
function c(i, e, t) {
  const s = Math.round(t * i), o = Math.round(t * e);
  return {
    position: Math.min(s, o),
    length: Math.abs(o - s) + 1
  };
}
class f {
  constructor(e, t, s, o) {
    r(this, "_p1");
    r(this, "_p2");
    r(this, "_fillColor");
    r(this, "_vertical", !1);
    this._p1 = e, this._p2 = t, this._fillColor = s, this._vertical = o;
  }
  draw(e) {
    e.useBitmapCoordinateSpace((t) => {
      if (this._p1 === null || this._p2 === null)
        return;
      const s = t.context;
      s.globalAlpha = 0.5;
      const o = c(
        this._p1,
        this._p2,
        this._vertical ? t.verticalPixelRatio : t.horizontalPixelRatio
      );
      s.fillStyle = this._fillColor, this._vertical ? s.fillRect(0, o.position, 15, o.length) : s.fillRect(o.position, 0, o.length, 15);
    });
  }
}
class u {
  constructor(e, t) {
    r(this, "_source");
    r(this, "_p1", null);
    r(this, "_p2", null);
    r(this, "_vertical", !1);
    this._source = e, this._vertical = t;
  }
  update() {
    [this._p1, this._p2] = this.getPoints();
  }
  renderer() {
    return new f(
      this._p1,
      this._p2,
      this._source.options.fillColor,
      this._vertical
    );
  }
  zOrder() {
    return "bottom";
  }
}
class V extends u {
  getPoints() {
    const e = this._source.series, t = e.priceToCoordinate(this._source.p1.price), s = e.priceToCoordinate(this._source.p2.price);
    return [t, s];
  }
}
class C extends u {
  getPoints() {
    const e = this._source.chart.timeScale(), t = e.timeToCoordinate(this._source.p1.time), s = e.timeToCoordinate(this._source.p2.time);
    return [t, s];
  }
}
class d {
  constructor(e, t) {
    r(this, "_source");
    r(this, "_p");
    r(this, "_pos", null);
    this._source = e, this._p = t;
  }
  coordinate() {
    return this._pos ?? -1;
  }
  visible() {
    return this._source.options.showLabels;
  }
  tickVisible() {
    return this._source.options.showLabels;
  }
  textColor() {
    return this._source.options.labelTextColor;
  }
  backColor() {
    return this._source.options.labelColor;
  }
  movePoint(e) {
    this._p = e, this.update();
  }
}
class h extends d {
  update() {
    const e = this._source.chart.timeScale();
    this._pos = e.timeToCoordinate(this._p.time);
  }
  text() {
    return this._source.options.timeLabelFormatter(this._p.time);
  }
}
class p extends d {
  update() {
    const e = this._source.series;
    this._pos = e.priceToCoordinate(this._p.price);
  }
  text() {
    return this._source.options.priceLabelFormatter(this._p.price);
  }
}
const A = {
  //* Define the default values for all the primitive options.
  fillColor: "rgba(200, 50, 100, 0.75)",
  labelColor: "rgba(200, 50, 100, 1)",
  labelTextColor: "white",
  showLabels: !0,
  priceLabelFormatter: (i) => i.toFixed(2),
  timeLabelFormatter: (i) => typeof i == "string" ? i : (m(i) ? new Date(i.year, i.month, i.day) : new Date(i * 1e3)).toLocaleDateString()
};
class P {
  constructor(e, t, s) {
    r(this, "_p1");
    r(this, "_p2");
    r(this, "_fillColor");
    this._p1 = e, this._p2 = t, this._fillColor = s;
  }
  draw(e) {
    e.useBitmapCoordinateSpace((t) => {
      if (this._p1.x === null || this._p1.y === null || this._p2.x === null || this._p2.y === null)
        return;
      const s = t.context, o = c(
        this._p1.x,
        this._p2.x,
        t.horizontalPixelRatio
      ), n = c(
        this._p1.y,
        this._p2.y,
        t.verticalPixelRatio
      );
      s.fillStyle = this._fillColor, s.fillRect(
        o.position,
        n.position,
        o.length,
        n.length
      );
    });
  }
}
class b {
  constructor(e) {
    r(this, "_source");
    r(this, "_p1", { x: null, y: null });
    r(this, "_p2", { x: null, y: null });
    this._source = e;
  }
  update() {
    const e = this._source.series, t = e.priceToCoordinate(this._source.p1.price), s = e.priceToCoordinate(this._source.p2.price), o = this._source.chart.timeScale(), n = o.timeToCoordinate(this._source.p1.time), a = o.timeToCoordinate(this._source.p2.time);
    this._p1 = { x: n, y: t }, this._p2 = { x: a, y: s };
  }
  renderer() {
    return new P(
      this._p1,
      this._p2,
      this._source.options.fillColor
    );
  }
}
function _(i) {
  if (i === void 0)
    throw new Error("Value is undefined");
  return i;
}
class g {
  constructor() {
    r(this, "_chart");
    r(this, "_series");
    r(this, "_requestUpdate");
  }
  requestUpdate() {
    this._requestUpdate && this._requestUpdate();
  }
  attached({
    chart: e,
    series: t,
    requestUpdate: s
  }) {
    this._chart = e, this._series = t, this._series.subscribeDataChanged(this._fireDataUpdated), this._requestUpdate = s, this.requestUpdate();
  }
  detached() {
    this._chart = void 0, this._series = void 0, this._requestUpdate = void 0;
  }
  get chart() {
    return _(this._chart);
  }
  get series() {
    return _(this._series);
  }
  _fireDataUpdated(e) {
    this.dataUpdated && this.dataUpdated(e);
  }
}
class v extends g {
  constructor(t, s, o = {}) {
    super();
    r(this, "_options");
    r(this, "_p1");
    r(this, "_p2");
    r(this, "_paneViews");
    r(this, "_timeAxisViews");
    r(this, "_priceAxisViews");
    r(this, "_priceAxisPaneViews");
    r(this, "_timeAxisPaneViews");
    this._p1 = t, this._p2 = s, this._options = {
      ...A,
      ...o
    }, this._paneViews = [new b(this)], this._timeAxisViews = [
      new h(this, t),
      new h(this, s)
    ], this._priceAxisViews = [
      new p(this, t),
      new p(this, s)
    ], this._priceAxisPaneViews = [new V(this, !0)], this._timeAxisPaneViews = [new C(this, !1)];
  }
  updateAllViews() {
    this._paneViews.forEach((t) => t.update()), this._timeAxisViews.forEach((t) => t.update()), this._priceAxisViews.forEach((t) => t.update()), this._priceAxisPaneViews.forEach((t) => t.update()), this._timeAxisPaneViews.forEach((t) => t.update());
  }
  priceAxisViews() {
    return this._priceAxisViews;
  }
  timeAxisViews() {
    return this._timeAxisViews;
  }
  paneViews() {
    return this._paneViews;
  }
  priceAxisPaneViews() {
    return this._priceAxisPaneViews;
  }
  timeAxisPaneViews() {
    return this._timeAxisPaneViews;
  }
  autoscaleInfo(t, s) {
    return this._timeCurrentlyVisible(this.p1.time, t, s) || this._timeCurrentlyVisible(this.p2.time, t, s) ? {
      priceRange: {
        minValue: Math.min(this.p1.price, this.p2.price),
        maxValue: Math.max(this.p1.price, this.p2.price)
      }
    } : null;
  }
  dataUpdated(t) {
  }
  _timeCurrentlyVisible(t, s, o) {
    const n = this.chart.timeScale(), a = n.timeToCoordinate(t);
    if (a === null)
      return !1;
    const l = n.coordinateToLogical(a);
    return l === null ? !1 : l <= o && l >= s;
  }
  get options() {
    return this._options;
  }
  applyOptions(t) {
    this._options = { ...this._options, ...t }, this.requestUpdate();
  }
  get p1() {
    return this._p1;
  }
  get p2() {
    return this._p2;
  }
}
export {
  v as FillRect
};
