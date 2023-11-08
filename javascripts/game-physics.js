
// Color
const randColor = function () {
    return Math.floor(Math.random() * 256);
};

// Shape styles to pick from
let styles = [];
for (var i = 0; i < 100; i++) {
    styles.push("rgb(" + randColor() + ", " + randColor() + ", " + randColor() + ")");
}

export class Scene {
    constructor(canvas_id, width, height) {
        // Core components
        this.space = new cp.Space();
        this.canvas = document.getElementById(canvas_id);
        this.ctx = this.canvas.getContext('2d');

        // Resize
        this.canvas.width = this.width = width;
        this.canvas.height = this.height = height;
        this.scale = 1.0;
        this.resized = true;

        this.space.iterations = 10;
        this.space.gravity = cp.v(0, -400);
        this.space.sleepTimeThreshold = 100;

        this.addFloor(data, scene_widthx, xstep);
        this.addTerminal(scene_widthx - 3 * xstep);

        let posA = cp.v(50, 0);
        let posB = cp.v(110, 0);
        this.boxOffset = cp.v(100, 10);

        this.chassis = this.addChassis(cp.v(80, 10));
        let motorbar1 = this.motorbar1 = this.addBar(posA);
        let motorbar2 = this.motorbar2 = this.addBar(posB);
        let motorbar3 = this.motorbar3 = this.addBar(posA);
        let motorbar4 = this.motorbar4 = this.addBar(posB);
        this.wheel1 = this.addWheel(posA);
        this.wheel2 = this.addWheel(posB);

        let joint1 = new cp.GrooveJoint(
            this.chassis,
            this.wheel1,
            cp.v(-30, -10),
            cp.v(-30, -20),
            cp.v(0, 0),
        );

        let joint2 = new cp.GrooveJoint(
            this.chassis,
            this.wheel2,
            cp.v(30, -10),
            cp.v(30, -20),
            cp.v(0, 0),
        );

        this.space.addConstraint(joint1);
        this.space.addConstraint(joint2);
        this.space.addConstraint(
            new cp.DampedSpring(this.chassis, this.wheel1, cp.v(-30, 0), cp.v(0, 0), 20, 10, 5),
        ); // stiffness f/dx, damping f/v
        this.space.addConstraint(
            new cp.DampedSpring(this.chassis, this.wheel2, cp.v(30, 0), cp.v(0, 0), 20, 10, 5),
        );
        this.space.addConstraint(new cp.PivotJoint(motorbar1, this.wheel1, this.POS(posA)));
        this.space.addConstraint(new cp.PivotJoint(motorbar2, this.wheel2, this.POS(posB)));
        this.space.addConstraint(new cp.PivotJoint(motorbar3, this.wheel1, this.POS(posA)));
        this.space.addConstraint(new cp.PivotJoint(motorbar4, this.wheel2, this.POS(posB)));

        this.motor1 = new cp.SimpleMotor(motorbar1, this.wheel1, 0);
        this.motor2 = new cp.SimpleMotor(motorbar2, this.wheel2, 0);
        this.space.addConstraint(this.motor1);
        this.space.addConstraint(this.motor2);

        // parameters
        this.max_rate1 = 1e7; // motor 1 rate
        this.max_rate2 = 1e7; // motor 2 rate
        this.acc_rate = 1e7; // instant rate increment
        this.w_limit_rate = 1;

        this.Jw1 = this.wheel1.i;
        this.Jw2 = this.wheel2.i;

        this.wheel1moment = 1e10;
        this.wheel2moment = 1e10;

        this.wheel1.setMoment(this.wheel1moment);
        this.wheel2.setMoment(this.wheel2moment);

        // limits
        let speed_limit = ((9200 * pi) / 30 / fr) * this.wheel1.shapeList[0].r * t2t; // Max motor speed is 9000 but 9200 gives better results.
        this.wheel1.v_limit = speed_limit;
        this.wheel1.v_limit = speed_limit;
        this.wheel1.w_limit = (speed_limit / this.wheel1.shapeList[0].r) * 1.5; // This 1.5 has to be here! (experimental)
        this.wheel2.w_limit = (speed_limit / this.wheel1.shapeList[0].r) * 1.5; // (experimental)
        motorbar1.w_limit = this.wheel1.w_limit;
        motorbar2.w_limit = this.wheel2.w_limit;

        // **** Draw methods for Shapes
        cp.PolyShape.prototype.draw = function (ctx, scale, point2canvas) {
            ctx.beginPath();

            var verts = this.tVerts;
            var len = verts.length;
            var lastPoint = point2canvas(new cp.Vect(verts[len - 2], verts[len - 1]));
            ctx.moveTo(lastPoint.x - DISPLACEMENT, lastPoint.y);

            for (var i = 0; i < len; i += 2) {
                var p = point2canvas(new cp.Vect(verts[i], verts[i + 1]));
                ctx.lineTo(p.x - DISPLACEMENT, p.y);
            }

            if (this.flag) {
                ctx.fillStyle = "rgba(255,255,255, 0.1)";
                ctx.strokeStyle = "rgba(0,0,0, 0.2)";
            }
            else {
                // car shape
                // 		ctx.lineWidth = 5;
                ctx.fillStyle = '#222222'; // max changed the color to fit the other elements
                // 		ctx.strokeStyle = '#f9f9f9';
            }
            ctx.fill();
            ctx.stroke();
        };

        cp.SegmentShape.prototype.draw = function (ctx, scale, point2canvas) {
            var oldLineWidth = ctx.lineWidth;
            //ctx.lineWidth = Math.max(1, this.r * scale * 2);
            ctx.lineWidth = 10;
            var a = this.ta;
            var b = this.tb;
            a = point2canvas(a);
            b = point2canvas(b);
            if (this.flag) {
                ctx.lineWidth = 10;
                ctx.strokeStyle = "rgba(255,0,0, 0.2)";
            }
            else {
                ctx.strokeStyle = "rgba(0,0,0, 1)";
            }
            ctx.beginPath();
            ctx.moveTo(a.x - DISPLACEMENT, a.y);
            ctx.lineTo(b.x - DISPLACEMENT, b.y);
            ctx.stroke();

            ctx.lineWidth = oldLineWidth;
        };

        cp.CircleShape.prototype.draw = function (ctx, scale, point2canvas) {
            var c = point2canvas(this.tc);
            ctx.beginPath();
            ctx.arc(c.x - DISPLACEMENT, c.y, scale * this.r, 0, 2 * Math.PI, false);
            if (this.flag && this.sensor) {
                ctx.fillStyle = "rgba(0,0,0, 0.2)";
                ctx.strokeStyle = "rgba(0,0,0,0)";
            }
            else if (this.sensor) {
                ctx.fillStyle = "rgba(0,0,0, 1)";
                ctx.strokeStyle = "rgba(0,0,0, 0)";
            }
            else {
                ctx.fillStyle = "rgba(0,0,0, 1)";
                ctx.lineWidth = 5;
                ctx.strokeStyle = '#e9e9e9';
            }
            ctx.fill();
            ctx.stroke();


            // And draw a little radian so you can see the circle roll.
            let a = point2canvas(this.tc);
            let b = point2canvas(cp.v.mult(this.body.rot, this.r).add(this.tc));
            ctx.beginPath();
            ctx.moveTo(a.x - DISPLACEMENT, a.y);
            ctx.lineTo(b.x - DISPLACEMENT, b.y);
            ctx.stroke();
        };

        cp.GrooveJoint.prototype.draw = function (ctx, scale, point2canvas) {
            // 	var a = this.a.local2World(this.grv_a);
            // 	var b = this.a.local2World(this.grv_b);
            // 	var c = this.b.local2World(this.anchr2);
            //
            // 	ctx.strokeStyle = "grey";
            // 	//drawLine(ctx, point2canvas, a, b);
            // 	drawCircle(ctx, scale, point2canvas, c, 3);
        };

        cp.DampedSpring.prototype.draw = function (ctx, scale, point2canvas) {
            // 	var a = this.a.local2World(this.anchr1);
            // 	var b = this.b.local2World(this.anchr2);
            //
            // 	ctx.strokeStyle = "grey";
            // 	drawSpring(ctx, scale, point2canvas, a, b);
        };

        cp.Shape.prototype.style = function () {
            if (this.sensor) {
                return "rgba(255,255,255,0)";
            } else {
                let body = this.body;
                if (body.isSleeping()) {
                    return "rgb(50,50,50)";
                } else if (body.nodeIdleTime > this.space.sleepTimeThreshold) {
                    return "rgb(170,170,170)";
                } else {
                    return styles[this.hashid % styles.length];
                }
            }
        };

    };

    POS = (pos) => {
        return cp.v.add(this.boxOffset, pos);
    };

    addBar = (pos) => {
        let mass = 1 / m2m; // 1kg
        let a = cp.v(0, 10);
        let b = cp.v(0, -10);

        let body = this.space.addBody(
            new cp.Body(mass, cp.momentForSegment(mass, a, b)),
        );
        body.setPos(cp.v.add(pos, this.boxOffset));

        let shape = this.space.addShape(new cp.SegmentShape(body, a, b, 1));
        shape.setElasticity(0);
        shape.setFriction(0.7);
        shape.group = 1; // use a group to keep the car parts from colliding
        return body;
    };

    addWheel = (pos) => {
        let radius = 12;
        let mass = 20 / m2m; // 20kg
        let body = this.space.addBody(
            new cp.Body(mass, cp.momentForCircle(mass, 0, radius, cp.v(0, 0))),
        );
        body.setPos(cp.v.add(pos, this.boxOffset));

        let shape = this.space.addShape(new cp.CircleShape(body, radius, cp.v(0, 0)));
        shape.setElasticity(0);
        shape.setFriction(1e1);
        shape.group = 1; // use a group to keep the car parts from colliding

        return body;
    };

    addChassis = (pos) => {
        let mass = 1500 / m2m; // 1500 kg
        let width = 4 / px2m; // --> 3.5m length
        let height = 1.8 / px2m; // --> 1.0m height

        let body = this.space.addBody(
            new cp.Body(mass, cp.momentForBox(mass, width, height)),
        );
        body.setPos(cp.v.add(pos, this.boxOffset));

        let shape = this.space.addShape(
            new cp.BoxShape(body, width, height, cp.v(0, 0)),
        );
        shape.setElasticity(0);
        shape.setFriction(0.7);
        shape.group = 1; // use a group to keep the car parts from colliding

        return body;
    };

    reset = () => {
        start_race = tap_start = 1;
        this.wheel1moment = this.Jw1;
        this.wheel2moment = this.Jw2;
        this.wheel1.setMoment(this.wheel1moment);
        this.wheel2.setMoment(this.wheel2moment);
    }

    brake = () => {
        this.motor1.rate = 0;
        this.motor2.rate = 0;
        this.wheel1.setAngVel(0);
        this.wheel2.setAngVel(0);
        //wheel1.v_limit = Infinity;
        //wheel2.v_limit = Infinity;
        this.wheel1.setMoment(this.wheel1moment);
        this.wheel2.setMoment(this.wheel2moment);
    }

    accelerate = () => {
        this.motor1.rate = 0;
        this.motor2.rate = 0;
        this.wheel1.setAngVel(0);
        this.wheel2.setAngVel(0);
        //wheel1.v_limit = Infinity;
        //wheel2.v_limit = Infinity;
        this.wheel1.setMoment(this.wheel1moment);
        this.wheel2.setMoment(this.wheel2moment);
    }

    update = (dt) => {
        var steps = 1;
        dt = dt / steps;
        for (var i = 0; i < steps; i++) {
            this.space.step(dt);
        }

        let chassis = this.chassis;
        let wheel1 = this.wheel1;
        let wheel2 = this.wheel2;
        let motorbar1 = this.motorbar1;
        let motorbar2 = this.motorbar2;
        let motor1 = this.motor1;
        let motor2 = this.motor2;
        let max_rate1 = this.max_rate1;

        cTime = Math.floor(counter / tstep);
        let car_pos = Math.round(chassis.p.x * px2m); //-9.03
        let car_pos9 = car_pos - 9;
        vehSpeed = Math.round(
            Math.sqrt(Math.pow(chassis.vx, 2) + Math.pow(chassis.vy, 2)) *
            px2m *
            2.23694,
        );
        $("#timeval").html(timeout - cTime);

        if (chassis.p.y < 0) {
            this.stop();
            start_race = 0;
            messagebox("Oops...", false);
        }
        if (start_race == 1) {
            $("#speedval").html(vehSpeed + " MPH");
            if (acc_sig && !battempty) {
                $("#effval").html(
                    "Motor Efficiency: " + Math.round(motor2eff * 100) + "%",
                );
            } else {
                $("#effval").html("Motor Efficiency: " + "--%");
            }
            counter += 1;
            ////// Save Results /////////////
            if (car_pos >= car_posOld + 10) {
                car_posOld = car_pos;
                save_x.push(car_pos);
                save_v.push(vehSpeed);
                save_eff.push(Math.round(motor2eff * 100));
            }
            //////////// Success ////////////

            if (car_pos >= maxdist) {
                motor1.rate = 0;
                motor2.rate = 0;
                wheel1.setAngVel(0);
                wheel2.setAngVel(0);
                //wheel1.v_limit = Infinity;
                //wheel2.v_limit = Infinity;
                wheel1.setMoment(1e10);
                wheel2.setMoment(1e10);
                brake_sig = false;
                acc_sig = false;
                start_race = 0;
                if (!battempty) {
                    messagebox("Congratulations!", true);
                } else {
                    messagebox("Good job but try to save battery!", false);
                }
            }
            /////////////////////////////////

            ///// Fail Check ////////////////
            if (chassis.p.x < 10) {
                this.stop();
                start_race = 0;
                messagebox("Can't go back! Please restart.", false);
            }
            if (cTime > timeout) {
                motor1.rate = 0;
                motor2.rate = 0;
                wheel1.setAngVel(0);
                wheel2.setAngVel(0);
                //wheel1.v_limit = Infinity;
                //wheel2.v_limit = Infinity;
                wheel1.setMoment(1e10);
                wheel2.setMoment(1e10);
                brake_sig = false;
                acc_sig = false;
                start_race = 0;
                messagebox("Time out! Please restart.", false);
            }
            if (chassis.rot.x < 0) {
                start_race = 0;
                messagebox("The driver is too drunk!", false);
            }
            if (battstatus < 0.01) {
                battempty = true;
                if (Math.abs(chassis.vx) <= 2 && car_pos < maxdist) {
                    start_race = 0;
                    messagebox("The battery is messed up!", false);
                }
            } else {
                battempty = false;
            }

            let fricImpl =
                (((-1 *
                    fric *
                    (chassis.m + wheel1.m + wheel2.m + motorbar1.m + motorbar2.m) *
                    wheel1.shapeList[0].r) /
                    tstep) *
                    wheel1.w) /
                (Math.abs(wheel1.w) + 0.0001);
            wheel1.w += fricImpl * wheel1.i_inv;
            wheel2.w += fricImpl * wheel2.i_inv;
            var pBar = document.getElementById("pbar");
            pBar.value = ((car_pos - 9) / (maxdist - 9)) * 100;

            battstatus =
                Math.round(1000 - (consumption / 3600 / 1000 / max_batt) * 1000) /
                10;
            $("#battval").html(battstatus + "%");

            /////////////////////Motor Control/////////////////////////////////
            if (brake_sig) {
                motor1.rate = 0;
                motor2.rate = 0;
                let wheel_speed = Math.abs(wheel1.w);
                if (wheel1.w < -1) {
                    motor1.rate = 1 * Math.max(wheel1.w, -1.5) * max_rate1;
                    motor2.rate = 1 * Math.max(wheel1.w, -1.5) * max_rate1;
                    consumption = this.updateConsumption(consumption);
                    $("#effval").html(
                        "Motor Efficiency: " + Math.round(motor2eff * 100) + "%",
                    );
                } else if (wheel1.w > 3) {
                    motor1.rate = 2 * Math.min(wheel1.w, 2) * max_rate1;
                    motor2.rate = 2 * Math.min(wheel1.w, 2) * max_rate1;
                    consumption = -1 * this.updateConsumption(-1 * consumption);
                    $("#effval").html("Motor Efficiency: " + "--%");
                    motor2eff = 0;
                } else {
                    motor1.rate = 0;
                    motor2.rate = 0;
                    wheel1.setAngVel(0);
                    wheel2.setAngVel(0);
                }
                if (wheel_speed > 1) {
                } else {
                    wheel1.setMoment(this.wheel1moment);
                    wheel2.setMoment(this.wheel2moment);
                }
            } else if (acc_sig && !battempty) {
                motor1.rate += this.acc_rate;
                motor2.rate += this.acc_rate;
                if (motor2.rate > max_rate1) {
                    motor2.rate = max_rate1;
                }
                if (motor1.rate > max_rate1) {
                    motor1.rate = max_rate1;
                }
                consumption = this.updateConsumption(consumption);
                $("#effval").html(
                    "Motor Efficiency: " + Math.round(motor2eff * 100) + "%",
                );
            } else {
                $("#effval").html("Motor Efficiency: " + "--%");
                motor2eff = 0;
                motor1.rate = 0;
                motor2.rate = 0;
            }
            ////////////////////////////////////////////////////////////////////////////

            lockScroll();
        } else {
            battstatus =
                Math.round(1000 - (consumption / 3600 / 1000 / max_batt) * 1000) /
                10;
            $("#battval").html(battstatus + "%");
            $("#speedval").html("0 MPH");
            $("#effval").html("Motor Efficiency: " + "--%");
        }
    };

    canvas2point = (x, y) => {
        let rect = canvas.getBoundingClientRect(); //so canvas can be anywhere on the page
        return cp.v((x / this.scale) - rect.left, this.height - y / this.scale + rect.top);
    };

    point2canvas = (point) => {
        let vector = cp.v(point.x * this.scale, (this.height - point.y) * this.scale);
        if(vector.x === NaN || vector.y === NaN){
            console.log(point, vector, this);
        }
        return vector;
    };

    // Draw
    draw = () => {
        let self = this;
        let ctx = this.ctx;
        let canvas = this.canvas;

        DISPLACEMENT = this.chassis.p.x - MARGIN;


        // Draw shapes
        ctx.strokeStyle = 'black';
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        this.space.eachShape( (shape) => {
            // console.log(shape);
            ctx.save();
            ctx.fillStyle = shape.style();
            // console.log(ctx.fillStyle);
            shape.draw(ctx, this.scale, this.point2canvas);
            ctx.restore();
        });

        if (this.mouseJoint) {
            ctx.beginPath();
            var c = this.point2canvas(this.mouseBody.p);
            ctx.arc(c.x, c.y, this.scale * 5, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.stroke();
        }

        this.space.eachConstraint( (c) => {
            if (c.draw) {
                c.draw(ctx, this.scale, this.point2canvas);
            }
        });
    };

    // Run
    run = () => {
        let self = this;
        self.running = true;
        let lastTime = 0;
        const outerStep = function (time) {
            self.step(time - lastTime);
            lastTime = time;

            if (self.running) {
                requestAnimationFrame(outerStep);
            }
        };

        outerStep(0);
    };


    // Stop
    stop = () => {
        this.running = false;
    };


    // Step
    step = (dt) => {
        // Move mouse body toward the mouse
        // var newPoint = cp.v.lerp(this.mouseBody.p, this.mouse, 0.25);
        // this.mouseBody.v = cp.v.mult(cp.v.sub(newPoint, this.mouseBody.p), 60);
        // this.mouseBody.p = newPoint;

        let lastNumActiveShapes = this.space.activeShapes.count;

        let now = this.now = Date.now();
        this.update(1 / tstep);
        this.simulationTime += Date.now() - now;

        // Only redraw if the simulation isn't asleep.
        if (lastNumActiveShapes > 0 || this.resized) {
            now = Date.now();
            this.draw();
            this.drawTime += Date.now() - now;
            this.resized = false;
        }
    };

    addFloor = (data, scene_widthx, xstep) => {
        var space = this.space;
        var staticBody = space.staticBody;

        for (var i = 0; i < scene_widthx / xstep - 3; i++) {
            gndShape[i] = new cp.SegmentShape(staticBody, cp.v(i * xstep, data[i]), cp.v((i + 1) * xstep, data[i + 1]), 0);
            ground[i] = space.addShape(gndShape[i]);
            ground[i].setElasticity(0);
            ground[i].setFriction(0.1);
            ground[i].layers = NOT_GRABABLE_MASK;
        }

        // extra floor to complete the scene
        for (var j = i; j < i + 6; j++) {
            gndShape[j] = new cp.SegmentShape(staticBody, cp.v(j * xstep, data[i]), cp.v((j + 1) * xstep, data[i + 1]), 0);
            ground[j] = space.addShape(gndShape[j]);
            ground[j].setElasticity(0);
            ground[j].setFriction(0.1);
            ground[j].layers = NOT_GRABABLE_MASK;
        }
    };

    addTerminal = (distance) => {
        var space = this.space;
        var staticBody = space.staticBody;
        finishShape[0] = new cp.SegmentShape(staticBody, cp.v(distance, 0), cp.v(distance, 280), 0);
        finishFlag[0] = space.addShape(finishShape[0]);
        finishFlag[0].flag = true;
        finishFlag[0].sensor = true;
    };

    addStation = (distance, elevation) => {
        var space = this.space;
        var staticBody = space.staticBody;
        /*stationShape[0] = new cp.BoxShape(staticBody, stationData[2], stationData[3], cp.v(distance,45));
        station[0] = space.addShape(stationShape[0]);
        station[0].flag = true;
        station[0].sensor = true;*/

        stationShape[0] = new cp.CircleShape(staticBody, 10, cp.v(distance, elevation + 40));
        station[0] = space.addShape(stationShape[0]);
        station[0].flag = true;
        station[0].sensor = true;

        stationShape[0] = new cp.CircleShape(staticBody, 2, cp.v(distance + 5, elevation + 40));
        station[0] = space.addShape(stationShape[0]);
        //station[0].flag = true;
        station[0].sensor = true;

        stationShape[0] = new cp.CircleShape(staticBody, 2, cp.v(distance - 5, elevation + 40));
        station[0] = space.addShape(stationShape[0]);
        //station[0].flag = true;
        station[0].sensor = true;

        stationShape[0] = new cp.BoxShape(staticBody, stationData[0], stationData[1], cp.v(distance, elevation));
        station[0] = space.addShape(stationShape[0]);
        station[0].flag = true;
        station[0].sensor = true;


    }

    // Drawing helper methods
    drawCircle = (ctx, scale, point2canvas, c, radius) => {
        var c = point2canvas(c);
        ctx.beginPath();
        ctx.arc(c.x - DISPLACEMENT, c.y, scale * radius, 0, 2 * Math.PI, false);
        ctx.fill();
        ctx.stroke();
    };

    drawLine = (ctx, point2canvas, a, b) => {
        a = point2canvas(a); b = point2canvas(b);

        ctx.beginPath();
        ctx.moveTo(a.x - DISPLACEMENT, a.y);
        ctx.lineTo(b.x - DISPLACEMENT, b.y);
        ctx.stroke();
    };

    drawRect = (ctx, point2canvas, pos, size) => {
        var pos_ = point2canvas(pos);
        var size_ = cp.v.sub(point2canvas(cp.v.add(pos, size)), pos_);
        ctx.fillRect(pos_.x - DISPLACEMENT, pos_.y, size_.x - DISPLACEMENT, size_.y);
    };

    updateConsumption = (consumption) => {
        let chassis = this.chassis;
        let wheel1 = this.wheel1;
        let motor1 = this.motor1;
        let motor2 = this.motor2;

        //motor1speed = -1*wheel1.w/t2t*fr/2/Math.PI*60; //RPM;
        let motor1speed = Math.sqrt(Math.pow(chassis.vx, 2) + Math.pow(chassis.vy, 2)) / wheel1.shapeList[0].r / t2t * fr / pi * 30;
        let maxTrq1 = maxTrqlerp(motor1speed) / m2m / px2m / px2m * t2t * t2t; //Nm
        //motor2speed = -1*wheel2.w/t2t*fr/2/Math.PI*60; //RPM;
        let motor2speed = motor1speed;
        let maxTrq2 = maxTrqlerp(motor2speed) / m2m / px2m / px2m * t2t * t2t; //Nm
        motor2.maxForce = maxTrq2 * fr;
        motor1.maxForce = maxTrq1 * fr;
        let motor1torque = -1 * Math.min(motor1.jAcc * tstep / fr, maxTrq1) * m2m * px2m * px2m / t2t / t2t;
        let motor2torque = -1 * Math.min(motor2.jAcc * tstep / fr, maxTrq2) * m2m * px2m * px2m / t2t / t2t;
        let motor1eff = efflerp(motor1speed, motor1torque) || 0;
        motor2eff = efflerp(Math.abs(motor2speed), -1 * Math.abs(motor2torque)) || 0;
        let con1 = motor1torque / tstep * motor1speed * pi / 30 * motor1eff;
        if (Math.abs(con1) > 216000) { con1 = 1000; }
        let con2 = motor2torque / tstep * motor2speed * pi / 30 * motor2eff;
        if (Math.abs(con2) > 216000) { con2 = 1000; }
        consumption += (con1 + con2);
        return consumption;
    }
    
}

export default Scene;