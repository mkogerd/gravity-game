class LeaderBoard {
	constructor() {
		this.list = document.getElementById('leaderList');
	}

	// Update
	update(particleList) {
		// Find all hazards, they are what determine score
		let hazards = particleList.filter((element) => {
			return (element.type == 'Hazard');
		});

		// Sort them by biggest to smallest mass
		hazards.sort((a,b) => {
			return (a.mass > b.mass) ? -1 : ((b.mass > a.mass) ? 1 : 0);
		});
		
		// Fill leaderboard
		let items = this.list.children;
		for (let i = 0; i < items.length; i++) {
			if(i < hazards.length)
				items[i].innerHTML = hazards[i].name + ' - ' + hazards[i].mass;	
			else items[i].innerHTML = '';
		}
	}
}
