'use strict';

var Stroke = require('./Stroke'),
    Path = require('./Path'),
    Rect = require('./Rect'),
    Ellipse = require('./Ellipse'),
    Polystar = require('./Polystar'),
    AnimatedPath = require('./AnimatedPath'),
    Fill = require('./Fill'),
    Transform = require('./Transform'),
    Merge = require('./Merge'),
    Trim = require('./Trim');

function Group(data, bufferCtx, parentIn, parentOut) {

    //this.name = data.name;
    this.in = data.in ? data.in : parentIn;
    this.out = data.out ? data.out : parentOut;

    if (data.fill) this.fill = new Fill(data.fill);
    if (data.stroke) this.stroke = new Stroke(data.stroke);
    if (data.trim) this.trim = new Trim(data.trim);
    if (data.merge) this.merge = new Merge(data.merge);

    this.transform = new Transform(data.transform);
    this.bufferCtx = bufferCtx;

    if (data.groups) {
        this.groups = [];
        for (var i = 0; i < data.groups.length; i++) {
            this.groups.push(new Group(data.groups[i], this.bufferCtx, this.in, this.out));
        }
    }

    //
    if (data.shapes) {
        this.shapes = [];
        for (var j = 0; j < data.shapes.length; j++) {
            var shape = data.shapes[j];
            if (shape.type === 'path') {
                if (shape.isAnimated) this.shapes.push(new AnimatedPath(shape));
                else this.shapes.push(new Path(shape));
            } else if (shape.type === 'rect') {
                this.shapes.push(new Rect(shape));
            } else if (shape.type === 'ellipse') {
                this.shapes.push(new Ellipse(shape));
            } else if (shape.type === 'polystar') {
                this.shapes.push(new Polystar(shape));
            }
        }
    }
}

Group.prototype.draw = function (ctx, time, parentFill, parentStroke, parentTrim) {

    var i;

    ctx.save();

    //TODO check if color/stroke is changing over time
    var fill = this.fill || parentFill;
    var stroke = this.stroke || parentStroke;
    var trimValues = this.trim ? this.trim.getTrim(time) : parentTrim;

    if (fill) fill.setColor(ctx, time);
    if (stroke) stroke.setStroke(ctx, time);

    this.transform.transform(ctx, time);

    if (this.merge) {
        this.bufferCtx.save();
        this.bufferCtx.clearRect(0, 0, this.bufferCtx.canvas.width, this.bufferCtx.canvas.height);
        this.transform.transform(this.bufferCtx, time);

        if (fill) fill.setColor(this.bufferCtx, time);
        if (stroke) stroke.setStroke(this.bufferCtx, time);
    }

    ctx.beginPath();
    if (this.shapes) {
        if (this.merge) {

            for (i = 0; i < this.shapes.length; i++) {
                this.shapes[i].draw(this.bufferCtx, time, trimValues);
                this.bufferCtx.closePath();
                if (fill) this.bufferCtx.fill();
                if (stroke) this.bufferCtx.stroke();
                this.bufferCtx.beginPath();
                this.merge.setCompositeOperation(this.bufferCtx);
            }

            ctx.restore();
            ctx.drawImage(this.bufferCtx.canvas, 0, 0);
            this.bufferCtx.restore();

        } else {
            for (i = 0; i < this.shapes.length; i++) {
                this.shapes[i].draw(ctx, time, trimValues);
            }
            if (this.shapes[this.shapes.length - 1].closed) {
                //ctx.closePath();
            }
        }
    }

    //TODO get order
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();

    if (this.groups) {
        if (this.merge) {

            for (i = 0; i < this.groups.length; i++) {
                if (time >= this.groups[i].in && time < this.groups[i].out) {
                    this.groups[i].draw(this.bufferCtx, time, fill, stroke, trimValues);
                    this.merge.setCompositeOperation(this.bufferCtx);
                }
            }
            ctx.restore();
            ctx.drawImage(this.bufferCtx.canvas, 0, 0);
            this.bufferCtx.restore();
        }
        else {
            for (i = 0; i < this.groups.length; i++) {
                if (time >= this.groups[i].in && time < this.groups[i].out) {
                    this.groups[i].draw(ctx, time, fill, stroke, trimValues);
                }
            }
        }
    }
    ctx.restore();
};

Group.prototype.setKeyframes = function (time) {
    this.transform.setKeyframes(time);

    if (this.shapes) {
        for (var i = 0; i < this.shapes.length; i++) {
            this.shapes[i].setKeyframes(time);
        }
    }
    if (this.groups) {
        for (var j = 0; j < this.groups.length; j++) {
            this.groups[j].setKeyframes(time);
        }
    }

    if (this.fill) this.fill.setKeyframes(time);
    if (this.stroke) this.stroke.setKeyframes(time);
    if (this.trim) this.trim.setKeyframes(time);
};

Group.prototype.reset = function (reversed) {
    this.transform.reset(reversed);

    if (this.shapes) {
        for (var i = 0; i < this.shapes.length; i++) {
            this.shapes[i].reset(reversed);
        }
    }
    if (this.groups) {
        for (var j = 0; j < this.groups.length; j++) {
            this.groups[j].reset(reversed);
        }
    }
    if (this.fill) this.fill.reset(reversed);
    if (this.stroke) this.stroke.reset(reversed);
    if (this.trim) this.trim.reset(reversed);
};

module.exports = Group;

























