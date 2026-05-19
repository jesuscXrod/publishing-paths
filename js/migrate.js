import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBcuf-cqieniytKuEPnrrAlQ4jnW0YoFlQ",
  authDomain: "publishing-path.firebaseapp.com",
  projectId: "publishing-path",
  storageBucket: "publishing-path.firebasestorage.app",
  messagingSenderId: "967652547614",
  appId: "1:967652547614:web:ed2fdd34069022f317e20f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function logMsg(msg) {
  console.log(msg);
  document.getElementById("log").innerHTML += `<div>${msg}</div>`;
}

async function migrate() {
  const brands = window.APP_DATA.brands;
  
  for (const brand of brands) {
    // Save brand document
    const brandRef = doc(db, "brands", brand.key);
    await setDoc(brandRef, {
      key: brand.key,
      label: brand.label,
      regions: brand.regions
    });
    logMsg(`✅ Marca guardada: ${brand.label}`);

    // Save vehicles
    for (const vehicle of brand.vehicles) {
      // Create a unique ID for the vehicle (e.g. ford_mustang)
      const vehicleId = `${brand.key}_${vehicle.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      const vehicleRef = doc(db, "vehicles", vehicleId);
      
      const vData = { ...vehicle, brandKey: brand.key };
      // Ensure cfFolders exists as an array
      if (!vData.cfFolders) vData.cfFolders = [];

      await setDoc(vehicleRef, vData);
      logMsg(`🚗 Vehículo guardado: ${vehicle.name} (CF: ${vData.cfFolders.length} carpetas)`);
    }
  }
  
  document.getElementById("status").textContent = "¡Migración completada con éxito!";
  document.getElementById("status").style.color = "#16a34a";
  logMsg("<br/><strong>Puedes cerrar esta pestaña y avisar al asistente que la migración terminó.</strong>");
}

migrate().catch(error => {
  logMsg(`<span style="color:red">ERROR: ${error.message}</span>`);
  document.getElementById("status").textContent = "Error en la migración.";
});
