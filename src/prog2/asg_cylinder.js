class Cylinder {
    constructor(nSize, color) {        // n = number of sides        
        // Coordinates
        this.vertices = this.setVertices(nSize);

        // Normals
        this.normals = this.setNormals(nSize);

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
            vertices[i++] = 1.0;
    
            vertices[i++] = Math.cos((newAngle) * (Math.PI/180)); // bottom left
            vertices[i++] = Math.sin((newAngle) * (Math.PI/180));
            vertices[i++] = 0.0;

            newAngle += angleConvert;       // moves to the next part of the unit circle

            vertices[i++] = Math.cos((newAngle) * (Math.PI/180)); // bottom right
            vertices[i++] = Math.sin((newAngle) * (Math.PI/180));
            vertices[i++] = 0.0;

            vertices[i++] = Math.cos((newAngle) * (Math.PI/180)); // top right
            vertices[i++] = Math.sin((newAngle) * (Math.PI/180));
            vertices[i++] = 1.0;
        }

        // creates the top cap of the cylinder
        // i = 4n currently / n + 1 vertices (4n -> 5n)
        // origin point for the top
        vertices[i++] = 0.0;
        vertices[i++] = 0.0;
        vertices[i++] = 1.0;

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
        vertices[i++] = 0.0;

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

    // --------------- Set Normals ---------------
    setNormals(n) {
        // 6n + 2 normals -- x3 for (x, y, z) -- extra 2 for top/bottom cap origins
        let normals = new Float32Array(((6 * n) + 2) * 3);
        let i = 0;      // iterator of the normal index
        // calculates the normals of two vectors on the faces
        while(i < ((4 * n) - 1) * 3) {
            // B / top left
            let firstVertex = new Vector3([this.vertices[i], this.vertices[i+1], this.vertices[i+2]]);
            // A / bottom left / will be the anchor point
            let secondVertex = new Vector3([this.vertices[i+3], this.vertices[i+4], this.vertices[i+5]]);
            // C / bottom right
            let thirdVertex = new Vector3([this.vertices[i+6], this.vertices[i+7], this.vertices[i+8]]);

            firstVertex = firstVertex.sub(secondVertex);    // B - A
            thirdVertex = thirdVertex.sub(secondVertex);    // C - A

            let normalVal = Vector3.cross(firstVertex, thirdVertex);    // B-A x C-A

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

            let v4 = Vector3.cross(v2, v3);     // B-A x C-A normal
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
            // creates second triangle
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