import axios from "axios";
import { SettingsSection } from "spcr-settings";

let currentColor: string;
let currentBrightness: number;

function hex_to_integer(hex: string) {
  return parseInt(hex.replace(/^#/, ""), 16);
}

function getSetting<T>(key: string, defaultValue: T): T {
  try {
    const value = Spicetify.LocalStorage.get(key);
    return value ? JSON.parse(value).value : defaultValue;
  } catch {
    return defaultValue;
  }
}

async function sendGoveeRequest(
  apiKey: string,
  modelName: string,
  deviceID: string,
  capability: object
): Promise<void> {
  const url =
    "https://cors-proxy.spicetify.app/https://openapi.api.govee.com/router/api/v1/device/control";
  const headers = {
    "Content-Type": "application/json",
    "Govee-API-Key": apiKey,
  };
  const json = {
    requestId: String(Date.now()),
    payload: {
      sku: modelName,
      device: deviceID,
      capability: capability,
    },
  };

  try {
    await axios.post(url, json, { headers });
  } catch (error) {
    console.error("Error changing lights:", error);
    Spicetify.showNotification(
      "Failed to change lights, please check your settings.",
      true
    );
  }
}

async function changeGoveeColor(
  apiKey: string,
  devices: Array<{ model: string; id: string }>,
  color: string
): Promise<void> {
  const rgbValue = hex_to_integer(color);
  const capability = {
    type: "devices.capabilities.color_setting",
    instance: "colorRgb",
    value: rgbValue,
  };

  await Promise.allSettled(
    devices.map((d) => sendGoveeRequest(apiKey, d.model, d.id, capability))
  );
  console.debug(`Set all lights to ${color}`);
}

async function changeGoveeBrightness(
  apiKey: string,
  devices: Array<{ model: string; id: string }>,
  brightness: number
): Promise<void> {
  const capability = {
    type: "devices.capabilities.range",
    instance: "brightness",
    value: brightness,
  };

  await Promise.allSettled(
    devices.map((d) => sendGoveeRequest(apiKey, d.model, d.id, capability))
  );
  console.debug(`Set brightness to ${brightness}`);
}

async function handlePlaybackChange(event: any): Promise<void> {
  if (!event?.data.isPaused) {
    await handlePlayOrChange();
  } else if (
    getSetting<boolean>("brightness-settings.darkenPauseLights", false)
  ) {
    await handlePause();
  }
}

async function handlePlayOrChange(): Promise<void> {
  try {
    const onOff = getSetting<boolean>("govee-lights.on-off", false);
    const apiKey = getSetting<string>("govee-lights.api-key", "");
    const devicesRaw = getSetting<string>("govee-lights.devices", "[]");
    const playingLights = getSetting<number>(
      "brightness-settings.normalBrightness",
      100
    );
    const currentTrack = Spicetify.Player.data.item.uri;

    if (!onOff) return;
    if (!apiKey) throw new Error("Missing API key");
    if (Number.isNaN(playingLights)) throw new Error("Invalid brightness");

    const devices: Array<{ model: string; id: string }> =
      JSON.parse(devicesRaw);
    if (!Array.isArray(devices) || !devices.length)
      throw new Error("No Govee devices configured");

    if (currentBrightness !== playingLights) {
      await changeGoveeBrightness(apiKey, devices, Number(playingLights));
      currentBrightness = playingLights;
    }

    if (currentTrack.startsWith("spotify:local:")) return;

    const albumURI = Spicetify.Player.data.item.metadata.image_xlarge_url;
    const colors = await Spicetify.extractColorPreset(albumURI);
    const selected = colors?.[0]?.colorRaw?.rgb;
    if (!selected) return;

    const selectedColor = `#${(
      (1 << 24) |
      (selected.r << 16) |
      (selected.g << 8) |
      selected.b
    )
      .toString(16)
      .slice(1)}`;
    if (currentColor === selectedColor) return;

    await changeGoveeColor(apiKey, devices, selectedColor);
    currentColor = selectedColor;
  } catch (error) {
    console.error("Error changing lights:", error);
    Spicetify.showNotification(
      "Failed to change lights, please check your settings.",
      true
    );
  }
}

async function handlePause(): Promise<void> {
  try {
    const onOff = getSetting<boolean>("govee-lights.on-off", false);
    const apiKey = getSetting<string>("govee-lights.api-key", "");
    const devicesRaw = getSetting<string>("govee-lights.devices", "[]");
    const pauseLights = getSetting<number>(
      "brightness-settings.pausedBrightness",
      75
    );

    if (!onOff) return;
    if (Number.isNaN(pauseLights)) throw new Error("Invalid brightness");

    const devices: Array<{ model: string; id: string }> =
      JSON.parse(devicesRaw);
    if (!Array.isArray(devices) || !devices.length)
      throw new Error("No Govee devices configured");

    if (currentBrightness === pauseLights) return;

    await changeGoveeBrightness(apiKey, devices, Number(pauseLights));
    currentBrightness = pauseLights;
  } catch (error) {
    console.error("Error changing lights:", error);
    Spicetify.showNotification(
      "Failed to change lights, please check your settings.",
      true
    );
  }
}

async function createSettings(): Promise<void> {
  // main section
  const settings = new SettingsSection("Setup Govee Lights", "govee-lights");
  settings.addToggle("on-off", "Extension on/off", true);
  settings.addInput("api-key", "Govee API Key", "");
  settings.addInput(
    "devices",
    'Devices (JSON array of {"model": "", "id": ""})',
    '[{"model": "", "id": ""}]'
  );
  await settings.pushSettings();

  // brightness section
  const brightnessSettings = new SettingsSection(
    "Govee Brightness settings",
    "brightness-settings"
  );
  brightnessSettings.addToggle(
    "darkenPauseLights",
    "Darken lights when paused",
    true
  );
  brightnessSettings.addInput("normalBrightness", "Playing brightness", "100");
  brightnessSettings.addInput("pausedBrightness", "Paused brightness", "75");
  await brightnessSettings.pushSettings();
}

async function main(): Promise<void> {
  await createSettings();
  Spicetify.Player.addEventListener("songchange", handlePlayOrChange);
  Spicetify.Player.addEventListener("onplaypause", handlePlaybackChange);
}

export default main;
