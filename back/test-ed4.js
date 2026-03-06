const axios = require('axios');
async function test() {
    try {
        const payload = JSON.stringify({ identifiant: "lefevre.noah", motdepasse: "Noah161206" });
        const response = await axios.post(
            'https://api.ecoledirecte.com/v3/login.awp?v=4.53.0',
            `data=${encodeURIComponent(payload)}`,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
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
