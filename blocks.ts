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
export class DeleteFromList extends SB3.Block {
  constructor(list: SB3.List, index: number) {
    super(
      uuidv4(),
      'data_deleteoflist',
      null,
      null,
      false,
      [SB3.Field.createNewField('LIST', list.name, list.id)],
      [new SB3.Input('INDEX', 'shadow', 'int', [index.toString()])]
    );
  }
}
export class InsertIntoList extends SB3.Block {
  constructor(list: SB3.List, index: number, text: string) {
    super(
      uuidv4(),
      'data_insertatlist',
      null,
      null,
      false,
      [SB3.Field.createNewField('LIST', list.name, list.id)],
      [
        new SB3.Input('INDEX', 'shadow', 'text', [index.toString()]),
        new SB3.Input('ITEM', 'shadow', 'text', [text]),
      ]
    );
  }
}
