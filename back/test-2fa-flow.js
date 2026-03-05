const { Session } = require('api-ecoledirecte');

async function main() {
    const session = new Session();
    try {
        console.log("1. Initial login attempt...");
        try {
            await session.login('Lefevre Noah', 'Noah161206');
        } catch (err) {
            if (err.code === 250) {
                console.log("2FA Required. Fetching question...");
                const questionData = await session.fetch2FAQuestion('Lefevre Noah', 'Noah161206');
                console.log("Question:", questionData.question);

                // Assuming the user picks the correct answer
                // Since I don't know the answer, I'll stop here OR I'll try to guess if simple?
                // But wait, I can see the propositions in the screenshot.
                // It asks for month of birth or year of birth?
                // Screenshot 1: "Quel est votre mois de naissance ?"
                // Screenshot 2: "Quelle est votre année de naissance ?"

                // I can't finish the test without the answer.
            } else {
                console.error("Login failed with other error:", err);
            }
        }
    } catch (e) {
        console.error("FAIL", e);
    }
}
main();
