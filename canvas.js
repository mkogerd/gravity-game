const typeEnum = {
	PARTICLE: 0,
	PLAYER: 1,
	HAZARD: 2,
	PHOTON: 3,
};
const colors = [
	'#2F2933',
	'#01A2A6',
	'#29D9C2',
	'#BDF271',
	'#FFFFA6'
];

class Canvas {
	constructor(particleList, mapWidth, mapHeight) {
		// NOTE: The canvas element must have a tabindex set to allow focus (and key events)
		this.cvs = document.getElementById("cvs");
		this.ctx = this.cvs.getContext('2d');
		this.cvs.width = innerWidth;
		this.cvs.height = innerHeight;
		

		// Canvas elements
		this.particles = particleList;
		this.player;
		this.hazard;
		this.map = {
			width: mapWidth,
			height: mapHeight
		};
		this.frame = {
			x: mapWidth/2 - innerWidth/2,
			y: mapHeight/2 - innerHeight/2
		};

		// Canvas event listeners
		this.cvs.addEventListener('keydown', this.handleKeyDown.bind(this));
		this.cvs.addEventListener('keyup', this.handleKeyUp.bind(this));
		window.addEventListener('resize', this.handleResize.bind(this));
		this.control = {
			up: false,
			down: false,
			left: false,
			right: false
		}
	}

	update(particleList, trackPlayer) {
		this.particles = particleList;

		if(trackPlayer) {
			this.player = this.particles.find((element) => {
				return (element.id == socket.id && element.type == typeEnum.PLAYER /*'Player'*/);
			});
			this.hazard = this.particles.find((element) => {
				return (element.id == socket.id && element.type == typeEnum.HAZARD /*'Hazard'*/);
			});

			// Keep camera centered on player
			this.frame.x = this.player.x - innerWidth/2;
			this.frame.y = this.player.y - innerHeight/2;

			// Special camera work for map borders
			if(innerWidth > this.map.width) {
				this.frame.x = 0;
			} else if (this.player.x < innerWidth/2) {
				this.frame.x = 0;
			} else if (this.player.x > this.map.width - innerWidth/2) {
				this.frame.x = this.map.width - innerWidth;
			} 

			if(innerHeight > this.map.height) {
				this.frame.y = 0;
			} else if (this.player.y < innerHeight/2) {
				this.frame.y = 0;
			} else if (this.player.y > this.map.height - innerHeight/2) {
				this.frame.y = this.map.height - innerHeight;
			} 
		}
	}

	animate() {
		requestAnimationFrame(this.animate.bind(this));
		this.ctx.clearRect(0, 0, this.cvs.width, this.cvs.height);
		this.drawBoard();
		
		// Connect player with their hazard
		if(this.hazard && this.player)
			this.drawTether(this.player, this.hazard);

		// Draw all entities onto map
		if (this.particles) 
			this.particles.forEach(this.drawParticle.bind(this));
	}

	// -------------------- Drawing Functions --------------------
	// Draw a particle depending on its type
	drawParticle(particle) {
		let c = this.ctx;
		c.save();
		c.beginPath();
		c.arc(particle.x - this.frame.x, particle.y - this.frame.y, particle.radius, 0, Math.PI * 2,  false);

		// Draw particles according to type
		switch(particle.type) {
			case typeEnum.PLAYER:
			c.fillStyle = colors[particle.color];
			c.strokeStyle = 'grey';
			c.lineWidth = 5;
			c.stroke();
			break;
			
			case typeEnum.HAZARD:
			c.fillStyle = 'black';
			c.strokeStyle = colors[particle.color];
			c.lineWidth = 10;
			c.stroke();
			break;

			case typeEnum.PHOTON:
			c.fillStyle = colors[particle.color];
			break;	

			default:
			//console.log(this.colors[particle.color]);
			c.fillStyle = colors[particle.color];
		}
		c.fill();
		c.restore();
	}

	// Draw tether between specified particles
	drawTether(particle1, particle2) {
		let c = this.ctx;
		c.lineWidth = 1;
		c.save();
		c.beginPath();
		c.moveTo(particle1.x - this.frame.x, particle1.y - this.frame.y);
		c.lineTo(particle2.x - this.frame.x, particle2.y - this.frame.y);
		c.strokeStyle = colors[particle1.color];
		c.globalAlpha = .2;
		c.lineWidth = 10;
		c.stroke();
		c.restore();
	}

	// Draw the background gridlines 
	drawBoard() {
		this.ctx.beginPath();
		// Draw vertical gridlines
		for (var x = -this.frame.x; x <= this.map.width - this.frame.x; x += 40) {
		    this.ctx.moveTo(0.5 + x, -this.frame.y);
		    this.ctx.lineTo(0.5 + x, this.map.height - this.frame.y);
		}

		// Draw horizontal gridlines
		for (var y = -this.frame.y; y <= this.map.height - this.frame.y; y += 40) {
		    this.ctx.moveTo(-this.frame.x, 0.5 + y);
		    this.ctx.lineTo(this.map.width - this.frame.x, 0.5 + y);
		}

		this.ctx.strokeStyle = "black";
		this.ctx.stroke();
	}

	// -------------------- Event Handlers --------------------
	// Change direction if arrow key pressed
	handleKeyDown(event) {
		let update = false;
		switch(event.key) {
			case 'ArrowUp':
			update = this.control.up ? false : true;
			this.control.up = true;
			break;
			
			case 'ArrowDown':
			update = this.control.down ? false : true;
			this.control.down = true;
			break;
			
			case 'ArrowLeft':
			update = this.control.left ? false : true;
			this.control.left = true;
			break;

			case 'ArrowRight':
			update = this.control.right ? false : true;
			this.control.right = true;
			break;
		}
		
		// Only inform server if a value has changed
		if (update) {
			let binData = 0;
			if (this.control.up) binData += 1;
			if (this.control.down) binData += 2;
			if (this.control.left) binData += 4;
			if (this.control.right) binData += 8;

			let buffer = new ArrayBuffer(2);
			let view = new DataView(buffer);
			view.setUint8(0, commandEnum.CTRLUPDATE);
			view.setUint8(1, binData);
			socket.send(buffer);
		}
	}

	// Stop direction when arrow key released
	handleKeyUp(event) {
		let update = false;
		switch(event.key) {
			case 'ArrowUp':
			update = this.control.up ? true : false;
			this.control.up = false;
			break;
			
			case 'ArrowDown':
			update = this.control.down ? true : false;
			this.control.down = false;
			break;
			
			case 'ArrowLeft':
			update = this.control.left ? true : false;
			this.control.left = false;
			break;

			case 'ArrowRight':
			update = this.control.right ? true : false;
			this.control.right = false;
			break;
		}
		
		// Only inform server if a value has changed
		if (update) {
			let binData = 0;
			if (this.control.up) binData += 1;
			if (this.control.down) binData += 2;
			if (this.control.left) binData += 4;
			if (this.control.right) binData += 8;

			let buffer = new ArrayBuffer(2);
			let view = new DataView(buffer);
			view.setUint8(0, commandEnum.CTRLUPDATE);
			view.setUint8(1, binData);
			socket.send(buffer);
		}
	}

	// Resize the canvas to fill screen whenever screen resizes
	handleResize() {
		this.cvs.width = innerWidth;
		this.cvs.height = innerHeight;
	}
}
