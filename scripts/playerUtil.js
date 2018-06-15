/**
 * For creating players
 */

exports.create = function(x, y) {
    return {
        x, y,
        stock: {
            star: 1,
            circle: 2,
            plus: Infinity,
            circlePlus: 2,
            x: Infinity,
            circleX: 2,
            left: 2,
            up: 2,
            right: 2,
            down: 2,
            upLeft: 2,
            downLeft: 2,
            upRight: 2,
            downRight: 2,
            reclaim: 1,
            mine: 3,
        }
    }
}