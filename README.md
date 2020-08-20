# gravity-game
Multiplayer game implementing 2d gravity physics created with html canvas, javascript, and node.js.

To host, clone the repository and from the root directory run:  
`docker-compose up -d`

**Default Ports**  
web-client: `3000`  
game-server: `8080`

### Features to add:
- ~~Explain controls better.~~
- ~~Add a way to restart after dying without refreshing page.~~
- ~~Sleep server activity when no one is connected.~~
- Cleanup serverside code and break into node modules.
- ~~Reduce update package size being sent out to reduce lag.~~
- ~~Dockerize game~~
- Allow instancing of game.
- Maybe: Add a database to store user data.
- Improve artwork/graphics.
  - Make black holes easier to identify.
  - Make tether easier to see.
  - Make players easier to identify.
  - Allow players to see other players' tethers?
- *Make the game fun.*

#### TODO:
- Fix up docker compose file (volume mounting for logs/virtual network?)
