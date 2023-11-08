import DrawLandscape from './game-landscape.js'
import Scene from './game-physics.js';

var scene_width = $(window).width();
var scene_height = $(window).height();

/****************************************** USER **********************************************************/
function user(username, password) {
    var d = this;
    this.username = username || $("#username")[0].value || default_username; // only for development
    this.password = password || $("#password")[0].value || default_password;

    $.post(
        "/getUser",
        { username: this.username, password: this.password },
        function (response) {
            if (response === "") {
                $("#message").html("User doesn't exist or password wrong.");
                setTimeout(function () {
                    $("#message").html("");
                }, 1500);
                U = null;
            } else {
                d.id = response.id;
                d.name = response.name;
                d.bestscore = response.bestscore;

                if (d.bestscore > 0) {
                    $("#myscore").html(
                        "My Best Score: " +
                            Math.round(
                                1000 -
                                    (d.bestscore / 3600 / 1000 / max_batt) *
                                        1000,
                            ) /
                                10 +
                            "%",
                    );
                } else {
                    $("#myscore").html("My Best Score: --%");
                }
            }
        },
    );
}

/****************************************** GAME **********************************************************/

//Run
export var demo = new Scene("canvas1", scene_width, scene_heightx);
export default demo;
demo.run();

function ChangePage( pageID ){
    document.querySelectorAll('body > div').forEach( page => {
        // console.log(page);
        if( page.id === 'rotate-page'){
            // leave this visible at all times and let CSS hide on device rotation.
        }
        else if( page.id === pageID ){
            page.classList.remove('hidden');
        }else{
            page.classList.add('hidden');
        }
    });
}

// restart
function restart() {
	consumption = 0;
	battstatus = 100;
	start_race = 0;
	demo.stop();
	demo = new Scene("canvas1", scene_width, scene_heightx);
    demo.reset();
	$("#brake").addClass("enabled");
	$("#acc").addClass("enabled");
	$("#messagebox").hide();
	$("#scorebox").hide();
	$("#timeval").show();
	$("#history").html("");
	demo.run();
	counter = 0;
	UserData.acc_keys = [];
	UserData.brake_keys = [];
	getBestScore();
	historyDrawn = false;
	save_x = [];
	save_v = [];
	save_eff = [];
	vehSpeed = 0;
	motor2eff = 0;
	car_posOld = 0;
	document.getElementById("pbar").value = 0;
	$.post('/getUser', { 'username': UserData.username, 'password': UserData.password }, function (response) {
		UserData.bestscore = response.bestscore;
		$("#myscore").html("My Best Score: " + Math.round(1000 - (UserData.bestscore / 3600 / 1000 / max_batt * 1000)) / 10 + "%");
	});
    DrawLandscape('canvasbg', data);
};

// script to run at document.ready()
$(function () {
    $("#register").on("tap click", function (event) {
        event.preventDefault();
        if (
            $("#username")[0].value != "username" &&
            $("#username")[0].value != "" &&
            $("#password")[0].value != "password" &&
            $("#password")[0].value != ""
        ) {
            $.post(
                "/signup",
                {
                    username: $("#username")[0].value,
                    password: $("#password")[0].value,
                },
                function (response) {
                    U = new user();
                },
            );
        } else {
            $("#message").html("Username cannot be empty...");
            setTimeout(function () {
                $("#message").html("");
                showRobots();
            }, 1500);
        }
    });
    $("#login").on("tap click", function (event) {
        event.preventDefault();
        if ($("#username")[0].value != "username") {
            U = new user($("#username")[0].value, $("#password")[0].value);
        } else {
            $("#message").html("Username cannot be empty...");
            setTimeout(function () {
                $("#message").html("");
                showRobots();
            }, 1500);
        }
    });
    
    $(document).on("keydown", function (e) {
        switch(e.key)
        {
            case "ArrowLeft":
                $("#brake").trigger('touchstart');
                break;
            case "ArrowDown":
                $("#brake").trigger('touchstart');
                break;
            case "ArrowUp":
                $("#acc").trigger('touchstart');
                break;
            case "ArrowRight":
                $("#acc").trigger('touchstart');
                break;
            case "Enter":
                break;
        }
    });

    $(document).on("keyup", function (e) {
        switch(e.key)
        {
            case "ArrowLeft":
                $("#brake").trigger('touchend');
                break;
            case "ArrowDown":
                $("#brake").trigger('touchend');
                break;
            case "ArrowUp":
                $("#acc").trigger('touchend');
                break;
            case "ArrowRight":
                $("#acc").trigger('touchend');
                break;
            case "Enter":
                break;
        }
    });

    $("#brake").addClass("enabled");
    $("#brake").on("touchstart mousedown", function (event) {
        event.preventDefault();
        if ($("#brake").hasClass("enabled")) {
            brake_sig = true;
            $("#brake").addClass("activated");
            if (Math.round(demo.chassis.p.x) != UserData.brake_keys[UserData.brake_keys.length - 1]) {
                UserData.brake_keys.push(Math.round(demo.chassis.p.x));
            }
        }
    });
    $("#brake").on("touchend mouseup", function (event) {
        event.preventDefault();
        if ($("#brake").hasClass("enabled")) {
            brake_sig = false;
            $("#brake").removeClass("activated");
            demo.brake();
            brake_sig = false;
            acc_sig = false;
            if (Math.round(demo.chassis.p.x) != UserData.brake_keys[UserData.brake_keys.length - 1]) {
                UserData.brake_keys.push(Math.round(demo.chassis.p.x));
            }
        }
    });

    $("#acc").addClass("enabled");
    $("#acc").on("touchstart mousedown", function (event) {
        event.preventDefault();
        if ($("#acc").hasClass("enabled")) {
            acc_sig = true;
            start_race = tap_start;
            $("#acc").addClass("activated");
            if (Math.round(demo.chassis.p.x) != UserData.acc_keys[UserData.acc_keys.length - 1]) {
                UserData.acc_keys.push(Math.round(demo.chassis.p.x));
            }
        }
    });
    $("#acc").on("touchend mouseup", function (event) {
        event.preventDefault();
        if ($("#acc").hasClass("enabled")) {
            acc_sig = false;
            $("#acc").removeClass("activated");
            demo.accelerate();
            brake_sig = false;
            acc_sig = false;
            if (Math.round(demo.chassis.p.x) != UserData.acc_keys[UserData.acc_keys.length - 1]) {
                UserData.acc_keys.push(Math.round(demo.chassis.p.x));
            }
        }
    });
    $("#ok").on("tap click", function (event) {
        event.preventDefault();
        $("#messagebox").hide();
        $("#scorebox").hide();
        $("#review").hide();
        restart();
    });
    $("#restart").on("tap click", function (event) {
        event.preventDefault();
        $("#messagebox").hide();
        $("#scorebox").hide();
        $("#review").hide();
        restart();
    });
    $("#review").on("tap click", function (event) {
        event.preventDefault();
        if (!historyDrawn) {
            drawHistory();
            historyDrawn = true;
        }
        $("#history").show();
    });
    $("#history").on("tap click", function (event) {
        event.preventDefault();
        $("#history").hide();
    });

    $("#intro-page").on("tap click", function (event) {
        event.preventDefault();
        $("#intro-page").hide(500, function () {
            $("#brake").removeClass("locked");
            $("#acc").removeClass("locked");
            getBestScore();
            demo.reset();
            ChangePage( "home-page" );
        });
    });

    $("#designbutton").on("tap click", function () {
        $("#design-page").show();
        initialize_design();
    });
    $("#resetbutton").on("tap click", function (event) {
        restart();
    });
    $("#designed").on("tap click", function () {
        $("#design-page").hide();
        $("#canvas_gear").empty();
        restart();
    });

    DrawLandscape('canvasbg', data);

    ChangePage( "intro-page" );
});
