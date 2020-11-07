import nearley from 'nearley';
const grammar = require('./grammar.js');
import arg from 'arg';
import * as Types from './types';
import { readFileSync } from 'fs';
const util = require('util');

// Parse command arguments
const args = arg({
  // Types
  '--help': Boolean,
  '--compile': String,
});
if (args['--help']) {
  console.log('--compile <file>       Compile a file');
  process.exit(0);
} else if (args['--compile']) {
  console.log(`Compiling ${args['--compile']}`);
  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
  const fileData = readFileSync(args['--compile']).toString();
  parser.feed(fileData);
  console.log(
    util.inspect(parser.results[0], { showHidden: false, depth: null })
  );
} else {
  console.error('No valid options given');
  process.exit(1);
}
