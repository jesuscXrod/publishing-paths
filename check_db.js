import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function check() {
  const brandsSnap = await getDocs(collection(db, "brands"));
  console.log("Brands count:", brandsSnap.size);
  const vehiclesSnap = await getDocs(collection(db, "vehicles"));
  console.log("Vehicles count:", vehiclesSnap.size);
  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
