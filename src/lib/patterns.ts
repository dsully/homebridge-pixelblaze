import { Formats, Perms } from 'homebridge';
import { inherits } from 'util';

export default function CustomCharacteristic(Characteristic) {

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = {};

  c.LightPattern = function() {

    Characteristic.call(this, 'LightPattern', c.LightPattern.UUID);

    this.setProps({
      format: Formats.UINT8,
      perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE],
      minStep: 1,
      minValue: 0,
      // We'll set maxValue dynamically in the platform accessory.
    });
    this.value = this.getDefaultValue();
  };

  c.LightPattern.UUID = '0EF49D24-1C87-4ACE-AD74-5832A7E03931';

  inherits(c.LightPattern, Characteristic);

  return c;
}