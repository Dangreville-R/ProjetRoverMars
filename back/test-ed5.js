const axios = require('axios');
async function test() {
    try {
        const payload = {
            "identifiant": "Lefevre Noah",
            "motdepasse": "Noah161206",
            "isReLogin": false,
            "uuid": "",
            "fa": [
                {
                    "cn": "LD_UExVTUVMUGgwMlc0MkptKV8xMjg2MQ==",
                    "cv": "NmU3ODRiNjE2NzcyNGMzMDczMzI2TVQNTI2NDUzNjE1NzZjNjI3NTQ5NjYyNDYyNzA3NTc2NmU0Yzcx"
                }
            ],
            "uniq": false
        };

        const response = await axios.post(
            'https://api.ecoledirecte.com/v3/login.awp?v=4.96.2',
            `data=${encodeURIComponent(JSON.stringify(payload))}`,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
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
