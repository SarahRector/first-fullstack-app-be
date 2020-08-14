const client = require('../lib/client');
// import our seed data:
const derby_players = require('./derby_players.js');
const usersData = require('./users.js');
const positionsData = require('./positions.js');
const { getEmoji } = require('../lib/emoji.js');

run();

async function run() {

  try {
    await client.connect();

    const users = await Promise.all(
      usersData.map(user => {
        return client.query(`
                      INSERT INTO users (email, hash)
                      VALUES ($1, $2)
                      RETURNING *;
                  `,
        [user.email, user.hash]);
      })
    );
      
    const user = users[0].rows[0];

    await Promise.all(
      positionsData.map(position => {
        return client.query(`
                      INSERT INTO positions (position)
                      VALUES ($1);
                  `,
        [position.position]);
      })
    );

    await Promise.all(
      derby_players.map(derby_player => {
        return client.query(`
                    INSERT INTO derby_players (derby_name, jersey_number, is_retired, position_id, user_id)
                    VALUES ($1, $2, $3, $4, $5);
                `,
        [derby_player.derby_name, derby_player.jersey_number, derby_player.is_retired, derby_player.position_id, user.id]);
      })
    );
    

    console.log('seed data load complete', getEmoji(), getEmoji(), getEmoji());
  }
  catch(err) {
    console.log(err);
  }
  finally {
    client.end();
  }
    
}
