var trackbars = [];

// Create and initialize the trackbars
function init() {

    for (var i=1; i<7; i++) {
        var trackbar = new Trackbar(-1.5, 1.5, 250, trackBarChange, "pc"+i);
        trackbar.GetContainer().style.position = 'absolute';
        trackbar.GetContainer().style.top = '10px';
        trackbar.GetContainer().style.left = '15px';
        document.getElementById("trackbarHolder"+i).appendChild(trackbar.GetContainer());
        trackbar.StartListening();
        trackbars[i] = trackbar;
    }
}

// Changes between male and female faces. This replaces the PCA data used as well as the mean used as 
// the base for the PCA computation.
function changeToFaceType(type) {
    changePCAMatrix(type);
    document.getElementById("meanMeshData").setAttribute("src", "#meanPositions"+type);
    document.getElementById("referenceData").setAttribute("src", "#meanPositions"+type);
}

// Resets all sliders to their default positions
function resetSliders() {
    for (var i=1; i<7; i++) {
        trackbars[i].SetCurrentValue(0);
        trackBarChange(0, "pc"+i);
    }
}

// Changes the active shader
function changeShaderTo(shaderId) {
    document.getElementById("faceGroup").setAttribute("shader", shaderId);
}

// Sets a new reference point. This is only used in the delta shader, where the amount of change with respect 
// to the reference point is displayed as a gradient from green to red.
function setReferencePoint() {
    //TODO
}

function trackBarChange(val, pcid)
{
  document.getElementById(pcid+"weight").textContent = val;
}

function trackBoxChange()
{
}

function trackBoxWidthChange()
{
}

function trackBoxMinChange()
{
}

function trackBoxMaxChange()
{
}

