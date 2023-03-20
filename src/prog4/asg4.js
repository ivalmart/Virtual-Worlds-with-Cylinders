// Shaders (GLSL)
// https://en.wikipedia.org/wiki/Phong_reflection_model
let VSHADER=`
    precision mediump float;
    attribute vec3 a_Position;
    attribute vec3 a_Normal;

    uniform mat4 u_ModelMatrix;
    uniform mat4 u_NormalMatrix;
    uniform mat4 u_ViewMatrix;
    uniform mat4 u_ProjMatrix;      // projection matrix

    uniform vec3 u_Color;
    uniform vec3 u_ambientColor;
    uniform vec3 u_diffuseColor1;
    uniform vec3 u_diffuseColor2;
    uniform vec3 u_specularColor;
    uniform float u_specularAlpha;

    uniform vec3 u_eyePosition;
    uniform vec3 u_lightPosition;
    uniform vec3 u_lightDirection;

    varying vec4 v_Color;

    vec3 calcAmbient() {
        return u_ambientColor * u_Color;
    }

    vec3 calcDiffuse(vec3 l, vec3 n, vec3 lColor) {
        float nDotL = max(dot(l, n), 0.0);
        return lColor * u_Color * nDotL;
    }

    vec3 calcSpecular(vec3 r, vec3 v) {
        float rDotV = max(dot(r, v), 0.0);
        float rDotVPowAlpha = pow(rDotV, u_specularAlpha);
        return u_specularColor * u_Color * rDotVPowAlpha;
    }

    void main() {
        // Mapping obj coord system to world coord system
        vec4 worldPos = u_ModelMatrix * vec4(a_Position, 1.0);

        vec3 n = normalize(u_NormalMatrix * vec4(a_Normal, 0.0)).xyz; // Normal

        vec3 l1 = normalize(u_lightPosition - worldPos.xyz); // Light direction 1
        vec3 l2 = normalize(u_lightDirection); // Light direction 2

        vec3 v = normalize(u_eyePosition - worldPos.xyz);   // View direction

        vec3 r1 = reflect(l1, n); // Reflected light direction
        vec3 r2 = reflect(l2, n); // Reflected light direction

        // Smooth shading (Goraud)
        vec3 ambient = calcAmbient();

        vec3 diffuse1 = calcDiffuse(l1, n, u_diffuseColor1);
        vec3 diffuse2 = calcDiffuse(l2, n, u_diffuseColor2);

        vec3 specular1 = calcSpecular(r1, v);
        vec3 specular2 = calcSpecular(r2, v);

        v_Color = vec4(ambient + (diffuse1 + diffuse2) + (specular1 + specular2), 1.0);

        // map gl position considering the view and position coordinate system
        gl_Position = u_ProjMatrix * u_ViewMatrix * worldPos;   
    }
`;

let FSHADER=`
    precision mediump float;
    uniform vec3 u_Color;
    varying vec4 v_Color;

    void main() {
        gl_FragColor = v_Color;
    }
`;


let modelMatrix = new Matrix4();
let normalMatrix = new Matrix4();

// Models in the world
let lightPosition = new Vector3([-1.0, -0.15, -1.0]);     // point light source
let lightDirection = new Vector3([1.0, 1.0, 1.0]);         // directional light source
let lightRotation = new Matrix4().setRotate(1, 0,1,0);
let eyePosition = new Vector3([0.0, 0.0, 0.0]);

let cylinders = [];

// Uniform locations
let u_ModelMatrix = null;
let u_NormalMatrix = null;
let u_ViewMatrix = null;
let u_ProjMatrix = null;

let u_Color = null;
let u_ambientColor = null;
let u_diffuseColor1 = null;     // point light
let u_diffuseColor2 = null;     // directional light
let u_specularColor = null;
let u_specularAlpha = null;

let u_lightPosition = null;
let u_eyePosition = null;

// sphere light source
pointLightSphere = new Sphere([1.0, 1.0, 0.0], 13);
pointLightSphere.setTranslate(lightPosition.elements[0], lightPosition.elements[1], lightPosition.elements[2]);
pointLightSphere.setScale(0.075, 0.075, 0.075);

// Toggle Flat Shading/Smooth Shading/Wireframes
let drawShading = "flatShade";
// Toggle Point Light Source/Directional Light Source
let lightUpPoint = false;
let lightUpDirection = true;
// Toggle Animation On/Off
let animate = false;

function drawCylinder(cylinder) {
    // Update model matrix combining translate, rotate and scale from cylinder
    modelMatrix.setIdentity();

    // Apply translation for this part of the animal
    modelMatrix.translate(cylinder.translate[0], cylinder.translate[1], cylinder.translate[2]);

    // Apply rotations for this part of the animal
    modelMatrix.rotate(cylinder.rotate[0], 1, 0, 0);
    modelMatrix.rotate(cylinder.rotate[1], 0, 1, 0);
    modelMatrix.rotate(cylinder.rotate[2], 0, 0, 1);

    // Apply scaling for this part of the animal
    modelMatrix.scale(cylinder.scale[0], cylinder.scale[1], cylinder.scale[2]);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    // Compute normal matrix N_mat = (M^-1).T
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

    // Set u_Color variable from fragment shader
    gl.uniform3f(u_Color, cylinder.color[0], cylinder.color[1], cylinder.color[2]);

    // Send vertices and indices from cylinder to the shaders
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cylinder.vertices, gl.STATIC_DRAW);

    // sets the current object's normals depending on what the shading is
    if(cylinder instanceof Cylinder) {
        if(drawShading == "smoothShade") {
            cylinder.normals = cylinder.smoothNormals;
        } else {        // it is either flat shading or wireframes
            cylinder.normals = cylinder.flatNormals;
        }
    }

    // Sets normals of the cylinders depending on what shading is on
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cylinder.normals, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cylinder.indices, gl.STATIC_DRAW);

    // Draw cylinder
    if(drawShading == "wireframe") {     // if the user wants to draw wireframes
        gl.drawElements(gl.LINE_LOOP, cylinder.indices.length, gl.UNSIGNED_SHORT, 0);
    } else {
        gl.drawElements(gl.TRIANGLES, cylinder.indices.length, gl.UNSIGNED_SHORT, 0);
    }
}


function initBuffer(attibuteName, n) {
    let shaderBuffer = gl.createBuffer();
    if(!shaderBuffer) {
        console.log("Can't create buffer.")
        return -1;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, shaderBuffer);

    let shaderAttribute = gl.getAttribLocation(gl.program, attibuteName);
    gl.vertexAttribPointer(shaderAttribute, n, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shaderAttribute);

    return shaderBuffer;
}

// Adjusts the Condition to whether the object is a wireframe or not
function adjustWireframeCondition(val) {
    if(val.checked) {           // sets the condition that the user wants to draw wireframes
        drawWireframe = true;
    } else if(!val.checked) {   // if unchecked/not checked, user wants full cylinders
        drawWireframe = false;
    }
}

let MAX_COLOR = 255;
// Creates the New Object
function addCylinder() {
    // Receives N Value
    let nValue = document.getElementById("nValue").value;

    // Receives Color
    let colorObj = document.getElementById("cylinderColor").value;  // receives color value
    colorObj = hexToRgb(colorObj);  // converts hex color to RBG
    let color = [colorObj.r / MAX_COLOR, colorObj.g / MAX_COLOR, colorObj.b / MAX_COLOR];   // places color into coordinates / 255 scale

    // Create a new cylinder
    let cylinder = new Cylinder(parseInt(nValue), color);
    cylinders.push(cylinder);

    // Add an option in the selector
    let selector = document.getElementById("cylSelect");
    let cylOption = document.createElement("option");
    cylOption.text = "Cylinder " + cylinders.length;
    cylOption.value = cylinders.length - 1;
    selector.add(cylOption);

    // Activate the cylinder we just created
    selector.value = cylOption.value;
    // Set scale of cylinder to view it
    cylinder.setScale(0.1, 0.1, 0.1);

    draw();
}

// Continuously Draws/Updates the Shapes
function draw() {
    // Draw frame
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // checks to see if the point light sphere exists
    if(pointLightSphere !== undefined) {
        drawCylinder(pointLightSphere);
    }

    gl.uniform3fv(u_lightDirection, camera.eye.elements);
    // Update eye position in the shader
    gl.uniform3fv(u_eyePosition, camera.eye.elements);
    // Update View Matrix in the shader
    gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
    // Update Projection Matrix in the shader
    gl.uniformMatrix4fv(u_ProjMatrix, false, camera.projMatrix.elements);

    lightDirection[0] = camera.eye.elements[0];
    lightDirection[1] = camera.eye.elements[1];
    lightDirection[2] = camera.eye.elements[2];
    gl.uniform3fv(u_lightDirection, lightDirection.elements);

    for(let cylinder of cylinders) {
        drawCylinder(cylinder);
    }

    requestAnimationFrame(draw);
}

// --------------- Moving Point Light Source ---------------
let MAX_TRANSLATE = 100;
// Translate Point Light Source X
function pltTranslateX(value) {
    // if the toggle button is on for the point light source
    if(document.getElementsByClassName("togglePointLight")[0].checked) {
        lightPosition.elements[0] = value / MAX_TRANSLATE;
        gl.uniform3fv(u_lightPosition, lightPosition.elements);
        pointLightSphere.setTranslate(lightPosition.elements[0], lightPosition.elements[1], lightPosition.elements[2]);
    }
}

// Translate Point Light Source Y
function pltTranslateY(value) {
    // if the toggle button is on for the point light source
    if(document.getElementsByClassName("togglePointLight")[0].checked) {
        lightPosition.elements[1] = value / MAX_TRANSLATE;
        gl.uniform3fv(u_lightPosition, lightPosition.elements);
        pointLightSphere.setTranslate(lightPosition.elements[0], value / MAX_TRANSLATE, lightPosition.elements[2]);
    }
}

// Translate Point Light Source Y
function pltTranslateZ(value) {
    // if the toggle button is on for the point light source
    if(document.getElementsByClassName("togglePointLight")[0].checked) {
        lightPosition.elements[2] = value / MAX_TRANSLATE;
        gl.uniform3fv(u_lightPosition, lightPosition.elements);
        pointLightSphere.setTranslate(lightPosition.elements[0], lightPosition.elements[1], value / MAX_TRANSLATE);    
    }
}

// --------------- Translation Functions ---------------
// Translate X
function onChangeTranslateX(value) {
    // Get the selected Cylinder
    let selector = document.getElementById("cylSelect");
    let selectedCylinder = cylinders[selector.value];

    selectedCylinder.setTranslate(value / MAX_TRANSLATE, selectedCylinder.translate[1], selectedCylinder.translate[2]); // translates x value    
}

// Translate Y
function onChangeTranslateY(value) {
    // Get the selected Cylinder
    let selector = document.getElementById("cylSelect");
    let selectedCylinder = cylinders[selector.value];

    selectedCylinder.setTranslate(selectedCylinder.translate[0], value / MAX_TRANSLATE, selectedCylinder.translate[2]); // translates y value    
}

// Translate Z
function onChangeTranslateZ(value) {
    // Get the selected Cylinder
    let selector = document.getElementById("cylSelect");
    let selectedCylinder = cylinders[selector.value];

    selectedCylinder.setTranslate(selectedCylinder.translate[0], selectedCylinder.translate[1], value / MAX_TRANSLATE); // translates z value    
}

// --------------- Rotation Functions ---------------
// Rotate X
function onChangeRotateX(value) {
    // Get the selected Cylinder
    let selector = document.getElementById("cylSelect");
    let selectedCylinder = cylinders[selector.value];

    selectedCylinder.setRotate(value, selectedCylinder.rotate[1], selectedCylinder.rotate[2]); // rotates x value
}

// Rotate Y
function onChangeRotateY(value) {
    // Get the selected Cylinder
    let selector = document.getElementById("cylSelect");
    let selectedCylinder = cylinders[selector.value];

    selectedCylinder.setRotate(selectedCylinder.rotate[0], value, selectedCylinder.rotate[2]); // rotates y value
}

// Rotate Z
function onChangeRotateZ(value) {
    // Get the selected Cylinder
    let selector = document.getElementById("cylSelect");
    let selectedCylinder = cylinders[selector.value];

    selectedCylinder.setRotate(selectedCylinder.rotate[0], selectedCylinder.rotate[1], value); // rotates z value
}

// --------------- Scaling Functions ---------------
let MAX_SCALE = 200;
// Scale X
function onChangeScaleX(value) {
    // Get the selected Cylinder
    let selector = document.getElementById("cylSelect");
    let selectedCylinder = cylinders[selector.value];

    selectedCylinder.setScale(value / MAX_SCALE, selectedCylinder.scale[1], selectedCylinder.scale[2]); // scales x value
}

// Scale Y
function onChangeScaleY(value) {
    // Get the selected Cylinder
    let selector = document.getElementById("cylSelect");
    let selectedCylinder = cylinders[selector.value];

    selectedCylinder.setScale(selectedCylinder.scale[0], value / MAX_SCALE, selectedCylinder.scale[2]); // scales y value
}

// Scale Z
function onChangeScaleZ(value) {
    // Get the selected Cylinder
    let selector = document.getElementById("cylSelect");
    let selectedCylinder = cylinders[selector.value];

    selectedCylinder.setScale(selectedCylinder.scale[0], selectedCylinder.scale[1], value / MAX_SCALE); // scales z value
}

// Zoom Slider for Camera
function onZoomInput(value) {
    camera.zoom(1.0 + value/10);
}

// Adds event listeners for keyboard input
window.addEventListener("keydown", function(event) {
    let speed = 1.0;
    switch(event.key) {
        case "w":
            camera.moveForward(speed);
            break;
        case "a":
            camera.moveSideways(0.5);
            break;
        case "s":
            camera.moveForward(-speed);
            break;
        case "d":
            camera.moveSideways(-0.5);
            break;
        case "i":
            camera.tilt(-10);
            break;
        case "k":
            camera.tilt(10);
            break;
        case "j":
            camera.pan(10);
            break;
        case "l":
            camera.pan(-10);
            break;
    }
});

// ---------- Hex Value -> RGB Coordinates ----------
// Received help on StackOverflow https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
}

// --------------- Main Function ---------------
function main() {
    // Retrieving the canvas tag from html document
    canvas = document.getElementById("canvas");

    // Get the rendering context for 2D drawing (vs WebGL)
    gl = canvas.getContext("webgl");
    if(!gl) {
        console.log("Failed to get webgl context");
        return -1;
    }

    // Clear screen
    gl.enable(gl.DEPTH_TEST);

    gl.clearColor(0.8, 0.8, 0.8, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Compiling both shaders and sending them to the GPU
    if(!initShaders(gl, VSHADER, FSHADER)) {
        console.log("Failed to initialize shaders.");
        return -1;
    }

    // Retrieve uniforms from shaders
    u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
    u_NormalMatrix = gl.getUniformLocation(gl.program, "u_NormalMatrix");
    u_ViewMatrix = gl.getUniformLocation(gl.program, "u_ViewMatrix");
    u_ProjMatrix = gl.getUniformLocation(gl.program, "u_ProjMatrix");

    u_Color = gl.getUniformLocation(gl.program, "u_Color");
    u_ambientColor = gl.getUniformLocation(gl.program, "u_ambientColor");
    u_diffuseColor1 = gl.getUniformLocation(gl.program, "u_diffuseColor1");
    u_diffuseColor2 = gl.getUniformLocation(gl.program, "u_diffuseColor2");
    u_specularColor = gl.getUniformLocation(gl.program, "u_specularColor");
    u_specularAlpha = gl.getUniformLocation(gl.program, "u_specularAlpha");

    u_lightPosition = gl.getUniformLocation(gl.program, "u_lightPosition");
    u_lightDirection = gl.getUniformLocation(gl.program, "u_lightDirection");

    u_eyePosition = gl.getUniformLocation(gl.program, "u_eyePosition");

    vertexBuffer = initBuffer("a_Position", 3);
    normalBuffer = initBuffer("a_Normal", 3);

    indexBuffer = gl.createBuffer();
    if(!indexBuffer) {
        console.log("Can't create buffer.")
        return -1;
    }

    // Set light data
    gl.uniform3f(u_ambientColor, 0.2, 0.2, 0.2);
    gl.uniform3f(u_diffuseColor1, 0.8, 0.8, 0.8);   // point light
    gl.uniform3f(u_diffuseColor2, 0.8, 0.8, 0.8);   // directional light
    gl.uniform3f(u_specularColor, 1.0, 1.0, 1.0);

    gl.uniform1f(u_specularAlpha, 32.0);

    gl.uniform3fv(u_eyePosition, eyePosition.elements);
    gl.uniform3fv(u_lightPosition, lightPosition.elements);
    gl.uniform3fv(u_lightDirection, lightDirection.elements);

    // Places down scene of objects
    drawScene();

    // Set camera data
    camera = new Camera("perspective");

    draw();
}

// --------------- Camera Reset ---------------
function resetCamera() {
    camera.eye = new Vector3([0, 0, 5]);
    camera.center = new Vector3([0, 0, 0]);
    camera.up = new Vector3([0, 1, 0]);
    camera.updateView();
}

// --------------- Changing Camera Projection ---------------
function switchCameraPerspective(type) {
    camera.changePerspective(type);
}

// ---------- Check Light Sources ----------
// Updates Point Light
function updatePointLight(toggle) {
    if(toggle.checked) {    // if the point light toggle slider is on
        // make the light source exist in the world
        lightPosition.elements[0] = -0.75;
        lightPosition.elements[1] = -0.75;
        lightPosition.elements[2] = -0.75;
        gl.uniform3fv(u_lightPosition, lightPosition.elements);
        // place lighting back on objects
        gl.uniform3f(u_diffuseColor1, 0.8, 0.8, 0.8);
    } else if(!toggle.checked) {    // if they want to turn off lighting
        // pass in black lighting
        lightPosition.elements[0] = 0.0;
        lightPosition.elements[1] = 0.0;
        lightPosition.elements[2] = 0.0;
        gl.uniform3fv(u_lightPosition, lightPosition.elements);
        // remove lighting to only show ambient
        gl.uniform3f(u_diffuseColor1, 0.0, 0.0, 0.0);
        gl.uniform3f(u_specularColor, 0.0, 0.0, 0.0);
    }
}

// Updates Directional Light
function updateDirectionalLight(toggle) {
    if(toggle.checked) {
        // make the light source exist in the world
        lightDirection.elements[0] = 1.0;
        lightDirection.elements[1] = 1.0;
        lightDirection.elements[2] = -1.0;
        gl.uniform3fv(u_lightDirection, lightDirection.elements);
        // place lighting back on objects
        gl.uniform3f(u_diffuseColor2, 0.8, 0.8, 0.8);
    } else if(!toggle.checked) {
        // pass in black lighting
        lightDirection.elements[0] = 0.0;
        lightDirection.elements[1] = 0.0;
        lightDirection.elements[2] = 0.0;
        gl.uniform3fv(u_lightDirection, lightDirection.elements);
        // remove lighting to only show ambient
        gl.uniform3f(u_diffuseColor2, 0.0, 0.0, 0.0);
        gl.uniform3f(u_specularColor, 0.0, 0.0, 0.0);
    }
}

// Updates the current shaders
function updateShaders() {
    drawShading = document.getElementById("shading").value;
}

// Adds new cylinder to array of objects to draw
function addNewCylinder() {
    // Add an option in the selector
    let selector = document.getElementById("cylSelect");
    let cylOption = document.createElement("option");
    cylOption.text = "Cylinder " + cylinders.length;
    cylOption.value = cylinders.length - 1;
    selector.add(cylOption);

    // Activate the cylinder we just created
    selector.value = cylOption.value;
}

// --------------- Creates Scene ---------------
function drawScene() {
    // Floor
    let cyl1 = new Cylinder(4, [1.0, 0.55, 0.0]);
    cylinders.push(cyl1);
    cyl1.setTranslate(0.0, -1.0, 0.0);
    cyl1.setRotate(90.0, 0.0, 0.0);
    cyl1.setScale(5.0, 5.0, 0.5);
    addNewCylinder();
    // Bed 1
    let cyl2 = new Cylinder(4, [1.0, 1.0, 1.0]);
    cylinders.push(cyl2);
    cyl2.setTranslate(-1.0, -1.0, -2.5);
    cyl2.setRotate(180.0, 45.0, 45.0);
    cyl2.setScale(0.75, 0.75, 2.25);
    addNewCylinder();
    // Bed 2
    let cyl3 = new Cylinder(4, [1.0, 1.0, 1.0]);
    cylinders.push(cyl3);
    cyl3.setTranslate(2.5, -1.0, 1.0);
    cyl3.setRotate(180.0, 45.0, 45.0);
    cyl3.setScale(0.75, 0.75, 2.25);
    addNewCylinder();
    // Table Part 1
    let cyl4 = new Cylinder(6, [0.8, 0.55, 0.0])
    cylinders.push(cyl4);
    cyl4.setTranslate(1.0, -0.55, -3.0);
    cyl4.setRotate(0.0, -45.0, 0.0);
    cyl4.setScale(0.05, 0.5, 1.5);
    addNewCylinder();
    // Table Part 2
    let cyl5 = new Cylinder(6, [0.8, 0.55, 0.0])
    cylinders.push(cyl5);
    cyl5.setTranslate(3.0, -0.55, -1.0);
    cyl5.setRotate(0.0, -45.0, 0.0);
    cyl5.setScale(0.05, 0.5, 1.5);
    addNewCylinder();
    // Table Part 3
    let cyl6 = new Cylinder(6, [0.8, 0.55, 0.0])
    cylinders.push(cyl6);
    cyl6.setTranslate(3.0, -0.55, -1.0);
    cyl6.setRotate(0.0, -135.0, 0.0);
    cyl6.setScale(0.05, 0.5, 2.8);
    addNewCylinder();
    // Table Part 4
    let cyl7 = new Cylinder(5, [0.5, 0.25, 0.0])
    cylinders.push(cyl7);
    cyl7.setTranslate(0.4, -0.1, -2.5);
    cyl7.setRotate(0.0, 45.0, -90.0);
    cyl7.setScale(0.15, 1.0, 3.0);
    addNewCylinder();
    // Mallet Handle
    let cyl8 = new Cylinder(10, [0.0, 0.8, 0.0]);
    cylinders.push(cyl8);
    cyl8.setTranslate(-0.5, -0.95, 2.0);
    cyl8.setRotate(-30.0, 60.0, 0.0);
    cyl8.setScale(0.065, 0.065, 0.8);
    addNewCylinder();
    // Mallet Head
    let cyl9 = new Cylinder(20, [0.6, 0.0, 0.6]);
    cylinders.push(cyl9);
    cyl9.setTranslate(0.5, -0.75, 2.0);
    cyl9.setRotate(0.0, -30.0, 0.0);
    cyl9.setScale(0.25, 0.25, 1.0);
    addNewCylinder();
    // Flashlight Base
    let cyl10 = new Cylinder(25, [0.15, 0.15, 0.15]);
    cylinders.push(cyl10);
    cyl10.setTranslate(-1.0, -0.25, -1.0);
    cyl10.setRotate(90.0, 0.0, 0.0);
    cyl10.setScale(0.1, 0.1, 0.75);
    addNewCylinder();
    // Flashlight Head
    let cyl11 = new Cylinder(12, [0.15, 0.15, 0.15]);
    cylinders.push(cyl11);
    cyl11.setTranslate(-1.0, -0.15, -1.0);
    cyl11.setRotate(90.0, 0.0, 0.0);
    cyl11.setScale(0.15, 0.15, 0.15);
    addNewCylinder();
}

// --------------- Camera Animation ---------------
function requestAnimation() {
    if(animate == false) {
        animate = true;
    } else {
        animate = false;
    }
    resetCamera();
    doAnimation();
}

function doAnimation() {
    if(animate == true) {
        camera.pan(-2 / 10);
        camera.moveSideways(2 / 100);
        requestAnimationFrame(doAnimation);
    }
}