# Govee Dynamic Lights
A [Spicetify](https://spicetify.app/) extension that dynamically sets your Govee RGB lights to match the current album cover color using the WIFI API.

## Showcase
<img src="img/showcase.gif" width="600" alt="gif showing govee lights changing realtime to spotify album cover.">
<img src="img/settings.png" width="600" alt="settings options screen">

## Prerequisites
- [Spicetify](https://spicetify.app/) installed on your Spotify client.
- Govee WIFI-capable RGB lights that [can connect to Govee's API](https://developer.govee.com/docs/support-product-model).
- A [Govee API Key](https://developer.govee.com/reference/apply-you-govee-api-key).
- Your device(s) model name and device(s) ID.
  - Using [this website](https://govee.readme.io/reference/getlightdeviceinfo), enter your Govee API key on the right side under "Credentials" where it says "Header". - Click "Try It!" - Under "Response", look for these two values:
  ```json
    "device": "[your device id here]",
    "model": "[your device model here]",
  ```
- "device" is your device ID. "model" is your model name. Note these as you'll need these later.
## Setup Instructions

1.  Install the extension using the Spicetify Marketplace
2.  Configure the extension:
    - Go to settings by clicking on your profile picture in the top right corner and clicking "Settings"
    - Scroll down until you see "Setup Govee Lights"
    - Fill in the required information:
    - **Govee API Key**: Your Govee API Key. It should look something like XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX.
    - **Devices**: A JSON array of all of your Govee devices without new lines.
      - It should look something like this:
        ```
        [{"model":"HXXXX","id":"XX:XX:XX:XX:XX:XX:XX:XX"},{"model":"HYYYY","id":"YY:YY:YY:YY:YY:YY:YY:YY"}, ...]
        ```
      - Replace each "model" and "id" value with your device's info.
> [!WARNING]
> Incorrect values will prevent the extension from reaching your devices.

## Thanks to
- [Dynamic Lights Home Assistant](https://github.com/muckelba/dynamic-lights-homeassistant/) for inspiration
