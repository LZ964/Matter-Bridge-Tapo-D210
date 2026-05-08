require('dotenv').config();
const { loginDevice, getDeviceDetails } = require('tp-link-tapo-connect');
const axios = require('axios');

const {
    TAPO_USERNAME,
    TAPO_PASSWORD,
    CAMERA_IP,
    MATTERBRIDGE_URL,
    POLL_INTERVAL
} = process.env;

let lastEventId = null;
let cloudToken = null;

async function syncToMatter() {
    try {
        console.log("🔔 Événement détecté sur D210 ! Envoi du signal vers Matterbridge...");
        await axios.get(MATTERBRIDGE_URL);
    } catch (error) {
        console.error("❌ Erreur de communication avec Matterbridge:", error.message);
    }
}

async function monitorDoorbell() {
    console.log(`🚀 Middleware démarré. Surveillance de la caméra : ${CAMERA_IP}`);
    
    try {
        cloudToken = await loginDevice(TAPO_USERNAME, TAPO_PASSWORD, CAMERA_IP);
    } catch (err) {
        console.error("❌ Erreur d'authentification initiale:", err.message);
        return;
    }

    setInterval(async () => {
        try {
            const deviceDetails = await getDeviceDetails(cloudToken);
            
            // On surveille le timestamp du dernier événement (last_event_t)
            const currentEventId = deviceDetails.last_event_t || (deviceDetails.result && deviceDetails.result.last_event_t);

            if (currentEventId && currentEventId !== lastEventId) {
                console.log(`✨ Signal reçu : ${currentEventId}`);
                if (lastEventId !== null) {
                    await syncToMatter();
                }
                lastEventId = currentEventId;
            }
        } catch (error) {
            console.log("⚠️ Polling : Caméra hors ligne ou en veille.");
            // Rafraîchissement silencieux du token pour la prochaine tentative
            loginDevice(TAPO_USERNAME, TAPO_PASSWORD, CAMERA_IP)
                .then(token => cloudToken = token)
                .catch(() => {});
        }
    }, parseInt(POLL_INTERVAL) || 5000);
}

monitorDoorbell();