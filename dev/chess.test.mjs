// Checks for dev/chess.js: the rules a Chess node needs, against known positions and lines.
// Run with `node dev/chess.test.mjs`; exits 1 on the first disagreement.
import assert from "node:assert/strict";
import chess from "./chess.js";

const {start, moves, apply, toFen, readFen, replay, parse} = chess;
let checks = 0;

function perft(state, depth) {
    const legal = moves(state);
    if (depth === 1) return legal.length;
    let total = 0;
    for (const move of legal) total += perft(apply(state, move), depth - 1);
    return total;
}

function check(label, fn, expected) {
    const actual = fn();
    assert.equal(actual, expected, `${label}: ${actual} !== ${expected}`);
    checks++;
}

function fen(value) {
    return readFen(value).state;
}

// Perft counts from the standard test positions.
check("perft start d1", () => perft(start(), 1), 20);
check("perft start d2", () => perft(start(), 2), 400);
check("perft start d3", () => perft(start(), 3), 8902);
check("perft start d4", () => perft(start(), 4), 197281);

const kiwipete = "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1";
check("perft kiwipete d1", () => perft(fen(kiwipete), 1), 48);
check("perft kiwipete d2", () => perft(fen(kiwipete), 2), 2039);
check("perft kiwipete d3", () => perft(fen(kiwipete), 3), 97862);

const pos3 = "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1";
check("perft pos3 d1", () => perft(fen(pos3), 1), 14);
check("perft pos3 d2", () => perft(fen(pos3), 2), 191);
check("perft pos3 d3", () => perft(fen(pos3), 3), 2812);

const pos4 = "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1";
check("perft pos4 d1", () => perft(fen(pos4), 1), 6);
check("perft pos4 d2", () => perft(fen(pos4), 2), 264);

const pos5 = "rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8";
check("perft pos5 d1", () => perft(fen(pos5), 1), 44);
check("perft pos5 d2", () => perft(fen(pos5), 2), 1486);

// A FEN read and written again names the same position.
for (const value of [
    "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1",
    "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1",
    "rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8"
]) {
    check(`fen round trip ${value}`, () => toFen(fen(value)), value);
}

// The Ruy Lopez line replays move for move with its SAN preserved.
const game = "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O";
const played = replay(game);
check("replay has no error", () => played.error, null);
check("replay plies", () => played.sans.length, 16);
check("replay first moves", () => played.sans.slice(0, 4).join(" "), "e4 e5 Nf3 Nc6");
check("replay final position", () => toFen(played.state), "r1bq1rk1/2p1bppp/p1np1n2/1p2p3/4P3/1BP2N2/PP1P1PPP/RNBQR1K1 w - - 1 9");

// Moves that are not legal in the starting position are refused, not coerced.
for (const bad of ["e5", "Ke2", "Nf6", "Qh5"]) {
    check(`illegal first move refused: ${bad}`, () => parse(start(), bad), null);
}

console.log(`chess: ${checks} checks passed`);
