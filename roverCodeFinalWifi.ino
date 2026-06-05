#include <U8g2lib.h>
#include <Wire.h>
#include <SensirionI2cScd4x.h>
#include <WiFiS3.h>
#include <PubSubClient.h>

// --- CONFIGURATION ECRAN ---
U8G2_SH1106_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE);

// --- CAPTEURS ---
SensirionI2cScd4x capteurCO2; 
uint16_t tauxCO2 = 0; float tempActuelle = 0.0; float humActuelle = 0.0; 
unsigned long dernierTempsCO2 = 0; 
const int trigPin = 8; const int echoPin = 9;

// --- WI-FI & MQTT ---
const char* ssid = "LaboCiel1";          
const char* password = "donneMoiUneBrique";    
const char* mqtt_server = "172.29.17.249";    

WiFiClient espClient;
PubSubClient client(espClient);

// --- MOTEURS ---
const int in1 = 3; const int in2 = 5; 
const int in3 = 6; const int in4 = 7; 

// --- CALIBRATION (RÉGLAGE VITESSE) ---
int vitesseG = 255; 
int vitesseD = 220; 

// --- GESTION DES ETATS ---
bool modeAuto = false;           
String actionActuelle = "ATTENTE"; 

// --- FONCTION MQTT ---
void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) { message += (char)payload[i]; }
  message.trim(); 
  
  Serial.print("Ordre reçu : "); Serial.println(message);

  if (message == "1") { modeAuto = true; actionActuelle = "AUTO"; }
  else if (message == "0") { modeAuto = false; actionActuelle = "STOP"; }
  else if (!modeAuto) {
    if (message == "Avance") actionActuelle = "AVANCE";
    else if (message == "Recule") actionActuelle = "RECULE";
    else if (message == "Gauche") actionActuelle = "GAUCHE";
    else if (message == "Droite") actionActuelle = "DROITE";
    else if (message == "Stop") actionActuelle = "STOP";
  }
}

// --- RECONNEXION MQTT ---
void reconnecterMQTT() {
  while (!client.connected()) {
    Serial.print("Connexion au Broker MQTT...");
    String clientId = "RoverClient-";
    clientId += String(random(0xffff), HEX); 
    
    if (client.connect(clientId.c_str())) {
      Serial.println(" OK !");
      client.subscribe("Rover/move"); 
    } else {
      Serial.print(" Echec, code="); Serial.print(client.state());
      Serial.println(" Essai dans 5 sec");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(in1, OUTPUT); pinMode(in2, OUTPUT); pinMode(in3, OUTPUT); pinMode(in4, OUTPUT);
  stopper(); 
  pinMode(trigPin, OUTPUT); pinMode(echoPin, INPUT);

  Wire.begin(); u8g2.begin();
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }
  
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
  
  capteurCO2.begin(Wire, 0x62);
  capteurCO2.startPeriodicMeasurement();
  delay(2000); 
}

// --- Fonctions Mouvement ---
void avancer()       { analogWrite(in1, vitesseG); digitalWrite(in2, LOW);  analogWrite(in3, vitesseD); digitalWrite(in4, LOW); }
void reculer()       { analogWrite(in1, 0); digitalWrite(in2, HIGH); analogWrite(in3, 0); digitalWrite(in4, HIGH); }
void tournerDroite() { analogWrite(in1, 200); digitalWrite(in2, LOW); analogWrite(in3, 0); digitalWrite(in4, HIGH); }
void tournerGauche() { analogWrite(in1, 0); digitalWrite(in2, HIGH); analogWrite(in3, 200); digitalWrite(in4, LOW); }
void stopper()       { analogWrite(in1, 0); digitalWrite(in2, LOW);  analogWrite(in3, 0);  digitalWrite(in4, LOW); }

int mesurerDistance() {
  digitalWrite(trigPin, LOW); delayMicroseconds(2);
  digitalWrite(trigPin, HIGH); delayMicroseconds(10); digitalWrite(trigPin, LOW);
  long duree = pulseIn(echoPin, HIGH, 30000); 
  return (duree == 0) ? 400 : duree * 0.034 / 2;
}

void loop() {
  if (!client.connected()) {
    reconnecterMQTT();
  }
  client.loop(); 

  // Lecture CO2 et Envoi JSON
  if (millis() - dernierTempsCO2 >= 5000) {
    dernierTempsCO2 = millis(); 
    uint16_t c; float t, h;
    if (capteurCO2.readMeasurement(c, t, h) == 0 && c > 0) { tauxCO2 = c; tempActuelle = t; humActuelle = h; }
    
    String json = "{\"co2\":" + String(tauxCO2) + ",\"temp\":" + String(tempActuelle, 1) + ",\"hum\":" + String(humActuelle, 1) + "}";
    client.publish("rover/mesures", json.c_str());
  }

  int dist = mesurerDistance();

  // Mode Auto avec esquive 90° à gauche perfectionnée
  if (modeAuto) {
    if (dist < 20) {
      actionActuelle = "EVITEMENT";
      stopper();       delay(300); // 1. Arrêt net devant l'obstacle
      reculer();       delay(300); // 2. Léger recul de dégagement
      stopper();       delay(100); 
      tournerGauche(); delay(650); // 3. Pivot franc à 90° vers la gauche (Ajuste la durée si besoin)
      stopper();       delay(200); // 4. Stabilisation avant de repartir
    } else {
      avancer();
      actionActuelle = "AUTO";
    }
  } else {
    // Mode Manuel
    if (dist < 15 && actionActuelle == "AVANCE") { stopper(); actionActuelle = "MUR !"; }
    
    if      (actionActuelle == "AVANCE") avancer();
    else if (actionActuelle == "RECULE") reculer();
    else if (actionActuelle == "GAUCHE") tournerGauche();
    else if (actionActuelle == "DROITE") tournerDroite();
    else    stopper(); 
  }
  
  // Affichage complet
  u8g2.clearBuffer(); u8g2.setFont(u8g2_font_ncenB08_tr);
  u8g2.drawStr(0, 10, ("Radar  : " + String(dist) + " cm").c_str());
  u8g2.drawStr(0, 23, ("CO2    : " + String(tauxCO2) + " ppm").c_str());
  u8g2.drawStr(0, 36, ("Temp   : " + String(tempActuelle, 1) + " C").c_str());
  u8g2.drawStr(0, 49, ("Humid. : " + String(humActuelle, 1) + " %").c_str());
  u8g2.drawStr(0, 62, ("Action : " + actionActuelle).c_str());
  u8g2.sendBuffer();
  
  delay(50);
}