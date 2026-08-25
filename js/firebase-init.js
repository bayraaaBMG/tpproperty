  // ===== FIREBASE INIT =====
  const firebaseConfig = {
    apiKey: "AIzaSyDl34Ow-YN1KqQgfLdyf6IgBFveIPD09-Y",
    authDomain: "tpproperty-c383e.firebaseapp.com",
    projectId: "tpproperty-c383e",
    storageBucket: "tpproperty-c383e.firebasestorage.app",
    messagingSenderId: "55121095219",
    appId: "1:55121095219:web:f69c2876f1dbf1ae461146",
    measurementId: "G-1B5N2LLT6P"
  };
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  const storage = firebase.storage();

