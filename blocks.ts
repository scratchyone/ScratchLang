import * as SB3 from './SB3';
import { v4 as uuidv4 } from 'uuid';
import { ParsedInputValue } from './types';
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
        new SB3.Input('BROADCAST_INPUT', 'shadow', [
          SB3.InputType.Broadcast,
          broadcastName,
          broadcastId,
        ]),
      ]
    );
  }
}
export class Say extends SB3.Block {
  constructor(id: string, message: ParsedInputValue) {
    console.log(message);
    super(
      id,
      'looks_say',
      null,
      null,
      false,
      [],
      [
        new SB3.Input(
          'MESSAGE',
          'shadow',
          message.type === 'objectLiteral'
            ? [SB3.InputType.Text, message.value]
            : message.id
        ),
      ]
    );
  }
}
export class SayForSecs extends SB3.Block {
  constructor(id: string, message: ParsedInputValue, time: ParsedInputValue) {
    super(
      id,
      'looks_sayforsecs',
      null,
      null,
      false,
      [],
      [
        new SB3.Input(
          'MESSAGE',
          'shadow',
          message.type === 'objectLiteral'
            ? [SB3.InputType.Text, message.value]
            : message.id
        ),
        new SB3.Input(
          'SECS',
          'shadow',
          time.type === 'objectLiteral'
            ? [SB3.InputType.MathNum, time.value]
            : time.id
        ),
      ]
    );
  }
}
export class DeleteFromListSimple extends SB3.Block {
  constructor(list: SB3.List, index: number) {
    super(
      uuidv4(),
      'data_deleteoflist',
      null,
      null,
      false,
      [SB3.Field.createNewField('LIST', list.name, list.id)],
      [new SB3.Input('INDEX', 'shadow', [SB3.InputType.Int, index.toString()])]
    );
  }
}
export class InsertIntoList extends SB3.Block {
  constructor(list: SB3.List, index: number, text: ParsedInputValue) {
    super(
      uuidv4(),
      'data_insertatlist',
      null,
      null,
      false,
      [SB3.Field.createNewField('LIST', list.name, list.id)],
      [
        new SB3.Input('INDEX', 'shadow', [SB3.InputType.Int, index.toString()]),
        new SB3.Input(
          'ITEM',
          'shadow',
          text.type === 'objectLiteral'
            ? [SB3.InputType.Text, text.value]
            : text.id
        ),
      ]
    );
  }
}
export class InsertIntoListSimple extends SB3.Block {
  constructor(list: SB3.List, index: number, text: string) {
    super(
      uuidv4(),
      'data_insertatlist',
      null,
      null,
      false,
      [SB3.Field.createNewField('LIST', list.name, list.id)],
      [
        new SB3.Input('INDEX', 'shadow', [SB3.InputType.Int, index.toString()]),
        new SB3.Input('ITEM', 'shadow', [SB3.InputType.Text, text]),
      ]
    );
  }
}
export class ItemFromListSimple extends SB3.Block {
  constructor(list: SB3.List, index: number) {
    super(
      uuidv4(),
      'data_itemoflist',
      null,
      null,
      false,
      [SB3.Field.createNewField('LIST', list.name, list.id)],
      [new SB3.Input('INDEX', 'shadow', [SB3.InputType.Int, index.toString()])]
    );
  }
}
