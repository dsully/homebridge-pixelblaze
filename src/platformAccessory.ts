import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback } from 'homebridge';
import PixelBlazeController from './lib/controller';
import PixelBlazePlatform from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export default class PixelBlazePlatformAccessory {
  private service: Service;
  private refresh = 5.0;
  private hasAccessoryInfo;

  constructor(
    private readonly platform: PixelBlazePlatform,
    private readonly accessory: PlatformAccessory,
    private device: PixelBlazeController,
  ) {

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Electromage')
      .setCharacteristic(this.platform.Characteristic.Model, 'PixelBlaze');

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    // this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.exampleDisplayName);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    // SET - bind to the `setOn` method below
    this.service.getCharacteristic(this.platform.Characteristic.On).on('set', this.setOn.bind(this));

    // register handlers for the Brightness Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.Brightness)
      .on('set', this.setBrightness.bind(this));       // SET - bind to the 'setBrightness` method below


    setInterval(() => {
      this.device.reload();
      this.service.updateCharacteristic(this.platform.Characteristic.On, parseFloat(this.device.props.brightness) > 0.0);
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

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {

    this.device.setCommand({brightness: value ? 1.0 : 0.0 });
    this.platform.log.debug('Set Characteristic On ->', value);

    callback(null);
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, changing the Brightness
   */
  setBrightness(value: CharacteristicValue, callback: CharacteristicSetCallback) {

    this.device.setCommand({brightness: (value as number) / 100});

    this.platform.log.debug('Set Characteristic Brightness -> ', value);

    // you must call the callback function
    callback(null);
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, changing the Brightness
   */
  setBrightness(value: CharacteristicValue, callback: CharacteristicSetCallback) {

    // implement your own code to set the brightness
    this.exampleStates.Brightness = value as number;

    this.platform.log.debug('Set Characteristic Brightness -> ', value);

    // you must call the callback function
    callback(null);
  }

}
