const ed = require('ecoledirecte.js');

async function main() {
    try {
        const session = new ed.Session();
        const account = await session.login('Lefevre Noah', 'Noah161206');
        console.log("SUCCESS", account);
    } catch (e) {
        console.error("FAIL", e);
    }
}
main();
