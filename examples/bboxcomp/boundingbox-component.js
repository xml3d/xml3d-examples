/**
 * This file defines the Javascript interface for our web component. We react to changes in the 'target' attribute
 * using the lifecycle callback attributeChangedCallback that all web components offer. We also add our own
 * showBBoxFor function to the element that can be used as an alternative to the 'target' attribute.
 *
 * Finally we register our component with XML3D, storing the returned Promise in a global variable so we can listen
 * for its completion during our page loading code.
 */

(function() {
    var ourPrototype = {
        attributeChangedCallback: function(attr, oldVal, newVal) {
            if (attr === "target") {
                var otherElement = document.getElementById(newVal);
                if (!otherElement) {
                    return;
                }
                this.showBBoxFor(otherElement);
            }
        },

        showBBoxFor: function(element) {
            var bbox = element.getWorldBoundingBox();
            this.shadowRoot.querySelector("float3[name='bbox']").textContent = bbox.toDOMString();
        }
    };

    // A simple global array to hold the Promises of all components used in a scene. This is just one way of waiting on
    // components to finish registering before using them.
    if (!window.XML3D.Components) {
        window.XML3D.Components = [];
    }
    window.XML3D.Components.push( XML3D.registerComponent("bbox-template.html", {proto: ourPrototype}) );
})();
