import { onCall } from "firebase-functions/https";

const reverse = (it) => (it === '') ? '' : reverse(it.substr(1)) + it.charAt(0);

export const reverseString = onCall(({ data }) => {
    return { reversed: reverse(data.string) };
});
