"use strict";

$.widget("studio.float", {
    value: function (value) {
        if (value === undefined)
            return this._value;

        this._value = value;
        this._slider.val(this._value);
        this._dataEntryNode.text(this._value);
    },
    _create: function () {
        this._dataEntryNode = $(this.options.dataEntryNode);
        this._name = this._dataEntryNode.attr("name");
        this._value = +this._dataEntryNode.text();
        this.element.append(this._buildDomRepresentation());
    },
    _buildDomRepresentation: function () {
        var self = this;
        this._slider = $("<input>", {
            type: "range",
            step: 0.01,
            min: 0,
            max: 1,
            value: this.value(),
            on: {
                input: function (event) {
                    self.value(+event.target.value);
                }
            }
        });

        var container = $("<div>");
        container.append(this._slider);
        return container;
    }
});
