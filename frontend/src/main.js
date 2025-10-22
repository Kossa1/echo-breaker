import { disableAppVerificationForTesting } from "./auth/testConfig.js";
import { setupRecaptcha } from "./auth/recaptcha.js";
import { sendVerificationCode, confirmCode } from "./auth/phoneAuth.js";
import { TEST_PHONE_NUMBER, TEST_VERIFICATION_CODE } from "./auth/testConfig.js";

disableAppVerificationForTesting();
setupRecaptcha("sign-in-button");

document.getElementById("sign-in-button").onclick = async () => {
  window.confirmationResult = await sendVerificationCode(TEST_PHONE_NUMBER);
};

document.getElementById("verify-button").onclick = async () => {
  const user = await confirmCode(window.confirmationResult, TEST_VERIFICATION_CODE);
  document.getElementById("status").innerText = `Signed in as ${user.uid}`;
};