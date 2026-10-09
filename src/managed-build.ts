/** Replaced only by the Auri workspace packaging adapter. */
declare const __AURI_MANAGED_BUILD__: boolean;
export const MANAGED_BUILD =
	typeof __AURI_MANAGED_BUILD__ !== "undefined" && __AURI_MANAGED_BUILD__;
export const MANAGED_UPDATE_MESSAGE = "This edition is updated with your Auri plugin workspace.";
