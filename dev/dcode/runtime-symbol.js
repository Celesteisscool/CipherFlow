/* Symbol-cipher runtime -------------------------------------------------------
 * Shared by dev/dcode/ops-symbol.mjs. Plain script: embedded in the generated
 * worker module (see dev/dcode/payload.mjs), so it may not import anything.
 *
 * Encoding writes each glyph as U+E000 + its 1-based index, the same placeholder
 * scheme the canvas symbol nodes use. Decoding maps those code points back to the
 * glyph's label. Characters with no glyph pass through unchanged.
 */

var CF_SYMBOL_BASE = 0xE000;
var CF_SYMBOL_MAX_INDEX = 0xFF;

function cfSymbolEntry(slug) {
    if (typeof CF_SYMBOL_TABLE === "undefined" || !CF_SYMBOL_TABLE) return null;
    return CF_SYMBOL_TABLE[String(slug)] || null;
}

function cfSymbolKeys(entry) {
    var keys = [];
    for (var i = 0; i < entry.glyphs.length; i++) {
        var row = entry.glyphs[i]; // [key, label, index]
        if (!row[0]) continue;
        keys.push({key: row[0], index: row[2], order: i});
    }
    // Longest key first so a digraph wins over its letters. The order tie-break
    // keeps homophones in catalogue order, which is the documented lowest-index
    // rule used when encoding a letter that has several glyphs.
    keys.sort(function (a, b) {
        if (b.key.length !== a.key.length) return b.key.length - a.key.length;
        return a.order - b.order;
    });
    return keys;
}

function cfSymbolEncode(text, slug) {
    var entry = cfSymbolEntry(slug);
    var source = String(text == null ? "" : text);
    if (!entry) return source;
    var keys = cfSymbolKeys(entry);
    var out = "";
    var i = 0;
    while (i < source.length) {
        var hit = null;
        for (var k = 0; k < keys.length; k++) {
            var key = keys[k].key;
            if (i + key.length > source.length) continue;
            var part = source.slice(i, i + key.length);
            if (entry.caseSensitive ? part === key : part.toLowerCase() === key.toLowerCase()) {
                hit = keys[k];
                break;
            }
        }
        if (hit) {
            out += String.fromCharCode(CF_SYMBOL_BASE + hit.index);
            i += hit.key.length;
        } else {
            out += source.charAt(i);
            i++;
        }
    }
    return out;
}

function cfSymbolDecode(text, slug) {
    var entry = cfSymbolEntry(slug);
    var source = String(text == null ? "" : text);
    if (!entry) return source;
    var byCode = {};
    for (var i = 0; i < entry.glyphs.length; i++) {
        var row = entry.glyphs[i];
        if (row[2] <= CF_SYMBOL_MAX_INDEX) {
            // ␣ is the printed label for a space glyph; decode it back to a space.
            var label = row[1] || row[0];
            byCode[CF_SYMBOL_BASE + row[2]] = label === "␣" ? " " : label;
        }
    }
    var out = "";
    for (var ch of source) {
        var replacement = byCode[ch.codePointAt(0)];
        out += replacement !== undefined ? replacement : ch;
    }
    return out;
}
