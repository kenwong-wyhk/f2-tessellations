/* Controls and drawing for the regular-tessellations demo. */
(function () {
  "use strict";

  var math = window.TessMath;
  var boardBox = math.BOARD;

  var INK = "#231f20";
  var MUTED = "#6d6e71";
  var FRAME = "#a7a9ac";
  var WARNING = "#8a5a12";
  var WARNING_FILL = "#e7b15a";
  var DANGER = "#d7000f";
  var DANGER_DEEP = "#8f1018";
  var DANGER_FILL = "#e59aa0";
  /* Tile fills, one per colour index. Opaque so a vertex copy painted on its
     matching plane tile stays the same colour. Hues follow the school blue,
     red and gold, plus purple for the fourth colour. */
  var FILL = ["#c5d6ee", "#f4cfd2", "#f3e1cc", "#ddd4ee"];
  var PALETTE = ["#004898", "#b00012", "#b96e2b", "#5c4b8a"];

  var state = {
    n: 3,
    placed: 0,
    playing: false,
    showOverlap: false,
    fillPlane: false,
    reduceMotion: false,
  };

  var playGen = 0;
  var rafId = 0;
  var nodes = {};

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fracHtml(num, den) {
    return '<span class="frac" aria-label="' + num + " over " + den + '">' +
      '<span class="num" aria-hidden="true">' + num + "</span>" +
      '<span class="den" aria-hidden="true">' + den + "</span></span>";
  }

  function richText(s) {
    return escapeHtml(s).replace(/(\d+)\/(\d+)/g, function (_match, num, den) {
      return fracHtml(num, den);
    });
  }

  function stopPlayback() {
    playGen += 1;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    state.playing = false;
  }

  function startPlayback() {
    stopPlayback();
    var info = math.analyse(state.n);
    if (state.placed >= info.maxFit) state.placed = 0;
    state.showOverlap = false;
    if (state.reduceMotion) {
      state.placed = info.maxFit;
      return;
    }
    state.playing = true;
    var gen = playGen;
    var last = performance.now();
    function tick(now) {
      if (gen !== playGen) return;
      if (now - last >= 700) {
        last = now;
        var current = math.analyse(state.n);
        if (state.placed >= current.maxFit) {
          stopPlayback();
          render();
          return;
        }
        state.placed += 1;
        render();
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
  }

  function attr(name, value) {
    return " " + name + '="' + escapeHtml(value) + '"';
  }

  function pathEl(d, attrs) {
    var extra = "";
    var keys = Object.keys(attrs);
    for (var i = 0; i < keys.length; i++) extra += attr(keys[i], attrs[keys[i]]);
    return "<path" + attr("d", d) + extra + "></path>";
  }

  function textEl(x, y, content, size, fill, weight) {
    return "<text" +
      attr("x", x) +
      attr("y", y) +
      ' text-anchor="middle" dominant-baseline="middle"' +
      attr("fill", fill) +
      attr("font-size", size) +
      attr("font-weight", weight) +
      ' font-family="Noto Sans HK, sans-serif"' +
      ">" + escapeHtml(content) + "</text>";
  }

  function boardMarkup() {
    var info = math.analyse(state.n);
    var placed = state.placed;
    var fill = state.fillPlane && info.fits && (state.n === 3 || state.n === 4 || state.n === 6);
    var cx = boardBox.cx;
    var cy = boardBox.cy;
    var side = info.side;
    var start = 0;
    var parts = [];
    var arcR = Math.min(42, side * 0.38);
    var labelR = arcR + 22;
    var vertex = math.vertexTiles(state.n, cx, cy, side, start, placed);
    var showOverlap = state.showOverlap && !info.fits && placed >= info.maxFit;
    var overlap = showOverlap
      ? math.polygonPoints(cx, cy, state.n, side, start + info.maxFit * info.Irad)
      : null;

    parts.push("<defs><clipPath id=\"plane-clip\"><rect x=\"0\" y=\"0\" width=\"" + boardBox.width + "\" height=\"" + boardBox.height + "\"></rect></clipPath></defs>");

    if (!fill) {
      parts.push("<circle" + attr("cx", cx) + attr("cy", cy) + attr("r", boardBox.clipR) +
        ' fill="none"' + attr("stroke", FRAME) + ' stroke-dasharray="6 6" stroke-width="1.5"></circle>');
    }

    if (fill) {
      var tiles = math.planeTiles(state.n, cx, cy, side, boardBox.width, boardBox.height);
      parts.push('<g clip-path="url(#plane-clip)">');
      for (var t = 0; t < tiles.length; t++) {
        parts.push(pathEl(tiles[t].d, {
          "data-kind": "plane",
          "data-color": String(tiles[t].color),
          fill: FILL[tiles[t].color],
          stroke: INK,
          "stroke-opacity": "0.45",
          "stroke-width": "1",
          "stroke-linejoin": "round",
        }));
      }
      parts.push("</g>");
    }

    for (var v = 0; v < vertex.length; v++) {
      var vertexAttrs = {
        "data-kind": "vertex",
        "data-color": String(vertex[v].color),
        fill: FILL[vertex[v].color],
        stroke: INK,
        "stroke-width": "2",
        "stroke-linejoin": "round",
      };
      parts.push(pathEl(vertex[v].d, vertexAttrs));
    }

    if (placed < info.maxFit || !info.fits) {
      var wedgeR = Math.min(boardBox.clipR, side * (state.n <= 4 ? 1.15 : 1.35));
      parts.push(pathEl(math.sectorPath(cx, cy, wedgeR, start + placed * info.Irad, start + 2 * Math.PI), {
        "data-kind": "wedge",
        fill: WARNING_FILL,
        "fill-opacity": placed === 0 ? "0.35" : "0.55",
        stroke: "none",
      }));
    }

    if (overlap) {
      parts.push(pathEl(math.pathFromPoints(overlap), {
        "data-kind": "overlap",
        fill: DANGER_FILL,
        "fill-opacity": "0.7",
        stroke: DANGER,
        "stroke-width": "2",
        "stroke-dasharray": "7 5",
        "stroke-linejoin": "round",
      }));
    }

    for (var a = 0; a < placed; a++) {
      var a0 = start + a * info.Irad;
      var a1 = start + (a + 1) * info.Irad;
      var mid = (a0 + a1) / 2;
      parts.push(pathEl(math.arcPath(cx, cy, arcR, a0, a1), {
        "data-kind": "angle",
        fill: PALETTE[math.vertexColor(state.n, a)],
        "fill-opacity": "0.28",
        stroke: INK,
        "stroke-width": "1.25",
      }));
      parts.push(textEl(cx + labelR * Math.cos(mid), cy + labelR * Math.sin(mid), info.angle.label, 13, INK, 600));
    }

    if (!info.fits && placed >= info.maxFit) {
      var gap0 = start + info.maxFit * info.Irad;
      var gapMid = gap0 + (2 * Math.PI - info.maxFit * info.Irad) / 2;
      parts.push(pathEl(math.arcPath(cx, cy, arcR, gap0, start + 2 * Math.PI), {
        "data-kind": "gap",
        fill: WARNING_FILL,
        "fill-opacity": "0.85",
        stroke: WARNING,
        "stroke-width": "1.5",
      }));
      parts.push(textEl(
        cx + (labelR + 8) * Math.cos(gapMid),
        cy + (labelR + 8) * Math.sin(gapMid),
        "Gap " + info.gap.label,
        13,
        WARNING,
        600
      ));
    }

    if (showOverlap) {
      var overlapMid = start + (info.maxFit + 0.5) * info.Irad;
      parts.push(textEl(
        cx + (labelR + 6) * Math.cos(overlapMid),
        cy + (labelR + 6) * Math.sin(overlapMid),
        "Overlap",
        13,
        DANGER_DEEP,
        600
      ));
    }

    parts.push("<circle" + attr("cx", cx) + attr("cy", cy) + ' r="5"' + attr("fill", INK) + ' data-kind="vertex-dot"></circle>');
    parts.push("<circle" + attr("cx", cx) + attr("cy", cy) + attr("r", arcR + 2) +
      ' fill="none"' + attr("stroke", MUTED) + ' stroke-width="1"></circle>');

    return parts.join("");
  }

  function renderTable() {
    var body = "";
    for (var i = 0; i < math.SIDES.length; i++) {
      var row = math.tableRow(math.SIDES[i]);
      var tone = row.yes ? "yes" : "no";
      body += "<tr data-n=\"" + row.n + "\">" +
        "<td>" + escapeHtml(row.name) + "</td>" +
        "<td class=\"num\">" + row.n + "</td>" +
        "<td class=\"num\">" + richText(row.interior) + "</td>" +
        "<td class=\"num\">" + richText(row.quotient) + "</td>" +
        "<td class=\"" + tone + "\">" + richText(row.tessellate) + "</td>" +
        "</tr>";
    }
    nodes.tbody.innerHTML = body;
  }

  function render() {
    var info = math.analyse(state.n);
    var spoken = math.callout(state.n, state.placed);
    var meters = math.metrics(state.n);

    nodes.poly.value = String(state.n);
    nodes.place.disabled = state.placed >= info.maxFit || state.playing;
    nodes.play.textContent = state.playing ? "Pause" : "Play";
    nodes.more.disabled = info.fits || state.placed < info.maxFit;
    nodes.fill.disabled = !info.fits || state.placed < info.maxFit;
    nodes.fill.checked = state.fillPlane;

    for (var m = 0; m < meters.length; m++) {
      nodes.metric[m].className = "metric" + (meters[m].tone ? " " + meters[m].tone : "");
      nodes.metricLabel[m].textContent = meters[m].label;
      nodes.metricValue[m].innerHTML = richText(meters[m].value);
      nodes.metricDetail[m].innerHTML = richText(meters[m].detail);
      nodes.metricDetail[m].hidden = meters[m].detail === "";
    }

    nodes.title.textContent = math.POLYGON_NAMES[state.n];
    nodes.sub.textContent = math.subtitle(state.n, state.placed);
    nodes.foot.textContent = math.boardCaption(state.fillPlane);
    nodes.board.innerHTML = boardMarkup();
    nodes.board.setAttribute(
      "aria-label",
      math.POLYGON_NAMES[state.n] + " copies around a point, with interior angles compared to 360 degrees"
    );
    nodes.board.dataset.placed = String(state.placed);
    nodes.board.dataset.n = String(state.n);
    nodes.board.dataset.fits = info.fits ? "yes" : "no";
    nodes.board.dataset.fill = state.fillPlane ? "yes" : "no";
    nodes.board.dataset.overlap = state.showOverlap ? "yes" : "no";
    nodes.board.dataset.playing = state.playing ? "yes" : "no";

    nodes.callout.className = "callout " + spoken.tone;
    nodes.lead.textContent = spoken.lead;
    nodes.note.innerHTML = richText(spoken.text);
  }

  function onPlay() {
    if (state.playing) {
      stopPlayback();
      render();
      return;
    }
    startPlayback();
    render();
  }

  function onPlace() {
    var info = math.analyse(state.n);
    if (state.playing || state.placed >= info.maxFit) return;
    stopPlayback();
    state.showOverlap = false;
    state.placed = Math.min(info.maxFit, state.placed + 1);
    render();
  }

  function onReset() {
    stopPlayback();
    state.placed = 0;
    state.showOverlap = false;
    state.fillPlane = false;
    render();
  }

  function onMore() {
    var info = math.analyse(state.n);
    if (info.fits || state.placed < info.maxFit) return;
    state.showOverlap = true;
    render();
  }

  function onFill() {
    var info = math.analyse(state.n);
    if (!info.fits || state.placed < info.maxFit) {
      nodes.fill.checked = state.fillPlane;
      return;
    }
    state.fillPlane = nodes.fill.checked;
    render();
  }

  function onPoly() {
    var next = Number(nodes.poly.value);
    if (math.SIDES.indexOf(next) === -1) return;
    stopPlayback();
    state.n = next;
    state.placed = 0;
    state.showOverlap = false;
    state.fillPlane = false;
    render();
  }

  function init() {
    nodes.poly = byId("poly");
    nodes.place = byId("place");
    nodes.play = byId("play");
    nodes.reset = byId("reset");
    nodes.more = byId("more");
    nodes.fill = byId("fill");
    nodes.tbody = byId("summary-body");
    nodes.title = byId("board-title");
    nodes.sub = byId("board-sub");
    nodes.foot = byId("board-foot");
    nodes.board = byId("board");
    nodes.callout = byId("callout");
    nodes.lead = byId("lead");
    nodes.note = byId("note");
    nodes.metric = [byId("m0"), byId("m1"), byId("m2")];
    nodes.metricLabel = [byId("m0l"), byId("m1l"), byId("m2l")];
    nodes.metricValue = [byId("m0v"), byId("m1v"), byId("m2v")];
    nodes.metricDetail = [byId("m0d"), byId("m1d"), byId("m2d")];

    for (var i = 0; i < math.SIDES.length; i++) {
      var s = math.SIDES[i];
      var opt = document.createElement("option");
      opt.value = String(s);
      opt.textContent = math.POLYGON_NAMES[s] + " (n = " + s + ")";
      nodes.poly.appendChild(opt);
    }

    nodes.poly.addEventListener("change", onPoly);
    nodes.place.addEventListener("click", onPlace);
    nodes.play.addEventListener("click", onPlay);
    nodes.reset.addEventListener("click", onReset);
    nodes.more.addEventListener("click", onMore);
    nodes.fill.addEventListener("change", onFill);

    var motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    state.reduceMotion = motion.matches;
    function onMotion() {
      state.reduceMotion = motion.matches;
      if (state.reduceMotion && state.playing) {
        var info = math.analyse(state.n);
        stopPlayback();
        state.placed = info.maxFit;
        render();
      }
    }
    if (motion.addEventListener) motion.addEventListener("change", onMotion);
    else if (motion.addListener) motion.addListener(onMotion);

    renderTable();
    render();
  }

  init();
})();
