var defaultValues = {
    baseColor: [1.0, 1.0, 1.0],
    subsurface: 0,
    metallic: 0,
    specular: 0.5,
    specularTint: 0,
    roughness: 0.5,
    anisotropic: 0.0,
    sheen: 0,
    sheenTint: 0.5,
    clearCoat: 0,
    clearCoatGloss: 1,
    clearCoatThickness: 1,
    opacity: 1.0
};

$(function () {
    var materialData = $("#material");
    var controls = $("#parameter-controls");

    function createContainer() {
        return $("<div>", {style: "margin: 10px; max-width: 220px;"});
    }

    function createControlHost(name) {
        return $("<label>", {
            style: "float: none; display: inline; margin: 10px;",
            text: name
        })
    }

    function createTypeSwitcher(node) {
        return $("<i>", {
            style: "display: inline;",
            class: "fi-widget",
            click: function () {
                var type = node.tagName.toLowerCase();
                if (type === "texture") {
                    var name = node.getAttribute("name");
                    var idx = name.indexOf("Texture");
                    name = name.substring(0, idx);
                    if (name === "baseColor") {
                        $(node).replaceWith($("<float3>", {
                            name: name,
                            text: defaultValues[name].join(" ")
                        }));
                    } else {
                        $(node).replaceWith(
                            $("<float>",
                                {name: name, text: defaultValues[name]}));
                    }
                } else {
                    $(node).replaceWith(
                        $("<texture>",
                            {name: node.getAttribute("name") + "Texture"}));
                }
                controls.empty();
                setupControls();
            }
        })
    }

    function createDeleter(node) {
        return $("<i>", {
            style: "display: inline;",
            class: "fi-minus",
            click: function () {
                $(node).remove();
                controls.empty();
                setupControls();
            }
        })
    }

    function createAdder() {
        return $("<i>", {
            style: "display: inline;",
            class: "fi-plus",
            click: function () {
                materialData.append($("<texture>", {name: "normalMap"}));
                controls.empty();
                setupControls();
            }
        })
    }

    function setupControls() {
        var hasNormalMap = false;
        materialData.children().each(function (idx, node) {
            var type = node.tagName.toLowerCase();
            var name = node.getAttribute("name");

            var controlContainer = createContainer();

            if (name === "normalMap")
                hasNormalMap = true;

            var control = createControlHost(name);
            control[type]({
                dataEntryNode: node
            });
            if (name !== "normalMap" && name !== "ambientIntensity")
                controlContainer.append(createTypeSwitcher(node));
            if (name === "normalMap")
                controlContainer.append(createDeleter(node));


            controlContainer.append(control);
            controls.append(controlContainer);
        });

        if (!hasNormalMap) {
            var controlContainer = createContainer();
            var normalMapControl = createControlHost("normalMap")
            controlContainer.append(createAdder());
            controlContainer.append(normalMapControl);
            controls.append(controlContainer);
        }
    }


    setupControls();
});

function showXML() {

    $("#xml-material-serialization")
        .empty()
        .text($("#material")
            .html()
            .trim()
            .replace(/ *</g, "<")
            .replace(/<img([^>]*)>/g, "\n<img$1>\n")
            .replace(/<img src=".*" data-file="(.*)">/g,
            '<img src="$1">'));
}