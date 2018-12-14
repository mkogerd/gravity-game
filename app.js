let btn = document.getElementById('startButton');
let nameInput = document.getElementById('nameInput');
let startMenu = document.getElementById('startMenu');
let inSession = false;

let chat = new ChatClient();
let leaderboard = new LeaderBoard();
let canvas;

// ------------------- New socket stuff ---------------------
socket = new WebSocket('ws://localhost:8080');
socket.binaryType = 'arraybuffer';

socket.onopen = (event) => {
	console.log("Connection is open");
	console.log(socket);
};

// Listen for commands from the server
const commandList = ['initialize', 'start', 'chatMsg', 'update'];
socket.onmessage = (event) => {
	let dv = new DataView(event.data);
	let command = dv.getUint8(0);

	socket.dispatchEvent(new CustomEvent(commandList[command], {detail: dv}));
};
// ----------------------- End new socket stuff ------------------

btn.onclick = startGame; 
function startGame() {
	nameInput.blur();
	startMenu.style.display = 'none';
	chatBox.style.display = 'block';
	socket.send(new Uint8Array([0, 0, 0, 0]).buffer);
}

function onDeath() {
	// Reset screen to start menu
	inSession = false;
	startMenu.style.display = 'block';
	chatBox.style.display = 'none';
	nameInput.focus();
	// Clear arrow input status
	Object.keys(canvas.control).forEach(dir => canvas.control[dir] = false);
}

// Game focus handling
addEventListener('keydown', (event) => {
	if (event.key == 'Enter') {
		if (document.activeElement === nameInput)
			startGame();
		else if (inSession) {
			chat.show();
		}
		else 
			nameInput.focus();
	}
	if (event.key == 'Escape') {
		chat.hide();
		canvas.cvs.focus();
	}
});

// ---------- Socket Listeners ----------
// Initialize environment
//socket.add('initialize', (particleList, mapWidth, mapHeight) => {
socket.addEventListener('initialize', (e) => {
	console.log('Command to initialize environment received');
	console.log(e.detail);
	let dv = e.detail;
	socket.id = dv.getUint8(1);
	let mapWidth = dv.getUint16(2);
	let mapHeight = dv.getUint16(4);
	let particleList = [];
	for (let i = 6; i < dv.byteLength; i = i + 9) {
		console.log(dv.getUint8(i));
		let particle = {
			id:		dv.getUint8(i),
			type:	dv.getUint8(i + 1),
			color:	dv.getUint8(i + 2),
			x:		dv.getUint16(i + 3),
			y:		dv.getUint16(i + 5),
			radius: dv.getUint16(i + 7),
		};
		particleList.push(particle);
	}
	console.log('width: ' + mapWidth + ', height: ' + mapHeight);
	console.log(particleList);
	console.log('PID: ' + socket.id);
	canvas = new Canvas(particleList, mapWidth, mapHeight);
	canvas.animate();
});

// Start game after server generates player
//socket.on('start', () => {
socket.addEventListener('start', (e) => {
	console.log('Command to start game received');
	canvas.cvs.focus();
	inSession = true;
});

// Post new received message
//socket.on('message', (name, msg) => {
socket.addEventListener('chatMsg', (e) => {
	console.log('Command to append chat message received');
	//chat.appendMsg(name, msg);
});

// Leaderboard handling
//socket.on('update', (particleList) => {
socket.addEventListener('update', (e) => {
	//console.log('Command to update leaderboard and canvas recieved');
	// Check if player was eliminated
	//if (inSession && particleList.find((particle) => { return (particle.id == socket.id && particle.type == 'Player'); }) == null) 
	//	onDeath();

	//leaderboard.update(particleList);
	//canvas.update(particleList, inSession);
	let dv = e.detail;
	let particleList = [];
	for (let i = 1; i < dv.byteLength; i = i + 9) {
		let particle = {
			id:		dv.getUint8(i),
			type:	dv.getUint8(i + 1),
			color:	dv.getUint8(i + 2),
			x:		dv.getUint16(i + 3),
			y:		dv.getUint16(i + 5),
			radius: dv.getUint16(i + 7),
		};
		particleList.push(particle);
	}
	canvas.update(particleList, inSession);


});


