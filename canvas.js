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
		console.log('keyDown');
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
		console.log('keyup');
		socket.emit('input', control);
	}
});

// -------------------- Implementation --------------------
init();

function init() {
	console.log('Initializing...');
	socket = io();
	console.log(socket);
	socket.on('connect', () => {console.log(socket.id)});
}

// Initialize environment
socket.on('initialize', (particleList, id) => {
	particles = particleList;
	animate();
});

// Update environment
socket.on('update', (particleList) => {
	particles = particleList;
});

// Display environment
function animate() {
	requestAnimationFrame(animate);
	c.clearRect(0, 0, canvas.width, canvas.height);
	
	// Draw all entities onto map
	particles.forEach(drawParticle);
}

// -------------------- Drawing functions --------------------
function drawParticle(particle) {
	c.beginPath();
	c.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2,  false);
	c.fillStyle = particle.color;
	c.fill();
	c.strokeStyle = particle.color;
	c.stroke();
	c.closePath();
};
