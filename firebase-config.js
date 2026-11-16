// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAVdIJwPhPf2CHSELYbQYyV5BtVclOy9W0",
  authDomain: "campus-sentinel-1343d.firebaseapp.com",
  projectId: "campus-sentinel-1343d",
  storageBucket: "campus-sentinel-1343d.firebasestorage.app",
  messagingSenderId: "289593477825",
  appId: "1:289593477825:web:aef422c109691b6d67a240",
  measurementId: "G-MXVHG5TP1G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
