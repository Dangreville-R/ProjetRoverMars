const { Session } = require('api-ecoledirecte');

async function main() {
    try {
        const session = new Session();
        const account = await session.login('Lefevre Noah', 'Noah161206');
        console.log("SUCCESS", session.accounts);
    } catch (e) {
        console.error("FAIL", e);
    }
}
main();
