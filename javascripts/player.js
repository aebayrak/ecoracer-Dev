import { EcoRacerOptions } from "./main.js";

export class PlayerCredentials {
    constructor(user, password) {
        this.username = user;
        this.password = password;
    }
}

export class ServerData {
    constructor() {
        this.credentials = new PlayerCredentials();
        this.bestScore = 0;
    }
}

class LocalData {
    constructor() {
        // user controlled data
        this.isAccelerating = false;
        this.isBraking = false;

        // calculated realtime values
        this.motor1eff = 0;
        this.motor2eff = 0;
        this.vehSpeed = 0;
        this.car_posOld = 0;
        this.consumption = 0;
        this.battStatus = 100;

        // logged data
        this.acc_keys = []; // at what postions did the user press/release accelerator
        this.brake_keys = []; // at what positions did the user press/release brake

        // the next three variables are snapshot at the same distance interval as a triplet
        // for plotting at end of game.
        this.save_x = []; // saved x position of current play
        this.save_v = []; // saved velocity at save_x position
        this.save_eff = []; // saved efficiency at save_x position
        this.save_batt = []; // saved battery level as save_x position
    }
}

class Player {
    constructor(name, color) {
        this.firendlyName = name;
        this.carColor = color;
        this.serverData = new ServerData();
        this.localData = new LocalData();
    }

    static NAMES = {
        HUMAN: 'human',
        AI: 'ai'
    };

    Reset() {
        this.localData = new LocalData();
        this.wheel1moment = this.Jw1;
        this.wheel2moment = this.Jw2;
        this.wheel1.setMoment(this.wheel1moment);
        this.wheel2.setMoment(this.wheel2moment);
    }

    SuspendVehicle() {
        this.motor1.rate = 0;
        this.motor2.rate = 0;
        this.wheel1.setAngVel(0);
        this.wheel2.setAngVel(0);
        this.wheel1.setMoment(1e10);
        this.wheel2.setMoment(1e10);
        this.localData.isAccelerating = false;
        this.localData.isBraking = false;
    }

    XPosition() {
        return Math.round(this.chassis.p.x);
    }

    YPosition() {
        return Math.round(this.chassis.p.y);
    }

    PressAccelerator() {
        this.localData.isAccelerating = true;
        this.RecordKey(this.localData.acc_keys);
    }
    ReleaseAccelerator() {
        this.localData.isAccelerating = false;
        this.RecordKey(this.localData.acc_keys);
        this.motor1.rate = 0;
        this.motor2.rate = 0;
        this.wheel1.setAngVel(0);
        this.wheel2.setAngVel(0);
        //wheel1.v_limit = Infinity;
        //wheel2.v_limit = Infinity;
        this.wheel1.setMoment(this.wheel1moment);
        this.wheel2.setMoment(this.wheel2moment);
    }
    PressBrake() {
        this.localData.isBraking = true;
        // implement brake override safety feature?
        // isAccelerating = false;
        this.RecordKey(this.localData.brake_keys);
    }

    ReleaseBrake() {
        this.localData.isBraking = false;
        this.RecordKey(this.localData.brake_keys);
        this.motor1.rate = 0;
        this.motor2.rate = 0;
        this.wheel1.setAngVel(0);
        this.wheel2.setAngVel(0);
        //wheel1.v_limit = Infinity;
        //wheel2.v_limit = Infinity;
        this.wheel1.setMoment(this.wheel1moment);
        this.wheel2.setMoment(this.wheel2moment);
    }

    IsBattEmpty() {
        return this.localData.battStatus < 0.01;
    }

    RecordKey(keyArray) {
        let xp = this.XPosition();
        if (xp != keyArray[keyArray.length - 1]) {
            keyArray.push(xp);
        }
    }

    AttachToChipmunk2DWorld(scene, posA, posB) {
        this.chassis = scene.AddChassis(cp.v(80, 10), this.carColor);
        let motorbar1 = (this.motorbar1 = scene.AddBar(posA));
        let motorbar2 = (this.motorbar2 = scene.AddBar(posB));
        let motorbar3 = (this.motorbar3 = scene.AddBar(posA));
        let motorbar4 = (this.motorbar4 = scene.AddBar(posB));
        this.wheel1 = scene.AddWheel(posA);
        this.wheel2 = scene.AddWheel(posB);

        // mark the body as hidden or not, to help simplify the rendering later.
        let hidden = ((this === Players.AI) && (false === EcoRacerOptions.AI.FEEDBACK_GHOST_CAR))
        this.chassis.render = !hidden;
        this.motorbar1.render = !hidden;
        this.motorbar2.render = !hidden;
        this.motorbar3.render = !hidden;
        this.motorbar4.render = !hidden;
        this.wheel1.render = !hidden;
        this.wheel2.render = !hidden;

        let joint1 = new cp.GrooveJoint(this.chassis, this.wheel1, cp.v(-30, -10), cp.v(-30, -20), cp.v(0, 0));
        let joint2 = new cp.GrooveJoint(this.chassis, this.wheel2, cp.v(30, -10), cp.v(30, -20), cp.v(0, 0));

        scene.space.addConstraint(joint1);
        scene.space.addConstraint(joint2);
        scene.space.addConstraint(new cp.DampedSpring(this.chassis, this.wheel1, cp.v(-30, 0), cp.v(0, 0), 20, 10, 5)); // stiffness f/dx, damping f/v
        scene.space.addConstraint(new cp.DampedSpring(this.chassis, this.wheel2, cp.v(30, 0), cp.v(0, 0), 20, 10, 5));
        scene.space.addConstraint(new cp.PivotJoint(motorbar1, this.wheel1, scene.POS(posA)));
        scene.space.addConstraint(new cp.PivotJoint(motorbar2, this.wheel2, scene.POS(posB)));
        scene.space.addConstraint(new cp.PivotJoint(motorbar3, this.wheel1, scene.POS(posA)));
        scene.space.addConstraint(new cp.PivotJoint(motorbar4, this.wheel2, scene.POS(posB)));

        this.motor1 = new cp.SimpleMotor(motorbar1, this.wheel1, 0);
        this.motor2 = new cp.SimpleMotor(motorbar2, this.wheel2, 0);
        scene.space.addConstraint(this.motor1);
        scene.space.addConstraint(this.motor2);

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
    }

    UpdateVariables() {
        // shortcuts
        let chassis = this.chassis;
        let wheel1 = this.wheel1;
        let wheel2 = this.wheel2;
        let motorbar1 = this.motorbar1;
        let motorbar2 = this.motorbar2;
        let motor1 = this.motor1;
        let motor2 = this.motor2;

        // beginning of calculations

        // convert X position from pixels to meters
        let car_pos = Math.round(chassis.p.x * px2m); //-9.03
        // determine vehicle velocity in MPH
        this.localData.vehSpeed = Math.round(Math.sqrt(Math.pow(chassis.vx, 2) + Math.pow(chassis.vy, 2)) * px2m * 2.23694);

        // TODO: describe what this friction calculation is doing
        let fricImpl =
            (((-1 * fric * (chassis.m + wheel1.m + wheel2.m + motorbar1.m + motorbar2.m) * wheel1.shapeList[0].r) / tstep) * wheel1.w) /
            (Math.abs(wheel1.w) + 0.0001);
        wheel1.w += fricImpl * wheel1.i_inv;
        wheel2.w += fricImpl * wheel2.i_inv;

        // update the battery capacity % value
        this.localData.battStatus = Math.round(1000 - (this.localData.consumption / 3600 / 1000 / max_batt) * 1000) / 10;

        /////////////////////Motor Control/////////////////////////////////
        if (this.localData.isBraking) {
            motor1.rate = 0;
            motor2.rate = 0;
            let wheel_speed = Math.abs(wheel1.w);
            if (wheel1.w < -1) {
                motor1.rate = 1 * Math.max(wheel1.w, -1.5) * this.max_rate1;
                motor2.rate = 1 * Math.max(wheel1.w, -1.5) * this.max_rate1;
                this.localData.consumption = this.UpdateConsumption(this.localData.consumption);
            } else if (wheel1.w > 3) {
                motor1.rate = 2 * Math.min(wheel1.w, 2) * this.max_rate1;
                motor2.rate = 2 * Math.min(wheel1.w, 2) * this.max_rate1;
                this.localData.consumption = -1 * this.UpdateConsumption(-1 * this.localData.consumption);
                this.localData.motor2eff = 0;
            } else {
                motor1.rate = 0;
                motor2.rate = 0;
                wheel1.setAngVel(0);
                wheel2.setAngVel(0);
            }

            if (wheel_speed <= 1) {
                wheel1.setMoment(this.wheel1moment);
                wheel2.setMoment(this.wheel2moment);
            }
        } else if (this.localData.isAccelerating && !this.IsBattEmpty()) {
            motor1.rate += this.acc_rate;
            motor2.rate += this.acc_rate;
            if (motor1.rate > this.max_rate1) {
                motor1.rate = this.max_rate1;
            }
            if (motor2.rate > this.max_rate2) {
                motor2.rate = this.max_rate2;
            }
            this.localData.consumption = this.UpdateConsumption(this.localData.consumption);
        } else {
            this.localData.motor2eff = 0;
            motor1.rate = 0;
            motor2.rate = 0;
        }
        ////////////////////////////////////////////////////////////////////////////

        ////// Log driving data snapshots /////////////
        if (car_pos > this.localData.car_posOld) {
            this.localData.car_posOld = car_pos;
            this.localData.save_x.push(car_pos);
            this.localData.save_v.push(this.localData.vehSpeed);
            this.localData.save_eff.push(Math.round(this.localData.motor2eff * 100));
            this.localData.save_batt.push(this.localData.battStatus);
        }
        
        
        // push all the calculated values to the corresponding UI elements.
        this.UpdateUI();

        // lockScroll();
    }

    UpdateConsumption(consumption) {
        let chassis = this.chassis;
        let wheel1 = this.wheel1;
        let motor1 = this.motor1;
        let motor2 = this.motor2;

        //motor1speed = -1*wheel1.w/t2t*fr/2/Math.PI*60; //RPM;
        let motor1speed = (((Math.sqrt(Math.pow(chassis.vx, 2) + Math.pow(chassis.vy, 2)) / wheel1.shapeList[0].r / t2t) * fr) / pi) * 30;
        //motor2speed = -1*wheel2.w/t2t*fr/2/Math.PI*60; //RPM;
        let motor2speed = motor1speed;
        let maxTrq1 = (maxTrqlerp(motor1speed) / m2m / px2m / px2m) * t2t * t2t; //Nm
        let maxTrq2 = (maxTrqlerp(motor2speed) / m2m / px2m / px2m) * t2t * t2t; //Nm
        motor1.maxForce = maxTrq1 * fr;
        motor2.maxForce = maxTrq2 * fr;
        let motor1torque = (-1 * Math.min((motor1.jAcc * tstep) / fr, maxTrq1) * m2m * px2m * px2m) / t2t / t2t;
        let motor2torque = (-1 * Math.min((motor2.jAcc * tstep) / fr, maxTrq2) * m2m * px2m * px2m) / t2t / t2t;
        // TODO: why are these formulas different?
        this.localData.motor1eff = efflerp(motor1speed, motor1torque) || 0;
        this.localData.motor2eff = efflerp(Math.abs(motor2speed), -1 * Math.abs(motor2torque)) || 0;
        let con1 = (((motor1torque / tstep) * motor1speed * pi) / 30) * this.localData.motor1eff;
        if (Math.abs(con1) > 216000) {
            con1 = 1000;
        }
        let con2 = (((motor2torque / tstep) * motor2speed * pi) / 30) * this.localData.motor2eff;
        if (Math.abs(con2) > 216000) {
            con2 = 1000;
        }
        consumption += con1 + con2;
        return consumption;
    }

    UpdateUI() {
        if (this.firendlyName === Player.NAMES.HUMAN) {
            document.getElementById('pbar').value = ((this.localData.car_posOld - 9) / (MAX_DISTANCE - 9)) * 100;
            $('#speedval').html(this.localData.vehSpeed + ' MPH');
            $('#battval').html(this.localData.battStatus + '%');

            let displayVaule = '--';
            if (this.localData.motor2eff != 0) {
                displayVaule = Math.round(this.localData.motor2eff * 100);
            }
            $('#effval').html('Eff: ' + displayVaule + '%');
        }
    }
}

export const Players = {
    HUMAN: new Player(Player.NAMES.HUMAN, 'black'),
    AI: new Player(Player.NAMES.AI, 'lightgrey')
};
