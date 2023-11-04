/************************ GAME INTERFACE **********************************************/
var DISPLACEMENT = 0;
var MARGIN = 175;

var v = cp.v;
var GRABABLE_MASK_BIT = 1 << 31;
var NOT_GRABABLE_MASK = ~GRABABLE_MASK_BIT;
var scene_widthx = 18800; // ???m
var scene_heightx = 280;
var started = false;
var historyDrawn = false;

var motor2eff = 0;

var acc_sig = false;
var brake_sig = false;

//************************************************///
var vehSpeed = 0;
var save_x = [];
var save_v = [];
var save_eff = [];
var car_posOld = 0;
//**************************************************///

var fric = 2.8;
var timeout = 36; // 30s
var max_batt = 0.55; // Change this value
var tstart = 0; // game starts after 5 sec
var indx = 0;
//var data = [00,00,10,20,30,40,50,60,70,80,90,90,90,45,00,00,00,00,00,00,05,10,20,40,60,80,90,90,90,90,45,00,00,20,00,00,00,10,20,30,40,50,60,60,60,40,40,20,00,00,10,20,30,40,40,40,60,60,70,35,00,00,00,00,10,20,30,40,40,50,60,60,60,40,20,00,10,30,50,50,25,00,00,00,30,60,90,90,90,60,30,00,00,00,00,00];
var data = [00,00,10,20,30,40,50,60,70,80,90,90,90,60,30,00,00,00,00,00,05,10,20,40,60,80,90,90,90,90,70,50,30,30,30,30,30,10,10,10,40,70,70,70,90,90,90,70,50,30,10,00,00,00,40,80,80,80,80,70,60,50,40,30,20,10,00,00,10,20,30,40,50,60,70,80,80,80,70,60,50,40,40,40,60,80,80,80,60,40,20,00,00,00,00,00];
//var data = [0,0,0,0,10,20,30,40,50,60,70,80,90,45,0,0,0,0,0,0,10,20,30,40,50,60,70,80,90,45,0,0,0,0,0,0];
var xstep = 200;
var ground = [];
var gndShape = [];
var finishFlag = [];
var finishShape = [];

/// Station Parameters ////
var stationShape = [];
var station = [];
var stationPosX = [17*200];
var stationPosY = [0];
var stationData = [30, 120, 20, 10];
var chrageBatt = 20;
var isCharging = false;
var lastChargingX = 0;
//////////////////////////
var battempty = false;
//var maxdist = 309;
var maxdist = 909;
var cTime = 0;

var demo;
var consumption = 0;
var start_race = 0;
var tap_start = 0;
var battstatus = 100;
var spdLookup = new Float64Array([0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000, 10500, 11000, 11500]);
var trqLookup = new Float64Array([200,200,200,200,200,194,186,161,142,122,103,90,77.5,70,63.5,58,52,49,45, 42, 40, 38, 36, 34]);
var tstep = 48;
var counter = 0;

var motoreff = new Float64Array([0.2,0.46,0.65,0.735,0.794,0.846,0.886,0.913,0.922,0.938,0.946,0.94,0.93975,0.943,0.945,0.945,0.94,0.9372,0.9355, 0.9, 0.86, 0.81, 0.74, 0.65]);
var px2m = 1/20; // 1 pixel == 1/20 meter
var m2m = 500; // 1 mass in game to 500 kg
var t2t = 1; // 1 time step == 1/120 second
var fr = 18; // final drive ratio

var pi = Math.PI;

// var DPon = true;
// var DP_x = new Float64Array([0,210,215,230,245,255,295,305,330,335,345,350,385,410,415,420,475,480,540,545,845,850,860, 950]);
// var DP_comm = new Float64Array([1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,-1,0,-1,-1]);
// var fr = 18;

function messagebox(msg, win){
	$("#messagebox").show();
	$("#textmessage").html(msg);
	$("#acc").removeClass("enabled");
	$("#brake").removeClass("enabled");
	$("#acc").removeClass("activated");
	$("#brake").removeClass("activated");
	$("#timeval").hide();
	if(win){
		$("#scorebox").show();
		submitResult(consumption);
		$("#ok").show();
		$("#restart").hide();
		$("#review").show();
	}
	else{
		$("#scorebox").show();
		$("#ok").hide();
		submitResult(-1);
		$("#restart").show();
		$("#review").show();
	}
}

// restart
function restart(){
	consumption = 0;
	battstatus = 100;
	start_race = 0;
	demo.stop();
	demo = new scene();
	wheel1moment = Jw1;
	wheel2moment = Jw2;
	wheel1.setMoment(wheel1moment);
	wheel2.setMoment(wheel2moment);
	$("#brake").addClass("enabled");
	$("#acc").addClass("enabled");
	$("#messagebox").hide();
	$("#scorebox").hide();
	$("#timeval").show();
	demo.run();
	counter = 0;
	acc_keys = [];
	brake_keys = [];
	getBestScore();
	historyDrawn = false;
	save_x = [];
	save_v = [];
	save_eff = [];
	vehSpeed = 0;
	motor2eff = 0;
	car_posOld = 0;
	$("#history").html("");
	var pBar = document.getElementById("pbar");
	pBar.value = 0;
	$.post('/getUser', {'username':this.username, 'password':this.password}, function(response){
		U.bestscore = response.bestscore;
		$("#myscore").html("My Best Score: "+ Math.round(1000-(U.bestscore/3600/1000/max_batt*1000))/10 + "%");
	});
}

/************************ GAME ENGINE **********************************************/
// physics for this game
function maxTrqlerp(spd){
	//var maxTrq = 8000;
	if (spd>0){
		if (spd <=spdLookup[spdLookup.length-1]){
			for (var i=0; i<(spdLookup.length-1); i++){
				if(spdLookup[i]<=spd && spdLookup[i+1]>spd){
					maxTrq = (spd - spdLookup[i])/500*(trqLookup[i+1]-trqLookup[i])+trqLookup[i];
				}
			}
		}
		else{
			maxTrq = 20;
		}
	}
	else{
		maxTrq = 200;
	}
	return maxTrq;
}

function efflerp(spd, trq){

	/*var posspd = Math.abs(spd);
	var spdind = Math.min(Math.floor(posspd/500),17);
	var spdlow = spdind*500;
	var trqind = Math.min(Math.floor(trq/10),19);
	var trqlow = trqind*10;
	var Q11 = motoreff[spdind][trqind+20];
	var Q12 = motoreff[spdind][trqind+21];

	var Q21 = motoreff[spdind+1][trqind+20];

	var Q22 = motoreff[spdind+1][trqind+21];
	var delspd = spdlow - posspd;
	var deltrq = trqlow - trq;
	var efflerp = 0.95*((delspd+500)*(deltrq+10)/(5000)*Q11 - (delspd)*(deltrq+10)/(5000)*Q21 - (delspd+500)*(deltrq)/(5000)*Q12 + (delspd)*(deltrq)/(5000)*Q22); */

	var absspd = Math.abs(spd);
	//var efflerp = 0.7;
	if (absspd <=spdLookup[spdLookup.length-1]){
		for (var i=0; i<(spdLookup.length-1); i++){
			if(spdLookup[i]<=absspd && spdLookup[i+1]>absspd){
				 efflerpp = ((absspd - spdLookup[i])/500*(motoreff[i+1]-motoreff[i])+motoreff[i])*0.95;
			}
		}
	}
	else {
		efflerpp = 0.6*0.95;
	}

	if (spd*trq > 0){
		efflerpp = 1/efflerpp;
	}

	return efflerpp;
}

function updateConsumption(consumption) {
    //motor1speed = -1*wheel1.w/t2t*fr/2/Math.PI*60; //RPM;
	motor1speed = Math.sqrt(Math.pow(chassis.vx,2)+Math.pow(chassis.vy,2))/wheel1.shapeList[0].r/t2t*fr/pi*30;
    maxTrq1 = maxTrqlerp(motor1speed)/m2m/px2m/px2m*t2t*t2t; //Nm
    //motor2speed = -1*wheel2.w/t2t*fr/2/Math.PI*60; //RPM;
    motor2speed = motor1speed;
    maxTrq2 = maxTrqlerp(motor2speed)/m2m/px2m/px2m*t2t*t2t; //Nm
	motor2.maxForce = maxTrq2*fr;
	motor1.maxForce = maxTrq1*fr;
	motor1torque = -1*Math.min(motor1.jAcc*tstep/fr,maxTrq1)*m2m*px2m*px2m/t2t/t2t;
	motor2torque = -1*Math.min(motor2.jAcc*tstep/fr,maxTrq2)*m2m*px2m*px2m/t2t/t2t;
	motor1eff = efflerp(motor1speed,motor1torque)||0;
	motor2eff = efflerp(Math.abs(motor2speed),-1*Math.abs(motor2torque))||0;
	con1 = motor1torque/tstep*motor1speed*pi/30*motor1eff;
	if (Math.abs(con1)> 216000){con1=1000;}
	con2 = motor2torque/tstep*motor2speed*pi/30*motor1eff;
	if (Math.abs(con2)> 216000){con2=1000;}
	consumption += (con1 + con2);
	return consumption;
}

//An example of how to define a space,
//but if you just want to add bodies, shapes, etc and
//do stuff with them then you should play with the code above.
function defineSpace(canvas_id, width, height) {
 var __ENVIRONMENT__ = function () {
     //Initialize
     var space = this.space = new cp.Space();
     this.mouse = v(0, 0);

     var self = this;
     var canvas2point = this.canvas2point = function (x, y) {
         var rect = canvas.getBoundingClientRect(); //so canvas can be anywhere on the page
         return v((x / self.scale) - rect.left, height - y / self.scale + rect.top);
     };

     this.point2canvas = function (point) {
         return v(point.x * self.scale, (height - point.y) * self.scale);
     };

     this.canvas.onmousemove = function (e) {
         self.mouse = canvas2point(e.clientX, e.clientY);
     };

     var mouseBody = this.mouseBody = new cp.Body(Infinity, Infinity);
     this.canvas.oncontextmenu = function (e) {
         return false;
     };

     this.canvas.onmousedown = function (e) {
         e.preventDefault();
         var rightclick = e.which === 3; // or e.button === 2;
         self.mouse = canvas2point(e.clientX, e.clientY);

         if (!rightclick && !self.mouseJoint) {
             var point = canvas2point(e.clientX, e.clientY);

             var shape = space.pointQueryFirst(point, GRABABLE_MASK_BIT, cp.NO_GROUP);
             if (shape) {
                 var body = shape.body;
                 var mouseJoint = self.mouseJoint = new cp.PivotJoint(mouseBody, body, v(0, 0), body.world2Local(point));

                 mouseJoint.maxForce = 50000;
                 mouseJoint.errorBias = Math.pow(1 - 0.15, 60);
                 space.addConstraint(mouseJoint);
             }
         }

         if (rightclick) {
             self.rightClick = true;
         }
     };

     this.canvas.onmouseup = function (e) {
         var rightclick = e.which === 3; // or e.button === 2;
         self.mouse = canvas2point(e.clientX, e.clientY);

         if (!rightclick) {
             if (self.mouseJoint) {
                 space.removeConstraint(self.mouseJoint);
                 self.mouseJoint = null;
             }
         }

         if (rightclick) {
             self.rightClick = false;
         }
     };
 };


 var canvas = __ENVIRONMENT__.prototype.canvas = document.getElementById(canvas_id);
 var ctx = __ENVIRONMENT__.prototype.ctx = canvas.getContext('2d');


 //Resize
 var w = __ENVIRONMENT__.prototype.width = canvas.width = width;
 var h = __ENVIRONMENT__.prototype.height = canvas.height = height;
 __ENVIRONMENT__.prototype.scale = 1.0;
 __ENVIRONMENT__.resized = true;


 // Update, should be overridden by the demo itself.
 __ENVIRONMENT__.prototype.update = function (dt) {
     this.space.step(dt);
 };


 // Draw
 __ENVIRONMENT__.prototype.draw = function () {

 	DISPLACEMENT = chassis.p.x - MARGIN;

     var ctx = this.ctx;
     var self = this;

     // Draw shapes
     ctx.strokeStyle = 'black';
     ctx.clearRect(0, 0, this.width, this.height);

     this.space.eachShape(function (shape) {
         ctx.fillStyle = shape.style();
         shape.draw(ctx, self.scale, self.point2canvas);
     });

     if (this.mouseJoint) {
         ctx.beginPath();
         var c = this.point2canvas(this.mouseBody.p);
         ctx.arc(c.x, c.y, this.scale * 5, 0, 2 * Math.PI, false);
         ctx.fill();
         ctx.stroke();
     }

     this.space.eachConstraint(function (c) {
         if (c.draw) {
             c.draw(ctx, self.scale, self.point2canvas);
         }
     });
 };


 // Run
 __ENVIRONMENT__.prototype.run = function () {
     this.running = true;

     var self = this;

     var lastTime = 0;
     var step = function (time) {
         self.step(time - lastTime);
         lastTime = time;

         if (self.running) {
             requestAnimationFrame(step);
         }
     };

     step(0);
 };


 // Stop
 __ENVIRONMENT__.prototype.stop = function () {
     this.running = false;
 };


 // Step
 __ENVIRONMENT__.prototype.step = function (dt) {
     // Move mouse body toward the mouse
     var newPoint = v.lerp(this.mouseBody.p, this.mouse, 0.25);
     this.mouseBody.v = v.mult(v.sub(newPoint, this.mouseBody.p), 60);
     this.mouseBody.p = newPoint;

     var lastNumActiveShapes = this.space.activeShapes.count;

     var now = Date.now();
     this.update(1/tstep);
     this.simulationTime += Date.now() - now;

     // Only redraw if the simulation isn't asleep.
     if (lastNumActiveShapes > 0 || __ENVIRONMENT__.resized) {
         now = Date.now();
         this.draw();
         this.drawTime += Date.now() - now;
         __ENVIRONMENT__.resized = false;
     }
 };

 __ENVIRONMENT__.prototype.addFloor = function(data, scene_widthx, xstep) {
 	var space = this.space;
	var staticBody = space.staticBody;

	for (var i=0;i<scene_widthx/xstep-3;i++){
		gndShape[i] = new cp.SegmentShape(staticBody, v(i*xstep,data[i]), v((i+1)*xstep,data[i+1]), 0);
		ground[i] = space.addShape(gndShape[i]);
		ground[i].setElasticity(0);
		ground[i].setFriction(0.1);
		ground[i].layers = NOT_GRABABLE_MASK;
	}

	// extra floor to complete the scene
	for (var j=i; j<i+6; j++){
		gndShape[j] = new cp.SegmentShape(staticBody, v(j*xstep,data[i]), v((j+1)*xstep,data[i+1]), 0);
		ground[j] = space.addShape(gndShape[j]);
		ground[j].setElasticity(0);
		ground[j].setFriction(0.1);
		ground[j].layers = NOT_GRABABLE_MASK;
	}
 };

 __ENVIRONMENT__.prototype.addTerminal = function(distance){
	var space = this.space;
	var staticBody = space.staticBody;
	finishShape[0] = new cp.SegmentShape(staticBody, v(distance,0), v(distance,280), 0);
	finishFlag[0] = space.addShape(finishShape[0]);
	finishFlag[0].flag = true;
	finishFlag[0].sensor = true;
};

 __ENVIRONMENT__.prototype.addStation = function(distance, elevation){
		var space = this.space;
		var staticBody = space.staticBody;
		/*stationShape[0] = new cp.BoxShape(staticBody, stationData[2], stationData[3], v(distance,45));
		station[0] = space.addShape(stationShape[0]);
		station[0].flag = true;
		station[0].sensor = true;*/

		stationShape[0] = new cp.CircleShape(staticBody, 10, v(distance,elevation+40));
		station[0] = space.addShape(stationShape[0]);
		station[0].flag = true;
		station[0].sensor = true;

		stationShape[0] = new cp.CircleShape(staticBody, 2, v(distance+5,elevation+40));
		station[0] = space.addShape(stationShape[0]);
		//station[0].flag = true;
		station[0].sensor = true;

		stationShape[0] = new cp.CircleShape(staticBody, 2, v(distance-5,elevation+40));
		station[0] = space.addShape(stationShape[0]);
		//station[0].flag = true;
		station[0].sensor = true;

		stationShape[0] = new cp.BoxShape(staticBody, stationData[0], stationData[1], v(distance,elevation));
		station[0] = space.addShape(stationShape[0]);
		station[0].flag = true;
		station[0].sensor = true;


}
// Drawing helper methods

 var drawCircle = function(ctx, scale, point2canvas, c, radius) {
 	var c = point2canvas(c);
 	ctx.beginPath();
 	ctx.arc(c.x - DISPLACEMENT, c.y, scale * radius, 0, 2*Math.PI, false);
 	ctx.fill();
 	ctx.stroke();
 };

 var drawLine = function(ctx, point2canvas, a, b) {
 	a = point2canvas(a); b = point2canvas(b);

 	ctx.beginPath();
 	ctx.moveTo(a.x - DISPLACEMENT, a.y);
 	ctx.lineTo(b.x - DISPLACEMENT, b.y);
 	ctx.stroke();
 };

 var drawRect = function(ctx, point2canvas, pos, size) {
 	var pos_ = point2canvas(pos);
 	var size_ = cp.v.sub(point2canvas(cp.v.add(pos, size)), pos_);
 	ctx.fillRect(pos_.x - DISPLACEMENT, pos_.y, size_.x - DISPLACEMENT, size_.y);
 };

// var springPoints = [
// 	v(0.00, 0.0),
// 	v(0.20, 0.0),
// 	v(0.25, 3.0),
// 	v(0.30,-6.0),
// 	v(0.35, 6.0),
// 	v(0.40,-6.0),
// 	v(0.45, 6.0),
// 	v(0.50,-6.0),
// 	v(0.55, 6.0),
// 	v(0.60,-6.0),
// 	v(0.65, 6.0),
// 	v(0.70,-3.0),
// 	v(0.75, 6.0),
// 	v(0.80, 0.0),
// 	v(1.00, 0.0)
// ];

 var drawSpring = function(ctx, scale, point2canvas, a, b) {
// 	a = point2canvas(a); b = point2canvas(b);
//
// 	ctx.beginPath();
// 	ctx.moveTo(a.x - DISPLACEMENT, a.y);
//
// 	var delta = v.sub(b, a);
// 	var len = v.len(delta);
// 	var rot = v.mult(delta, 1/len);
//
// 	for(var i = 1; i < springPoints.length; i++) {
//
// 		var p = v.add(a, v.rotate(v(springPoints[i].x * len, springPoints[i].y * scale), rot));
//
// 		//var p = v.add(a, v.rotate(springPoints[i], delta));
//
// 		ctx.lineTo(p.x - DISPLACEMENT, p.y);
// 	}
//
// 	ctx.stroke();
 };


 // **** Draw methods for Shapes
 cp.PolyShape.prototype.draw = function (ctx, scale, point2canvas) {
     ctx.beginPath();

     var verts = this.tVerts;
     var len = verts.length;
     var lastPoint = point2canvas(new cp.Vect(verts[len - 2], verts[len - 1]));
     ctx.moveTo(lastPoint.x - DISPLACEMENT, lastPoint.y);

     for (var i = 0; i < len; i += 2) {
         var p = point2canvas(new cp.Vect(verts[i], verts[i + 1]));
         ctx.lineTo(p.x - DISPLACEMENT, p.y);
     }

     if(this.flag){
     	ctx.fillStyle = "rgba(255,255,255, 0.1)";
     	ctx.strokeStyle = "rgba(0,0,0, 0.2)";
 	}
 	else{
 		// car shape
// 		ctx.lineWidth = 5;
 		ctx.fillStyle = '#222222'; // max changed the color to fit the other elements
// 		ctx.strokeStyle = '#f9f9f9';
 	}
     ctx.fill();
     ctx.stroke();
 };

 cp.SegmentShape.prototype.draw = function (ctx, scale, point2canvas) {
     var oldLineWidth = ctx.lineWidth;
     //ctx.lineWidth = Math.max(1, this.r * scale * 2);
     ctx.lineWidth = 10;
     var a = this.ta;
     var b = this.tb;
     a = point2canvas(a);
     b = point2canvas(b);
     if (this.flag){
    	ctx.lineWidth = 10;
     	ctx.strokeStyle = "rgba(255,0,0, 0.2)";
     }
     else{
     	ctx.strokeStyle = "rgba(0,0,0, 1)";
     }
     ctx.beginPath();
     ctx.moveTo(a.x - DISPLACEMENT, a.y);
     ctx.lineTo(b.x - DISPLACEMENT, b.y);
     ctx.stroke();

     ctx.lineWidth = oldLineWidth;
 };

 cp.CircleShape.prototype.draw = function (ctx, scale, point2canvas) {
     var c = point2canvas(this.tc);
     ctx.beginPath();
     ctx.arc(c.x - DISPLACEMENT, c.y, scale * this.r, 0, 2*Math.PI, false);
     if (this.flag && this.sensor){
		ctx.fillStyle = "rgba(0,0,0, 0.2)";
		ctx.strokeStyle = "rgba(0,0,0,0)";
	 }
     else if (this.sensor){
 		ctx.fillStyle = "rgba(0,0,0, 1)";
		ctx.strokeStyle = "rgba(0,0,0, 0)";
     }
     else {
         ctx.fillStyle = "rgba(0,0,0, 1)";
         ctx.lineWidth = 5;
         ctx.strokeStyle = '#e9e9e9';
     }
     ctx.fill();
     ctx.stroke();


     // And draw a little radian so you can see the circle roll.
     a = point2canvas(this.tc); b = point2canvas(cp.v.mult(this.body.rot, this.r).add(this.tc));
     ctx.beginPath();
     ctx.moveTo(a.x - DISPLACEMENT, a.y);
     ctx.lineTo(b.x - DISPLACEMENT, b.y);
     ctx.stroke();
 };

 cp.GrooveJoint.prototype.draw = function(ctx, scale, point2canvas) {
// 	var a = this.a.local2World(this.grv_a);
// 	var b = this.a.local2World(this.grv_b);
// 	var c = this.b.local2World(this.anchr2);
//
// 	ctx.strokeStyle = "grey";
// 	//drawLine(ctx, point2canvas, a, b);
// 	drawCircle(ctx, scale, point2canvas, c, 3);
 };

 cp.DampedSpring.prototype.draw = function(ctx, scale, point2canvas) {
// 	var a = this.a.local2World(this.anchr1);
// 	var b = this.b.local2World(this.anchr2);
//
// 	ctx.strokeStyle = "grey";
// 	drawSpring(ctx, scale, point2canvas, a, b);
 };

 // Color
 var randColor = function () {
     return Math.floor(Math.random() * 256);
 };

 var styles = [];
 for (var i = 0; i < 100; i++) {
     styles.push("rgb(" + randColor() + ", " + randColor() + ", " + randColor() + ")");
 }

 cp.Shape.prototype.style = function () {
     var body;
     if (this.sensor) {
         return "rgba(255,255,255,0)";
     } else {
         body = this.body;
         if (body.isSleeping()) {
             return "rgb(50,50,50)";
         } else if (body.nodeIdleTime > this.space.sleepTimeThreshold) {
             return "rgb(170,170,170)";
         } else {
             return styles[this.hashid % styles.length];
         }
     }
 };

 return __ENVIRONMENT__;
}


/************************ UTILITIES **********************************************/
function lockScroll()
{
	$(document).off("touchmove").on("touchmove",function(event){
		event.preventDefault();
	});
}
