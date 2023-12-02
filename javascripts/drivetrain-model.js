/**
 * This module encapsulates constants and functions needed to determine instantaneous drivetrain efficiency
 */

// Note: these arrays must all be of the same length, they are read/accessed using a single indexing variable.
const spdLookup = new Float64Array([0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000, 10500, 11000, 11500]);
const trqLookup = new Float64Array([200, 200, 200, 200, 200, 194, 186, 161, 142, 122, 103, 90, 77.5, 70, 63.5, 58, 52, 49, 45, 42, 40, 38, 36, 34]);
const motoreff = new Float64Array([0.2, 0.46, 0.65, 0.735, 0.794, 0.846, 0.886, 0.913, 0.922, 0.938, 0.946, 0.94, 0.93975, 0.943, 0.945, 0.945, 0.94, 0.9372, 0.9355, 0.9, 0.86, 0.81, 0.74, 0.65]);

/**
 * obtain the amount of engine torque at the current speed.
 * find the index from the speed array, then linearly interpolate the values in the torque array
 * @param {number} spd instantaneous speed
 * @returns {number} the maximum torque at this speed
 */
export function maxTrqlerp(spd) {
    /** @type {number} */
    let maxTrq = 0;
    if (spd > 0) {
        if (spd <= spdLookup[spdLookup.length - 1]) {
            for (var i = 0; i < (spdLookup.length - 1); i++) {
                if (spdLookup[i] <= spd && spdLookup[i + 1] > spd) {
                    maxTrq = (spd - spdLookup[i]) / 500 * (trqLookup[i + 1] - trqLookup[i]) + trqLookup[i];
                }
            }
        }
        // torque for speeds above values in lookup tables
        else {
            maxTrq = 20;
        }
    }
    // torque for speeds in reverse
    else {
        maxTrq = 200;
    }
    return maxTrq;
}

/**
 * obtain the instantaneous efficiency of the vehicle drivetrain.
 * find the index from the speed array, then linearly interpolate the values in the efficiency array
 * @param {number} spd instantaneous speed
 * @param {number} trq instantaneous torque
 * @returns {number} efficiency as a percentage value
*/
export function efflerp(spd, trq) {

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
    /** @type {number} the value to return */
    let efflerpp = 0.7;
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
