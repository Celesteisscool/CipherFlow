/* Chess: the rules a Chess node needs, and nothing else.
 *
 * ONE copy of this file, used by both sides, the way dev/symbols/tagmath.js is:
 *   - dev/build.mjs inlines it into index.html as `CFCHESS`, before the app script.
 *   - dev/chess.test.mjs loads it directly to check the rules against known lines.
 *
 * The board is a 64-cell array, index = rank * 8 + file, with index 0 at a8 and 63 at h1 —
 * so the array reads the way the board is drawn, top row first. A state is plain data:
 * {board, turn, castling, ep, half, full}. Nothing here touches the DOM, and every function
 * that changes a position returns a new state rather than mutating the one it was given;
 * the node keeps the list of moves and replays it, so a state is never edited in place.
 *
 * Moves are {from, to, promo, flag}. `flag` is "castleK", "castleQ" or "ep" for the three
 * moves that do something other than move one piece and maybe take another.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module && module.exports) module.exports = api;
    else root.CFCHESS = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    const FILES = "abcdefgh";
    const START_FEN_PLACEMENT = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";

    const file = i => FILES[i % 8];
    const rank = i => 8 - Math.floor(i / 8);
    const squareName = i => file(i) + rank(i);
    const colourOf = p => (p === p.toUpperCase() ? "w" : "b");
    const other = c => (c === "w" ? "b" : "w");

    function squareIndex(name) {
        const m = /^([a-h])([1-8])$/.exec(String(name || "").trim().toLowerCase());
        if (!m) return -1;
        return (8 - Number(m[2])) * 8 + (FILES.indexOf(m[1]));
    }

    function boardFromPlacement(placement) {
        const board = new Array(64).fill(null);
        let i = 0;
        for (const ch of placement) {
            if (ch === "/") continue;
            if (/[1-8]/.test(ch)) { i += Number(ch); continue; }
            board[i++] = ch;
        }
        return board;
    }

    function start() {
        return {
            board: boardFromPlacement(START_FEN_PLACEMENT),
            turn: "w",
            castling: {K: true, Q: true, k: true, q: true},
            ep: -1,
            half: 0,
            full: 1
        };
    }

    /**
     * Can the side to move actually take on `ep`? Only then is the target part of the position:
     * a FEN naming an en passant square nobody can use is not the canonical record, and strict
     * readers reject it.
     */
    function epUsable(board, turn, ep) {
        if (ep < 0) return false;
        const pawn = turn === "w" ? "P" : "p";
        // The capturing pawn sits beside the pawn that just moved, one rank below the target
        // for White and one rank above it for Black — the target is the skipped square.
        const dr = turn === "w" ? 1 : -1;
        const left = at(ep, -1, dr);
        const right = at(ep, 1, dr);
        return (left >= 0 && board[left] === pawn) || (right >= 0 && board[right] === pawn);
    }

    /**
     * The FEN record at the start of `text`, or null when it does not start with one.
     * `rest` is whatever follows it, so "FEN then moves" reads as a position and the moves
     * played from it — the same text a Chess node's FEN output hands on.
     */
    function readFen(text) {
        const src = String(text || "").trim();
        const m = /^([rnbqkpRNBQKP1-8]+(?:\/[rnbqkpRNBQKP1-8]+){7})(?:[ \t]+([wb])(?:[ \t]+([KQkq]{1,4}|-)(?:[ \t]+([a-h][1-8]|-)(?:[ \t]+(\d+)(?:[ \t]+(\d+))?)?)?)?)?/.exec(src);
        if (!m) return null;
        // Eight ranks, each holding eight squares: anything else is not a position.
        const board = new Array(64).fill(null);
        let i = 0;
        for (const row of m[1].split("/")) {
            let width = 0;
            for (const ch of row) {
                if (/[1-8]/.test(ch)) {
                    i += Number(ch);
                    width += Number(ch);
                } else {
                    board[i++] = ch;
                    width++;
                }
            }
            if (width !== 8) return null;
        }
        const rights = m[3] || "-";
        const state = {
            board,
            turn: m[2] || "w",
            castling: {
                K: rights.includes("K"),
                Q: rights.includes("Q"),
                k: rights.includes("k"),
                q: rights.includes("q")
            },
            ep: m[4] && m[4] !== "-" ? squareIndex(m[4]) : -1,
            half: m[5] != null ? Number(m[5]) : 0,
            full: m[6] != null ? Number(m[6]) : 1
        };
        // An en passant square that cannot be taken on is dropped, so what this node reads in
        // is what it writes back out: the canonical record of the position.
        if (!epUsable(board, state.turn, state.ep)) state.ep = -1;
        return {state, rest: src.slice(m[0].length).trim()};
    }

    const clone = s => ({
        board: s.board.slice(),
        turn: s.turn,
        castling: {...s.castling},
        ep: s.ep,
        half: s.half,
        full: s.full
    });

    const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
    const KING = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
    const SLIDES = {
        b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
        r: [[1, 0], [-1, 0], [0, 1], [0, -1]],
        q: [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
    };

    // A destination inside the board, and never a wrap around the edge: a knight on h1 has
    // no "file i", so the file difference has to be checked, not just the index range.
    function at(sq, df, dr) {
        const f = (sq % 8) + df;
        const r = Math.floor(sq / 8) + dr;
        if (f < 0 || f > 7 || r < 0 || r > 7) return -1;
        return r * 8 + f;
    }

    function kingSquare(state, colour) {
        const king = colour === "w" ? "K" : "k";
        for (let i = 0; i < 64; i++) if (state.board[i] === king) return i;
        return -1;
    }

    /** Is `sq` attacked by any piece of colour `by`? */
    function attacked(state, sq, by) {
        if (sq < 0) return false;
        const board = state.board;
        // Pawns: a white pawn on a square one rank below attacks up the board, and the
        // board's index grows downwards, so white attackers sit at rank + 1.
        const pawn = by === "w" ? "P" : "p";
        const row = by === "w" ? 1 : -1;
        for (const df of [-1, 1]) {
            const from = at(sq, df, row);
            if (from >= 0 && board[from] === pawn) return true;
        }
        const knight = by === "w" ? "N" : "n";
        for (const [df, dr] of KNIGHT) {
            const from = at(sq, df, dr);
            if (from >= 0 && board[from] === knight) return true;
        }
        const king = by === "w" ? "K" : "k";
        for (const [df, dr] of KING) {
            const from = at(sq, df, dr);
            if (from >= 0 && board[from] === king) return true;
        }
        const bishop = by === "w" ? "B" : "b";
        const rook = by === "w" ? "R" : "r";
        const queen = by === "w" ? "Q" : "q";
        for (const [df, dr] of SLIDES.q) {
            const diagonal = df !== 0 && dr !== 0;
            for (let to = at(sq, df, dr); to >= 0; to = at(to, df, dr)) {
                const piece = board[to];
                if (piece) {
                    const own = colourOf(piece) === by;
                    const takes = piece === (diagonal ? bishop : rook) || piece === queen;
                    if (own && takes) return true;
                    break;
                }
            }
        }
        return false;
    }

    function inCheck(state, colour = state.turn) {
        return attacked(state, kingSquare(state, colour), other(colour));
    }

    /** Every move the side to move may make, castling and en passant included. */
    function moves(state) {
        const out = [];
        const board = state.board;
        const colour = state.turn;
        const push = (from, to, promo, flag) => out.push({from, to, promo: promo || "", flag: flag || ""});
        for (let from = 0; from < 64; from++) {
            const piece = board[from];
            if (!piece || colourOf(piece) !== colour) continue;
            const type = piece.toLowerCase();
            const df0 = from % 8;
            if (type === "p") {
                const dir = colour === "w" ? -1 : 1;
                const startRank = colour === "w" ? 6 : 1;
                const promoRank = colour === "w" ? 0 : 7;
                const one = at(from, 0, dir);
                if (one >= 0 && !board[one]) {
                    if (Math.floor(one / 8) === promoRank) for (const p of "qrbn") push(from, one, p);
                    else {
                        push(from, one);
                        const two = at(from, 0, dir * 2);
                        if (Math.floor(from / 8) === startRank && two >= 0 && !board[two]) push(from, two);
                    }
                }
                for (const df of [-1, 1]) {
                    const to = at(from, df, dir);
                    if (to < 0) continue;
                    const target = board[to];
                    if (target && colourOf(target) !== colour) {
                        if (Math.floor(to / 8) === promoRank) for (const p of "qrbn") push(from, to, p);
                        else push(from, to);
                    } else if (to === state.ep && !target) {
                        push(from, to, "", "ep");
                    }
                }
            } else if (type === "n" || type === "k") {
                for (const [df, dr] of (type === "n" ? KNIGHT : KING)) {
                    const to = at(from, df, dr);
                    if (to < 0) continue;
                    const target = board[to];
                    if (target && colourOf(target) === colour) continue;
                    push(from, to);
                }
            } else {
                for (const [df, dr] of SLIDES[type]) {
                    for (let to = at(from, df, dr); to >= 0; to = at(to, df, dr)) {
                        const target = board[to];
                        if (target) {
                            if (colourOf(target) !== colour) push(from, to);
                            break;
                        }
                        push(from, to);
                    }
                }
            }
        }
        // Castling: the king and the rook have not moved, the squares between them are
        // empty, the king is not in check now, and it does not cross or land on a square
        // that is attacked. The rook's own destination is the king's problem, not a check.
        const home = colour === "w" ? 7 : 0;
        const kingHome = home * 8 + 4;
        if (board[kingHome] === (colour === "w" ? "K" : "k") && !attacked(state, kingHome, other(colour))) {
            const rightK = colour === "w" ? state.castling.K : state.castling.k;
            const rightQ = colour === "w" ? state.castling.Q : state.castling.q;
            const rook = colour === "w" ? "R" : "r";
            if (rightK && board[home * 8 + 7] === rook && !board[home * 8 + 5] && !board[home * 8 + 6]
                && !attacked(state, home * 8 + 5, other(colour)) && !attacked(state, home * 8 + 6, other(colour))) {
                push(kingHome, home * 8 + 6, "", "castleK");
            }
            if (rightQ && board[home * 8] === rook && !board[home * 8 + 1] && !board[home * 8 + 2] && !board[home * 8 + 3]
                && !attacked(state, home * 8 + 3, other(colour)) && !attacked(state, home * 8 + 2, other(colour))) {
                push(kingHome, home * 8 + 2, "", "castleQ");
            }
        }
        // A move is legal only if the mover's king is safe once it is played. Castling was
        // checked above, so it needs no second pass — but running it through the same test is
        // cheap and keeps legality in one place.
        return out.filter(move => {
            const after = apply(state, move);
            return !attacked(after, kingSquare(after, colour), other(colour));
        });
    }

    const PROMO = {q: "Q", r: "R", b: "B", n: "N"};

    /** Play one move. Returns a new state; the one passed in is untouched. */
    function apply(state, move) {
        const next = clone(state);
        const board = next.board;
        const piece = board[move.from];
        const colour = colourOf(piece);
        const type = piece.toLowerCase();
        let captured = board[move.to];
        board[move.from] = null;
        if (move.flag === "ep") {
            // The taken pawn is beside the destination, not on it.
            const taken = move.to + (colour === "w" ? 8 : -8);
            captured = board[taken];
            board[taken] = null;
        }
        board[move.to] = move.promo
            ? (colour === "w" ? PROMO[move.promo].toUpperCase() : PROMO[move.promo].toLowerCase())
            : piece;
        if (move.flag === "castleK" || move.flag === "castleQ") {
            const home = colour === "w" ? 7 : 0;
            const rook = colour === "w" ? "R" : "r";
            if (move.flag === "castleK") {
                board[home * 8 + 5] = rook;
                board[home * 8 + 7] = null;
            } else {
                board[home * 8 + 3] = rook;
                board[home * 8] = null;
            }
        }
        // Rights go when the king or the rook that carried them moves, and also when that
        // rook is captured on its home square — a corner taken from the other side.
        if (type === "k") {
            if (colour === "w") next.castling.K = next.castling.Q = false;
            else next.castling.k = next.castling.q = false;
        }
        if (type === "r") {
            if (move.from === 63) next.castling.K = false;
            if (move.from === 56) next.castling.Q = false;
            if (move.from === 7) next.castling.k = false;
            if (move.from === 0) next.castling.q = false;
        }
        if (move.to === 63) next.castling.K = false;
        if (move.to === 56) next.castling.Q = false;
        if (move.to === 7) next.castling.k = false;
        if (move.to === 0) next.castling.q = false;
        // The square a pawn skipped over is the one an en passant capture lands on, and it is
        // only worth recording for the one reply that follows — and only when that reply can
        // actually take on it. A FEN naming an en passant target nobody can use is not the
        // canonical record of the position, and strict readers reject it.
        next.ep = -1;
        if (type === "p" && Math.abs(move.to - move.from) === 16) {
            const mid = (move.from + move.to) / 2;
            if (epUsable(next.board, other(colour), mid)) next.ep = mid;
        }
        next.half = captured || type === "p" ? 0 : state.half + 1;
        next.full = state.full + (colour === "b" ? 1 : 0);
        next.turn = colour === "w" ? "b" : "w";
        return next;
    }

    /** Standard algebraic notation for a legal move, with + or # when it gives them. */
    function san(state, move) {
        const piece = state.board[move.from];
        const type = piece.toLowerCase();
        const colour = colourOf(piece);
        const target = state.board[move.to];
        let text;
        if (move.flag === "castleK") text = "O-O";
        else if (move.flag === "castleQ") text = "O-O-O";
        else {
            const takes = Boolean(target) || move.flag === "ep";
            if (type === "p") {
                text = (takes ? file(move.from) + "x" : "") + squareName(move.to);
                if (move.promo) text += "=" + PROMO[move.promo];
            } else {
                // Two pieces of the same kind can reach one square: name the file, or the
                // rank when they share a file, or both when the file is not enough either.
                const rivals = moves(state).filter(m =>
                    m.to === move.to && m.from !== move.from &&
                    state.board[m.from] && state.board[m.from].toLowerCase() === type);
                let dis = "";
                if (rivals.length) {
                    const sameFile = rivals.some(m => m.from % 8 === move.from % 8);
                    const sameRank = rivals.some(m => Math.floor(m.from / 8) === Math.floor(move.from / 8));
                    if (!sameFile) dis = file(move.from);
                    else if (!sameRank) dis = String(rank(move.from));
                    else dis = squareName(move.from);
                }
                text = type.toUpperCase() + dis + (takes ? "x" : "") + squareName(move.to);
            }
        }
        const after = apply(state, move);
        if (attacked(after, kingSquare(after, other(colour)), colour)) {
            text += moves(after).length ? "+" : "#";
        }
        return text;
    }

    // "O-O!" and "O-O+" are the same move; so are "e8Q" and "e8=Q", and "e4" and "e4!?".
    function bare(text) {
        return String(text || "")
            .trim()
            .replace(/[+#!?]+$/, "")
            .replace(/=/, "")
            .replace(/^0-0-0$/i, "O-O-O")
            .replace(/^0-0$/i, "O-O")
            .replace(/e\.p\.$/i, "")
            .toLowerCase();
    }

    /** The move a token names, or null. Accepts SAN and coordinate ("e2e4", "e7e8q"). */
    function parse(state, token) {
        const raw = String(token || "").trim();
        if (!raw) return null;
        const legal = moves(state);
        const uci = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/i.exec(raw.replace(/[+#!?]+$/, ""));
        if (uci) {
            const from = squareIndex(uci[1]);
            const to = squareIndex(uci[2]);
            const promo = (uci[3] || "").toLowerCase();
            return legal.find(m => m.from === from && m.to === to && (m.promo || "") === promo) || null;
        }
        const wanted = bare(raw).replace(/^([nbrqk])/, "$1").replace(/[^a-z0-9]/g, "");
        for (const move of legal) {
            if (bare(san(state, move)).replace(/[^a-z0-9]/g, "") === wanted) return move;
        }
        // A promotion written without the "=" ("e8Q") still names one move, not four.
        if (/=/.test(raw) === false) {
            for (const move of legal) {
                if (bare(san(state, move)).replace(/=/, "").replace(/[^a-z0-9]/g, "") === wanted) return move;
            }
        }
        return null;
    }

    /** Is this token a move-number marker or a game result rather than a move? */
    function isNoise(token) {
        return /^(?:\d+\.+|\d+\.\.\.|1-0|0-1|1\/2-1\/2|\*)$/.test(token) || !/[a-z0-9]/i.test(token);
    }

    /**
     * Replay a move list, which may start with a FEN record naming the position to play from.
     * Tokens are whatever was typed or wired in: SAN or coordinate, with move numbers and a
     * result marker allowed among them. Stops at the first token that is not a legal move and
     * reports where, keeping the moves that did play — a list with a typo halfway through
     * still shows the position up to the typo.
     */
    function replay(text) {
        // A FEN in front of the moves sets the board they are played on.
        const fen = readFen(text);
        const tokens = (fen ? fen.rest : String(text || "")).split(/[\s,]+/).filter(Boolean);
        let state = fen ? fen.state : start();
        const sans = [];
        for (let i = 0; i < tokens.length; i++) {
            // "1.e4" and "1...e5" arrive as one token when the numbers were typed tight.
            const token = tokens[i].replace(/^\d+\.+/, "");
            if (!token || isNoise(token)) continue;
            const move = parse(state, token);
            if (!move) {
                return {state, sans, tokens, fromFen: Boolean(fen), error: {index: i, token: tokens[i], ply: sans.length}};
            }
            sans.push(san(state, move));
            state = apply(state, move);
        }
        return {state, sans, tokens, fromFen: Boolean(fen), error: null};
    }

    /** The move list as one line of text: "1. e4 e5 2. Nf3". */
    function toText(sans) {
        const parts = [];
        (sans || []).forEach((text, i) => {
            if (i % 2 === 0) parts.push(`${i / 2 + 1}.`);
            parts.push(text);
        });
        return parts.join(" ");
    }

    /** The position as a FEN record: placement, side to move, rights, en passant, counters. */
    function toFen(state) {
        const rows = [];
        for (let row = 0; row < 8; row++) {
            let text = "";
            let empty = 0;
            for (let col = 0; col < 8; col++) {
                const piece = state.board[row * 8 + col];
                if (piece) {
                    if (empty) { text += empty; empty = 0; }
                    text += piece;
                } else empty++;
            }
            if (empty) text += empty;
            rows.push(text);
        }
        const rights = ["K", "Q", "k", "q"].filter(c => state.castling[c]).join("") || "-";
        const ep = state.ep >= 0 ? squareName(state.ep) : "-";
        return `${rows.join("/")} ${state.turn} ${rights} ${ep} ${state.half} ${state.full}`;
    }

    return {
        start, moves, apply, san, parse, replay, readFen, toText, toFen, attacked, inCheck,
        squareName, squareIndex, kingSquare, boardFromPlacement, isNoise
    };
});
