const mqtt = require("mqtt");

// Connexion au broker MQTT local
const client = mqtt.connect("mqtt://localhost:1883");

// Log Pour Prévenir si la connexion réussit
client.on("connect", () => {
  console.log("Simulateur Rover connecté au broker MQTT");

  // Envoi d'une mesure toutes les 5 secondes
  setInterval(() => {
    const data = {
      temperature: Math.floor(Math.random() * 60) - 30, // -30 à +30
      co2: Math.floor(Math.random() * 500) + 800,       // 800 à 1300
      humidite: Math.floor(Math.random() * 20) + 5      // 5 à 25
    };

    client.publish("rover/mesures", JSON.stringify(data));
    console.log("Données envoyées :", data);
  }, 5000);
});

// Log Pour Prévenir si la connexion échoue
client.on("error", (err) => {
  console.log("Erreur de connexion MQTT :", err.message);
});