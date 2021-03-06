/**
 * front end
 */

'use strict';

window.addEventListener('load', function() {
//

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
    props: [ "opt", "width", "height", "selected", "enabled", "highlight" ],
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
                this.$refs.element.innerHTML =
                        drawUtil.computeSvgHeader(this.width, this.height) +
                        drawUtil[tilename] +
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
                if (typeof this.highlight.player == 'number') {
                    let red = Math.round(this.highlight.player * 0xff);
                    let weightColor = Color(`rgb(${red}, 0, 0)`);
                    baseBackground = baseBackground.mix(weightColor);
                    borderColor = borderColor.mix(weightColor);
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
    }
});

new Vue({
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
                                    :highlight="{
                                        preview: previewMap && previewMap[[x,y]],
                                        left: leftMap && leftMap[[x,y]],
                                        right: rightMap && rightMap[[x,y]],
                                        weight: weightMap && weightMap[[x,y]],
                                        mask: maskMap && maskMap[[x,y]],
                                        short: shortDistances && shortDistances[[x,y]],
                                        player: playerDistances && playerDistances[[x,y]],
                                    }"></tile>
                                <tile
                                    v-else-if="board.get(x, y)"
                                    :opt="board.get(x, y)"
                                    :width="'50px'"
                                    :height="'50px'"
                                    :enabled="true"
                                    :highlight="{
                                        preview: previewMap && previewMap[[x,y]],
                                        left: leftMap && leftMap[[x,y]],
                                        right: rightMap && rightMap[[x,y]],
                                        weight: weightMap && weightMap[[x,y]],
                                        mask: maskMap && maskMap[[x,y]],
                                        short: shortDistances && shortDistances[[x,y]],
                                        player: playerDistances && playerDistances[[x,y]],
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
                            </div>
                        </td>
                    </tr>
                </table>
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
            
            hoverTile: null,
            previewTile: null,
            previewMap: {},
            leftMap: {},
            rightMap: {},
            weightMap: {},
            maskMap: {},
            shortDistances: {},
            playerDistances: {},
        };
    },
    
    mounted: function() {
        this.init();
        document.body.addEventListener("click", this.deselect);
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
            this.turn = 0;
            this.left = playerUtil.create(4, 5);
            this.right = playerUtil.create(16, 5);
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
                this.board);
            this.rightMap = boardUtil.traverse(
                this.right.base.properties.x,
                this.right.base.properties.y,
                this.board);
            
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
            
            // this.weightMap = bot.get_weights(this.makeBotBoard());
            // this.maskMap = bot.draw_winning_paths(this.makeBotBoard());
            // let candidates = bot.get_candidates(this.makeBotBoard());
            let shortDistances = bot.compute_distances(this.makeBotBoard());
            let playerDistances = bot.compute_distances(this.makeBotBoard(), this.left.base.properties);
            let maxDistance = 1;
            for (let x = 0; x < this.board.width; x++) {
                for (let y = 0; y < this.board.height; y++) {
                    maxDistance = Math.max(maxDistance, shortDistances[[x,y]]);
                }
            }
            for (let x = 0; x < this.board.width; x++) {
                for (let y = 0; y < this.board.height; y++) {
                    shortDistances[[x,y]] = 1 - (shortDistances[[x,y]] / maxDistance);
                }
            }
            for (let x = 0; x < this.board.width; x++) {
                for (let y = 0; y < this.board.height; y++) {
                    maxDistance = Math.max(maxDistance, playerDistances[[x,y]]);
                }
            }
            for (let x = 0; x < this.board.width; x++) {
                for (let y = 0; y < this.board.height; y++) {
                    playerDistances[[x,y]] = 1 - (playerDistances[[x,y]] / maxDistance);
                }
            }
            this.shortDistances = shortDistances;
            this.playerDistances = playerDistances;
        },
        
        canPlaceTile: function(tilename) {
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
        
        stockClicked: function(opt) {
            if (this.canPlaceTile(opt.type)) {
                let owners = this.selected.properties.owners;
                if (owners.indexOf(1) == -1) owners.push(1);
                let tile = tiles[opt.type]({
                    x: this.selected.properties.x,
                    y: this.selected.properties.y,
                    owners,
                    placer: 1,
                });
                
                let botTile = bot.make_move(this.makeBotBoard());
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
                    }
                else {
                    this.board.set(this.selected.properties.x, this.selected.properties.y, tile);
                    if (botTile) {
                        botTile.properties.placer = 2;
                        botTile.properties.owners = [];
                        
                        this.right.stock[botTile.type]--;
                        this.board.set(botTile.properties.x, botTile.properties.y, botTile);
                    }
                }
                
                this.selected = null;
                // this.left.stock[opt.type]--;
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