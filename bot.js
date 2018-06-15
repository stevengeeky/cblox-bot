/**
 * Bot related functions
 */

(function() {
//
let bot = {};
bot.make_move = function(board) {
    let blanks = get_blank_tiles(board);
    if (blanks.length == 0) return null;
    
    let availableMoves = [];
    let blankTile = tiles.blank({});
    for (let stock in board.stock) {
        if (tiles[stock]({}).canPlaceOn(blankTile)) {
            availableMoves.push(stock);
        }
    }
    
    let whichBlank = Math.floor(Math.random() * blanks.length);
    let whichTile = Math.floor(Math.random() * availableMoves.length);
    return tiles[availableMoves[whichTile]]({
        x: blanks[whichBlank].properties.x,
        y: blanks[whichBlank].properties.y,
    });
};

function get_blank_tiles(board) {
    let result = [];
    for (let x = 0; x < board.width; x++) {
        for (let y = 0; y < board.height; y++) {
            if (board.data[[x,y]].type == 'blank') {
                result.push(board.data[[x,y]]);
            }
        }
    }
    return result;
}

window.bot = bot;
})();