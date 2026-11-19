# Regular tessellations — Form 2

A static teaching page for WYHK Form 2 mathematics. Students place copies of one regular polygon around a point and test when the interior angles add to exactly 360°. Only the equilateral triangle, the square, and the regular hexagon pass, and those three can then fill the rectangle.

**Pages URL:** https://kenwong-wyhk.github.io/f2-tessellations/

There is no login, no analytics, and no student data. The page is HTML, CSS, and JavaScript in this repository. Opening it does not contact any other server.

## GitHub Pages

`.nojekyll` is included so Jekyll does not rewrite the site. Publish from the branch root. This pull request could not change repository settings, so turn the site on after merging:

1. **Settings → Pages → Build and deployment → Deploy from a branch**
2. Branch: `main`
3. Folder: `/ (root)`
4. Save.

On the repository home page, edit **About** and set:

- Description: `Form 2 interactive demo: which regular polygons tessellate the plane?`
- Website: `https://kenwong-wyhk.github.io/f2-tessellations/`

## Files

```
index.html          the page
css/style.css       light theme
css/fonts.css       self-hosted Oswald and Noto Sans HK
js/geometry.js      interior angles, the divisibility test, and the drawings
js/demo.js          the controls
vendor/fonts/       Latin subsets, SIL Open Font License 1.1
tools/check-math.js checks the table, the angle sums, and the plane filling
```

## Preview

Open `index.html` in a browser, or from this folder run:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000/ . To recheck the arithmetic:

```bash
node tools/check-math.js
```

## What students see

The interior angle of a regular n-sided polygon is ((n − 2) / n) × 180°. Copies tessellate the plane only when 360° ÷ that angle, which equals 2n / (n − 2), is an integer of at least 3.

| Polygon | At one point |
| --- | --- |
| Equilateral triangle | 6 × 60° = 360° |
| Square | 4 × 90° = 360° |
| Regular hexagon | 3 × 120° = 360° |
| Regular pentagon | 3 × 108° = 324°, so a gap of 36° is left |

The summary table on the page runs the same test for n = 3 to 12.
