/*global sharedObject, d3*/

(function() {
    "use strict";

    var polylines = [];
	var colorScale = d3.scale.category20c();
	var selectedData = "health";
	var selectedNation = 'undefined'
	
	
	$("#radio").buttonset();
	$("#radio").css("font-size", "12px");
	$("#radio").css("font-size", "12px");
	$("body").css("background-color", "black");
	
	$("input[name='healthwealth']").change(function(d){
		selectedData = d.target.id;
		updateLineData();
	});

    // Load the data.
    d3.json("nations_geo.json", function(nations) {


        var ellipsoid = viewer.scene.globe.ellipsoid;
        var primitives = viewer.scene.primitives;
        var polylineCollection = new Cesium.PolylineCollection();

        // for each nation defined in nations_geo.json, create a polyline at that lat, lon
        for (var i = 0; i < nations.length; i++){
            var nation = nations[i];

            var widePolyline = polylineCollection.add();
            widePolyline.positions = ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(nation.lon, nation.lat, 0.0),
                Cesium.Cartographic.fromDegrees(nation.lon, nation.lat, 100.0)
            ]);

            // Set a polyline's width
            var outlineMaterial = Cesium.Material.fromType('PolylineOutline');
            outlineMaterial.uniforms.outlineWidth = 3.0;
            outlineMaterial.uniforms.outlineColor = new Cesium.Color(0.0, 0.0, 0.0, 1.0);
            outlineMaterial.uniforms.color = Cesium.Color.fromCssColorString(colorScale(nation.region));
            widePolyline.material = outlineMaterial;

            polylines.push(widePolyline);
        }

        primitives.add(polylineCollection);
    });

    // called from our custom animate() function whenever the timeline advances 1 year
    // - update all polylines by resizing the polyline
    // - show jquery info window
    function updateLineData() {
        var ellipsoid = viewer.scene.globe.ellipsoid;
        var xScale = d3.scale.log().domain([300, 1e5]).range([0, 10000000.0]);
		var yScale = d3.scale.linear().domain([10, 85]).range([0, 10000000.0]);
        var widthScale = d3.scale.sqrt().domain([0, 5e8]).range([5, 30]);

        for (var i=0; i<polylines.length; i++) {
            var nation = sharedObject.yearData[i];
            var polyline = polylines[i];

			if (selectedData === "health") {
				polyline.positions = ellipsoid.cartographicArrayToCartesianArray([
							   Cesium.Cartographic.fromDegrees(nation.lon, nation.lat, 0.0),
							   Cesium.Cartographic.fromDegrees(nation.lon, nation.lat, yScale(nation.lifeExpectancy))
							   ]);
			} else {
				polyline.positions = ellipsoid.cartographicArrayToCartesianArray([
							   Cesium.Cartographic.fromDegrees(nation.lon, nation.lat, 0.0),
							   Cesium.Cartographic.fromDegrees(nation.lon, nation.lat, xScale(nation.income))
							   ]);
			}
            polyline.width = widthScale(nation.population);

            // push data to polyline so that we have mouseover information available
            polyline.nationData = nation;
			
			if (nation.name === selectedNation) {
				$("#info table").remove();
				$("#info").append("<table> \
				<tr><td>Life Expectancy:</td><td>" +parseFloat(nation.lifeExpectancy).toFixed(1)+"</td></tr>\
				<tr><td>Income:</td><td>" +parseFloat(nation.income).toFixed(1)+"</td></tr>\
				<tr><td>Population:</td><td>" +parseFloat(nation.population).toFixed(1)+"</td></tr>\
				</table>\
				");
				$("#info table").css("font-size", "12px");
			}

            //polyline.material.uniforms.outlineWidth = yScale(nation.lifeExpectancy);
        }

    }


    var viewer = new Cesium.Viewer('cesiumContainer', 
    		{
    			fullscreenElement : document.body
    		});
    
	var year = 1800;
    function animate() {
        var gregorianDate = viewer.clock.currentTime.toGregorianDate();
        var currentYear = gregorianDate.year + gregorianDate.month/12;// + gregorianDate.day/31;
        if (currentYear !== year && typeof window.displayYear !== 'undefined'){
            window.displayYear(currentYear);
            year = currentYear;

            updateLineData();
        }
    }
    
    function tick() {
        viewer.scene.initializeFrame();
        animate();
        viewer.scene.render();
        Cesium.requestAnimationFrame(tick);
    }
    tick();

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
        var gregorianDate = date.toGregorianDate();
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
	
	viewer.scene.morphToColumbusView();
	
	// If the mouse is over the billboard, change its scale and color
	var highlightBarHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
	highlightBarHandler.setInputAction(
		function (movement) {
			var pickedObject = viewer.scene.pick(movement.endPosition);
			if (Cesium.defined(pickedObject) && Cesium.defined(pickedObject.primitive)) {
				if (Cesium.defined(pickedObject.primitive.nationData)) {
					sharedObject.dispatch.nationMouseover(pickedObject.primitive.nationData);
				}
			}
		},
		Cesium.ScreenSpaceEventType.MOUSE_MOVE
	);
	
	var flyToHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
	flyToHandler.setInputAction(
		function (movement) {
			var pickedObject = viewer.scene.pick(movement.position);

			if (Cesium.defined(pickedObject) && Cesium.defined(pickedObject.primitive)) {
				if (Cesium.defined(pickedObject.primitive.nationData)) {
					sharedObject.flyTo(pickedObject.primitive.nationData);
				}
			}
		},
		Cesium.ScreenSpaceEventType.LEFT_CLICK
	);
	
	// Response to a nation's mouseover event
	sharedObject.dispatch.on("nationMouseover.cesium", function(nationObject) {
        for (var i=0; i<polylines.length; i++) {
			var polyline = polylines[i];
			if (polyline.nationData.name === nationObject.name) {
				polyline.material.uniforms.color = Cesium.Color.fromCssColorString('#00ff00');
			}
			else {
				polyline.material.uniforms.color = Cesium.Color.fromCssColorString(colorScale(polyline.nationData.region));
			}
        }
		
		selectedNation = nationObject.name;
		
		$("#info table").remove();
		$("#info").append("<table> \
		<tr><td>Life Expectancy:</td><td>" +parseFloat(nationObject.lifeExpectancy).toFixed(1)+"</td></tr>\
		<tr><td>Income:</td><td>" +parseFloat(nationObject.income).toFixed(1)+"</td></tr>\
		<tr><td>Population:</td><td>" +parseFloat(nationObject.population).toFixed(1)+"</td></tr>\
		</table>\
		");
		$("#info table").css("font-size", "12px");
		$("#info").dialog({
			title : nationObject.name,
			width: 300,
			height: 150,
			modal: false,
			position: {my: "right center", at: "right center", of: "canvas"},
			show: "slow"
		});
      });


	// define functionality for flying to a nation
	// this callback is triggered when a nation is clicked
	var dirCartesian = new Cesium.Cartesian3();
    sharedObject.flyTo = function(d) {
		var ellipsoid = viewer.scene.globe.ellipsoid;
		
        var destination = Cesium.Cartographic.fromDegrees(d.lon, d.lat-20.0, 10000000.0);
		var destCartesian = ellipsoid.cartographicToCartesian(destination);
		destination = ellipsoid.cartesianToCartographic(destCartesian);

        // only fly there if it is not the camera's current position
        if (!ellipsoid
                   .cartographicToCartesian(destination)
                   .equalsEpsilon(viewer.scene.camera.positionWC, Cesium.Math.EPSILON6)) {

            var flight = Cesium.CameraFlightPath.createAnimationCartographic(viewer.scene, {
                destination : destination
            });
            viewer.scene.animations.add(flight);
        }
    };

})();