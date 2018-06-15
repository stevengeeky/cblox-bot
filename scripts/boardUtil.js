/**
 * For handling of the actual board
 */

const tiles = require('./tiles');

exports.traverse = function(x, y, board) {
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

exports.create = (width, height, first, second) => ({
    width,
    height,
    first, second,
    data: (function() {
        let result = {};
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                result[[x, y]] = tiles.blank({ x, y });
            }
        }
        return result;
    })(),
    update: function() {
        let firstMap = exports.traverse(this.first.x, this.first.y, this);
        let secondMap = exports.traverse(this.second.x, this.second.y, this);
        let firstWins = false;
        let secondWins = false;
        
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                let owners = [];
                let xy = [x, y];
                if (firstMap[xy]) owners.push(1);
                if (secondMap[xy]) owners.push(2);
                if (tile.type == 'base') {
                    if (owners.length == 2) {
                        if (tile.owners[0] == 1) secondWins = true;
                        if (tile.owners[0] == 2) firstWins = true;
                    }
                }
                
                let tile = this.get(x, y);
                tile.owners = owners;
            }
        }
        
        return {
            firstWins,
            secondWins
        };
    },
    get: function(x, y) {
        return this.data[[x,y]];
    },
    set: function(x, y, tile, force) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            throw `Error: ${x}, ${y} not within range of board width and height`;
        }
        if (force) {
            this.data[[x, y]] = tile;
        }
        else {
            let dest = this.get(x, y);
            if (tile.canPlaceOn(dest)) {
                this.data[[x, y]] = tile.whenPlacedOn(dest);
            }
            else {
                throw `Error: Cannot place ${tile.type} on ${dest.type}`;
            }
        }
    }
});