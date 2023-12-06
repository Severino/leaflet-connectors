# Leaflet Outline Connector

Leaflet connectors is a plugin to draw lines from the outlines of various geometries.

## Supported Geometries

Currently the following geometries are supported:

+ CircleMarker
+ Circle
+ ShapeMarkers
    + Square

## Installation

Using yarn
```cmd
yarn add leaflet-connector
```

Using npm
```
npm i leaflet-connector
```

## Import into your environment

You can import the plugin into your environment,
with the following methods:

### Script Tag

```HTML
<!-- Import leaflet first and then, ... -->
<script src="/node_modules/leaflet-outline-connector/leaflet-outline-connector.js"></script>
```

### Import Statement
```js
    import L from "leaflet"
    // You can just import the plugin,
    // it will be automatically available on 
    // the 'L' object.
    import "leaflet-outline-connector"
```

## Usage

### Simple Connector

When having two (or more) that you want to connect, you 
simply create a connector like that:

```js
        /*
         < setup leaflet regulary with a map variable called 'map' > 
        */

        // You can even connect CIRCLE MARKERS ...
        const Stuttgart = L.circleMarker([48.7784485, 9.1800132]).addTo(map);

        // with CIRCLES.
        const Hamburg = L.circle([53.550341, 10.000654], { radius: 20000}).addTo(map);

        // OPTIONAL: You can provide your own options to style the path...
        let options = {
            color: "red"
        }

        //          ... or use the options of one of the existing geometries.
        options = Stuttgart.options


        L.connector([Stuttgart, Hamburg], options)
                // The connector is a normal path object that must be added
                // to the map separately from the markers.
                .addTo(map)
                // Optional to bring the connector to the back
                // otherwise the line end is on top of the markers
                // and it looks not so clean.
                .bringToBack()
```

## Connect one (origin) with many (destination)

You may also provide as many elements as you want, whereas the first element is the origin and for each further element (destination) a line is created from the origin to that destination. 

```js
        // Multiple example

        const franceColor = "blue";

        const Paris_origin = L.circle([48.788771, 2.323608], { radius: 30000, fill: false, color: franceColor }).addTo(map);
        const Reims = L.shapeMarker([49.2595, 4.02798], { shape: "square", radius: 10, fill: false, color: franceColor }).addTo(map);
        const Rouen = L.circle([49.434347, 1.0943916], { radius: 10000, fill: false, color: franceColor }).addTo(map);
        const LeMans = L.circleMarker([47.982456, 0.218905], { radius: 10, fill: false, color: franceColor }).addTo(map);

        /**
         * When connecting multiple geometries, the first 
         * provided element is the origin and all connectors
         * will be drawn from this element to the others.
         */
        L.connector([Paris_origin, Reims, Rouen, LeMans], { color: franceColor }).addTo(map);
```

