# Leaflet Outline Connector

Leaflet connectors is a plugin to draw lines from the outlines of various geometries.

Live-Demo: [https://severino.github.io/leaflet-outline-connector/](https://severino.github.io/leaflet-outline-connector/)

**Checkout the [Demo](#demo) section for more infos how to use the Demo effectively.**

## Supported Geometries

Currently the following geometries are supported:

+ Point 
    + Array ([_lat_,_lng_])
    + L.LatLng
+ CircleMarker
+ Circle
+ ShapeMarkers
    + Square

## Installation

Using yarn
```cmd
yarn add leaflet-outline-connector
```

Using npm
```
npm i leaflet-outline-connector
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

<h2 id="demo">Demo</h2>

The demo provides a good insight on the capabilities of the plugin and also
a proper playground when developing. 

### Parameters

The behavior of the app may be altered utilizing the query string of the URL.
Following parameters and values are available:

| name | values | example | description | 
| --- | --- | --- | --- |
| center | _lat_[float]**,**_lng_[float] | ?center=52.241256,18.720703 | Sets the viewport position on the map to the coodinates specified. |
| zoom | _zoom-level_[int] | ?zoom=7 | Sets the viewport zoom on the map to the specified zoom level |
| example | _example-name_["single" \| "multiple" \| "point" \| "inside-outside"] | ?example=single | Specifies which example should be loaded in isolation. By default all examples are loaded |
| shape | _shape-name_[circle \| circleMarker \| square] | ?shape=square | Sets a target shape. **Only works for the example 'inside-out'**

**Note: If you are not familiar with query parameters, they are put at the end of the URL. The start is indicated by a '?' followed by a key value pair separated by an '='. Additional parameters can be added by separating them with an '&'.
Example: https://localhost/index.html?zoom=7&center=52.241,18.720**

### Hotkeys

For ease of use the app also provides a small set an hotkeys which make the live a bit easier.

+ [CTRL + Left Click] Copy coordinate of mouse cursor to clipboard
+ [CTRL + SHIFT + Left Click] Appends the mouse cursor coordinate to the exixting clipboard