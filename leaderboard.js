class LeaderBoard {
	constructor() {
		this.list = document.getElementById('leaderList');
		this.numLeaders = 5;
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
		console.log('leaderboard updating');
		console.log(hazards)
		
		// Fill leaderboard
		let leaderUpdateStr = '';
		for (let i = 0; i < this.numLeaders; i++) {
			if(i < hazards.length)
				leaderUpdateStr += '<li>' + hazards[i].id + ' - ' + hazards[i].radius + '</li>';	
			else leaderUpdateStr += '<li></li>';
		}
		this.list.innerHTML = leaderUpdateStr;
	}
}
