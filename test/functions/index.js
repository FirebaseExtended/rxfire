const functions = require("firebase-functions");

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

exports.reverseString = functions.https.onCall(data => {
    const reverseString = it => (it === '') ? '' : reverseString(it.substr(1)) + it.charAt(0);
    const reversed = reverseString(data.string);
    return { reversed };
});
