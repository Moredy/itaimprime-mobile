const { withAndroidManifest } = require("expo/config-plugins");

/**
 * O app trava a tela em retrato (orientation: "portrait"). O Google Play deduz
 * disso que o aparelho PRECISA ter tela em retrato e esconde o app de tablets,
 * Chromebooks e Android XR. Declarar o recurso explicitamente como opcional
 * remove essa restrição sem mudar a orientação do app.
 */
const OPTIONAL_FEATURES = ["android.hardware.screen.portrait"];

module.exports = function withOptionalScreenFeatures(config) {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;
    const features = (manifest["uses-feature"] = manifest["uses-feature"] ?? []);

    for (const name of OPTIONAL_FEATURES) {
      const existing = features.find((feature) => feature.$?.["android:name"] === name);
      if (existing) {
        existing.$["android:required"] = "false";
      } else {
        features.push({ $: { "android:name": name, "android:required": "false" } });
      }
    }

    return modConfig;
  });
};
