/* Check the angle test, the summary table, and the plane filling.
   Run from the repository root: node tools/check-math.js */
"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.join(__dirname, "..");
var code = fs.readFileSync(path.join(root, "js", "geometry.js"), "utf8");
var sandbox = {};
vm.runInNewContext(code, sandbox);
var math = sandbox.TessMath;

var failed = 0;
function check(cond, message) {
  if (!cond) {
    failed += 1;
    console.error("FAIL: " + message);
  }
}

var expect = {
  3: { interior: "60°", copies: "6", quotient: "6", tess: "Yes, 6 meet at a point", maxFit: 6 },
  4: { interior: "90°", copies: "4", quotient: "4", tess: "Yes, 4 meet at a point", maxFit: 4 },
  5: { interior: "108°", copies: "10/3", quotient: "10/3  (≈ 3.33)", tess: "No, gap 36°", maxFit: 3, sum: "324°", oneMore: "432°" },
  6: { interior: "120°", copies: "3", quotient: "3", tess: "Yes, 3 meet at a point", maxFit: 3 },
  7: { interior: "128 4/7°", copies: "14/5", quotient: "14/5  (≈ 2.80)", tess: "No, gap 102 6/7°", maxFit: 2, sum: "257 1/7°", oneMore: "385 5/7°" },
  8: { interior: "135°", copies: "8/3", quotient: "8/3  (≈ 2.67)", tess: "No, gap 90°", maxFit: 2, sum: "270°" },
  9: { interior: "140°", copies: "18/7", quotient: "18/7  (≈ 2.57)", tess: "No, gap 80°", maxFit: 2, sum: "280°" },
  10: { interior: "144°", copies: "5/2", quotient: "5/2  (≈ 2.50)", tess: "No, gap 72°", maxFit: 2, sum: "288°" },
  11: { interior: "147 3/11°", copies: "22/9", quotient: "22/9  (≈ 2.44)", tess: "No, gap 65 5/11°", maxFit: 2, sum: "294 6/11°" },
  12: { interior: "150°", copies: "12/5", quotient: "12/5  (≈ 2.40)", tess: "No, gap 60°", maxFit: 2, sum: "300°" },
};

console.log("n | interior | 2n/(n-2) | max that fit | angle sum | gap | tessellate?");

math.SIDES.forEach(function (n) {
  var info = math.analyse(n);
  var row = math.tableRow(n);
  var want = expect[n];
  var quotientValue = 2 * n / (n - 2);
  check(Math.abs(info.copies.exact - quotientValue) < 1e-12, "n=" + n + " quotient");
  check(Math.abs(info.angle.deg - (180 * (n - 2)) / n) < 1e-12, "n=" + n + " interior");
  check(Math.abs(360 / info.angle.deg - info.copies.exact) < 1e-9, "n=" + n + " 360/interior");
  check(info.angle.label === want.interior, "n=" + n + " interior label " + info.angle.label);
  check(info.copies.label === want.copies, "n=" + n + " copies label " + info.copies.label);
  check(row.quotient === want.quotient, "n=" + n + " table quotient " + row.quotient);
  check(row.tessellate === want.tess, "n=" + n + " table result " + row.tessellate);
  check(info.maxFit === want.maxFit, "n=" + n + " maxFit " + info.maxFit);
  check(info.fits === (n === 3 || n === 4 || n === 6), "n=" + n + " fits flag");

  var sumDeg = info.maxFit * info.angle.deg;
  var gapDeg = info.gap.deg;
  check(Math.abs(sumDeg + gapDeg - 360) < 1e-9, "n=" + n + " sum + gap = 360");
  if (info.fits) {
    check(Math.abs(sumDeg - 360) < 1e-9, "n=" + n + " exact 360");
    check(gapDeg === 0, "n=" + n + " zero gap");
  } else {
    check(gapDeg > 0 && gapDeg < info.angle.deg, "n=" + n + " positive gap smaller than one interior angle");
    check(math.angleSumLabel(n, info.maxFit) === want.sum, "n=" + n + " sum label " + math.angleSumLabel(n, info.maxFit));
    if (want.oneMore) {
      check(math.angleSumLabel(n, info.maxFit + 1) === want.oneMore, "n=" + n + " one more");
      check(info.angle.deg * (info.maxFit + 1) > 360, "n=" + n + " one more exceeds 360");
    }
  }

  var meters = math.metrics(n);
  check(meters[0].value === want.interior, "metric interior");
  check(meters[1].value === want.copies, "metric copies");
  check(meters[1].detail === (info.fits ? "an integer, at least 3" : "not an integer"), "metric detail");
  if (info.fits) {
    check(meters[2].value === "360°", "metric full turn");
    check(meters[2].detail === want.copies + " polygons meet exactly", "metric meet");
  } else {
    check(meters[2].value === info.gap.label + " gap", "metric gap");
    check(meters[2].detail === info.maxFit + " × " + info.angle.label + " = " + want.sum, "metric sum detail");
  }

  console.log(
    String(n).padStart(2, " ") + " | " +
    want.interior.padEnd(12, " ") + " | " +
    row.quotient.padEnd(18, " ") + " | " +
    String(info.maxFit).padEnd(12, " ") + " | " +
    (info.fits ? "360°" : want.sum).padEnd(10, " ") + " | " +
    (info.fits ? "0°" : info.gap.label).padEnd(12, " ") + " | " +
    row.tessellate
  );
});

check(
  math.conclusion(3, 0) === "The interior angle of an equilateral triangle is 60°. Place copies around a point and add those angles.",
  "triangle start uses 'an'"
);
check(
  math.conclusion(4, 0) === "The interior angle of a square is 90°. Place copies around a point and add those angles.",
  "square start"
);
check(
  math.conclusion(3, 6) === "6 × 60° = 360°. 360° is divisible by 60°, so the polygons meet with no gap and no overlap.",
  "triangle done"
);
check(
  math.conclusion(4, 4) === "4 × 90° = 360°. 360° is divisible by 90°, so the polygons meet with no gap and no overlap.",
  "square done"
);
check(
  math.conclusion(6, 3) === "3 × 120° = 360°. 360° is divisible by 120°, so the polygons meet with no gap and no overlap.",
  "hexagon done"
);
check(
  math.conclusion(5, 2) === "Running total: 2 × 108° = 216°. Still short of 360° by 144°.",
  "pentagon after 2 still has room"
);
check(math.remainderAngle(5, 2).deg === 144, "pentagon shortfall after 2 is 144, larger than 108");
check(math.remainderAngle(5, 2).deg > math.interiorAngle(5).deg, "a third pentagon still fits");
check(
  math.conclusion(5, 3) === "3 × 108° = 324°. 360° is not divisible by 108°: a gap of 36° is left. One more copy would be 432°, which is more than 360° and would overlap.",
  "pentagon final gap 36"
);
check(
  math.conclusion(7, 2) === "2 × 128 4/7° = 257 1/7°. 360° is not divisible by 128 4/7°: a gap of 102 6/7° is left. One more copy would be 385 5/7°, which is more than 360° and would overlap.",
  "heptagon final"
);
check(math.callout(3, 0).lead === "Start here", "lead start");
check(math.callout(3, 2).lead === "Keep adding", "lead adding");
check(math.callout(3, 6).lead === "It tessellates" && math.callout(3, 6).tone === "success", "lead yes");
check(math.callout(5, 3).lead === "It cannot tessellate" && math.callout(5, 3).tone === "warning", "lead no");
check(math.subtitle(5, 2) === "216° of 360°   ·   360° ÷ 108° = 10/3", "subtitle spaces");
check(math.boardCaption(false) === "Each copy adds the same interior angle at the marked vertex", "caption copies");
check(math.boardCaption(true) === "Adjacent polygons never share the same colour", "caption colour");

function keyOf(p) {
  return Math.round(p[0] * 1000) + "," + Math.round(p[1] * 1000);
}

function sameShape(a, b) {
  if (a.length !== b.length) return false;
  var keys = {};
  for (var i = 0; i < b.length; i++) keys[keyOf(b[i])] = true;
  for (var j = 0; j < a.length; j++) {
    if (!keys[keyOf(a[j])]) return false;
  }
  return true;
}

function distToSeg(x, y, a, b) {
  var dx = b[0] - a[0];
  var dy = b[1] - a[1];
  var len2 = dx * dx + dy * dy;
  var t = len2 === 0 ? 0 : ((x - a[0]) * dx + (y - a[1]) * dy) / len2;
  if (t < 0) t = 0;
  if (t > 1) t = 1;
  return Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy));
}

function covers(tiles, x, y) {
  for (var t = 0; t < tiles.length; t++) {
    var pts = tiles[t].pts;
    var inside = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var yi = pts[i][1];
      var yj = pts[j][1];
      if ((yi > y) !== (yj > y)) {
        var xi = pts[i][0];
        var xj = pts[j][0];
        var xCross = ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (x < xCross) inside = !inside;
      }
    }
    if (inside) return true;
    for (var e = 0; e < pts.length; e++) {
      if (distToSeg(x, y, pts[e], pts[(e + 1) % pts.length]) <= 1.25) return true;
    }
  }
  return false;
}

[3, 4, 6].forEach(function (n) {
  var info = math.analyse(n);
  var box = math.BOARD;
  var vertex = math.vertexTiles(n, box.cx, box.cy, info.side, 0, info.maxFit);
  var plane = math.planeTiles(n, box.cx, box.cy, info.side, box.width, box.height);
  check(vertex.length === info.maxFit, "vertex count " + n);
  vertex.forEach(function (tile, k) {
    var err = 0;
    for (var i = 0; i < tile.pts.length; i++) {
      var a = tile.pts[i];
      var b = tile.pts[(i + 1) % tile.pts.length];
      err = Math.max(err, Math.abs(Math.hypot(a[0] - b[0], a[1] - b[1]) - info.side));
    }
    check(err < 1e-6, "vertex edge length n=" + n + " k=" + k + " err=" + err);
    var atPoint = tile.pts.some(function (p) {
      return Math.hypot(p[0] - box.cx, p[1] - box.cy) < 1e-6;
    });
    check(atPoint, "vertex tile meets the marked point n=" + n + " k=" + k);
    var match = null;
    for (var p = 0; p < plane.length; p++) {
      if (sameShape(tile.pts, plane[p].pts)) {
        match = plane[p];
        break;
      }
    }
    check(match !== null, "vertex tile is a plane tile n=" + n + " k=" + k);
    if (match) {
      check(match.color === tile.color, "colour match n=" + n + " k=" + k + " vertex " + tile.color + " plane " + match.color);
      var planeErr = 0;
      for (var e = 0; e < match.pts.length; e++) {
        var c = match.pts[e];
        var nxt = match.pts[(e + 1) % match.pts.length];
        planeErr = Math.max(planeErr, Math.abs(Math.hypot(c[0] - nxt[0], c[1] - nxt[1]) - info.side));
      }
      check(planeErr < 1e-6, "plane edge equals vertex side n=" + n);
    }
  });

  if (n === 6) {
    var flat = plane.some(function (tile) {
      var minY = Infinity;
      tile.pts.forEach(function (p) { if (p[1] < minY) minY = p[1]; });
      var top = tile.pts.filter(function (p) { return Math.abs(p[1] - minY) < 1e-6; });
      return top.length === 2 && Math.abs(top[0][0] - top[1][0]) > info.side * 0.5;
    });
    check(flat, "hexagons are flat-top");
    var colors = vertex.map(function (tile) { return tile.color; });
    check(colors.join(",") === "0,1,2", "three hex colours around the point " + colors.join(","));
  }

  var groups = {};
  plane.forEach(function (tile, index) {
    var seen = {};
    tile.pts.forEach(function (p) {
      var key = keyOf(p);
      if (seen[key]) return;
      seen[key] = true;
      if (!groups[key]) groups[key] = [];
      groups[key].push(index);
    });
  });
  var pairColor = {};
  Object.keys(groups).forEach(function (key) {
    var ids = groups[key];
    for (var a = 0; a < ids.length; a++) {
      for (var b = a + 1; b < ids.length; b++) {
        var lo = Math.min(ids[a], ids[b]);
        var hi = Math.max(ids[a], ids[b]);
        var id = lo + ":" + hi;
        pairColor[id] = (pairColor[id] || 0) + 1;
      }
    }
  });
  Object.keys(pairColor).forEach(function (id) {
    if (pairColor[id] < 2) return;
    var parts = id.split(":");
    var left = plane[Number(parts[0])];
    var right = plane[Number(parts[1])];
    check(left.color !== right.color, "shared edge same colour n=" + n + " colors " + left.color + "," + right.color);
  });

  var missed = null;
  for (var y = 0; y <= box.height && !missed; y += 10) {
    for (var x = 0; x <= box.width; x += 10) {
      if (!covers(plane, x, y)) {
        missed = [x, y];
        break;
      }
    }
  }
  check(!missed, "plane fill leaves a hole at " + (missed ? missed.join(",") : "") + " for n=" + n + " (" + plane.length + " tiles)");
  console.log("n=" + n + " fill: " + plane.length + " tiles, side " + info.side + ", hole " + (missed ? missed.join(",") : "none"));
});

if (failed) {
  console.error(failed + " check(s) failed");
  process.exit(1);
}
console.log("All mathematics and tiling checks passed.");
