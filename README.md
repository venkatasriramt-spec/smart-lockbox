# 🔐 Smart Lockbox System

An IoT-based smart lockbox system that enables secure, remote access to physical keys using an ESP32 microcontroller, Firebase Realtime Database, and a web-based interface.

---

## 📌 Overview

The Smart Lockbox is a cyber-physical system that connects hardware and cloud services to provide real-time access control. Users can lock/unlock the box remotely, monitor key status, and receive alerts through a web application.

The system uses:
- ESP32 for hardware control
- Firebase Realtime Database for communication
- Web application for user interaction

---

## ⚙️ Features

- 🔓 Remote lock/unlock via web interface  
- 📡 Real-time synchronization using Firebase  
- 🔑 Key presence detection using ultrasonic sensor  
- 🔔 Buzzer alerts for warnings  
- 👤 Role-based UI (Owner & Guest)  
- ⚡ Event-driven and low-latency system  

---

## 🏗️ System Architecture
User → Web App → Firebase → ESP32 → Hardware (Servo, Sensor, Buzzer)
↑
└──── Sensor Feedback → Firebase → UI

---

## 📁 Project Structure
smart-lockbox/
├── website/ # Web application (frontend + Firebase integration)
├── esp32/ # ESP32 firmware code (.ino file)
├── docs/ # Diagrams, screenshots, report files
└── README.md


---

## 🧰 Hardware Components

- ESP32 Microcontroller  
- HC-SR04 Ultrasonic Sensor  
- Servo Motor (SG90 or similar)  
- Active Buzzer  
- Power Supply (Battery)  

---

## 🌐 Technologies Used

- Embedded C++ (Arduino framework)  
- Firebase Realtime Database  
- HTML / CSS / JavaScript (Web App)  
- Wi-Fi Communication  

---

## 🚀 Setup Instructions

### 1. Clone the Repository

git clone https://github.com/venkatasriramt-spec/smart-lockbox.git
cd smart-lockbox

### 2. Website Setup
cd website\n
npm install
npm start

Configure Firebase inside your project (use your own credentials).

3. ESP32 Setup
Open the .ino file from the esp32/ folder in Arduino IDE
Install required libraries:
WiFi.h
Firebase ESP Client
ESP32Servo
Update credentials:
#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define API_KEY "YOUR_FIREBASE_API_KEY"
#define DATABASE_URL "YOUR_FIREBASE_DATABASE_URL"
Upload code to ESP32

🔄 Working Principle
User sends command from web app
Firebase updates database
ESP32 listens to changes using stream API
ESP32 executes action:
Servo opens/closes lockbox
Buzzer triggers if needed
Sensor detects key presence
Status is sent back to Firebase
UI updates in real time

📊 Key Functional Modules
Control Module → Lock/Unlock commands
Sensing Module → Ultrasonic key detection
Actuation Module → Servo motor control
Alert Module → Buzzer notifications
Cloud Sync Module → Firebase communication

👨‍💻 Author

Venkata Sriram Topalli
B.Tech Student

📄 License

This project is for academic and educational purposes.
