/**
 * This module contains all the code necessary to render a minimap of the track into
 * an HTML Canvas element.
 */

import { world, scene_widthx } from './game-physics.js';
import { EcoRacerOptions } from './main.js';

let ctx, canvas, elevationPoints, position;

/**
 * Render the minimap in the HTML Canvas provided to Init(). This includes
 * the track elevation, a marker for the finish flag, a marker for the player's
 * location, and if present, a marker for the AI player.
 */
export const Draw = function () {
    // update canvas only when the position changed sufficiently
    if (Math.round(position) !== Math.round(world.player.XPosition())) {
        // wipe canvas clean
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // don't draw to the edges of the canvas, use a virtual border
        const BORDER = 5;
        let MIN_X = BORDER,
            MAX_X = canvas.width - BORDER;
        let MIN_Y = BORDER,
            MAX_Y = canvas.height - BORDER;
        var x_scale = MAX_X - MIN_X;
        var y_scale = MAX_Y - MIN_Y;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';

        // draw track in black
        ctx.strokeStyle = 'black';
        ctx.beginPath();
        ctx.moveTo(MIN_X, MAX_Y);
        for (var i = 1; i < elevationPoints.length; i++) {
            let next_x = MIN_X + x_scale * (i / elevationPoints.length);
            let next_y = MAX_Y - y_scale * (elevationPoints[i] / 100);
            ctx.lineTo(next_x, next_y);
        }
        ctx.stroke();

        // red to show the finish line
        ctx.beginPath();
        ctx.strokeStyle = 'red';
        let x_pos = MIN_X + x_scale * (18100 / scene_widthx);
        ctx.moveTo(x_pos, MIN_Y);
        ctx.lineTo(x_pos, MAX_Y);
        ctx.stroke();

        // show the player position
        ctx.beginPath();
        position = world.player.XPosition();
        ctx.strokeStyle = world.player.carColor;
        x_pos = MIN_X + x_scale * (position / scene_widthx);
        ctx.moveTo(x_pos, MIN_Y);
        ctx.lineTo(x_pos, MAX_Y);
        ctx.stroke();

        if(EcoRacerOptions.AI.ALLOW_AI_PLAYER){
            // show the AI position
            ctx.beginPath();
            position = world.ai.XPosition();
            ctx.strokeStyle = world.ai.carColor;
            x_pos = MIN_X + x_scale * (position / scene_widthx);
            ctx.moveTo(x_pos, MIN_Y);
            ctx.lineTo(x_pos, MAX_Y);
            ctx.stroke();
        }
    }
};

/**
 * Prepare this module to render the landscape (minimap)
 * @param {string} selector the CSS selector of an HTML Canvas to use for rendering
 * @param {Array<number>} elevationData the dataset for elevation. values range from 0-100 and each point is equidistant.
 */
export const Init = function (selector, elevationData) {
    canvas = document.querySelector(selector);
    ctx = canvas.getContext('2d');
    // setup the canvas number of pixels to something large so it scales without much pixelation when CSS scaling is done.
    canvas.width = 2000;
    canvas.height = 100;

    elevationPoints = elevationData;
};
