/**
 * This module contains all communication code between the client and server.
 */

import { GLOBALS } from './globals.js';
import { Players, Player, PlayerCredentials } from './player.js';
import { gear_ratio } from './design.js';
import { Battery } from './drivetrain-model.js';
import { EcoRacerOptions } from './main.js';

/** variable holds the total number of registered users that play this game */
let total_num_user = 1;
/**
 * A class to represent the JSON object used to pass data back to the server
 */
const userData = {
    id: '',
    acc_keys: [],
    brake_keys: []
};
/** the list of all the scores (battery consumption) returned by the server in order of player ranking best to worst */
let scores = [];
/** this list of all the gear final ratio (FR) values return by the server, in order of player ranking best to worst */
let frall = [];

/**
 * This is a default error handler for GET/POST requests where the server responds with a failure code.
 * @param {jqXHR} response
 */
function defaultOnFailure(response) {
    // log it to the console.
    console.log(response);
    // assume current visible page has 'message' element and display the error for a brief time.
    $('#message').html('Server error: ' + response.statusText);
    setTimeout(function () {
        $('#message').html('');
    }, 1500);
}

/**
 * All POST requests made in this file should be passed through this wrapper function to allow a global
 * method of returning canned responses when an actual server is not available.
 * @param {string} url the URL to POST to
 * @param {object} data the contents of the POST request (any object really)
 * @param {function(object)} onSuccess a function to call on POST success, the argument is the content
 *                                     of the response
 * @param {function(jqXHR)} onFailure a function to call on POST failure, the argument is the jQuery
 *                                    object containing data related to the request and its result
 */
export function PostWrapper(url, data, onSuccess, onFailure = defaultOnFailure) {
    if (EcoRacerOptions.SERVER.USE_CANNED_RESPONSES) {
        // change URL to have the server return a constant JSON file
        $.get('/javascripts/server' + url + '.json', data, (result) => {
            console.log('using canned json reply to POST ', url, ': ', result);
            if (onSuccess) onSuccess(result);
        }).fail(onFailure);
    } else {
        $.post(url, data, onSuccess).fail(onFailure);
    }
}

/**
 * All GET requests made in this file should be passed through this wrapper function to allow a global
 * method of returning canned responses when an actual server is not available.
 * @param {string} url the URL to GET from
 * @param {object} data the contents of the GET request, converted to URI variables
 * @param {function(object)} onSuccess a function to call on GET success, the argument is the content
 *                                     of the response
 * @param {function(jqXHR)} onFailure a function to call on GET failure, the argument is the jQuery
 *                                    object containing data related to the request and its result
 */
export function GetWrapper(url, data, onSuccess, onFailure = defaultOnFailure) {
    if (EcoRacerOptions.SERVER.USE_CANNED_RESPONSES) {
        // change URL to have the server return a constant JSON file
        $.get('javascripts/server' + url + '.json', data, (result) => {
            console.log('using canned json reply to GET ', url, ': ', result);
            if (onSuccess) onSuccess(result);
        }).fail(onFailure);
    } else {
        $.get(url, data, onSuccess).fail(onFailure);
    }
}

/**
 * Attempt to sign up with the server using the provided credentials.
 * @param {string} user the username to register with
 * @param {string} pass the password to register with
 * @param {function()} callback some code to invoke if the signup is successful
 */
export function Signup(user, pass, callback) {
    PostWrapper(
        '/signup',
        {
            username: user,
            password: pass
        },
        function () {
            // if signup succeeded, do an immediate login
            UserLogin(user, pass, callback);
        }
    );
}

/**
 * Function to perform login and update in-game user data.
 * Procedurally this:
 *  - attempts to login and pull saved user data from the server
 *  - updates in-game user data or displays an error
 * @param {string} username - if provided, the username to use, else username pulled from HTML form, or default value used.
 * @param {string} password - if provided, the password to use, else password pulled from HTML form, or default value used.
 * @param {function()} callback - a function to call when the login attempt succeeds.
 */
export function UserLogin(username, password, callback) {
    let user = username;
    let pass = password;

    PostWrapper('/getUser', { username: user, password: pass }, function (response) {
        if (response === '') {
            $('#message').html("User doesn't exist or password wrong.");
            setTimeout(function () {
                $('#message').html('');
            }, 1500);
        } else {
            let data = Players.HUMAN.serverData;
            data.credentials = new PlayerCredentials(user, pass);
            data.id = response.id;
            data.name = response.name;
            data.bestScore = response.bestscore;

            let score = '--';
            if (data.bestScore > 0) {
                score = Battery.Consumption2Percentage(data.bestScore, 1);
            }
            $('#myscore').html('Best Score: ' + score + '%');
            if (callback) callback();
        }
    });
}

/**
 * Update list of top scores and post player data to the server
 * @param {boolean} successful if the player finished the track in time with some battery to spare
 * @param {Player} player the player object containing all the logged keys and data points
 */
export function submitResult(successful, player) {
    var ranking_percentage = 0;
    var ranking_scoreboard = -1;
    userData.id = player.serverData.credentials.username;
    userData.acc_keys = player.localData.acc_keys;
    userData.brake_keys = player.localData.brake_keys;
    if (successful) {
        // successful
        let c = Math.round(player.localData.consumption);
        PostWrapper('/getscore', { score: c }, function (data) {
            ranking_percentage = Math.round((parseInt(data[0].count) / total_num_user) * 100) || 0;
            $('#textmessage').html(
                'You saved ' + Battery.Consumption2Percentage(c) + " % of energy, that's better than " + ranking_percentage + '% of plays!'
            );
            // show top 5 scores
            $('#scorebox').empty();
            $('#scorebox').append('TOP SCORES');
            var count = 1;
            var addedyou = false;
            if (typeof scores !== 'undefined') {
                for (var i = 0; i < Math.min(5, scores.length); i++) {
                    if (count <= 5) {
                        if (scores[i] < c || addedyou) {
                            $('#scorebox').append(
                                "<div class='score'>" +
                                    count +
                                    '. ' +
                                    Battery.Consumption2Percentage(scores[i], 1) +
                                    '%, FR=' +
                                    frall[i] +
                                    '<div>'
                            );
                        } else {
                            $('#scorebox').append(
                                "<div class='score'>" +
                                    count +
                                    '. ' +
                                    Battery.Consumption2Percentage(c, 1) +
                                    '% (YOU), FR=' +
                                    gear_ratio +
                                    '<div>'
                            );
                            ranking_scoreboard = count;
                            addedyou = true;
                        }
                        count += 1;
                    }
                }
                if (scores.length < 5 && !addedyou) {
                    $('#scorebox').append(
                        "<div class='score'>" +
                            (scores.length + 1) +
                            '. ' +
                            Battery.Consumption2Percentage(c, 1) +
                            '% (YOU), FR=' +
                            gear_ratio +
                            '<div>'
                    );
                }
            }

            // post results
            PostWrapper('/adddata', {
                userid: userData.id,
                score: c,
                keys: JSON.stringify({
                    acc: userData.acc_keys,
                    brake: userData.brake_keys
                }),
                finaldrive: gear_ratio,
                ranking_percentage: ranking_percentage,
                ranking_scoreboard: ranking_scoreboard
            });
        });
    } else {
        // failed
        let c = -1;
        // show top 5 scores
        $('#scorebox').empty();
        $('#scorebox').append('TOP SCORES');
        if (typeof scores !== 'undefined') {
            for (var i = 0; i < Math.min(5, scores.length); i++) {
                $('#scorebox').append(
                    "<div class='score'>" + (i + 1) + '. ' + Battery.Consumption2Percentage(scores[i], 1) + '%, FR=' + frall[i] + '<div>'
                );
            }
        }
        // post results
        PostWrapper('/adddata', {
            userid: userData.id,
            score: c,
            keys: JSON.stringify({
                acc: userData.acc_keys,
                brake: userData.brake_keys
            }),
            finaldrive: gear_ratio,
            ranking_percentage: ranking_percentage,
            ranking_scoreboard: ranking_scoreboard
        });
    }
}

/**
 * Request the top player results from the server.
 * Internally to this module, this updates these datapoints:
 * - total number of players registered
 * - consumption scores for the top players
 * - the FR value used for the top players
 */
export function getBestScore() {
    GetWrapper('/bestscore', {}, function (data) {
        scores = data.bestscore;
        frall = data.finaldrive;
        total_num_user = parseInt(data.total_num_user);
    });
}

/**
 * This legacy code is not currently tied into the game.
 */
function getResults() {
    var d, i;
    $.post('/getresults', { n: 10 }, function (data) {
        userData = data;

        // plot individual plays
        for (i = 0; i < data.length; i++) {
            d = data[i];
            $('#results').append('<div class=data id=data' + i + '></div>');
            plot(d, i);
        }
    });
}

/**
 * This legacy code is not currently tied into the game.
 */
function getAllPerformance() {
    var d, i;
    $.post('/getperformance', { n: 2408 }, function (data) {
        userData = data;

        // plot individual convergence
        var p = [];
        var best_p = [];
        var score = 0;
        for (i = 0; i < data.length; i++) {
            d = data[i];
            if (d.score < 0) {
                score = 0;
            } else {
                score = Battery.Consumption2Percentage(d.score, 1);
            }
            if (typeof best_p[d.userid] != 'undefined') {
                if (score > best_p[d.userid]) {
                    best_p[d.userid] = score;
                    p[d.userid].push(score);
                } else {
                    p[d.userid].push(best_p[d.userid]);
                }
            } else {
                best_p[d.userid] = score;
                p[d.userid] = [];
                p[d.userid].push(score);
            }
        }
        plot_convergence(p);
    });
}

/**
 * This legacy code is not currently tied into the game.
 */
$('.data').on('tap', function () {
    var id = parseInt($(this).id.slice(4));
    //	simulate(userData[id]);
});

/**
 * This legacy code is not currently tied into the game.
 */
// plot user control strategy and consumption
function plot(d, i) {
    var padding = 20; //px
    var svg_length = $('#data' + i).width(); //px
    var svg_height = $('#data' + i).height(); //px

    var j;
    var data = $.parseJSON(d.keys);
    var acc = data.acc;
    var brake = data.brake;

    // fix double click issue
    if (acc[1] == acc[0]) {
        //data corrupted by double clicks
        acc_copy = [];
        brake_copy = [];
        for (j = 0; j < acc.length; j++) {
            if ((j + 2) % 2 == 0) {
                acc_copy.push(acc[j]);
            }
        }
        for (j = 0; j < brake.length; j++) {
            if ((j + 2) % 2 == 0) {
                brake_copy.push(brake[j]);
            }
        }
        acc = acc_copy;
        brake = brake_copy;
    }

    var total_distance = GLOBALS.MAX_DISTANCE / GLOBALS.px2m;
    var accData = [];
    for (j = 0; j < Math.floor(acc.length / 2); j++) {
        accData.push({ x: acc[2 * j], y: 0 });
        accData.push({ x: acc[2 * j], y: 1 });
        accData.push({ x: acc[2 * j + 1], y: 1 });
        accData.push({ x: acc[2 * j + 1], y: 0 });
    }
    if (acc.length % 2 != 0) {
        // one extra acc
        accData.push({ x: acc[acc.length - 1], y: 0 });
        accData.push({ x: acc[acc.length - 1], y: 1 });
        accData.push({ x: total_distance, y: 1 });
        accData.push({ x: total_distance, y: 0 });
    }

    var brakeData = [];
    for (j = 0; j < Math.floor(brake.length / 2); j++) {
        brakeData.push({ x: brake[2 * j], y: 0 });
        brakeData.push({ x: brake[2 * j], y: 1 });
        brakeData.push({ x: brake[2 * j + 1], y: 1 });
        brakeData.push({ x: brake[2 * j + 1], y: 0 });
    }
    if (brake.length % 2 != 0) {
        // one extra brake
        brakeData.push({ x: brake[brake.length - 1], y: 0 });
        brakeData.push({ x: brake[brake.length - 1], y: 1 });
        brakeData.push({ x: total_distance, y: 1 });
        brakeData.push({ x: total_distance, y: 0 });
    }

    var lineFunction = d3.svg
        .line()
        .x(function (d) {
            return (d.x / total_distance) * (svg_length - padding * 2) + padding;
        })
        .y(function (d) {
            return (1 - d.y) * (svg_height - padding * 2) + padding;
        })
        .interpolate('linear');
    var xScale = d3.scale
        .linear()
        .domain([0, total_distance])
        .range([padding, svg_length - padding]);
    var yScale = d3.scale
        .linear()
        .domain([0, 1])
        .range([padding, svg_height - padding]);
    var xAxis = d3.svg.axis().scale(xScale).orient('bottom').ticks(5);
    var yAxis = d3.svg.axis().scale(yScale).orient('left').ticks(2);
    var svgContainer = d3
        .select('#data' + i)
        .append('svg')
        .attr('width', svg_length)
        .attr('height', svg_height);
    svgContainer.append('path').attr('d', lineFunction(accData)).attr('stroke', 'blue').attr('stroke-width', 2).attr('fill', 'none');
    svgContainer.append('path').attr('d', lineFunction(brakeData)).attr('stroke', 'red').attr('stroke-width', 2).attr('fill', 'none');
    svgContainer
        .append('g')
        .attr('transform', 'translate(0,' + (svg_height - padding) + ')')
        .attr('class', 'x axis')
        .call(xAxis);
    svgContainer
        .append('text')
        .attr('x', svg_length / 2 - padding)
        .attr('y', padding / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .text(Battery.Consumption2Percentage(d.score, 1) + ' from user: ' + d.userid + ' with finaldrive: ' + d.finaldrive);
}

/**
 * This legacy code is not currently tied into the game.
 */
function plot_convergence(p) {
    var padding = 20; //px
    var svg_length = $('#convergence').width(); //px
    var svg_height = $('#convergence').height(); //px
    var max_play = 500; // maximum number of plays
    var upper_bound = 45;
    var optimal_score = 43.8;

    var data = [];
    for (var i = 0; i < p.length; i++) {
        if (typeof p[i] != 'undefined') {
            data[i] = [];
            for (j = 0; j < p[i].length; j++) {
                data[i].push({ x: j + 1, y: p[i][j] });
            }
        }
    }
    data[data.length] = [];
    data[data.length - 1].push({ x: 1, y: optimal_score });
    data[data.length - 1].push({ x: max_play, y: optimal_score });

    var lineFunction = d3.svg
        .line()
        .x(function (d) {
            return (d.x / max_play) * (svg_length - padding * 2) + padding;
        })
        .y(function (d) {
            return (1 - d.y / upper_bound) * (svg_height - padding * 2) + padding;
        })
        .interpolate('linear');
    var xScale = d3.scale
        .linear()
        .domain([0, max_play])
        .range([padding, svg_length - padding]);
    var yScale = d3.scale
        .linear()
        .domain([0, 1])
        .range([svg_height - padding, padding]);

    var xAxis = d3.svg.axis().scale(xScale).orient('bottom').ticks(50);
    var yAxis = d3.svg.axis().scale(yScale).orient('left').ticks(10);

    var svgContainer = d3.select('#convergence').append('svg').attr('width', svg_length).attr('height', svg_height);

    // plot user performance
    var color = d3.scale.category20();
    for (var i = 0; i < data.length - 1; i++) {
        if (typeof data[i] != 'undefined') {
            svgContainer
                .append('path')
                .attr('d', lineFunction(data[i]))
                .attr('stroke', color(i))
                .attr('stroke-width', 2)
                .attr('fill', 'none');
        }
    }
    // plot optimal score
    svgContainer
        .append('path')
        .attr('d', lineFunction(data[i]))
        .attr('stroke', 'black')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '3, 3')
        .attr('fill', 'none');

    svgContainer
        .append('g')
        .attr('transform', 'translate(0,' + (svg_height - padding) + ')')
        .attr('class', 'x axis')
        .style('font-size', '6px')
        .call(xAxis);
    svgContainer
        .append('g')
        .attr('transform', 'translate(' + padding + ',0)')
        .attr('class', 'y axis')
        .style('font-size', '6px')
        .call(yAxis);

    svgContainer
        .append('text')
        .attr('x', svg_length / 2 - padding)
        .attr('y', padding / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .text('Performance of All Players');
}

/**
 * This function renders the player's efficiency and speed against the distance covered.
 */
export function drawHistory() {
    //	var save_x = [0,5,10,15,20,25,30];
    //	var save_v = [2,4,5,6,7,8,10];
    //	var save_eff = [0,9,0.9,0.8,0.7,0.8,0.9,0.9];
    var padding = 50; //px
    var svg_length = $('#history').width(); //px
    var svg_height = $('#history').height(); //px

    var j;

    var total_distance = 909; // 909*20 *** change this to an equation
    var speedData = [];
    var effData = [];
    let playerData = Players.HUMAN.localData;
    for (j = 0; j < playerData.save_v.length; j++) {
        speedData.push({ x: playerData.save_x[j], y: playerData.save_v[j] });
        effData.push({ x: playerData.save_x[j], y: playerData.save_eff[j] });
    }
    var max_speed = 100;
    var max_eff = 100;

    var speedLineFunction = d3.svg
        .line()
        .x(function (d) {
            return (d.x / total_distance) * (svg_length - padding * 2) + padding;
        })
        .y(function (d) {
            return (1 - d.y / max_speed) * (svg_height - padding * 2) + padding;
        })
        .interpolate('linear');
    var effLineFunction = d3.svg
        .line()
        .x(function (d) {
            return (d.x / total_distance) * (svg_length - padding * 2) + padding;
        })
        .y(function (d) {
            return (1 - d.y / max_eff) * (svg_height - padding * 2) + padding;
        })
        .interpolate('linear');

    var xScale = d3.scale
        .linear()
        .domain([0, total_distance])
        .range([padding, svg_length - padding]);
    var yScaleEff = d3.scale
        .linear()
        .domain([0, max_eff])
        .range([svg_height - padding, padding]);
    var yScaleSpeed = d3.scale
        .linear()
        .domain([0, max_speed])
        .range([svg_height - padding, padding]);
    var xAxis = d3.svg.axis().scale(xScale).orient('bottom').ticks(10);
    var yAxisSpeed = d3.svg.axis().scale(yScaleSpeed).orient('left').ticks(10);
    var yAxisEff = d3.svg.axis().scale(yScaleEff).orient('right').ticks(10);
    var svgContainer = d3.select('#history').append('svg').attr('width', svg_length).attr('height', svg_height);
    svgContainer.append('path').attr('d', speedLineFunction(speedData)).attr('stroke', 'blue').attr('stroke-width', 2).attr('fill', 'none');
    svgContainer.append('path').attr('d', effLineFunction(effData)).attr('stroke', 'red').attr('stroke-width', 2).attr('fill', 'none');
    svgContainer
        .append('g')
        .attr('transform', 'translate(0,' + (svg_height - padding) + ')')
        .attr('class', 'x axis')
        .call(xAxis);
    svgContainer
        .append('g')
        .attr('transform', 'translate(' + padding + ',0)')
        .attr('class', 'y axis')
        .style('fill', 'blue')
        .call(yAxisSpeed);
    svgContainer
        .append('g')
        .attr('transform', 'translate(' + (svg_length - padding) + ',0)')
        .attr('class', 'y axis')
        .style('fill', 'red')
        .call(yAxisEff);
    svgContainer
        .append('text')
        .attr('x', svg_length / 2 - padding)
        .attr('y', svg_height - 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '4vmin')
        .text('Distance (meter)');
    svgContainer
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', padding / 2 - 10)
        .attr('x', -svg_height / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '4vmin')
        .text('Speed (mph)');
    svgContainer
        .append('text')
        .attr('transform', 'rotate(90)')
        .attr('y', -svg_length + padding / 2 - 10)
        .attr('x', svg_height / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '4vmin')
        .text('Efficiency (%)');
    svgContainer
        .append('text')
        .attr('x', svg_length / 2 - padding)
        .attr('y', padding / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '5vmin')
        .text('Driving statistics');
}
