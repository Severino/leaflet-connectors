L.Connector = L.Path.extend({

    options: {

    },

    initialize: function (points, options) {
        if (points.length < 2) {
            throw new Error('Not enough points')
        }
        L.setOptions(this, options);
        this.setGeometries(...points);
    },

    setGeometries(...geom) {
        this._anchors = [];
        for (let i = 0; i < geom.length; i++) {
            const type = this.checkGeometry(geom[i])
            const anchor = {
                isOrigin: i === 0,
                type: type,
                geom: geom[i],
                vector: null,
                normalizedVector: null
            }

            if (i > 0) {
                this._calculateAnchorVector(anchor)
            }

            this._anchors.push(anchor)
        }


    },

    _getCenterAnchor() {
        return this._anchors[0]
    },

    _calculateAnchorVector(anchor) {
        const origin = this._getCenter(this._getCenterAnchor())
        const anchorCenter = this._getCenter(anchor)
        anchor.vector = this._vectorFromPoints(origin, anchorCenter)
        anchor.normalizedVector = this._normalizeVector(anchor.vector)
    },

    _vectorFromPoints(point1, point2) {
        if(point1.x === point2.x && point1.y === point2.y) {
            return L.point(1, 1)
        }

        return L.point(point1.x - point2.x, point1.y - point2.y)
    },

    _normalizeVector(vector) {
        const length = vector.distanceTo(L.point(0, 0))
        return L.point(vector.x / length, vector.y / length)
    },

    flipVector(vector) {
        return L.point(-vector.x, -vector.y)
    },

    _getCenter(anchor) {
        switch (anchor.type) {
            case 'circle': return anchor.geom._point
            case 'circle-marker': return anchor.geom._point
            case 'rect': return anchor.geom._point
            default: throw new Error('Unsupported geometry type')
        }
    },

    checkGeometry(geom) {
        let type = null
        if (this._isShapeMarkerSquare(geom)) {
            type = 'rect'
        } else if (geom instanceof L.Circle) {
            type = 'circle'
        } else if (geom instanceof L.CircleMarker) {
            type = 'circle-marker'
        } else {
            throw new Error('Unsupported geometry type')
        }

        return type
    },

    _project() {
        this._update();
    },

    _update() {
        if (this._map) {
            this._updatePath();
        }
    },

    _updatePath() {
        let lines = []

        for (let anchor of this._anchors) {
            if (anchor.isOrigin) continue
            let reversedNormalizedVector = L.point(-anchor.normalizedVector.x, -anchor.normalizedVector.y)
            let originAnchor = Object.assign({}, this._getCenterAnchor(), { normalizedVector: reversedNormalizedVector })

            const anchorPointOnGeometry = this._getPointFromAnchor(anchor, originAnchor)
            const originPointOnGeometry = this._getPointFromAnchor(originAnchor, anchor)
            lines.push([originPointOnGeometry, anchorPointOnGeometry])
        }

        this._parts = lines;
        this._renderer._updatePoly(this);
    },

    _getPointFromAnchor(anchor, other) {
        let point = null
        if (anchor.type === 'circle') {
            point = this._getPointOnCircle(anchor)
        } else if (anchor.type === 'circle-marker') {
            point = this._getPointOnCircleMarker(anchor)
        } else if (anchor.type === 'rect') {
            point = this._getPointOnRect(anchor, other)
        } else {
            throw new Error('Unsupported geometry type')
        }

        return point
    },

    _getPointOnCircle(anchor) {
        let directionVector = anchor.normalizedVector
        return anchor.geom._point.add(directionVector.multiplyBy(anchor.geom._radius))
    },

    _getPointOnCircleMarker(anchor) {
        let directionVector = anchor.normalizedVector
        return anchor.geom._point.add(directionVector.multiplyBy(anchor.geom.options.radius))
    },

    _getPointOnRect(anchor, other) {
        // Calculate intersection for point with all four sides of the rectangle
        let intersections = []
        const horizontal = new L.Point(1, 0)
        const vertical = new L.Point(0, 1)

        const size = anchor.geom.options.radius

        let borders = [
            // Bottom
            { name: "Bottom", point: this._getCenter(anchor).add(vertical.multiplyBy(size)).subtract(horizontal.multiplyBy(size)), vector: horizontal },
            // Right
            { name: "Right", point: this._getCenter(anchor).add(horizontal.multiplyBy(size)).subtract(vertical.multiplyBy(size)), vector: vertical },
            // Top
            { name: "Top", point: this._getCenter(anchor).add(vertical.multiplyBy(-size)).subtract(horizontal.multiplyBy(size)), vector: horizontal },
            // Left
            { name: "Left", point: this._getCenter(anchor).add(horizontal.multiplyBy(-size)).subtract(vertical.multiplyBy(size)), vector: vertical }
        ]

        let closest = { point: null, distance: Infinity }

        borders.forEach(({ name, point, vector } = {}) => {
            let { point: intersectionPoint, distance } = this._getIntersection(point, vector, size, other)
            if (distance < closest.distance) {
                closest = { point: intersectionPoint, distance }
            }
        })

        return closest.point
    },

    _getIntersection(borderStartPoint, borderVector, size, anchor) {

        const originAnchor = this._getCenterAnchor()
        const originAnchorPoint = this._getCenter(originAnchor)

        let lineStart = borderStartPoint
        let lineEnd = borderStartPoint.add(borderVector.multiplyBy(size * 2))

        let line2Start = originAnchorPoint
        let line2End = originAnchorPoint.add(this.flipVector(anchor.normalizedVector).multiplyBy(size * 2))

        // Calculate if the lines interesct at all
        let denominator = ((lineEnd.x - lineStart.x) * (line2End.y - line2Start.y)) - ((lineEnd.y - lineStart.y) * (line2End.x - line2Start.x))

        // Break if lines are parallel
        if (denominator === 0) {
            return { point: null, distance: Infinity }
        }

        let a = lineStart.y - line2Start.y
        let b = lineStart.x - line2Start.x
        let numerator1 = ((line2End.x - line2Start.x) * a) - ((line2End.y - line2Start.y) * b)
        let numerator2 = ((lineEnd.x - lineStart.x) * a) - ((lineEnd.y - lineStart.y) * b)
        a = numerator1 / denominator
        b = numerator2 / denominator

        // if we cast these lines infinitely in both directions, they intersect here:
        let x = lineStart.x + (a * (lineEnd.x - lineStart.x))
        let y = lineStart.y + (a * (lineEnd.y - lineStart.y))


        if (x < Math.min(lineStart.x, lineEnd.x) || x > Math.max(lineStart.x, lineEnd.x) ||
            y < Math.min(lineStart.y, lineEnd.y) || y > Math.max(lineStart.y, lineEnd.y)) {
            return { point: null, distance: Infinity }
        }

        const anchorPoint = this._getCenter(anchor)

        return { point: new L.Point(x, y), distance: anchorPoint.distanceTo(new L.Point(x, y)) }
    },

    _isShapeMarker(geom) {
        return geom instanceof L.ShapeMarker
    },
    _isShapeMarkerSquare(geom) {
        return this._isShapeMarker(geom) && geom.options.shape === 'square'
    }
});

L.connector = function (a, b, options) {
    return new L.Connector(a, b, options);
};