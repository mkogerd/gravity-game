const app = require('express')();
const server = require('http').createServer(app);

console.log('Frontend server running...');

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/static/index.html');
});

app.get('/canvas.js', (req, res) => {
	res.sendFile(__dirname + '/static/canvas.js');
});

app.get('/chat-client.js', (req, res) => {
	res.sendFile(__dirname + '/static/chat-client.js');
});

app.get('/leaderboard.js', (req, res) => {
	res.sendFile(__dirname + '/static/leaderboard.js');
});

app.get('/app.js', (req, res) => {
	res.sendFile(__dirname + '/static/app.js');
});

app.get('/main.css', (req, res) => {
	res.sendFile(__dirname + '/static/main.css');
});

server.listen(process.env.PORT || 3000);
