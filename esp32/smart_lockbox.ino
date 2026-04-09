#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <ESP32Servo.h>

/* WIFI & FIREBASE */
#define WIFI_SSID "YOUR WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define API_KEY "YOUR_API_KEY"
#define DATABASE_URL "FIREBASE_DATABASE_URL"

/* PINS & SETTINGS */
#define SERVO_PIN 18
#define SERVO_OPEN_ANGLE 0
#define SERVO_LOCK_ANGLE 90
#define TRIG_PIN 5
#define ECHO_PIN 4
#define BUZZER_PIN 23

#define BUZZER_TOTAL_DURATION 10000
#define BEEP_ON_MS 400
#define BEEP_OFF_MS 400

FirebaseData fbdo;
FirebaseData stream;
FirebaseAuth auth;
FirebaseConfig config;
Servo lockServo;

/* --- THREAD-SAFE COMMUNICATION FLAGS --- */
volatile bool cmdOpenBox = false;
volatile bool cmdCloseBox = false;
volatile bool cmdStartBuzzer = false;
volatile bool systemUnlocked = false; 

volatile bool reqUploadKey = false; 
volatile bool currentKeyStatus = true;

/* STATE VARIABLES */
String lastBuzzerPattern = "NONE";
bool lastKeyPresent = true;

/* SENSOR CONTROL */
float EMPTY_LOW = 7.0; 
float EMPTY_HIGH = 8.5;
volatile unsigned long echoStart = 0;
volatile unsigned long echoDuration = 0;
volatile bool newDistanceReady = false;

/* DEBOUNCE VARIABLES */
bool candidateKeyPresent = true;
unsigned long candidateKeyTime = 0;

/* ---------------- HARDWARE INTERRUPT ---------------- */
void IRAM_ATTR echoInterrupt() {
  if (digitalRead(ECHO_PIN) == HIGH) {
    echoStart = micros();
  } else {
    echoDuration = micros() - echoStart;
    newDistanceReady = true;
  }
}

/* ---------------- SETUP ---------------- */
void setup() {
  Serial.begin(115200);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, HIGH); // Active LOW off

  attachInterrupt(digitalPinToInterrupt(ECHO_PIN), echoInterrupt, CHANGE);

  // Initial Servo Lock
  lockServo.attach(SERVO_PIN);
  lockServo.write(SERVO_LOCK_ANGLE);
  delay(1000);
  lockServo.detach(); 

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");

  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  
  config.timeout.serverResponse = 10 * 1000;
  config.timeout.socketConnection = 10 * 1000;
  
  Firebase.signUp(&config, &auth, "", "");
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  if (!Firebase.RTDB.beginStream(&stream, "/lockboxes/SmartLock_123/lockbox")) {
    Serial.println("Stream error: " + stream.errorReason());
  }

  xTaskCreatePinnedToCore(networkTask, "NetworkTask", 8192, NULL, 1, NULL, 0);

  Serial.println("System Ready - Cores Split & Collision Protection Active");
}

/* ---------------- CORE 0: NETWORK & FIREBASE TASK ---------------- */
void networkTask(void * parameter) {
  for(;;) {
    if (Firebase.ready()) {
      
      // 1. SAFE UPLOAD
      if (reqUploadKey) {
        reqUploadKey = false; 
        if (Firebase.RTDB.setBool(&fbdo, "/lockboxes/SmartLock_123/lockbox/keyPresent", currentKeyStatus)) {
           Serial.println("NETWORK: Safe Upload Success -> KEY " + String(currentKeyStatus ? "PRESENT" : "MISSING"));
        } else {
           Serial.println("NETWORK: Upload Failed -> " + fbdo.errorReason());
        }
      }

      // 2. READ STREAM
      if (!Firebase.RTDB.readStream(&stream)) {
        // Suppress timeout spam
      }

      if (stream.streamAvailable()) {
        String path = stream.dataPath();
        String dataType = stream.dataType();
        
        if (path != "/keyPresent") {
          
          if (dataType == "string") {
            processFirebaseData(path, stream.stringData());
          } 
          else if (dataType == "json") {
            FirebaseJson *json = stream.jsonObjectPtr();
            FirebaseJsonData result;

            // Process State and Buzzer independently so one doesn't block the other
            if (json->get(result, "state")) {
                processFirebaseData("/state", result.stringValue);
            }
            if (json->get(result, "buzzer/pattern")) {
                processFirebaseData("/buzzer/pattern", result.stringValue);
            }
            if (path == "/buzzer" && json->get(result, "pattern")) {
               processFirebaseData("/buzzer/pattern", result.stringValue);
            }
          }
        }
      }
    }
    vTaskDelay(50 / portTICK_PERIOD_MS); 
  }
}

// Helper for Core 0 to parse commands and set flags for Core 1
void processFirebaseData(String path, String value) {
  if (path == "/state") {
    if (value == "UNLOCKED") {
      cmdOpenBox = true;
      systemUnlocked = true;
      Serial.println("NETWORK: Unlock command received");
    } else if (value == "LOCKED") {
      cmdCloseBox = true;
      systemUnlocked = false;
      Serial.println("NETWORK: Lock command received");
    }
  } 
  else if (path == "/buzzer/pattern" || path == "/pattern") {
    // FIXED: Exact string match to your frontend architecture
    if ((value == "WARNING_1_MIN" || value == "KEY_NOT_RETURNED") && value != lastBuzzerPattern) {
      cmdStartBuzzer = true;
      lastBuzzerPattern = value;
      Serial.println("NETWORK: Buzzer command received -> " + value);
    }
  }
}

/* ---------------- CORE 1: HARDWARE TASK (MAIN LOOP) ---------------- */
void loop() {
  unsigned long now = millis();
  static unsigned long lastPingTime = 0;
  static unsigned long buzzerStart = 0;
  static unsigned long lastBuzzerToggle = 0;
  static bool buzzerActive = false;
  static bool buzzerOn = false;

  /* --- 1. SERVO MANAGEMENT --- */
  if (cmdOpenBox) {
    lockServo.attach(SERVO_PIN);
    lockServo.write(SERVO_OPEN_ANGLE);
    delay(500); 
    lockServo.detach(); 
    Serial.println("HARDWARE: Lockbox OPENED & Servo Detached");
    cmdOpenBox = false;
  }

  if (cmdCloseBox) {
    lockServo.attach(SERVO_PIN);
    lockServo.write(SERVO_LOCK_ANGLE);
    delay(500); 
    lockServo.detach(); 
    Serial.println("HARDWARE: Lockbox CLOSED & Servo Detached");
    cmdCloseBox = false;
  }

  /* --- 2. BUZZER MANAGEMENT --- */
  if (cmdStartBuzzer) {
    buzzerStart = now;
    lastBuzzerToggle = now;
    buzzerActive = true;
    buzzerOn = false; 
    cmdStartBuzzer = false;
    Serial.println("HARDWARE: Buzzer Started");
  }

  if (buzzerActive) {
    if (now - buzzerStart >= BUZZER_TOTAL_DURATION) {
      digitalWrite(BUZZER_PIN, HIGH); 
      buzzerActive = false;
      Serial.println("HARDWARE: Buzzer Stopped");
    } else {
      if (now - lastBuzzerToggle >= (buzzerOn ? BEEP_ON_MS : BEEP_OFF_MS)) {
        buzzerOn = !buzzerOn;
        digitalWrite(BUZZER_PIN, buzzerOn ? LOW : HIGH);
        lastBuzzerToggle = now;
      }
    }
  }

  /* --- 3. SENSOR & DATABASE MANAGEMENT --- */
  if (systemUnlocked && (now - lastPingTime >= 150)) {
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10); 
    digitalWrite(TRIG_PIN, LOW);
    lastPingTime = now;
  }

  if (newDistanceReady && systemUnlocked) {
    float distance = echoDuration * 0.034 / 2;
    newDistanceReady = false; 

    bool currentReadingPresent = !(distance >= EMPTY_LOW && distance <= EMPTY_HIGH);

    if (currentReadingPresent != candidateKeyPresent) {
      candidateKeyPresent = currentReadingPresent;
      candidateKeyTime = now; 
    }

    if ((now - candidateKeyTime > 1000) && (candidateKeyPresent != lastKeyPresent)) {
      
      Serial.print("HARDWARE: Stable Key State Detected -> ");
      Serial.println(candidateKeyPresent ? "PRESENT" : "MISSING");
      
      currentKeyStatus = candidateKeyPresent;
      reqUploadKey = true; 
      
      lastKeyPresent = candidateKeyPresent;
    }
  }

  vTaskDelay(10 / portTICK_PERIOD_MS); 
}