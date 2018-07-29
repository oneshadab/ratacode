import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/database';

// Initalize and export Firebase.
var config = {
    apiKey: "AIzaSyDbAvdQikk_iuqfd0PvS8E4nBQk3tfpT88",
    authDomain: "ratacode.firebaseapp.com",
    databaseURL: "https://ratacode.firebaseio.com",
    projectId: "ratacode",
    storageBucket: "ratacode.appspot.com",
    messagingSenderId: "183854076387"
  };
export default firebase.initializeApp(config);

