/**
 * front end
 */

'use strict';

window.addEventListener('load', function() {
//

// ── colour ────────────────────────────────────────────────────────────────
// a base has a colour, and its whole network takes it. yours is yours to pick.
var PALETTE = [
    { name: 'lavender',  hex: '#a98fe0' },
    { name: 'sea glass', hex: '#7fd0c0' },
    { name: 'peach',     hex: '#f4a077' },
    { name: 'cornflower',hex: '#7ba7e8' },
    { name: 'moss',      hex: '#96bc6a' },
    { name: 'rose',      hex: '#ea8fa8' },
    { name: 'butter',    hex: '#e8cb70' },
    { name: 'oxblood',   hex: '#b4536a' },
];

// mine. verdigris: the colour copper goes when it has been left outside long
// enough. it is not a colour anybody applies, it is what the thing turns into.
var BOT = { name: 'verdigris', hex: '#3f8f80' };

var COLOR_KEY = 'cblox.yourcolor';

// ── the original sounds ───────────────────────────────────────────────────
// The original game (narcissawright/cosmicblocks, client/sfx/) has one sound
// per event, and the mapping below follows its client.js: cleanup() plays
// drawgame if more than one player won, youwin if the winner is you, gameover
// otherwise; move3 on a new move, collision3 on a collision, newgame at the
// start, hover on a menu block. The files are not part of this repo: drop
// them into sfx/ as <name>.ogg and they are used; if they are missing nothing
// here throws. The oscillator underneath keeps only the job the original
// never had -- the walk up the winning path.
var SFX_NAMES = ['move3', 'collision3', 'youwin', 'gameover', 'drawgame', 'newgame', 'hover'];
var SFX = {};
SFX_NAMES.forEach(function (n) {
    try {
        var a = new Audio('sfx/' + n + '.ogg');
        a.preload = 'auto';
        SFX[n] = a;
    } catch (e) {}
});
// clone so two of the same sound can overlap, and so a second one does not cut
// the first off mid-note the way replaying a single element does
function sfx(name, vol, at) {
    var src = SFX[name];
    if (!src) return;
    var go = function () {
        try {
            var a = src.cloneNode();
            a.volume = vol == null ? 1 : vol;
            var p = a.play();
            if (p && p.catch) p.catch(function () {});
        } catch (e) {}
    };
    if (at) setTimeout(go, at * 1000); else go();
}

// ── sound ─────────────────────────────────────────────────────────────────
var actx = null;
function ac() {
    if (!actx) {
        var C = window.AudioContext || window.webkitAudioContext;
        if (!C) return null;
        actx = new C();
    }
    if (actx.state == 'suspended') actx.resume();
    return actx;
}
function tone(freq, at, dur, vol, type) {
    var c = ac(); if (!c) return;
    var t = c.currentTime + (at || 0);
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.014);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.06);
}
// two octaves of A minor pentatonic. the path walks up it whatever its length.
var LADDER = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 784];
function step(i, n) {
    var f = LADDER[Math.min(LADDER.length - 1, Math.round(i / Math.max(1, n - 1) * (LADDER.length - 1)))];
    tone(f, 0, 0.32, 0.16, 'triangle');
    tone(f * 2, 0, 0.11, 0.035, 'sine');
}
// the original plays move3 once per round (both blocks land in the same
// round). Here the player's block lands first and the bot's answer comes
// 130ms behind at half the volume, so you can hear that there were two moves.
function place(x, w, who, at) {
    sfx('move3', who == 2 ? 0.3 : 0.55, at || 0);
}
// both of you reached for the same square and it annihilated
function clash() {
    sfx('collision3', 0.7);
}
// off cleanup() in the original client: more than one winner is a draw game,
// you are youwin, anything else is gameover
function chord(winner) {
    if (winner == 3) sfx('drawgame', 0.8);
    else if (winner == 2) sfx('gameover', 0.8);
    else sfx('youwin', 0.8);
}

Vue.component('stockTile', {
    props: [ "opt", "width", "height", "selected", "enabled", "preview" ],
    template: `<div ref="element"
            :style="{ 'box-sizing': 'border-box', background, border, minWidth: width, minHeight: height, width, height }"
            :class="{ tile: true, enabled, hover }"
            @mouseenter="mouseenter"
            @mouseleave="mouseleave"
            @click="click"></div>`,
    
    data () {
        return {
            background: '',
            border:"",
            
            x: null,
            y: null,
            hover: false,
        }
    },
    
    mounted () {
        this.opt = this.opt || {};
        this.updateStyle();
        this.draw();
    },
    
    methods: {
        draw: function() {
            this.$refs.element.innerHTML =
                drawUtil.computeSvgHeader(this.width, this.height) +
                drawUtil[this.opt.type] +
                drawUtil.svgFooter;
        },
        updateStyle: function() {
            let baseBackground = Color('rgb(200, 200, 200)');
            
            baseBackground = baseBackground.lighten(.3);
            if (this.enabled) {
                if (this.hover) baseBackground = baseBackground.mix(Color("#f5f"));
            }
            
            this.background = baseBackground.rgb().string();
        },
        
        mouseenter: function(e) {
            this.hover = true;
            this.updateStyle();
            if (this.enabled && this.opt.stock) {
                // the original played hover.ogg on every menu block you passed
                // over, which is most of why picking a block feels like handling
                // something. quiet, because you pass over a lot of them.
                sfx('hover', 0.28);
                this.$emit('mouseenter', this.opt, e);
            }
        },
        mouseleave: function(e) {
            this.hover = false;
            this.updateStyle();
            if (this.opt.stock) {
                this.$emit('mouseleave', this.opt, e);
            }
        },
        click: function(e) {
            this.hover = false;
            this.updateStyle();
            this.$emit('click', this.opt, e);
        },
    },
    
    watch: {
        // opt: function() {
        //     this.draw();
        //     this.updateStyle();
        // },
    }
});

Vue.component('tile', {
    props: [ "opt", "width", "height", "selected", "enabled", "highlight", "you", "bot" ],
    template: `<div ref="element"
            :style="{ 'box-sizing': 'border-box', background, border, minWidth: width, minHeight: height, width, height }"
            :class="{ tile: true, enabled, hover }"
            @mouseenter="mouseenter"
            @mouseleave="mouseleave"
            @click="click"></div>`,
    
    data () {
        return {
            background: '',
            border:"",
            
            x: null,
            y: null,
            hover: false,
        }
    },
    
    mounted () {
        this.opt = this.opt || {};
        this.updateStyle();
        this.draw();
    },
    
    methods: {
        draw: function() {
            if (this.preview && this.preview.type && drawUtil[this.preview.type]) {
                this.drawSvg(this.preview.type);
            }
            else if (this.opt.type && drawUtil[this.opt.type]) {
                this.drawSvg(this.opt.type);
            }
            else {
                this.$refs.element.innerHTML = "";
            }
        },
        drawSvg: function(tilename) {
            if (tilename == 'mine' && this.opt.properties.placer != 1) {
                this.$refs.element.innerHTML = "";
            }
            else {
                if (tilename == 'mine') tilename = 'mine_board';
                let body = drawUtil[tilename];
                if (tilename == 'base') {
                    // the jewel in the middle of a base is that side's colour
                    let jewel = this.opt.properties.placer == 2 ? this.bot : this.you;
                    body = body.replace('class="jewel"',
                        `class="jewel" fill="${jewel}" stroke="rgba(0,0,0,.35)" stroke-width="1.5"`);
                }
                this.$refs.element.innerHTML =
                        drawUtil.computeSvgHeader(this.width, this.height) +
                        body +
                        drawUtil.svgFooter;
            }
        },
        
        updateStyle: function() {
            let baseBackground = Color('rgb(200, 200, 200)');
            let borderColor = Color("#bababa");
            let type = this.opt.type;
            
            if (type == 'mine' && this.opt.properties.placer != 1) type = 'blank';
            if (type == 'collision') {
                this.border = '1px solid black';
                this.background = 'black';
                return;
            }
            
            if (this.hover) baseBackground = baseBackground.mix(Color('white'));
            if (this.highlight) {
                if (this.highlight.preview) {
                    baseBackground = baseBackground.lighten(.3);
                }
                // if (this.highlight.left) {
                //     baseBackground = baseBackground.mix(Color('#5f5'));
                //     borderColor = borderColor.mix(Color("#5d5"));
                // }
                // if (this.highlight.right) {
                //     baseBackground = baseBackground.mix(Color('#eae'));
                //     borderColor = borderColor.mix(Color("#c9c"));
                // }
                if (typeof this.highlight.weight == 'number') {
                    let val = Math.round(this.highlight.weight * 0xff);
                    let weightColor = Color(`rgb(0, ${val}, 0)`);
                    baseBackground = baseBackground.mix(weightColor);
                    borderColor = borderColor.mix(weightColor);
                }
                if (typeof this.highlight.mask == 'number') {
                    let weightColor = this.highlight.mask
                                        ? Color(`rgb(0, 0, 255)`)
                                        : Color(`rgb(255, 0, 0)`);
                    baseBackground = baseBackground.mix(weightColor);
                    borderColor = borderColor.mix(weightColor);
                }
                if (typeof this.highlight.short == 'number') {
                    let blue = Math.round(this.highlight.short * 0xff);
                    let weightColor = Color(`rgb(0, 0, ${blue})`);
                    baseBackground = baseBackground.mix(weightColor);
                    borderColor = borderColor.mix(weightColor);
                }
                // The overlay is one number, how likely a square is to be taken
                // next, and it used to be red wherever it landed. The strength
                // is still the number; the hue is the side whose road reaches
                // the square.
                if (typeof this.highlight.player == 'number' && this.highlight.player > 0) {
                    let you = Color(this.you || '#b9a7e0');
                    let bot = Color(this.bot || '#5fa8a0');
                    // side 1 / 2 / 0 is which road actually reaches this
                    // square (opponent.js ownReach), not which base is nearer.
                    // null means neither road touches it, and a square nobody's
                    // line reaches must not wear anybody's colour. It still
                    // shows its strength, in grey, making no claim about whose
                    // it is.
                    let side = this.highlight.side;
                    let claimed = side === 1 || side === 2 || side === 0;
                    let c = side == 2 ? bot : (side == 1 ? you
                            : (side === 0 ? you.mix(bot) : Color('#8c8c8c')));
                    let amt = Math.min(1, this.highlight.player) * (claimed ? 0.85 : 0.35);
                    baseBackground = baseBackground.mix(c, amt);
                    borderColor = borderColor.mix(c, amt);
                }
            }
            
            if (/blank/.test(type)) {
                if (!this.preview || this.preview && /blank/.test(this.preview.type)) {
                    this.border = `1px solid ${borderColor.rgb().string()}`;
                }
            }
            else {
                this.border = "";
                baseBackground = baseBackground.lighten(.1);

                // a placed tile belongs to whoever put it down, and wears them
                let placer = this.opt.properties.placer;
                if (placer == 1 || placer == 2) {
                    let side = Color(placer == 2 ? this.bot : this.you);
                    baseBackground = baseBackground.mix(side, type == 'base' ? .5 : .62);
                }
            }

            this.background = baseBackground.rgb().string();
        },
        
        mouseenter: function(e) {
            this.hover = true;
            this.updateStyle();
            this.$emit('mouseenter', this.opt, e);
        },
        mouseleave: function(e) {
            this.hover = false;
            this.updateStyle();
            this.$emit('mouseleave', this.opt, e);
        },
        click: function(e) {
            this.$emit('click', this.opt, e);
        },
    },
    
    watch: {
        'selected': function() {
            this.updateStyle();
        },
        opt: function() {
            this.updateStyle();
            this.draw();
        },
        'highlight.preview': function() {
            this.updateStyle();
        },
        'highlight.left': function() {
            this.updateStyle();
        },
        'highlight.right': function() {
            this.updateStyle();
        },
        'highlight.weight': function() {
            this.updateStyle();
        },
        'highlight.mask': function() {
            this.updateStyle();
        },
        'highlight.short': function() {
            this.updateStyle();
        },
        'highlight.player': function() {
            this.updateStyle();
        },
        // side picks the hue, so it has to repaint on its own -- a square can
        // change which road reaches it while its probability holds still
        'highlight.side': function() {
            this.updateStyle();
        },
        you: function() {
            this.updateStyle();
            this.draw();
        },
        bot: function() {
            this.updateStyle();
            this.draw();
        },
    }
});

window.game = new Vue({
    el: '#board',
    components: [ "tile" ],
    template: `
        <div v-if="board" class="container">
            <div class="board" ref="board">
                <table style="cellspacing:0;">
                    <tr class="boardRow" v-for="(_, y) in board.height">
                        <td v-for="(_, x) in board.width">
                            <div style='position:relative;'>
                            <div>
                                <tile v-if="previewTile && previewTile.properties.x == x && previewTile.properties.y == y"
                                    :opt="previewTile.whenPlacedOn(board.get(x,y))"
                                    :width="'50px'"
                                    :height="'50px'"
                                    :enabled="true"
                                    :you="youColor"
                                    :bot="botColor"
                                    :highlight="{
                                        preview: previewMap && previewMap[[x,y]],
                                        left: leftMap && leftMap[[x,y]],
                                        right: rightMap && rightMap[[x,y]],
                                        weight: weightMap && weightMap[[x,y]],
                                        mask: maskMap && maskMap[[x,y]],
                                        short: shortDistances && shortDistances[[x,y]],
                                        player: playerDistances && playerDistances[[x,y]],
                                        side: playerSides && playerSides[[x,y]],
                                    }"></tile>
                                <tile
                                    v-else-if="board.get(x, y)"
                                    :opt="board.get(x, y)"
                                    :width="'50px'"
                                    :height="'50px'"
                                    :enabled="true"
                                    :you="youColor"
                                    :bot="botColor"
                                    :highlight="{
                                        preview: previewMap && previewMap[[x,y]],
                                        left: leftMap && leftMap[[x,y]],
                                        right: rightMap && rightMap[[x,y]],
                                        weight: weightMap && weightMap[[x,y]],
                                        mask: maskMap && maskMap[[x,y]],
                                        short: shortDistances && shortDistances[[x,y]],
                                        player: playerDistances && playerDistances[[x,y]],
                                        side: playerSides && playerSides[[x,y]],
                                    }"
                                    @click="tileClicked"
                                    @mouseenter="mouseenter"
                                    @mouseleave="mouseleave"></tile>
                            </div>
                            <div v-if="board.get(x,y).type == 'collision'" class="collisionFade">
                                <div style="display:table;width:100%;height:100%;">
                                    <div style="display:table-cell;vertical-align:middle;text-align:center;">
                                        {{board.get(x,y).properties.fade}}
                                    </div>
                                </div>
                            </div>
                            <div v-if="selected && selected.properties.x == x && selected.properties.y == y" class="selectBox">
                                <div class="selectOutline"></div>
                            </div>
                            <div v-if="!winner && roads[[x,y]]" class="roadMark"
                                :style="roadStyle(x,y)"></div>
                            <div v-if="winner && lit(x,y)" class="winGlow"
                                :style="{ borderColor: winColor,
                                          boxShadow: '0 0 14px ' + winColor + ', inset 0 0 10px ' + winColor }"></div>
                            </div>
                        </td>
                    </tr>
                </table>
                <div v-if="winShow" class="winOver">
                    <div class="winCard">
                        <div class="winLine">{{ winLine }}</div>
                        <div class="winSub">{{ winSub }}</div>
                        <div class="winAgain" @click.stop="init">play it again</div>
                    </div>
                </div>
            </div>

            <table style="width:100%;">
                <tr>
                    <td>
                        <div v-if="topStock && bottomStock">
                            <div>
                                <div v-for="tilename in topStock" style="display:inline-block;position:relative;">
                                    <stockTile
                                        :width='"80px"'
                                        :height='"80px"'
                                        :opt="{ stock: true, type: tilename }"
                                        :enabled='canPlaceTile(tilename)'
                                        @click='stockClicked'
                                        @mouseenter='stockMouseenter'
                                        @mouseleave='stockMouseleave'></stockTile>
                                    <div :class="{ 'stockBanner': true, enabled: canPlaceTile(tilename) }" v-if="left.stock[tilename] > 0 && left.stock[tilename] < Infinity">{{left.stock[tilename]}}</div>
                                </div>
                            </div>
                            <div>
                                <div v-for="tilename in bottomStock" style="display:inline-block;position:relative;">
                                    <stockTile
                                        :width='"80px"'
                                        :height='"80px"'
                                        :opt="{ stock: true, type: tilename }"
                                        :enabled='canPlaceTile(tilename)'
                                        @click='stockClicked'
                                        @mouseenter='stockMouseenter'
                                        @mouseleave='stockMouseleave'></stockTile>
                                    <div :class="{ 'stockBanner': true, enabled: canPlaceTile(tilename) }" v-if="left.stock[tilename] > 0 && left.stock[tilename] < Infinity">{{left.stock[tilename]}}</div>
                                </div>
                            </div>
                        </div>
                    </td>
                    <td class="hoverInfo">
                        <div class="readout">
                            <div v-if="winner" class="wonBlock" @click="replay">
                                <div v-if="winner == 1" class="won" :style="{ color: youColor }">you reached its base</div>
                                <div v-else-if="winner == 2" class="won" :style="{ color: botColor }">it reached your base</div>
                                <div v-else class="won">both bases fell on the same turn</div>
                                <div class="again">again</div>
                            </div>
                            <div v-if="!winner" class="roadLine">
                                <span :style="{ color: youColor }">your line</span>
                                <span :class="{ touching: youTouch }">{{ youTouch ? 'reaches its base' : 'does not reach its base' }}</span>
                                &middot;
                                <span :style="{ color: botColor }">its line</span>
                                <span :class="{ touching: botTouch }">{{ botTouch ? 'reaches yours' : 'does not reach yours' }}</span>
                            </div>
                            <!-- the two lines that are about THIS turn go above
                                 the lifetime numbers, so they are visible without
                                 scrolling the readout. -->
                            <div v-if="why" class="whyLine">
                                {{ whyText }}
                                <span class="whySaid">{{ whySaid }}</span>
                            </div>
                            <div v-if="situation && situation.threats" class="sitThreat">
                                you can connect this turn &mdash; it sees {{situation.threats}} square{{situation.threats == 1 ? '' : 's'}}
                            </div>
                            <div v-if="situation" class="sitLine">
                                <span class="sitName">{{situation.sit}}</span>
                                <span class="sitArm">playing {{situation.arm}}</span>
                                <span class="sitRec" v-if="situation.n">&middot; won {{situation.won}} of {{situation.n}} here</span>
                                <span class="sitRec" v-else>&middot; never been here</span>
                            </div>
                            <div v-if="guess">it thinks you go {{guess.x}}, {{guess.y}} next</div>
                            <div v-else>it has nowhere to guess yet</div>
                            <div>{{seen}} of your moves seen &middot; {{tailorPct}}% you, {{100 - tailorPct}}% anybody</div>
                            <div v-if="stridePct">{{stridePct}}% of that is where you go from where you just were</div>
                            <div v-if="botTotal">it has {{botLeft}} of its {{botTotal}} limited tiles left</div>
                            <div v-if="guesses">right {{hits}} of {{guesses}} &middot; wrong {{guesses - hits}}</div>
                            <div v-if="guesses" :class="{ run: true, broke: justCalled }">
                                <span v-if="justCalled">it just called that one</span>
                                <span v-else-if="streak">{{streak}} in a row it did not see coming</span>
                                <span v-else>counting your run from here</span>
                            </div>
                            <div v-if="bestRun > 1" class="runSub">longest {{bestRun}}</div>
                            <div v-if="learned" class="runSub">
                                learned from {{learned.sits}} situation{{learned.sits == 1 ? '' : 's'}} &middot; {{mindGames}} game{{mindGames == 1 ? '' : 's'}} in
                            </div>
                        </div>
                        <div class="colors">
                            <div class="swatches">
                                <div v-for="c in palette"
                                    :class="{ swatch: true, on: c.hex == youColor }"
                                    :style="{ background: c.hex }"
                                    :title="c.name"
                                    @click="pickColor(c)"></div>
                            </div>
                            <div class="swatchName">yours &middot; {{youName}}</div>
                            <div class="swatches">
                                <div class="swatch mine" :style="{ background: botColor }" :title="botName"></div>
                            </div>
                            <div class="swatchName">mine &middot; {{botName}}</div>
                        </div>
                        <div v-if="hoverTile">
                            <div>type: {{hoverTile.type}}</div>
                            <div>placer: {{hoverTile.properties.placer}}</div>
                            <div>x: {{hoverTile.properties.x}}</div>
                            <div>y: {{hoverTile.properties.y}}</div>
                            <div>weight: {{weightMap ? weightMap[[hoverTile.properties.x, hoverTile.properties.y]] : '?'}}</div>
                        </div>
                    </td>
                </tr>
            </table>
        </div>
    `,
    
    data () {
        return {
            turn: null,
            board: null,
            left: null,
            right: null,
            
            selected: null,
            
            topStock: null,
            bottomStock: null,
            
            winner: null,
            situation: null,
            why: null,
            whyText: '',
            whySaid: '',
            mindGames: 0,
            learned: null,
            winVia: null,
            // the board's own reading of the two networks, kept live instead of
            // only at the end. roads is a bitfield per square: 1 your base
            // reaches it, 2 its base reaches it, 4 it leads to its base and
            // your line does not get there yet.
            roads: {},
            youTouch: false,
            botTouch: false,
            guess: null,
            tailoring: 0,
            tailorPct: 0,
            stridePct: 0,
            botLeft: 0,
            botTotal: 0,
            botStart: {},
            seen: 0,
            hits: 0,
            guesses: 0,
            streak: 0,
            bestRun: 0,
            justCalled: false,

            winPath: {},
            winTurn: null,
            winOrder: [],
            winLit: 0,
            winRun: 0,
            winShow: false,

            palette: PALETTE,
            youColor: (function() {
                try { return localStorage.getItem(COLOR_KEY) || PALETTE[0].hex; }
                catch (e) { return PALETTE[0].hex; }
            })(),
            botColor: BOT.hex,
            botName: BOT.name,

            hoverTile: null,
            previewTile: null,
            previewMap: {},
            leftMap: {},
            rightMap: {},
            weightMap: {},
            maskMap: {},
            shortDistances: {},
            playerDistances: {},
            playerSides: {},
        };
    },
    
    mounted: function() {
        this.init();
        document.body.addEventListener("click", this.deselect);
    },
    
    computed: {
        youName: function() {
            for (let c of this.palette) if (c.hex == this.youColor) return c.name;
            return 'yours';
        },
        // the route lights in the colour of whoever walked it
        winColor: function() {
            if (this.winner == 2) return this.botColor;
            if (this.winner == 3) return '#ffb300';
            return this.youColor;
        },
        winLine: function() {
            if (this.winner == 1) return 'you reached its base';
            if (this.winner == 2) return 'it reached your base';
            if (this.winner == 3) return 'both bases fell on the same turn';
            return '';
        },
        winSub: function() {
            if (!this.winner) return '';
            var n = Object.keys(this.winPath).length;
            return 'turn ' + this.winTurn + ' · ' + n + ' squares in the line';
        },
    },

    watch: {
        previewTile: function() {
            let previewMap = [];
            if (this.previewTile) {
                let theoretical = this.previewTile.whenPlacedOn(this.selected);
                theoretical.properties.range.forEach(xy => {
                    previewMap[xy] = 1;
                });
            }
            this.previewMap = previewMap;
        },
    },
    
    methods: {
        init: function() {
            // the first game of the session is silent here -- no gesture yet, so
            // the browser refuses the play and sfx() swallows it. every "play it
            // again" after that opens the way the original opened.
            sfx('newgame', 0.6);
            this.turn = 0;
            this.winner = null;
            this.learned = null;
            this.winPath = {};
            this.winTurn = null;
            this.winOrder = [];
            this.winLit = 0;
            this.winRun++;          // stops the loop still walking the old line
            this.winShow = false;
            this.selected = null;
            this.left = playerUtil.create(4, 5);
            this.right = playerUtil.create(16, 5);
            this.botStart = {};
            for (let k in this.right.stock) this.botStart[k] = this.right.stock[k];
            this.board = boardUtil.create(21, 11, this.left, this.right);
            this.topStock = [];
            this.bottomStock = [];
            
            let idx = 0;
            for (let stockName in this.left.stock) {
                if (idx++ % 2 == 0) {
                    this.topStock.push(stockName);
                }
                else {
                    this.bottomStock.push(stockName);
                }
            }
            
            this.left.base = tiles.base({
                x: 4,
                y: 5,
                owner: 1,
                placer: 1,
            });
            this.board.set(
                this.left.base.properties.x,
                this.left.base.properties.y,
                this.left.base);
            
            this.right.base = tiles.base({
                x: 16,
                y: 5,
                owner: 2,
                placer: 2,
            });
            this.board.set(
                this.right.base.properties.x,
                this.right.base.properties.y,
                this.right.base);
            
            this.updateBoard();
        },
        updateBoard: function() {
            this.leftMap = boardUtil.traverse(
                this.left.base.properties.x,
                this.left.base.properties.y,
                this.board, 1);
            this.rightMap = boardUtil.traverse(
                this.right.base.properties.x,
                this.right.base.properties.y,
                this.board, 2);
            
            for (let x = 0; x < this.board.width; x++) {
                for (let y = 0; y < this.board.height; y++) {
                    let owners = [];
                    let tile = this.board.get(x,y);
                    if (tile.type == 'collision') {
                        tile.properties.fade--;
                        if (tile.properties.fade <= 0) {
                            tile = tiles.blank({x, y});
                            this.board.set(x, y, tile, true);
                        }
                    }
                    
                    if (tile.type != 'collision') {
                        if (this.leftMap[[x,y]]) owners.push(1);
                        if (this.rightMap[[x,y]]) owners.push(2);
                        tile.properties.owners = owners;
                    }
                }
            }
            
            // The board used to keep its reading of the two networks to itself
            // and only show it after somebody won -- the two lines that would
            // have drawn it were commented out at the top of updateStyle. It
            // is on now, every move, before any verdict: which squares each
            // base can actually reach, and the far half of an unfinished road.
            // Conduction is directed -- a `right` tile sends you to x+1 and
            // nowhere else -- so a chain of tiles that looks like a path is
            // not always a path, and this is the only way to see that.
            this.toIts = this.reaches(this.right.base.properties.x,
                                      this.right.base.properties.y);
            let roads = {};
            for (let x = 0; x < this.board.width; x++) {
                for (let y = 0; y < this.board.height; y++) {
                    let k = [x, y];
                    let mine = !!this.leftMap[k], theirs = !!this.rightMap[k];
                    // a square that leads to its base but that your line does
                    // not get to yet. Blanks conduct nothing, so this is only
                    // ever tiles: the gap, drawn.
                    let lead = !mine && !theirs && !!this.toIts[k];
                    if (mine || theirs || lead) {
                        roads[k] = (mine ? 1 : 0) | (theirs ? 2 : 0) | (lead ? 4 : 0);
                    }
                }
            }
            this.roads = roads;
            this.youTouch = !!this.leftMap[[this.right.base.properties.x,
                                            this.right.base.properties.y]];
            this.botTouch = !!this.rightMap[[this.left.base.properties.x,
                                             this.left.base.properties.y]];

            // whoever's network reaches the other base first. this was never
            // checked anywhere, so nobody could win.
            let wasWon = this.winner;
            // An earlier ownership test -- you had to have laid a tile on the
            // road you won on -- produced both missed wins (the player's route
            // ran over the bot's tiles) and false wins (the bot's route back
            // ran over the player's, which a road of symmetric tiles always
            // allows). The board never had that rule: boardUtil.update asks
            // one question of a base, do both networks stand on it. So that is
            // the question again, and the ownership idea is demoted to picking
            // which line lights up. The verdict itself lives in score(): one
            // place, no side effects, so it can be run headlessly against a
            // saved position.
            let v = this.score();
            if (v.winner) this.winner = v.winner;
            if (this.winner && !wasWon) {
                this.winTurn = this.turn + 1;
                this.winPath = this.winner == 2
                    ? this.tracePath(this.rightMap, this.right.base, this.left.base, 2, v.botVia)
                    : this.tracePath(this.leftMap, this.left.base, this.right.base, 1, v.youVia);
                // the only moment the table moves. every situation category this
                // game passed through gets the result written against the
                // strategy it chose there.
                if (opponent.credit) this.learned = opponent.credit(this.winner);
                this.playWin();
            }

            // the overlay on the board is not distance. it is the probability
            // matrix: how likely each square is to be the one the player takes next.
            let pred = opponent.predict(this.makeBotBoard());
            this.shortDistances = {};
            this.playerDistances = pred.shown;
            this.playerSides = pred.side;
            this.guess = pred.best;
            this.tailoring = pred.weight;
            this.tailorPct = Math.round(pred.weight * 100);
            this.stridePct = Math.round((pred.stride || 0) * 100);
            // the bot's tiles are limited too, and the readout shows it spend.
            let bl = 0, bt = 0;
            for (let k in this.right.stock) {
                let v = this.right.stock[k];
                if (v === Infinity) continue;
                bl += Math.max(0, v);
                bt += this.botStart[k] || 0;
            }
            this.botLeft = bl;
            this.botTotal = bt;
            this.seen = opponent.player.n;
            this.hits = opponent.player.hits;
            this.guesses = opponent.player.guesses;
            this.streak = opponent.player.streak || 0;
            this.bestRun = opponent.player.best || 0;
            // justCalled is true only for the one repaint that follows the move
            // it caught, so the line is an event and not a standing label.
            this.justCalled = !!opponent.player.calledAt;
            // which of its situation categories the board is standing in, and
            // what it has learned to play there
            this.situation = opponent.situation || null;
            // which rule moved the bot's last piece (opponent.js: ways / live /
            // nerve / coin), with a one-line explanation for the readout.
            let w = opponent.why || null;
            this.why = w;
            if (w) {
                if (w.rule === 'ways') {
                    this.whyText = 'it built ' + (w.ways >= 3 ? 'three' : 'two') + ' ways to win, not one';
                    this.whySaid = 'you can only block one of them';
                } else if (w.rule === 'live') {
                    this.whyText = 'it blocked you with a tile that also builds';
                    this.whySaid = 'the block opens cells behind it, not in front of you';
                } else if (w.rule === 'nerve') {
                    this.whyText = 'it took the square it would have stepped off';
                    this.whySaid = 'no hedging when the move sets up its own win';
                } else if (w.rule === 'coin') {
                    this.whyText = w.tied + ' moves were this close and it flipped';
                    this.whySaid = 'a coin flip among near-equal moves';
                }
            }
            let m = opponent.mind ? opponent.mind() : null;
            this.mindGames = m ? m.games : 0;
        },
        
        // Is any tile on a route from `from` to `to` one that `placer` put
        // down. A road made entirely of the other side's tiles is theirs to
        // walk, not yours to win on -- this decides which line lights up.
        // Two earlier versions got it wrong. The first walked back along ONE
        // chain, taking the first predecessor in scan order at every depth;
        // if that arbitrary chain ran entirely over the bot's tiles the win
        // was thrown away even with a route of the player's own tiles right
        // beside it. The second walked SHORTEST routes only, stepping
        // strictly from depth d to depth d-1, so a road of the player's own
        // tiles one square longer than the best road did not exist as far as
        // the win was concerned (a draw where both bases fell on the same
        // turn scored only the bot's half). The question was never "is your
        // tile on a shortest road", it is "is there a road at all that you
        // helped build".
        //
        // So: the cells your base can reach (map, already computed), the cells
        // that can reach their base (reaches(), the same walk run backwards),
        // and any tile of yours standing in both is a road you laid -- base to
        // that tile, that tile to their base, concatenated. Length is not part
        // of it any more. winVia remembers the tile so the line that lights up
        // can be made to run through it.
        laidSome: function(map, from, to, placer) {
            this.winVia = null;
            if (!map[[to.properties.x, to.properties.y]]) return false;
            let back = this.reaches(to.properties.x, to.properties.y);
            let best = null, bestD = Infinity;
            for (let x = 0; x < this.board.width; x++) {
                for (let y = 0; y < this.board.height; y++) {
                    if (!map[[x, y]] || !back[[x, y]]) continue;
                    let tile = this.board.get(x, y);
                    if (!tile || tile.type == 'base' || tile.type == 'blank') continue;
                    if (tile.properties.placer != placer) continue;
                    // the shortest way through is still the prettiest line, so
                    // prefer it -- but no longer require it.
                    let d = map[[x, y]] + back[[x, y]];
                    if (d < bestD) { bestD = d; best = { x, y }; }
                }
            }
            this.winVia = best;
            return !!best;
        },

        // The verdict, and nothing else: no board writes, no sound, no timers.
        // A base falls when both networks stand on it -- that is the only
        // question boardUtil.update ever asked, and it is the one the board is
        // back to asking. Whether you laid a tile on the road no longer decides
        // anything; it only picks which line is worth lighting up.
        score: function() {
            let lb = this.left.base.properties, rb = this.right.base.properties;
            let botIn = !!this.rightMap[[lb.x, lb.y]];
            let youIn = !!this.leftMap[[rb.x, rb.y]];
            let botVia = botIn && this.laidSome(this.rightMap, this.right.base, this.left.base, 2)
                    ? this.winVia : null;
            let youVia = youIn && this.laidSome(this.leftMap, this.left.base, this.right.base, 1)
                    ? this.winVia : null;
            // both halves are scored before either one is allowed to end the
            // game, so a turn where both roads land is a draw and not a race.
            let winner = botIn ? 2 : null;
            if (youIn) winner = botIn ? 3 : 1;
            return { botIn, youIn, botVia, youVia, winner };
        },

        // every cell from which (tx,ty) can be reached, and how many steps it
        // takes: the traversal run backwards along the same range edges. A
        // tile's range is where it sends you, so the reverse edges have to be
        // built by hand -- there is no back-pointer on a tile.
        reaches: function(tx, ty) {
            let pred = {};
            for (let x = 0; x < this.board.width; x++) {
                for (let y = 0; y < this.board.height; y++) {
                    let tile = this.board.get(x, y);
                    if (!tile || !tile.properties.range) continue;
                    for (let r of tile.properties.range) {
                        if (r[0] < 0 || r[1] < 0
                            || r[0] >= this.board.width || r[1] >= this.board.height) continue;
                        let k = [r[0], r[1]];
                        (pred[k] = pred[k] || []).push([x, y]);
                    }
                }
            }
            let seen = {};
            seen[[tx, ty]] = 1;
            let frontier = [[tx, ty]], depth = 1, guard = 0;
            while (frontier.length && guard++ < 5000) {
                let next = [];
                for (let c of frontier) {
                    for (let p of (pred[[c[0], c[1]]] || [])) {
                        if (seen[[p[0], p[1]]]) continue;
                        seen[[p[0], p[1]]] = depth + 1;
                        next.push(p);
                    }
                }
                depth++;
                frontier = next;
            }
            return seen;
        },

        // the line that lights up should be the line the player drew. This
        // used to take the first predecessor in scan order, which is a real
        // route but not necessarily yours, so squares you never placed lit up
        // as your path. Your own tiles win the tie in the backtrace now. And
        // since the win itself no longer has to sit on a shortest road, the
        // lit line must not either: if the straight backtrace comes home
        // carrying none of your tiles, the route is rebuilt in two legs
        // through `via`, the tile that actually earned the win -- your base to
        // it, it to their base.
        tracePath: function(map, from, to, placer, via) {
            let one = this.traceLeg(map, from, to, placer);
            if (!via) return one.path;
            let carries = one.seq.some(c => {
                let t = this.board.get(c.x, c.y);
                return t && t.type != 'base' && t.properties.placer == placer;
            });
            if (carries) return one.path;

            let hub = { properties: { x: via.x, y: via.y } };
            let legA = this.traceLeg(map, from, hub, placer);
            let viaMap = boardUtil.traverse(via.x, via.y, this.board, placer);
            let legB = this.traceLeg(viaMap, hub, to, placer);
            let path = {}, seq = [];
            for (let k in legA.path) path[k] = true;
            for (let k in legB.path) path[k] = true;
            for (let c of legA.seq) seq.push(c);
            for (let c of legB.seq) {
                let last = seq[seq.length - 1];
                if (last && last.x == c.x && last.y == c.y) continue;
                seq.push(c);
            }
            this.winOrder = seq;
            return path;
        },

        traceLeg: function(map, from, to, placer) {
            let path = {};
            let seq = [];
            let cur = { x: to.properties.x, y: to.properties.y };
            let guard = 0;
            while (guard++ < 500) {
                path[[cur.x, cur.y]] = true;
                seq.push({ x: cur.x, y: cur.y });
                let d = map[[cur.x, cur.y]];
                if (!d || d <= 1) break;
                let prev = null, fallback = null;
                for (let x = 0; x < this.board.width && !prev; x++) {
                    for (let y = 0; y < this.board.height && !prev; y++) {
                        if (map[[x, y]] !== d - 1) continue;
                        let cell = this.board.get(x, y);
                        for (let r of cell.properties.range) {
                            if (r[0] == cur.x && r[1] == cur.y) {
                                if (cell.properties.placer == placer) prev = { x, y };
                                else if (!fallback) fallback = { x, y };
                                break;
                            }
                        }
                    }
                }
                if (!prev) prev = fallback;
                if (!prev) break;
                cur = prev;
            }
            let fx = from.properties.x, fy = from.properties.y;
            path[[fx, fy]] = true;
            // the walk usually lands on its own base already; only add it if not
            let last = seq[seq.length - 1];
            if (!last || last.x != fx || last.y != fy) seq.push({ x: fx, y: fy });
            seq.reverse();
            this.winOrder = seq;
            return { path: path, seq: seq };
        },

        // the route plays the ladder and the chord: one step per square from
        // the base outward, then the chord where it lands. As in the original,
        // no more moves are allowed and the board keeps showing the sequence
        // that led to the result, so this does not run once and stop. The
        // first pass carries the notes and the chord; every pass after that is
        // the line drawing itself again, silent, until a new game starts.
        // winRun is the token -- bumping it kills whatever loop is in flight,
        // so a click on "again" replaces the walk instead of stacking on it.
        playWin: function() {
            let self = this;
            let token = ++this.winRun;
            let n = (this.winOrder || []).length;
            if (!n) return;
            this.winShow = false;

            let pass = function(withSound) {
                if (token != self.winRun) return;
                self.winLit = 0;
                let i = 0;
                let tick = function() {
                    if (token != self.winRun) return;
                    if (withSound) step(i, n);
                    self.winLit = ++i;
                    if (i < n) {
                        setTimeout(tick, 110);
                    }
                    else {
                        setTimeout(function() {
                            if (token != self.winRun) return;
                            if (withSound) { chord(self.winner); self.winShow = true; }
                            setTimeout(function() { pass(false); }, 1500);
                        }, 120);
                    }
                };
                tick();
            };
            pass(true);
        },

        // walk the route again, sound and all
        replay: function() {
            if (this.winner) this.playWin();
        },

        pickColor: function(c) {
            this.youColor = c.hex;
            try { localStorage.setItem(COLOR_KEY, c.hex); } catch (e) {}
            // a short chime in the colour's own place on the ladder, so picking
            // one is an event and not a form field
            let i = this.palette.indexOf(c);
            tone(LADDER[Math.max(0, Math.min(LADDER.length - 1, i + 2))], 0, 0.26, 0.11, 'triangle');
        },

        // the reading, per square, in the colour of whoever's base can get
        // there. A square both networks stand on gets both rings, because that
        // is the square a game turns on -- and a base wearing both rings is
        // exactly the draw condition, visible one move before it happens.
        roadStyle: function(x, y) {
            let r = this.roads && this.roads[[x, y]];
            if (!r) return {};
            let you = this.youColor || '#b9a7e0';
            let bot = this.botColor || '#5fa8a0';
            if ((r & 1) && (r & 2)) {
                return { boxShadow: `inset 0 0 0 2px ${you}, inset 0 0 0 4px ${bot}`,
                         opacity: .9 };
            }
            if (r & 1) return { boxShadow: `inset 0 0 0 2px ${you}`, opacity: .55 };
            if (r & 2) return { boxShadow: `inset 0 0 0 2px ${bot}`, opacity: .55 };
            // leads to its base; your line does not get here yet
            return { border: '2px dashed #ffb300', opacity: .4 };
        },

        lit: function(x, y) {
            for (let i = 0; i < this.winLit && i < this.winOrder.length; i++) {
                if (this.winOrder[i].x == x && this.winOrder[i].y == y) return true;
            }
            return false;
        },

        canPlaceTile: function(tilename) {
            if (this.winner) return false;
            if (!this.selected) return false;
            if (this.left.stock[tilename] <= 0) return false;
            let tile = tiles[tilename]({
                x: this.selected.properties.x,
                y: this.selected.properties.y,
                placer: 1,
            });
            
            return tile.canPlaceOn(this.selected, 1);
        },
        tileClicked: function(tile) {
            this.selected = tile;
        },
        deselect: function(event) {
            if (event.target == document.body) {
                this.selected = null;
            }
        },
        
        // The referee is updateBoard, and it used to be the LAST statement of
        // this method, so anything that threw above it left the player's tile
        // on the board with the sound played, the turn not counted and the
        // map frozen at the position BEFORE the move -- a won board that the
        // page still called ongoing. The likeliest thrower is the bot's own
        // half: board.set throws outright on a tile it cannot legally place,
        // and by then the player's tile is already down.
        //
        // So the referee runs in a `finally`. The player's half of the turn
        // can no longer be taken down by the bot's half, and no exception
        // anywhere in here can stop the board from being asked who won.
        stockClicked: function(opt) {
            if (!this.canPlaceTile(opt.type)) return;
            try {
                let owners = this.selected.properties.owners;
                if (owners.indexOf(1) == -1) owners.push(1);
                let tile = tiles[opt.type]({
                    x: this.selected.properties.x,
                    y: this.selected.properties.y,
                    owners,
                    placer: 1,
                });
                
                let botBoard = this.makeBotBoard();
                let guessedBefore = opponent.predicted;
                let botTile = opponent.make_move(botBoard);
                opponent.predicted = guessedBefore;
                opponent.observe(botBoard,
                    this.selected.properties.x,
                    this.selected.properties.y,
                    opt.type);
                if (!botTile) {
                    // bot timed out or didn't make move for some reason...
                    console.info("Bot did not make a move");
                }
                else if (!this.right.stock[botTile.type] || this.right.stock[botTile.type] < 0) {
                    // invalid move
                    console.error("Could not place bot tile (" + botTile.type + ") because no more of this tile type existed in stock");
                    botTile = null;
                }
                
                if (botTile && botTile.properties.x == this.selected.properties.x
                    && botTile.properties.y == this.selected.properties.y) {
                        this.board.set(
                            this.selected.properties.x,
                            this.selected.properties.y,
                            tiles.collision({
                                x: this.selected.properties.x,
                                y: this.selected.properties.y,
                            }));
                        clash();
                    }
                else {
                    this.board.set(this.selected.properties.x, this.selected.properties.y, tile);
                    // the player's inventory used to look infinite because this
                    // decrement was commented out, so only the bot ever spent
                    // anything. Same rule the bot follows: a tile is spent when it
                    // lands, and a collision costs neither side.
                    this.left.stock[opt.type]--;
                    place(this.selected.properties.x, this.board.width, 1, 0);
                    if (botTile) {
                        botTile.properties.placer = 2;
                        botTile.properties.owners = [];

                        // an illegal bot move costs the bot its move. It used
                        // to cost the player the whole turn, because board.set
                        // throws and this line sat between the player's tile
                        // landing and the referee running. The tile is only
                        // spent if it lands.
                        try {
                            this.board.set(botTile.properties.x, botTile.properties.y, botTile);
                            this.right.stock[botTile.type]--;
                            place(botTile.properties.x, this.board.width, 2, 0.13);
                        } catch (e) {
                            console.error('bot move rejected: ' + botTile.type
                                + ' @' + botTile.properties.x + ',' + botTile.properties.y, e);
                        }
                    }
                }
            } catch (e) {
                // the player's tile may already be on the board. Record the
                // failure in localStorage as well as the console, so it can be
                // read after the fact.
                console.error('turn threw after the player\'s tile landed:', e);
                try {
                    localStorage.setItem('cblox.lasterr', JSON.stringify({
                        m: String((e && e.message) || e),
                        stack: String((e && e.stack) || ''),
                        turn: this.turn, t: Date.now()
                    }));
                } catch (_) {}
            } finally {
                this.selected = null;
                this.previewMap = {};
                this.updateBoard();
                this.previewTile = null;
                this.turn++;
            }
        },
        makeBotBoard: function() {
            let botBoard = {
                data: {},
                turn: this.turn,
                width: this.board.width,
                height: this.board.height,
                left_base: this.left.base,
                right_base: this.right.base,
                left_ownership: this.leftMap,
                right_ownership: this.rightMap,
                stock: this.right.stock,
                // the bot cannot see the player's threats unless it is handed
                // the tiles the player still holds
                player_stock: this.left.stock,
            };
            for (let x = 0; x < this.board.width; x++) {
                for (let y = 0; y < this.board.height; y++) {
                    let tile = this.board.get(x, y);
                    if (tile.type == 'mine' && tile.properties.placer != 2) {
                        botBoard.data[[x,y]] = tiles.blank({x, y});
                    }
                    else {
                        botBoard.data[[x,y]] = tile;
                    }
                }
            }
            return botBoard;
        },
        stockMouseenter: function(opt) {
            if (this.canPlaceTile(opt.type)) {
                this.previewTile = tiles[opt.type]({
                    x: this.selected.properties.x,
                    y: this.selected.properties.y,
                    placer: 1,
                });
            }
        },
        stockMouseleave: function(opt) {
            this.previewTile = null;
        },

        mouseenter: function(tile) {
            this.hoverTile = tile;
            this.previewMap = boardUtil.traverse(tile.properties.x, tile.properties.y, this.board);
        },

        mouseleave: function(tile) {
            this.hoverTile = null;
            this.previewMap = {};
        },
    },
});

});