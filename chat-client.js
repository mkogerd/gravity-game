class ChatClient {
	constructor(params) {
		this.box = document.getElementById('chatBox');
		this.input = document.getElementById('chatInput');
		this.input.addEventListener('keypress', this.submitMsg.bind(this));
		this.feed = document.getElementById('chatFeed');
	}

	// Submit new message
	submitMsg(e) {
		var key = e.which || e.keyCode || 0;
		if (key === 13) {
			if (this.input.value !== '') {
				socket.emit('message', this.input.value);
				this.input.value = "";
			}
		}
	}

	// Append a new line to the chatbox
	appendMsg(name, msg) {
		var x = document.createElement("li");
		x.innerHTML = '<b>' + name + '</b>: ' + msg;
		this.feed.appendChild(x);
		this.feed.scrollTo(0, this.feed.scrollHeight);
	}

	// Show chatbox 
	show() {
		this.box.style.display = 'block';
		this.input.focus();
	}

	// Hide chatbox
	hide() {
		this.box.style.display = 'none';
		this.input.blur();
	}
}
