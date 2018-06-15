/**
 * Bot related functions
 */

(function() {
//

/**
 * if there's a winning move, make it
 * 
 * find best way to calculate pressure
 */
let bot = {};
bot.make_move = function(board) {
    return null;
    let blanks = get_blank_tiles(board);
    if (blanks.length == 0) return null;
    
    let availableMoves = [];
    let blankTile = tiles.blank({});
    for (let stock in board.stock) {
        if (!board.stock[stock]) continue;
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

bot.get_weights = get_weights;

/**
 * get weights from all possible candidate moves
 */
function get_weights(board) {
    let weights = {};
    
    for (let x = 0; x < board.width; x++) {
        for (let y = 0; y < board.height; y++) {
            weights[[x,y]] = 0;
        }
    }
    
    for (let x = 0; x < board.width; x++) {
        for (let y = 0; y < board.height; y++) {
            let boardTile = board.data[[x,y]];
            for (let possible of boardTile.properties.range) {
                weights[[possible[0], possible[1]]]++;
            }
            
            for (let stock in board.stock) {
                if (!board.stock[stock]) continue;
                let tile = tiles[stock]({
                    x, y,
                    placer: 2
                });
                if (tile.canPlaceOn(boardTile)) {
                    for (let possible of tile.properties.range) {
                        weights[[possible[0], possible[1]]]++;
                    }
                }
            }
        }
    }
    
    let maxWeight = 0;
    let minWeight = null;
    for (let x = 0; x < board.width; x++) {
        for (let y = 0; y < board.height; y++) {
            if (!minWeight) minWeight = weights[[x,y]];
            if (weights[[x,y]] && !isNaN(weights[[x,y]])) {
                maxWeight = Math.max(maxWeight, weights[[x,y]]);
                minWeight = Math.min(minWeight, weights[[x,y]]);
            }
            else {
                weights[[x,y]] = 0;
            }
        }
    }
    minWeight = minWeight || 0;
    
    for (let x = 0; x < board.width; x++) {
        for (let y = 0; y < board.height; y++) {
            
            weights[[x,y]] = (weights[[x,y]] - minWeight) / (maxWeight - minWeight);
            weights[[x,y]] = Math.pow(weights[[x,y]], 2.2);
            weights[[x,y]] *= weights[[x,y]];
        }
    }
    
    return weights;
}

bot.compute_distances = compute_distances;
/**
 * Compute closest distances to the nearest winning path 
 */
function compute_distances(board) {
    let visited = {};
    let winning_paths = draw_winning_paths(board);
    let visitX, visitY;
    for (let x = 0; x < board.width; x++) {
        for (let y = 0; y < board.height; y++) {
            if (winning_paths[[x,y]]) {
                visitX = x;
                visitY = y;
                break;
            }
        }
        if (typeof visitX == 'number') break;
    }
    
    let toExplore = [{
        depth: 1,
        x: visitX,
        y: visitY,
    }];
    
    let depth;
    while (toExplore.length > 0) {
        let exploreNext = [];
        
        for (let xy of toExplore) {
            if (xy.x < 0 || xy.y < 0 || xy.x >= board.width || xy.y >= board.height) continue;
            
            depth = xy.depth;
            if (visited[[xy.x, xy.y]] && visited[[xy.x, xy.y]] <= depth) continue;
            if (winning_paths[[xy.x, xy.y]]) depth = 1;
            visited[[xy.x, xy.y]] = depth;
            
            toExplore.push({ depth: depth + 1, x: xy.x - 1, y: xy.y });
            toExplore.push({ depth: depth + 1, x: xy.x + 1, y: xy.y });
            toExplore.push({ depth: depth + 1, x: xy.x, y: xy.y - 1 });
            toExplore.push({ depth: depth + 1, x: xy.x, y: xy.y + 1 });
            toExplore.push({ depth: depth + 1, x: xy.x + 1, y: xy.y + 1 });
            toExplore.push({ depth: depth + 1, x: xy.x + 1, y: xy.y - 1 });
            toExplore.push({ depth: depth + 1, x: xy.x - 1, y: xy.y + 1 });
            toExplore.push({ depth: depth + 1, x: xy.x - 1, y: xy.y - 1 });
        }
        
        toExplore = exploreNext;
    }
    
    return visited;
}

bot.draw_winning_paths = draw_winning_paths;
function draw_winning_paths(board) {
    let visited = {};
    
    let toExplore = [{x: board.left_base.properties.x,
                      y: board.left_base.properties.y}];
    let depth = 1;
    let moves = [];
    while (toExplore.length > 0) {
        let exploreNext = [];
        
        for (let xy of toExplore) {
            if (visited[[xy.x, xy.y]]) continue;
            if (xy.x < 0 || xy.y < 0 || xy.x >= board.width || xy.y >= board.height) continue;
            visited[[xy.x, xy.y]] = depth;
            
            // faster to just explicitly check rather than do more looping
            if (/circleStar|circleX|circleDownRight/g.test(board.data[[xy.x - 2, xy.y - 2]].type)) {
                exploreNext.push({x: xy.x - 2, y: xy.y - 2 });
            }
            if (/circleStar|circleX|circleUpRight/g.test(board.data[[xy.x - 2, xy.y + 2]].type)) {
                exploreNext.push({x: xy.x - 2, y: xy.y + 2 });
            }
            if (/circleStar|circleX|circleDownLeft/g.test(board.data[[xy.x + 2, xy.y - 2]].type)) {
                exploreNext.push({x: xy.x + 2, y: xy.y - 2 });
            }
            if (/circleStar|circleX|circleUpLeft/g.test(board.data[[xy.x + 2, xy.y + 2]].type)) {
                exploreNext.push({x: xy.x + 2, y: xy.y + 2 });
            }
            //
            if (/circleStar|circlePlus|circleRight/g.test(board.data[[xy.x - 2, xy.y]].type)) {
                exploreNext.push({x: xy.x - 2, y: xy.y });
            }
            if (/circleStar|circlePlus|circleDown/g.test(board.data[[xy.x, xy.y - 2]].type)) {
                exploreNext.push({x: xy.x, y: xy.y - 2 });
            }
            if (/circleStar|circlePlus|circleLeft/g.test(board.data[[xy.x + 2, xy.y]].type)) {
                exploreNext.push({x: xy.x + 2, y: xy.y });
            }
            if (/circleStar|circlePlus|circleUp/g.test(board.data[[xy.x, xy.y + 2]].type)) {
                exploreNext.push({x: xy.x, y: xy.y + 2 });
            }
            
            // //
            if (/star|x|downRight/g.test(board.data[[xy.x - 1, xy.y - 1]].type)) {
                exploreNext.push({x: xy.x - 1, y: xy.y - 1 });
            }
            if (/star|x|upRight/g.test(board.data[[xy.x - 1, xy.y + 1]].type)) {
                exploreNext.push({x: xy.x - 1, y: xy.y + 1 });
            }
            if (/star|x|downLeft/g.test(board.data[[xy.x + 1, xy.y - 1]].type)) {
                exploreNext.push({x: xy.x + 1, y: xy.y - 1 });
            }
            if (/star|x|upLeft/g.test(board.data[[xy.x + 1, xy.y + 1]].type)) {
                exploreNext.push({x: xy.x + 1, y: xy.y + 1 });
            }
            //
            if (/star|plus|right/g.test(board.data[[xy.x - 1, xy.y]].type)) {
                exploreNext.push({x: xy.x - 1, y: xy.y });
            }
            if (/star|plus|down/g.test(board.data[[xy.x, xy.y - 1]].type)) {
                exploreNext.push({x: xy.x, y: xy.y - 1 });
            }
            if (/star|plus|left/g.test(board.data[[xy.x + 1, xy.y]].type)) {
                exploreNext.push({x: xy.x + 1, y: xy.y });
            }
            if (/star|plus|up/g.test(board.data[[xy.x, xy.y + 1]].type)) {
                exploreNext.push({x: xy.x, y: xy.y + 1 });
            }
        }
        
        depth++;
        toExplore = exploreNext;
    }
    return visited;
}

/**
 * get all moves possible
 */
function get_moves(board) {
    let moves = {};
    let tile, boardTile;
    for (let x = 0; x < board.width; x++) {
        for (let y = 0; y < board.height; y++) {
            boardTile = board.data[[x,y]];
            moves[[x,y]] = [];
            for (let stock in board.stock) {
                if (!board.stock[stock]) continue;
                tile = tiles[stock]({
                    x, y,
                    placer: 2
                });
                if (tile.canPlaceOn(boardTile)) {
                    moves[[x,y]].push(stock);
                }
            }
        }
    }
    
    return moves;
}

/**
 * traverse a set of connected tiles,
 * beginning at a given position
 */
function traverse(x, y, board) {
    let visited = {};
    
    let toExplore = [{x, y}];
    let depth = 1;
    while (toExplore.length > 0) {
        let exploreNext = [];
        
        for (let xy of toExplore) {
            if (visited[[xy.x, xy.y]]) continue;
            if (xy.x < 0 || xy.y < 0 || xy.x >= board.width || xy.y >= board.height) continue;
            visited[[xy.x, xy.y]] = depth;
            let tile = board.get(xy.x, xy.y);
            
            for (let newXY of tile.properties.range) {
                let newX = newXY[0], newY = newXY[1];
                let newTile = board.get(newX, newY);
                let newCoord = {x: newX, y: newY};
                
                if (tile && !visited[newCoord]) {
                    exploreNext.push(newCoord);
                }
            }
        }
        
        depth++;
        toExplore = exploreNext;
    }
    
    return visited;
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