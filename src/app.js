/** @type {HTMLCanvasElement} */
const app = () => {
    const canvas = document.getElementById('canvas1');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const FPS = 30;   // Frames per second
    const FRICTION = 0.7; // Friction coefficient of space (0 = no friction, 1 = lots of friction)
    const GMAE_LIVES = 3; // Starting number of lives
    const LASER_DISTANCE = 0.4; // Max distance laser can travel as fraction of screen width
    const LASER_EXPLODE_DUR = 0.1; // duration of the laser's explosion in seconds
    const LASER_MAX = 10; // Maximum number of lasers on screen at once
    const LASER_SPEED = 500; // Speed of lasers in pixels per second
    const ROIDS_NUM = 3; // Starting number of astroids
    const ROIDS_JAG = 0.4; // Jaggedness of the astroids (0 = non, 1 = lots)
    const ROID_PTS_LGE = 20; // Points scored for a large astroid
    const ROID_PTS_MED = 50; // Points scored for a medium astroid
    const ROID_PTS_SML = 100; // Points scored for a small astroid
    const ROID_SIZE = 100; // Starting size of astroids in pixels
    const ROID_SPD = 50; // Max starting speed of astroids in peixel per second
    const ROIDS_VERT = 10; // Average number of vertices on each astroid
    const SAVE_KEY_SCORE = "highscore"; // Save key for local storage of high score
    const SHIP_BLINK_DUR = 0.1; // duration of the ship's blink during invisibility in seconds
    const SHIP_EXPLODE_DUR = 0.3; // duration of the ship's explosion
    const SHIP_INV_DUR = 3; // duration of the ship's invisibility in seconds
    const SHIP_SIZE = 30; // Ship height in pixels
    const SHIP_THRUST = 5; // Acceleration of the ship in pixels per second
    const TURN_SPEED = 360; // Turn speed in degrees per second
    const SHOW_BOUNDING = false; // Show or hide collision bounding 
    const SHOW_CENTER_DOT = false; // Show or hide the center dot of the ship
    const SOUND_ON = true; // Turn the sound on or off
    const MUSIC_ON = true; // Turn the music on or off
    const TEXT_FADE_TIME = 2.5 // Text fade time in second
    const TEXT_SIZE = 40; // Text font height in pixels

    // Set up sound effects
    var fxThrust = new Sound("../assets/sounds/thrust.m4a");
    var fxHit = new Sound("../assets/sounds/hit.m4a", 5);
    var fxExplode = new Sound("../assets/sounds/explode.m4a");
    var fxLaser = new Sound("../assets/sounds/laser.m4a", 5, 0.5);
    
    // Set up the music
    var music = new Music("../assets/sounds/music-low.m4a", "../assets/sounds/music-high.m4a");
    let roidsLeft, roidsTotal;

    // Set up the game parameters
    let level, lives, roids, score, scoreHigh, ship, text, textAlpha;
    newGame();  

    // SetUp event handlers
    window.addEventListener('load', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        update();
    });

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    document.addEventListener("keydown", keyDown);
    document.addEventListener("keyup", keyUp);
    
    // SetUp the game loop
    setInterval(update, 1000 / FPS);
    
    // Create astroid belt
    function createAstroidBelt() {
        roids = [];
        roidsTotal = (ROIDS_NUM + level) * 7;
        roidsLeft = roidsTotal;
        let x, y;

        for(let i = 0; i < ROIDS_NUM + level; i++) {
            do {
                x = Math.floor(Math.random() * canvas.width);
                y = Math.floor(Math.random() * canvas.height);
            }
            while (distBetweenPoints(ship.x, ship.y, x, y) < ROID_SIZE * 2 + ship.r);
                roids.push(newAstroid(x, y, Math.ceil(ROID_SIZE / 2)));
        }
    }
    
    function destroyAstroid(index) {
        let x = roids[index].x;
        let y = roids[index].y;
        let r = roids[index].r;

        // split the large astroid in two if necessary
        if(r == Math.ceil(ROID_SIZE / 2)) {
            roids.push(newAstroid(x, y, Math.ceil(ROID_SIZE / 4)));
            roids.push(newAstroid(x, y, Math.ceil(ROID_SIZE / 4)));
            score += ROID_PTS_LGE;
        } else if (r == Math.ceil(ROID_SIZE / 4)) { // medium astroid
            roids.push(newAstroid(x, y, Math.ceil(ROID_SIZE / 8)));
            roids.push(newAstroid(x, y, Math.ceil(ROID_SIZE / 8)));
            score += ROID_PTS_MED;
        } else { // Small astriod
            score += ROID_PTS_SML;
        }
        
        // Check high score
        if(score > scoreHigh) {
            scoreHigh = score;
            // Save the high score in local storage
            localStorage.setItem(SAVE_KEY_SCORE, scoreHigh);
        }
        
        // Destroy the astroid
        roids.splice(index, 1);
        
        // New level when no astroids
        if(roids.length == 0) {
            level++;
            newLevel();
        }
        
        fxHit.play();

        // Create the ratio of remaining astroids to determine music tempo
        roidsLeft--;
        music.setAstroidRatio(roidsLeft == 0 ? 1 : roidsLeft / roidsTotal);
    }
    
    function distBetweenPoints(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }
    
    function drawShip(x, y, a, colour = "#FFF") {
        ctx.strokeStyle = colour;
        ctx.lineWidth = SHIP_SIZE / 10;
        ctx.beginPath();
        ctx.moveTo( // Nose of the ship
            x + 4 / 3 * ship.r * Math.cos(a),
            y - 4 / 3 * ship.r * Math.sin(a)
        );
        ctx.lineTo( // rear left
            x - ship.r * (2 / 3 * Math.cos(a) + Math.sin(a)),
            y + ship.r * ( Math.sin(a) - Math.cos(a))
        );
        ctx.lineTo( // rear right
            x - ship.r * (Math.cos(a) - Math.sin(a)),
            y + ship.r * (Math.sin(a) + Math.cos(a))
        );
        ctx.closePath(); // rear bottom
        ctx.stroke();
    }

    function explodeShip() {
        ship.explodeTime = Math.ceil(SHIP_EXPLODE_DUR * FPS);
        fxExplode.play();
    }
    
    function gameOver() {
        // Game over
        ship.dead = true;
        text = "Game Over!";
        textAlpha = 1.0;
    }

    function keyDown(/** @type {KeyboardEvent} */ ev) {
        if(ship.dead) return;
        switch(ev.keyCode) {
            case 32: // Space bar (shoot laser)
                shootLaser();
                break;
            case 37: // Left arrow (rotate ship left)
                ship.rot = TURN_SPEED / 100 * Math.PI / FPS;
                break;
            case 38: // Up arrow (thrust the ship forward)
                ship.thrusting = true;
                break;
            case 39:// Right arrow (rotate ship right)
                ship.rot = -TURN_SPEED / 100 * Math.PI / FPS;
                break;
        }
    }
    
    function keyUp(/** @type {KeyboardEvent} */ ev) {
        if(ship.dead) return;
        switch(ev.keyCode) {
            case 32: // Space bar (allow shooting again)
                ship.canShoot = true;
                break;
            case 37: // Left arrow (stop rotating the ship left)
                ship.rot = 0;
                break;
            case 38: // Up arrow (stop thrusting the ship forward)
                ship.thrusting = false;
                break;
            case 39:// Right arrow (stop rotating the ship right)
                ship.rot = 0;
                break;
        }
    }
    
    function newAstroid(x, y, r) {
        let levelMult = 1 + 0.1 * level;
        const roid = {
            x: x,
            y: y,
            xv: Math.random() * ROID_SPD * levelMult / FPS * (Math.random() < 0.5 ? 1 : -1),
            yv: Math.random() * ROID_SPD * levelMult / FPS * (Math.random() < 0.5 ? 1 : -1),
            r: r,
            a: Math.random() * Math.PI * 2, // In radius
            vert: Math.floor(Math.random() * (ROIDS_VERT + 1) + ROIDS_VERT / 2),
            offs: []
        };
        
        // Create the vertex offset array
        for(let i = 0; i < roid.vert; i++) {
            roid.offs.push(Math.random() * ROIDS_JAG * 2 + 1 - ROIDS_JAG);
        }
        return roid;
    }
    
    function newGame() {
        level = 0;
        lives = GMAE_LIVES;
        score = 0;
        ship = newShip();
        
        // Get the high score from local storage
        let scoreStr = localStorage.getItem(SAVE_KEY_SCORE);
        if(scoreStr == null) scoreHigh = 0;
        else scoreHigh = parseInt(scoreStr);

        newLevel();
    }
    
    function newLevel() {
        text = "Level " + (level + 1);
        textAlpha = 1.0;
        createAstroidBelt();
    }
    
    function newShip() {
        return {
            x: canvas.width / 2,
            y: canvas.height / 2,
            r: SHIP_SIZE / 1.5,
            a: 50 / 100 * Math.PI, // Convert to radians
            blinkNumber: Math.ceil(SHIP_INV_DUR / SHIP_BLINK_DUR),
            blinkTime: Math.ceil(SHIP_BLINK_DUR * FPS),
            canShoot: true,
            dead: false,
            explodeTime: 0,
            lasers: [],
            rot: 0,
            thrusting: false,
            thrust: {
                x: 0,
                y: 0
            }
        }
    }
    
    function shootLaser() {
        //Create the laser object
        if(ship.canShoot && ship.lasers.length < LASER_MAX) {
            ship.lasers.push({ // From the nose of the ship
                x: ship.x + 4 / 3 * ship.r * Math.cos(ship.a),
                y: ship.y - 4 / 3 * ship.r * Math.sin(ship.a),
                xv: LASER_SPEED * Math.cos(ship.a) / FPS,
                yv: -LASER_SPEED * Math.sin(ship.a) / FPS,
                dist: 0,
                explodeTime: 0
            });
        
            fxLaser.play();
        }
        
        //Prevent further shooting
        ship.canShoot = false;
    }
    
    function Sound(src, maxStreams = 1, vol = 1.0) {
        this.streamNum = 0;
        this.streams = [];
        
        for(let i = 0; i <maxStreams; i++) {
            this.streams.push(new Audio(src));
            this.streams[i].volume = vol;
        }

        this.play = () => {
            if(SOUND_ON) {
                this.streamNum = (this.streamNum + 1) % maxStreams;
                this.streams[this.streamNum].play();
            }
        }

        this.stop = () => {
            // pause the current playback position
            this.streams[this.streamNum].pause();
            // set the current playback position
            this.streams[this.streamNum].currentTime = 0;
        }
    }

    function Music(srcLow, srcHigh) {
        this.soundLow = new Audio(srcLow);
        this.soundHigh = new Audio(srcHigh);
        this.low = true;
        this.tempo = 1.0; // Seconds per beat
        this.beatTime = 0; // Frames left until next beat

        this.play = () => {
            if(MUSIC_ON) {
                if(this.low) this.soundLow.play();
                else this.soundHigh.play();
                this.low = !this.low;
            }
        }

        this.setAstroidRatio = ratio => {
            this.tempo = 1.0 - 0.75 * (1.0 - ratio);
        }

        this.tick = () => {
            if(this.beatTime == 0) {
                this.play();
                this.beatTime = Math.ceil(this.tempo * FPS);
            } else this.beatTime--;
        }
    }

    function update() {
        let blinkOn = ship.blinkNumber % 2 == 0;
        let exploding = ship.explodeTime > 0;

        // Tick the music
        music.tick();
        
        // Draw space
        ctx.fillStyle = "black";
        ctx.fillRect(0,0,canvas.width,canvas.height);
        
        // Thrust the ship
        if(ship.thrusting && !ship.dead) {
            ship.thrust.x += SHIP_THRUST * Math.cos(ship.a) / FPS;
            ship.thrust.y -= SHIP_THRUST * Math.sin(ship.a) / FPS;
            fxThrust.play();
            
            // Draw the thruster
            if(!exploding && blinkOn) {
                ctx.fillStyle = "red";
                ctx.strokeStyle = "yellow";
                ctx.lineWidth = SHIP_SIZE / 10;
                ctx.beginPath();
                ctx.moveTo( // rear left
                    ship.x - ship.r * (2.5 / 3 * Math.cos(ship.a) + 0.5 * Math.sin(ship.a)),
                    ship.y + ship.r * (2.5 / 3 * Math.sin(ship.a) - 0.5 * Math.cos(ship.a))
                );
                ctx.lineTo( // rear center behind the ship
                    ship.x - ship.r * 5.2 / 3 * Math.cos(ship.a),
                    ship.y + ship.r * 5.2 / 3 * Math.sin(ship.a)
                );
                ctx.lineTo( // rear right
                    ship.x - ship.r * (2.5 / 3 * Math.cos(ship.a) - 0.5 * Math.sin(ship.a)),
                    ship.y + ship.r * (2.5 / 3 * Math.sin(ship.a) + 0.5 * Math.cos(ship.a))
                );
                ctx.closePath(); // rear bottom
                ctx.fill();
                ctx.stroke();
            }
        } else { // When up arrow released, the ship must stop accelerating
            ship.thrust.x -= FRICTION * ship.thrust.x / FPS;
            ship.thrust.y -= FRICTION * ship.thrust.y / FPS;
            fxThrust.stop();
        }
        
        // Draw a triangular ship
        if(!exploding) {
            if(blinkOn && !ship.dead) {
                drawShip(ship.x, ship.y, ship.a);
            }
        
            // Handle blinking
            if(ship.blinkNumber > 0) {
                // Reduce the blink time
                ship.blinkTime--;
        
                // Reduce the blink number
                if(ship.blinkTime == 0) {
                    ship.blinkTime = Math.ceil(SHIP_BLINK_DUR * FPS);
                    ship.blinkNumber--;
                }
            }
        } else {
            //draw the explosion
            ctx.fillStyle = "darkred";
            ctx.beginPath();
            ctx.arc(ship.x, ship.y, ship.r * 1.7, 0, Math.PI * 2, false);
            ctx.fill();
            ctx.fillStyle = "red";
            ctx.beginPath();
            ctx.arc(ship.x, ship.y, ship.r * 1.4, 0, Math.PI * 2, false);
            ctx.fill();
            ctx.fillStyle = "orange";
            ctx.beginPath();
            ctx.arc(ship.x, ship.y, ship.r * 1.1, 0, Math.PI * 2, false);
            ctx.fill();
            ctx.fillStyle = "yellow";
            ctx.beginPath();
            ctx.arc(ship.x, ship.y, ship.r * 0.7, 0, Math.PI * 2, false);
            ctx.fill();
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc(ship.x, ship.y, ship.r * 0.4, 0, Math.PI * 2, false);
            ctx.fill();
        }
        
        // Show ship's collision circle    
        if(SHOW_BOUNDING) {
            ctx.strokeStyle = "lime";
            ctx.beginPath();
            ctx.arc(ship.x, ship.y, ship.r, 0, Math.PI * 2, false);
            ctx.stroke();
        }
        
        // Center dot (For testing)
        if(SHOW_CENTER_DOT) {
            ctx.fillStyle = "red";
            ctx.fillRect(ship.x - 1,ship.y - 1,4,4);
        }
        
        //Draw the lasers
        for(let i = 0; i < ship.lasers.length; i++) {
            if(ship.lasers[i].explodeTime == 0) {
                ctx.fillStyle = "aqua";
                ctx.beginPath();
                ctx.arc(ship.lasers[i].x, ship.lasers[i].y, SHIP_SIZE / 15, 0, Math.PI * 2, false);
                ctx.fill();
            } else {
                // Draw the explosion
                ctx.fillStyle = "orangered";
                ctx.beginPath();
                ctx.arc(ship.lasers[i].x, ship.lasers[i].y, ship.r * 0.75, 0, Math.PI * 2, false);
                ctx.fill();
                ctx.fillStyle = "salmon";
                ctx.beginPath();
                ctx.arc(ship.lasers[i].x, ship.lasers[i].y, ship.r * 0.5, 0, Math.PI * 2, false);
                ctx.fill();
                ctx.fillStyle = "pink";
                ctx.beginPath();
                ctx.arc(ship.lasers[i].x, ship.lasers[i].y, ship.r * 0.25, 0, Math.PI * 2, false);
                ctx.fill();
            }    
        }
        
        // Draw the game text
        if(textAlpha >= 0) {
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "rgba(255, 255, 255, "+ textAlpha +")";
            ctx.font = "small-caps " + TEXT_SIZE + "px dejavu sans mono";
            ctx.fillText(text, canvas.width / 2, canvas.height * 0.75);
            textAlpha -= (1.0 / TEXT_FADE_TIME / FPS);
        } else if(ship.dead) {
            newGame();
        }
        
        // Draw the lives
        let lifeColour;
        for(let i = 0; i < lives; i++) {
            lifeColour = exploding && i == lives - 1 ? "red" : "#FFF";
            drawShip(SHIP_SIZE + i * SHIP_SIZE * 1.6, SHIP_SIZE, 0.5 * Math.PI, lifeColour);
        }
        
        // Draw the score
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#FFF";
        ctx.font = TEXT_SIZE + "px dejavu sans mono";
        ctx.fillText("Score: " + score, canvas.width - SHIP_SIZE / 2, SHIP_SIZE);
        
        // Draw the high score
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#FFF";
        ctx.font = (TEXT_SIZE * 0.8) + "px dejavu sans mono";
        ctx.fillText("High Score: " + scoreHigh, canvas.width / 2, SHIP_SIZE);

        // Detect laser hits on astroids
        let ax, ay, ar, lx, ly;
        for(let i = roids.length - 1; i >= 0; i--) {
            // Grab the astroid properties
            ax = roids[i].x;
            ay = roids[i].y;
            ar = roids[i].r;
        
            // Loop over the lasers
            for(let j = ship.lasers.length - 1; j >= 0; j--) {
                // Grab the laser properties
                lx = ship.lasers[j].x;
                ly = ship.lasers[j].y;
        
                // Detect hits
                if(ship.lasers[j].explodeTime == 0 && distBetweenPoints(ax, ay, lx, ly) < ar) {
                    // Destroy the astroid and activate the laser explosion
                    destroyAstroid(i);
                    ship.lasers[j].explodeTime = Math.ceil(LASER_EXPLODE_DUR * FPS);
                    break;
                }
            }
        }
        
        // Draw the astroids
        let x, y, r, a, vert, offs;
        for(let i = 0; i < roids.length; i++) {
            // Get the astroid properties
            ctx.strokeStyle = "slategrey";
            ctx.lineWidth = SHIP_SIZE / 20;
            x = roids[i].x;
            y = roids[i].y;
            r = roids[i].r;
            a = roids[i].a;
            vert = roids[i].vert;
            offs = roids[i].offs;
        
            // Draw a path
            ctx.beginPath();
            ctx.moveTo(
                x + r * offs[0] * Math.cos(a),
                y + r * offs[0] * Math.sin(a)
            );
        
            // Draw the polygon
            for(let j = 1; j < vert; j++) {
                ctx.lineTo(
                    x + r * offs[j] * Math.cos(a + j * Math.PI * 2 / vert),
                    y + r * offs[j] * Math.sin(a + j * Math.PI * 2 / vert)
                );
            }
            ctx.closePath();
            ctx.stroke();
        
            // Show astroids collision circle
            if(SHOW_BOUNDING) {
                ctx.strokeStyle = "lime";
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2, false);
                ctx.stroke();
            }
        }
        
        // Check for astroid collisions (when not exploding)
        if(!exploding) {
            // Only check when not blinking
            if(ship.blinkNumber == 0 && !ship.dead) {
                for(let i = 0; i < roids.length; i++) {
                    if(distBetweenPoints(ship.x, ship.y, roids[i].x, roids[i].y) < ship.r + roids[i].r) {
                        explodeShip();
                        destroyAstroid(i);
                        break;
                    }
                }
            }
        
            // Rotate ship
            ship.a += ship.rot;
        
            // Move the ship
            ship.x += ship.thrust.x;
            ship.y += ship.thrust.y;
        } else {
            ship.explodeTime--;
        
            // Reset the ship after the explosion has finished
            if(ship.explodeTime == 0) {
                lives--;
                if(lives == 0) {
                    gameOver();
                } else {
                    ship = newShip();
                }
            }
        }
        
        // Handle edge of screen
        if(ship.x < 0 - ship.r) { // X axis
            ship.x = canvas.width + ship.r;
        } else if(ship.x > canvas.width + ship.r) {
            ship.x = 0 - ship.r; 
        }
        
        if(ship.y < 0 - ship.r) { // Y axis
            ship.y = canvas.height + ship.r;
        } else if(ship.y > canvas.height + ship.r) {
            ship.y = 0 - ship.r; 
        }
        
        // Move the lasers
        for(let i = ship.lasers.length - 1; i >= 0; i--) {
            // Check distance travelled
            if(ship.lasers[i].dist > LASER_DISTANCE * canvas.width) {
                ship.lasers.splice(i, 1);
                continue;
            }
        
            // Handle the explosion
            if(ship.lasers[i].explodeTime > 0) {
                ship.lasers[i].explodeTime--;
        
                // Destroy the laser after the duration is up
                if(ship.lasers[i].explodeTime == 0) {
                    ship.lasers.splice(i, 1);
                    continue;
                }
            } else {
                // Move the laser
                ship.lasers[i].x += ship.lasers[i].xv;
                ship.lasers[i].y += ship.lasers[i].yv;
        
                // calculate the distance travelled
                ship.lasers[i].dist += Math.sqrt(Math.pow(ship.lasers[i].xv, 2) + Math.pow(ship.lasers[i].yv, 2));
            }
        
            // Handle edge of screen
            if(ship.lasers[i].x < 0) {
                ship.lasers[i].x = canvas.width;
            } else if (ship.lasers[i].x > canvas.width) {
                ship.lasers[i].x = 0;
            }
            if(ship.lasers[i].y < 0) {
                ship.lasers[i].y = canvas.height;
            } else if (ship.lasers[i].y > canvas.height) {
                ship.lasers[i].y = 0;
            }
        }
        
        // Move the astroids
        for(let i = 0; i < roids.length; i++) {
            roids[i].x += roids[i].xv;
            roids[i].y += roids[i].yv;
        
            // Handle edge of screen
            if(roids[i].x < 0 - roids[i].r) {
                roids[i].x = canvas.width + roids[i].r;
            } else if(roids[i].x > canvas.width + roids[i].r) {
                roids[i].x = 0 - roids[i].r;
            }
            if(roids[i].y < 0 - roids[i].r) {
                roids[i].y = canvas.height + roids[i].r;
            } else if(roids[i].y > canvas.height + roids[i].r) {
                roids[i].y = 0 - roids[i].r;
            }
        } 
    }
}
app();