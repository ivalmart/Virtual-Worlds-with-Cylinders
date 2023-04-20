// Shaders (GLSL)
let VSHADER=`
    precision mediump float;
    attribute vec3 a_Position; // (x,y)
    void main() {
        gl_Position = vec4(a_Position, 1.0);
    }
`;

let FSHADER=`
    precision mediump float;
    void main() {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
`;

// condition for if the user chooses to draw the end caps or not
capBool = false;

// stores the most recent coordinate arrays and polygon arrays for file saving purposes
let currentCoor;
let currentPoly;

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
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Compiling both shaders and sending them to the GPU
    if(!initShaders(gl, VSHADER, FSHADER)) {
        console.log("Failed to initialize shaders.");
        return -1;
    }

}

// to clear the canvas
function clear() {
    // Draw a black rectangle
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

// creates the cylinder on the canvas 
function handleDrawEvent() {
    // clears canvas
    clear();

    let nValue = document.getElementById("nValue").value;   // receives user input
    let numVal = parseInt(nValue);      // parses the user input as an int rather than a string
    // creates coordinates for every point of the cylinder
    let coordinates = calculateCoordinates(numVal);     // Float32Array
    // creates indices for every coordinate of the cylinder
    let index = orderOfIndices(numVal);

    // passes in the updated coor and poly for saving files before index is potentially modified
    updateCoorAndPoly(coordinates, index);      // Uint16Array

    if(!capBool) {          // true if user does not want to draw end caps, does not enter if user asked for it
        index = noCapIndices(numVal);           // Uint16Array
    }

    let vertexBuffer = gl.createBuffer();
    if(!vertexBuffer) {
        console.log("Can't create buffer.")
        return -1;
    }

    // Telling the GPU that vertexBuffer contains vertex data
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    // Config. the GPU to read the triangle array in pairs of 2-by-2 coordinates
    let a_Position = gl.getAttribLocation(gl.program, "a_Position");
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    // Send the triangle to the GPU (storing data in vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, coordinates, gl.STATIC_DRAW);

    let indexBuffer = gl.createBuffer();
    if(!indexBuffer) {
        console.log("Can't create buffer.")
        return -1;
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);    
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index, gl.STATIC_DRAW);
    gl.drawElements(gl.LINE_LOOP, index.length, gl.UNSIGNED_SHORT, 0);
}

// locates all the coordinates needed to create the cylinder
function calculateCoordinates(n) {
    // creates new Float32Array
    let cords = new Float32Array(((n * 2) + 2) * 3);

    // sets what angle each point needs in terms of distance
    let angleConvert = 360 / n;
    // changes angle on the unit circle to move on to the next point
    let newAngle = 0;
    // starts at the front
    let z = 0;
    // sets origin point for the back face (z = 0)
    cords[0] = 0;
    cords[1] = 0;
    cords[2] = 0;

    for(i = 3; i < cords.length; i += 3) {
        // once it has done a full rotation, reset rotation and switch to new face
        if(Math.round(newAngle) >= 360) {       // rounds the newest angle to see if it will already do a full rotation
            newAngle = 0;
            z = 1;
            // sets origin point for the front face (z = 1)
            cords[i] = 0;
            cords[i + 1] = 0;
            cords[i + 2] = 1;
            // increments ahead
            i += 3;
        }

        let x = Math.cos((newAngle) * (Math.PI/180)); // calculates new x     
        let y = Math.sin((newAngle) * (Math.PI/180)); // calculates new y
        console.log(`(${x}, ${y})`);

        cords[i] = x;
        cords[i + 1] = y;
        cords[i + 2] = z; // sets what face/side it is on

        newAngle += angleConvert;   // adds angle to go along the unit circle
    }
    return cords;
}

// creates the indices needed to draw each triangle of the cylinder with caps included
function orderOfIndices(n) {
    let indices = new Uint16Array((n * 3) * 4);
    let index = 0; // index for the array of indices
    // stores index order for back plane (z = 0)
    // ex./ n = 3 -- goes from indices 0-3

    // note: index++ just goes on to the next index of the array once it has finished storing what index was at originally
    for(i = 0; i < n; i++) {    // loops through each i to create a set of indices
        indices[index++] = 0;             // index order #1
        indices[index++] = i + 1;     // index order #2
        if(i + 2 > n) {
            indices[index++] = 1; // if it exceeds over n, it loops back
        } else {
            indices[index++] = i + 2; // index order #3
        }
    }

    // stores index order for front plane (z = 1)
    // ex./ n = 3 -- goes from indices 4-7 with m starting at 4 for the front
    let m = n + 1;  // to organize the new order format
    for(i = 0; i < n; i++) {    // loops through each i to create a set of indices
        indices[index++] = m;                 // index order #1
        indices[index++] = m + i + 1;     // index order #2
        if(i + 2 > n) {
            indices[index++] = m + 1; // if it exceeds over, it loops back
        } else {
            indices[index++] = m + i + 2; // index order #3
        }
    }

    // stores index order to connect the back to the front
    for(i = 0; i < n; i++) {    // loops through each i to create 2 sets of indices
        if(i < n - 1) {     // stores from the start and ends right before the last coordinate condition
            // first set of indices
            indices[index++] = i + 1;             // index order #1
            indices[index++] = i + 2;         // index order #2
            indices[index++] = i + (n + 3);   // index order #3
            // second set of indices
            indices[index++] = i + (n + 3);   // index order #1
            indices[index++] = i + (n + 2);   // index order #2
            indices[index++] = i + 1;         // index order #3
        } else {    // finishes off last 2 sets of indices
            // first set of indices
            indices[index++] = i + 1;             // index order #1
            indices[index++] = 1;             // index order #2
            indices[index++] = n + 2;         // index order #3
            // second set of indices
            indices[index++] = n + 2;         // index order #1
            indices[index++] = i + (n + 2);   // index order #2
            indices[index++] = i + 1;         // index order #3
        }
    }

    return indices;
}

// creates indices of each triangle of the cylinder for when the user does not want end caps
function noCapIndices(n) {
    let indices = new Uint16Array((n * 3) * 2);
    let index = 0; // index for the array of indices

    // stores index order to connect the back to the front
    // note: index++ just goes on to the next index of the array once it has finished storing what index was at originally
    for(i = 0; i < n; i++) {    // loops through each i to create 2 sets of indices
        if(i < n - 1) {     // stores from the start and ends right before the last coordinate condition
            // first set of indices
            indices[index++] = i + 1;             // index order #1
            indices[index++] = i + 2;         // index order #2
            indices[index++] = i + (n + 3);   // index order #3
            // second set of indices
            indices[index++] = i + (n + 3);   // index order #1
            indices[index++] = i + (n + 2);   // index order #2
            indices[index++] = i + 1;         // index order #3
        } else {    // finishes off last 2 sets of indices
            // first set of indices
            indices[index++] = i + 1;             // index order #1
            indices[index++] = 1;             // index order #2
            indices[index++] = n + 2;         // index order #3
            // second set of indices
            indices[index++] = n + 2;         // index order #1
            indices[index++] = i + (n + 2);   // index order #2
            indices[index++] = i + 1;         // index order #3
        }
    }

    return indices;
}

// switches the value of the variable when the draw cap checkbox is clicked on
function adjustCapCondition(cap) {
    if(cap.checked) {           // sets the universal cap condition to true
        capBool = true;
    } else if(!cap.checked) {   // sets the universal cap condition to false
        capBool = false;
    }
}

// updates global coor and poly for raw values of what was made
function updateCoorAndPoly(coor, poly) {
    currentCoor = coor;
    currentPoly = poly;
}

// --------------- Save Functions --------------- //
function saveCoor(filename) {
    // creates the formatted document containing all coordinates
    let stringCoor = formatCoor(filename);

    var savedata = document.createElement('a');
    savedata.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(stringCoor));
    savedata.setAttribute('download', filename);
    savedata.style.display = 'none';
    document.body.appendChild(savedata);
    savedata.click();
    document.body.removeChild(savedata);
}

function savePoly(filename) {
    // creates the formatted document containing all polygons
    let stringPoly = formatPoly(filename);

    var savedata = document.createElement('a');
    savedata.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(stringPoly));
    savedata.setAttribute('download', filename);
    savedata.style.display = 'none';
    document.body.appendChild(savedata);
    savedata.click();
    document.body.removeChild(savedata);
}

// -- Format Save Files -- //
function formatCoor(filename) {
    // creates the first formatted line ex./ #(filename)
    let result = "#" + filename;
    // inserts how many points there are
    result += '\n' + (currentCoor.length / 3);

    let k = 0;      // index for the coordinate array
    // loops through all coordinates and formats them along with each point
    for(i = 1; i <= currentCoor.length / 3; i++) {
        result += '\n' + i + "," +          // places down next index of coordinates
                  currentCoor[k++].toFixed(3) + "," +  // sets first coordiante of the point
                  currentCoor[k++].toFixed(3) + "," +  // sets second coordiante of the point
                  currentCoor[k++].toFixed(3);         // sets third coordiante of the point + newline for next coords
    }

    return result;
}

function formatPoly(filename) {
    // creates the first formatted line ex./ #(filename)
    let result = "#" + filename;
    // inserts how many polygons there are
    result += '\n' + (currentPoly.length / 3);

    let k = 0;      // index for the poly array
    // loops through all poly coordinates and formats them along with which triangle it is
    for(i = 1; i <= currentPoly.length / 3; i++) {
        result += '\n' + "tri" + i + " " +  // places down next triangle of coords
                  currentPoly[k++] + " " +  // sets first coord of the triangle
                  currentPoly[k++] + " " +  // sets second coord of the triangle
                  currentPoly[k++];         // sets third coord of the triangle
    }        

    return result;
}