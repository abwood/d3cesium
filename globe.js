/*global sharedObject, d3*/

(function() {
    "use strict";

    var polylines = [];
	var colorScale = d3.scale.category20c();

    // Load the data.
    d3.json("nations_geo.json", function(nations) {


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

            //var glowMaterial = Cesium.Material.fromType(widget.scene.getContext(), 'PolylineGlow');
			//glowMaterial.uniforms.color = Cesium.Color.fromCssColorString(colorScale(nation.region));
			//glowMaterial.uniforms.glowPower = 0.1;
			//widePolyline.setMaterial(glowMaterial);
            var outlineMaterial = Cesium.Material.fromType(widget.scene.getContext(), 'PolylineOutline');
            outlineMaterial.uniforms.outlineWidth = 3.0;
            outlineMaterial.uniforms.outlineColor = new Cesium.Color(0.0, 0.0, 0.0, 1.0);
            outlineMaterial.uniforms.color = Cesium.Color.fromCssColorString(colorScale(nation.region));
            widePolyline.setMaterial(outlineMaterial);

            polylines.push(widePolyline);
        }

        primitives.add(polylineCollection);


    });
	
	function setBaseLayerPicker(widget) {
	    var proxy = new Cesium.DefaultProxy('/proxy/');
        //While some sites have CORS on, not all browsers implement it properly, so a proxy is needed anyway;
        var proxyIfNeeded = Cesium.FeatureDetection.supportsCrossOriginImagery() ? undefined : proxy;
		
		var providerViewModels = [];
		providerViewModels.push(new Cesium.ImageryProviderViewModel({
				name : 'Stamen Toner',
				iconUrl : '3rdParty/Cesium/Source/Widgets/Images/ImageryProviders/stamenToner.png',
				tooltip : 'A high contrast black and white map.\nhttp://maps.stamen.com',
				creationFunction : function() {
					return new Cesium.OpenStreetMapImageryProvider({
						url : 'http://tile.stamen.com/toner/',
						credit : 'Map tiles by Stamen Design, under CC BY 3.0. Data by OpenStreetMap, under CC BY SA.',
						proxy : proxyIfNeeded
					});
				}
			}));
		providerViewModels.push(new Cesium.ImageryProviderViewModel({
				name : 'Bing Maps Aerial',
				iconUrl : '3rdParty/Cesium/Source/Widgets/Images/ImageryProviders/bingAerial.png',
				tooltip : 'Bing Maps aerial imagery \nhttp://www.bing.com/maps',
				creationFunction : function() {
					return new Cesium.BingMapsImageryProvider({
						url : 'http://dev.virtualearth.net',
						mapStyle : Cesium.BingMapsStyle.AERIAL,
						proxy : proxyIfNeeded
					});
				}
			}));
			
		widget.centralBody.getImageryLayers().removeAll();
		
		//Finally, create the actual widget using our view models.
		var layers = widget.centralBody.getImageryLayers();
		var baseLayerPicker = new Cesium.BaseLayerPicker('baseLayerPickerContainer', layers, providerViewModels);
		//Use the first item in the list as the current selection.
		baseLayerPicker.viewModel.selectedItem = providerViewModels[0];
	}

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
    
	var year = 1800;
    function animate() {
        var gregorianDate = widget.clock.currentTime.toGregorianDate();
        var currentYear = gregorianDate.year + gregorianDate.month/12;// + gregorianDate.day/31;
        if (currentYear !== year && typeof window.displayYear !== 'undefined'){
            window.displayYear(currentYear);
            year = currentYear;

            updateLineData();
        }
    }
    
    function tick() {
        widget.scene.initializeFrame();
        animate();
        widget.scene.render();
        Cesium.requestAnimationFrame(tick);
    }
    tick();

    //widget.fullscreen.viewModel.fullscreenElement(document.body);

	// setup baselayer picker
	setBaseLayerPicker(widget);
	// setup clockview model
    var clockViewModel = new Cesium.ClockViewModel(widget.clock);
    clockViewModel.startTime = Cesium.JulianDate.fromIso8601("1800-01-02");
    clockViewModel.currentTime = Cesium.JulianDate.fromIso8601("1800-01-02");
    clockViewModel.stopTime = Cesium.JulianDate.fromIso8601("2009-01-02");
    clockViewModel.clockRange = Cesium.ClockRange.LOOP_STOP;
    clockViewModel.clockStep = Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER;
    var yearPerSec = 86400*365;
    clockViewModel.multiplier = yearPerSec * 5;
    widget.clockViewModel = clockViewModel;
	// setup animationview model
	var animationViewModel = new Cesium.AnimationViewModel(widget.clockViewModel);
	var animationWidget = new Cesium.Animation('animationContainer', animationViewModel);
	widget.animationViewModel = animationViewModel;
    widget.animationViewModel.setShuttleRingTicks([yearPerSec, yearPerSec*5, yearPerSec*10, yearPerSec*50]);
	
    widget.animationViewModel.dateFormatter = function(date, viewModel) {
        var gregorianDate = date.toGregorianDate();
        return 'Year: ' + gregorianDate.year;
    };
	// setup timeline
	function onTimelineScrub(e) {
		widget.clock.currentTime = e.timeJulian;
		widget.clock.shouldAnimate = false;
	}
	var timeline = new Cesium.Timeline('timelineContainer', widget.clock);
	widget.timeline = timeline;
	widget.timeline.addEventListener('settime', onTimelineScrub, false);
	widget.timeline.updateFromClock();
    widget.timeline.zoomTo(widget.clock.startTime, widget.clock.stopTime);
	// setup scene mode picker
	var transitioner = new Cesium.SceneTransitioner(widget.scene);
	widget.transitioner = transitioner;
	var sceneModePicker = new Cesium.SceneModePicker('sceneModePickerContainer', widget.transitioner)
	// setup home button
	var homeButton = new Cesium.HomeButton('homeButtonContainer', widget.scene, widget.transitioner, widget.ellipsoid, 1000);
	// setup fullscreenbutton
	var fullscreenButton = new Cesium.FullscreenButton('fullscreenButtonContainer', document.body);
	
	
	widget.transitioner.toColumbusView();
	
	// If the mouse is over the billboard, change its scale and color
	var highlightBarHandler = new Cesium.ScreenSpaceEventHandler(widget.scene.getCanvas());
	highlightBarHandler.setInputAction(
		function (movement) {
			var pickedObject = widget.scene.pick(movement.endPosition);
			if (typeof(pickedObject) !== 'undefined' &&
				typeof(pickedObject.nationData) !== 'undefined') {
				sharedObject.dispatch.nationMouseover(pickedObject.nationData); 
			}
		},
		Cesium.ScreenSpaceEventType.MOUSE_MOVE
	);
	
	
	// Response to a nation's mouseover event
	sharedObject.dispatch.on("nationMouseover.cesium", function(nationObject) {
        for (var i=0; i<polylines.length; i++) {
			var polyline = polylines[i];
			var outlineMaterial = polyline.getMaterial();
			if (polyline.nationData.name === nationObject.name) {
				outlineMaterial.uniforms.color = Cesium.Color.fromCssColorString('#00ff00');
			}
			else {
				outlineMaterial.uniforms.color = Cesium.Color.fromCssColorString(colorScale(polyline.nationData.region));
			}
        }
      });


	// define functionality for flying to a nation
	// this callback is triggered when a nation is clicked
    sharedObject.flyTo = function(d) {
		var ellipsoid = widget.centralBody.getEllipsoid();
		
        var destination = Cesium.Cartographic.fromDegrees(d.lon, d.lat-20.0, 10000000.0);
		var destCartesian = widget.centralBody.getEllipsoid().cartographicToCartesian(destination);
		destination = ellipsoid.cartesianToCartographic(destCartesian);
		
		var lookat = ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(d.lon, d.lat, 0.0));
		var dirCartesian = lookat.subtract(destCartesian).normalize();
		

        // only fly there if it is not the camera's current position
        if (!ellipsoid
                   .cartographicToCartesian(destination)
                   .equalsEpsilon(widget.scene.getCamera().getPositionWC(), Cesium.Math.EPSILON6)) {

            var flight = Cesium.CameraFlightPath.createAnimationCartographic(widget.scene.getFrameState(), {
                destination : destination,
				direction : dirCartesian
            });
            widget.scene.getAnimations().add(flight);
        }
    };

})();