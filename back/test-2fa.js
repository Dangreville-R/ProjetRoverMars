const { Session } = require('api-ecoledirecte');

async function main() {
    const session = new Session();
    try {
        console.log("Attempting to get 2FA question...");
        const question = await session.fetch2FAQuestion('Lefevre Noah', 'Noah161206');
        console.log("QUESTION RECEIVED:", question);
    } catch (e) {
        console.error("FAIL", e);
    }
}
main();
