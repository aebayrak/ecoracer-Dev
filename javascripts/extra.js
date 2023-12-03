/************************ GAME INTERFACE **********************************************/
var started = false;
var historyDrawn = false;

const MAX_RENDER_FPS = 60;
const SIMULATION_STEPS_PER_SECOND = 60;

const fric = 2.8;
const max_batt = 0.55; // Change this value
//var data = [00,00,10,20,30,40,50,60,70,80,90,90,90,45,00,00,00,00,00,00,05,10,20,40,60,80,90,90,90,90,45,00,00,20,00,00,00,10,20,30,40,50,60,60,60,40,40,20,00,00,10,20,30,40,40,40,60,60,70,35,00,00,00,00,10,20,30,40,40,50,60,60,60,40,20,00,10,30,50,50,25,00,00,00,30,60,90,90,90,60,30,00,00,00,00,00];
const data = [0,0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 90, 90, 60, 30,0,0,0,0,0,5, 10, 20, 40, 60, 80, 90, 90, 90, 90, 70, 50, 30, 30, 30, 30, 30, 10, 10, 10, 40, 70, 70, 70, 90, 90, 90, 70, 50, 30, 10,0,0,0, 40, 80, 80, 80, 80, 70, 60, 50, 40, 30, 20, 10,0,0, 10, 20, 30, 40, 50, 60, 70, 80, 80, 80, 70, 60, 50, 40, 40, 40, 60, 80, 80, 80, 60, 40, 20,0,0,0,0,0];
//var data = [0,0,0,0,10,20,30,40,50,60,70,80,90,45,0,0,0,0,0,0,10,20,30,40,50,60,70,80,90,45,0,0,0,0,0,0];

const MAX_DISTANCE = 909;

const px2m = 1 / 20; // 1 pixel == 1/20 meter
const m2m = 500; // 1 mass in game to 500 kg
const  t2t = 1; // 1 time step == 1/120 second

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
