const util = require('util'); // For TextEncoder and TextDecoder
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });
const logger = require('./logger');

// Incoming communications
const commandList = ['startReq', 'controlInput', 'chatMessage'];

// Outgoing communications
const commandEnum = {
	INITIALIZE: 0,
	START: 1,
	CHATMSG: 2,
	UPDATE: 3,
	NEWPLAYER: 4,
};

const typeEnum = {
	PARTICLE: 0,
	PLAYER: 1,
	HAZARD: 2,
	PHOTON: 3,
};

// Track player names associated with PIDs
const playerList = new Array(256);

// Queue of PIDs to hand out when players request to start games 
var pidQueue = [];
for (var i = 1; i <= 255; i++) {
   pidQueue.push(i);

}

wss.on('connection', function connection(ws, req) {
	// Testing out error handling
	ws.onerror = (evt) => {
		logger.error('An error occurred in our websocket connection');
		return;
	}

	ws.binaryType = 'arraybuffer';
	ws.id = pidQueue.shift();  // error can occur if array is empty - pid becomes undefined. then all particles get deleted on dc
	logger.info(`(${req.socket.remoteAddress}, ID:${ws.id}) connected, currently ${wss.clients.size} sockets connected`);

	// Send map initialization
	ws.send(getInitData(ws));

	// Send current player names
	for (let i = 1; i <= 255; i++) {
		if (playerList[i]) {
			ws.send(getAddNameMsg(i, playerList[i]));
		}
	}

	ws.on('message', function incoming(message) {
		let dv = new DataView(message);
		if (dv.getUint8(0) == 0) {  // Start request
			handleStartRequest(ws, dv);
		} else if (dv.getUint8(0) == 1) {  // Control input
			handleControl(ws, dv);
		} else if (dv.getUint8(0) == 2) {  // Message received
			handleChatMessage(ws, dv);
		}
	});

	ws.on('close', function close() {
		pidQueue.push(ws.id);
		playerList[ws.id] = undefined;
		particles = particles.filter(particle => particle.id != ws.id);
		logger.info(`(${req.socket.remoteAddress}, ID:${ws.id}) disconnected, only ${wss.clients.size} sockets connected`);
	});	
});

// Broadcast to all.
wss.broadcast = function broadcast(data) {
	wss.clients.forEach(function each(client) {
		if (client.readyState === WebSocket.OPEN) {
			client.send(data);
		}
	});
};

function getInitData(ws) {
    // Populate new client session with game entities and map dimensions
	let buffer = new ArrayBuffer(10 + particles.length * 9);
	let view = new DataView(buffer);
	view.setUint8(0, 0);
	view.setUint8(1, ws.id);

	// Fill buffer with map dimensions
	view.setUint16(2, width);
	view.setUint16(4, height);
	view.setUint16(6, viewWidth);
	view.setUint16(8, viewHeight);
	
	// Fill in particle data
	for (let i = 0; i < particles.length; i++) {
		view.setUint8(10 + i*9, particles[i].id);	// ID
		view.setUint8(11 + i*9, particles[i].type);	// type
		view.setUint8(12 + i*9, particles[i].color);	// Color
		view.setUint16(13 + i*9, Math.floor(particles[i].x));	// x
		view.setUint16(15 + i*9, Math.floor(particles[i].y));	// y
		view.setUint16(17 + i*9, Math.floor(particles[i].radius));	// radius
	}

	return buffer;
}

function getAddNameMsg(id, name) {
	// Create broadcast message
	let data = new ArrayBuffer(name.length + 2);

	// Set header
	let header = new DataView(data, 0, 2);
	header.setUint8(0, commandEnum.NEWPLAYER);
	header.setUint8(1, id);

	// Set payload
	let payload = new Uint8Array(data, 2);
	let enc = new util.TextEncoder('utf-8');
	binaryName = enc.encode(name);
	payload.set(binaryName);

	return data;
}


function handleStartRequest(ws, dv) {
	// Get name from request
	let dec = new util.TextDecoder('utf-8');
	let binaryName = new DataView(dv.buffer, dv.byteOffset +1);
	let name = dec.decode(binaryName).substr(0,16); // Only accept first 16 chars
	name = (name == "") ? "default" : name;	// Add default name for blank names

	// Clear out old instances of player
	for(let i = 0; i < particles.length; i++) {
		if (particles[i].id == ws.id) {
			logger.info(`Removing player "${playerList[ws.id]}"`);
			particles.splice(i, 1);
			break;
		}
	}

	// Update PID/name associations
	playerList[ws.id] = name;
	wss.broadcast(getAddNameMsg(ws.id, name));
	
	// Create new particle and hazard for player
	const color = Math.floor(Math.random() * colors.length);
	const player = spawnPlayer(ws.id, color);
	const hazard = spawnHazard(ws.id, name, color);
	ws.player = player;

	particles.push(player);
	particles.push(hazard);
	logger.info(`"${name}" joined session`);

	let buffer = new ArrayBuffer(1);
	let view = new DataView(buffer);
	view.setUint8(0, 1);
	ws.send(buffer);
}

function handleUpdate() {
	wss.clients.forEach((client) => {
		let player = particles.find(p => p.id == client.id && p.type == 1);
		if (player) {
			// Only send the nearby particles so the client doesn't have to know about offscreen entities
			// Account for how camera behaves near screen edges
			let screenCenter = {
				x: Math.min(width - viewWidth / 2, Math.max(viewWidth / 2, player.x)),
				y: Math.min(height - viewHeight / 2, Math.max(viewHeight / 2, player.y))
			}

			let nearbyParticles = particles.filter(p => (
				particleIsOnScreen(p, screenCenter)
				|| p.id == client.id
			));

			let buffer = new ArrayBuffer(1 + nearbyParticles.length * 9);
			let view = new DataView(buffer);
			view.setUint8(0, 3);

			// Fill in particle data
			for (let i = 0; i < nearbyParticles.length; i++) {
				view.setUint8(1 + i * 9, nearbyParticles[i].id);	// id
				view.setUint8(2 + i * 9, nearbyParticles[i].type);	// type
				view.setUint8(3 + i * 9, nearbyParticles[i].color);	// Color
				view.setUint16(4 + i * 9, Math.floor(nearbyParticles[i].x));	// x
				view.setUint16(6 + i * 9, Math.floor(nearbyParticles[i].y));	// y
				view.setUint16(8 + i * 9, Math.floor(nearbyParticles[i].radius));	// radius
			}
			client.send(buffer);
		} else {
			// Send all particles
			let buffer = new ArrayBuffer(1 + particles.length * 9);
			let view = new DataView(buffer);
			view.setUint8(0, 3);

			// Fill in particle data
			for (let i = 0; i < particles.length; i++) {
				view.setUint8(1 + i*9, particles[i].id);	// id
				view.setUint8(2 + i*9, particles[i].type);	// type
				view.setUint8(3 + i*9, particles[i].color);	// Color
				view.setUint16(4 + i*9, Math.floor(particles[i].x));	// x
				view.setUint16(6 + i*9, Math.floor(particles[i].y));	// y
				view.setUint16(8 + i*9, Math.floor(particles[i].radius));	// radius
			}
			client.send(buffer);
		}
	});
}

function particleIsOnScreen(particle, screenCenter) {
	let particleEdge = {
		x: (particle.x < screenCenter.x) ? particle.x + particle.radius : particle.x - particle.radius,
		y: (particle.y < screenCenter.y) ? particle.y + particle.radius : particle.y - particle.radius
	}
	return (
		Math.abs(screenCenter.x - particleEdge.x) < viewWidth / 2
		&& Math.abs(screenCenter.y - particleEdge.y) < viewHeight / 2
	)
}

function handleControl(ws, dv) {  // This needs to be reworked
	let msg = dv.getUint8(1);
	let control = {
		up: 	(msg & 0b0001),
		down: 	(msg & 0b0010),
		left: 	(msg & 0b0100),
		right: 	(msg & 0b1000),
	};

	// Update player controls 
	if(ws.player != null) {
		ws.player.control = control;
	}
}

function handleChatMessage(ws, dv) {
	let data = new ArrayBuffer(dv.byteLength + 1);

	// Set header
	let header = new DataView(data, 0, 2);
	header.setUint8(0, commandEnum.CHATMSG);
	header.setUint8(1, ws.id);

	// Set payload
	let payload = new Uint8Array(data, 2);
	let message = new Uint8Array(dv.buffer, 1);
	payload.set(message);

	logger.info(`[chat] ${playerList[ws.id]} (ID:${ws.id}): "${new util.TextDecoder('utf-8').decode(message)}"`);
	wss.broadcast(data);
}

console.log('Game server running...');

// -------------------- Implementation --------------------
const colors = [
	'#2F2933',
	'#01A2A6',
	'#29D9C2',
	'#BDF271',
	'#FFFFA6'
];

const width = 3000;
const height = 2200;
const viewWidth = 1920;
const viewHeight = 1080;
let particles = [];
const tick = 1000/60;	// 60fps
const friction = 0.99;
const G = 9.8;	// 9.8 pixels per second^2
const particlesPerPlayer = 30;
const startingParticles = 35;

init();

function init() {
	console.log('Initializing...');

	// Create a bunch of random particles to interact with
	for (let i = 0; i < startingParticles; i++) {
		const radius = 15;
		const color = Math.floor(Math.random() * colors.length);
		const location = getRandomSpawnLocation(radius);
		particles.push(new Particle(location.x, location.y, radius, color));
	}

	// TO DO: Put all of these interval functions into the update function
	// Call update routinely 
	setInterval(update, tick);
	// Add a new feeder particle every second if a player is in the game
	setInterval(() => {
		const players = particles.filter(p => p.type == typeEnum.PLAYER);
		const maxParticles = players.length * particlesPerPlayer + startingParticles;
		if (players.length > 0 && particles.length < maxParticles)
				particles.push(spawnParticle())
	}, tick*60);
	// Emit photons every second
	setInterval(() => {
		for(particle of particles) { 
			if (particle instanceof Hazard) particle.radiate();
		}
	}, tick*120);
}

function update() {
	if (wss.clients.size != 0) {	// Only update when a socket is connected
		for(particle of particles) {
			 particle.update(particles);
		}
		handleUpdate();
	}
}

function spawnParticle() {
	const radius = 15;
	const color = Math.floor(Math.random() * colors.length);
	const location = getRandomSpawnLocation(radius);

	return new Particle(location.x, location.y, radius, color);
}

function spawnPlayer(socket_id, color) {
	const radius = 20;
	const location = getRandomSpawnLocation(radius);

	return new Player(location.x, location.y, radius, color, socket_id);
}

function spawnHazard(id, name, color) {
	const radius = 20;
	const location = getRandomSpawnLocation(radius);

	return new Hazard(location.x, location.y, radius, color, id, name);
}

function getRandomSpawnLocation(radius) {
	// Keep generating starting locations until we find one that doesn't overlap with an existing particle
	let x;
	let y;
	do {
		x = Math.random() * (width - radius * 2) + radius;
		y = Math.random() * (height - radius * 2) + radius;
	} while (locationTouchesExistingParticle(x, y))

	return {x, y}
}

function locationTouchesExistingParticle(x, y) {
	for (let i = 0; i < particles.length; i++) {
		if (distance(x, y, particles[i].x, particles[i].y) - (particles[i].radius * 2) < 0) {
			return true;
		}
	}

	return false;
}

// -------------------- Entity objects --------------------
function Particle(x, y, radius, color, type) {
	this.type = type || typeEnum.PARTICLE;
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
	Particle.call(this, x, y, radius, color, typeEnum.PLAYER);
	this.id = id;
	this.mass = 2;
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
		let dv = .2;
		if(this.control.up) this.velocity.y += -dv;
		if(this.control.down) this.velocity.y += dv;
		if(this.control.right) this.velocity.x += dv;
		if(this.control.left) this.velocity.x += -dv;
		
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

function Hazard(x, y, radius, color, id, name) {
	Particle.call(this, x, y, radius, color, typeEnum.HAZARD);
	this.baseRadius = radius;
	this.mass = 1;
	this.id = id;
	this.name = name;
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
	Particle.call(this, x, y, radius, color, typeEnum.PHOTON);
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
		//this.color = hexToRGBA(this.rgb, ((tf - this.t)/tf));

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
