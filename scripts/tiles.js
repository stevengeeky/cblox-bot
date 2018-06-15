/**
 * Contains tile information
 */

/**
 * @typedef tile
 * @prop {string} type
 * @prop {(tile) => boolean} canPlaceOn
 * @prop {(tile) => tile} whenPlacedOn
 * @prop {Object} properties
 * @prop {number} properties.x
 * @prop {number} properties.y
 * @prop {string[]} properties.owners
 * @prop {number} properties.fade
 * @prop {number[][]} properties.range
 */

 /**
  * @constant {tile} exports.blank
  */
exports.blank = args => ({
    type: 'blank',
    canPlaceOn: tile => false,
    whenPlacedOn: _ => _,
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: [],
    },
});

/**
 * @constant {tile} exports.plus
 */
exports.plus = args => ({
    type: 'plus',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: [[args.x - 1, args.y],
                [args.x + 1, args.y],
                [args.x, args.y - 1],
                [args.x, args.y + 1]]
    },
});

/**
 * @constant {tile} exports.x
 */
exports.x = args => ({
    type: 'x',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: [[args.x - 1, args.y - 1],
                [args.x + 1, args.y + 1],
                [args.x + 1, args.y - 1],
                [args.x - 1, args.y + 1]]
    },
});

/**
 * @constant {tile} exports.left
 */
exports.left = args => ({
    type: 'left',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: [[args.x - 1, args.y]]
    },
});

/**
 * @constant {tile} exports.right
 */
exports.right = args => ({
    type: 'right',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: [[args.x + 1, args.y]]
    },
});

/**
 * @constant {tile} exports.up
 */
exports.up = args => ({
    type: 'up',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: [[args.x, args.y - 1]]
    },
});

/**
 * @constant {tile} exports.down
 */
exports.down = args => ({
    type: 'down',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: [[args.x, args.y + 1]]
    },
});

/**
 * @constant {tile} exports.upLeft
 */
exports.upLeft = args => ({
    type: 'upLeft',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: [[args.x - 1, args.y - 1]]
    },
});

/**
 * @constant {tile} exports.upRight
 */
exports.upRight = args => ({
    type: 'upRight',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: [[args.x + 1, args.y - 1]]
    },
});

/**
 * @constant {tile} exports.downLeft
 */
exports.downLeft = args => ({
    type: 'downLeft',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: [[args.x - 1, args.y + 1]]
    },
});

/**
 * @constant {tile} exports.downRight
 */
exports.downRight = args => ({
    type: 'downRight',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: [[args.x + 1, args.y + 1]]
    },
});

/**
 * @constant {tile} exports.star
 */
exports.star = args => ({
    type: 'star',
    canPlaceOn: tile => tile.type == 'blank',
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: [[args.x - 1, args.y - 1],
                [args.x + 1, args.y + 1],
                [args.x + 1, args.y - 1],
                [args.x - 1, args.y + 1],
                [args.x - 1, args.y],
                [args.x + 1, args.y],
                [args.x, args.y - 1],
                [args.x, args.y + 1]]
    },
});

/**
 * @constant {tile} exports.circlePlus
 */
exports.circlePlus = args => ({
    type: 'circlePlus',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        circled: true,
        range: [[args.x - 2, args.y],
                [args.x + 2, args.y],
                [args.x, args.y - 2],
                [args.x, args.y + 2]]
    },
});

/**
 * @constant {tile} exports.circleX
 */
exports.circleX = args => ({
    type: 'circleX',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        circled: true,
        range: [[args.x - 2, args.y - 2],
                [args.x + 2, args.y + 2],
                [args.x + 2, args.y - 2],
                [args.x - 2, args.y + 2]]
    },
});

/**
 * @constant {tile} exports.circleLeft
 */
exports.circleLeft = args => ({
    type: 'circleLeft',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        circled: true,
        range: [[args.x - 2, args.y]]
    },
});

/**
 * @constant {tile} exports.circleRight
 */
exports.circleRight = args => ({
    type: 'circleRight',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        circled: true,
        range: [[args.x + 2, args.y]]
    },
});

/**
 * @constant {tile} exports.circleUp
 */
exports.circleUp = args => ({
    type: 'circleUp',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        circled: true,
        range: [[args.x, args.y - 2]]
    },
});

/**
 * @constant {tile} exports.circleDown
 */
exports.circleDown = args => ({
    type: 'circleDown',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        circled: true,
        range: [[args.x, args.y + 2]]
    },
});

/**
 * @constant {tile} exports.circleUpLeft
 */
exports.circleUpLeft = args => ({
    type: 'circleUpLeft',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        circled: true,
        range: [[args.x - 2, args.y - 2]]
    },
});

/**
 * @constant {tile} exports.circleUpRight
 */
exports.circleUpRight = args => ({
    type: 'circleUpRight',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        circled: true,
        range: [[args.x + 2, args.y - 2]]
    },
});

/**
 * @constant {tile} exports.circleDownLeft
 */
exports.circleDownLeft = args => ({
    type: 'circleDownLeft',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        circled: true,
        range: [[args.x - 2, args.y + 2]]
    },
});

/**
 * @constant {tile} exports.circleDownRight
 */
exports.circleDownRight = args => ({
    type: 'circleDownRight',
    canPlaceOn: tile => /blank|mine/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        circled: true,
        range: [[args.x + 2, args.y + 2]]
    },
});

/**
 * @constant {tile} exports.circleStar
 */
exports.circleStar = args => ({
    type: 'circleStar',
    canPlaceOn: tile => tile.type == 'blank',
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: [[args.x - 2, args.y - 2],
                [args.x + 2, args.y + 2],
                [args.x + 2, args.y - 2],
                [args.x - 2, args.y + 2],
                [args.x - 2, args.y],
                [args.x + 2, args.y],
                [args.x, args.y - 2],
                [args.x, args.y + 2]]
    },
});

/**
 * @constant {tile} exports.mine
 */
exports.mine = args => ({
    type: 'mine',
    canPlaceOn: tile => /blank/.test(tile.type),
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: []
    },
});

/**
 * @constant {tile} exports.circle
 */
exports.circle = args => ({
    type: 'circle',
    canPlaceOn: tile => !/blank|collision|mine|base/.test(tile.type)
                        && !tile.properties.circled,
    whenPlacedOn: function(tile){
        let newType = 'circle' + 
                        tile.type.substring(0, 1).toUpperCase() +
                        tile.type.substring(1);
        return exports[newType]({
            x: this.properties.x,
            y: this.properties.y,
            placer: args.placer,
            owners: this.properties.owners,
        });
    },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: []
    },
});

/**
 * @constant {tile} exports.reclaim
 */
exports.reclaim = args => ({
    type: 'reclaim',
    canPlaceOn: function(tile) {
                    return !/blank|collision|mine|base/.test(tile.type)
                            && this.properties.placer
                            && tile.properties.owners.length == 1
                            && tile.properties.owners[0] == this.properties.placer; },
    whenPlacedOn: function(){
        return exports['blank']({
            x: this.properties.x,
            y: this.properties.y,
            placer: this.properties.placer,
            owners: [],
        });
    },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: [],
    },
});

/**
 * @constant {tile} exports.collision
 */
exports.collision = args => ({
    type: 'collision',
    canPlaceOn: tile => true,
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: 5,
        placer: null,
        range: [],
    },
});

/**
 * @constant {tile} exports.base
 */
exports.base = args => ({
    type: 'base',
    canPlaceOn: tile => tile.type == 'blank',
    whenPlacedOn: function(){ return this; },
    properties: {
        x: args.x,
        y: args.y,
        owners: args.owners || [],
        fade: Infinity,
        placer: args.placer,
        range: [[args.x - 1, args.y - 1],
                [args.x + 1, args.y + 1],
                [args.x + 1, args.y - 1],
                [args.x - 1, args.y + 1],
                [args.x - 1, args.y],
                [args.x + 1, args.y],
                [args.x, args.y - 1],
                [args.x, args.y + 1]]
    },
});