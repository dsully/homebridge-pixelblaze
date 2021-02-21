import type { Logger } from 'homebridge';

import WebSocket = require('ws');
import * as _ from 'lodash';

const PacketType = {
  SAVEPROGRAMSOURCEFILE: 1,
  CODEDATA: 3,
  THUMBNAILJPG: 4,
  PREVIEWFRAME: 5,
  SOURCESDATA: 6,
  PROGRAMLIST: 7,
  PIXELMAP: 8,
};

const PacketFrameFlags = {
  START: 1,
  CONTINUE: 2,
  END: 4,
};

const PROPFIELDS = [
  'ver',
  'fps',
  'exp',
  'vmerr',
  'mem',
  'pixelCount',
  'ledType',
  'dataSpeed',
  'colorOrder',
  'buferType',
  'sequenceTimer',
  'sequencerEnable',
  'brightness',
  'name',
];

export default class PixelBlazeController {
  private log: Logger;
  private command;
  private partialList = [];
  private lastSeen = 0;
  private reconnectTimeout;
  private client: WebSocket | undefined;

  public readonly props;

  constructor(props, log: Logger) {
    this.log = log;
    this.props = props || {};
    this.command = {};
  }

  start() {
    this.connect();
  }

  stop() {
    try {
      if (this.client) {
        this.client.terminate();
      }
    } catch (err) {
      // pass
    }
    clearTimeout(this.reconnectTimeout);
  }

  connect() {
    if (this.client && this.client.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.stop();
    this.client = new WebSocket(`ws://${this.props.address}:81`);
    this.client.binaryType = 'arraybuffer';
    this.client.on('open', this.handleConnect.bind(this));
    this.client.on('close', () => this.handleClose.bind(this));
    this.client.on('message', this.handleMessage.bind(this));
    this.client.on('pong', this.handlePong.bind(this));
    this.client.on('error', this.log.error);
  }

  handleConnect() {
    // this.log.debug(`connected to ${this.props.address}`);

    this.lastSeen = new Date().getTime();
    clearTimeout(this.reconnectTimeout);

    // console.log(`In handleConnect: ${this.constructor['name']}`);
    // console.log(`In handleConnect: ${this.sendFrame}`);

    this.sendFrame({
      getConfig: true,
      listPrograms: true,
      sendUpdates: false,
      ...this.command,
    });
  }

  handleClose() {
    // this.log.debug('closing ' + this.props.address);
    this.reconnectTimeout = setTimeout(this.connect, 1000);
  }

  handleMessage(msg: ArrayBufferLike) {
    this.lastSeen = new Date().getTime();

    const props = this.props;

    if (typeof msg === 'string') {

      this.log.debug(`data from ${this.props.id} at ${this.props.address}`, typeof msg, msg);

      try {
        _.assign(this.props, _.pick(JSON.parse(msg), PROPFIELDS));
      } catch (err) {
        this.log.error('Problem parsing packet', err);
      }

    } else {
      const buf = new Uint8Array(msg);

      if (buf.length < 1) {
        return;
      }

      const type = buf[0];

      switch (type) {
        case PacketType.PREVIEWFRAME: {
          break;
        }
        case PacketType.THUMBNAILJPG: {
          break;
        }
        case PacketType.SOURCESDATA: {
          break;
        }
        case PacketType.PROGRAMLIST: {
          const data = buf.slice(2);
          const flags = buf[1];

          if (flags & PacketFrameFlags.START) {
            this.partialList = [];
          }

          const text = Buffer.from(data).toString('utf8');
          const lines = text.split('\n');

          const programs = _.map(_.filter(lines), (line) => {
            const bits = line.split('\t');
            return { id: bits[0], name: bits[1] };
          });

          this.partialList = this.partialList.concat(programs);

          if (flags & PacketFrameFlags.END) {
            props.programList = this.partialList;
            // this.log.debug("received programs", props.id, props.programList);
          }
          break;
        }
      }
    }
  }

  ping() {
    const isDisconnected = this.client && this.client.readyState !== WebSocket.OPEN;
    if (!isDisconnected && this.client) {
      this.client.ping();
    }
  }

  isAlive() {
    const now = new Date().getTime();
    return now - this.lastSeen < 5000 && this.client && this.client.readyState !== WebSocket.CLOSED;
  }

  handlePong() {
    this.lastSeen = new Date().getTime();
  }

  setCommand(command) {
    // eslint-disable-next-line prefer-const
    let { programName, ...rest } = command;

    if (programName) {
      rest = rest || {};
      const program = _.find(this.props.programList, { name: programName });
      if (program) {
        rest.activeProgramId = program.id;
      }
      command = rest; //replace command with fixed version
    }

    // See if those keys values are different.
    const keys = _.keys(command);
    if (_.isEqual(_.pick(command, keys), _.pick(this.command, keys))) {
      return;
    }
    _.assign(this.command, command);
    this.sendFrame(command);
  }

  reload() {
    this.sendFrame({ getConfig: true, listPrograms: true });
  }

  sendFrame(o) {
    const frame = JSON.stringify(o);
    const isDisconnected = this.client && this.client.readyState !== this.client.OPEN;

    this.log.debug(
      isDisconnected
        ? 'wanted to send'
        : `sending to ${this.props.id} at ${this.props.address}`,
      frame,
    );

    if (isDisconnected || !this.client) {
      return;
    }
    this.client.send(frame);
  }
}
