/*global sharedObject, d3*/

(function() {
    "use strict";
    var yearPerSec = 86400*365;
    var gregorianDate = new Cesium.GregorianDate();

    var HealthAndWealthDataSource = function() {
        // private declarations
        this._name = "Health and Wealth";
        this._entityCollection = new Cesium.EntityCollection();
        this._clock = new Cesium.DataSourceClock();
        this._clock.startTime = Cesium.JulianDate.fromIso8601("1800-01-02");
        this._clock.stopTime = Cesium.JulianDate.fromIso8601("2009-01-02");
        this._clock.currentTime = Cesium.JulianDate.fromIso8601("1800-01-02");
        this._clock.clockRange = Cesium.ClockRange.LOOP_STOP;
        this._clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER;
        this._clock.multiplier = yearPerSec * 5;
        this._changed = new Cesium.Event();
        this._error = new Cesium.Event();
        this._isLoading = false;
        this._loading = new Cesium.Event();
        this._year = 1800;
        this._wealthScale = d3.scale.log().domain([300, 1e5]).range([0, 10000000.0]);
        this._healthScale = d3.scale.linear().domain([10, 85]).range([0, 10000000.0]);
    };

    Object.defineProperties(HealthAndWealthDataSource.prototype, {
        name : {
            get : function() {
                return this._name;
            }
        },
        clock : {
            get : function() {
                return this._clock;
            }
        },
        entities : {
            get : function() {
                return this._entityCollection;
            }
        },
        /**
         * Gets a value indicating if the data source is currently loading data.
         * @memberof WebGLGlobeDataSource.prototype
         * @type {Boolean}
         */
        isLoading : {
            get : function() {
                return this._isLoading;
            }
        },
        /**
         * Gets an event that will be raised when the underlying data changes.
         * @memberof WebGLGlobeDataSource.prototype
         * @type {Event}
         */
        changedEvent : {
            get : function() {
                return this._changed;
            }
        },
        /**
         * Gets an event that will be raised if an error is encountered during
         * processing.
         * @memberof WebGLGlobeDataSource.prototype
         * @type {Event}
         */
        errorEvent : {
            get : function() {
                return this._error;
            }
        },
        /**
         * Gets an event that will be raised when the data source either starts or
         * stops loading.
         * @memberof WebGLGlobeDataSource.prototype
         * @type {Event}
         */
        loadingEvent : {
            get : function() {
                return this._loading;
            }
        }
    });

    HealthAndWealthDataSource.prototype.loadUrl = function(url) {
        if (!Cesium.defined(url)) {
            throw new Cesium.DeveloperError("url must be defined.");
        }

        var that = this;
        return Cesium.when(Cesium.loadJson(url), function(json) {
            return that.load(json);
        }).otherwise(function(error) {
            this._setLoading(false);
            that._error.raiseEvent(that, error);
            return Cesium.when.reject(error);
        });
    };

    HealthAndWealthDataSource.prototype.load = function(data) {
        if (!Cesium.defined(data)) {
            throw new Cesium.DeveloperError("data must be defined.");
        }

        this._setLoading(true);
        var entities = this._entityCollection;
        //It's a good idea to suspend events when making changes to a 
        //large amount of entities.  This will cause events to be batched up
        //into the minimal amount of function calls and all take place at the
        //end of processing (when resumeEvents is called).
        entities.suspendEvents();
        entities.removeAll();

        // for each nation defined in nations_geo.json, create a polyline at that lat, lon
        for (var i = 0; i < data.length; i++){
            var nation = data[i];
            var surfacePosition = Cesium.Cartesian3.fromDegrees(nation.lon, nation.lat, 0.0);
            var heightPosition = Cesium.Cartesian3.fromDegrees(nation.lon, nation.lat, 10000000);

            var polyline = new Cesium.PolylineGraphics();
            polyline.show = new Cesium.ConstantProperty(true);
            var outlineMaterial = new Cesium.PolylineOutlineMaterialProperty();
            outlineMaterial.color = new Cesium.ConstantProperty(Cesium.Color.fromCssColorString(colorScale(nation.region)));
            outlineMaterial.outlineColor = new Cesium.ConstantProperty(new Cesium.Color(0.0, 0.0, 0.0, 1.0));
            outlineMaterial.outlineWidth = new Cesium.ConstantProperty(3.0);
            polyline.material = outlineMaterial;
            polyline.width = new Cesium.ConstantProperty(5);
            polyline.followSurface = new Cesium.ConstantProperty(false);
            polyline.positions = new Cesium.ConstantProperty([surfacePosition, heightPosition]);

            //The polyline instance itself needs to be on an entity.
            var entity = new Cesium.Entity(nation.name);
            entity.polyline = polyline;
            // Add a property to the entity that indicates the region.
            entity.addProperty('region');
            entity.region = nation.region;

            entity.addProperty('wealth');
            var wealth = new Cesium.SampledProperty(Number);

            for (var j = 0; j < nation.income.length; j++) {
                var year = nation.income[j][0];
                var income = nation.income[j][1];
                wealth.addSample(Cesium.JulianDate.fromIso8601(year.toString()), income);
            }
            entity.wealth = wealth;

            //Add the entity to the collection.
            entities.add(entity);
        }

        //Once all data is processed, call resumeEvents and raise the changed event.
        entities.resumeEvents();
        this._changed.raiseEvent(this);
        this._setLoading(false);
    };

    HealthAndWealthDataSource.prototype._setLoading = function(isLoading) {
        if (this._isLoading !== isLoading) {
            this._isLoading = isLoading;
            this._loading.raiseEvent(this, isLoading);
        }
    };

    HealthAndWealthDataSource.prototype.updateLines = function(time) {
        var entities = this._entityCollection.entities;

        for (var i = 0; i < entities.length; i++) {
        	var entity = entities[i];
            //var wealth = entitites[i].wealth.getValue(time);
            //var surfacePosition = Cesium.Cartesian3.fromDegrees(nation.lon, nation.lat, 0.0);
            //var heightPosition = Cesium.Cartesian3.fromDegrees(nation.lon, nation.lat, this._wealthScale(wealth));
            //entities[i].polyline.positions = new Cesium.ConstantProperty([surfacePosition, heightPosition]);
        }
    };

    HealthAndWealthDataSource.prototype.update = function(time) {
        Cesium.JulianDate.toGregorianDate(time, gregorianDate);
        var currentYear = gregorianDate.year + gregorianDate.month / 12;
        if (currentYear !== this._year && typeof window.displayYear !== 'undefined'){
            window.displayYear(currentYear);
            this._year = currentYear;
            this.updateLines(time);
        }
    };

    //var polylines = [];
    var colorScale = d3.scale.category20c();
    var selectedData = "health";
    var selectedNation = 'undefined'


    $("#radio").buttonset();
    $("#radio").css("font-size", "12px");
    $("#radio").css("font-size", "12px");
    $("body").css("background-color", "black");

    $("input[name='healthwealth']").change(function(d){
        selectedData = d.target.id;
        //updateLineData();
    });

//    // Load the data.
//    d3.json("nations_geo.json", function(nations) {
//        var ellipsoid = viewer.scene.globe.ellipsoid;
//        var primitives = viewer.scene.primitives;
//        var polylineCollection = new Cesium.PolylineCollection();
//
//        // for each nation defined in nations_geo.json, create a polyline at that lat, lon
//        for (var i = 0; i < nations.length; i++){
//            var nation = nations[i];
//
//            var widePolyline = polylineCollection.add();
//            widePolyline.positions = ellipsoid.cartographicArrayToCartesianArray([
//                Cesium.Cartographic.fromDegrees(nation.lon, nation.lat, 0.0),
//                Cesium.Cartographic.fromDegrees(nation.lon, nation.lat, 100.0)
//            ]);
//
//            // Set a polyline's width
//            var outlineMaterial = Cesium.Material.fromType('PolylineOutline');
//            outlineMaterial.uniforms.outlineWidth = 3.0;
//            outlineMaterial.uniforms.outlineColor = new Cesium.Color(0.0, 0.0, 0.0, 1.0);
//            outlineMaterial.uniforms.color = Cesium.Color.fromCssColorString(colorScale(nation.region));
//            widePolyline.material = outlineMaterial;
//
//            polylines.push(widePolyline);
//        }
//
//        primitives.add(polylineCollection);
//    });

    // called from our custom animate() function whenever the timeline advances 1 year
    // - update all polylines by resizing the polyline
    // - show jquery info window
//    function updateLineData() {
//        var ellipsoid = viewer.scene.globe.ellipsoid;
//        var xScale = d3.scale.log().domain([300, 1e5]).range([0, 10000000.0]);
//        var yScale = d3.scale.linear().domain([10, 85]).range([0, 10000000.0]);
//        var widthScale = d3.scale.sqrt().domain([0, 5e8]).range([5, 30]);
//
//        for (var i=0; i<polylines.length; i++) {
//            var nation = sharedObject.yearData[i];
//            var polyline = polylines[i];
//
//            if (selectedData === "health") {
//                polyline.positions = ellipsoid.cartographicArrayToCartesianArray([
//                               Cesium.Cartographic.fromDegrees(nation.lon, nation.lat, 0.0),
//                               Cesium.Cartographic.fromDegrees(nation.lon, nation.lat, yScale(nation.lifeExpectancy))
//                               ]);
//            } else {
//                polyline.positions = ellipsoid.cartographicArrayToCartesianArray([
//                               Cesium.Cartographic.fromDegrees(nation.lon, nation.lat, 0.0),
//                               Cesium.Cartographic.fromDegrees(nation.lon, nation.lat, xScale(nation.income))
//                               ]);
//            }
//            polyline.width = widthScale(nation.population);
//
//            // push data to polyline so that we have mouseover information available
//            polyline.nationData = nation;
//            
//            if (nation.name === selectedNation) {
//                $("#info table").remove();
//                $("#info").append("<table> \
//                <tr><td>Life Expectancy:</td><td>" +parseFloat(nation.lifeExpectancy).toFixed(1)+"</td></tr>\
//                <tr><td>Income:</td><td>" +parseFloat(nation.income).toFixed(1)+"</td></tr>\
//                <tr><td>Population:</td><td>" +parseFloat(nation.population).toFixed(1)+"</td></tr>\
//                </table>\
//                ");
//                $("#info table").css("font-size", "12px");
//            }
//
//            //polyline.material.uniforms.outlineWidth = yScale(nation.lifeExpectancy);
//        }
//    }

    var viewer = new Cesium.Viewer('cesiumContainer', 
            {
                fullscreenElement : document.body,
                sceneMode : Cesium.SceneMode.COLUMBUS_VIEW
            });

    function animate() {
        Cesium.JulianDate.toGregorianDate(viewer.clock.currentTime, gregorianDate);
        var currentYear = gregorianDate.year + gregorianDate.month/12;// + gregorianDate.day/31;
        if (currentYear !== year && typeof window.displayYear !== 'undefined'){
            window.displayYear(currentYear);
            year = currentYear;

            //updateLineData();
        }
    }

//    function tick() {
//        viewer.scene.initializeFrame();
//        animate();
//        viewer.scene.render();
//        Cesium.requestAnimationFrame(tick);
//    }
//    tick();

    //viewer.fullscreenButton.viewModel.fullscreenElement = document.body;

    var stamenTonerImagery = viewer.baseLayerPicker.viewModel.imageryProviderViewModels[8];
    viewer.baseLayerPicker.viewModel.selectedImagery = stamenTonerImagery;

    // setup clockview model
    var yearPerSec = 86400*365;
    viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
    viewer.clock.startTime = Cesium.JulianDate.fromIso8601("1800-01-02");
    viewer.clock.currentTime = Cesium.JulianDate.fromIso8601("1800-01-02");
    viewer.clock.stopTime = Cesium.JulianDate.fromIso8601("2009-01-02");
    viewer.clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER;
    viewer.clock.multiplier = yearPerSec * 5;
    viewer.animation.viewModel.setShuttleRingTicks([yearPerSec, yearPerSec*5, yearPerSec*10, yearPerSec*50]);

    viewer.animation.viewModel.dateFormatter = function(date, viewModel) {
        Cesium.JulianDate.toGregorianDate(date, gregorianDate);
        return 'Year: ' + gregorianDate.year;
    };

    // setup timeline
    function onTimelineScrub(e) {
        viewer.clock.currentTime = e.timeJulian;
        viewer.clock.shouldAnimate = false;
    }
    viewer.timeline.addEventListener('settime', onTimelineScrub, false);
    viewer.timeline.updateFromClock();
    viewer.timeline.zoomTo(viewer.clock.startTime, viewer.clock.stopTime);    

    var healthAndWealth = new HealthAndWealthDataSource();
    healthAndWealth.loadUrl('nations_geo.json');
    viewer.dataSources.add(healthAndWealth);

//    // If the mouse is over the billboard, change its scale and color
//    var highlightBarHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
//    highlightBarHandler.setInputAction(
//        function (movement) {
//            var pickedObject = viewer.scene.pick(movement.endPosition);
//            if (Cesium.defined(pickedObject) && Cesium.defined(pickedObject.primitive)) {
//                if (Cesium.defined(pickedObject.primitive.nationData)) {
//                    sharedObject.dispatch.nationMouseover(pickedObject.primitive.nationData);
//                }
//            }
//        },
//        Cesium.ScreenSpaceEventType.MOUSE_MOVE
//    );
//    
//    var flyToHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
//    flyToHandler.setInputAction(
//        function (movement) {
//            var pickedObject = viewer.scene.pick(movement.position);
//
//            if (Cesium.defined(pickedObject) && Cesium.defined(pickedObject.primitive)) {
//                if (Cesium.defined(pickedObject.primitive.nationData)) {
//                    sharedObject.flyTo(pickedObject.primitive.nationData);
//                }
//            }
//        },
//        Cesium.ScreenSpaceEventType.LEFT_CLICK
//    );
//    
//    // Response to a nation's mouseover event
//    sharedObject.dispatch.on("nationMouseover.cesium", function(nationObject) {
//        for (var i=0; i<polylines.length; i++) {
//            var polyline = polylines[i];
//            if (polyline.nationData.name === nationObject.name) {
//                polyline.material.uniforms.color = Cesium.Color.fromCssColorString('#00ff00');
//            }
//            else {
//                polyline.material.uniforms.color = Cesium.Color.fromCssColorString(colorScale(polyline.nationData.region));
//            }
//        }
//        
//        selectedNation = nationObject.name;
//        
//        $("#info table").remove();
//        $("#info").append("<table> \
//        <tr><td>Life Expectancy:</td><td>" +parseFloat(nationObject.lifeExpectancy).toFixed(1)+"</td></tr>\
//        <tr><td>Income:</td><td>" +parseFloat(nationObject.income).toFixed(1)+"</td></tr>\
//        <tr><td>Population:</td><td>" +parseFloat(nationObject.population).toFixed(1)+"</td></tr>\
//        </table>\
//        ");
//        $("#info table").css("font-size", "12px");
//        $("#info").dialog({
//            title : nationObject.name,
//            width: 300,
//            height: 150,
//            modal: false,
//            position: {my: "right center", at: "right center", of: "canvas"},
//            show: "slow"
//        });
//      });
//
//
//    // define functionality for flying to a nation
//    // this callback is triggered when a nation is clicked
//    var dirCartesian = new Cesium.Cartesian3();
//    sharedObject.flyTo = function(d) {
//        var ellipsoid = viewer.scene.globe.ellipsoid;
//        
//        var destination = Cesium.Cartographic.fromDegrees(d.lon, d.lat - 5.0, 10000000.0);
//        var destCartesian = ellipsoid.cartographicToCartesian(destination);
//        destination = ellipsoid.cartesianToCartographic(destCartesian);
//
//        // only fly there if it is not the camera's current position
//        if (!ellipsoid
//                   .cartographicToCartesian(destination)
//                   .equalsEpsilon(viewer.scene.camera.positionWC, Cesium.Math.EPSILON6)) {
//            
//            viewer.scene.camera.flyTo({
//                destination: destCartesian
//            });
//        }
//    };

})();