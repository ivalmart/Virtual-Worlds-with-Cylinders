class Cylinder {
    constructor(nSize, color) {        // n = number of sides 
        // Coordinates
        this.vertices = this.setVertices(nSize);

        // Normals for Flat Shading
        this.flatNormals = this.setFlatNormals(nSize);

        // Normals for Smooth Shading
        this.smoothNormals = this.setSmoothNormals(nSize);

        // Current normals set for shading
        this.normals = this.flatNormals;

        // Indices of the Vertices
        this.indices = this.setIndices(nSize);

        // Sets the color of the cylinder
        this.color = color;

        // Sets the transformations
        this.translate = [0.0, 0.0, 0.0];
        this.rotate    = [0.0, 0.0, 0.0];
        this.scale     = [1.0, 1.0, 1.0];
    }

    // Sets scaled values
    setScale(x, y, z) {
        this.scale[0] = x;
        this.scale[1] = y;
        this.scale[2] = z;
    }
    // Sets rotated values
    setRotate(x, y, z) {
        this.rotate[0] = x;
        this.rotate[1] = y;
        this.rotate[2] = z;
    }
    // Sets translated values
    setTranslate(x, y, z) {
        this.translate[0] = x;
        this.translate[1] = y;
        this.translate[2] = z;
    }

    // --------------- Vertices Calculation ---------------
    setVertices(n) {
        // 6n + 2 vertices -- x3 for (x, y, z) -- extra 2 for top/bottom cap origins
        let vertices = new Float32Array(((6 * n) + 2) * 3);
        let angleConvert = 360 / n;     // angle to traverse through the unit circle
        let newAngle = 0;   // current angle of the unit circle

        // creates all the sides/faces of the cylinder
        // 4n vertices (0 -> 4n-1)
        let i = 0;      // index for coordinates
        while(i <= ((4 * n) - 1) * 3 && Math.round(newAngle) < 360) {
            vertices[i++] = Math.cos((newAngle) * (Math.PI/180)); // top left
            vertices[i++] = Math.sin((newAngle) * (Math.PI/180));
            vertices[i++] = 0.0;
    
            vertices[i++] = Math.cos((newAngle) * (Math.PI/180)); // bottom left
            vertices[i++] = Math.sin((newAngle) * (Math.PI/180));
            vertices[i++] = 1.0;

            newAngle += angleConvert;       // moves to the next part of the unit circle

            vertices[i++] = Math.cos((newAngle) * (Math.PI/180)); // bottom right
            vertices[i++] = Math.sin((newAngle) * (Math.PI/180));
            vertices[i++] = 1.0;

            vertices[i++] = Math.cos((newAngle) * (Math.PI/180)); // top right
            vertices[i++] = Math.sin((newAngle) * (Math.PI/180));
            vertices[i++] = 0.0;
        }

        // creates the top cap of the cylinder
        // i = 4n currently / n + 1 vertices (4n -> 5n)
        // origin point for the top
        vertices[i++] = 0.0;
        vertices[i++] = 0.0;
        vertices[i++] = 0.0;

        let currLoop = 0;   // keeps count of how many faces it has gone through
        let currFace = 0;   // keeps track for the vertex faces on the top
        while(currLoop < n) {     // iterates through n sides/faces
            vertices[i++] = vertices[currFace++]; // takes top left of each face
            vertices[i++] = vertices[currFace++];
            vertices[i++] = vertices[currFace++];

            currFace += 9;  // skips the next 3 vertices and proceeds to the next face on the top left
            currLoop++;
        }

        // creates the bottom cap of the cylinder
        // i = 5n + 1 currently / n + 1 vertices (5n+1 -> 6n+2)
        // origin point for the bottom
        vertices[i++] = 0.0;
        vertices[i++] = 0.0;
        vertices[i++] = 1.0;

        currLoop = 0;       // resets count for the bottom cap
        currFace = 3;       // resets what face it is currenty on and starts at the bottom vertices of the faces
        while(currLoop < n) {   // iterates through n sides/faces
            vertices[i++] = vertices[currFace++]; // takes bottom left of each face
            vertices[i++] = vertices[currFace++];
            vertices[i++] = vertices[currFace++];

            currFace += 9;  // skips the next 3 vertices and proceeds to the next face on the top left
            currLoop++;
        }

        return vertices;
    }

    // --------------- Set Flat Normals ---------------
    setFlatNormals(n) {
        // 6n + 2 normals -- x3 for (x, y, z) -- extra 2 for top/bottom cap origins
        let normals = new Float32Array(((6 * n) + 2) * 3);
        let i = 0;      // iterator of the normal index
        // calculates the normals of two vectors on the faces
        while(i < ((4 * n) - 1) * 3) {
            // A / top left
            let firstVertex = new Vector3([this.vertices[i], this.vertices[i+1], this.vertices[i+2]]);
            // B / bottom left / will be the anchor point
            let secondVertex = new Vector3([this.vertices[i+3], this.vertices[i+4], this.vertices[i+5]]);
            // C / bottom right
            let thirdVertex = new Vector3([this.vertices[i+6], this.vertices[i+7], this.vertices[i+8]]);

            secondVertex = secondVertex.sub(firstVertex);    // B - A
            thirdVertex = thirdVertex.sub(firstVertex);    // C - A

            let normalVal = Vector3.cross(thirdVertex, secondVertex);    // B-A x C-A

            // sets normals in the normal array
            // once it reaches the top right vertex, it automatically proceeds to the next face
            normals[i++] = normalVal.elements[0];    // sets normal for top left
            normals[i++] = normalVal.elements[1];
            normals[i++] = normalVal.elements[2];

            normals[i++] = normalVal.elements[0];    // sets normal for bottom left
            normals[i++] = normalVal.elements[1];
            normals[i++] = normalVal.elements[2];

            normals[i++] = normalVal.elements[0];    // sets normal for bottom right
            normals[i++] = normalVal.elements[1];
            normals[i++] = normalVal.elements[2];

            normals[i++] = normalVal.elements[0];    // sets normal for top right
            normals[i++] = normalVal.elements[1];
            normals[i++] = normalVal.elements[2];
        }

        // calculates the normals of the top and bottom cap vertices
        for(let numberOfCaps = 0; numberOfCaps < 2; numberOfCaps++) {   // numberOfCaps = 0: top cap / numberOfCaps = 1: bottom cap
            let v1 = new Vector3([this.vertices[i], this.vertices[i+1], this.vertices[i+2]]);   // A / Top Origin / Anchor Point
            let v2 = new Vector3([this.vertices[i+3], this.vertices[i+4], this.vertices[i+5]]);   // B / left point of triangle
            let v3 = new Vector3([this.vertices[i+6], this.vertices[i+7], this.vertices[i+8]]);   // C / right point of triangle

            v2 = v2.sub(v1);    // B - A
            v3 = v3.sub(v1);    // C - A

            let v4 = Vector3.cross(v3, v2);     // B-A x C-A normal
            let capLimit = 0;   // counts how many faces it has gone through
            while(capLimit <= n) {      // stops before it loops back to the first vertex it started at
                normals[i++] = v4.elements[0];
                normals[i++] = v4.elements[1];
                normals[i++] = v4.elements[2];
                capLimit++;
            }
        }

        return normals;
    }

    // --------------- Set Smooth Normals ---------------
    setSmoothNormals(n) {
        // 6n + 2 normals -- x3 for (x, y, z) -- extra 2 for top/bottom cap origins
        let normals = new Float32Array(((6 * n) + 2) * 3);
        let i = 6;  // starts on the right side of a given face / starts at bottom left vertex (skips ahead 2 sets of coords)
        // sets new normals for the side faces of the cylinders
        while(i < ((4 * n) - 2) * 3) {
            let bottomVertex1 = new Vector3([this.flatNormals[i], this.flatNormals[i+1], this.flatNormals[i+2]]);
            let topVertex1 = new Vector3([this.flatNormals[i+3], this.flatNormals[i+4], this.flatNormals[i+5]]);
            let topVertex2 = new Vector3([this.flatNormals[i+6], this.flatNormals[i+7], this.flatNormals[i+8]]);
            let bottomVertex2 = new Vector3([this.flatNormals[i+9], this.flatNormals[i+10], this.flatNormals[i+11]]);
            // sums vertices to place into according vertices
            bottomVertex1 = bottomVertex1.add(bottomVertex2);
            topVertex1 = topVertex1.add(topVertex2);
            // passes vertices to the bottom vector of the 1st face
            normals[i++] = bottomVertex1.elements[0];
            normals[i++] = bottomVertex1.elements[1];
            normals[i++] = bottomVertex1.elements[2];
            // passes vertices to the top vector of the 1st face
            normals[i++] = topVertex1.elements[0];
            normals[i++] = topVertex1.elements[1];
            normals[i++] = topVertex1.elements[2];
            // continues to place top vector for the 2nd face
            normals[i++] = topVertex1.elements[0];
            normals[i++] = topVertex1.elements[1];
            normals[i++] = topVertex1.elements[2];
            // continues to place bottom vector for the 2nd face
            normals[i++] = bottomVertex1.elements[0];
            normals[i++] = bottomVertex1.elements[1];
            normals[i++] = bottomVertex1.elements[2];
        }
        // leaves while loop once it reaches the last 2 vertices that are connected to the first two vertices created
        // combines v0 and v1 to v(4n-1) and v(4n-2) accordingly
        let firstBottomVertex1 = new Vector3([this.flatNormals[i], this.flatNormals[i+1], this.flatNormals[i+2]]);
        let firstTopVertex1 = new Vector3([this.flatNormals[i+3], this.flatNormals[i+4], this.flatNormals[i+5]]);
        let firstTopVertex2 = new Vector3([this.flatNormals[0], this.flatNormals[1], this.flatNormals[2]]);
        let firstbottomVertex2 = new Vector3([this.flatNormals[3], this.flatNormals[4], this.flatNormals[5]]);
        // sum normals
        firstBottomVertex1 = firstBottomVertex1.add(firstbottomVertex2);
        firstTopVertex1 = firstTopVertex1.add(firstTopVertex2);
        // sets v(4n-2) / goes with v0
        normals[i++] = firstBottomVertex1.elements[0];
        normals[i++] = firstBottomVertex1.elements[1];
        normals[i++] = firstBottomVertex1.elements[2];
        // sets v(4n-1) / goes with v1
        normals[i++] = firstTopVertex1.elements[0];
        normals[i++] = firstTopVertex1.elements[1];
        normals[i++] = firstTopVertex1.elements[2];
        // sets v0
        normals[0] = firstTopVertex1.elements[0];
        normals[1] = firstTopVertex1.elements[1];
        normals[2] = firstTopVertex1.elements[2];
        // sets v1
        normals[3] = firstBottomVertex1.elements[0];
        normals[4] = firstBottomVertex1.elements[1];
        normals[5] = firstBottomVertex1.elements[2];

        // leaves the top and bottom cap vertices alone and just inserts them
        while(i < normals.length - 1) {
            normals[i++] = this.flatNormals[i];
        }

        return normals;
    }

    // --------------- Set Indices ---------------
    setIndices(n) {
        // 12n indices to create triangle
        let indices = new Uint16Array(n * 12);
        let i = 0;
        let index = 0;  // iterator through the array
        let loopCondition = 4 * n;  // makes it clearer on the condition

        // creates indices for the sides/faces
        while(i < loopCondition) {
            // creates first triangle
            indices[index++] = i;
            indices[index++] = i + 1;
            indices[index++] = i + 2;
            // createsfirstd triangle
            indices[index++] = i;
            indices[index++] = i + 2;
            indices[index++] = i + 3;
            // goes onto the next face
            i += 4;
        }

        // creates indices for the top cap
        // i = 6n / 3n more indices = 9n indices
        let origin = i; // stores the index of the origin as to not iterate it
        loopCondition += n + 1;
        i++;        // moves to the next index to loop around the cylinder
        while(i < loopCondition - 1) {      // goes in the range of 4n -> 5n    16-20
            indices[index++] = origin;  // always points to the origin
            indices[index++] = i;
            indices[index++] = i + 1;
            i++;

            if(i == loopCondition - 1) {    // if it is reaching the first index of the top
                indices[index++] = origin;
                indices[index++] = i;
                indices[index++] = origin + 1;  // loops it back to the first index of the top cap
                i++;
            }
        }

        // creates indices for the bottom cap
        // i = 9n / 3n more indices = 12n indices
        origin = i; // stores the index of the origin as to not iterate it
        loopCondition += n + 1;
        i++;        // moves to the next index to loop around the cylinder
        while(i < loopCondition - 1) {      // goes in the range of 5n + 1 -> 6n + 1
            indices[index++] = origin;  // always points to the origin
            indices[index++] = i;
            indices[index++] = i + 1;
            i++;

            if(i == loopCondition - 1) {    // if it is reaching the first index of the bottom
                indices[index++] = origin;
                indices[index++] = i;
                indices[index++] = origin + 1;  // loops it back to the first index of the bottom cap
                i++;
            }
        }

        return indices;
    }
}