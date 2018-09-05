class LeaderBoard {
	constructor() {
		this.list = document.getElementById('leaderList');
		this.numLeaders = 5;
	}

	// Update
	update(particleList) {
		// Find all hazards, their mass determines score
		let hazards = particleList.filter((element) => {
			return (element.type == 'Hazard');
		});

		// Sort them by biggest to smallest mass
		hazards.sort((a,b) => {
			return (a.mass > b.mass) ? -1 : ((b.mass > a.mass) ? 1 : 0);
		});
		
		// Fill leaderboard
		let leaderUpdateStr = '';
		for (let i = 0; i < this.numLeaders; i++) {
			if(i < hazards.length)
				leaderUpdateStr += '<li>' + hazards[i].name + ' - ' + hazards[i].mass + '</li>';	
			else leaderUpdateStr += '<li></li>';
		}
		this.list.innerHTML = leaderUpdateStr;
	}
}
