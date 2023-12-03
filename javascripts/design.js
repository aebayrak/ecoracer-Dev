/**
 * This module handles design space variables for EcoRacer.
 * At this time, the only design parameter is the final gear ratio.
 * 
 * With respect to final gear ratio, this module:
 *  - exports the gear ratio variable.
 *  - handles events for the UI elements in the gear ratio design page.
 */

/************************ DESIGN INTERFACE **********************************************/
export var gear_ratio = 18; // final drive ratio

var MAX_FINALDRIVE = 40.0;
var MIN_FINALDRIVE = 10.0;
var touch_x, touch_y;
var gear_time_start = Date.now();
var gear_speed = 1.0;
var gear_frame;
var mousedown = false;

/**
 * This function creates the UI within existing HTML elements, attaches event handlers, and
 * begins the gear animation timer.
 * The HTML elements used are:
 *  #canvas_gear for the svg
 *  #finaldrive for event handling of user interactions
 *  #finaldrivetext for text feedback and status
 */
export function initialize_design(){
	$("#finaldrivetext").html("<a>Final Drive Ratio: "+gear_ratio + "</a><br><a>Swipe to tune</a>");
	var width = $("#canvas_gear").width();
	var height = $("#canvas_gear").height();
	var radius = 50;
	// var x = Math.sin(2 * Math.PI / 3);
	// var y = Math.cos(2 * Math.PI / 3);

	// var offset = 0,
	// 	speed = 4,
	// 	start = Date.now();
	
	var svg = d3.select("#canvas_gear").append("svg")
		.attr("width", width)
		.attr("height", height)
	.append("g")
		.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(.90)")
	.append("g");
	
	gear_frame = svg.append("g")
		.datum({radius: Infinity});

	gear_frame.append("g")
		.attr("class", "sun")
		.attr("transform", "translate(0," + radius * 1.5 + ")")
		.datum({teeth: 16, radius: radius})
	.append("path")
		.attr("d", gear);
	
	gear_frame.append("g")
		.attr("class", "planet")
		.attr("transform", "translate(0,-" + radius * 1.5 + ")")
		.datum({teeth: 32, radius: -radius * 2})
	.append("path")
		.attr("d", gear);
	
	$("#finaldrive").on('touchstart',function(e){
		touch_x = e.originalEvent.touches[0].pageX;
		touch_y = e.originalEvent.touches[0].pageY;
	});
	$("#finaldrive").on('mousedown', function(e){
		touch_x = e.pageX;
		touch_y = e.pageY;
		mousedown = true;
	});
	$("#finaldrive").on('touchmove',function(e){
		gear_ratio = Math.max(Math.min(MAX_FINALDRIVE, (e.originalEvent.touches[0].pageY - touch_y)*0.1+gear_ratio),MIN_FINALDRIVE);
		gear_ratio = Math.round(gear_ratio);
		$("#finaldrivetext").html("<a>Final Drive Ratio: "+gear_ratio+"</a><br><a>Swipe to tune</a>");
		$(".sun")[0].setAttribute("transform", "translate(0," + radius * 1.5 + ")"+"scale(" + (1.0-0.01*(gear_ratio-25)) + ")");
		$(".planet")[0].setAttribute("transform", "translate(0,-" + radius * 1.5 + ")"+"scale(" + (1.0+0.01*(gear_ratio-25)) + ")");
		touch_x = e.originalEvent.touches[0].pageX;
		touch_y = e.originalEvent.touches[0].pageY;
	});
	$("#finaldrive").on('mousemove', function(e){
		if(mousedown){
			gear_ratio = Math.max(Math.min(MAX_FINALDRIVE, (e.pageY - touch_y)*0.1+gear_ratio),MIN_FINALDRIVE);
			gear_ratio = Math.round(gear_ratio);
			$("#finaldrivetext").html("<a>Final Drive Ratio: "+gear_ratio+"</a><br><a>Swipe to tune</a>");
			$(".sun")[0].setAttribute("transform", "translate(0," + radius * 1.5 + ")"+"scale(" + (1.0-0.01*(gear_ratio-25)) + ")");
			$(".planet")[0].setAttribute("transform", "translate(0,-" + radius * 1.5 + ")"+"scale(" + (1.0+0.01*(gear_ratio-25)) + ")");
			touch_x = e.pageX;
			touch_y = e.pageY;			
		}
	});
	$("body").on('mouseup', function(){
		mousedown = false;
	});
	
	d3.timer(function() {
		var angle = (Date.now() - gear_time_start) * gear_speed,
			transform = function(d) { return "rotate(" + angle / d.radius + ")"; };
		gear_frame.selectAll("path").attr("transform", transform);
		gear_frame.attr("transform", transform); // frame of reference
		});
}

/**
 * @typedef {Object} GearDefinition
 * @property {number} teeth the number of teeth on the gear
 * @property {number} radius the radius of the gear
 * @property {boolean} annulus indicate the presence of an outer ring gear 
 */
/**
 * Return an SVG path segment representing a gear given the values for # of teeth, radius, and annulus.
 * @param {GearDefinition} definition the desired gear attributes 
 * @returns {string} text containing the SVG path for the desired gear.
 */
function gear(definition) {
  var n = definition.teeth,
      r2 = Math.abs(definition.radius),
      r0 = r2 - 8,
      r1 = r2 + 8,
      r3 = definition.annulus ? (r3 = r0, r0 = r1, r1 = r3, r2 + 20) : 20,
      da = Math.PI / n,
      a0 = -Math.PI / 2 + (definition.annulus ? Math.PI / n : 0),
      i = -1,
      path = ["M", r0 * Math.cos(a0), ",", r0 * Math.sin(a0)];
  while (++i < n) path.push(
      "A", r0, ",", r0, " 0 0,1 ", r0 * Math.cos(a0 += da), ",", r0 * Math.sin(a0),
      "L", r2 * Math.cos(a0), ",", r2 * Math.sin(a0),
      "L", r1 * Math.cos(a0 += da / 3), ",", r1 * Math.sin(a0),
      "A", r1, ",", r1, " 0 0,1 ", r1 * Math.cos(a0 += da / 3), ",", r1 * Math.sin(a0),
      "L", r2 * Math.cos(a0 += da / 3), ",", r2 * Math.sin(a0),
      "L", r0 * Math.cos(a0), ",", r0 * Math.sin(a0));
  path.push("M0,", -r3, "A", r3, ",", r3, " 0 0,0 0,", r3, "A", r3, ",", r3, " 0 0,0 0,", -r3, "Z");
  return path.join("");
}