let btn = document.getElementById('startButton');
let nameInput = document.getElementById('nameInput');
let startMenu = document.getElementById('startMenu');
let inSession = false;

let chat = new ChatClient();
let leaderboard = new LeaderBoard();

btn.onclick = startGame; 
function startGame() {
	nameInput.blur();
	startMenu.style.display = 'none';
	chatBox.style.display = 'block';
	inSession = true;
	socket.emit('start', nameInput.value);
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
	}
});

// Post new received message
socket.on('message', (name, msg) => {
	chat.appendMsg(name, msg);
});

// Leaderboard handling
socket.on('update', (particleList) => {
	leaderboard.update(particleList);
});

