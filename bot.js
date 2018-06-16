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

let samples = {};
for (let tiletype in tiles) {
    samples[tiletype] = tiles[tiletype]({});
}

let bot = {};
bot.make_move = function(board) {
    let start = Date.now();
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

function maximize_bot(board, depth) {
    // go for the largest value
    if (depth <= 0) {
        return { evaluation: evaluate_position(board) };
    }
    let maxEval = null, newEval, bestMove;
    let moves = get_candidates(board);
    let prev_tile;
    console.log("Reached depth", depth);
    
    for (let move of moves) {
        prev_tile = tiles[board.data[[move.x,move.y]].type](board.data[[move.x,move.y]].properties);
        board[[move.x,move.y]] = samples[move.type].whenPlacedOn(prev_tile);
        newEval = minimize_player(board, depth - 1);
        if (!maxEval || maxEval < newEval.evaluation) {
            maxEval = newEval.evaluation;
            bestMove = move;
        }
        board[[move.x,move.y]] = prev_tile;
    }
    
    return {
        evaluation: newEval.evaluation,
        best_move: bestMove
    };
}

function minimize_player(board, depth) {
    // go for the largest value
    if (depth <= 0) {
        return { evaluation: evaluate_position(board) };
    }
    let minEval = null, newEval, bestMove;
    let moves = get_candidates(board);
    let prev_tile;
    
    for (let move of moves) {
        prev_tile = tiles[board.data[[move.x,move.y]].type](board.data[[move.x,move.y]].properties);
        board[[move.x,move.y]] = samples[move.type].whenPlacedOn(prev_tile);
        newEval = maximize_bot(board, depth - 1);
        if (!minEval || minEval > newEval.evaluation) {
            minEval = newEval.evaluation;
            bestMove = move;
        }
        board[[move.x,move.y]] = prev_tile;
    }
    
    return {
        evaluation: newEval.evaluation,
        best_move: bestMove
    };
}

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

/**
 * Have the bot evaluate whether it's winning or not
 * in the given position
 */
function evaluate_position(board) {
    let bot_side = sum_distances(board,
                        {   x: board.left_base.properties.x,
                            y: board.left_base.properties.y });
    let player_side = sum_distances(board,
                        {   x: board.right_base.properties.x,
                            y: board.right_base.properties.y });
    
    return bot_side - player_side;
}

bot.sum_distances = sum_distances;
function sum_distances(board, start) {
    let result = 0;
    let distances = compute_distances(board, start);
    for (let x = 0; x < board.width; x++) {
        for (let y = 0; y < board.height; y++) {
            if (distances[[x,y]]) result += distances[[x,y]];
        }
    }
    return result;
}

bot.get_candidates = get_candidates;
function get_candidates(board, ignore_stock) {
    let visited = {};
    let result = [];
    
    for (let x = 0; x < board.width; x++) {
        for (let y = 0; y < board.height; y++) {
            visited[[x,y]] = {};
        }
    }
    for (let x = 0; x < board.width; x++) {
        for (let y = 0; y < board.height; y++) {
            if (board.data[[x,y]].type != 'blank' && board.data[[x,y]].type != 'mine') {
                if (samples.plus.canPlaceOn(board.data[[x + 1, y]])) {
                        if (!visited[[x + 1, y]].plus) {
                            visited[[x + 1, y]].plus = 0;
                            result.push({ x: x + 1, y:  y, type: 'plus' });
                        }
                        else visited[[x + 1, y]].plus++;
                }
                if (samples.plus.canPlaceOn(board.data[[x - 1, y]])) {
                        if (!visited[[x - 1, y]].plus) {
                            visited[[x - 1, y]].plus = 0;
                            result.push({ x: x - 1, y:  y, type: 'plus' });
                        }
                        else visited[[x - 1, y]].plus++;
                }
                if (samples.plus.canPlaceOn(board.data[[x, y + 1]])) {
                        if (!visited[[x, y + 1]].plus) {
                            visited[[x, y + 1]].plus = 0;
                            result.push({ x: x, y:  y + 1, type: 'plus' });
                        }
                        else visited[[x, y + 1]].plus++;
                }
                if (samples.plus.canPlaceOn(board.data[[x, y - 1]])) {
                        if (!visited[[x, y - 1]].plus) {
                            visited[[x, y - 1]].plus = 0;
                            result.push({ x: x, y:  y - 1, type: 'plus' });
                        }
                        else visited[[x, y - 1]].plus++;
                }
                
                if (samples.plus.canPlaceOn(board.data[[x + 2, y]])) {
                        if (!visited[[x + 2, y]].plus) {
                            visited[[x + 2, y]].plus = 0;
                            result.push({ x: x + 2, y:  y, type: 'plus' });
                        }
                        else visited[[x + 2, y]].plus++;
                }
                if (samples.plus.canPlaceOn(board.data[[x - 2, y]])) {
                        if (!visited[[x - 2, y]].plus) {
                            visited[[x - 2, y]].plus = 0;
                            result.push({ x: x - 2, y:  y, type: 'plus' });
                        }
                        else visited[[x - 2, y]].plus++;
                }
                if (samples.plus.canPlaceOn(board.data[[x, y + 2]])) {
                        if (!visited[[x, y + 2]].plus) {
                            visited[[x, y + 2]].plus = 0;
                            result.push({ x: x, y:  y + 2, type: 'plus' });
                        }
                        else visited[[x, y + 2]].plus++;
                }
                if (samples.plus.canPlaceOn(board.data[[x, y - 2]])) {
                        if (!visited[[x, y - 2]].plus) {
                            visited[[x, y - 2]].plus = 0;
                            result.push({ x: x, y:  y - 2, type: 'plus' });
                        }
                        else visited[[x, y - 2]].plus++;
                }
                
                if (samples.x.canPlaceOn(board.data[[x + 1, y + 1]])) {
                        if (!visited[[x + 1, y + 1]].x) {
                            visited[[x + 1, y + 1]].x = 0;
                            result.push({ x: x + 1, y:  y + 1, type: 'x' });
                        }
                        else visited[[x + 1, y + 1]].x++;
                }
                if (samples.x.canPlaceOn(board.data[[x - 1, y - 1]])) {
                        if (!visited[[x - 1, y - 1]].x) {
                            visited[[x - 1, y - 1]].x = 0;
                            result.push({ x: x - 1, y:  y - 1, type: 'x' });
                        }
                        else visited[[x - 1, y - 1]].x++;
                }
                if (samples.x.canPlaceOn(board.data[[x - 1, y + 1]])) {
                        if (!visited[[x - 1, y + 1]].x) {
                            visited[[x - 1, y + 1]].x = 0;
                            result.push({ x: x - 1, y:  y + 1, type: 'x' });
                        }
                        else visited[[x - 1, y + 1]].x++;
                }
                if (samples.x.canPlaceOn(board.data[[x + 1, y - 1]])) {
                        if (!visited[[x + 1, y - 1]].x) {
                            visited[[x + 1, y - 1]].x = 0;
                            result.push({ x: x + 1, y:  y - 1, type: 'x' });
                        }
                        else visited[[x + 1, y - 1]].x++;
                }
                
                if (samples.x.canPlaceOn(board.data[[x + 2, y + 2]])) {
                        if (!visited[[x + 2, y + 2]].x) {
                            visited[[x + 2, y + 2]].x = 0;
                            result.push({ x: x + 2, y:  y + 2, type: 'x' });
                        }
                        else visited[[x + 2, y + 2]].x++;
                }
                if (samples.x.canPlaceOn(board.data[[x - 2, y - 2]])) {
                        if (!visited[[x - 2, y - 2]].x) {
                            visited[[x - 2, y - 2]].x = 0;
                            result.push({ x: x - 2, y:  y - 2, type: 'x' });
                        }
                        else visited[[x - 2, y - 2]].x++;
                }
                if (samples.x.canPlaceOn(board.data[[x - 2, y + 2]])) {
                        if (!visited[[x - 2, y + 2]].x) {
                            visited[[x - 2, y + 2]].x = 0;
                            result.push({ x: x - 2, y:  y + 2, type: 'x' });
                        }
                        else visited[[x - 2, y + 2]].x++;
                }
                if (samples.x.canPlaceOn(board.data[[x + 2, y - 2]])) {
                        if (!visited[[x + 2, y - 2]].x) {
                            visited[[x + 2, y - 2]].x = 0;
                            result.push({ x: x + 2, y:  y - 2, type: 'x' });
                        }
                        else visited[[x + 2, y - 2]].x++;
                }
                
                if (board.stock.star || ignore_stock) {
                    if (samples.star.canPlaceOn(board.data[[x + 1, y]])) {
                            if (!visited[[x + 1, y]].star) {
                                visited[[x + 1, y]].star = 0;
                                result.push({ x: x + 1, y:  y, type: 'star' });
                            }
                            else visited[[x + 1, y]].star++;
                    }
                    if (samples.star.canPlaceOn(board.data[[x - 1, y]])) {
                            if (!visited[[x - 1, y]].star) {
                                visited[[x - 1, y]].star = 0;
                                result.push({ x: x - 1, y:  y, type: 'star' });
                            }
                            else visited[[x - 1, y]].star++;
                    }
                    if (samples.star.canPlaceOn(board.data[[x, y + 1]])) {
                            if (!visited[[x, y + 1]].star) {
                                visited[[x, y + 1]].star = 0;
                                result.push({ x: x, y:  y + 1, type: 'star' });
                            }
                            else visited[[x, y + 1]].star++;
                    }
                    if (samples.star.canPlaceOn(board.data[[x, y - 1]])) {
                            if (!visited[[x, y - 1]].star) {
                                visited[[x, y - 1]].star = 0;
                                result.push({ x: x, y:  y - 1, type: 'star' });
                            }
                            else visited[[x, y - 1]].star++;
                    }
                    
                    if (samples.star.canPlaceOn(board.data[[x + 1, y + 1]])) {
                            if (!visited[[x + 1, y + 1]].star) {
                                visited[[x + 1, y + 1]].star = 0;
                                result.push({ x: x + 1, y:  y + 1, type: 'star' });
                            }
                            else visited[[x + 1, y + 1]].star++;
                    }
                    if (samples.star.canPlaceOn(board.data[[x - 1, y - 1]])) {
                            if (!visited[[x - 1, y - 1]].star) {
                                visited[[x - 1, y - 1]].star = 0;
                                result.push({ x: x - 1, y:  y - 1, type: 'star' });
                            }
                            else visited[[x - 1, y - 1]].star++;
                    }
                    if (samples.star.canPlaceOn(board.data[[x - 1, y + 1]])) {
                            if (!visited[[x - 1, y + 1]].star) {
                                visited[[x - 1, y + 1]].star = 0;
                                result.push({ x: x - 1, y:  y + 1, type: 'star' });
                            }
                            else visited[[x - 1, y + 1]].star++;
                    }
                    if (samples.star.canPlaceOn(board.data[[x + 1, y - 1]])) {
                            if (!visited[[x + 1, y - 1]].star) {
                                visited[[x + 1, y - 1]].star = 0;
                                result.push({ x: x + 1, y:  y - 1, type: 'star' });
                            }
                            else visited[[x + 1, y - 1]].star++;
                    }
                    
                    if (samples.star.canPlaceOn(board.data[[x + 2, y]])) {
                        if (!visited[[x + 2, y]].star) {
                            visited[[x + 2, y]].star = 0;
                            result.push({ x: x + 2, y:  y, type: 'star' });
                        }
                        else visited[[x + 2, y]].star++;
                    }
                    if (samples.star.canPlaceOn(board.data[[x - 2, y]])) {
                        if (!visited[[x - 2, y]].star) {
                            visited[[x - 2, y]].star = 0;
                            result.push({ x: x - 2, y:  y, type: 'star' });
                        }
                        else visited[[x - 2, y]].star++;
                    }
                    if (samples.star.canPlaceOn(board.data[[x, y + 2]])) {
                        if (!visited[[x, y + 2]].star) {
                            visited[[x, y + 2]].star = 0;
                            result.push({ x: x, y:  y + 2, type: 'star' });
                        }
                        else visited[[x, y + 2]].star++;
                    }
                    if (samples.star.canPlaceOn(board.data[[x, y - 2]])) {
                        if (!visited[[x, y - 2]].star) {
                            visited[[x, y - 2]].star = 0;
                            result.push({ x: x, y:  y - 2, type: 'star' });
                        }
                        else visited[[x, y - 2]].star++;
                    }
                    
                    if (samples.star.canPlaceOn(board.data[[x + 2, y + 2]])) {
                        if (!visited[[x + 2, y + 2]].star) {
                            visited[[x + 2, y + 2]].star = 0;
                            result.push({ x: x + 2, y:  y + 2, type: 'star' });
                        }
                        else visited[[x + 2, y + 2]].star++;
                    }
                    if (samples.star.canPlaceOn(board.data[[x - 2, y - 2]])) {
                        if (!visited[[x - 2, y - 2]].star) {
                            visited[[x - 2, y - 2]].star = 0;
                            result.push({ x: x - 2, y:  y - 2, type: 'star' });
                        }
                        else visited[[x - 2, y - 2]].star++;
                    }
                    if (samples.star.canPlaceOn(board.data[[x - 2, y + 2]])) {
                        if (!visited[[x - 2, y + 2]].star) {
                            visited[[x - 2, y + 2]].star = 0;
                            result.push({ x: x - 2, y:  y + 2, type: 'star' });
                        }
                        else visited[[x - 2, y + 2]].star++;
                    }
                    if (samples.star.canPlaceOn(board.data[[x + 2, y - 2]])) {
                        if (!visited[[x + 2, y - 2]].star) {
                            visited[[x + 2, y - 2]].star = 0;
                            result.push({ x: x + 2, y:  y - 2, type: 'star' });
                        }
                        else visited[[x + 2, y - 2]].star++;
                    }
                }
                if (board.stock.circlePlus || ignore_stock) {
                    if (samples.circlePlus.canPlaceOn(board.data[[x + 2, y]])) {
                        if (!visited[[x + 2, y]].circlePlus) {
                            visited[[x + 2, y]].circlePlus = 0;
                            result.push({ x: x + 2, y:  y, type: 'circlePlus' });
                        }
                        else visited[[x + 2, y]].circlePlus++;
                    }
                    if (samples.circlePlus.canPlaceOn(board.data[[x - 2, y]])) {
                        if (!visited[[x - 2, y]].circlePlus) {
                            visited[[x - 2, y]].circlePlus = 0;
                            result.push({ x: x - 2, y:  y, type: 'circlePlus' });
                        }
                        else visited[[x - 2, y]].circlePlus++;
                    }
                    if (samples.circlePlus.canPlaceOn(board.data[[x, y + 2]])) {
                        if (!visited[[x, y + 2]].circlePlus) {
                            visited[[x, y + 2]].circlePlus = 0;
                            result.push({ x: x, y:  y + 2, type: 'circlePlus' });
                        }
                        else visited[[x, y + 2]].circlePlus++;
                    }
                    if (samples.circlePlus.canPlaceOn(board.data[[x, y - 2]])) {
                        if (!visited[[x, y - 2]].circlePlus) {
                            visited[[x, y - 2]].circlePlus = 0;
                            result.push({ x: x, y:  y - 2, type: 'circlePlus' });
                        }
                        else visited[[x, y - 2]].circlePlus++;
                    }
                }
                if (board.stock.circleX || ignore_stock) {
                    if (samples.circleX.canPlaceOn(board.data[[x + 2, y + 2]])) {
                        if (!visited[[x + 2, y + 2]].circleX) {
                            visited[[x + 2, y + 2]].circleX = 0;
                            result.push({ x: x + 2, y:  y + 2, type: 'circleX' });
                        }
                        else visited[[x + 2, y + 2]].circleX++;
                    }
                    if (samples.circleX.canPlaceOn(board.data[[x - 2, y - 2]])) {
                        if (!visited[[x - 2, y - 2]].circleX) {
                            visited[[x - 2, y - 2]].circleX = 0;
                            result.push({ x: x - 2, y:  y - 2, type: 'circleX' });
                        }
                        else visited[[x - 2, y - 2]].circleX++;
                    }
                    if (samples.circleX.canPlaceOn(board.data[[x - 2, y + 2]])) {
                        if (!visited[[x - 2, y + 2]].circleX) {
                            visited[[x - 2, y + 2]].circleX = 0;
                            result.push({ x: x - 2, y:  y + 2, type: 'circleX' });
                        }
                        else visited[[x - 2, y + 2]].circleX++;
                    }
                    if (samples.circleX.canPlaceOn(board.data[[x + 2, y - 2]])) {
                        if (!visited[[x + 2, y - 2]].circleX) {
                            visited[[x + 2, y - 2]].circleX = 0;
                            result.push({ x: x + 2, y:  y - 2, type: 'circleX' });
                        }
                        else visited[[x + 2, y - 2]].circleX++;
                    }
                }
                
                if (board.stock.downLeft || ignore_stock) {
                    if (samples.downLeft.canPlaceOn(board.data[[x + 1, y - 1]])) {
                        if (!visited[[x + 1, y - 1]].downLeft) {
                            visited[[x + 1, y - 1]].downLeft = 0;
                            result.push({ x: x + 1, y:  y - 1, type: 'downLeft' });
                        }
                        else visited[[x + 1, y - 1]].downLeft++;
                    }
                    if (samples.downLeft.canPlaceOn(board.data[[x + 2, y - 2]])) {
                        if (!visited[[x + 2, y - 2]].downLeft) {
                            visited[[x + 2, y - 2]].downLeft = 0;
                            result.push({ x: x + 2, y:  y - 2, type: 'downLeft' });
                        }
                        else visited[[x + 2, y - 2]].downLeft++;
                    }
                }
                if (board.stock.downRight || ignore_stock) {
                    if (samples.downRight.canPlaceOn(board.data[[x - 1, y - 1]])) {
                        if (!visited[[x - 1, y - 1]].downRight) {
                            visited[[x - 1, y - 1]].downRight = 0;
                            result.push({ x: x - 1, y:  y - 1, type: 'downRight' });
                        }
                        else visited[[x - 1, y - 1]].downRight++;
                    }
                    if (samples.downRight.canPlaceOn(board.data[[x - 2, y - 2]])) {
                        if (!visited[[x - 2, y - 2]].downRight) {
                            visited[[x - 2, y - 2]].downRight = 0;
                            result.push({ x: x - 2, y:  y - 2, type: 'downRight' });
                        }
                        else visited[[x - 2, y - 2]].downRight++;
                    }
                }
                if (board.stock.upRight || ignore_stock) {
                    if (samples.upRight.canPlaceOn(board.data[[x - 1, y + 1]])) {
                        if (!visited[[x - 1, y + 1]].upRight) {
                            visited[[x - 1, y + 1]].upRight = 0;
                            result.push({ x: x - 1, y:  y + 1, type: 'upRight' });
                        }
                        else visited[[x - 1, y + 1]].upRight++;
                    }
                    if (samples.upRight.canPlaceOn(board.data[[x - 2, y + 2]])) {
                        if (!visited[[x - 2, y + 2]].upRight) {
                            visited[[x - 2, y + 2]].upRight = 0;
                            result.push({ x: x - 2, y:  y + 2, type: 'upRight' });
                        }
                        else visited[[x - 2, y + 2]].upRight++;
                    }
                }
                if (board.stock.upLeft || ignore_stock) {
                    if (samples.upLeft.canPlaceOn(board.data[[x + 1, y + 1]])) {
                        if (!visited[[x + 1, y + 1]].upLeft) {
                            visited[[x + 1, y + 1]].upLeft = 0;
                            result.push({ x: x + 1, y:  y + 1, type: 'upLeft' });
                        }
                        else visited[[x + 1, y + 1]].upLeft++;
                    }
                    if (samples.upLeft.canPlaceOn(board.data[[x + 2, y + 2]])) {
                        if (!visited[[x + 2, y + 2]].upLeft) {
                            visited[[x + 2, y + 2]].upLeft = 0;
                            result.push({ x: x + 2, y:  y + 2, type: 'upLeft' });
                        }
                        else visited[[x + 2, y + 2]].upLeft++;
                    }
                }
                
                if (board.stock.down || ignore_stock) {
                    if (samples.down.canPlaceOn(board.data[[x, y - 1]])) {
                        if (!visited[[x, y - 1]].down) {
                            visited[[x, y - 1]].down = 0;
                            result.push({ x: x, y:  y - 1, type: 'down' });
                        }
                        else visited[[x, y - 1]].down++;
                    }
                    if (samples.down.canPlaceOn(board.data[[x, y - 2]])) {
                        if (!visited[[x, y - 2]].down) {
                            visited[[x, y - 2]].down = 0;
                            result.push({ x: x, y:  y - 2, type: 'down' });
                        }
                        else visited[[x, y - 2]].down++;
                    }
                }
                if (board.stock.up || ignore_stock) {
                    if (samples.up.canPlaceOn(board.data[[x, y + 1]])) {
                        if (!visited[[x, y + 1]].up) {
                            visited[[x, y + 1]].up = 0;
                            result.push({ x: x, y:  y + 1, type: 'up' });
                        }
                        else visited[[x, y + 1]].up++;
                    }
                    if (samples.up.canPlaceOn(board.data[[x, y + 2]])) {
                        if (!visited[[x, y + 2]].up) {
                            visited[[x, y + 2]].up = 0;
                            result.push({ x: x, y:  y + 2, type: 'up' });
                        }
                        else visited[[x, y + 2]].up++;
                    }
                }
                if (board.stock.left || ignore_stock) {
                    if (samples.left.canPlaceOn(board.data[[x + 1, y]])) {
                        if (!visited[[x + 1, y]].left) {
                            visited[[x + 1, y]].left = 0;
                            result.push({ x: x + 1, y:  y, type: 'left' });
                        }
                        else visited[[x + 1, y]].left++;
                    }
                    if (samples.left.canPlaceOn(board.data[[x + 2, y]])) {
                        if (!visited[[x + 2, y]].left) {
                            visited[[x + 2, y]].left = 0;
                            result.push({ x: x + 2, y:  y, type: 'left' });
                        }
                        else visited[[x + 2, y]].left++;
                    }
                }
                if (board.stock.right || ignore_stock) {
                    if (samples.right.canPlaceOn(board.data[[x - 1, y]])) {
                        if (!visited[[x - 1, y]].right) {
                            visited[[x - 1, y]].right = 0;
                            result.push({ x: x - 1, y:  y, type: 'right' });
                        }
                        else visited[[x - 1, y]].right++;
                    }
                    if (samples.right.canPlaceOn(board.data[[x - 2, y]])) {
                        if (!visited[[x - 2, y]].right) {
                            visited[[x - 2, y]].right = 0;
                            result.push({ x: x - 2, y:  y, type: 'right' });
                        }
                        else visited[[x - 2, y]].right++;
                    }
                }
                
                if (board.stock.circle || ignore_stock) {
                    if (samples.circle.canPlaceOn(board.data[[x, y]])) {
                        if (!visited[[x, y]].circle) {
                            visited[[x, y]].circle = 0;
                            result.push({ x: x, y:  y, type: 'circle' });
                        }
                        else visited[[x, y]].circle++;
                    }
                }
                if (board.stock.reclaim || ignore_stock) {
                    if (samples.reclaim.canPlaceOn(board.data[[x, y]])) {
                        if (!visited[[x, y]].reclaim) {
                            visited[[x, y]].reclaim = 0;
                            result.push({ x: x, y:  y, type: 'reclaim' });
                        }
                        else visited[[x, y]].reclaim++;
                    }
                }
                
                if (board.stock.mine || ignore_stock) {
                    for (let maybe_block of board.data[[x, y]].properties.range) {
                        visited[maybe_block].mine = (visited[maybe_block].mine || 0) + 1;
                    }
                    
                    if (board.data[[x, y]].type == 'x' || board.data[[x, y]].type == 'star') {
                        if (samples.mine.canPlaceOn(board.data[[x + 2, y + 2]])) {
                            if (!visited[[x + 2, y + 2]].mine) {
                                visited[[x + 2, y + 2]].mine = 0;
                                result.push({ x: x + 2, y:  y + 2, type: 'mine' });
                            }
                            else visited[[x + 2, y + 2]].mine++;
                        }
                        if (samples.mine.canPlaceOn(board.data[[x - 2, y - 2]])) {
                            if (!visited[[x - 2, y - 2]].mine) {
                                visited[[x - 2, y - 2]].mine = 0;
                                result.push({ x: x - 2, y:  y - 2, type: 'mine' });
                            }
                            else visited[[x - 2, y - 2]].mine++;
                        }
                        if (samples.mine.canPlaceOn(board.data[[x - 2, y + 2]])) {
                            if (!visited[[x - 2, y + 2]].mine) {
                                visited[[x - 2, y + 2]].mine = 0;
                                result.push({ x: x - 2, y:  y + 2, type: 'mine' });
                            }
                            else visited[[x - 2, y + 2]].mine++;
                        }
                        if (samples.mine.canPlaceOn(board.data[[x + 2, y - 2]])) {
                            if (!visited[[x + 2, y - 2]].mine) {
                                visited[[x + 2, y - 2]].mine = 0;
                                result.push({ x: x + 2, y:  y - 2, type: 'mine' });
                            }
                            else visited[[x + 2, y - 2]].mine++;
                        }
                    }
                    
                    if (board.data[[x, y]].type == 'plus' || board.data[[x, y]].type == 'star') {
                        if (samples.mine.canPlaceOn(board.data[[x + 2, y]])) {
                            if (!visited[[x + 2, y]].mine) {
                                visited[[x + 2, y]].mine = 0;
                                result.push({ x: x + 2, y:  y, type: 'mine' });
                            }
                            else visited[[x + 2, y]].mine++;
                        }
                        if (samples.mine.canPlaceOn(board.data[[x - 2, y]])) {
                            if (!visited[[x - 2, y]].mine) {
                                visited[[x - 2, y]].mine = 0;
                                result.push({ x: x - 2, y:  y, type: 'mine' });
                            }
                            else visited[[x - 2, y]].mine++;
                        }
                        if (samples.mine.canPlaceOn(board.data[[x, y + 2]])) {
                            if (!visited[[x, y + 2]].mine) {
                                visited[[x, y + 2]].mine = 0;
                                result.push({ x: x, y:  y + 2, type: 'mine' });
                            }
                            else visited[[x, y + 2]].mine++;
                        }
                        if (samples.mine.canPlaceOn(board.data[[x, y - 2]])) {
                            if (!visited[[x, y - 2]].mine) {
                                visited[[x, y - 2]].mine = 0;
                                result.push({ x: x, y:  y - 2, type: 'mine' });
                            }
                            else visited[[x, y - 2]].mine++;
                        }
                    }
                    
                    if (board.data[[x, y]].type == 'right') {
                        if (samples.mine.canPlaceOn(board.data[[x + 2, y]])) {
                            if (!visited[[x + 2, y]].mine) {
                                visited[[x + 2, y]].mine = 0;
                                result.push({ x: x + 2, y:  y, type: 'mine' });
                            }
                            else visited[[x + 2, y]].mine++;
                        }
                    }
                    
                    if (board.data[[x, y]].type == 'left') {
                        if (samples.mine.canPlaceOn(board.data[[x - 2, y]])) {
                            if (!visited[[x - 2, y]].mine) {
                                visited[[x - 2, y]].mine = 0;
                                result.push({ x: x - 2, y:  y, type: 'mine' });
                            }
                            else visited[[x - 2, y]].mine++;
                        }
                    }
                    
                    if (board.data[[x, y]].type == 'up') {
                        if (samples.mine.canPlaceOn(board.data[[x, y - 2]])) {
                            if (!visited[[x, y - 2]].mine) {
                                visited[[x, y - 2]].mine = 0;
                                result.push({ x: x, y:  y - 2, type: 'mine' });
                            }
                            else visited[[x, y - 2]].mine++;
                        }
                    }
                    
                    if (board.data[[x, y]].type == 'down') {
                        if (samples.mine.canPlaceOn(board.data[[x, y + 2]])) {
                            if (!visited[[x, y + 2]].mine) {
                                visited[[x, y + 2]].mine = 0;
                                result.push({ x: x, y:  y + 2, type: 'mine' });
                            }
                            else visited[[x, y + 2]].mine++;
                        }
                    }
                    
                    if (board.data[[x, y]].type == 'upRight') {
                        if (samples.mine.canPlaceOn(board.data[[x + 2, y - 2]])) {
                            if (!visited[[x + 2, y - 2]].mine) {
                                visited[[x + 2, y - 2]].mine = 0;
                                result.push({ x: x + 2, y:  y - 2, type: 'mine' });
                            }
                            else visited[[x + 2, y - 2]].mine++;
                        }
                    }
                    if (board.data[[x, y]].type == 'upLeft') {
                        if (samples.mine.canPlaceOn(board.data[[x - 2, y - 2]])) {
                            if (!visited[[x - 2, y - 2]].mine) {
                                visited[[x - 2, y - 2]].mine = 0;
                                result.push({ x: x - 2, y:  y - 2, type: 'mine' });
                            }
                            else visited[[x - 2, y - 2]].mine++;
                        }
                    }
                    if (board.data[[x, y]].type == 'downLeft') {
                        if (samples.mine.canPlaceOn(board.data[[x - 2, y + 2]])) {
                            if (!visited[[x - 2, y + 2]].mine) {
                                visited[[x - 2, y + 2]].mine = 0;
                                result.push({ x: x - 2, y:  y + 2, type: 'mine' });
                            }
                            else visited[[x - 2, y + 2]].mine++;
                        }
                    }
                    if (board.data[[x, y]].type == 'downRight') {
                        if (samples.mine.canPlaceOn(board.data[[x + 2, y + 2]])) {
                            if (!visited[[x + 2, y + 2]].mine) {
                                visited[[x + 2, y + 2]].mine = 0;
                                result.push({ x: x + 2, y:  y + 2, type: 'mine' });
                            }
                            else visited[[x + 2, y + 2]].mine++;
                        }
                    }
                }
            }
        }
    }
    
    return result;
}

bot.compute_distances = compute_distances;
function compute_distances(board, start) {
    let visited = {};
    if (start) start.depth = 1;
    let toExplore = [start || {
        depth: 1,
        x: board.right_base.properties.x,
        y: board.right_base.properties.y
    }];
    let depth, tile;
    while (toExplore.length > 0) {
        let exploreNext = [];
        for (let xy of toExplore) {
            if (xy.x < 0 || xy.y < 0 || xy.x >= board.width || xy.y >= board.height) continue;
            
            depth = xy.depth;
            if (visited[[xy.x, xy.y]] && visited[[xy.x, xy.y]] <= depth) continue;
            
            visited[[xy.x, xy.y]] = depth;
            tile = board.data[[xy.x, xy.y]];
            
            if (tile.type == 'blank') {
                exploreNext.push({ depth: depth + 1, x: xy.x - 1, y: xy.y });
                exploreNext.push({ depth: depth + 1, x: xy.x + 1, y: xy.y });
                exploreNext.push({ depth: depth + 1, x: xy.x, y: xy.y - 1 });
                exploreNext.push({ depth: depth + 1, x: xy.x, y: xy.y + 1 });
                exploreNext.push({ depth: depth + 1, x: xy.x + 1, y: xy.y + 1 });
                exploreNext.push({ depth: depth + 1, x: xy.x + 1, y: xy.y - 1 });
                exploreNext.push({ depth: depth + 1, x: xy.x - 1, y: xy.y + 1 });
                exploreNext.push({ depth: depth + 1, x: xy.x - 1, y: xy.y - 1 });
            }
            else {
                for (let potential of tile.properties.range) {
                    exploreNext.push({ depth, x: potential[0], y: potential[1] });
                }
            }
        }
        
        toExplore = exploreNext;
    }
    
    return visited;
}

bot.compute_distance_winning_path = compute_distance_winning_path;
/**
 * Compute closest distances to the nearest winning path 
 */
function compute_distance_winning_path(board, destination) {
    let visited = {};
    let winning_paths = draw_winning_paths(board, destination);
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
            
            exploreNext.push({ depth: depth + 1, x: xy.x - 1, y: xy.y });
            exploreNext.push({ depth: depth + 1, x: xy.x + 1, y: xy.y });
            exploreNext.push({ depth: depth + 1, x: xy.x, y: xy.y - 1 });
            exploreNext.push({ depth: depth + 1, x: xy.x, y: xy.y + 1 });
            exploreNext.push({ depth: depth + 1, x: xy.x + 1, y: xy.y + 1 });
            exploreNext.push({ depth: depth + 1, x: xy.x + 1, y: xy.y - 1 });
            exploreNext.push({ depth: depth + 1, x: xy.x - 1, y: xy.y + 1 });
            exploreNext.push({ depth: depth + 1, x: xy.x - 1, y: xy.y - 1 });
        }
        
        toExplore = exploreNext;
    }
    
    return visited;
}

bot.draw_winning_paths = draw_winning_paths;
function draw_winning_paths(board, destination) {
    let visited = {};
    
    let toExplore = [destination ||
                    {   x: board.left_base.properties.x,
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