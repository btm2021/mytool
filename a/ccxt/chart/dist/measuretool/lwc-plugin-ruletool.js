var B = Object.defineProperty;
var M = (n, t, e) => t in n ? B(n, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : n[t] = e;
var o = (n, t, e) => (M(n, typeof t != "symbol" ? t + "" : t, e), e);
import { isBusinessDay as $ } from "lightweight-charts";
function w(n, t, e) {
  const i = Math.round(e * n), s = Math.round(e * t);
  return {
    position: Math.min(i, s),
    length: Math.abs(s - i) + 1
  };
}
class z {
  constructor(t, e, i, s) {
    o(this, "_p1");
    o(this, "_p2");
    o(this, "_fillColor");
    o(this, "_vertical", !1);
    this._p1 = t, this._p2 = e, this._fillColor = i, this._vertical = s;
  }
  draw(t) {
    t.useBitmapCoordinateSpace((e) => {
      if (this._p1 === null || this._p2 === null)
        return;
      const i = e.context;
      i.globalAlpha = 0.5;
      const s = w(
        this._p1,
        this._p2,
        this._vertical ? e.verticalPixelRatio : e.horizontalPixelRatio
      );
      i.fillStyle = this._fillColor, this._vertical ? i.fillRect(0, s.position, 15, s.length) : i.fillRect(s.position, 0, s.length, 15);
    });
  }
}
class V {
  constructor(t, e) {
    o(this, "_source");
    o(this, "_p1", null);
    o(this, "_p2", null);
    o(this, "_vertical", !1);
    this._source = t, this._vertical = e;
  }
  update() {
    [this._p1, this._p2] = this.getPoints();
  }
  renderer() {
    return new z(
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
class O extends V {
  getPoints() {
    const t = this._source.series, e = t.priceToCoordinate(this._source.p1.price), i = t.priceToCoordinate(this._source.p2.price);
    return [e, i];
  }
}
class U extends V {
  getPoints() {
    const t = this._source.chart.timeScale(), e = t.timeToCoordinate(this._source.p1.time), i = t.timeToCoordinate(this._source.p2.time);
    return [e, i];
  }
}
class b {
  constructor(t, e) {
    o(this, "_source");
    o(this, "_p");
    o(this, "_pos", null);
    this._source = t, this._p = e;
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
  movePoint(t) {
    this._p = t, this.update();
  }
}
class v extends b {
  update() {
    const t = this._source.chart.timeScale();
    this._pos = t.timeToCoordinate(this._p.time);
  }
  text() {
    return this._source.options.timeLabelFormatter(this._p.time);
  }
}
class T extends b {
  update() {
    const t = this._source.series;
    this._pos = t.priceToCoordinate(this._p.price);
  }
  text() {
    return this._source.options.priceLabelFormatter(this._p.price);
  }
}
const k = {
  //* Define the default values for all the primitive options.
  fillColor: "rgba(200, 50, 100, 0.75)",
  labelColor: "rgba(200, 50, 100, 1)",
  labelTextColor: "white",
  showLabels: !0,
  priceLabelFormatter: (n) => n.toFixed(2),
  timeLabelFormatter: (n) => typeof n == "string" ? n : ($(n) ? new Date(n.year, n.month, n.day) : new Date(n * 1e3)).toLocaleDateString()
};
class H {
  constructor(t, e, i) {
    o(this, "_p1");
    o(this, "_p2");
    o(this, "_fillColor");
    this._p1 = t, this._p2 = e, this._fillColor = i;
  }
  draw(t) {
    t.useBitmapCoordinateSpace((e) => {
      if (this._p1.x === null || this._p1.y === null || this._p2.x === null || this._p2.y === null)
        return;
      const i = e.context, s = w(
        this._p1.x,
        this._p2.x,
        e.horizontalPixelRatio
      ), r = w(
        this._p1.y,
        this._p2.y,
        e.verticalPixelRatio
      );
      i.fillStyle = this._fillColor, i.fillRect(
        s.position,
        r.position,
        s.length,
        r.length
      );
    });
  }
}
class E {
  constructor(t) {
    o(this, "_source");
    o(this, "_p1", { x: null, y: null });
    o(this, "_p2", { x: null, y: null });
    this._source = t;
  }
  update() {
    const t = this._source.series, e = t.priceToCoordinate(this._source.p1.price), i = t.priceToCoordinate(this._source.p2.price), s = this._source.chart.timeScale(), r = s.timeToCoordinate(this._source.p1.time), h = s.timeToCoordinate(this._source.p2.time);
    this._p1 = { x: r, y: e }, this._p2 = { x: h, y: i };
  }
  renderer() {
    return new H(
      this._p1,
      this._p2,
      this._source.options.fillColor
    );
  }
}
function D(n) {
  if (n === void 0)
    throw new Error("Value is undefined");
  return n;
}
class A {
  constructor() {
    o(this, "_chart");
    o(this, "_series");
    o(this, "_requestUpdate");
  }
  requestUpdate() {
    this._requestUpdate && this._requestUpdate();
  }
  attached({
    chart: t,
    series: e,
    requestUpdate: i
  }) {
    this._chart = t, this._series = e, this._series.subscribeDataChanged(this._fireDataUpdated), this._requestUpdate = i, this.requestUpdate();
  }
  detached() {
    this._chart = void 0, this._series = void 0, this._requestUpdate = void 0;
  }
  get chart() {
    return D(this._chart);
  }
  get series() {
    return D(this._series);
  }
  _fireDataUpdated(t) {
    this.dataUpdated && this.dataUpdated(t);
  }
}
class X extends A {
  constructor(e, i, s = {}) {
    super();
    o(this, "_options");
    o(this, "_p1");
    o(this, "_p2");
    o(this, "_paneViews");
    o(this, "_timeAxisViews");
    o(this, "_priceAxisViews");
    o(this, "_priceAxisPaneViews");
    o(this, "_timeAxisPaneViews");
    this._p1 = e, this._p2 = i, this._options = {
      ...k,
      ...s
    }, this._paneViews = [new E(this)], this._timeAxisViews = [
      new v(this, e),
      new v(this, i)
    ], this._priceAxisViews = [
      new T(this, e),
      new T(this, i)
    ], this._priceAxisPaneViews = [new O(this, !0)], this._timeAxisPaneViews = [new U(this, !1)];
  }
  updateAllViews() {
    this._paneViews.forEach((e) => e.update()), this._timeAxisViews.forEach((e) => e.update()), this._priceAxisViews.forEach((e) => e.update()), this._priceAxisPaneViews.forEach((e) => e.update()), this._timeAxisPaneViews.forEach((e) => e.update());
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
  autoscaleInfo(e, i) {
    return this._timeCurrentlyVisible(this.p1.time, e, i) || this._timeCurrentlyVisible(this.p2.time, e, i) ? {
      priceRange: {
        minValue: Math.min(this.p1.price, this.p2.price),
        maxValue: Math.max(this.p1.price, this.p2.price)
      }
    } : null;
  }
  dataUpdated(e) {
  }
  _timeCurrentlyVisible(e, i, s) {
    const r = this.chart.timeScale(), h = r.timeToCoordinate(e);
    if (h === null)
      return !1;
    const l = r.coordinateToLogical(h);
    return l === null ? !1 : l <= s && l >= i;
  }
  get options() {
    return this._options;
  }
  applyOptions(e) {
    this._options = { ...this._options, ...e }, this.requestUpdate();
  }
  get p1() {
    return this._p1;
  }
  get p2() {
    return this._p2;
  }
}
const I = {
  fillColor: "rgba(41, 98, 255, 0.1)",
  borderColor: "rgba(41, 98, 255, 0.8)",
  borderWidth: 1,
  textColor: "#ffffff",
  fontSize: 12,
  fontFamily: "Arial, sans-serif",
  backgroundColor: "rgba(0, 0, 0, 0.75)",
  padding: 8,
  leverage: 200,
  positionSize: 20,
  showDeleteButton: !0,
  onDelete: void 0
};
class F {
  constructor(t, e, i, s, r) {
    o(this, "_p1");
    o(this, "_p2");
    o(this, "_measureData");
    o(this, "_options");
    o(this, "_onDeleteButtonBounds");
    this._p1 = t, this._p2 = e, this._measureData = i, this._options = s, this._onDeleteButtonBounds = r;
  }
  draw(t) {
    t.useBitmapCoordinateSpace((e) => {
      if (this._p1.x === null || this._p1.y === null || this._p2.x === null || this._p2.y === null || !this._measureData)
        return;
      const i = e.context, s = w(
        this._p1.x,
        this._p2.x,
        e.horizontalPixelRatio
      ), r = w(
        this._p1.y,
        this._p2.y,
        e.verticalPixelRatio
      );
      i.fillStyle = this._options.fillColor, i.fillRect(
        s.position,
        r.position,
        s.length,
        r.length
      ), i.strokeStyle = this._options.borderColor, i.lineWidth = this._options.borderWidth * e.verticalPixelRatio, i.strokeRect(
        s.position,
        r.position,
        s.length,
        r.length
      ), this._drawInfoBox(i, e, s, r);
    });
  }
  _drawInfoBox(t, e, i, s) {
    if (!this._measureData)
      return;
    const r = this._options.padding * e.verticalPixelRatio, h = this._options.fontSize * e.verticalPixelRatio, l = h * 1.5;
    t.font = `${h}px ${this._options.fontFamily}`, t.textBaseline = "middle";
    const a = [
      `Duration: ${this._measureData.duration}`,
      `Price Change: ${this._measureData.priceChange.toFixed(2)}`,
      `Change %: ${this._measureData.priceChangePercent.toFixed(2)}%`,
      `Start: ${this._measureData.priceStart.toFixed(2)}`,
      `End: ${this._measureData.priceEnd.toFixed(2)}`,
      `PNL (${this._options.leverage}x${this._options.positionSize}): $${this._measureData.pnl.toFixed(2)}`
    ];
    let u = 0;
    a.forEach((x) => {
      const g = t.measureText(x).width;
      g > u && (u = g);
    });
    const c = u + r * 2, p = a.length * l + r * 2, f = i.position + i.length / 2, m = s.position + s.length / 2;
    let _ = f - c / 2, d = m - p / 2;
    const C = e.bitmapSize.width, y = e.bitmapSize.height;
    _ < r && (_ = r), _ + c > C - r && (_ = C - c - r), d < r && (d = r), d + p > y - r && (d = y - p - r), t.shadowColor = "rgba(0, 0, 0, 0.3)", t.shadowBlur = 10 * e.verticalPixelRatio, t.shadowOffsetX = 0, t.shadowOffsetY = 2 * e.verticalPixelRatio, t.fillStyle = this._options.backgroundColor, t.fillRect(_, d, c, p), t.shadowColor = "transparent", t.shadowBlur = 0, t.shadowOffsetX = 0, t.shadowOffsetY = 0, t.strokeStyle = this._options.borderColor, t.lineWidth = 1 * e.verticalPixelRatio, t.strokeRect(_, d, c, p), t.fillStyle = this._options.textColor, t.textAlign = "center", a.forEach((x, g) => {
      const R = _ + c / 2, S = d + r + g * l + l / 2;
      t.fillText(x, R, S);
    }), t.textAlign = "left", this._options.showDeleteButton && this._drawDeleteButton(
      t,
      e,
      _,
      d,
      c,
      p,
      r
    );
  }
  _drawDeleteButton(t, e, i, s, r, h, l) {
    const a = 20 * e.verticalPixelRatio, u = i + r - a - l / 2, c = s + l / 2;
    t.fillStyle = "rgba(239, 83, 80, 0.9)", t.beginPath(), t.arc(
      u + a / 2,
      c + a / 2,
      a / 2,
      0,
      Math.PI * 2
    ), t.fill(), t.strokeStyle = "#ffffff", t.lineWidth = 2 * e.verticalPixelRatio, t.lineCap = "round";
    const p = a * 0.3, f = u + p, m = c + p, _ = u + a - p, d = c + a - p;
    t.beginPath(), t.moveTo(f, m), t.lineTo(_, d), t.moveTo(_, m), t.lineTo(f, d), t.stroke(), this._onDeleteButtonBounds && this._onDeleteButtonBounds({
      x: u / e.horizontalPixelRatio,
      y: c / e.verticalPixelRatio,
      width: a / e.horizontalPixelRatio,
      height: a / e.verticalPixelRatio
    });
  }
}
class L {
  constructor(t) {
    o(this, "_source");
    o(this, "_p1", { x: null, y: null });
    o(this, "_p2", { x: null, y: null });
    o(this, "_measureData", null);
    o(this, "_deleteButtonBounds", null);
    this._source = t;
  }
  update() {
    const t = this._source.series, e = t.priceToCoordinate(this._source.p1.price), i = t.priceToCoordinate(this._source.p2.price), s = this._source.chart.timeScale(), r = s.timeToCoordinate(this._source.p1.time), h = s.timeToCoordinate(this._source.p2.time);
    this._p1 = { x: r, y: e }, this._p2 = { x: h, y: i };
    const l = this._source.p1.price, a = this._source.p2.price, u = Math.abs(a - l), c = u / l * 100, p = this._source.options.leverage || 200, f = this._source.options.positionSize || 20, m = p * f * (c / 100), _ = this._calculateDuration(
      this._source.p1.time,
      this._source.p2.time
    );
    this._measureData = {
      priceChange: u,
      priceChangePercent: c,
      priceStart: l,
      priceEnd: a,
      pnl: m,
      duration: _
    };
  }
  renderer() {
    return new F(
      this._p1,
      this._p2,
      this._measureData,
      this._source.options,
      (t) => {
        this._deleteButtonBounds = t;
      }
    );
  }
  getDeleteButtonBounds() {
    return this._deleteButtonBounds;
  }
  _calculateDuration(t, e) {
    let i, s;
    typeof t == "string" ? i = new Date(t).getTime() / 1e3 : typeof t == "object" && "year" in t ? i = new Date(t.year, t.month - 1, t.day).getTime() / 1e3 : i = t, typeof e == "string" ? s = new Date(e).getTime() / 1e3 : typeof e == "object" && "year" in e ? s = new Date(e.year, e.month - 1, e.day).getTime() / 1e3 : s = e;
    const r = Math.abs(s - i), h = Math.floor(r / 60), l = Math.floor(h / 60), a = Math.floor(l / 24);
    if (a > 0) {
      const u = l % 24;
      return u > 0 ? `${a}d ${u}h` : `${a}d`;
    } else if (l > 0) {
      const u = h % 60;
      return u > 0 ? `${l}h ${u}m` : `${l}h`;
    } else
      return h > 0 ? `${h}m` : `${Math.floor(r)}s`;
  }
}
class P extends A {
  constructor(e, i, s = {}) {
    super();
    o(this, "_options");
    o(this, "_p1");
    o(this, "_p2");
    o(this, "_paneViews");
    o(this, "_clickHandler");
    this._p1 = e, this._p2 = i, this._options = {
      ...I,
      ...s
    }, this._paneViews = [new L(this)], this._setupClickHandler();
  }
  _setupClickHandler() {
    this._clickHandler = (e) => {
      var c;
      if (!e.point)
        return;
      const i = (c = this._paneViews[0]) == null ? void 0 : c.getDeleteButtonBounds();
      if (!i)
        return;
      const { x: s, y: r, width: h, height: l } = i, a = e.point.x, u = e.point.y;
      a >= s && a <= s + h && u >= r && u <= r + l && this._options.onDelete && this._options.onDelete();
    };
  }
  attached(e) {
    super.attached(e), this._clickHandler && this.chart.subscribeClick(this._clickHandler);
  }
  detached() {
    this._clickHandler && this.chart.unsubscribeClick(this._clickHandler), super.detached();
  }
  updateAllViews() {
    this._paneViews.forEach((e) => e.update());
  }
  paneViews() {
    return this._paneViews;
  }
  priceAxisViews() {
    return [];
  }
  timeAxisViews() {
    return [];
  }
  priceAxisPaneViews() {
    return [];
  }
  timeAxisPaneViews() {
    return [];
  }
  autoscaleInfo(e, i) {
    return this._timeCurrentlyVisible(this.p1.time, e, i) || this._timeCurrentlyVisible(this.p2.time, e, i) ? {
      priceRange: {
        minValue: Math.min(this.p1.price, this.p2.price),
        maxValue: Math.max(this.p1.price, this.p2.price)
      }
    } : null;
  }
  dataUpdated(e) {
  }
  _timeCurrentlyVisible(e, i, s) {
    const r = this.chart.timeScale(), h = r.timeToCoordinate(e);
    if (h === null)
      return !1;
    const l = r.coordinateToLogical(h);
    return l === null ? !1 : l <= s && l >= i;
  }
  get options() {
    return this._options;
  }
  applyOptions(e) {
    this._options = { ...this._options, ...e }, this.requestUpdate();
  }
  get p1() {
    return this._p1;
  }
  get p2() {
    return this._p2;
  }
}
class Y {
  constructor(t, e = {}, i) {
    o(this, "series");
    o(this, "tools", /* @__PURE__ */ new Map());
    o(this, "isDrawing", !1);
    o(this, "startPoint", null);
    o(this, "tempTool", null);
    o(this, "defaultOptions");
    o(this, "onToolAdded");
    o(this, "onToolRemoved");
    o(this, "updateInterval", null);
    this.series = t, this.defaultOptions = e, this.onToolAdded = i == null ? void 0 : i.onToolAdded, this.onToolRemoved = i == null ? void 0 : i.onToolRemoved;
  }
  startDrawing() {
    this.isDrawing = !0, this.startPoint = null, this.tempTool = null;
  }
  stopDrawing() {
    this.isDrawing = !1, this.tempTool && (this.series.detachPrimitive(this.tempTool), this.tempTool = null), this.updateInterval && (clearInterval(this.updateInterval), this.updateInterval = null);
  }
  handleClick(t) {
    if (!this.isDrawing || !t.point)
      return !1;
    const e = t.time, i = t.logical;
    if (!e || i === void 0)
      return !1;
    const s = this.series.coordinateToPrice(t.point.y);
    if (s === null)
      return !1;
    if (!this.startPoint)
      return this.startPoint = {
        time: e,
        price: s
      }, this.tempTool = new P(
        this.startPoint,
        this.startPoint,
        this.defaultOptions
      ), this.series.attachPrimitive(this.tempTool), !0;
    const r = {
      time: e,
      price: s
    };
    this.tempTool && (this.series.detachPrimitive(this.tempTool), this.tempTool = null);
    const h = this.generateId(), l = new P(this.startPoint, r, {
      ...this.defaultOptions,
      onDelete: () => {
        this.removeTool(h);
      }
    }), a = {
      id: h,
      tool: l,
      startPoint: this.startPoint,
      endPoint: r
    };
    return this.series.attachPrimitive(l), this.tools.set(h, a), this.startPoint = null, this.isDrawing = !1, this.onToolAdded && this.onToolAdded(a), !0;
  }
  handleMouseMove(t) {
    if (!this.isDrawing || !this.startPoint || !this.tempTool || !t.point)
      return;
    const e = t.time, i = t.logical;
    if (!e || i === void 0)
      return;
    const s = this.series.coordinateToPrice(t.point.y);
    if (s === null)
      return;
    const r = {
      time: e,
      price: s
    };
    this.series.detachPrimitive(this.tempTool), this.tempTool = new P(
      this.startPoint,
      r,
      this.defaultOptions
    ), this.series.attachPrimitive(this.tempTool);
  }
  removeTool(t) {
    const e = this.tools.get(t);
    return e ? (this.series.detachPrimitive(e.tool), this.tools.delete(t), this.onToolRemoved && this.onToolRemoved(t), !0) : !1;
  }
  removeAllTools() {
    this.tools.forEach((t) => {
      this.series.detachPrimitive(t.tool);
    }), this.tools.clear();
  }
  getTools() {
    return Array.from(this.tools.values());
  }
  isInDrawingMode() {
    return this.isDrawing;
  }
  generateId() {
    return `tool_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
  updateDefaultOptions(t) {
    this.defaultOptions = { ...this.defaultOptions, ...t };
  }
}
export {
  Y as DrawingManager,
  P as PriceMeasureTool,
  X as Ruletool,
  k as defaultOptions,
  I as defaultPriceMeasureOptions
};
