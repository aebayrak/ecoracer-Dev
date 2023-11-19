import * as MiniMap from './game-landscape.js';
import * as submit from './submit.js';
import { world, Chipmunk2DWorld } from './game-physics.js';
import { Players, PlayerCredentials, ServerData } from './player.js';
import { GhostControl } from './ghost-control.js';

export const EcoRacerOptions = {
    SERVER: {
        USE_LOGIN: false,
        POST_RESULTS: false,
    },
    UI: {
        ALLOW_GEAR_DESIGN: false,
    },
    AI: {
        ALLOW_AI_PLAYER: true,
        FEEDBACK_GHOST_CAR: true,
        FEEDBACK_CHEVRON: true,
        /** Use null for best answer control, or episode number for less than optimal control */
        AI_CONTROL_EPISODE: null,
    },
};

/**
 * Function to perform login and update in-game user data.
 * Procedurally this:
 *  - takes credentials from the login screen
 *  - runs minimal checks on the value of user/password
 *  - attempts to login and pull saved user data from the server
 *  - updates in-game user data or displays an error
 * @param {string} username - if provided, the username to use, else username pulled from HTML form, or default value used.
 * @param {string} password - if provided, the password to use, else password pulled from HTML form, or default value used.
 */
function UserLogin(username, password) {
    let user = username;// || $('#username')[0].value || default_username; // only for development
    let pass = password;// || $('#password')[0].value || default_password;

    $.post('/getUser', { username: user, password: pass }, function (response) {
        if (response === '') {
            $('#message').html("User doesn't exist or password wrong.");
            setTimeout(function () { $('#message').html(''); }, 1500);
        } else {
            let data = Players.HUMAN.serverData;
            data.credentials = new PlayerCredentials(user, pass);
            data.id = response.id;
            data.name = response.name;
            data.bestScore = response.bestscore;

            let score = '--';
            if (data.bestScore > 0) {
                score = Math.round(1000 - (data.bestScore / 3600 / 1000 / max_batt) * 1000) / 10;
            }
            $('#myscore').html('Best Score: ' + score + '%');
        }
    })
    .fail(function(response){
        $('#message').html("Server error: " + response.statusText);
        setTimeout(function () { $('#message').html(''); }, 1500);
    });
}

/**
 * Simple replacement for the jQuery-mobile page selector.
 * Use this to toggle between top level 'pages' in the game.
 * This is limited to assume that 'pages' are being defined as <div> immediately under the <body> element.
 * @param {string} pageID - the HTML ID attribute of the <div> element we wish to switch to.
 */
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
let simulationTime, lastRenderTime;
const MAX_RENDER_FPS = 60;
const SIM_DT_MILLISEC = 1000 / 60; //ms
/**
 * This is the main game loop.
 * This is called by the Browser at the device's refresh rate FPS, if sufficient CPU time allows.
 * It leverages some of the advice from {@link https://gafferongames.com/post/fix_your_timestep/} regarding
 * the usage of a constant time step in the engine, while allowing for higher or lower FPS, to allow for more
 * consistent player experience regardless of their computers' CPU/GPU computation abilities.
 * 
 * The general flow of the game is to:
 *  - take in user/ai actions, applying them to the players
 *    - note: user actions are handled by keyboard/mouse/touch event handlers, not in this loop.
 *  - advance the physics engine if needed
 *  - determine the need to render (skipping above a max FPS)
 *  - perform rendering
 *  - request the next animation frame
 * 
 * @param {number} highResTimerMillisec - fractional millisecond time value from the browser.
*/
function GameLoop(highResTimerMillisec) {
    // apply AI player input
    GhostControl.DoAction();

    // handle ticking the simulation at a fixed interval
    if (simulationTime === undefined) {
        simulationTime = highResTimerMillisec;
    } else {
        while (simulationTime + SIM_DT_MILLISEC <= highResTimerMillisec) {
            // increment simulation by DT
            world.Update(SIM_DT_MILLISEC / 1000); // seconds
            simulationTime += SIM_DT_MILLISEC;
        }
    }

    // skip this frame ?
    let render_frame = true;
    if (lastRenderTime === undefined) {
        lastRenderTime = highResTimerMillisec;
    } else {
        render_frame = ((highResTimerMillisec - lastRenderTime) >= (1000 / MAX_RENDER_FPS));
    }

    // handle rendering
    if (render_frame) {
        lastRenderTime = highResTimerMillisec;
        world.Draw();
        MiniMap.Draw(highResTimerMillisec);
    }

    // look for termination conditions
    if (world.running) {
        requestAnimationFrame(GameLoop);
    }
}

/**
 * Entry point to reset/setup the game objects and begin the main game loop
 */
function RunGame() {
    MiniMap.Init('minimap', data);
    GhostControl.Reset();
    new Chipmunk2DWorld('game_world');
    world.Reset();
    world.Run();
    simulationTime = undefined;
    requestAnimationFrame(GameLoop);
}

/**
 * Callback function for the various reset/restart buttons in the UI.
 * It handles:
 *  - hiding and clearing any of the modal/popup/message elements that appear at game termination.
 *  - re-enables the ACC/BRAKE buttons.
 *  - posting user results for this iteration back to the server.
 *  - re-running the game.
 */
function restart() {
    $('#brake').addClass('enabled');
    $('#acc').addClass('enabled');
    $('#messagebox').hide();
    $('#scorebox').hide();
    $('#history').html('');
    submit.getBestScore();
    historyDrawn = false;
    // TODO: this existing code (user login) is really heavy handed for updating the 
    // UI with the current best score. The UI should be updated for current best score 
    // when the game ends, even before submitting results to server.
    if(EcoRacerOptions.SERVER.USE_LOGIN && EcoRacerOptions.SERVER.POST_RESULTS){
        let creds = Players.HUMAN.serverData.credentials;
        UserLogin(creds.username, creds.password);
    }
    RunGame();
}

// script to run at document.ready()
// primarily registers all event handlers and then activates the intro page.
$(function () {
    let player = Players.HUMAN;

    $('#register').on('tap click', function (event) {
        event.preventDefault();
        let user = $('#username')[0].value;
        let pass = $('#password')[0].value;
        if ((user != 'username') && (user != '') && (pass != 'password') && (pass != '')) {
            $.post(
                '/signup',
                {
                    username: user,
                    password: pass
                },
                function () {
                    // if signup succeeded, do an immediate login
                    UserLogin(user, pass);
                }
            )
            .fail(function(response){
                $('#message').html("Server error: " + response.statusText);
                setTimeout(function () { $('#message').html(''); }, 1500);
            });
        } else {
            $('#message').html('Username/password not allowed...');
            setTimeout(function () { $('#message').html(''); }, 1500);
        }
    });
    $('#login').on('tap click', function (event) {
        event.preventDefault();
        let user = $('#username')[0].value;
        let pass = $('#password')[0].value;
        if (user != 'username' && user != '') {
            UserLogin(user, pass);
        } else {
            $('#message').html('Username cannot be empty...');
            setTimeout(function () { $('#message').html(''); }, 1500);
        }
    });

    // make up/right trigger ACC. make down/left trigger BRAKE
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

    // make up/right trigger ACC. make down/left trigger BRAKE
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

    if (EcoRacerOptions.SERVER.USE_LOGIN) {
        ChangePage('reg-page');
    } else {
        ChangePage('intro-page');
    }
});
