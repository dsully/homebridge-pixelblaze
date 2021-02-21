import PixelBlazeController from './controller';

import type { Logger } from 'homebridge';
import * as udp from 'dgram';

const discoveries = {};

const PacketTypes = {
  BEACONPACKET: 42,
  TIMESYNC: 43,
};

/**
 * Try to find a PixelBlaze controller on the network.
 * @param log 
 * @param foundControllerCallback
 */
export default function discover(log: Logger, foundControllerCallback: (controller: PixelBlazeController) => void) {

  const discoveryFunction = () => {

    const host = '0.0.0.0';
    const port = 1889;

    const server: udp.Socket = udp.createSocket({ type: 'udp4', reuseAddr: true });

    server.on('listening', () => {
      const address = server.address();
      log.debug('Pixelblaze Discovery Server listening on ' + address.address + ': ' + address.port);
    });

    // From the Firestorm source: app/discovery.js
    server.on('message', (message, remote) => {

      if (message.length < 12) {
        return;
      }

      const header = {
        packetType: message.readUInt32LE(0),
        senderId: message.readUInt32LE(4),
        senderTime: message.readUInt32LE(8),
      };

      const now = new Date().getTime();
      const now32 = now % 0xffffffff; // 32 bits of milliseconds

      switch (header.packetType) {
        case PacketTypes.BEACONPACKET: {

          // log.debug(
          //   'BEACONPACKET from ' + remote.address + ':' + remote.port + ' id: ' + header.senderId +
          //  ' senderTime: ' + header.senderTime + ' delta: ' + (now32 - header.senderTime),
          // );

          // Record this device and fire up a controller.
          const record = (discoveries[header.senderId] =
          discoveries[header.senderId] || {});
          record.lastSeen = now;
          record.address = remote.address;
          record.port = remote.port;

          if (!record.controller) {

            record.controller = new PixelBlazeController({
              id: header.senderId,
              address: remote.address,
            }, log);

            // Start the WebSocket connection, which will fetch the current state/config.
            record.controller.start();

            clearInterval(broadcastIntervalId);
            foundControllerCallback(record.controller);
          }

          // Reply with a timesync packet.
          const sync = Buffer.alloc(20);

          sync.writeUInt32LE(PacketTypes.TIMESYNC, 0);
          sync.writeUInt32LE(889, 4); //sender ID,
          sync.writeUInt32LE(now32, 8);

          sync.writeUInt32LE(header.senderId, 12);
          sync.writeUInt32LE(header.senderTime, 16);

          server.send(
            sync,
            0,
            sync.length,
            remote.port,
            remote.address,
            (err, res) => {
              if (err) {
                log.error(`${err}, ${res}`);
              }
            },
          );
          break;
        }
        case PacketTypes.TIMESYNC: {
          break;
        }
        default: {
          log.warn('Unknown packet type ' + header.packetType);
        }
      }
    });

    server.bind(port, host);
  };

  // Try every 15 seconds to discover.
  const broadcastIntervalId = setInterval(discoveryFunction, 15 * 1000);

  // But start immediately.
  log.info('Searching for PixelBlaze controllers...');

  discoveryFunction();
}