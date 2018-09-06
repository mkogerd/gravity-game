let btn = document.getElementById('startButton');
let nameInput = document.getElementById('nameInput');
let startMenu = document.getElementById('startMenu');
let inSession = false;

let chat = new ChatClient();
let leaderboard = new LeaderBoard();
let canvas;
socket = io();
console.log(socket);
socket.on('connect', () => {console.log(`Socket ID: ${socket.id}`)});

btn.onclick = startGame; 
function startGame() {
	nameInput.blur();
	startMenu.style.display = 'none';
	chatBox.style.display = 'block';
	socket.emit('startRequest', nameInput.value);
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
socket.on('initialize', (particleList, mapWidth, mapHeight) => {
	canvas = new Canvas(particleList, mapWidth, mapHeight);
	canvas.animate();
});

// Start game after server generates player
socket.on('start', () => {
	canvas.cvs.focus();
	inSession = true;
});

// Post new received message
socket.on('message', (name, msg) => {
	chat.appendMsg(name, msg);
});

// Leaderboard handling
socket.on('update', (particleList) => {
	leaderboard.update(particleList);
	canvas.update(particleList);
});


