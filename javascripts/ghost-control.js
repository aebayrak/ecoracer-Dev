/**
 * This module is responsible for making the AI learned data available for use.
 */

import { Players } from './player.js';

// hardcoded solution, each point is good for 5 distance intervals on the scale of 0-910
const BEST_ACTION = [
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1,
    0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, -1, 0, 1, 0, 1, 0, 0, 0, 1, 0, -1, 0, 1, 0, 0, 0, 0, 0, 0,
    1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 0, 1, -1, -1,
    0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, -1, 0, -1, 0, 0, 0, -1, 0, 0, 0, 0, -1, -1, -1, -1, -1, -1, 0, -1, -1, -1, -1, 0, -1, 0, -1, -1, -1,
    -1, -1, -1, 0, -1, -1
];
const BEST_EPISODE_NUMBER = 81;

let actions = BEST_ACTION;

const ACCELERATE = 1;
const DO_NOTHING = 0;
const BRAKE = -1;

let lastAction;

export const GhostControl = {
    Reset: () => {
        lastAction = undefined;
    },

    DoAction: () => {
        let distance = Players.AI.XPosition() * px2m;

        // TODO: use distances array to find appropriate index.
        // const ACTION_SCALE = MAX_DISTANCE / actions.length;
        const ACTION_SCALE = 5;
        if (distance < 0 || distance / ACTION_SCALE >= actions.length) {
            throw new Error('Bad distance!');
        }

        let action = actions[Math.floor(distance / ACTION_SCALE)];

        if (lastAction != action) {
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

    LoadFromServer: (episodeNumber = BEST_EPISODE_NUMBER) => {
        console.log('loading episode ', episodeNumber);
        // TODO: import JSON formatted data via GET request from the server.
        actions = BEST_ACTION;
        this.Reset();
    }
};
