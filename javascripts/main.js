import * as MiniMap from './game-landscape.js';
import * as server from './server.js';
import { world, Chipmunk2DWorld } from './game-physics.js';
import { GhostControl } from './ghost-control.js';
import { Players } from './player.js';
import { initialize_design } from './design.js';
import { GLOBALS } from './globals.js';

export const EcoRacerOptions = {
    SERVER: {
        /**
         * @type {boolean} Changes the startup screen when loading the site.
         * true -> login/register page
         * false -> intro/instructions page
         */
        USE_LOGIN: true,
        /**
         * @type {boolean} Use canned server replies (for development and test)
         * true -> server requests are converted to hardcoded responses
         * false -> GET/POST requests are sent to the hosting server
         */
        USE_CANNED_RESPONSES: true
    },
    UI: {
        /**
         * enable the gear ratio design screen
         * @type {boolean}
         */
        ALLOW_GEAR_DESIGN: true
    },
    AI: {
        /**
         * @type {boolean} Run the game solo mode or with an AI player.
         * Turning this off makes the remaining AI options irrelevant.
         */
        ALLOW_AI_PLAYER: true,
        /** @type {boolean} enable to show ghost car on the raceway */
        FEEDBACK_GHOST_CAR: true,
        /** @type {boolean} enable to show chevrons as hint to speed up or slow down */
        FEEDBACK_CHEVRON: true,
        /** @type {undefined | number} Use undefiend for best answer control, or episode number for less than optimal control */
        AI_CONTROL_EPISODE: undefined
    }
};

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

/**
 * Function to render an end of game popup message box
 * @param {string} msg
 * @param {boolean} win
 */
function messagebox(msg, win = true) {
    ChangePage('popup-page');
    $('#messagebox').show();
    $('#textmessage').html(msg);
    $('#acc').removeClass('activated');
    $('#brake').removeClass('activated');
    $('#acc').removeClass('enabled');
    $('#brake').removeClass('enabled');
    $('#scorebox').show();
    $('#review').show();
    if (win) {
        $('#ok').show();
        $('#restart').hide();
    } else {
        $('#ok').hide();
        $('#restart').show();
    }
}

/****************************************** GAME **********************************************************/
let animationHandle = 0;
let simulationTime = 0;
let lastRenderTime = 0;
let historyDrawn = false;
const SIM_DT_MILLISEC = 1000 / GLOBALS.SIMULATION_STEPS_PER_SECOND; //ms
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
    if (EcoRacerOptions.AI.ALLOW_AI_PLAYER) {
        // apply AI player input
        GhostControl.DoAction();
    }

    // handle ticking the simulation at a fixed interval
    if (simulationTime === undefined || simulationTime === 0) {
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
    if (lastRenderTime === undefined || lastRenderTime === 0) {
        lastRenderTime = highResTimerMillisec;
    } else {
        render_frame = highResTimerMillisec - lastRenderTime >= 1000 / GLOBALS.MAX_RENDER_FPS;
    }

    // handle rendering
    if (render_frame) {
        lastRenderTime = highResTimerMillisec;
        world.Draw();
        MiniMap.Draw(highResTimerMillisec);
    }

    // look for termination conditions
    if (world.running) {
        animationHandle = requestAnimationFrame(GameLoop);
    } else {
        if (world.playerFinished) {
            messagebox(world.message, true);
            server.submitResult(true, Players.HUMAN);
        } else {
            messagebox(world.message, false);
            server.submitResult(false, Players.HUMAN);
        }
    }
}

/**
 * Entry point to reset/setup the game objects and begin the main game loop
 */
function RunGame() {
    MiniMap.Init('#minimap', GLOBALS.trackElevationData);
    if (EcoRacerOptions.AI.ALLOW_AI_PLAYER) {
        GhostControl.LoadFromServer(EcoRacerOptions.AI.AI_CONTROL_EPISODE);
    }
    new Chipmunk2DWorld('game_world');
    world.Reset();
    world.Run();
    simulationTime = undefined;
    ChangePage('home-page');
    animationHandle = requestAnimationFrame(GameLoop);
}

function FreezeGame() {
    cancelAnimationFrame(animationHandle);
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
    server.getBestScore();
    historyDrawn = false;
    // TODO: this existing code (user login) is really heavy handed for updating the
    // UI with the current best score. The UI should be updated for current best score
    // when the game ends, even before submitting results to server.
    if (EcoRacerOptions.SERVER.USE_LOGIN) {
        let creds = Players.HUMAN.serverData.credentials;
        server.UserLogin(creds.username, creds.password);
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
        if (user != 'username' && user != '' && pass != 'password' && pass != '') {
            server.Signup(user, pass, () => {
                ChangePage('intro-page');
            });
        } else {
            $('#message').html('Username/password not allowed...');
            setTimeout(function () {
                $('#message').html('');
            }, 1500);
        }
    });
    $('#login').on('tap click', function (event) {
        event.preventDefault();
        let user = $('#username')[0].value;
        let pass = $('#password')[0].value;
        if (user != 'username' && user != '') {
            server.UserLogin(user, pass, () => {
                ChangePage('intro-page');
            });
        } else {
            $('#message').html('Username cannot be empty...');
            setTimeout(function () {
                $('#message').html('');
            }, 1500);
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
            server.drawHistory();
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
            server.getBestScore();
            RunGame();
        });
    });

    $('#designbutton').on('tap click', function () {
        if (EcoRacerOptions.UI.ALLOW_GEAR_DESIGN) {
            FreezeGame();
            ChangePage('design-page');
            initialize_design();
        }
    });
    $('#resetbutton').on('tap click', function () {
        restart();
    });
    $('#designed').on('tap click', function () {
        $('#canvas_gear').empty();
        restart();
    });

    if (EcoRacerOptions.UI.ALLOW_GEAR_DESIGN) {
        $('#designbutton').show();
    } else {
        $('#designbutton').hide();
    }

    if (EcoRacerOptions.SERVER.USE_LOGIN) {
        ChangePage('reg-page');
    } else {
        ChangePage('intro-page');
    }
});
