class LeaderBoard {
	constructor() {
		this.list = document.getElementById('leaderList');
		this.numLeaders = 5;
		for (let i = 0; i < this.numLeaders; i++) {
			this.list.appendChild(document.createElement("li"));
		}
	}

	// Update
	update(particleList) {
		// Find all hazards, their mass determines score
		let hazards = particleList.filter((element) => {
			return (element.type == typeEnum.HAZARD);
		});

		// Sort them by biggest to smallest mass
		hazards.sort((a,b) => {
			return (a.radius > b.radius) ? -1 : ((b.radius > a.radius) ? 1 : 0);
		});
		
		// Fill leaderboard
		for (let i = 0; (i < this.numLeaders) && (i < hazards.length); i++) {
			this.list.children[i].innerText = `${playerList[hazards[i].id]} - ${hazards[i].radius}`;
		}
	}
}
