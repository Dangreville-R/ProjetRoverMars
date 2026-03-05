const axios = require('axios');
async function test() {
    try {
        const response = await axios.post(
            'https://api.ecoledirecte.com/v3/login.awp',
            `data=${JSON.stringify({ identifiant: "test", motdepasse: "test" })}`,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'MUSIC-MUSIC'
                }
            }
        );
        console.log(response.status);
        console.log(response.data);
    } catch (e) {
        if (e.response) {
            console.log('Error', e.response.status, e.response.data);
        } else {
            console.log('Error', e.message);
        }
    }
}
test();
