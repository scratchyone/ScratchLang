import * as SB3 from './SB3';
import { v4 as uuidv4 } from 'uuid';
export class SendBroadcast extends SB3.Block {
  constructor(broadcastId: string, broadcastName: string) {
    super(
      uuidv4(),
      'event_broadcastandwait',
      null,
      null,
      false,
      [],
      [
        new SB3.Input('BROADCAST_INPUT', 'shadow', 'broadcast', [
          broadcastName,
          broadcastId,
        ]),
      ]
    );
  }
}
export class Say extends SB3.Block {
  constructor(message: string) {
    super(
      uuidv4(),
      'looks_say',
      null,
      null,
      false,
      [],
      [new SB3.Input('MESSAGE', 'shadow', 'text', [message])]
    );
  }
}
