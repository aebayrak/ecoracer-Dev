/**
 * This module is responsible for making the AI learned data available for use.
 */

import { GLOBALS } from './globals.js';
import { Players } from './player.js';
import { GetWrapper } from './server.js';

// hardcoded solution, each point is good for 5 distance intervals on the scale of 9-910
const BEST_EPISODE_NUMBER = 81;
const BEST_ACTION = [
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1,
    0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, -1, 0, 1, 0, 1, 0, 0, 0, 1, 0, -1, 0, 1, 0, 0, 0, 0, 0, 0,
    1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 0, 1, -1, -1,
    0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, -1, 0, -1, 0, 0, 0, -1, 0, 0, 0, 0, -1, -1, -1, -1, -1, -1, 0, -1, -1, -1, -1, 0, -1, 0, -1, -1, -1,
    -1, -1, -1, 0, -1, -1
];
const BEST_DISTANCES = [];
let distance = 9;
BEST_ACTION.forEach((element) => {
    BEST_DISTANCES.push(distance);
    distance += 5;
});

// variables used for control decisions
let distances = [];
let actions = [];
let lastAction = undefined;

const ACCELERATE = 1;
const DO_NOTHING = 0;
const BRAKE = -1;

export const GhostControl = {
    /**
     * Call this at the conclusion of each race to prepare for the next race.
     */
    Reset: () => {
        lastAction = undefined;
    },

    /**
     * Use the AI actions dataset to control the AI/ghost car.
     * Based on the AI player's current position, an actions is determined from the dataset.
     * If the action differs from the previous invocation, it is applied to the AI player.
     */
    DoAction: () => {
        let distance = Players.AI.XPosition() * GLOBALS.px2m;

        let index = 0;
        while (index < distances.length && distances[index] < distance) {
            index++;
        }
        // adjust index
        if (index > 0) index--;

        let action = actions[index];

        if (lastAction !== action) {
            lastAction = action;
            switch (action) {
                case ACCELERATE:
                    // Players.AI.ReleaseBrake();
                    Players.AI.PressAccelerator();
                    break;
                case BRAKE:
                    // Players.AI.ReleaseAccelerator();
                    Players.AI.PressBrake();
                    break;
                case DO_NOTHING:
                    Players.AI.ReleaseBrake();
                    Players.AI.ReleaseAccelerator();
                    break;
                default:
                    throw Error('bad action');
            }
        }
    },

    /**
     * Request an AI episode's data to use for controlling the ghost vehicle.
     * @param {number} episodeNumber the episode number to use.
     */
    LoadFromServer: (episodeNumber = BEST_EPISODE_NUMBER) => {
        actions = BEST_ACTION;
        distances = BEST_DISTANCES;
        GhostControl.Reset();

        // import JSON formatted data via GET request from the server.
        GetWrapper('/ghost-control-data', {} /* possible optimization, have server just return data for 1 episode */, (data) => {
            console.log('got ', data.length, ' episodes from server, storing episode ', episodeNumber);
            actions = data[episodeNumber].actions;
            distances = data[episodeNumber].position;
        });
    }
};
