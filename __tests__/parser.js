import test from 'ava'
import sinon from 'sinon'
import parser from '../parser.js'

// *** General *** //
test('Fast: Should parse single row with { }', async (t) => {
  const options = { newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = 'a,b,c\n1,2,3\n'
  const { fastParse } = parser(options)
  fastParse(chunk, { enqueue })
  t.deepEqual(enqueue.firstCall.args, [{data:{ a: '1', b: '2', c: '3' },idx:2}])
})

test('Slow: Should parse single row with { }', async (t) => {
  const options = { newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = 'a,b,c\n1,2,3\n'
  const { slowParse } = parser(options)
  slowParse(chunk, { enqueue })
  t.deepEqual(enqueue.firstCall.args, [{data:{ a: '1', b: '2', c: '3' },idx:2}])
})

test('Fast: Should parse multiple rows with { }', async (t) => {
  const options = { newlineValue: '\n' }
  const enqueue = sinon.spy()

  let chunk = 'a,b,c\n1,2,3\n4,5,6\n7,8,9'
  const { fastParse, previousChunk } = parser(options)
  fastParse(chunk, { enqueue })
  fastParse(previousChunk(), { enqueue })
  t.deepEqual(enqueue.firstCall.args, [{data:{ a: '1', b: '2', c: '3' },idx:2}])
  t.deepEqual(enqueue.secondCall.args, [{data:{ a: '4', b: '5', c: '6' },idx:3}])
  t.deepEqual(enqueue.thirdCall.args, [{data:{ a: '7', b: '8', c: '9' },idx:4}])
})

test('Slow: Should parse multiple rows with { }', async (t) => {
  const options = { newlineValue: '\n' }
  const enqueue = sinon.spy()

  let chunk = 'a,b,c\n1,2,3\n4,5,6\n7,8,9'
  const { slowParse, previousChunk } = parser(options)
  slowParse(chunk, { enqueue })
  slowParse(previousChunk(), { enqueue })
  t.deepEqual(enqueue.firstCall.args, [{data:{ a: '1', b: '2', c: '3' },idx:2}])
  t.deepEqual(enqueue.secondCall.args, [{data:{ a: '4', b: '5', c: '6' },idx:3}])
  t.deepEqual(enqueue.thirdCall.args, [{data:{ a: '7', b: '8', c: '9' },idx:4}])
})

// *** Option: fastMode *** //
test('Fast: Should parse with { fastMode: true }', async (t) => {
  const options = { fastMode: true, newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = 'a,b,c\n1,2,3\n'
  const { canUseFastMode, fastParse, slowParse } = parser(options)
  if (canUseFastMode(chunk)) {
    fastParse(chunk, { enqueue })
    t.deepEqual(enqueue.firstCall.args, [{data:{ a: '1', b: '2', c: '3' },idx:2}])
  } else {
    slowParse(chunk, { enqueue })
  }
})

test('Slow: Should parse with { fastMode: true }', async (t) => {
  const options = { fastMode: false, newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = '"a","b","c"\n"1","2","3"\n'
  const { canUseFastMode, fastParse, slowParse } = parser(options)
  if (canUseFastMode(chunk)) {
    fastParse(chunk, { enqueue })
  } else {
    slowParse(chunk, { enqueue })
    t.deepEqual(enqueue.firstCall.args, [{data:{ a: '1', b: '2', c: '3' },idx:2}])
  }
})

test('Slow: Should parse with { fastMode: false }', async (t) => {
  const options = { fastMode: false, newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = 'a,b,c\n1,2,3\n'
  const { canUseFastMode, fastParse, slowParse } = parser(options)
  if (canUseFastMode(chunk)) {
    fastParse(chunk, { enqueue })
  } else {
    slowParse(chunk, { enqueue })
    t.deepEqual(enqueue.firstCall.args, [{data:{ a: '1', b: '2', c: '3' },idx:2}])
  }
})

// *** Option: newline *** //
test('Fast: Should parse with { newlineValue: "\\n" }', async (t) => {
  const options = { newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = 'a,b,c\n1,2,3\n'
  const { fastParse } = parser(options)
  fastParse(chunk, { enqueue })
  t.deepEqual(enqueue.firstCall.args, [{data:{ a: '1', b: '2', c: '3' },idx:2}])
})

test('Slow: Should parse with { newlineValue: "\\n" }', async (t) => {
  const options = { newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = 'a,b,c\n1,2,3\n'
  const { slowParse } = parser(options)
  slowParse(chunk, { enqueue })
  t.deepEqual(enqueue.firstCall.args, [{data:{ a: '1', b: '2', c: '3' },idx:2}])
})

test('Fast: Should parse with { newlineValue: "\\r\\n" }', async (t) => {
  const options = { newlineValue: '\r\n' }
  const enqueue = sinon.spy()
  let chunk = 'a,b,c\r\n1,2,3\r\n'
  const { fastParse } = parser(options)
  fastParse(chunk, { enqueue })
  t.deepEqual(enqueue.firstCall.args, [{data:{ a: '1', b: '2', c: '3' },idx:2}])
})

test('Slow: Should parse with { newlineValue: "\\r\\n" }', async (t) => {
  const options = { newlineValue: '\r\n' }
  const enqueue = sinon.spy()
  let chunk = 'a,b,c\r\n1,2,3\r\n'
  const { slowParse } = parser(options)
  slowParse(chunk, { enqueue })
  t.deepEqual(enqueue.firstCall.args, [{data:{ a: '1', b: '2', c: '3' },idx:2}])
})

// *** Option: header *** //
test('Fast: Should parse with { header: [...] }', async (t) => {
  const options = { header: ['a', 'b', 'c'], newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = '1,2,3'
  const { fastParse } = parser(options)
  fastParse(chunk, { enqueue })
  t.deepEqual(enqueue.firstCall.args, [{data:{ a: '1', b: '2', c: '3' },idx:1}])
})

test('Slow: Should parse with { header: [...] }', async (t) => {
  const options = { header: ['a', 'b', 'c'], newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = '1,2,3'
  const { slowParse } = parser(options)
  slowParse(chunk, { enqueue })
  t.deepEqual(enqueue.firstCall.args, [{data:{ a: '1', b: '2', c: '3' },idx:1}])
})

test('Fast: Should parse with { header: true }', async (t) => {
  const options = { header: true, newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = 'a,b,c\n1,2,3\n'
  const { fastParse } = parser(options)
  fastParse(chunk, { enqueue })
  t.deepEqual(enqueue.firstCall.args, [{data:{ a: '1', b: '2', c: '3' },idx:2}])
})

test('Slow: Should parse with { header: true }', async (t) => {
  const options = { header: true, newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = 'a,b,c\n1,2,3\n'
  const { slowParse } = parser(options)
  slowParse(chunk, { enqueue })
  t.deepEqual(enqueue.firstCall.args, [{data:{ a: '1', b: '2', c: '3' },idx:2}])
})

test('Fast: Should parse with { header: false }', async (t) => {
  const options = { header: false, newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = '1,2,3'
  const { fastParse } = parser(options)
  fastParse(chunk, { enqueue })
  t.deepEqual(enqueue.firstCall.args, [{data:['1', '2', '3'], idx:1}])
})

test('Slow: Should parse with { header: false }', async (t) => {
  const options = { header: false, newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = '1,2,3'
  const { slowParse } = parser(options)
  slowParse(chunk, { enqueue })
  t.deepEqual(enqueue.firstCall.args, [{data:['1', '2', '3'], idx:1}])
})

// *** Option: delimiter *** //
// slow: within quotes
test('Fast: Should parse with { delimiterValue: "|" }', async (t) => {
  const options = { delimiterValue: '|', newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = 'a|b|c\n1|2|3\n4|5|6'
  const { fastParse } = parser(options)
  fastParse(chunk, { enqueue })
  t.deepEqual(enqueue.firstCall.args, [{data:{ a: '1', b: '2', c: '3' },idx:2}])
})

test('Slow: Should parse with { delimiterValue: "|" }', async (t) => {
  const options = { delimiterValue: '|', newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = 'a|b|c\n1|2|3\n4|5|6'
  const { slowParse } = parser(options)
  slowParse(chunk, { enqueue })
  t.deepEqual(enqueue.firstCall.args, [{data:{ a: '1', b: '2', c: '3' },idx:2}])
})

test('Fast: Should parse with { delimiterValue: "\\t" }', async (t) => {
  const options = { delimiterValue: '\t', newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = 'a\tb\tc\n1\t2\t3\n4\t5\t6'
  const { fastParse } = parser(options)
  fastParse(chunk, { enqueue })
  t.deepEqual(enqueue.firstCall.args, [{data:{ a: '1', b: '2', c: '3' },idx:2}])
})

test('Slow: Should parse with { delimiterValue: "\\t" }', async (t) => {
  const options = { delimiterValue: '\t', newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = 'a\tb\tc\n1\t2\t3\n4\t5\t6'
  const { slowParse } = parser(options)
  slowParse(chunk, { enqueue })
  t.deepEqual(enqueue.firstCall.args, [{data:{ a: '1', b: '2', c: '3' },idx:2}])
})

// *** Option: comments *** //
test('Fast: Should parse with { commentPrefixValue: false }', async (t) => {
  const options = { commentPrefixValue: false, newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = '# skip\na,b,c\n# skip\n1,2,3\n'
  const { fastParse } = parser(options)
  try {
    fastParse(chunk, { enqueue })
  } catch (e) {
    t.is(e.message, 'Row column count does not match header column count')
    t.is(e.cause, 2)
  }
})

test('Slow: Should parse with { commentPrefixValue: false }', async (t) => {
  const options = { commentPrefixValue: false, newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = '# skip\na,b,c\n# skip\n1,2,3\n'
  const { slowParse } = parser(options)
  try {
    slowParse(chunk, { enqueue })
  } catch (e) {
    t.is(e.message, 'Row column count does not match header column count')
    t.is(e.cause, 2)
  }
})

test('Fast: Should parse with { commentPrefixValue: "#" }', async (t) => {
  const options = { commentPrefixValue: '#', newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = '# skip\na,b,c\n# skip\n1,2,3\n#skip\n'
  const { fastParse } = parser(options)
  fastParse(chunk, { enqueue })
  t.is(enqueue.callCount, 1)
  t.deepEqual(enqueue.firstCall.args, [{data:{a:'1', b:'2', c:'3'}, idx:4}])
})

test('Slow: Should parse with { commentPrefixValue: "#" }', async (t) => {
  const options = { commentPrefixValue: '#', newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = '# skip\na,b,c\n# skip\n1,2,3\n#skip\n'
  const { slowParse } = parser(options)
  slowParse(chunk, { enqueue })
  t.is(enqueue.callCount, 1)
  t.deepEqual(enqueue.firstCall.args, [{data:{a:'1', b:'2', c:'3'}, idx:4}])
})

// *** empty fields *** //
test('Fast: Should parse with { emptyFieldValue: "" }', async (t) => {
  const options = { emptyFieldValue: '', newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = 'a,b,c\n,,\n'
  const { fastParse } = parser(options)
  fastParse(chunk, { enqueue })
  t.is(enqueue.callCount, 1)
  t.deepEqual(enqueue.firstCall.args, [{data:{ a: '', b: '', c: '' },idx:2}])
})
test('Fast: Should parse with { emptyFieldValue: null }', async (t) => {
  const options = { emptyFieldValue: null, newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = 'a,b,c\n,,\n'
  const { fastParse } = parser(options)
  fastParse(chunk, { enqueue })
  t.is(enqueue.callCount, 1)
  t.deepEqual(enqueue.firstCall.args, [{data:{ a: null, b: null, c: null },idx:2}])
})
test('Fast: Should parse with { emptyFieldValue: undefined }', async (t) => {
  const options = { emptyFieldValue: undefined, newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = 'a,b,c\n,,\n'
  const { fastParse } = parser(options)
  fastParse(chunk, { enqueue })
  t.is(enqueue.callCount, 1)
  t.deepEqual(enqueue.firstCall.args, [{data:{}, idx:2}])
})
test('Slow: Should parse with { emptyFieldValue: "" } and first field', async (t) => {
  const options = { emptyFieldValue: '', newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = 'a,b,c\n1,,\n'
  const { slowParse } = parser(options)
  slowParse(chunk, { enqueue })
  t.is(enqueue.callCount, 1)
  t.deepEqual(enqueue.firstCall.args, [{data: {a: '1', b: '', c: '' },idx:2}])
})
test('Slow: Should parse with { emptyFieldValue: "" } and middle field', async (t) => {
  const options = { emptyFieldValue: '', newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = 'a,b,c\n,2,\n'
  const { slowParse } = parser(options)
  slowParse(chunk, { enqueue })
  t.is(enqueue.callCount, 1)
  t.deepEqual(enqueue.firstCall.args, [{data:{ a: '', b: '2', c: '' },idx:2}])
})
test('Slow: Should parse with { emptyFieldValue: "" } and last field', async (t) => {
  const options = { emptyFieldValue: '', newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = 'a,b,c\n,,3\n'
  const { slowParse } = parser(options)
  slowParse(chunk, { enqueue })
  t.is(enqueue.callCount, 1)
  t.deepEqual(enqueue.firstCall.args, [{data:{ a: '', b: '', c: '3' },idx:2}])
})

// *** Option: quoteChar *** //
test('Slow: Should parse with { quoteChar: \'"\' }', async (t) => {
  const options = { quoteChar: '"', newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = '"a","b","c"\n"1","2","3"\n'
  const { slowParse } = parser(options)
  slowParse(chunk, { enqueue })
  t.deepEqual(enqueue.firstCall.args, [{data:{ a: '1', b: '2', c: '3' },idx:2}])
})

test('Slow: Should parse with { quoteChar: \'`\' }', async (t) => {
  const options = { quoteChar: '`', newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = '`a`,`b`,`c`\n`1`,`2`,`3`\n'
  const { slowParse } = parser(options)
  slowParse(chunk, { enqueue })
  t.deepEqual(enqueue.firstCall.args, [{data:{ a: '1', b: '2', c: '3' },idx:2}])
})

// *** Option: escapeChar *** //
test('Slow: Should parse with { quoteChar: \'"\', escapeChar: \'"\' }', async (t) => {
  const options = { quoteChar: '"', escapeChar: '"', newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = '"a","b""","c"\n"1","2""","3"\n'
  const { slowParse } = parser(options)
  slowParse(chunk, { enqueue })
  t.deepEqual(enqueue.firstCall.args, [{data:{ a: '1', 'b"': '2"', c: '3' },idx:2}])
})

test('Slow: Should parse with { quoteChar: \'"\', escapeChar: \'\\\' }', async (t) => {
  const options = { quoteChar: '"', escapeChar: '\\', newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = '"a","b\\"","c"\n"1","2\\"","3"\n'
  const { slowParse } = parser(options)
  slowParse(chunk, { enqueue })
  t.deepEqual(enqueue.firstCall.args, [{data:{ a: '1', 'b"': '2"', c: '3' },idx:2}])
})

test('Slow: Should parse with { quoteChar: \'`\' } and field containing newline', async (t) => {
  const options = { quoteChar: '"', newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = '"a","b\nb","c"\n"1","2\n2","3"\n'
  const { slowParse } = parser(options)
  slowParse(chunk, { enqueue })
  t.deepEqual(enqueue.firstCall.args, [{data:{ a: '1', 'b\nb': '2\n2', c: '3' },idx:2}])
})

test('Slow: Should parse with { quoteChar: \'`\' } and field containing delimiter', async (t) => {
  const options = { delimiterValue: ',', quoteChar: '"', newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = '"a","b,b","c"\n"1","2,2","3"\n'
  const { slowParse } = parser(options)
  slowParse(chunk, { enqueue })
  t.deepEqual(enqueue.firstCall.args, [{data:{ a: '1', 'b,b': '2,2', c: '3' },idx:2}])
})

// *** extra spaces *** //
test('Slow: Should parse with space padding', async (t) => {
  const options = { newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = 'a,b,c\n"1" ,"2" ,"3" \n'
  const { slowParse } = parser(options)
  slowParse(chunk, { enqueue })
  t.is(enqueue.callCount, 1)
  t.deepEqual(enqueue.firstCall.args, [{data:{ a: '1', b: '2', c: '3' },idx:2}])
})

// *** Option: errorOnEmptyLines *** //
test('Fast: Should parse with { errorOnEmptyLine: false }', async (t) => {
  const options = { errorOnEmptyLines: false, newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = '\na,b,c\n\n1,2,3\n'
  const { fastParse } = parser(options)
  fastParse(chunk, { enqueue })
  t.is(enqueue.callCount, 1)
  t.deepEqual(enqueue.firstCall.args, [{data:{ a: '1', b: '2', c: '3' },idx:4}])
})

test('Slow: Should parse with { errorOnEmptyLines: false }', async (t) => {
  const options = { errorOnEmptyLines: false, newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = '\na,b,c\n\n1,2,3\n'
  const { slowParse } = parser(options)
  slowParse(chunk, { enqueue })
  t.is(enqueue.callCount, 1)
  t.deepEqual(enqueue.firstCall.args, [{data:{ a: '1', b: '2', c: '3' },idx:4}])
})

test('Fast: Should parse with { errorOnEmptyLine: true }', async (t) => {
  const options = { errorOnEmptyLine: true, newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = 'a,b,c\n\n1,2,3\n'
  const { fastParse } = parser(options)
  try {
    fastParse(chunk, { enqueue })
  } catch (e) {
    t.is(e.message, 'Empty line detected.')
    t.is(e.cause, 2)
  }
})

test('Slow: Should parse with { errorOnEmptyLine: true }', async (t) => {
  const options = { errorOnEmptyLine: true, newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = 'a,b,c\n\n1,2,3\n'
  const { slowParse } = parser(options)
  try {
    slowParse(chunk, { enqueue })
  } catch (e) {
    t.is(e.message, 'Empty line detected.')
    t.is(e.cause, 2)
  }
})

test('Fast: Should parse with { errorOnEmptyLine: true } with first line being blank', async (t) => {
  const options = { errorOnEmptyLine: true, newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = '\na,b,c\n\n1,2,3\n'
  const { fastParse } = parser(options)
  try {
    fastParse(chunk, { enqueue })
  } catch (e) {
    t.is(e.message, 'Empty line detected.')
    t.is(e.cause, 1)
  }
})

test('Slow: Should parse with { errorOnEmptyLine: true } with first line being blank', async (t) => {
  const options = { errorOnEmptyLine: true, newlineValue: '\n' }
  const enqueue = sinon.spy()
  let chunk = '\na,b,c\n\n1,2,3\n'
  const { slowParse } = parser(options)
  try {
    slowParse(chunk, { enqueue })
  } catch (e) {
    t.is(e.message, 'Empty line detected.')
    t.is(e.cause, 1)
  }
})

// *** Errors *** //
// too few, too many fields

