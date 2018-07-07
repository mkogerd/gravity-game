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

// set up connection	
io.sockets.on('connection', (socket) => {
	console.log(`Socket id:${socket.id} connected`);
	let player = new Player(15,15,10, 'blue');
	players.push(player);
	particles.push(player);
	console.log(`Connected: ${players.length} sockets connected`);

	// Populate new client session with game entities
	socket.emit('initialize', particles); 

	// Update player controls 
	socket.on('input', (control) => {
		player.control = control;
		console.log(`${players.indexOf(player)}: `, player.control); // Debug
	});
	
	// Disconnect
	socket.on('disconnect', (data) => {
		players.splice(players.indexOf(player), 1);
		particles.splice(particles.indexOf(player), 1);
		console.log(`Disconnected, only ${players.length} sockets connected`);
	});
});

server.listen(process.env.PORT || 3000);

// -------------------- Implementation --------------------
const colors = [
	'#2F2933',
	'#01A2A6',
	'#29D9C2',
	'#BDF271',
	'#FFFFA6'
];

const width = 800;
const height = 600;
const particles = [];
const tick = 1000/60;
const players = [];

init();

function init() {
	console.log('Initializing...');

	// Create a bunch of random particles to interact with
	for (let i = 0; i < 20; i++) {
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
}

function update() {
	for(particle of particles) {
		 particle.update(particles);
	}
	io.emit('update', particles);
}

// -------------------- Entity objects --------------------
function Particle(x, y, radius, color) {
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

	this.update = particles => {
		// Particle collision
		for (let i = 0; i < particles.length; i++) {
			if (this == particles[i]) continue;
			if (distance(this.x, this.y, particles[i].x, particles[i].y) - (this.radius + particles[i].radius) < 0) {
				resolveCollision(this, particles[i]);
			}
		}	
		
		// Border collision
		if (this.x - this.radius <= 0 || this.x + this.radius >= width) {
			this.velocity.x = -this.velocity.x;
		}
		if (this.y - this.radius <= 0 || this.y + this.radius >= height) {
			this.velocity.y = -this.velocity.y;
		}

		this.x += this.velocity.x;
		this.y += this.velocity.y;
		let friction = 0.999;
		this.velocity.x = this.velocity.x * friction;
		this.velocity.y = this.velocity.y * friction;
	}
}

function Player(x, y, radius, color) {
	Particle.call(this, x, y, radius, color);
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

	this.update = particles => {
		
		if(this.control.up) this.velocity.y += -.1;
		if(this.control.down) this.velocity.y += .1;
		if(this.control.right) this.velocity.x += .1;
		if(this.control.left) this.velocity.x += -.1;
		
		// Particle collision 
		for (let i = 0; i < particles.length; i++) {
			if (this == particles[i]) continue;
			if (distance(this.x, this.y, particles[i].x, particles[i].y) - radius * 2 < 0) {
				resolveCollision(this, particles[i]);
			}
		}	
		
		// Border collision
		if (this.x - this.radius <= 0 || this.x + this.radius >= width) {
			this.velocity.x = -this.velocity.x;
		}
		if (this.y - this.radius <= 0 || this.y + this.radius >= height) {
			this.velocity.y = -this.velocity.y;
		}
		this.x += this.velocity.x;
		this.y += this.velocity.y;
	}
}
Player.prototype = new Particle;

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
        const v2 = { x: u2.x * (m1 - m2) / (m1 + m2) + u1.x * 2 * m2 / (m1 + m2), y: u2.y };

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
