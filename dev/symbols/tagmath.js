/* Symbol-cipher tags: the vocabulary, and the measurements behind it.
 *
 * The wand used to answer "which alphabet is this?" by comparing every cell of the picture
 * against all ~3,500 shipped glyphs. That only works when the picture is clean art at the
 * size the source drew it: a screenshot put the glyphs on white tiles, a photo put them on
 * paper, and a lower-case variant of the same alphabet scored near zero. A tag asks a much
 * coarser question — is the ink thin? are the strokes straight? is it one colour? — and a
 * coarse answer survives all three.
 *
 * ONE copy of this file, used by both sides:
 *   - dev/build.mjs inlines it into index.html as `CFTAGS`, before the app script.
 *   - dev/symbols/tags.mjs requires it at build time to tag the shipped art.
 * The measurements are the same code, which is the whole point: a tag written on a picture
 * and a tag written on the art have to mean the same thing, or filtering by them is noise.
 *
 * Input contract, always a 32x32 ink grid (row-major, 0..1 density) with the mark centred
 * and its aspect preserved — what `gridFromMask` writes for art, and what the app's
 * `detectDensity` writes for a cell in a photograph.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module && module.exports) module.exports = api;
    else root.CFTAGS = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    // 32 rather than 24: the tags are read off the outline, and at 24 a hairline symbol
    // zigzags between cells enough to look bent. Measured over a hand-labelled sample, 32
    // separates straight drawings (median 0.64) from curved ones (median 0.36) with a gap;
    // 24 left them overlapping.
    const GRID = 32;
    // A cell counts as ink above this density.
    const INK = 0.5;

    const TAG_LABELS = {
        "thin": "Thin",
        "bold": "Bold",
        "straight": "Straight",
        "curved": "Curved",
        "dots": "Dots",
        "pixels": "Pixels",
        "filled": "Filled",
        "monochrome": "Monochrome",
        "coloured": "Coloured"
    };
    /* The whole vocabulary, in the groups the pills are drawn from. Every tag here is
       something you can see in the drawing — nothing that would need the plaintext to
       decide. Inside a group the tags are mutually exclusive: a drawing is Thin or Bold,
       never both, so a pill releases its alternatives when it is chosen. A group of one is
       simply independent. */
    const TAG_GROUPS = [
        ["thin", "bold"],
        ["straight", "curved"],
        ["dots"],
        ["pixels"],
        ["filled"],
        ["monochrome", "coloured"]
    ];
    const TAG_ORDER = TAG_GROUPS.reduce((all, group) => all.concat(group), []);

    /* Thresholds, as fractions of the drawing's own box so they do not depend on how big
       the picture is. They are deliberately loose: a tag that is right nine times in ten is
       a useful filter, and one that is right six times in ten is still better than the shape
       matching this replaces. */
    const LIMITS = {
        thin: 0.095,       // stroke width / symbol size
        bold: 0.13,
        straight: 0.45,    // share of the outline that runs along drawn lines
        curved: 0.30,
        dots: 2,           // separate marks per symbol
        compact: 0.6,      // share of the ink sitting in round, compact marks
        block: 2,          // coarsest pixel grid a symbol still reconstructs on
        filled: 0.60,      // ink share inside the drawing's own box
        chroma: 0.3        // share of the ink that carries hue
    };

    /** Pixels to ink: visible, and not the white plate the sources draw on. */
    function maskFromRgba(data, w, h) {
        const mask = new Uint8Array(w * h);
        let ink = 0, coloured = 0;
        for (let i = 0, p = 0; i < w * h; i++, p += 4) {
            if (data[p + 3] <= 16) continue;
            const r = data[p], g = data[p + 1], b = data[p + 2];
            if (Math.min(r, g, b) >= 200) continue;
            mask[i] = 1;
            ink++;
            if (Math.max(r, g, b) - Math.min(r, g, b) > 40) coloured++;
        }
        return {mask, w, h, chroma: ink ? coloured / ink : 0};
    }

    /**
     * An ink mask reduced to the 24x24 grid every measurement reads. The mask is cropped to
     * its own bounding box first and scaled by a single factor, so a tall symbol and a wide
     * one are both measured against their own size rather than against the frame someone
     * photographed them in.
     */
    function gridFromMask(mask, w, h) {
        const out = new Float32Array(GRID * GRID);
        let x0 = w, y0 = h, x1 = -1, y1 = -1;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (!mask[y * w + x]) continue;
                if (x < x0) x0 = x;
                if (x > x1) x1 = x;
                if (y < y0) y0 = y;
                if (y > y1) y1 = y;
            }
        }
        if (x1 < 0) return out;
        const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
        const scale = Math.min(GRID / bw, GRID / bh);
        const dw = Math.max(1, Math.round(bw * scale));
        const dh = Math.max(1, Math.round(bh * scale));
        const ox = Math.floor((GRID - dw) / 2);
        const oy = Math.floor((GRID - dh) / 2);
        for (let ty = 0; ty < dh; ty++) {
            const sy0 = y0 + Math.floor((ty * bh) / dh);
            const sy1 = Math.min(y0 + bh, Math.max(y0 + Math.floor(((ty + 1) * bh) / dh), sy0 + 1));
            for (let tx = 0; tx < dw; tx++) {
                const sx0 = x0 + Math.floor((tx * bw) / dw);
                const sx1 = Math.min(x0 + bw, Math.max(x0 + Math.floor(((tx + 1) * bw) / dw), sx0 + 1));
                let ink = 0, total = 0;
                for (let y = sy0; y < sy1; y++) {
                    for (let x = sx0; x < sx1; x++) {
                        ink += mask[y * w + x];
                        total++;
                    }
                }
                out[(oy + ty) * GRID + (ox + tx)] = total ? ink / total : 0;
            }
        }
        return out;
    }

    /** Distance from every ink cell to the nearest background cell. */
    function distanceTransform(bin, w, h) {
        const INF = 1e6;
        const d = new Float64Array(w * h);
        for (let i = 0; i < d.length; i++) d[i] = bin[i] ? INF : 0;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = y * w + x;
                if (!bin[i]) continue;
                let v = d[i];
                if (x > 0 && d[i - 1] + 1 < v) v = d[i - 1] + 1;
                if (y > 0 && d[i - w] + 1 < v) v = d[i - w] + 1;
                if (x > 0 && y > 0 && d[i - w - 1] + 1.4142 < v) v = d[i - w - 1] + 1.4142;
                if (x < w - 1 && y > 0 && d[i - w + 1] + 1.4142 < v) v = d[i - w + 1] + 1.4142;
                d[i] = v;
            }
        }
        for (let y = h - 1; y >= 0; y--) {
            for (let x = w - 1; x >= 0; x--) {
                const i = y * w + x;
                if (!bin[i]) continue;
                let v = d[i];
                if (x < w - 1 && d[i + 1] + 1 < v) v = d[i + 1] + 1;
                if (y < h - 1 && d[i + w] + 1 < v) v = d[i + w] + 1;
                if (x < w - 1 && y < h - 1 && d[i + w + 1] + 1.4142 < v) v = d[i + w + 1] + 1.4142;
                if (x > 0 && y < h - 1 && d[i + w - 1] + 1.4142 < v) v = d[i + w - 1] + 1.4142;
                d[i] = v;
            }
        }
        return d;
    }

    /** How well the mark survives being re-drawn on a coarse block grid (pixel art does). */
    function blockIoU(bin, w, h, b) {
        let inter = 0, uni = 0;
        for (let by = 0; by < h; by += b) {
            for (let bx = 0; bx < w; bx += b) {
                let ink = 0, total = 0;
                for (let y = by; y < Math.min(h, by + b); y++) {
                    for (let x = bx; x < Math.min(w, bx + b); x++) {
                        ink += bin[y * w + x];
                        total++;
                    }
                }
                const on = ink * 2 >= total;
                for (let y = by; y < Math.min(h, by + b); y++) {
                    for (let x = bx; x < Math.min(w, bx + b); x++) {
                        const v = bin[y * w + x];
                        if (on) {
                            uni++;
                            if (v) inter++;
                        } else if (v) uni++;
                    }
                }
            }
        }
        return uni ? inter / uni : 0;
    }

    /**
     * How much of the drawing's outline lies on straight runs. Every outline point votes for
     * lines at sixteen angles, and a line only counts when the points on it span a good part
     * of the symbol: a side of a square, a diagonal stroke, a bar of a barcode all do, while
     * an arc or a ring can only ever offer a short stretch and never counts. Returns the share
     * of outline covered, 0..1.
     *
     * The line has to be long because that is what separates the two shapes at this size: a
     * circle's outline stays within a pixel of a tangent for only a few cells, a drawn edge
     * stays on it for its whole length. An earlier version compared each point's direction a
     * few cells back with a few cells ahead, which is noisy on hairline art — it called a
     * matoran ring straight and an identical bynar ring curved.
     */
    function strokeStraightness(bin, w, h) {
        const at = (x, y) => x >= 0 && y >= 0 && x < w && y < h && bin[y * w + x] === 1;
        const pts = [];
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (!at(x, y)) continue;
                if (at(x - 1, y) && at(x + 1, y) && at(x, y - 1) && at(x, y + 1)) continue;
                pts.push([x, y]);
            }
        }
        if (pts.length < 8) return 0;
        const used = new Uint8Array(pts.length);
        // A line has to span a good part of the symbol to count as a drawn edge — that is
        // what an arc cannot do. A symbol much taller than it is wide cannot demand a line
        // longer than its own width, though: the horizontal sides of a blocky glyph are only
        // as long as the glyph is wide, and asking for more called Antiker's bars "curved".
        // How far off a line a cell may sit and still be on it: a drawn edge lays itself on
        // a 32-cell grid as a staircase that wobbles by half a cell, an arc leaves the line
        // for good once it has gone a few cells.
        const RHO = 1;
        let need = Math.max(8, 0.42 * Math.max(w, h));
        if (Math.min(w, h) >= 10) need = Math.min(need, 0.6 * Math.min(w, h));
        const ANGLES = 12;
        let covered = 0;
        for (let pass = 0; pass < 10; pass++) {
            let bestList = null, bestCount = 0;
            for (let a = 0; a < ANGLES; a++) {
                const ang = (Math.PI * a) / ANGLES;
                const cos = Math.cos(ang), sin = Math.sin(ang);
                const bins = new Map();
                for (let i = 0; i < pts.length; i++) {
                    if (used[i]) continue;
                    const rho = Math.round((pts[i][0] * cos + pts[i][1] * sin) / RHO);
                    const list = bins.get(rho);
                    if (list) list.push(i);
                    else bins.set(rho, [i]);
                }
                for (const list of bins.values()) {
                    if (list.length <= bestCount) continue;
                    // The points have to be an unbroken run: two arcs on opposite sides of a
                    // ring lie on one line but are not a drawn edge, so only a stretch with
                    // no gaps in it counts as one.
                    const along = list.map(i => ({t: -pts[i][0] * sin + pts[i][1] * cos, i}))
                        .sort((a, b) => a.t - b.t);
                    let run = [], best = [];
                    for (const point of along) {
                        if (run.length && point.t - run[run.length - 1].t > 2) {
                            if (run.length > best.length) best = run;
                            run = [];
                        }
                        run.push(point);
                    }
                    if (run.length > best.length) best = run;
                    if (best.length <= bestCount) continue;
                    if (best[best.length - 1].t - best[0].t + 1 < need) continue;
                    bestList = best.map(point => point.i);
                    bestCount = best.length;
                }
            }
            if (!bestList || bestCount < 4) break;
            for (const i of bestList) used[i] = 1;
            covered += bestCount;
        }
        return covered / pts.length;
    }

    /**
     * A grid reduced to the handful of numbers the tags are read from. Everything is
     * relative to the drawing's own box, so the same symbol photographed large and small
     * measures the same.
     *
     *   ink       how much of the box is covered
     *   stroke    thickness of the mark, as a fraction of the symbol's larger side
     *   flat      share of the outline that runs straight at the scale of a stroke
     *   blobs     separate marks the symbol is drawn with
     *   compact   share of the ink sitting in round, compact marks (Braille, Dotsies)
     *   block     the coarsest block grid the mark still reproduces on, or 0. The test starts
     *             at 2 because a 24-cell grid cannot resolve a finer step, so a mark that
     *             survives it is built out of blocks rather than stroked
     *   chroma    share of the ink carrying hue
     */
    function featuresFromGrid(grid, chroma) {
        const zero = {ink: 0, stroke: 0, flat: 0, blobs: 0, compact: 0, block: 0, chroma: 0, w: 0, h: 0};
        let x0 = GRID, y0 = GRID, x1 = -1, y1 = -1;
        for (let y = 0; y < GRID; y++) {
            for (let x = 0; x < GRID; x++) {
                if (grid[y * GRID + x] <= 0.02) continue;
                if (x < x0) x0 = x;
                if (x > x1) x1 = x;
                if (y < y0) y0 = y;
                if (y > y1) y1 = y;
            }
        }
        if (x1 < 0) return zero;
        const w = x1 - x0 + 1, h = y1 - y0 + 1;
        const sub = new Float32Array(w * h);
        const bin = new Uint8Array(w * h);
        let ink = 0;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const v = grid[(y0 + y) * GRID + x0 + x];
                sub[y * w + x] = v;
                ink += v;
                if (v >= INK) bin[y * w + x] = 1;
            }
        }
        ink /= w * h;
        const size = Math.max(w, h);

        // Stroke: twice the mean depth of the ink is the width of the mark it is drawn with.
        // The grid is ringed with background first, so a solid fill — where no cell of the
        // crop is empty — has an outside to measure from instead of depth INFINITY, which is
        // what made Hexahue and Lunar "Bold" with a stroke of 83333.
        const padded = new Uint8Array((w + 2) * (h + 2));
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) padded[(y + 1) * (w + 2) + x + 1] = bin[y * w + x];
        const depth = distanceTransform(padded, w + 2, h + 2);
        let depthSum = 0, depthCount = 0;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (!bin[y * w + x]) continue;
                depthSum += depth[(y + 1) * (w + 2) + x + 1];
                depthCount++;
            }
        }
        const stroke = depthCount ? Math.min(0.5, (2 * depthSum / depthCount) / (size + 2)) : 0;

        // Marks: count what the symbol is built from, and how much of it is a round mark.
        // Braille draws every dot of the cell — the empty positions too, just smaller — so
        // the test is shape, not size: a symbol built out of round marks is Dots whatever
        // the marks are called.
        let blobs = 0, markInk = 0, compactInk = 0;
        const seen = new Uint8Array(bin.length);
        const stack = new Int32Array(bin.length);
        for (let start = 0; start < bin.length; start++) {
            if (!bin[start] || seen[start]) continue;
            blobs++;
            let top = 0;
            stack[top++] = start;
            seen[start] = 1;
            let mx0 = start % w, mx1 = mx0, my0 = (start / w) | 0, my1 = my0, area = 0;
            while (top) {
                const p = stack[--top];
                area++;
                const px = p % w, py = (p / w) | 0;
                if (px < mx0) mx0 = px;
                if (px > mx1) mx1 = px;
                if (py < my0) my0 = py;
                if (py > my1) my1 = py;
                if (px > 0 && bin[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; stack[top++] = p - 1; }
                if (px < w - 1 && bin[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; stack[top++] = p + 1; }
                if (py > 0 && bin[p - w] && !seen[p - w]) { seen[p - w] = 1; stack[top++] = p - w; }
                if (py < h - 1 && bin[p + w] && !seen[p + w]) { seen[p + w] = 1; stack[top++] = p + w; }
            }
            const bw = mx1 - mx0 + 1, bh = my1 - my0 + 1;
            const aspect = bw / bh;
            // Round means round: a short diagonal stroke also has a square bounding box, so
            // the mark has to fill that box to count. A dot does, a line does not.
            const fill = area / (bw * bh);
            markInk += area;
            if (area <= Math.max(4, w * h * 0.25) && aspect >= 0.55 && aspect <= 1.8 && fill >= 0.6) compactInk += area;
        }
        const compact = markInk ? compactInk / markInk : 0;

        // Pixel art reproduces on a coarse block grid; smooth strokes do not.
        let block = 0;
        if (w >= 8 && h >= 8) {
            for (let b = 2; b <= 6 && !block; b++) if (blockIoU(bin, w, h, b) >= 0.9) block = b;
        }

        // Straight or curved: walk the outline of the ink and ask, at each point, whether the
        // line is still going the same way a couple of cells later. A side of a square, a
        // diagonal, a bar of a barcode all say yes; an arc, a ring, a curl all say no. This
        // replaces a histogram of edge directions, which could not tell a hexagon from a
        // circle — six straight sides spread the energy over six angles, so Hexahue's solid
        // squares and Blokscript's angular strokes both came out "curved".
        const flat = strokeStraightness(bin, w, h);

        return {ink, stroke, flat, blobs, compact, block, chroma: chroma || 0, w, h};
    }

    /** The tags one drawing carries: shape and ink, nothing about the plaintext. */
    function tagsFromFeatures(f) {
        const tags = [];
        if (!f || f.ink < 0.012) return tags;
        if (f.stroke <= LIMITS.thin) tags.push("thin");
        if (f.stroke >= LIMITS.bold) tags.push("bold");
        if (f.ink >= LIMITS.filled) tags.push("filled");
        if (f.flat >= LIMITS.straight) tags.push("straight");
        else if (f.flat <= LIMITS.curved) tags.push("curved");
        if (f.blobs >= LIMITS.dots && f.compact >= LIMITS.compact) tags.push("dots");
        if (f.block >= LIMITS.block) tags.push("pixels");
        if ((f.chroma || 0) >= LIMITS.chroma) tags.push("coloured");
        else tags.push("monochrome");
        return tags;
    }

    /** The other pills a tag releases when it is chosen; empty for a group of one. */
    function exclusiveOf(tag) {
        const group = TAG_GROUPS.find(list => list.includes(tag));
        return group ? group.filter(other => other !== tag) : [];
    }

    /** How many of a cipher's drawings carry each tag. */
    function countTags(perDrawing) {
        const lists = (perDrawing || []).filter(list => list && list.length);
        const counts = new Map();
        for (const list of lists) for (const tag of new Set(list)) counts.set(tag, (counts.get(tag) || 0) + 1);
        return {lists, counts};
    }

    /**
     * Those counts as shares of the cipher's own drawings — the graded form of its tag list.
     * A tag is put on a cipher at 45% of its drawings, so everything under that is a near
     * miss, and the share says how near: an alphabet whose drawings are 40% straight really
     * is nearly Straight even though the tag never made it onto the list. Counting tags
     * yes/no instead makes a picture with three tags answerable only as 100% or 67%.
     */
    function tagShares(perDrawing) {
        const out = {};
        for (const tag of TAG_ORDER) out[tag] = 0;
        const {lists, counts} = countTags(perDrawing);
        if (!lists.length) return out;
        for (const tag of TAG_ORDER) out[tag] = (counts.get(tag) || 0) / lists.length;
        return out;
    }

    /**
     * Many drawings, one answer. A tag belongs to the set when a good share of its glyphs
     * carry it, and inside a group the winner is the one with the larger share: a set drawn
     * in two stroke weights comes out as whichever most of it uses, never as both. Colour is
     * stricter both ways, so a few coloured glyphs do not make an alphabet Coloured.
     */
    function combineTags(perDrawing) {
        const {lists, counts} = countTags(perDrawing);
        if (!lists.length) return [];
        const out = new Set();
        for (const group of TAG_GROUPS) {
            let best = null, bestShare = 0;
            for (const tag of group) {
                const need = tag === "coloured" ? 0.6 : tag === "monochrome" ? 0.55 : 0.45;
                const share = (counts.get(tag) || 0) / lists.length;
                if (share >= need && share > bestShare) {
                    best = tag;
                    bestShare = share;
                }
            }
            if (best) out.add(best);
        }
        return TAG_ORDER.filter(tag => out.has(tag));
    }

    return {
        GRID,
        TAG_LABELS,
        TAG_ORDER,
        TAG_GROUPS,
        LIMITS,
        maskFromRgba,
        gridFromMask,
        featuresFromGrid,
        tagsFromFeatures,
        exclusiveOf,
        combineTags,
        tagShares
    };
});
