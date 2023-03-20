class Camera {
    constructor(cameraType) {
        // they both start at the z-axis
        this.eye = new Vector3([0, 0, 5]);
        this.center = new Vector3([0, 0, 0]);
        this.up = new Vector3([0, 1, 0]);

        this.fow = 60;
        this.near = 0.1;
        this.far = 1000;

        this.cameraType = cameraType;

        this.projMatrix = new Matrix4();
        if(cameraType == "perspective") {
            this.projMatrix.setPerspective(this.fow,      // the place to change zoom
                canvas.width/canvas.height, this.near, this.far);    
        } else if(cameraType == "orthographic") {
            this.projMatrix.setOrtho(-1, 1, -1, 1, this.near, this.far);
        }

        this.viewMatrix = new Matrix4();
        this.updateView();
    }

    moveForward(scale) {
        // Compute forward vector
        let forward = new Vector3(this.center.elements);
        forward.sub(this.eye);
        forward.normalize();
        forward.mul(scale);

        // Add forward vector to eye and center
        this.eye.add(forward);
        this.center.add(forward);

        this.updateView();
    }

    moveSideways(scale) {
        // Compute the left/right vector with respect to the eye and center (hint: use cross product)
        let forward = new Vector3(this.center.elements);
        forward.sub(this.eye);
        let side = Vector3.cross(this.up, forward);
        side.normalize();
        side.mul(scale);

        // Add left or right vector to eye and center
        this.eye.add(side);
        this.center.add(side);

        this.updateView();
    }

    zoom(scale) {
        if(this.cameraType == "perspective") {
            this.projMatrix.setPerspective(this.fow * scale,      // the place to change zoom
                canvas.width/canvas.height, this.near, this.far);
        }
    }

    pan(angle) {
        // Compute forward vector
        let forward = new Vector3(this.center.elements);
        forward.sub(this.eye);

        // Rotate center point around the up vector
        let rotMatrix = new Matrix4();
        rotMatrix.setRotate(angle, 
                            this.up.elements[0],
                            this.up.elements[1],
                            this.up.elements[2]);

        // Rotate forward vector around up vector
        let forward_prime = rotMatrix.multiplyVector3(forward);
        this.center.set(forward_prime);

        this.updateView();
    }

    tilt(angle) {
        // Compute forward vector and calculate u axis
        let forward = new Vector3(this.center.elements);
        forward.sub(this.eye);
        // axis of rotation
        let side = Vector3.cross(this.up, forward);
        side.normalize();

        // Rotate center point around the new side vector
        let rotMatrix = new Matrix4();
        rotMatrix.setRotate(angle,
                            side.elements[0],
                            side.elements[1],
                            side.elements[2]);
                        
        // Rotate forward vector around the new side vector
        let forward_prime = rotMatrix.multiplyVector3(forward);
        this.center.set(forward_prime);
        this.up = rotMatrix.multiplyVector3(this.up);

        this.updateView();
    }

    changePerspective(type) {
        this.cameraType = type;
        if(type == "perspective") {
            this.projMatrix.setPerspective(this.fow,      // the place to change zoom
                canvas.width/canvas.height, this.near, this.far);    
        } else if(type == "orthographic") {
            this.projMatrix.setOrtho(-1, 1, -1, 1, this.near, this.far);
        }
        this.updateView();
    }

    updateView() {
        this.viewMatrix.setLookAt(
            this.eye.elements[0],
            this.eye.elements[1],
            this.eye.elements[2],
            this.center.elements[0],
            this.center.elements[1],
            this.center.elements[2],
            this.up.elements[0],
            this.up.elements[1],
            this.up.elements[2]
        );
    }
}