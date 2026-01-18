const firebaseConfig = {
  apiKey: "AIzaSyB59LhoKYV6TYNGS-CLZEoRE-dVUh-jLyQ",
  authDomain: "aromaellagomdives.firebaseapp.com",
  projectId: "aromaellagomdives",
  storageBucket: "aromaellagomdives.firebasestorage.app",
  messagingSenderId: "1084352438086",
  appId: "1:1084352438086:web:d0810d117add3fd3204f47",
  measurementId: "G-B7WRD15R66"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const storage = firebase.storage();
