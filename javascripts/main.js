import * as MiniMap from './game-landscape.js';
import * as submit from './submit.js';
import { world, Chipmunk2DWorld } from './game-physics.js';
import { Players } from './player.js';
import { GhostControl } from './ghost-control.js';

/****************************************** USER **********************************************************/
function user(username, password) {
    var d = this;
    this.username = username || $('#username')[0].value || default_username; // only for development
    this.password = password || $('#password')[0].value || default_password;

    $.post('/getUser', { username: this.username, password: this.password }, function (response) {
        if (response === '') {
            $('#message').html("User doesn't exist or password wrong.");
            setTimeout(function () {
                $('#message').html('');
            }, 1500);
            U = null;
        } else {
            d.id = response.id;
            d.name = response.name;
            d.bestscore = response.bestscore;

            if (d.bestscore > 0) {
                $('#myscore').html('My Best Score: ' + Math.round(1000 - (d.bestscore / 3600 / 1000 / max_batt) * 1000) / 10 + '%');
            } else {
                $('#myscore').html('My Best Score: --%');
            }
        }
    });
}

function ChangePage(pageID) {
    document.querySelectorAll('body > div').forEach((page) => {
        // console.log(page);
        if (page.id === 'rotate-page') {
            // leave this visible at all times and let CSS hide on device rotation.
        } else if (page.id === pageID) {
            page.classList.remove('hidden');
        } else {
            page.classList.add('hidden');
        }
    });
}

/****************************************** GAME **********************************************************/
let simulationTime;
const SIM_DT_MILLISEC = 1000 / 60; //ms
function GameLoop(highResTimerMillisec) {
    // handle ticking the simulation at a fixed interval
    if (simulationTime === undefined) {
        simulationTime = highResTimerMillisec;
    } else {
        while (simulationTime + SIM_DT_MILLISEC <= highResTimerMillisec) {
            // increment simulation by DT
            world.update(SIM_DT_MILLISEC / 1000); // seconds
            simulationTime += SIM_DT_MILLISEC;
        }
    }

    // apply AI player input
    GhostControl.DoAction();

    // handle rendering
    world.draw();
    MiniMap.Render(highResTimerMillisec);

    // look for termination conditions
    if (world.running) {
        requestAnimationFrame(GameLoop);
    }
}

function RunGame() {
    MiniMap.Init('minimap', data);
    GhostControl.Reset();
    new Chipmunk2DWorld('game_world');
    world.reset();
    world.run();
    simulationTime = undefined;
    requestAnimationFrame(GameLoop);
}

// restart
function restart() {
    $('#brake').addClass('enabled');
    $('#acc').addClass('enabled');
    $('#messagebox').hide();
    $('#scorebox').hide();
    $('#history').html('');
    submit.getBestScore();
    historyDrawn = false;
    let playerData = world.player.serverData;
    $.post(
        '/getUser',
        {
            username: playerData.credentials.username,
            password: playerData.credentials.password
        },
        function (response) {
            playerData.bestscore = response.bestscore;
            $('#myscore').html('My Best Score: ' + Math.round(1000 - (UserData.bestscore / 3600 / 1000 / max_batt) * 1000) / 10 + '%');
        }
    );
    RunGame();
}

// script to run at document.ready()
// primarily registers all event handlers and then activates the intro page.
$(function () {
    let player = Players.HUMAN;

    $('#register').on('tap click', function (event) {
        event.preventDefault();
        if (
            $('#username')[0].value != 'username' &&
            $('#username')[0].value != '' &&
            $('#password')[0].value != 'password' &&
            $('#password')[0].value != ''
        ) {
            $.post(
                '/signup',
                {
                    username: $('#username')[0].value,
                    password: $('#password')[0].value
                },
                function () {
                    U = new user();
                }
            );
        } else {
            $('#message').html('Username cannot be empty...');
            setTimeout(function () {
                $('#message').html('');
                showRobots();
            }, 1500);
        }
    });
    $('#login').on('tap click', function (event) {
        event.preventDefault();
        if ($('#username')[0].value != 'username') {
            U = new user($('#username')[0].value, $('#password')[0].value);
        } else {
            $('#message').html('Username cannot be empty...');
            setTimeout(function () {
                $('#message').html('');
                showRobots();
            }, 1500);
        }
    });

    $(document).on('keydown', function (e) {
        switch (e.key) {
            case 'ArrowLeft':
                $('#brake').trigger('touchstart');
                break;
            case 'ArrowDown':
                $('#brake').trigger('touchstart');
                break;
            case 'ArrowUp':
                $('#acc').trigger('touchstart');
                break;
            case 'ArrowRight':
                $('#acc').trigger('touchstart');
                break;
            case 'Enter':
                break;
        }
    });

    $(document).on('keyup', function (e) {
        switch (e.key) {
            case 'ArrowLeft':
                $('#brake').trigger('touchend');
                break;
            case 'ArrowDown':
                $('#brake').trigger('touchend');
                break;
            case 'ArrowUp':
                $('#acc').trigger('touchend');
                break;
            case 'ArrowRight':
                $('#acc').trigger('touchend');
                break;
            case 'Enter':
                break;
        }
    });

    $('#brake').addClass('enabled');
    $('#brake').on('touchstart mousedown', function (event) {
        event.preventDefault();
        if ($('#brake').hasClass('enabled')) {
            $('#brake').addClass('activated');
            player.PressBrake();
        }
    });
    $('#brake').on('touchend mouseup', function (event) {
        event.preventDefault();
        if ($('#brake').hasClass('enabled')) {
            $('#brake').removeClass('activated');
            player.ReleaseBrake();
        }
    });

    $('#acc').addClass('enabled');
    $('#acc').on('touchstart mousedown', function (event) {
        event.preventDefault();
        if ($('#acc').hasClass('enabled')) {
            $('#acc').addClass('activated');
            player.PressAccelerator();
        }
    });
    $('#acc').on('touchend mouseup', function (event) {
        event.preventDefault();
        if ($('#acc').hasClass('enabled')) {
            $('#acc').removeClass('activated');
            player.ReleaseAccelerator();
        }
    });
    $('#ok').on('tap click', function (event) {
        event.preventDefault();
        $('#messagebox').hide();
        $('#scorebox').hide();
        $('#review').hide();
        restart();
    });
    $('#restart').on('tap click', function (event) {
        event.preventDefault();
        $('#messagebox').hide();
        $('#scorebox').hide();
        $('#review').hide();
        restart();
    });
    $('#review').on('tap click', function (event) {
        event.preventDefault();
        if (!historyDrawn) {
            submit.drawHistory();
            historyDrawn = true;
        }
        $('#history').show();
    });
    $('#history').on('tap click', function (event) {
        event.preventDefault();
        $('#history').hide();
    });

    $('#intro-page').on('tap click', function (event) {
        event.preventDefault();
        $('#intro-page').hide(500, function () {
            $('#brake').removeClass('locked');
            $('#acc').removeClass('locked');
            submit.getBestScore();
            ChangePage('home-page');
            RunGame();
        });
    });

    $('#designbutton').on('tap click', function () {
        $('#design-page').show();
        initialize_design();
    });
    $('#resetbutton').on('tap click', function () {
        restart();
    });
    $('#designed').on('tap click', function () {
        $('#design-page').hide();
        $('#canvas_gear').empty();
        restart();
    });

    ChangePage('intro-page');
});
