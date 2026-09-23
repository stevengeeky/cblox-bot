/**
 * opponent.js — player 2.
 *
 * bot.make_move() in bot.js begins `return null;`. Everything under that line
 * is unreachable, so the right-hand side of the board never placed a tile.
 * This file is the opponent that bot.js describes instead of builds: a
 * probability matrix over which squares the player is likely to take next,
 * blended from a general prior and a table of what this player has actually
 * done, and a move chosen from the prediction rather than from the board
 * alone. It starts with a general style and tailors it to whoever is playing.
 *
 * The model is keyed on the offset from the PLAYER's base, not on absolute
 * squares, and it lives in localStorage, so it survives the tab closing.
 */

(function() {
'use strict';

var KEY = 'cblox.player.v1';
var MIND = 'cblox.mind.v1';
var PRIOR_STRENGTH = 24;   // how many player moves before the learned table outweighs the prior
var STEP_STRENGTH  = 8;    // how many player steps before the stride outweighs the square map

/**
 * Two things live below.
 *
 * THE PUNISHER. The bot checks whether IT can connect this turn (make_move,
 * `finishers`); originally nothing checked whether THE PLAYER can connect next
 * turn, so an aggressive rush at its base was free. Threat counting looks at
 * that: every square where one of the player's remaining tiles finishes their
 * road is a square the bot has to sit on.
 *
 * THE MIND. The move score used to be `gain*3 + block*2 - risk*6`, three
 * constants identical in every situation on the board. Now each situation
 * category holds three strategies -- rush, wall, safe -- and picks between them
 * on what has actually won from that category before, optimistic about the
 * ones it has barely tried. At the end of a game every category the game
 * passed through is credited with the result. It is a contextual bandit over a
 * coarse state. (A table over raw board positions would learn nothing: a
 * position in this game never repeats, so every state gets one visit. The
 * signature is a handful of buckets that repeat dozens of times a game.) It
 * lives in localStorage, so it remembers across games and across the tab
 * closing.
 */

var opponent = {};

var ARMS = {
    rush: { gain: 5, block: 1, risk: 3 },
    wall: { gain: 1, block: 5, risk: 3 },
    safe: { gain: 3, block: 2, risk: 9 }
};
var ARM_NAMES = ['rush', 'wall', 'safe'];

function loadMind() {
    try {
        var m = JSON.parse(localStorage.getItem(MIND));
        if (m && m.table) return m;
    } catch (e) {}
    return { table: {}, games: 0, plays: 0 };
}
function saveMind() { try { localStorage.setItem(MIND, JSON.stringify(mind)); } catch (e) {} }

var mind = loadMind();
var thisGame = {};          // every (situation -> arm) this game has committed to

/**
 * the situation, in three buckets that repeat all game long:
 *   race  -- am I closer to the player's base than they are to mine
 *            (ahead / even / behind)
 *   phase -- how much board is down (open / mid / end)
 *   heat  -- is the player one move from connecting
 * nine to eighteen categories. A twelve-turn game visits four or five of them,
 * so after a handful of games every one of them has been played from.
 */
function signature(mineD, theirD, placed, threatened) {
    var d = theirD - mineD;
    var race  = d >= 2 ? 'ahead' : (d <= -2 ? 'behind' : 'even');
    var phase = placed < 8 ? 'open' : (placed < 20 ? 'mid' : 'end');
    return race + '/' + phase + (threatened ? '/threat' : '');
}

/** what it has learned here, and which strategy that makes it want */
function chooseArm(sit) {
    var row = mind.table[sit] || (mind.table[sit] = {});
    var total = 0, i;
    for (i = 0; i < ARM_NAMES.length; i++) total += (row[ARM_NAMES[i]] || { n: 0 }).n;
    var bestName = null, bestScore = -Infinity;
    for (i = 0; i < ARM_NAMES.length; i++) {
        var a = ARM_NAMES[i];
        var cell = row[a] || (row[a] = { n: 0, w: 0 });
        // laplace mean, plus a bonus for the ones it has barely tried, so a
        // strategy that lost its first game does not get buried forever
        var mean = (cell.w + 1) / (cell.n + 2);
        var bonus = Math.sqrt(2 * Math.log(total + 2) / (cell.n + 1)) * 0.35;
        var s = mean + bonus;
        if (s > bestScore) { bestScore = s; bestName = a; }
    }
    var chosen = row[bestName];
    if (!thisGame[sit]) { thisGame[sit] = bestName; }
    return {
        name: bestName,
        w: ARMS[bestName],
        n: chosen.n,
        won: chosen.w,
        rate: chosen.n ? chosen.w / chosen.n : null
    };
}

/**
 * the game ended. credit every category it played from. 1 for a win, 0 for a
 * loss, half for a draw -- this is the only place the table ever moves.
 */
opponent.credit = function(winner) {
    var value = winner === 2 ? 1 : (winner === 3 ? 0.5 : 0);
    var touched = 0;
    for (var sit in thisGame) {
        var a = thisGame[sit];
        var cell = (mind.table[sit] || (mind.table[sit] = {}))[a] || (mind.table[sit][a] = { n: 0, w: 0 });
        cell.n++;
        cell.w += value;
        touched++;
        mind.plays++;
    }
    mind.games++;
    mind.last = { winner: winner, sits: touched, value: value };

    // a new game from here on: the stride starts empty again
    opponent.playerLast = null;

    thisGame = {};
    saveMind();
    return mind.last;
};

opponent.mind = function() {
    return { table: mind.table, games: mind.games, plays: mind.plays, last: mind.last,
             here: opponent.situation };
};

opponent.forgetMind = function() {
    mind = { table: {}, games: 0, plays: 0 };
    thisGame = {};
    saveMind();
};

/**
 * A heat table of offsets from the player's own base is the same table no
 * matter where the game has got to, and on its own it predicted badly
 * ("right 1 of 18"): position was the one thing the learned half ignored.
 *
 * So the model also keeps the player's STRIDE: where they go relative to the
 * square they took last turn. That is the part of a player that shows up
 * fastest -- people extend the line they are already drawing -- and it moves
 * with the board instead of sitting on the base.
 */

// ── what it knows about the player ─────────────────────────────────────────
function load() {
    try {
        var raw = localStorage.getItem(KEY);
        if (raw) {
            var m = JSON.parse(raw);
            if (m && m.squares) {
                // the player already has moves in here; don't throw them away to add a field
                if (!m.steps) { m.steps = {}; m.stepN = 0; }
                return m;
            }
        }
    } catch (e) {}
    return { n: 0, games: 0, squares: {}, steps: {}, stepN: 0, types: {}, hits: 0, guesses: 0 };
}
function save(m) {
    try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) {}
}

var player = load();
opponent.player = player;

/** every square the player takes, remembered as an offset from their own base */
opponent.observe = function(board, x, y, type) {
    var bx = board.left_base.properties.x, by = board.left_base.properties.y;
    var k = (x - bx) + ',' + (y - by);
    player.squares[k] = (player.squares[k] || 0) + 1;
    player.types[type] = (player.types[type] || 0) + 1;
    player.n++;
    // the run. "right N of M" is a lifetime average and cannot say anything
    // about the move just made. So also count how many moves in a row the
    // player has walked out of the square the bot called. It broke last at
    // move `lastCalled`; `best` is the longest the player has ever gone unread.
    if (opponent.predicted) {
        player.guesses++;
        if (opponent.predicted.x === x && opponent.predicted.y === y) {
            player.hits++;
            player.streak = 0;
            player.lastCalled = player.n;
            player.calledAt = { x: x, y: y };
        } else {
            player.streak = (player.streak || 0) + 1;
            if (!(player.best >= player.streak)) player.best = player.streak;
            player.calledAt = null;
        }
    }
    // the stride: the step just taken from the square taken last turn. only
    // within a game -- playerLast starts empty on a reload, so the opening
    // move falls back to the map and never invents a stride across games.
    if (opponent.playerLast) {
        var sk = (x - opponent.playerLast.x) + ',' + (y - opponent.playerLast.y);
        player.steps[sk] = (player.steps[sk] || 0) + 1;
        player.stepN = (player.stepN || 0) + 1;
    }
    opponent.playerLast = { x: x, y: y };
    save(player);
};

opponent.forget = function() {
    player = { n: 0, games: 0, squares: {}, steps: {}, stepN: 0, types: {}, hits: 0, guesses: 0,
               streak: 0, best: 0, lastCalled: null, calledAt: null };
    opponent.player = player;
    opponent.playerLast = null;
    save(player);
};

// ── the probability matrix ─────────────────────────────────────────────────
/**
 * where is the player going to play next.
 * prior: a general player pushes out from their own base toward the other one,
 *        and only ever plays onto a square adjacent to something already placed.
 * learned: the offsets this player has actually chosen, over every game so far.
 * the blend leans on the learned table as it fills.
 */
opponent.predict = function(board) {
    var W = board.width, H = board.height;
    var bx = board.left_base.properties.x, by = board.left_base.properties.y;
    var tx = board.right_base.properties.x, ty = board.right_base.properties.y;

    var fromPlayer = window.bot.compute_distances(board, { x: bx, y: by, depth: 1 });
    var toMe       = window.bot.compute_distances(board, { x: tx, y: ty, depth: 1 });

    var w = player.n / (player.n + PRIOR_STRENGTH);

    // the stride only counts if the player has taken a square this game to step from
    var sN = player.stepN || 0;
    var last = opponent.playerLast;
    var sw = last ? sN / (sN + STEP_STRENGTH) : 0;

    // the two networks, each carried only by the tiles that side put down, and
    // the blank fringe each one can actually touch. this is "connected to the
    // path" in the only sense you can check by eye.
    var mineReach  = ownReach(board, 1, bx, by);
    var theirReach = ownReach(board, 2, tx, ty);

    var map = {}, side = {}, total = 0;

    for (var x = 0; x < W; x++) {
        for (var y = 0; y < H; y++) {
            var tile = board.data[[x, y]];
            if (!tile || tile.type !== 'blank') { map[[x, y]] = 0; continue; }
            if (!touchesSomething(board, x, y)) { map[[x, y]] = 0; continue; }

            var dh = fromPlayer[[x, y]] || 99;
            var dm = toMe[[x, y]] || 99;
            var prior = 1 / (1 + dh) * (1 + 1 / (1 + dm));   // near the player's reach, pointed at me

            var k = (x - bx) + ',' + (y - by);
            var mine = (player.squares[k] || 0) / (player.n || 1);

            // where the player goes from where they just were, which is the
            // half of the model that depends on the position instead of on the
            // corner they started in
            var step = 0;
            if (last) {
                var sk = (x - last.x) + ',' + (y - last.y);
                step = (player.steps[sk] || 0) / (sN || 1);
            }
            var learned = (1 - sw) * mine + sw * step;

            var p = (1 - w) * prior + w * learned;
            map[[x, y]] = p;
            total += p;

            // whose half of the reach this square sits in. The overlay is one
            // number -- how likely this square is next -- but it lands on both
            // sides of the board, and the side is knowable, so it says so.
            // compute_distances conducts through EVERY placed tile, either
            // side's, at no cost -- that is the board's rule and it is correct
            // for the board. It is wrong for a hue: once the two networks touch
            // anywhere, dh and dm are both 1 across the whole joined thing, and
            // squares hanging off the bot's line came out in the player's
            // colour. The colour is a claim about connection, so it is measured
            // as connection: which side's OWN tiles this square actually touches.
            side[[x, y]] = reachSide(mineReach, theirReach, x, y);
        }
    }

    var best = null;
    for (var xx = 0; xx < W; xx++) {
        for (var yy = 0; yy < H; yy++) {
            var v = total > 0 ? map[[xx, yy]] / total : 0;
            map[[xx, yy]] = v;
            if (v > 0 && (!best || v > best.p)) best = { x: xx, y: yy, p: v };
        }
    }

    // normalise for the overlay so the strongest square reads as full red
    var peak = best ? best.p : 1;
    var shown = {};
    for (var sx = 0; sx < W; sx++)
        for (var sy = 0; sy < H; sy++)
            shown[[sx, sy]] = peak > 0 ? Math.min(1, map[[sx, sy]] / peak) : 0;

    opponent.predicted = best;
    opponent.pmap = map;
    return { map: map, shown: shown, side: side, best: best, weight: w, stride: sw };
};

// flood out from one base through the tiles that base's owner placed -- only
// theirs -- and mark every blank square those tiles reach. A base counts as
// its owner's. The other side's tiles are walls here, on purpose: the board
// lets everything conduct, the overlay is answering a different question.
function ownReach(board, placer, bx, by) {
    var mine = {}, fringe = {}, queue = [[bx, by]];
    mine[[bx, by]] = true;
    while (queue.length) {
        var cur = queue.pop();
        var tile = board.data[[cur[0], cur[1]]];
        if (!tile || !tile.properties || !tile.properties.range) continue;
        for (var i = 0; i < tile.properties.range.length; i++) {
            var nx = tile.properties.range[i][0], ny = tile.properties.range[i][1];
            if (nx < 0 || ny < 0 || nx >= board.width || ny >= board.height) continue;
            var nt = board.data[[nx, ny]];
            if (!nt) continue;
            if (nt.type === 'blank' || nt.type === 'collision') { fringe[[nx, ny]] = true; continue; }
            if (mine[[nx, ny]]) continue;
            if (nt.properties.placer !== placer) continue;   // not my road
            mine[[nx, ny]] = true;
            queue.push([nx, ny]);
        }
    }
    return fringe;
}

// 1 if only the player's road touches here, 2 if only the bot's does, 0 if both, and
// null if neither -- a square hanging off a tile that is on nobody's
// connected line gets no colour at all rather than a borrowed one.
function reachSide(mineReach, theirReach, x, y) {
    var a = !!mineReach[[x, y]], b = !!theirReach[[x, y]];
    if (a && b) return 0;
    if (a) return 1;
    if (b) return 2;
    return null;
}

function touchesSomething(board, x, y) {
    for (var dx = -1; dx <= 1; dx++) {
        for (var dy = -1; dy <= 1; dy++) {
            if (!dx && !dy) continue;
            var t = board.data[[x + dx, y + dy]];
            if (t && t.type !== 'blank' && t.type !== 'collision') return true;
        }
    }
    return false;
}

// ── acting on the prediction ───────────────────────────────────────────────

/**
 * bot.compute_distances, same answer, without the garbage.
 *
 * Measured on a 26x18 board with 26 tiles down: 129 frontier squares x 9 tile
 * types x two distance reads = 2,322 calls to compute_distances at 3.27 ms
 * each. 7.6 seconds to choose one move, before fork counting was added on top.
 *
 * None of that cost is the search. It is `visited[[x, y]]` -- an array coerced
 * to a string for every read and every write -- and a fresh {depth, x, y}
 * object for each of the eight neighbours of every blank square, which on a
 * mostly empty board is about 3,700 allocations per call. Same traversal here,
 * on a flat Int32Array with packed integer keys, and the object is built once
 * at the end so every caller still gets the shape it expects.
 *
 * Both versions relax a node whenever they find it at a strictly smaller depth,
 * so both settle on the true shortest distance and the fixpoint is the same
 * one (checked against the original on random boards). bot.js is not touched:
 * this is used for scoring moves, and the drawing code keeps calling the
 * original.
 */
function fastDistances(board, sx, sy) {
    var W = board.width, H = board.height;
    var best = new Int32Array(W * H);
    var q = [sx * H + sy], qd = [1];
    for (var head = 0; head < q.length; head++) {
        var p = q[head], d = qd[head];
        var x = (p / H) | 0, y = p - x * H;
        if (best[p] && best[p] <= d) continue;
        best[p] = d;
        var tile = board.data[[x, y]];
        if (!tile) continue;
        if (tile.type === 'blank') {
            for (var dx = -1; dx <= 1; dx++) {
                for (var dy = -1; dy <= 1; dy++) {
                    if (!dx && !dy) continue;
                    var nx = x + dx, ny = y + dy;
                    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
                    q.push(nx * H + ny); qd.push(d + 1);
                }
            }
        } else {
            var r = tile.properties.range;
            for (var i = 0; i < r.length; i++) {
                var rx = r[i][0], ry = r[i][1];
                if (rx < 0 || ry < 0 || rx >= W || ry >= H) continue;
                q.push(rx * H + ry); qd.push(d);
            }
        }
    }
    return best;
}
opponent.fastDistances = function(board, sx, sy) {
    var best = fastDistances(board, sx, sy), out = {}, W = board.width, H = board.height;
    for (var x = 0; x < W; x++)
        for (var y = 0; y < H; y++)
            if (best[x * H + y]) out[[x, y]] = best[x * H + y];
    return out;
};

function dist(board, from, at) {
    var v = fastDistances(board, from.x, from.y)[at.x * board.height + at.y];
    return v ? v : 99;
}

// bot.js line 9 carries a note that was never implemented:
//   "if there's a winning move, make it"
// this is that. a network here is carried by its own tiles, so it only counts
// if my own line gets there.
function reaches(board, fromX, fromY, placer, toX, toY) {
    var seen = {};
    var stack = [{ x: fromX, y: fromY }];
    while (stack.length) {
        var xy = stack.pop();
        if (xy.x < 0 || xy.y < 0 || xy.x >= board.width || xy.y >= board.height) continue;
        if (seen[[xy.x, xy.y]]) continue;
        seen[[xy.x, xy.y]] = true;
        if (xy.x == toX && xy.y == toY) return true;
        var tile = board.data[[xy.x, xy.y]];
        if (!tile) continue;
        if (tile.properties.placer && tile.properties.placer != placer) continue;
        for (var i = 0; i < tile.properties.range.length; i++) {
            stack.push({ x: tile.properties.range[i][0], y: tile.properties.range[i][1] });
        }
    }
    return false;
}

/**
 * THE PUNISHER. This file used to ask `reaches` exactly one question -- can I
 * connect -- and never the mirror of it, so an aggressive rush went unpunished.
 *
 * Every blank square the player could place on, with every tile they still
 * hold: does placing it join their base to mine. The squares that come back
 * are the player's wins on the board right now. If there is one, taking it is
 * worth more than any amount of progress, because progress after that never
 * happens.
 *
 * The player's stock is board.player_stock. If the caller did not pass it,
 * this falls back to the tile types the bot itself can place, which
 * over-counts threats rather than missing them -- the safe direction to be
 * wrong in.
 */
function playerTypes(board) {
    var stock = board.player_stock || board.stock || {};
    var out = [];
    for (var t in stock) {
        if (stock[t] === undefined || stock[t] <= 0) continue;
        if (t === 'reclaim' || t === 'mine' || t === 'base') continue;
        var s = window.tiles[t]({ x: 0, y: 0 });
        if (!s.canPlaceOn(window.tiles.blank({ x: 0, y: 0 }))) continue;
        out.push(t);
    }
    return out;
}

/** everything a side can already touch along its own placed tiles. This is
 *  `reaches` without the early return: one walk, and then the answer to "can I
 *  get to X" is a lookup instead of another walk. */
function reachable(board, fromX, fromY, placer) {
    var seen = {}, stack = [{ x: fromX, y: fromY }];
    while (stack.length) {
        var xy = stack.pop();
        if (xy.x < 0 || xy.y < 0 || xy.x >= board.width || xy.y >= board.height) continue;
        if (seen[[xy.x, xy.y]]) continue;
        seen[[xy.x, xy.y]] = true;
        var tile = board.data[[xy.x, xy.y]];
        if (!tile) continue;
        if (tile.properties.placer && tile.properties.placer != placer) continue;
        for (var i = 0; i < tile.properties.range.length; i++)
            stack.push({ x: tile.properties.range[i][0], y: tile.properties.range[i][1] });
    }
    return seen;
}

/**
 * The squares where ONE tile finishes the road from `from` to `to`.
 *
 * This was 900 board walks a turn -- every blank square crossed with every tile
 * type, each one asking `reaches` from scratch -- and on a real board that
 * came to 7.7 seconds a move. It does not need any of them. A single tile
 * completes the road only if two things hold, and both are cheap:
 *
 *   1. the square is already reachable along my own placed tiles  (one walk)
 *   2. the tile put there has `to` inside its own range           (arithmetic)
 *
 * Condition 2 runs backwards: a tile type's range is a fixed set of offsets, so
 * the only squares that can possibly reach `to` are `to` minus each offset. That
 * is two dozen squares, not the board. One walk and two dozen lookups.
 */
function finishers(board, from, to, placer, types, skipType) {
    var seen = reachable(board, from.x, from.y, placer);
    var out = [], hit = {};
    for (var j = 0; j < types.length; j++) {
        if (skipType && types[j] === skipType) continue;
        var probe = window.tiles[types[j]]({ x: to.x, y: to.y });
        var r = probe.properties.range;
        for (var q = 0; q < r.length; q++) {
            var sx = 2 * to.x - r[q][0], sy = 2 * to.y - r[q][1];
            if (sx < 0 || sy < 0 || sx >= board.width || sy >= board.height) continue;
            if (!seen[[sx, sy]]) continue;
            var was = board.data[[sx, sy]];
            if (!was || was.type !== 'blank') continue;
            var cand = window.tiles[types[j]]({ x: sx, y: sy, placer: placer });
            if (!cand.canPlaceOn(was)) continue;
            // a range is not always symmetric, so confirm rather than assume
            var ok = false, cr = cand.properties.range;
            for (var z = 0; z < cr.length; z++)
                if (cr[z][0] === to.x && cr[z][1] === to.y) { ok = true; break; }
            if (!ok) continue;
            if (hit[[sx, sy]]) continue;
            hit[[sx, sy]] = true;
            out.push({ x: sx, y: sy, type: types[j], tile: cand });
        }
    }
    return out;
}

/**
 * Four adjustments on top of the pool score. Each one is an observed weakness
 * of the plain score with the sign flipped, a term below, and a line the panel
 * shows when that term is what moved the piece:
 *
 *   WAYS   it was only ever creating one way to win at a time
 *   LIVE   it blocked with tiles that handed the player new cells
 *   NERVE  it hedged off its own winning setup because the player might
 *          take the square
 *   COIN   its tie-breaking was deterministic, so it was easy to read
 */

/** WAYS. How many squares I could connect from NEXT turn, if I place this now.
 *  Two is the whole point: the player can only block one of them.
 *  Stops counting at 3 -- past two the answer is already "cannot be stopped". */
function waysToWin(board, myBase, playerBase, myTypes, spentType, spentLast) {
    // a tile I am using up this turn is not a tile I hold next turn
    return finishers(board, myBase, playerBase, 2, myTypes,
                     spentLast ? spentType : null).length;
}

opponent.make_move = function(board) {
    var W = board.width, H = board.height;
    var myBase     = { x: board.right_base.properties.x, y: board.right_base.properties.y };
    var playerBase = { x: board.left_base.properties.x,  y: board.left_base.properties.y  };

    var pred = opponent.predict(board);

    var types = [];
    for (var t in board.stock) {
        if (board.stock[t] === undefined) continue;
        if (board.stock[t] <= 0) continue;
        if (t === 'reclaim' || t === 'mine' || t === 'base') continue;
        var sample = window.tiles[t]({ x: 0, y: 0 });
        if (!sample.canPlaceOn(window.tiles.blank({ x: 0, y: 0 }))) continue;
        types.push(t);
    }
    if (!types.length) return null;

    // only squares that touch the placed structure, and only my half of the reach
    var squares = [];
    for (var x = 0; x < W; x++) {
        for (var y = 0; y < H; y++) {
            var tile = board.data[[x, y]];
            if (!tile || tile.type !== 'blank') continue;
            if (!touchesSomething(board, x, y)) continue;
            squares.push({ x: x, y: y });
        }
    }
    if (!squares.length) return null;

    var base = {
        mine:   dist(board, myBase, playerBase),
        theirs: dist(board, playerBase, myBase)
    };

    // bot.js line 9: "if there's a winning move, make it." One walk of the
    // board now instead of one per candidate.
    var mineNow = finishers(board, myBase, playerBase, 2, types);
    if (mineNow.length) {
        opponent.last = { score: Infinity, tile: mineNow[0].tile,
                          x: mineNow[0].x, y: mineNow[0].y, type: mineNow[0].type,
                          gain: 99, block: 0, risk: 0, winning: true, why: null };
        opponent.why = null;
        return mineNow[0].tile;
    }

    // the player's winning squares, right now, before anything else is considered
    var threats = finishers(board, playerBase, myBase, 1, playerTypes(board));
    var blockSet = {};
    for (var h = 0; h < threats.length; h++) blockSet[[threats[h].x, threats[h].y]] = true;

    // how much board is down -- the phase half of the signature
    var placed = 0;
    for (var px = 0; px < W; px++)
        for (var py = 0; py < H; py++) {
            var pt = board.data[[px, py]];
            if (pt && pt.type !== 'blank') placed++;
        }

    var sit = signature(base.mine, base.theirs, placed, threats.length > 0);
    var arm = chooseArm(sit);
    var wts = arm.w;
    opponent.situation = {
        sit: sit, arm: arm.name, n: arm.n, won: arm.won, rate: arm.rate,
        threats: threats.length, games: mind.games
    };

    var pool = [];
    for (var i = 0; i < squares.length; i++) {
        var sq = squares[i];
        var was = board.data[[sq.x, sq.y]];

        for (var j = 0; j < types.length; j++) {
            var cand = window.tiles[types[j]]({ x: sq.x, y: sq.y, placer: 2 });
            if (!cand.canPlaceOn(was)) continue;

            board.data[[sq.x, sq.y]] = cand;
            var after = {
                mine:   dist(board, myBase, playerBase),
                theirs: dist(board, playerBase, myBase)
            };
            board.data[[sq.x, sq.y]] = was;

            var gain  = base.mine - after.mine;        // how much closer I get
            var block = after.theirs - base.theirs;    // how much further the player gets
            var risk  = pred.map[[sq.x, sq.y]] || 0;   // the player may take this square this turn -> collision

            // sitting on a square the player wins from is worth more than the
            // whole rest of the scale. It is the only term here that is not a
            // preference -- everything else is about a better game, this one is
            // about there still being a game.
            var kill = blockSet[[sq.x, sq.y]] ? 100 : 0;

            // LIVE. Which tile does the blocking matters. An x is not a wall:
            // its range is the four diagonals, so plugging the player's winning
            // square with one hands them two fresh cells on THEIR side of that
            // square. An up arrow opens one cell and it is behind the block.
            // The old code paid a flat +100 for the square and then let
            // leftovers pick the tile, so which tile went down was an accident.
            //
            // give: every cell this tile opens, +1 if it is further from the
            // player's base than the square itself, -1 if it is level with it
            // or nearer. Positive is a block that builds. Negative is a block
            // that gives.
            var give = 0;
            if (kill) {
                var here = Math.abs(sq.x - playerBase.x) + Math.abs(sq.y - playerBase.y);
                var rng = cand.properties.range;
                for (var q = 0; q < rng.length; q++) {
                    var rx = rng[q][0], ry = rng[q][1];
                    if (rx < 0 || ry < 0 || rx >= W || ry >= H) continue;
                    give += (Math.abs(rx - playerBase.x) + Math.abs(ry - playerBase.y)) > here ? 1 : -1;
                }
            }
            var live = kill ? gain * 6 + give * 5 : 0;

            var score = kill + live
                      + gain * wts.gain + block * wts.block - risk * wts.risk
                      - 0.02 * (Math.abs(sq.x - myBase.x) + Math.abs(sq.y - myBase.y));

            pool.push({ score: score, tile: cand, x: sq.x, y: sq.y, type: types[j],
                        gain: gain, block: block, risk: risk,
                        killed: !!kill, live: live, give: give, sit: sit, arm: arm.name });
        }
    }

    if (!pool.length) return null;

    // ── the four adjustments, applied to the top of the pool ──────────────────
    // waysToWin is the expensive one, so only the moves that are already in
    // contention get asked.
    pool.sort(function (a, b) { return b.score - a.score; });
    var look = pool.slice(0, 10);
    for (var k = 0; k < look.length; k++) {
        var c = look[k], prev = board.data[[c.x, c.y]];
        board.data[[c.x, c.y]] = c.tile;
        c.ways = waysToWin(board, myBase, playerBase, types,
                           c.type, board.stock[c.type] === 1);
        board.data[[c.x, c.y]] = prev;

        // WAYS. One threat the player just blocks. Two they cannot -- one
        // placement, two squares. That gap is the whole difference between a
        // move that pressures and a move that wins, and nothing in this file
        // had ever counted it.
        c.fork = c.ways >= 2 ? 60 : (c.ways === 1 ? 14 : 0);

        // NERVE. The hedge is `- risk * wts.risk`: it steps off a square
        // because the player might take it. When the move sets up my own win,
        // the player is not spending their turn racing me, so the hedge is
        // paid for nothing. Take the square.
        c.nerve = c.ways >= 1 ? c.risk * wts.risk : 0;

        c.score += c.fork + c.nerve;
    }
    look.sort(function (a, b) { return b.score - a.score; });

    // COIN. Argmax over a score with a 0.01 jitter is a lookup table, and a
    // player learns quickly that the bot will block the same way every time.
    // So among moves that are genuinely close to the best one, flip a coin.
    // Never on a fork and never on a block: those two are not preferences,
    // they are the game, and being unpredictable about them is just being
    // worse.
    var top = look[0], picked = top, band = [];
    if (!top.killed && top.fork < 60) {
        // same number of ways, within three quarters of a point: as far as the
        // score can tell these are the same move, and the score was breaking
        // the tie the same way every time.
        for (var b2 = 0; b2 < look.length; b2++)
            if (look[b2].ways === top.ways && top.score - look[b2].score <= 0.75)
                band.push(look[b2]);
        picked = band[Math.floor(Math.random() * band.length)];
    }

    picked.tied = band.length > 1 ? band.length : 0;
    picked.why = picked.fork >= 60 ? 'ways'
               : picked.killed && picked.give > 0 ? 'live'
               : picked.nerve > 0 ? 'nerve'
               : picked.tied ? 'coin'
               : null;
    opponent.why = picked.why ? { rule: picked.why, ways: picked.ways, tied: picked.tied } : null;
    opponent.last = picked;
    return picked.tile;
};

window.opponent = opponent;

})();
