const functions = require("firebase-functions");

exports.reverseString = functions.https.onCall(data => {
    const reverseString = it => (it === '') ? '' : reverseString(it.substr(1)) + it.charAt(0);
    const reversed = reverseString(data.string);
    return { reversed };
});
