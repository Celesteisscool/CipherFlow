/* Transposition cipher helpers (dCode family) ------------------------------------
 * Embedded into the worker module by dev/dcode/payload.mjs, after runtime.js.
 */

/* ------------------------------------------------------------ columnar transposition
 * `complete` = false writes the text row-wise and simply omits the empty cells of
 * the last row (dCode's "Transposition Cipher"); `complete` = true pads the last
 * row with the filler so every column has the same height (dCode's "Columnar
 * Transposition"). Both read the columns in keyword order.
 */
function transColumnSizes(text, width, complete) {
    const len = String(text).length;
    const rows = Math.ceil(len / width) || 1;
    const sizes = [];
    for (let c = 0; c < width; c++) {
        let size = rows;
        if (!complete) {
            const short = rows * width - len;
            size = rows - (c >= width - short ? 1 : 0);
        }
        sizes.push(Math.max(0, size));
    }
    return sizes;
}
function transColumnarEncode(text, key, filler, complete) {
    const width = key.length;
    if (!width) throw new Error("The key must have at least one character.");
    const source = complete ? cfPad(String(text), width, filler) : String(text);
    const rows = cfFillRows(source, width, filler);
    return cfReadColumns(rows, cfKeyOrder(key));
}
function transColumnarDecode(cipher, key, filler, complete) {
    const width = key.length;
    if (!width) throw new Error("The key must have at least one character.");
    const sizes = transColumnSizes(cipher, width, complete);
    const order = cfKeyOrder(key);
    // Hand the ciphertext to the columns in the same order they were read out.
    const columns = new Array(width).fill("");
    let at = 0;
    for (const col of order) {
        columns[col] = String(cipher).slice(at, at + sizes[col]);
        at += sizes[col];
    }
    const rows = Math.max(...sizes);
    let out = "";
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < width; c++) out += columns[c][r] == null ? "" : columns[c][r];
    }
    // A padded rectangle carries filler at the end of the last row.
    if (complete && filler) {
        while (out.length && out.endsWith(filler)) out = out.slice(0, -1);
    }
    return out;
}

// Parse a cut sequence such as "1,2" (AMSCO).
function cfCuts(value) {
    const cuts = String(value == null ? "" : value).split(/[^0-9]+/).filter(Boolean).map(Number).filter(n => n > 0);
    return cuts.length ? cuts : [1, 2];
}

/* ------------------------------------------------------------ AMSCO
 * Row-wise fill where the cell sizes cycle through the cut sequence (1,2 by
 * default), columns then read in keyword order.
 */
function amscoLayout(width, length, cuts) {
    const cells = [];
    let remaining = length;
    let i = 0;
    while (remaining > 0) {
        const row = Math.floor(i / width);
        const col = i % width;
        const size = Math.min(cuts[i % cuts.length], remaining);
        cells.push({row, col, size});
        remaining -= size;
        i++;
        if (i % width === 0 && remaining <= 0) break;
    }
    return cells;
}
function amscoEncode(text, key, cuts, filler) {
    const width = key.length;
    if (!width) throw new Error("The key must have at least one character.");
    const source = String(text);
    const cells = amscoLayout(width, source.length, cuts);
    const grid = [];
    let at = 0;
    for (const cell of cells) {
        grid[cell.row] = grid[cell.row] || [];
        grid[cell.row][cell.col] = source.substr(at, cell.size);
        at += cell.size;
    }
    const order = cfKeyOrder(key);
    const rows = grid.length;
    let out = "";
    for (const col of order) {
        for (let r = 0; r < rows; r++) out += grid[r] && grid[r][col] ? grid[r][col] : "";
    }
    return out;
}
function amscoDecode(cipher, key, cuts, filler) {
    const width = key.length;
    const len = String(cipher).length;
    const cells = amscoLayout(width, len, cuts);
    const order = cfKeyOrder(key);
    const rows = cells.length ? Math.max(...cells.map(c => c.row)) + 1 : 0;
    const grid = Array.from({length: rows}, () => new Array(width).fill(""));
    let at = 0;
    for (const col of order) {
        for (let r = 0; r < rows; r++) {
            const cell = cells.find(c => c.row === r && c.col === col);
            if (!cell || at >= len) continue;
            grid[r][col] = String(cipher).substr(at, cell.size);
            at += cell.size;
        }
    }
    let out = "";
    for (let r = 0; r < rows; r++) for (let c = 0; c < width; c++) out += grid[r][c];
    return out;
}

/* ------------------------------------------------------------ Redefence
 * Zig-zag across `rails` rails, then emit the rails in alphabetical order of the
 * key letters.
 */
function redefenceRails(text, rails) {
    const buckets = Array.from({length: rails}, () => "");
    let rail = 0;
    let step = 1;
    for (const ch of String(text)) {
        buckets[rail] += ch;
        if (rails > 1) {
            rail += step;
            if (rail === rails - 1 || rail === 0) step = -step;
        }
    }
    return buckets;
}
function redefenceEncode(text, key) {
    const letters = String(key).toUpperCase().split("");
    if (!letters.length) throw new Error("The key must have at least one letter.");
    const buckets = redefenceRails(text, letters.length);
    return cfKeyOrder(key).map(rail => buckets[rail]).join("");
}
function redefenceDecode(cipher, key) {
    const letters = String(key).toUpperCase().split("");
    if (!letters.length) throw new Error("The key must have at least one letter.");
    const railLengths = redefenceRails(cipher, letters.length).map(bucket => bucket.length);
    const buckets = new Array(letters.length).fill("");
    let at = 0;
    for (const rail of cfKeyOrder(key)) {
        buckets[rail] = String(cipher).slice(at, at + railLengths[rail]);
        at += railLengths[rail];
    }
    const cursors = new Array(letters.length).fill(0);
    let out = "";
    let rail = 0;
    let step = 1;
    for (let i = 0; i < String(cipher).length; i++) {
        out += buckets[rail][cursors[rail]++];
        if (letters.length > 1) {
            rail += step;
            if (rail === letters.length - 1 || rail === 0) step = -step;
        }
    }
    return out;
}

/* ------------------------------------------------------------ Skip
 * Take every `skip`-th character from `start`, wrapping around the text.
 */
function skipOrder(length, skip, start) {
    const taken = new Set();
    const order = [];
    let at = cfMod(start, length);
    let guard = 0;
    while (order.length < length && guard++ < length * length + 10) {
        if (!taken.has(at)) {
            taken.add(at);
            order.push(at);
        }
        let next = cfMod(at + skip, length);
        // When the step does not divide the text evenly, walk on to the next free slot.
        let scanned = 0;
        while (taken.has(next) && scanned++ < length) next = cfMod(next + 1, length);
        at = next;
    }
    return order;
}
function skipEncode(text, skip, start) {
    if (skip < 1) throw new Error("The skip value must be at least 1.");
    const order = skipOrder(String(text).length, skip, start);
    return order.map(i => String(text)[i]).join("");
}
function skipDecode(cipher, skip, start) {
    if (skip < 1) throw new Error("The skip value must be at least 1.");
    const order = skipOrder(String(cipher).length, skip, start);
    const out = new Array(String(cipher).length).fill("");
    order.forEach((source, i) => { out[source] = String(cipher)[i]; });
    return out.join("");
}

/* ------------------------------------------------------------ Scytale
 * Write the message in rows of `turns` letters and read down the columns.
 */
function scytaleEncode(text, turns, filler) {
    if (turns < 1) throw new Error("The number of turns must be at least 1.");
    const rows = cfFillRows(text, turns, filler);
    let out = "";
    for (let c = 0; c < turns; c++) for (const row of rows) if (row[c] != null) out += row[c];
    return out;
}
function scytaleDecode(cipher, turns, filler) {
    if (turns < 1) throw new Error("The number of turns must be at least 1.");
    const len = String(cipher).length;
    const rows = Math.ceil(len / turns) || 1;
    const columns = [];
    let at = 0;
    for (let c = 0; c < turns; c++) {
        const size = Math.min(rows, len - at);
        columns.push(String(cipher).substr(at, size));
        at += size;
    }
    let out = "";
    for (let r = 0; r < rows; r++) for (let c = 0; c < turns; c++) out += columns[c][r] == null ? "" : columns[c][r];
    if (filler) while (out.endsWith(filler)) out = out.slice(0, -1);
    return out;
}

/* ------------------------------------------------------------ Spiral
 * Write the message along an inward spiral from a corner, then read the grid in
 * the chosen order (columns by default, matching dCode's worked example).
 */
function spiralPath(size, direction, corner) {
    // Which of the four rotated walks to use for the chosen corner.
    let path = [];
    const gridSeen = Array.from({length: size}, () => new Array(size).fill(false));
    let top = 0, bottom = size - 1, left = 0, right = size - 1;
    while (top <= bottom && left <= right) {
        for (let c = left; c <= right; c++) path.push([top, c]);
        for (let r = top + 1; r <= bottom; r++) path.push([r, right]);
        if (top < bottom) for (let c = right - 1; c >= left; c--) path.push([bottom, c]);
        if (left < right) for (let r = bottom - 1; r > top; r--) path.push([r, left]);
        top++, bottom--, left++, right--;
    }
    if (direction === "Counter-clockwise") {
        // Rewalk the same ring pattern but mirrored: rotate the walk anticlockwise.
        path = [];
        let t = 0, b = size - 1, l = 0, r2 = size - 1;
        while (t <= b && l <= r2) {
            for (let row = t; row <= b; row++) path.push([row, l]);
            for (let c = l + 1; c <= r2; c++) path.push([b, c]);
            if (l < r2) for (let row = b - 1; row >= t; row--) path.push([row, r2]);
            if (t < b) for (let c = r2 - 1; c > l; c--) path.push([t, c]);
            t++, b--, l++, r2--;
        }
    }
    if (corner === "Top right") path = path.map(([r, c]) => [c, size - 1 - r]);
    else if (corner === "Bottom right") path = path.map(([r, c]) => [size - 1 - r, size - 1 - c]);
    else if (corner === "Bottom left") path = path.map(([r, c]) => [size - 1 - c, r]);
    return path;
}
function spiralEncode(text, direction, corner, readOrder, filler) {
    const source = String(text);
    const size = Math.max(1, Math.ceil(Math.sqrt(source.length)));
    const path = spiralPath(size, direction, corner);
    const grid = Array.from({length: size}, () => new Array(size).fill(filler));
    path.forEach(([r, c], i) => { if (i < source.length && grid[r][c] != null) grid[r][c] = source[i]; });
    let out = "";
    if (readOrder === "Rows") {
        for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) out += grid[r][c];
    } else {
        for (let c = 0; c < size; c++) for (let r = 0; r < size; r++) out += grid[r][c];
    }
    return out;
}
function spiralDecode(cipher, direction, corner, readOrder, filler) {
    const source = String(cipher);
    // Same square as the encoder, and never more cells than there are characters: a
    // ciphertext that is not a perfect square must not leave holes in the grid.
    const size = Math.max(1, Math.ceil(Math.sqrt(source.length)));
    const grid = Array.from({length: size}, () => new Array(size).fill(null));
    let at = 0;
    const place = (r, c) => { if (at < source.length) grid[r][c] = source[at++]; };
    if (readOrder === "Rows") {
        for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) place(r, c);
    } else {
        for (let c = 0; c < size; c++) for (let r = 0; r < size; r++) place(r, c);
    }
    const path = spiralPath(size, direction, corner);
    let out = "";
    for (const [r, c] of path) if (grid[r][c] != null) out += grid[r][c];
    if (filler) while (out.endsWith(filler)) out = out.slice(0, -1);
    return out;
}

/* ------------------------------------------------------------ Turning grille
 * A mask of holes is rotated a quarter turn four times; the message fills the
 * visible cells in reading order, then the grid is read row-wise.
 */
function grilleMask(text, rotation) {
    const lines = String(text || "").split(/[\s|/]+/).filter(Boolean).map(line => line.replace(/[^#.▮▯]/g, ""));
    if (lines.length < 2 || lines.some(line => line.length !== lines.length)) {
        throw new Error("The grille must be a square mask using # for holes and . for closed cells.");
    }
    const size = lines.length;
    const holes = new Set();
    lines.forEach((line, r) => line.split("").forEach((ch, c) => { if (ch === "#") holes.add(r * size + c); }));
    const rotations = [holes];
    let current = holes;
    for (let i = 1; i < 4; i++) {
        const next = new Set();
        const cw = rotation !== "Counter-clockwise";
        for (const idx of current) {
            const r = Math.floor(idx / size);
            const c = idx % size;
            next.add((cw ? c : size - 1 - c) * size + (cw ? size - 1 - r : r));
        }
        rotations.push(next);
        current = next;
    }
    const seen = new Set();
    for (const set of rotations) for (const idx of set) seen.add(idx);
    if (seen.size !== size * size) {
        throw new Error("This grille does not expose every cell exactly once over four rotations, so it cannot be used.");
    }
    return rotations;
}
function grilleSize(mask) {
    const lines = String(mask || "").split(/[\s|/]+/).filter(Boolean);
    return lines.length;
}
function grilleEncode(text, mask, rotation, filler) {
    const rotations = grilleMask(mask, rotation);
    const size = grilleSize(mask);
    const capacity = size * size;
    if (String(text).length > capacity) {
        throw new Error(`This ${size}x${size} grille holds ${capacity} characters, but the input has ${String(text).length}.`);
    }
    const source = String(text).padEnd(capacity, filler);
    const grid = new Array(size * size).fill(filler);
    let at = 0;
    for (const holes of rotations) {
        const ordered = [...holes].sort((a, b) => a - b);
        for (const idx of ordered) grid[idx] = source[at++];
    }
    return grid.join("");
}
function grilleDecode(cipher, mask, rotation, filler) {
    const rotations = grilleMask(mask, rotation);
    const size = grilleSize(mask);
    const source = String(cipher);
    const grid = new Array(size * size).fill("");
    for (let i = 0; i < grid.length; i++) grid[i] = source[i] == null ? filler : source[i];
    let out = "";
    for (const holes of rotations) {
        const ordered = [...holes].sort((a, b) => a - b);
        for (const idx of ordered) out += grid[idx];
    }
    if (filler) while (out.endsWith(filler)) out = out.slice(0, -1);
    return out;
}
