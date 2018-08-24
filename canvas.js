var canvas = document.querySelector("canvas");
canvas.width = innerWidth;
canvas.height = innerHeight;
var c = canvas.getContext('2d');


// -------------------- Variables --------------------
const colors = [
	'#2F2933',
	'#01A2A6',
	'#29D9C2',
	'#BDF271',
	'#FFFFA6'
];

const control = {
	up: false,
	down: false,
	left: false,
	right: false
}

let particles;
let player;
let hazard;
let frameX, frameY;
const map = {
	width: 0,
	height: 0
};

// -------------------- Event Listeners --------------------
window.addEventListener('resize', (event) => {
	canvas.width = innerWidth;
	canvas.height = innerHeight;
});

window.addEventListener('keydown', (event) => {
	let update = false;
	switch(event.key) {
		case 'ArrowUp':
		update = control.up ? false : true;
		control.up = true;
		break;
		
		case 'ArrowDown':
		update = control.down ? false : true;
		control.down = true;
		break;
		
		case 'ArrowLeft':
		update = control.left ? false : true;
		control.left = true;
		break;

		case 'ArrowRight':
		update = control.right ? false : true;
		control.right = true;
		break;
	}

	// Only inform server if a value has changed
	if (update) {
		socket.emit('input', control);
	}
});

window.addEventListener('keyup', (event) => {
	let update = false;
	switch(event.key) {
		case 'ArrowUp':
		update = control.up ? true : false;
		control.up = false;
		break;
		
		case 'ArrowDown':
		update = control.down ? true : false;
		control.down = false;
		break;
		
		case 'ArrowLeft':
		update = control.left ? true : false;
		control.left = false;
		break;

		case 'ArrowRight':
		update = control.right ? true : false;
		control.right = false;
		break;
	}

	// Only inform server if a value has changed
	if (update) {
		socket.emit('input', control);
	}
});

// -------------------- Implementation --------------------
init();

function init() {
	console.log('Initializing...');
	socket = io();
	console.log(socket);
	socket.on('connect', () => {console.log(`Socket ID: ${socket.id}`)});
}

// Initialize environment
socket.on('initialize', (particleList, mapWidth, mapHeight) => {
	particles = particleList;
	map.width = mapWidth;
	map.height = mapHeight;
	frameX = map.width/2 - innerWidth/2;
	frameY = map.height/2 - innerHeight/2;;
	console.log('Map dimensions: ', map);
	animate();
});

// Update environment
socket.on('update', (particleList) => {
	particles = particleList;
	if(inSession) {
		player = particles.find((element) => {
			return (element.id == socket.id && element.type == 'Player');
		});
		hazard = particles.find((element) => {
			return (element.id == socket.id && element.type == 'Hazard');
		});

		// Keep camera centered on player
		frameX = player.x - innerWidth/2;
		frameY = player.y - innerHeight/2;

		// Special camera work for map borders
		if(innerWidth > map.width) {
			frameX = 0;
		} else if (player.x < innerWidth/2) {
			frameX = 0;
		} else if (player.x > map.width - innerWidth/2) {
			frameX = map.width - innerWidth;
		} 

		if(innerHeight > map.height) {
			frameY = 0;
		} else if (player.y < innerHeight/2) {
			frameY = 0;
		} else if (player.y > map.height - innerHeight/2) {
			frameY = map.height - innerHeight;
		} 
	}
});

// Display environment
function animate() {
	requestAnimationFrame(animate);
	c.clearRect(0, 0, canvas.width, canvas.height);
	drawBoard();
	
	// Connect player with their hazard
	if(hazard && player)
		drawTether(player, hazard);

	// Draw all entities onto map
	particles.forEach(drawParticle);
}

// -------------------- Drawing functions --------------------
function drawParticle(particle) {
	c.save();
	c.beginPath();
	c.arc(particle.x - frameX, particle.y - frameY, particle.radius, 0, Math.PI * 2,  false);

	// Draw particles according to type
	switch(particle.type) {
		case 'Player':
		c.fillStyle = particle.color;
		c.strokeStyle = 'grey';
		c.lineWidth = 5;
		c.stroke();
		break;
		
		case 'Hazard':
		c.fillStyle = 'black';
		c.strokeStyle = particle.color;
		c.lineWidth = 10;
		c.stroke();
		break;

		case 'Photon':
		c.fillStyle = particle.color;
		break;	

		default:
		c.fillStyle = particle.color;
	}
	c.fill();
	c.restore();
}

function drawTether(particle1, particle2) {
	c.lineWidth = 1;
	c.save();
	c.beginPath();
	c.moveTo(particle1.x - frameX, particle1.y - frameY);
	c.lineTo(particle2.x - frameX, particle2.y - frameY);
	c.strokeStyle = particle1.color;
	c.globalAlpha = .2;
	c.lineWidth = 10;
	c.stroke();
	c.restore();
}

function drawBoard(){
	c.beginPath();
	// Draw vertical gridlines
	for (var x = -frameX; x <= map.width-frameX; x += 40) {
	    c.moveTo(0.5 + x, -frameY);
	    c.lineTo(0.5 + x, map.height - frameY);
	}

	// Draw horizontal gridlines
	for (var y = -frameY; y <= map.height-frameY; y += 40) {
	    c.moveTo(-frameX, 0.5 + y);
	    c.lineTo(map.width - frameX, 0.5 + y);
	}

	c.strokeStyle = "black";
	c.stroke();
}
