import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback } from 'homebridge';
import PixelblazeController from './lib/controller';
import PixelblazePlatform from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export default class PixelblazePlatformAccessory {
  private service: Service;
  private refresh = 5.0;
  private hasAccessoryInfo;

  private state = {
    hue: 0,
    saturation: 0,
    brightness: 0,
    pattern: 0,
  };

  constructor(
    private readonly platform: PixelblazePlatform,
    private readonly accessory: PlatformAccessory,
    private device: PixelblazeController,
  ) {

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Electromage')
      .setCharacteristic(this.platform.Characteristic.Model, 'Pixelblaze');

    // Get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);

    // Set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    // this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.exampleDisplayName);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // Register handlers for the our characteristics.
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .on('set', this.setOn.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Brightness)
      .on('set', this.setBrightness.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.Hue)
      .on('set', this.setHue.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.Saturation)
      .on('set', this.setSaturation.bind(this));

    // Check the Pixelblaze state to keep it in sync.
    setInterval(() => {
      this.device.reload();

      if (this.device.props) {
        this.state.brightness = parseFloat(this.device.props.brightness);
        this.updateHomeKit();
      }

    }, this.refresh * 1000);

    // Update the serial number asynchronously, as we may not have it upon accessory creation.
    this.hasAccessoryInfo = setInterval(() => {

      if (this.device.props && this.device.props.name) {
        const serial = this.device.props.name.split('_')[1];

        this.platform.log.debug(`Found serial: ${serial} and firmware: ${this.device.props.ver}`);

        this.accessory.getService(this.platform.Service.AccessoryInformation)!
          .setCharacteristic(this.platform.Characteristic.SerialNumber, serial)
          .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.device.props.ver);

        clearInterval(this.hasAccessoryInfo);
      }

    }, this.refresh * 1000);
  }

  // Handle "SET" requests from HomeKit
  setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {

    this.platform.log.debug('Set Characteristic On ->', value);
    this.state.brightness = value as boolean ? 1.0 : 0.0;
    this.device.setCommand({brightness: this.state.brightness});

    this.updateHomeKit();
    callback(null);
  }

  setBrightness(value: CharacteristicValue, callback: CharacteristicSetCallback) {

    this.state.brightness = (value as number) / 100;
    this.device.setCommand({brightness: this.state.brightness});

    this.platform.log.debug('Set Characteristic Brightness -> ', value);

    this.updateHomeKit();
    callback(null);
  }

  setHue(value: CharacteristicValue, callback: CharacteristicSetCallback) {

    this.state.hue = Math.round(((value as number / 360) + Number.EPSILON) * 100) / 100;
    this.platform.log.debug('Set Characteristic Hue -> ', this.state.hue);
    this.device.setCommand({setVars: {hue: this.state.hue}});

    this.updateHomeKit();
    callback(null);
  }

  setSaturation(value: CharacteristicValue, callback: CharacteristicSetCallback) {

    this.state.saturation = Math.round(((value as number / 100) + Number.EPSILON) * 100) / 100;
    this.platform.log.debug('Set Characteristic Saturation -> ', this.state.saturation);
    this.device.setCommand({setVars: {saturation: this.state.saturation}});

    this.updateHomeKit();
    callback(null);
  }

  // TODO: Implement getHue & getSaturation via a 'getVars' query.

  // Update HomeKit's state. Since Pixelblaze users can modify the state out of band with the WebUI or Firestorm.
  updateHomeKit() {

    this.service.updateCharacteristic(this.platform.Characteristic.On, (this.state.brightness > 0) as boolean);
    this.service.updateCharacteristic(this.platform.Characteristic.Hue, this.state.hue);
    this.service.updateCharacteristic(this.platform.Characteristic.Saturation, this.state.saturation);
  }

}
