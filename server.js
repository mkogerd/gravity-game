var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io')(server);


console.log('Server running...');

// -------------------- Resource request handling --------------------
app.get('/', (req, res) => {
	res.sendFile(__dirname + '/index.html');
});

app.get('/canvas.js', (req, res) => {
	res.sendFile(__dirname + '/canvas.js');
});

app.get('/main.css', (req, res) => {
	res.sendFile(__dirname + '/main.css');
});

// set up connection	
io.sockets.on('connection', (socket) => {
	console.log(`Socket id:${socket.id} connected`);
	const color = colors[Math.floor(Math.random() * colors.length)];

	// Populate new client session with game entities and map dimensions
	socket.emit('initialize', particles, width, height); 
	
	let player;
	let hazard;
	let inSession = false;
	let playerName;

	socket.on('start', (name) => {
		console.log('start received');
		// Create new particle and hazard for player
		player = new Player(25, 25, 10, color, socket.id);
		hazard = spawnHazard(socket.id, color);

		players.push(player);
		particles.push(player);
		particles.push(hazard);
		inSession = true;
		playerName = name;
		console.log(`"${name}" joined:\t ${players.length} player(s) in session`);
	});

	// Update player controls 
	socket.on('input', (control) => {
		if (inSession)
			player.control = control;
	});

	// Send message
	socket.on('message', (msg) => {
		if (inSession)
			io.emit('message', playerName, msg);
	});
	
	// Disconnect
	socket.on('disconnect', (data) => {
		players.splice(players.indexOf(player), 1);
		particles.splice(particles.indexOf(hazard), 1);
		if (particles.indexOf(player) != -1) particles.splice(particles.indexOf(player), 1);
		console.log(`Disconnected, only ${players.length} sockets connected`);
	});
});

server.listen(process.env.PORT || 3001);

// -------------------- Implementation --------------------
const colors = [
	'#2F2933',
	'#01A2A6',
	'#29D9C2',
	'#BDF271',
	'#FFFFA6'
];

const width = 1000;
const height = 1000;
const particles = [];
const tick = 1000/60;	// 60fps
const players = [];
const friction = 0.99;
const G = 9.8;	// 9.8 pixels per second^2

init();

function init() {
	console.log('Initializing...');

	// Create a bunch of random particles to interact with
	for (let i = 0; i < 0; i++) {
		const radius = 15;
		const color = colors[Math.floor(Math.random() * colors.length)];
		let x = Math.random() * (width - radius * 2) + radius;
		let y = Math.random() * (height - radius * 2) + radius; 
		
		for (let j = 0; j < particles.length; j++) {
			if (distance(x, y, particles[j].x, particles[j].y) - radius * 2 < 0) {
				x = Math.random() * (width - radius * 2) + radius;
				y = Math.random() * (height - radius * 2) + radius;
				j = -1;
			}
		}
		particles.push(new Particle(x, y, radius, color));
	}

	// Call update routinely 
	setInterval(update, tick);
	// Add a new feeder particle every second
	setInterval(() => {particles.push(spawnParticle())}, tick*60);
	// Emit photons every second
	setInterval(() => {
		for(particle of particles) { 
			if (particle instanceof Hazard) particle.radiate();
		}
	}, tick*120);
}

function update() {
	for(particle of particles) {
		 particle.update(particles);
	}
	io.emit('update', particles);
}

function spawnParticle() {
	const radius = 15;
	const color = colors[Math.floor(Math.random() * colors.length)];
	let x = Math.random() * (width - radius * 2) + radius;
	let y = Math.random() * (height - radius * 2) + radius; 
	
	for (let j = 0; j < particles.length; j++) {
		if (distance(x, y, particles[j].x, particles[j].y) - radius * 2 < 0) {
			x = Math.random() * (width - radius * 2) + radius;
			y = Math.random() * (height - radius * 2) + radius;
			j = -1;
		}
	}
	return new Particle(x, y, radius, color);
}

function spawnHazard(id, color) {
	const radius = 20;
	let x = Math.random() * (width - radius * 2) + radius;
	let y = Math.random() * (height - radius * 2) + radius; 
	for (let j = 0; j < particles.length; j++) {
		if (distance(x, y, particles[j].x, particles[j].y) - radius - particles[j].radius  < 0) {
			x = Math.random() * (width - radius * 2) + radius;
			y = Math.random() * (height - radius * 2) + radius;
			j = -1;
		}
	}
	return hazard = new Hazard(x, y, radius, color, id);
}

// -------------------- Entity objects --------------------
function Particle(x, y, radius, color, type) {
	this.type = type || 'Particle';
	this.x = x;
	this.y = y;
	this.radius = radius;
	this.color = color;
	this.mass = 1;
	this.opacity = 0;
	this.velocity = {
		x: (Math.random() - 0.5) * 5,
		y: (Math.random() - 0.5) * 5
	};
	this.acceleration = {
		x: 0,
		y: 0
	};

	this.update = particles => {
		// Particle interactions
		for (let i = 0; i < particles.length; i++) {
			if (this == particles[i]) continue;

			// Particle collisions
			if (distance(this.x, this.y, particles[i].x, particles[i].y) - (this.radius + particles[i].radius) < 0 && !(particles[i] instanceof Hazard)) {
				resolveCollision(this, particles[i]);
			}
		}	
	
		// Update acceleration based on gravity
		let Fg = calculateFG(this);
		this.acceleration.x = Fg.x/this.mass;
		this.acceleration.y = Fg.y/this.mass;
		
		// Border collision
		resolveBorders(this);

		this.velocity.x += this.acceleration.x/tick;
		this.velocity.y += this.acceleration.y/tick;
		this.velocity.x = this.velocity.x * friction;
		this.velocity.y = this.velocity.y * friction;
		this.x += this.velocity.x;
		this.y += this.velocity.y;
	}
}

function Player(x, y, radius, color, id) {
	Particle.call(this, x, y, radius, color, 'Player');
	this.id = id;
	this.mass = 1;
	this.velocity = {
		x: 0,
		y: 0
	};
	this.control = {
		up: false,
		down: false,
		left: false,
		right: false
	};
	this.hazard;

	this.update = particles => {
		
		if(this.control.up) this.velocity.y += -.1;
		if(this.control.down) this.velocity.y += .1;
		if(this.control.right) this.velocity.x += .1;
		if(this.control.left) this.velocity.x += -.1;
		
		// Particle collision 
		for (let i = 0; i < particles.length; i++) {
			if (this == particles[i]) continue;
			if (distance(this.x, this.y, particles[i].x, particles[i].y) - this.radius - particles[i].radius < 0 && (!(particles[i] instanceof Hazard) || particles[i].id == this.id)) {
				resolveCollision(this, particles[i]);
			}
		}
		
		// Update acceleration based on gravity
		let Fg = calculateFG(this);
		this.acceleration.x = Fg.x/this.mass;
		this.acceleration.y = Fg.y/this.mass;
		
		// Border collision
		resolveBorders(this);
		
		this.velocity.x += this.acceleration.x/tick;
		this.velocity.y += this.acceleration.y/tick;
		this.velocity.x = this.velocity.x * friction;
		this.velocity.y = this.velocity.y * friction;
		this.x += this.velocity.x;
		this.y += this.velocity.y;
	}
}
Player.prototype = new Particle;

function Hazard(x, y, radius, color, id) {
	Particle.call(this, x, y, radius, color, 'Hazard');
	this.baseRadius = radius;
	this.mass = 1;
	this.id = id;
	this.velocity = {
		x: 0,
		y: 0
	}

	this.update = particles => {
		for (let i = 0; i < particles.length; i++) {
			//if (this.id == particles[i].id) continue;

			if (distance(this.x, this.y, particles[i].x, particles[i].y) - this.radius < 0) {
				if (this.id == particles[i].id || particles[i] instanceof Hazard) {
					resolveCollision(this, particles[i]);
				} else {
					particles[i].color = this.color;
					this.mass += particles[i].mass;
					particles.splice(i,1);
				}
			}
		}
		
		// Border collision
		resolveBorders(this);
		
		this.radius = this.baseRadius + this.mass;
		this.x += this.velocity.x;
		this.y += this.velocity.y;
		this.velocity.x = this.velocity.x * friction;
		this.velocity.y = this.velocity.y * friction;
	}

	this.radiate = () => {
		// Create photon along random tangent path
		let photonRad = 5;
		let theta = Math.random() * Math.PI * 2;
		let photonX = this.x + (this.radius + photonRad) * Math.cos(theta);
		let photonY = this.y + (this.radius + photonRad) * Math.sin(theta);
		let photonVel = {
			x: 5 * Math.cos(theta),
			y: 5 * Math.sin(theta)
		}
		particles.push(new Photon(photonX, photonY, photonRad, this.color, this.mass/100, photonVel));	

		// Reduce mass by 1%
		this.mass = this.mass - this.mass/100;
	}
}
Hazard.prototype = new Particle;

function Photon(x, y, radius, color, mass, velocity) {
	Particle.call(this, x, y, radius, color, 'Photon');
	this.mass = mass;
	this.id = 0;
	this.t = 0;
	this.rgb = color;
	this.velocity = velocity;

	this.update = particles => {
		let tf = 2000; // 2 seconds 
		let mass_o = 10;
		let tau = 1;
		this.mass = mass_o*Math.exp(-this.t/tau);
		this.t += tick; // add length of tick (ms)
		this.color = hexToRGBA(this.rgb, ((tf - this.t)/tf));

		if (tf < this.t) {
			particles.splice(particles.indexOf(this), 1);
		}

		// Border collision
		resolveBorders(this);
	
		this.x += this.velocity.x;
		this.y += this.velocity.y;
		this.velocity.x = this.velocity.x * friction;
		this.velocity.y = this.velocity.y * friction;
	}
}
Photon.prototype = new Particle;

// -------------------- Math Functions --------------------
function distance(x1, y1, x2, y2) {
	return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
}

/**
 * Rotates coordinate system for velocities
 *
 * Takes velocities and alters them as if the coordinate system they're on was rotated
 *
 * @param  Object | velocity | The velocity of an individual particle
 * @param  Float  | angle    | The angle of collision between two objects in radians
 * @return Object | The altered x and y velocities after the coordinate system has been rotated
 */

function rotate(velocity, angle) {
    const rotatedVelocities = {
        x: velocity.x * Math.cos(angle) - velocity.y * Math.sin(angle),
        y: velocity.x * Math.sin(angle) + velocity.y * Math.cos(angle)
    };

    return rotatedVelocities;
}

/**
 * Swaps out two colliding particles' x and y velocities after running through
 * an elastic collision reaction equation
 *
 * @param  Object | particle      | A particle object with x and y coordinates, plus velocity
 * @param  Object | otherParticle | A particle object with x and y coordinates, plus velocity
 * @return Null | Does not return a value
 */

function resolveCollision(particle, otherParticle) {
    const xVelocityDiff = particle.velocity.x - otherParticle.velocity.x;
    const yVelocityDiff = particle.velocity.y - otherParticle.velocity.y;

    const xDist = otherParticle.x - particle.x;
    const yDist = otherParticle.y - particle.y;

    // Prevent accidental overlap of particles
    if (xVelocityDiff * xDist + yVelocityDiff * yDist >= 0) {

        // Grab angle between the two colliding particles
        const angle = -Math.atan2(otherParticle.y - particle.y, otherParticle.x - particle.x);

        // Store mass in var for better readability in collision equation
        const m1 = particle.mass;
        const m2 = otherParticle.mass;

        // Velocity before equation
        const u1 = rotate(particle.velocity, angle);
        const u2 = rotate(otherParticle.velocity, angle);

        // Velocity after 1d collision equation
        const v1 = { x: u1.x * (m1 - m2) / (m1 + m2) + u2.x * 2 * m2 / (m1 + m2), y: u1.y };
        const v2 = { x: u2.x * (m2 - m1) / (m1 + m2) + u1.x * 2 * m1 / (m1 + m2), y: u2.y };

        // Final velocity after rotating axis back to original location
        const vFinal1 = rotate(v1, -angle);
        const vFinal2 = rotate(v2, -angle);

        // Swap particle velocities for realistic bounce effect
        particle.velocity.x = vFinal1.x;
        particle.velocity.y = vFinal1.y;

        otherParticle.velocity.x = vFinal2.x;
        otherParticle.velocity.y = vFinal2.y;
    }
}

// Border collision
function resolveBorders(particle) {
	if (particle.x - particle.radius <= 0) {
		particle.velocity.x = Math.abs(particle.velocity.x);
	} else if (particle.x + particle.radius >= width) {
		particle.velocity.x = -Math.abs(particle.velocity.x);
	}
	if (particle.y - particle.radius <= 0) {
		particle.velocity.y = Math.abs(particle.velocity.y);
	} else if (particle.y + particle.radius >= height) {
		particle.velocity.y = -Math.abs(particle.velocity.y);
	}
}

function calculateFG(particle) {
	let force = {
		x: 0,
		y: 0
	}
	// Particle collision 
	for (let i = 0; i < particles.length; i++) {
		dist = distance(particle.x, particle.y, particles[i].x, particles[i].y);
		// debug, current behavior is particle not effected by particles of whos center it overlaps
		// If other physics are working, this shouldn't be needed
		if (	(particles[i] instanceof Photon) || 
			(particles[i].id == particle.id && particles[i].id) ||
			(dist < particle.radius) ||
			(dist > particles[i].radius*4))
			continue;
		
		// Accumulate gravitational forces
		let Fg = (G * particles[i].mass * particle.mass)/(dist);
		let theta = Math.atan((particles[i].y - particle.y)/(particles[i].x - particle.x));
		theta = (particles[i].x < particle.x) ? theta+Math.PI : theta; // Find proper quadrant

		force.x += Fg*Math.cos(theta);
		force.y += Fg*Math.sin(theta);
	}	
	return force;
}

// Allows adding alpha values to existing colors
function hexToRGBA(hex, alpha) {
	let r = parseInt(hex.slice(1, 3), 16),
	    g = parseInt(hex.slice(3, 5), 16),
	    b = parseInt(hex.slice(5, 7), 16);
	
	if (alpha) {
		return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
	} else {
		return "rgb(" + r + ", " + g + ", " + b + ")";
	}
}
