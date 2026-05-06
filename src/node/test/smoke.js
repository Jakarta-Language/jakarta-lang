const { Interpreter } = require('../dist/interpreter');

function runProgram(source) {
  const interp = new Interpreter();
  const output = [];
  const originalLog = console.log;
  console.log = (msg) => output.push(String(msg));
  try {
    interp.run(source);
  } finally {
    console.log = originalLog;
  }
  return output;
}

function assertEqual(actual, expected, name) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) {
    console.error(`FAIL: ${name}`);
    console.error('  actual  :', actual);
    console.error('  expected:', expected);
    process.exit(1);
  }
  console.log(`PASS: ${name}`);
}

assertEqual(
  runProgram('var x = 2; x += 3; cetak(x);'),
  ['5'],
  'compound assignment (+=)'
);

assertEqual(
  runProgram('var x = 10; x -= 4; cetak(x);'),
  ['6'],
  'compound assignment (-=)'
);

let undeclaredError = null;
try {
  runProgram('x = 1;');
} catch (error) {
  undeclaredError = error;
}

if (!undeclaredError || !String(undeclaredError.message).includes('belum dideklarasikan')) {
  console.error('FAIL: undeclared assignment should throw runtime error');
  process.exit(1);
}
console.log('PASS: undeclared assignment throws runtime error');
