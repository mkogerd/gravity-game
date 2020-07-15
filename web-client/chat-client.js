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
				let data = new ArrayBuffer(this.input.value.length + 1);

				// Set header
				let header = new DataView(data, 0, 1);
				header.setUint8(0, commandEnum.SENDMSG);

				// Set payload
				let payload = new Uint8Array(data, 1);
				let enc = new TextEncoder('utf-8');
				let message = enc.encode(this.input.value);
				payload.set(message);

				socket.send(data);
				
				// Clear input
				this.input.value = "";
			}
		}
	}

	// Append a new line to the chatbox
	appendMsg(name, msg) {
		// Sanitize inputs
		const nametag = document.createElement("b");
		nametag.innerText = `${name}: `;
		const message = document.createTextNode(msg);

		// Post message
		const post = document.createElement("li");
		post.appendChild(nametag);
		post.appendChild(message);
		this.feed.appendChild(post);
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
