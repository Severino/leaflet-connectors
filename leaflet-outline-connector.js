(function(factory, window) {
    /* global define, module, require */

    // define an AMD module that relies on 'leaflet'
    if (typeof define === "function" && define.amd) {
        define(["leaflet"], factory)

        // define a Common JS module that relies on 'leaflet'
    } else if (typeof exports === "object") {
        module.exports = factory(require("leaflet"))
    }

    // attach your plugin to the global 'L' variable
    if (typeof window !== "undefined" && window.L) {
        window.L.Connector = factory(L)
    }
}(function(L) {

    /**
     * @class
     * @classdesc Represents a connector between multiple geometries on a Leaflet map.
     * @extends L.Path
     * @param {Array} points - An array of geometries representing the points of the connector.
     * @param {Object} options - Options for the connector.
     * @throws {Error} Throws an error if there are not enough points in the array.
     */
    L.Connector = L.Path.extend({

        initialize: function(points, options) {
            if (points.length < 2) {
                throw new Error("Not enough points")
            }
            L.setOptions(this, options)
            this._createAnchors(...points)
        },

        _createAnchors(...geom) {
            this._anchors = []
            // Cache all points
            this._points = []
            for (let i = 0; i < geom.length; i++) {
                const type = this.checkGeometry(geom[i])

                let geometry = geom[i]
                if (type === "point") {
                    geometry = {
                        _latlng: geometry,
                        _point: null,
                    }
                    this._points.push(geometry)
                }

                const anchor = {
                    isOrigin: i === 0,
                    type: type,
                    geometry,
                    normalizedVector: null,
                }

                this._anchors.push(anchor)
            }
        },

        _getOriginAnchor() {
            return this._anchors[0]
        },

        _vectorFromPoints(point1, point2) {
            if (point1.x === point2.x && point1.y === point2.y) {
                return L.point(1, 1)
            }

            return L.point(point2.x - point1.x, point2.y - point1.y)
        },

        _normalizeVector(vector) {
            const length = this._vectorLength(vector)
            return L.point(vector.x / length, vector.y / length)
        },

        _vectorLength(vector) {
            return Math.sqrt(vector.x * vector.x + vector.y * vector.y)
        },

        _calculateNormalizedVector(point1, point2) {
            const vector = this._vectorFromPoints(point1, point2)
            return this._normalizeVector(vector)
        },

        flipVector(vector) {
            return L.point(-vector.x, -vector.y)
        },

        _getCenter(anchor) {
            switch (anchor.type) {
            case "point": // fallthrough
            case "circle":  // fallthrough
            case "circle-marker": // fallthrough
            case "square": return anchor.geometry._point
            default: throw new Error("Unsupported geometry type")
            }
        },

        /**
         * Checks the type of geometry and returns the corresponding type.
         * @param {L.Path} geometry - The path-like object to check.
         * @returns {string} - The type of geometry (currently supported: 'square', 'circle', 'circle-marker').
         * @throws {Error} - If the geometry type is not supported.
         */
        checkGeometry(geometry) {
            let type = null
            if (this._isShapeMarkerSquare(geometry)) {
                type = "square"
            } else if (geometry instanceof L.Circle) {
                type = "circle"
            } else if (geometry instanceof L.CircleMarker) {
                type = "circle-marker"
            } else if (geometry instanceof L.LatLng || (Array.isArray(geometry) && geometry.length === 2)) {
                type = "point"
            } else {
                throw new Error("Unsupported geometry type")
            }
            return type
        },

        _project() {
            this._update()
        },

        _projectPoints() {
            this._points.forEach(point => {
                point._point = this._map.latLngToLayerPoint(point._latlng)
            })
        },

        _update() {
            if (this._map) {
                this._projectPoints()
                this._updatePath()
            }
        },

        _updatePath() {
            let lines = []

            for (let anchor of this._anchors) {
                if (anchor.isOrigin) continue
                let originAnchor = Object.assign({}, this._getOriginAnchor())

                const originIntersectionPoints = this._getIntersectionPoints(originAnchor, anchor)
                const anchorIntersectionPoints = this._getIntersectionPoints(anchor, originAnchor)

                let distance = Infinity
                let from = null
                let to = null
                originIntersectionPoints.forEach(point => {
                    anchorIntersectionPoints.forEach(otherPoint => {
                        const d = point.distanceTo(otherPoint)
                        if (d < distance) {
                            distance = d
                            from = point
                            to = otherPoint
                        }
                    })
                })

                if (to)
                    lines.push([from, to])

            }

            this._parts = lines
            this._renderer._updatePoly(this)
        },

        _getIntersectionPoints(anchorA, anchorB) {
            let points = []
            if (anchorA.type === "point") {
                points = [anchorA.geometry._point]
            } else if (anchorA.type === "circle") {
                points = this._getCircleIntersectionPoints(anchorA, anchorB)
            } else if (anchorA.type === "circle-marker") {
                points = this._getCircleMarkerIntersectionPoints(anchorA, anchorB)
            } else if (anchorA.type === "square") {
                points = this._getPointOnSquare(anchorA, anchorB)
            } else {
                throw new Error("Unsupported geometry type")
            }

            return points
        },

        _getCircleIntersectionPoints(anchorA, anchorB) {
            const centerA = this._getCenter(anchorA)
            const centerB = this._getCenter(anchorB)
            const directionVector = this._calculateNormalizedVector(centerA, centerB)
            const radius = anchorA.geometry._radius

            return [
                centerA.add(directionVector.multiplyBy(radius)),
                centerA.subtract(directionVector.multiplyBy(radius)),
            ]
        },

        _getCircleMarkerIntersectionPoints(anchorA, anchorB) {
            const centerA = this._getCenter(anchorA)
            const centerB = this._getCenter(anchorB)
            const directionVector = this._calculateNormalizedVector(centerA, centerB)
            const radius = anchorA.geometry._radius
            return [centerA.add(directionVector.multiplyBy(radius)), centerA.subtract(directionVector.multiplyBy(radius))]
        },


        _getPointOnSquare(anchor, other) {
            // Calculate intersection for point with all four sides of the rectangle
            let intersections = []
            const horizontal = new L.Point(1, 0)
            const vertical = new L.Point(0, 1)

            const size = anchor.geometry.options.radius

            let borders = [
                { name: "Top", point: this._getCenter(anchor).subtract(L.point(size, size)), vector: horizontal },
                { name: "Left", point: this._getCenter(anchor).subtract(horizontal.multiplyBy(size)).subtract(vertical.multiplyBy(size)), vector: vertical },

                { name: "Bottom", point: this._getCenter(anchor).add(vertical.multiplyBy(size)).subtract(horizontal.multiplyBy(size)), vector: horizontal },
                { name: "Right", point: this._getCenter(anchor).add(horizontal.multiplyBy(size)).subtract(vertical.multiplyBy(size)), vector: vertical },
            ]

            const originStart = this._getCenter(anchor)
            const originEnd = this._getCenter(other)

            borders.forEach(({ name, point, vector } = {}) => {
                let endPoint = point.add(vector.multiplyBy(size * 2))
                let intersection = this._getLineIntersection(originStart, originEnd, point, endPoint)
                if (intersection) {
                    intersection.side = name
                    intersections.push(intersection)
                }
            })

            return intersections
        },

        _getLineIntersection(aStart, aEnd, bStart, bEnd) {

            const vector = this._vectorFromPoints(aStart, aEnd)
            const normalizedVector = this._normalizeVector(vector)
            const otherVector = this._vectorFromPoints(bStart, bEnd)
            const normalizedOtherVector = this._normalizeVector(otherVector)

            if (normalizedVector.x === normalizedOtherVector.x && normalizedVector.y === normalizedOtherVector.y) {
                return null
            }

            const termA = normalizedVector.x * (aStart.y - bStart.y)
            const termB = normalizedVector.y * (bStart.x - aStart.x)
            const termC = normalizedVector.x * normalizedOtherVector.y - normalizedVector.y * normalizedOtherVector.x

            const t = (termA + termB) / termC
            const intersection = bStart.add(normalizedOtherVector.multiplyBy(t))

            const tb = this._vectorLength(otherVector)
            if (t > tb || t < 0) return null

            return intersection
        },


        _isShapeMarker(geometry) {
            return geometry instanceof L.ShapeMarker
        },

        _isShapeMarkerSquare(geometry) {
            return this._isShapeMarker(geometry) && geometry.options.shape === "square"
        },
    })

    L.connector = function(a, b, options) {
        return new L.Connector(a, b, options)
    }

    return L.Connector
}, window))