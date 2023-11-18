/************************ GAME INTERFACE **********************************************/
var started = false;
var historyDrawn = false;

const fric = 2.8;
const max_batt = 0.55; // Change this value
//var data = [00,00,10,20,30,40,50,60,70,80,90,90,90,45,00,00,00,00,00,00,05,10,20,40,60,80,90,90,90,90,45,00,00,20,00,00,00,10,20,30,40,50,60,60,60,40,40,20,00,00,10,20,30,40,40,40,60,60,70,35,00,00,00,00,10,20,30,40,40,50,60,60,60,40,20,00,10,30,50,50,25,00,00,00,30,60,90,90,90,60,30,00,00,00,00,00];
const data = [00,00, 10, 20, 30, 40, 50, 60, 70, 80, 90, 90, 90, 60, 30,00,00,00,00,00,05, 10, 20, 40, 60, 80, 90, 90, 90, 90, 70, 50, 30, 30, 30, 30, 30, 10, 10, 10, 40, 70, 70, 70, 90, 90, 90, 70, 50, 30, 10,00,00,00, 40, 80, 80, 80, 80, 70, 60, 50, 40, 30, 20, 10,00,00, 10, 20, 30, 40, 50, 60, 70, 80, 80, 80, 70, 60, 50, 40, 40, 40, 60, 80, 80, 80, 60, 40, 20,00,00,00,00,00];
//var data = [0,0,0,0,10,20,30,40,50,60,70,80,90,45,0,0,0,0,0,0,10,20,30,40,50,60,70,80,90,45,0,0,0,0,0,0];

const MAX_DISTANCE = 909;

const spdLookup = new Float64Array([0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000, 10500, 11000, 11500]);
const trqLookup = new Float64Array([200, 200, 200, 200, 200, 194, 186, 161, 142, 122, 103, 90, 77.5, 70, 63.5, 58, 52, 49, 45, 42, 40, 38, 36, 34]);
const tstep = 48;

const motoreff = new Float64Array([0.2, 0.46, 0.65, 0.735, 0.794, 0.846, 0.886, 0.913, 0.922, 0.938, 0.946, 0.94, 0.93975, 0.943, 0.945, 0.945, 0.94, 0.9372, 0.9355, 0.9, 0.86, 0.81, 0.74, 0.65]);
const px2m = 1 / 20; // 1 pixel == 1/20 meter
const m2m = 500; // 1 mass in game to 500 kg
const  t2t = 1; // 1 time step == 1/120 second
var fr = 18; // final drive ratio

const pi = Math.PI;

// var DPon = true;
// var DP_x = new Float64Array([0,210,215,230,245,255,295,305,330,335,345,350,385,410,415,420,475,480,540,545,845,850,860, 950]);
// var DP_comm = new Float64Array([1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,-1,0,-1,-1]);
// var fr = 18;

function messagebox(msg, win) {
	$("#messagebox").show();
	$("#textmessage").html(msg);
	$("#acc").removeClass("enabled");
	$("#brake").removeClass("enabled");
	$("#acc").removeClass("activated");
	$("#brake").removeClass("activated");
	if (win) {
		$("#scorebox").show();
		$("#ok").show();
		$("#restart").hide();
		$("#review").show();
		// submitResult(consumption);
	}
	else {
		$("#scorebox").show();
		$("#ok").hide();
		$("#restart").show();
		$("#review").show();
		// submitResult(-1);
	}
}

/************************ GAME ENGINE **********************************************/
// physics for this game
function maxTrqlerp(spd) {
	//var maxTrq = 8000;
	if (spd > 0) {
		if (spd <= spdLookup[spdLookup.length - 1]) {
			for (var i = 0; i < (spdLookup.length - 1); i++) {
				if (spdLookup[i] <= spd && spdLookup[i + 1] > spd) {
					maxTrq = (spd - spdLookup[i]) / 500 * (trqLookup[i + 1] - trqLookup[i]) + trqLookup[i];
				}
			}
		}
		else {
			maxTrq = 20;
		}
	}
	else {
		maxTrq = 200;
	}
	return maxTrq;
}

function efflerp(spd, trq) {

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
	if (absspd <= spdLookup[spdLookup.length - 1]) {
		for (var i = 0; i < (spdLookup.length - 1); i++) {
			if (spdLookup[i] <= absspd && spdLookup[i + 1] > absspd) {
				efflerpp = ((absspd - spdLookup[i]) / 500 * (motoreff[i + 1] - motoreff[i]) + motoreff[i]) * 0.95;
			}
		}
	}
	else {
		efflerpp = 0.6 * 0.95;
	}

	if (spd * trq > 0) {
		efflerpp = 1 / efflerpp;
	}

	return efflerpp;
}

/************************ UTILITIES **********************************************/
function lockScroll() {
	$(document).off("touchmove").on("touchmove", function (event) {
		event.preventDefault();
	});
}
