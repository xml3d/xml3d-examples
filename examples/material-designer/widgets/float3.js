"use strict";

$.widget("studio.float3", {
    value: function (value) {
        if (value === undefined)
            return this._value;

        if (typeof value === "string") {
            if (value[0] === "#")
                this._value = hexToArray(value);
            else
                this._value = xflowToArray(value);
        } else {
            this._value = value;
        }

        this._dataEntryNode.text(this.xflowValue());
        this._colorWheel.val(this.hexValue());
    },
    hexValue: function () {
        return arrayToHex(this.value());
    },
    xflowValue: function () {
        return arrayToXflow(this.value());
    },
    _create: function () {
        this._dataEntryNode = $(this.options.dataEntryNode);
        this._name = this._dataEntryNode.attr("name");
        this._value = xflowToArray(this._dataEntryNode.text());
        this.element.append(this._buildDomRepresentation());
    },
    _buildDomRepresentation: function () {
        var self = this;
        this._colorWheel = $("<input>", {
            type: "color",
            name: this._name,
            on: {
                input: function (event) {
                    self.value(event.target.value);
                }
            }
        });
        this._colorWheel.val(this.hexValue());

        var container = $("<div>");
        container.append(this._colorWheel);
        return container;
    }
});

function xflowToArray(v) {
    return v.split(" ")
        .filter(function (s) {
            return s != "";
        })
        .map(function (s) {
            return parseInt(s * 255);
        });
}

function arrayToXflow(v) {
    return v.map(function (v) {
        return (v / 255).toFixed(2);
    }).join(" ");
}

function arrayToHex(v) {
    return v.reduce(function (accu, n) {
        var hex = n.toString(16);
        if (hex.length < 2)
            hex = "0" + hex;
        return accu + hex;
    }, "#");
}

function hexToArray(v) {
    return /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i
        .exec(v)
        .slice(1)
        .map(function (s) {
            return parseInt(s, 16);
        });
}
