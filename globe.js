/*global sharedObject, d3*/

(function() {
    "use strict";

    var polylines = [];

    // Load the data.
    d3.json("nations_geo.json", function(nations) {

        var colorScale = d3.scale.category20c();


        var ellipsoid = widget.centralBody.getEllipsoid();
        var primitives = widget.scene.getPrimitives();
        var polylineCollection = new Cesium.PolylineCollection();

        for (var i=0; i<nations.length; i++){
            // Set a polyline's width
            var nation = nations[i];

            var widePolyline = polylineCollection.add();
            widePolyline.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(nation.lon, nation.lat, 0.0),
                Cesium.Cartographic.fromDegrees(nation.lon, nation.lat, 100.0)
            ]));

            var outlineMaterial = Cesium.Material.fromType(undefined, Cesium.Material.PolylineOutlineType);
            outlineMaterial.uniforms.outlineWidth = 1.0;
            outlineMaterial.uniforms.outlineColor = new Cesium.Color(0.0, 0.0, 0.0, 1.0);
            outlineMaterial.uniforms.color = Cesium.Color.fromCssColorString(colorScale(nation.region));
            widePolyline.setMaterial(outlineMaterial);

            polylines.push(widePolyline);
        }

        primitives.add(polylineCollection);


    });

    function updateLineData() {
        var ellipsoid = widget.centralBody.getEllipsoid();
        var xScale = d3.scale.log().domain([300, 1e5]).range([0, 10000000.0]);
        //var yScale = d3.scale.linear().domain([10, 85]).range([2, 5]);
        var widthScale = d3.scale.sqrt().domain([0, 5e8]).range([5, 30]);

        for (var i=0; i<polylines.length; i++) {
            var nation = sharedObject.yearData[i];
            var polyline = polylines[i];

            polyline.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                           Cesium.Cartographic.fromDegrees(nation.lon, nation.lat, 0.0),
                           Cesium.Cartographic.fromDegrees(nation.lon, nation.lat, xScale(nation.income))
                           ]));
            polyline.setWidth(widthScale(nation.population));

            // push data to polyline so that we have mouseover information available
            polyline.nationData = nation;

            //polyline.getMaterial().uniforms.outlineWidth = yScale(nation.lifeExpectancy);
        }

    }


    var widget = new Cesium.CesiumWidget('cesiumContainer');
    
    function animate() {
        // INSERT CODE HERE to update primitives based on changes to animation time, camera parameters, etc.
    }
    
    function tick() {
        widget.scene.initializeFrame();
        animate();
        widget.scene.render();
        Cesium.requestAnimationFrame(tick);
    }
    tick();

    //widget.fullscreen.viewModel.fullscreenElement(document.body);
    
    widget.transitioner.toColumbusView();

    //var providerViewModels = widget.baseLayerPicker.viewModel.imageryProviderViewModels;
    //widget.baseLayerPicker.viewModel.selectedItem(providerViewModels()[8]);

    var clockViewModel = new Cesium.ClockViewModel(widget.clock);
    clockViewModel.startTime(Cesium.JulianDate.fromIso8601("1800-01-02"));
    clockViewModel.currentTime(Cesium.JulianDate.fromIso8601("1800-01-02"));
    clockViewModel.stopTime(Cesium.JulianDate.fromIso8601("2009-01-02"));
    clockViewModel.clockRange(Cesium.ClockRange.LOOP_STOP);
    clockViewModel.clockStep(Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER);
    var yearPerSec = 86400*365;
    clockViewModel.multiplier(yearPerSec * 5);
    widget.clockViewModel = clockViewModel;

    //widget.animationViewModel.setShuttleRingTicks([yearPerSec, yearPerSec*5, yearPerSec*10, yearPerSec*50]);
    //widget.animationViewModel.setDateFormatter(function(date, viewModel) {
    //    var gregorianDate = date.toGregorianDate();
    //    return 'Year: ' + gregorianDate.year;
    //});

    var year = 1800;

    widget.clock.onTick.addEventListener(function(){
        var gregorianDate = widget.clock.currentTime.toGregorianDate();
        var currentYear = gregorianDate.year + gregorianDate.month/12;// + gregorianDate.day/31;
        if (currentYear !== year && typeof window.displayYear !== 'undefined'){
            window.displayYear(currentYear);
            year = currentYear;

            updateLineData();
        }
    });


    //widget.timeline.zoomTo(widget.clock.startTime, widget.clock.stopTime);


    sharedObject.flyTo = function(d) {
        var destination = Cesium.Cartographic.fromDegrees(d.lon, d.lat-20.0, 10000000.0);
        var lookAt = widget.centralBody.getEllipsoid().cartographicToCartesian(
                                Cesium.Cartographic.fromDegrees(d.lon, d.lat, 0.0));
        var direction = lookAt.subtract(widget.centralBody.getEllipsoid().cartographicToCartesian(destination)).normalize();
        var up = direction.cross(lookAt).cross(direction).normalize();

        // only fly there if it is not the camera's current position
        if (!widget.centralBody.getEllipsoid()
                   .cartographicToCartesian(destination)
                   .equalsEpsilon(widget.scene.getCamera().getPositionWC(), Cesium.Math.EPSILON6)) {

            var flight = Cesium.CameraFlightPath.createAnimationCartographic(widget.scene.getFrameState(), {
                destination : destination,
                direction : direction,
                up : up
            });
            widget.scene.getAnimations().add(flight);
        }
    };

})();