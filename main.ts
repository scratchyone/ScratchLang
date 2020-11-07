import nearley from 'nearley';
const grammar = require('./grammar.js');
import arg from 'arg';

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
} else {
  console.error('No valid options given');
  process.exit(1);
}
