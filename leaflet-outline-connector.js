(function (factory, window) {

    // define an AMD module that relies on 'leaflet'
    if (typeof define === 'function' && define.amd) {
        define(['leaflet'], factory);

        // define a Common JS module that relies on 'leaflet'
    } else if (typeof exports === 'object') {
        module.exports = factory(require('leaflet'));
    }

    // attach your plugin to the global 'L' variable
    if (typeof window !== 'undefined' && window.L) {
        window.L.Connector = factory(L);
    }
}(function (L) {

    /**
     * @class
     * @classdesc Represents a connector between multiple geometries on a Leaflet map.
     * @extends L.Path
     * @param {Array} points - An array of geometries representing the points of the connector.
     * @param {Object} options - Options for the connector.
     * @throws {Error} Throws an error if there are not enough points in the array.
     */
    L.Connector = L.Path.extend({

        initialize: function (points, options) {
            if (points.length < 2) {
                throw new Error('Not enough points')
            }
            L.setOptions(this, options);
            this._createAnchors(...points);
        },



        _createAnchors(...geom) {
            this._anchors = [];
            // Cache all points
            this._points = [];
            for (let i = 0; i < geom.length; i++) {
                const type = this.checkGeometry(geom[i])

                let geometry = geom[i]
                if (type === 'point') {
                    geometry = {
                        _latlng: geometry,
                        _point: null
                    }
                    this._points.push(geometry)
                }

                const anchor = {
                    isOrigin: i === 0,
                    type: type,
                    geometry,
                    vector: null,
                    normalizedVector: null
                }

                this._anchors.push(anchor)
            }
        },

        _getOriginAnchor() {
            return this._anchors[0]
        },

        _calculateAnchorVectors() {
            for (let anchor of this._anchors) {
                this._calculateAnchorVector(anchor)
            }
        },

        _calculateAnchorVector(anchor) {
            const origin = this._getCenter(this._getOriginAnchor())
            const anchorCenter = this._getCenter(anchor)
            anchor.vector = this._vectorFromPoints(origin, anchorCenter)
            anchor.normalizedVector = this._normalizeVector(anchor.vector)
        },

        _vectorFromPoints(point1, point2) {
            if (point1.x === point2.x && point1.y === point2.y) {
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
                case 'point': // fallthrough
                case 'circle':  // fallthrough
                case 'circle-marker': // fallthrough
                case 'rect': return anchor.geometry._point
                default: throw new Error('Unsupported geometry type')
            }
        },

        /**
         * Checks the type of geometry and returns the corresponding type.
         * @param {L.Path} geometry - The path-like object to check.
         * @returns {string} - The type of geometry (currently supported: 'rect', 'circle', 'circle-marker').
         * @throws {Error} - If the geometry type is not supported.
         */
        checkGeometry(geometry) {
            let type = null
            if (this._isShapeMarkerSquare(geometry)) {
                type = 'rect'
            } else if (geometry instanceof L.Circle) {
                type = 'circle'
            } else if (geometry instanceof L.CircleMarker) {
                type = 'circle-marker'
            } else if (geometry instanceof L.LatLng || (Array.isArray(geometry) && geometry.length === 2)) {
                type = 'point'
            } else {
                throw new Error('Unsupported geometry type')
            }
            return type
        },

        _project() {
            this._update();
        },

        _projectPoints() {
            this._points.forEach(point => {
                point._point = this._map.latLngToLayerPoint(point._latlng)
            })
        },

        _update() {
            if (this._map) {
                this._projectPoints();
                this._calculateAnchorVectors();
                this._updatePath();
            }
        },

        _updatePath() {
            let lines = []

            for (let anchor of this._anchors) {
                if (anchor.isOrigin) continue
                let reversedNormalizedVector = L.point(-anchor.normalizedVector.x, -anchor.normalizedVector.y)
                let originAnchor = Object.assign({}, this._getOriginAnchor(), { normalizedVector: reversedNormalizedVector })

                const anchorPointOnGeometry = this._getPointFromAnchor(anchor, originAnchor)
                const originPointOnGeometry = this._getPointFromAnchor(originAnchor, anchor)
                lines.push([originPointOnGeometry, anchorPointOnGeometry])
            }

            this._parts = lines;
            this._renderer._updatePoly(this);
        },

        _getPointFromAnchor(anchor, other) {
            let point = null
            if (anchor.type === 'point') {
                point = anchor.geometry._point
            } else if (anchor.type === 'circle') {
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
            return anchor.geometry._point.add(directionVector.multiplyBy(anchor.geometry._radius))
        },

        _getPointOnCircleMarker(anchor) {
            let directionVector = anchor.normalizedVector
            return anchor.geometry._point.add(directionVector.multiplyBy(anchor.geometry.options.radius))
        },


        _getPointOnRect(anchor, other) {
            // Calculate intersection for point with all four sides of the rectangle
            let intersections = []
            const horizontal = new L.Point(1, 0)
            const vertical = new L.Point(0, 1)

            const size = anchor.geometry.options.radius

            let borders = [
                { name: "Bottom", point: this._getCenter(anchor).add(vertical.multiplyBy(size)).subtract(horizontal.multiplyBy(size)), vector: horizontal },
                { name: "Right", point: this._getCenter(anchor).add(horizontal.multiplyBy(size)).subtract(vertical.multiplyBy(size)), vector: vertical },
                { name: "Top", point: this._getCenter(anchor).add(vertical.multiplyBy(-size)).subtract(horizontal.multiplyBy(size)), vector: horizontal },
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

            const originAnchor = this._getOriginAnchor()
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

        _isShapeMarker(geometry) {
            return geometry instanceof L.ShapeMarker
        },

        _isShapeMarkerSquare(geometry) {
            return this._isShapeMarker(geometry) && geometry.options.shape === 'square'
        }
    });

    L.connector = function (a, b, options) {
        return new L.Connector(a, b, options);
    };

    return L.Connector;
}, window));