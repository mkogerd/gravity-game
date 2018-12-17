let btn = document.getElementById('startButton');
let nameInput = document.getElementById('nameInput');
let startMenu = document.getElementById('startMenu');
let inSession = false;

let chat = new ChatClient();
let leaderboard = new LeaderBoard();
let canvas;
const playerList = new  Array(256);	// Length should match max number of possible PIDs

// ------------------- New socket stuff ---------------------
socket = new WebSocket('ws://localhost:8080');
socket.binaryType = 'arraybuffer';

// Incoming communications
const commandList = ['initialize', 'start', 'chatMsg', 'update', 'addPlayer', 'removePlayer'];

// Outgoing communications
const commandEnum = {
	STARTREQ: 0,
	CTRLUPDATE: 1,
	SENDMSG: 2,
};

socket.onopen = (event) => {
	console.log("Connection is open");
	console.log(socket);
};

// Listen for commands from the server
socket.onmessage = (event) => {
	let command = new DataView(event.data).getUint8(0);
	let data = new DataView(event.data, 1); // Byte offset of 1
	socket.dispatchEvent(new CustomEvent(commandList[command], {detail: data}));
};
// ----------------------- End new socket stuff ------------------

btn.onclick = startGame; 
function startGame() {
	nameInput.blur();
	startMenu.style.display = 'none';
	chatBox.style.display = 'block';

	// Create start request
	let data = new ArrayBuffer(nameInput.value.length + 1);

	// Set header
	let header = new DataView(data, 0, 1);
	header.setUint8(0, commandEnum.STARTREQ);

	// Set payload
	let payload = new Uint8Array(data, 1);
	let enc = new TextEncoder('utf-8');
	let name = enc.encode(nameInput.value);
	payload.set(name);

	socket.send(data);
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
socket.addEventListener('initialize', (e) => {
	console.log('Command to initialize environment received');

	let dv = e.detail;
	socket.id = dv.getUint8(0);
	let mapWidth = dv.getUint16(1);
	let mapHeight = dv.getUint16(3);

	// Extract game state from message
	let particleList = decodeParticleList(new DataView(dv.buffer, 6));

	//console.log('width: ' + mapWidth + ', height: ' + mapHeight);
	//console.log(particleList);
	//console.log('PID: ' + socket.id);
	canvas = new Canvas(particleList, mapWidth, mapHeight);
	canvas.animate();
});

// Start game after server generates player
socket.addEventListener('start', (e) => {
	console.log('Command to start game received');
	canvas.cvs.focus();
	inSession = true;
});

// Post new received message
socket.addEventListener('chatMsg', (e) => {
	let dec = new TextDecoder("utf-8");
	let id = e.detail.getUint8(0)
	let binaryMsg = new DataView(e.detail.buffer, e.detail.byteOffset + 1);
	let msg = dec.decode(binaryMsg);
	chat.appendMsg(playerList[id], msg);
});

// Update leaderboard and canvas
socket.addEventListener('update', (e) => {
	// Extract game state from message
	let particleList = decodeParticleList(e.detail);

	// Check if player was eliminated
	if (inSession && particleList.find((particle) => { return (particle.id == socket.id && particle.type == typeEnum.PLAYER); }) == null) { 
		onDeath();
	}

	// Update canvas element with gamestate
	canvas.update(particleList, inSession);
	leaderboard.update(particleList);
});

// Add new player name / PID association (mainly for chat)
socket.addEventListener('addPlayer', (e) => {
	let dec = new TextDecoder('utf-8');
	let id = e.detail.getUint8(0)
	let payload = new DataView(e.detail.buffer, e.detail.byteOffset + 1);
	let name = dec.decode(payload);
	playerList[id] = name;
});

// ---------- Helper Functions ----------
function decodeParticleList(dv) {
	let particleList = [];
	let particleByteSize = 9;
	for (let i = 0; i < dv.byteLength; i = i + particleByteSize) {
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
	return particleList;
}

