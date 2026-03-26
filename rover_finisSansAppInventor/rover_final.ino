// ============================================================
//  ROVER COMPLET - AUTO + MANUEL + CO2 SCD41 + ÉCRAN OLED
//  Driver  : L298N (cavaliers ENA/ENB en place)
//  Capteurs: HC-SR04 (ultrasons) + SCD41 (CO2/Temp/Hum)
//  Écran   : OLED 128x64 SSD1306 I2C
//  Alim    : 6V (4x AA)
//
//  BRANCHEMENTS :
//  L298N   → IN1:6 | IN2:7 | IN3:8 | IN4:9
//  HC-SR04 → TRIG:12 | ECHO:11
//  SCD41   → SDA:A4 | SCL:A5 | VCC:3.3V | GND:GND
//  OLED    → SDA:A4 | SCL:A5 | VCC:3.3V | GND:GND
//            (SCD41 et OLED partagent le même bus I2C)
//
//  BIBLIOTHÈQUES REQUISES (Gestionnaire de bibliothèques) :
//  - SSD1306Ascii        (par Bill Greiman)
//  - Sensirion I2C SCD4x (par Sensirion)
//
//  COMMANDES SERIAL (115200 bauds | Newline) :
//  AUTO → Mode autonome avec évitement d'obstacles
//  MANU → Mode manuel : AV | AR | DR | GC | STOP
//  CO2  → Afficher les dernières valeurs CO2 dans le serial
// ============================================================

#include <Arduino.h>
#include <Wire.h>
#include <SensirionI2cScd4x.h>
#include "SSD1306Ascii.h"
#include "SSD1306AsciiAvrI2c.h"

// ------------------------------------------------------------
// BROCHES - Driver moteur L298N
// ------------------------------------------------------------
const int IN1 = 6;
const int IN2 = 7;
const int IN3 = 8;
const int IN4 = 9;

// ------------------------------------------------------------
// BROCHES - Capteur HC-SR04
// ------------------------------------------------------------
const int TRIG_PIN = 12;
const int ECHO_PIN = 11;

// ------------------------------------------------------------
// PARAMÈTRES ROVER
// ------------------------------------------------------------
const int DISTANCE_OBSTACLE = 20;   // Seuil obstacle (cm)
const int DUREE_RECUL       = 400;  // Durée recul auto (ms)
const int DUREE_ROTATION    = 500;  // Durée rotation auto (ms)
const int DUREE_5CM         = 300;  // Durée ~5cm manuel (ms) ← à calibrer
const int DUREE_ROT_MANU    = 400;  // Durée rotation manuel (ms) ← à calibrer

// ------------------------------------------------------------
// CAPTEUR CO2 - SCD41 (I2C adresse 0x62)
// ------------------------------------------------------------
SensirionI2cScd4x scd4x;

const unsigned long INTERVALLE_CO2 = 5000; // Lecture toutes les 5s
unsigned long derniereLectureCO2   = 0;

uint16_t dernierCO2   = 0;
float    derniereTemp = 0.0;
float    derniereHum  = 0.0;

// ------------------------------------------------------------
// ÉCRAN OLED - SSD1306 128x64 (I2C adresse 0x3C)
// ------------------------------------------------------------
SSD1306AsciiAvrI2c oled;
#define OLED_ADRESSE 0x3C

long derniereDistance = -1; // Dernière distance mesurée (pour l'OLED)

// ------------------------------------------------------------
// ÉTAT DU MODE (0 = attente, 1 = auto, 2 = manuel)
// ------------------------------------------------------------
int mode = 0;

// ============================================================
//  SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10);

  // --- Moteurs ---
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  arreter();

  // --- HC-SR04 ---
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  // --- OLED ---
  Wire.begin();
  oled.begin(&Adafruit128x64, OLED_ADRESSE);
  oled.setFont(Adafruit5x7);
  oled.clear();
  afficherOledDemarrage();

  // --- SCD41 ---
  scd4x.begin(Wire, 0x62);
  uint16_t erreur = scd4x.stopPeriodicMeasurement();
  if (erreur) {
    Serial.print(F("SCD41 - Erreur stop : "));
    Serial.println(erreur);
  }
  erreur = scd4x.startPeriodicMeasurement();
  if (erreur) {
    Serial.print(F("SCD41 - Erreur lancement : "));
    Serial.println(erreur);
  } else {
    Serial.println(F("SCD41 pret !"));
  }

  afficherMenu();
}

// ============================================================
//  LOOP
// ============================================================
void loop() {

  // Lecture CO2 toutes les 5s (non bloquant)
  lireCO2();

  // Lecture commandes série
  if (Serial.available() > 0) {
    String commande = Serial.readStringUntil('\n');
    commande.trim();
    commande.toUpperCase();

    if (commande == "AUTO") {
      mode = 1;
      arreter();
      Serial.println(F("\n>>> MODE AUTOMATIQUE active <<<"));
      Serial.println(F("    (tapez MANU pour le mode manuel)\n"));
      afficherOledMode("AUTO");

    } else if (commande == "MANU") {
      mode = 2;
      arreter();
      Serial.println(F("\n>>> MODE MANUEL active <<<"));
      Serial.println(F("    Commandes : AV | AR | DR | GC | STOP"));
      Serial.println(F("    (tapez AUTO pour le mode autonome)\n"));
      afficherOledMode("MANU");

    } else if (commande == "CO2") {
      afficherCO2Serial();

    } else if (mode == 2) {
      traiterCommandeManuelle(commande);

    } else {
      Serial.println(F("Commande inconnue. Tapez AUTO, MANU ou CO2."));
    }
  }

  // Mode automatique
  if (mode == 1) {
    executerModeAuto();
  }
}

// ============================================================
//  LECTURE CO2 - Non bloquante
// ============================================================
void lireCO2() {
  if (millis() - derniereLectureCO2 < INTERVALLE_CO2) return;
  derniereLectureCO2 = millis();

  uint16_t co2      = 0;
  float temperature = 0.0;
  float humidity    = 0.0;

  uint16_t erreur = scd4x.readMeasurement(co2, temperature, humidity);

  if (erreur) {
    Serial.print(F("[CO2] Erreur de lecture : "));
    Serial.println(erreur);
  } else if (co2 == 0) {
    Serial.println(F("[CO2] Attente premiere donnee..."));
  } else {
    dernierCO2   = co2;
    derniereTemp = temperature;
    derniereHum  = humidity;
    afficherCO2Serial();
    afficherOledDonnees(); // Mise à jour écran à chaque nouvelle mesure
  }
}

// ============================================================
//  AFFICHAGE OLED
// ============================================================

// --- Écran de démarrage ---
void afficherOledDemarrage() {
  oled.clear();
  oled.set2X();
  oled.setCursor(10, 0);
  oled.println(F("ROVER"));
  oled.set1X();
  oled.setCursor(0, 4);
  oled.println(F("  Initialisation..."));
  oled.setCursor(0, 6);
  oled.println(F("  Tapez AUTO / MANU"));
}

// --- Affiche le mode actif en haut de l'écran ---
void afficherOledMode(const char* nomMode) {
  // Ne rafraîchit que la première ligne pour éviter le clignotement
  oled.clear();
  oled.set1X();

  // Ligne 0 : Mode actif
  oled.setCursor(0, 0);
  oled.print(F(" Mode : "));
  oled.println(nomMode);

  // Séparateur
  oled.setCursor(0, 1);
  oled.println(F("-------------------"));

  // Affiche les données si déjà disponibles
  afficherLignesDonnees();
}

// --- Rafraîchit uniquement les lignes de données (CO2 + distance) ---
void afficherOledDonnees() {
  // Si on est sur l'écran de démarrage (mode 0), on affiche quand même
  if (mode == 0) {
    oled.clear();
    oled.set1X();
    oled.setCursor(0, 0);
    oled.println(F("Mode : ATTENTE"));
    oled.setCursor(0, 1);
    oled.println(F("-------------------"));
  }
  afficherLignesDonnees();
}

// --- Lignes 2 à 7 : données capteurs ---
void afficherLignesDonnees() {
  oled.set1X();

  // Ligne 2 : CO2
  oled.setCursor(0, 2);
  oled.print(F(" CO2  : "));
  if (dernierCO2 > 0) {
    oled.print(dernierCO2);
    oled.print(F(" ppm  "));
  } else {
    oled.print(F("-- ppm  "));
  }

  // Ligne 3 : Température
  oled.setCursor(0, 3);
  oled.print(F(" Temp : "));
  if (dernierCO2 > 0) {
    oled.print(derniereTemp - 5.0, 1); // 1 décimale, correction -5°C
    oled.print(F(" C   "));
  } else {
    oled.print(F("-- C   "));
  }

  // Ligne 4 : Humidité
  oled.setCursor(0, 4);
  oled.print(F(" Hum  : "));
  if (dernierCO2 > 0) {
    oled.print(derniereHum, 1);
    oled.print(F(" %   "));
  } else {
    oled.print(F("-- %   "));
  }

  // Ligne 5 : Séparateur
  oled.setCursor(0, 5);
  oled.println(F("-------------------"));

  // Ligne 6 : Distance HC-SR04
  oled.setCursor(0, 6);
  oled.print(F(" Dist : "));
  if (derniereDistance > 0) {
    oled.print(derniereDistance);
    oled.print(F(" cm   "));
  } else {
    oled.print(F("-- cm   "));
  }
}

// ============================================================
//  MODE AUTOMATIQUE
// ============================================================
void executerModeAuto() {
  long distance = mesurerDistance();
  derniereDistance = distance; // Sauvegarde pour l'OLED

  Serial.print(F(" Distance : "));
  Serial.print(distance);
  Serial.println(F(" cm"));

  // Mise à jour de la distance sur l'OLED (ligne 6 uniquement)
  oled.setCursor(0, 6);
  oled.print(F(" Dist : "));
  if (distance > 0) {
    oled.print(distance);
    oled.print(F(" cm   "));
  } else {
    oled.print(F("-- cm   "));
  }

  if (distance > 0 && distance < DISTANCE_OBSTACLE) {
    Serial.println(F(">> Obstacle ! Arret + manoeuvre..."));
    arreter();
    delay(200);

    reculer();
    delay(DUREE_RECUL);
    arreter();
    delay(200);

    do {
      if (Serial.available() > 0) return;
      tournerDroite();
      delay(DUREE_ROTATION);
      arreter();
      delay(150);
      distance = mesurerDistance();
      derniereDistance = distance;
      Serial.print(F("   Verif rotation : "));
      Serial.print(distance);
      Serial.println(F(" cm"));
    } while (distance > 0 && distance < DISTANCE_OBSTACLE);

    Serial.println(F(">> Voie libre, reprise."));

  } else {
    avancer();
  }

  delay(50);
}

// ============================================================
//  MODE MANUEL
// ============================================================
void traiterCommandeManuelle(String commande) {
  Serial.print(F(">>> Commande : "));
  Serial.println(commande);

  if (commande == "AV") {
    Serial.println(F("Avance ~5cm..."));
    avancer();
    delay(DUREE_5CM);
    arreter();
    Serial.println(F("Arret."));

  } else if (commande == "AR") {
    Serial.println(F("Recule ~5cm..."));
    reculer();
    delay(DUREE_5CM);
    arreter();
    Serial.println(F("Arret."));

  } else if (commande == "DR") {
    Serial.println(F("Tourne a droite..."));
    tournerDroite();
    delay(DUREE_ROT_MANU);
    arreter();
    Serial.println(F("Arret."));

  } else if (commande == "GC") {
    Serial.println(F("Tourne a gauche..."));
    tournerGauche();
    delay(DUREE_ROT_MANU);
    arreter();
    Serial.println(F("Arret."));

  } else if (commande == "STOP") {
    arreter();
    Serial.println(F("Arret force."));

  } else {
    Serial.println(F("Inconnu. Commandes : AV | AR | DR | GC | STOP"));
  }
}

// ============================================================
//  AFFICHAGE SERIAL CO2
// ============================================================
void afficherCO2Serial() {
  if (dernierCO2 == 0) {
    Serial.println(F("[CO2] Pas encore de donnee disponible."));
    return;
  }
  Serial.println(F("---------- CO2 / ENVIRONNEMENT ----------"));
  Serial.print(F("  CO2         : ")); Serial.print(dernierCO2);          Serial.println(F(" ppm"));
  Serial.print(F("  Temperature : ")); Serial.print(derniereTemp - 5.0); Serial.println(F(" C  (corr. -5C)"));
  Serial.print(F("  Humidite    : ")); Serial.print(derniereHum);         Serial.println(F(" %"));
  Serial.println(F("-----------------------------------------"));
}

// ============================================================
//  FONCTIONS DE MOUVEMENT
// ============================================================
void avancer() {
  digitalWrite(IN1, LOW);  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
}

void reculer() {
  digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);  digitalWrite(IN4, HIGH);
}

void tournerDroite() {
  digitalWrite(IN1, LOW);  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, LOW);  digitalWrite(IN4, HIGH);
}

void tournerGauche() {
  digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
}

void arreter() {
  digitalWrite(IN1, LOW); digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW); digitalWrite(IN4, LOW);
}

// ============================================================
//  MESURE DE DISTANCE - HC-SR04
// ============================================================
long mesurerDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duree    = pulseIn(ECHO_PIN, HIGH, 30000);
  long distance = duree / 58;

  if (distance < 2 || distance > 400) return -1;
  return distance;
}

// ============================================================
//  MENU SERIAL AU DÉMARRAGE
// ============================================================
void afficherMenu() {
  Serial.println(F("\n=========================================="));
  Serial.println(F("   ROVER - DEMARRAGE (Serial : 115200)"));
  Serial.println(F("=========================================="));
  Serial.println(F("  AUTO  → Mode autonome (HC-SR04)"));
  Serial.println(F("  MANU  → Mode manuel"));
  Serial.println(F("          AV | AR | DR | GC | STOP"));
  Serial.println(F("  CO2   → Afficher valeurs CO2 dans serial"));
  Serial.println(F("=========================================="));
  Serial.println(F("Choisissez un mode :"));
}
