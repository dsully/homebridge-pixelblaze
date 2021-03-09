import { Characteristic, Formats, Perms } from 'hap-nodejs';

export default class LightPattern extends Characteristic {

  static readonly UUID = 'E763F10D-079E-48FF-8F27-9C2605A29F52';

  constructor() {
    super('Light Pattern', LightPattern.UUID, {
      format: Formats.UINT8,
      perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE],
      minStep: 1,
      minValue: 0,
      // We'll set maxValue dynamically in the platform accessory.
    });
  }
}