/**
 * This module is responsible for making the AI learned data avaialble for use.
 */

// hardcoded solution, each point is good for 5 distance intervals on the scale of 0-910
const BEST_ACTION = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, -1, 0, 1, 0, 1, 0, 0, 0, 1, 0, -1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 0, 1, -1, -1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, -1, 0, -1, 0, 0, 0, -1, 0, 0, 0, 0, -1, -1, -1, -1, -1, -1, 0, -1, -1, -1, -1, 0, -1, 0, -1, -1, -1, -1, -1, -1, 0, -1, -1];
const BEST_EPISODE_NUMBER = 81

let actions = BEST_ACTION;

export class AI_Data {
    ACCELERATE = 1;
    BRAKE = -1;
    DO_NOTHING = 0;
    
    GetAction(distance) {
        // TODO: use distances array to find appropriate index.
        const ACTION_SCALE = maxdist / actions.length;
        if (distance < 0 || distance / ACTION_SCALE >= actions.length) {
            throw new Error("Bad distance!");
        }

        let action = actions[distance / ACTION_SCALE];

        if (action > this.ACCELERATE || action < this.BRAKE) {
            throw new Error("Corrupt imported data!");
        }

        return action;
    }

    LoadFromServer(episodeNumber = BEST_EPISODE_NUMBER) {
        // TODO: import JSON formatted data via GET request from the server.
    }
}

export default AI_Data;