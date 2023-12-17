/**
 * This module is a bin for things that are used in multiple modules and don't have a proper home.
 */

export const GLOBALS = {
    /** Maximum frames to render per second */
    MAX_RENDER_FPS: 60,
    /** Number of equally sized simulation steps in physics engine per second */
    SIMULATION_STEPS_PER_SECOND: 60,
    /** The track length, in meters. */
    MAX_DISTANCE: 909,
    /**
     * Elevation data points in % of maximum elevation. Range [0-100].
     * Each point is set equally distanced from each other and scaled to fit in the physics engine dimensions.
     */
    trackElevationData: [
        0, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 90, 90, 60, 30, 0, 0, 0, 0, 0, 5, 10, 20, 40, 60, 80, 90, 90, 90, 90, 70, 50, 30, 30, 30,
        30, 30, 10, 10, 10, 40, 70, 70, 70, 90, 90, 90, 70, 50, 30, 10, 0, 0, 0, 40, 80, 80, 80, 80, 70, 60, 50, 40, 30, 20, 10, 0, 0, 10,
        20, 30, 40, 50, 60, 70, 80, 80, 80, 70, 60, 50, 40, 40, 40, 60, 80, 80, 80, 60, 40, 20, 0, 0, 0, 0, 0
    ],
    /** multiply to convert from pixels to meters: 1 pixel == 1/20 meter */
    px2m: 1 / 20,
    /** multiply to convert from game mass to kg: 1 mass in game to 500 kg */
    m2m: 500,
    /** multiply to convert from time-step to  1 time step == 1/120 second */
    t2t: 1
};
