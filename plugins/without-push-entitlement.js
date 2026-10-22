/**
 * Rep schedules local notifications only (the rest timer). expo-notifications
 * adds the iOS push entitlement anyway, and the App Store profile has no push
 * capability, so the archive fails to sign. Remove it until remote push exists.
 */
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (mod) => {
    delete mod.modResults['aps-environment'];
    return mod;
  });
};
