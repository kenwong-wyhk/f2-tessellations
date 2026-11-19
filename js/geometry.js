/* Regular tessellations.
   One regular n-gon tiles the plane only when copies meet at a point with no
   gap and no overlap: 360 degrees divided by the interior angle is an integer
   of at least 3. Interior angle = ((n - 2) / n) * 180 degrees, so that
   quotient is 2n / (n - 2). */
var TessMath = (function () {
  "use strict";

  var SIDES = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  var POLYGON_NAMES = {
    3: "Equilateral triangle",
    4: "Square",
    5: "Regular pentagon",
    6: "Regular hexagon",
    7: "Regular heptagon",
    8: "Regular octagon",
    9: "Regular nonagon",
    10: "Regular decagon",
    11: "Regular hendecagon",
    12: "Regular dodecagon",
  };

  var BOARD = { width: 860, height: 520, cx: 430, cy: 268, clipR: 230 };

  function gcd(a, b) {
    var x = Math.abs(a);
    var y = Math.abs(b);
    while (y !== 0) {
      var t = y;
      y = x % y;
      x = t;
    }
    return x === 0 ? 1 : x;
  }

  function formatFrac(num, den, suffix) {
    var g = gcd(num, den);
    var n = num / g;
    var d = den / g;
    if (d === 1) return "" + n + suffix;
    var whole = Math.floor(n / d);
    var rem = n - whole * d;
    if (whole === 0) return n + "/" + d + suffix;
    if (rem === 0) return "" + whole + suffix;
    return whole + " " + rem + "/" + d + suffix;
  }

  function interiorAngle(n) {
    return {
      deg: (180 * (n - 2)) / n,
      label: formatFrac(180 * (n - 2), n, "°"),
    };
  }

  function copiesAtVertex(n) {
    var num = 2 * n;
    var den = n - 2;
    var g = gcd(num, den);
    var a = num / g;
    var b = den / g;
    return {
      exact: num / den,
      label: b === 1 ? String(a) : a + "/" + b,
      integer: b === 1,
    };
  }

  function remainderAngle(n, placed) {
    var num = 360 * n - 180 * (n - 2) * placed;
    return {
      deg: num / n,
      label: formatFrac(num, n, "°"),
    };
  }

  function sideLength(n) {
    return n <= 6 ? 118 : 96;
  }

  function analyse(n) {
    if (SIDES.indexOf(n) === -1) {
      throw new Error("n must be an integer from 3 to 12");
    }
    var angle = interiorAngle(n);
    var copies = copiesAtVertex(n);
    var maxFit = Math.floor(copies.exact + 1e-10);
    var fits = copies.integer && copies.exact >= 3;
    return {
      n: n,
      angle: angle,
      copies: copies,
      maxFit: maxFit,
      fits: fits,
      gap: remainderAngle(n, maxFit),
      side: sideLength(n),
      Irad: ((n - 2) / n) * Math.PI,
    };
  }

  function angleSumLabel(n, placed) {
    return formatFrac(180 * (n - 2) * placed, n, "°");
  }

  function conclusion(n, placed) {
    var info = analyse(n);
    var name = POLYGON_NAMES[n].toLowerCase();
    if (placed === 0) {
      var article = n === 3 ? "an" : "a";
      return "The interior angle of " + article + " " + name + " is " + info.angle.label + ". Place copies around a point and add those angles.";
    }
    if (info.fits && placed >= info.maxFit) {
      return info.copies.label + " × " + info.angle.label + " = 360°. 360° is divisible by " + info.angle.label + ", so the polygons meet with no gap and no overlap.";
    }
    if (placed >= info.maxFit) {
      var sum = angleSumLabel(n, info.maxFit);
      var oneMore = angleSumLabel(n, info.maxFit + 1);
      return info.maxFit + " × " + info.angle.label + " = " + sum + ". 360° is not divisible by " + info.angle.label + ": a gap of " + info.gap.label + " is left. One more copy would be " + oneMore + ", which is more than 360° and would overlap.";
    }
    return "Running total: " + placed + " × " + info.angle.label + " = " + angleSumLabel(n, placed) + ". Still short of 360° by " + remainderAngle(n, placed).label + ".";
  }

  function sumLabel(n, placed) {
    if (placed === 0) return "0° of 360°";
    return angleSumLabel(n, placed) + " of 360°";
  }

  function subtitle(n, placed) {
    var info = analyse(n);
    return sumLabel(n, placed) + "   ·   360° ÷ " + info.angle.label + " = " + info.copies.label;
  }

  function boardCaption(fillPlane) {
    return fillPlane
      ? "Adjacent polygons never share the same colour"
      : "Each copy adds the same interior angle at the marked vertex";
  }

  function callout(n, placed) {
    var info = analyse(n);
    var text = conclusion(n, placed);
    if (placed === 0) return { tone: "info", lead: "Start here", text: text };
    if (info.fits && placed >= info.maxFit) return { tone: "success", lead: "It tessellates", text: text };
    if (placed >= info.maxFit) return { tone: "warning", lead: "It cannot tessellate", text: text };
    return { tone: "info", lead: "Keep adding", text: text };
  }

  function metrics(n) {
    var info = analyse(n);
    return [
      { label: "Interior angle", value: info.angle.label, detail: "", tone: "" },
      {
        label: "360° ÷ interior angle",
        value: info.copies.label,
        detail: info.copies.integer ? "an integer, at least 3" : "not an integer",
        tone: info.copies.integer ? "success" : "warning",
      },
      {
        label: info.fits ? "Angle sum at a point" : "After the last copy that fits",
        value: info.fits ? "360°" : info.gap.label + " gap",
        detail: info.fits
          ? info.copies.label + " polygons meet exactly"
          : info.maxFit + " × " + info.angle.label + " = " + angleSumLabel(n, info.maxFit),
        tone: info.fits ? "success" : "warning",
      },
    ];
  }

  function tableRow(n) {
    var info = analyse(n);
    var quotient = info.copies.integer
      ? info.copies.label
      : info.copies.label + "  (≈ " + info.copies.exact.toFixed(2) + ")";
    return {
      name: POLYGON_NAMES[n],
      n: String(n),
      interior: info.angle.label,
      quotient: quotient,
      tessellate: info.fits
        ? "Yes, " + info.copies.label + " meet at a point"
        : "No, gap " + info.gap.label,
      yes: info.fits,
    };
  }

  function polygonPoints(cx, cy, n, side, firstEdgeAngle) {
    var ext = (2 * Math.PI) / n;
    var pts = [];
    var x = cx;
    var y = cy;
    var ang = firstEdgeAngle;
    for (var i = 0; i < n; i++) {
      pts.push([x, y]);
      x += side * Math.cos(ang);
      y += side * Math.sin(ang);
      ang += ext;
    }
    return pts;
  }

  function pathFromPoints(pts) {
    var cmds = [];
    for (var i = 0; i < pts.length; i++) {
      cmds.push((i === 0 ? "M" : "L") + pts[i][0] + "," + pts[i][1]);
    }
    return cmds.join(" ") + " Z";
  }

  function arcPath(cx, cy, r, a0, a1) {
    var x0 = cx + r * Math.cos(a0);
    var y0 = cy + r * Math.sin(a0);
    var x1 = cx + r * Math.cos(a1);
    var y1 = cy + r * Math.sin(a1);
    var large = a1 - a0 > Math.PI ? 1 : 0;
    return "M " + cx + " " + cy + " L " + x0 + " " + y0 + " A " + r + " " + r + " 0 " + large + " 1 " + x1 + " " + y1 + " Z";
  }

  function sectorPath(cx, cy, r, a0, a1) {
    var span = a1 - a0;
    if (span >= Math.PI * 2 - 1e-6) {
      return "M " + cx + " " + (cy - r) +
        " A " + r + " " + r + " 0 1 1 " + cx + " " + (cy + r) +
        " A " + r + " " + r + " 0 1 1 " + cx + " " + (cy - r) + " Z";
    }
    return arcPath(cx, cy, r, a0, a1);
  }

  function mod2(n) {
    return ((n % 2) + 2) % 2;
  }

  function fourColor(i, j) {
    return mod2(i) + 2 * mod2(j);
  }

  function vertexColor(n, k) {
    if (n === 3) {
      var tri = [2, 0, 3, 1, 3, 0];
      return tri[k] !== undefined ? tri[k] : k % 4;
    }
    if (n === 4) {
      var sq = [0, 1, 3, 2];
      return sq[k] !== undefined ? sq[k] : k % 4;
    }
    if (n === 6) {
      var hex = [0, 1, 2];
      return hex[k] !== undefined ? hex[k] : k % 4;
    }
    return k % 4;
  }

  function vertexTiles(n, cx, cy, side, start, count) {
    var I = ((n - 2) / n) * Math.PI;
    var tiles = [];
    for (var k = 0; k < count; k++) {
      var pts = polygonPoints(cx, cy, n, side, start + k * I);
      tiles.push({ d: pathFromPoints(pts), color: vertexColor(n, k), pts: pts });
    }
    return tiles;
  }

  function planeTiles(n, cx, cy, side, width, height) {
    var paths = [];

    function inView(pts) {
      var minX = Infinity;
      var minY = Infinity;
      var maxX = -Infinity;
      var maxY = -Infinity;
      for (var p = 0; p < pts.length; p++) {
        var x = pts[p][0];
        var y = pts[p][1];
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
      return maxX >= 0 && minX <= width && maxY >= 0 && minY <= height;
    }

    function push(pts, color) {
      if (!inView(pts)) return;
      paths.push({ d: pathFromPoints(pts), color: color, pts: pts });
    }

    var i;
    var j;
    if (n === 4) {
      for (i = -8; i <= 7; i++) {
        for (j = -8; j <= 7; j++) {
          var x0 = cx + i * side;
          var y0 = cy + j * side;
          push([
            [x0, y0],
            [x0 + side, y0],
            [x0 + side, y0 + side],
            [x0, y0 + side],
          ], fourColor(i, j));
        }
      }
      return paths;
    }

    if (n === 3) {
      var h = side * Math.sqrt(3) / 2;
      for (j = -10; j <= 10; j++) {
        for (i = -10; i <= 10; i++) {
          var tx = cx + i * side + j * side * 0.5;
          var ty = cy + j * h;
          push([
            [tx, ty],
            [tx + side, ty],
            [tx + side / 2, ty - h],
          ], mod2(i + j));
          push([
            [tx, ty],
            [tx + side, ty],
            [tx + side / 2, ty + h],
          ], 2 + mod2(i + j));
        }
      }
      return paths;
    }

    if (n === 6) {
      var v1x = 1.5 * side;
      var v1y = (side * Math.sqrt(3)) / 2;
      var v2y = side * Math.sqrt(3);
      var c0x = cx + side / 2;
      var c0y = cy + (side * Math.sqrt(3)) / 2;
      for (j = -8; j <= 8; j++) {
        for (i = -8; i <= 8; i++) {
          var hx = c0x + i * v1x;
          var hy = c0y + i * v1y + j * v2y;
          var pts = [];
          for (var k = 0; k < 6; k++) {
            var a = k * (Math.PI / 3);
            pts.push([hx + side * Math.cos(a), hy + side * Math.sin(a)]);
          }
          push(pts, fourColor(i, j));
        }
      }
      return paths;
    }

    throw new Error("Plane filling is only defined for n = 3, 4 and 6.");
  }

  return {
    SIDES: SIDES,
    POLYGON_NAMES: POLYGON_NAMES,
    BOARD: BOARD,
    gcd: gcd,
    formatFrac: formatFrac,
    interiorAngle: interiorAngle,
    copiesAtVertex: copiesAtVertex,
    remainderAngle: remainderAngle,
    angleSumLabel: angleSumLabel,
    analyse: analyse,
    conclusion: conclusion,
    sumLabel: sumLabel,
    subtitle: subtitle,
    boardCaption: boardCaption,
    callout: callout,
    metrics: metrics,
    tableRow: tableRow,
    polygonPoints: polygonPoints,
    pathFromPoints: pathFromPoints,
    arcPath: arcPath,
    sectorPath: sectorPath,
    fourColor: fourColor,
    vertexColor: vertexColor,
    vertexTiles: vertexTiles,
    planeTiles: planeTiles,
    sideLength: sideLength,
  };
})();
