"use strict";

$.widget("studio.texture", {
    _create: function () {
        this._dataEntryNode = $(this.options.dataEntryNode);
        this._name = this._dataEntryNode.attr("name");
        this._dataEntryNode.attr("wrapS", "repeat");
        this._dataEntryNode.attr("wrapT", "repeat");
        this._imageNode = this._dataEntryNode.find("img");
        if (this._imageNode.length === 0) {
            this._imageNode = $("<img>", {
                src: "http://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg"
            });
            this._imageNode.attr("data-file", "no-image");
            this._dataEntryNode.append(this._imageNode);
        }
        this._imgSrc = this._imageNode.attr("src");
        this.element.append(this._buildDomRepresentation());
    },
    _buildDomRepresentation: function () {
        var self = this;
        var previewImage = $("<img>", {
            src: this._imgSrc,
            name: this._name
        });
        var fileInput = $("<input>", {
            type: "file",
            style: "display: none;",
            on: {
                change: function (event) {
                    var file = event.target.files[0];
                    var reader = new FileReader();
                    reader.onload = function (event) {
                        previewImage.attr("src", event.target.result);
                        self._imageNode.attr("src", event.target.result);
                        self._imageNode.attr("data-file", file.name);
                        self.element.trigger("change");
                    };
                    reader.readAsDataURL(file);
                }
            }
        });

        var container = $("<div>");
        container.append(previewImage);
        container.append(fileInput);
        return container;
    }
});
