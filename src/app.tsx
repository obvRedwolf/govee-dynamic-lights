import axios from 'axios';
import { SettingsSection } from 'spcr-settings';

let currentColor: string;
let currentBrightness: number;

function hex_to_integer(hex: string) {
  return parseInt(hex.replace(/^#/, ''), 16);
};

function getSetting<T>(key: string, defaultValue: T): T {
  try {
    const value = Spicetify.LocalStorage.get(key);
    return value ? JSON.parse(value).value : defaultValue;
  } catch {
    return defaultValue;
  }
}

async function sendGoveeRequest(apiKey: string, modelName: string, deviceID: string, capability: object): Promise<void> {
  const url = 'https://cors-proxy.spicetify.app/https://openapi.api.govee.com/router/api/v1/device/control';
  const headers = {
    'Content-Type': 'application/json',
    'Govee-API-Key': apiKey
  };
  const json = {
    'requestId': 'uuid',
    'payload': {
        'sku': modelName,
        'device': deviceID,
        'capability': capability,
    },
  };
  
  console.log(json);
  try {
    await axios.post(url, json, { headers });
  } catch (error) {
    console.error('Error changing lights:', error);
    Spicetify.showNotification('Failed to change lights, please check your settings.', true);
  }
}

async function changeWIFIGoveeColor(apiKey: string, modelName: string, deviceID: string, color: string): Promise<void> {
  const rgbValue = hex_to_integer(color);
  await sendGoveeRequest(apiKey, modelName, deviceID, {
    'type': 'devices.capabilities.color_setting',
    'instance': 'colorRgb',
    'value': rgbValue
  });
  console.debug(`Set lights to ${color}`);
}

async function changeWIFIGoveeBrightness(apiKey: string, modelName: string, deviceID: string, brightness: number): Promise<void> {
  await sendGoveeRequest(apiKey, modelName, deviceID, {
    'type': 'devices.capabilities.range',
    'instance': 'brightness',
    'value': brightness
  });
  console.debug(`Set brightness to ${brightness}`);
}

async function handlePlaybackChange(event: any): Promise<void> {
  if (!event?.data.isPaused) {
    await handlePlayOrChange();
  } else if (getSetting<boolean>('darken-lights.darken-pause-lights', false)) {
    await handlePause();
  }
}

async function handlePlayOrChange(): Promise<void> {
  const onOff = getSetting<boolean>('govee-lights.on-off', false);
  const apiKey = getSetting<string>('govee-lights.api-key', '');
  const modelName = getSetting<string>('govee-lights.model-name', '');
  const deviceID = getSetting<string>('govee-lights.device-id', '');
  const playingLights = getSetting<number>('darken-lights.normalBrightness', 100);

  if (!onOff) return;

  try {
    // set brightness
    if (Number.isNaN(playingLights)) throw new Error('Invalid brightness');

    if (currentBrightness !== playingLights) {
      await changeWIFIGoveeBrightness(
        apiKey,
        modelName,
        deviceID,
        Number(playingLights)
      );
      currentBrightness = playingLights;
    };

    const currentTrack = Spicetify.Player.data.item.uri;

    if (currentTrack.startsWith('spotify:local:')) return; // skip if local

    const colors = await Spicetify.colorExtractor(currentTrack);
    const selectedColor = colors.VIBRANT;

    // check for same color
    if (currentColor === selectedColor) return;

    await changeWIFIGoveeColor(
      apiKey,
      modelName,
      deviceID,
      selectedColor
    );
    currentColor = selectedColor;

  }
  catch (error) {
    console.error('Error changing lights:', error);
    Spicetify.showNotification('Failed to change lights, please check your settings.', true);
  };
};

async function handlePause(): Promise<void> {
  const onOff = getSetting<boolean>('govee-lights.on-off', false);
  const apiKey = getSetting<string>('govee-lights.api-key', '');
  const modelName = getSetting<string>('govee-lights.model-name', '');
  const deviceID = getSetting<string>('govee-lights.device-id', '');
  const pauseLights = getSetting<number>('darken-lights.darkenedBrightness', 75);

  if (!onOff) return;

  try {
    if (currentBrightness === pauseLights) return;

    if (Number.isNaN(pauseLights)) throw new Error('Invalid brightness');

    await changeWIFIGoveeBrightness(
      apiKey,
      modelName,
      deviceID,
      Number(pauseLights)
    );
    currentBrightness = pauseLights;

  }
  catch (error) {
    console.error('Error changing lights:', error);
    Spicetify.showNotification('Failed to change lights, please check your settings.', true);
  };
};

async function createSettings(): Promise<void> {
  // main section
  const settings = new SettingsSection('Setup Govee Lights', 'govee-lights');
  settings.addToggle('on-off', 'Extension on/off', true);
  settings.addInput('api-key', 'Govee API Key ', '');
  settings.addInput('model-name', 'Device model name', '');
  settings.addInput('device-id', 'Device ID', '');
  await settings.pushSettings();

  // brightness section
  const darkenLightsSettings = new SettingsSection("Govee Brightness settings", "darken-lights");
  darkenLightsSettings.addToggle('darken-pause-lights', 'Darken lights when paused', true);
  darkenLightsSettings.addInput('normalBrightness', 'Playing brightness', '100');
  darkenLightsSettings.addInput('darkenedBrightness', 'Paused brightness', '75');
  await darkenLightsSettings.pushSettings();
};

async function main(): Promise<void> {
  createSettings();

  Spicetify.Player.addEventListener('songchange', handlePlayOrChange);
  Spicetify.Player.addEventListener('onplaypause', handlePlaybackChange);
};

export default main;
