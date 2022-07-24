import test from 'node:test'
import { equal, deepEqual } from 'node:assert'
import sinon from 'sinon'
import csvParse, { parse } from './parse.js'

const allMethods = ['chunkParse'] // , 'testParse']
const quoteMethods = ['chunkParse'] // , 'testParse']

test('Should parse csv string using mjs', async (t) => {
  const options = {
    enqueue: sinon.spy(),
    header: false
  }
  const input = 'a,b,c\r\n1,2,3\r\n4,5,6\r\n'
  const res = csvParse(input, options)
  deepEqual(res, [
    ['a', 'b', 'c'],
    ['1', '2', '3'],
    ['4', '5', '6']
  ])
  equal(options.enqueue.callCount, 3)
})

// *** Default Export *** //
test('Should parse csv string', async (t) => {
  const options = {
    enqueue: sinon.spy(),
    chunkSize: 12
  }
  const input = 'a,b,c\r\n1,2,3\r\n4,5,6\r\n'
  const res = csvParse(input, options)
  deepEqual(res, [
    { a: '1', b: '2', c: '3' },
    { a: '4', b: '5', c: '6' }
  ])
  equal(options.enqueue.callCount, 2)
})

test('Should parse csv string w/ quotes', async (t) => {
  const options = {
    enqueue: sinon.spy(),
    chunkSize: 14
  }
  const input = 'a,b,c\r\n1,"2",3\r\n4,"5",6\r\n'
  const res = csvParse(input, options)
  deepEqual(res, [
    { a: '1', b: '2', c: '3' },
    { a: '4', b: '5', c: '6' }
  ])
  equal(options.enqueue.callCount, 2)
})

// *** General *** //
for (const method of allMethods) {
  test(`${method}: Should parse single row with { }`, async (t) => {
    const options = {}
    const enqueue = sinon.spy()
    const chunk = 'a,b,c\r\n1,2,3\r\n'
    const parser = parse(options)
    parser[method](chunk, { enqueue })
    equal(enqueue.callCount, 1)
    deepEqual(enqueue.firstCall.args, [
      { data: { a: '1', b: '2', c: '3' }, idx: 2 }
    ])
  })

  test(`${method}: Should parse multiple rows with { }`, async (t) => {
    const options = {}
    const enqueue = sinon.spy()

    const chunk = 'a,b,c\r\n1,2,3\r\n4,5,6\r\n7,8,9'
    const parser = parse(options)
    parser[method](chunk, { enqueue })
    parser[method](parser.previousChunk(), { enqueue }, true)
    equal(enqueue.callCount, 3)
    deepEqual(enqueue.firstCall.args, [
      { data: { a: '1', b: '2', c: '3' }, idx: 2 }
    ])
    deepEqual(enqueue.secondCall.args, [
      { data: { a: '4', b: '5', c: '6' }, idx: 3 }
    ])
    deepEqual(enqueue.thirdCall.args, [
      { data: { a: '7', b: '8', c: '9' }, idx: 4 }
    ])
  })
}

// *** Chunking *** //
/* const generateCSV = ({ columns, rows, quotes }) => {
  const wrapper = quotes ? '"' : ''
  const delimiter = quotes ? '","' : ','
  let csv =
    wrapper +
    Array.from({ length: columns + 1 }, (_, x) => `col${x}`).join(delimiter) +
    wrapper +
    '\r\n'
  for (let y = 0; y < rows; y++) {
    csv +=
      wrapper +
      Array.from({ length: columns + 1 }, (_, x) => `${x}x${y}`).join(
        delimiter
      ) +
      wrapper +
      '\r\n'
  }
  return csv
} */

for (const method of allMethods) {
  test(`${method}: Should parse with chunking`, async (t) => {
    const options = {}
    const enqueue = sinon.spy()
    let chunk = 'a,b,c\r\n1,2,'
    const parser = parse(options)
    parser[method](chunk, { enqueue })
    equal(parser.previousChunk(), '1,2,')
    chunk = parser.previousChunk() + '3\r\n4'
    parser[method](chunk, { enqueue })
    equal(parser.previousChunk(), '4')
    chunk = parser.previousChunk() + ',5,6'
    parser[method](chunk, { enqueue }, true)
    equal(enqueue.callCount, 2)
    deepEqual(enqueue.firstCall.args, [
      { data: { a: '1', b: '2', c: '3' }, idx: 2 }
    ])
    deepEqual(enqueue.secondCall.args, [
      { data: { a: '4', b: '5', c: '6' }, idx: 3 }
    ])
  })

  /* test(`${method}: Should parse large csv with chunking`, async (t) => {
    const enqueue = sinon.spy()
    const options = { enqueue, chunkSize: 1 * 1024 * 1024 }
    const chunk = generateCSV({
      columns: 10,
      rows: 1_000_000,
      quotes: method === 'chunkParse'
    })
    csvParse(chunk, options)
    equal(enqueue.callCount, 1_000_000)
  }) */
}

for (const method of quoteMethods) {
  test(`${method}: Should parse with chunking and quotes`, async (t) => {
    const options = {}
    const enqueue = sinon.spy()
    let chunk = 'a,b,c\r\n"1","2","'
    const parser = parse(options)
    parser[method](chunk, { enqueue })
    equal(parser.previousChunk(), '"1","2","')
    chunk = parser.previousChunk() + '3"\r\n'
    parser[method](chunk, { enqueue })
    equal(parser.previousChunk(), '')
    chunk = parser.previousChunk() + '"4","5","6"'
    parser[method](chunk, { enqueue }, true)
    equal(enqueue.callCount, 2)
    deepEqual(enqueue.firstCall.args, [
      { data: { a: '1', b: '2', c: '3' }, idx: 2 }
    ])
    deepEqual(enqueue.secondCall.args, [
      { data: { a: '4', b: '5', c: '6' }, idx: 3 }
    ])
  })
}

// *** Option: newline *** //
for (const method of allMethods) {
  test(`${method}: Should parse with { newlineChar: "\\n" }`, async (t) => {
    const options = { newlineChar: '\n' }
    const enqueue = sinon.spy()
    const chunk = 'a,b,c\n1,2,3\n'
    const parser = parse(options)
    parser[method](chunk, { enqueue })
    deepEqual(enqueue.firstCall.args, [
      { data: { a: '1', b: '2', c: '3' }, idx: 2 }
    ])
  })

  test(`${method}: Should parse with { newlineChar: "\\r\\n" }`, async (t) => {
    const options = { newlineChar: '\r\n' }
    const enqueue = sinon.spy()
    const chunk = 'a,b,c\r\n1,2,3\r\n'
    const parser = parse(options)
    parser[method](chunk, { enqueue })
    deepEqual(enqueue.firstCall.args, [
      { data: { a: '1', b: '2', c: '3' }, idx: 2 }
    ])
  })
}

// *** Option: header *** //
for (const method of allMethods) {
  test(`${method}: Should parse with { header: [...] }`, async (t) => {
    const options = { header: ['a', 'b', 'c'] }
    const enqueue = sinon.spy()
    const chunk = '1,2,3\r\n'
    const parser = parse(options)
    parser[method](chunk, { enqueue })
    equal(enqueue.callCount, 1)
    deepEqual(enqueue.firstCall.args, [
      { data: { a: '1', b: '2', c: '3' }, idx: 1 }
    ])
  })

  test(`${method}: Should parse with { header: true }`, async (t) => {
    const options = { header: true }
    const enqueue = sinon.spy()
    const chunk = 'a,b,c\r\n1,2,3\r\n'
    const parser = parse(options)
    parser[method](chunk, { enqueue })
    equal(enqueue.callCount, 1)
    deepEqual(enqueue.firstCall.args, [
      { data: { a: '1', b: '2', c: '3' }, idx: 2 }
    ])
  })

  test(`${method}: Should parse with { header: false }`, async (t) => {
    const options = { header: false }
    const enqueue = sinon.spy()
    const chunk = '1,2,3\r\n'
    const parser = parse(options)
    parser[method](chunk, { enqueue })
    equal(enqueue.callCount, 1)
    deepEqual(enqueue.firstCall.args, [{ data: ['1', '2', '3'], idx: 1 }])
  })
}

// *** Option: delimiter *** //
for (const method of allMethods) {
  test(`${method}: Should parse with { delimiterValue: "|" }`, async (t) => {
    const options = { delimiterChar: '|' }
    const enqueue = sinon.spy()
    const chunk = 'a|b|c\r\n1|2|3\r\n'
    const parser = parse(options)
    parser[method](chunk, { enqueue })
    equal(enqueue.callCount, 1)
    deepEqual(enqueue.firstCall.args, [
      { data: { a: '1', b: '2', c: '3' }, idx: 2 }
    ])
  })

  test(`${method}: Should parse with { delimiterValue: "\\t" }`, async (t) => {
    const options = { delimiterChar: '\t' }
    const enqueue = sinon.spy()
    const chunk = 'a\tb\tc\r\n1\t2\t3\r\n'
    const parser = parse(options)
    parser[method](chunk, { enqueue })
    equal(enqueue.callCount, 1)
    deepEqual(enqueue.firstCall.args, [
      { data: { a: '1', b: '2', c: '3' }, idx: 2 }
    ])
  })
}

// *** empty fields *** //
for (const method of allMethods) {
  test(`${method}: Should parse with { emptyFieldValue: "" }`, async (t) => {
    const options = { emptyFieldValue: '' }
    const enqueue = sinon.spy()
    const chunk = 'a,b,c\r\n,,\r\n'
    const parser = parse(options)
    parser[method](chunk, { enqueue })
    equal(enqueue.callCount, 1)
    deepEqual(enqueue.firstCall.args, [
      { data: { a: '', b: '', c: '' }, idx: 2 }
    ])
  })
  test(`${method}: Should parse with { emptyFieldValue: null }`, async (t) => {
    const options = { emptyFieldValue: null }
    const enqueue = sinon.spy()
    const chunk = 'a,b,c\r\n,,\r\n'
    const parser = parse(options)
    parser[method](chunk, { enqueue })
    equal(enqueue.callCount, 1)
    deepEqual(enqueue.firstCall.args, [
      { data: { a: null, b: null, c: null }, idx: 2 }
    ])
  })
  test(`${method}: Should parse with { emptyFieldValue: undefined }`, async (t) => {
    const options = { emptyFieldValue: undefined }
    const enqueue = sinon.spy()
    const chunk = 'a,b,c\r\n,,\r\n'
    const parser = parse(options)
    parser[method](chunk, { enqueue })
    equal(enqueue.callCount, 1)
    deepEqual(enqueue.firstCall.args, [
      { data: { a: undefined, b: undefined, c: undefined }, idx: 2 }
    ])
  })
  test(`${method}: Should parse with { emptyFieldValue: "" } and first field`, async (t) => {
    const options = { emptyFieldValue: '' }
    const enqueue = sinon.spy()
    const chunk = 'a,b,c\r\n1,,\r\n'
    const parser = parse(options)
    parser[method](chunk, { enqueue })
    equal(enqueue.callCount, 1)
    deepEqual(enqueue.firstCall.args, [
      { data: { a: '1', b: '', c: '' }, idx: 2 }
    ])
  })
  test(`${method}: Should parse with { emptyFieldValue: "" } and middle field`, async (t) => {
    const options = { emptyFieldValue: '' }
    const enqueue = sinon.spy()
    const chunk = 'a,b,c\r\n,2,\r\n'
    const parser = parse(options)
    parser[method](chunk, { enqueue })
    equal(enqueue.callCount, 1)
    deepEqual(enqueue.firstCall.args, [
      { data: { a: '', b: '2', c: '' }, idx: 2 }
    ])
  })
  test(`${method}: Should parse with { emptyFieldValue: "" } and last field`, async (t) => {
    const options = { emptyFieldValue: '' }
    const enqueue = sinon.spy()
    const chunk = 'a,b,c\r\n,,3\r\n'
    const parser = parse(options)
    parser[method](chunk, { enqueue })
    equal(enqueue.callCount, 1)
    deepEqual(enqueue.firstCall.args, [
      { data: { a: '', b: '', c: '3' }, idx: 2 }
    ])
  })
}

// *** Option: quoteChar *** //
for (const method of quoteMethods) {
  test(`${method}: Should parse with { quoteChar: '"' }`, async (t) => {
    const options = { quoteChar: '"' }
    const enqueue = sinon.spy()
    const chunk = '"a","b","c"\r\n"1","2","3"\r\n'
    const parser = parse(options)
    parser[method](chunk, { enqueue })
    deepEqual(enqueue.firstCall.args, [
      { data: { a: '1', b: '2', c: '3' }, idx: 2 }
    ])
  })

  test(`${method}: Should parse with { quoteChar: '\`' }`, async (t) => {
    const options = { quoteChar: '`' }
    const enqueue = sinon.spy()
    const chunk = '`a`,`b`,`c`\r\n`1`,`2`,`3`\r\n'
    const parser = parse(options)
    parser[method](chunk, { enqueue })
    deepEqual(enqueue.firstCall.args, [
      { data: { a: '1', b: '2', c: '3' }, idx: 2 }
    ])
  })
}

// *** Option: escapeChar *** //
for (const method of quoteMethods) {
  test(`${method}: Should parse with { quoteChar: '"', escapeChar: '"' }`, async (t) => {
    const options = { quoteChar: '"', escapeChar: '"' }
    const enqueue = sinon.spy()
    const chunk = '"a","b""","c"\r\n"1","2""","3"\r\n'
    const parser = parse(options)
    parser[method](chunk, { enqueue })
    deepEqual(enqueue.firstCall.args, [
      { data: { a: '1', 'b"': '2"', c: '3' }, idx: 2 }
    ])
  })

  test(`${method}: Should parse with { quoteChar: '"', escapeChar: '\\' }`, async (t) => {
    const options = { quoteChar: '"', escapeChar: '\\' }
    const enqueue = sinon.spy()
    const chunk = '"a","b\\"","c"\r\n"1","2\\"","3"\r\n'
    const parser = parse(options)
    parser[method](chunk, { enqueue })
    deepEqual(enqueue.firstCall.args, [
      { data: { a: '1', 'b"': '2"', c: '3' }, idx: 2 }
    ])
  })

  test(`${method}: Should parse with { quoteChar: '"' } and field containing newline`, async (t) => {
    const options = { quoteChar: '"' }
    const enqueue = sinon.spy()
    const chunk = '"a","b\r\nb","c"\r\n"1","2\r\n2","3"'
    const parser = parse(options)
    parser[method](chunk, { enqueue })
    parser[method](parser.previousChunk(), { enqueue }, true)
    deepEqual(enqueue.firstCall.args, [
      { data: { a: '1', 'b\r\nb': '2\r\n2', c: '3' }, idx: 2 }
    ])
  })

  test(`${method}: Should parse with { quoteChar: '"' } and field containing delimiter`, async (t) => {
    const options = { delimiterValue: ',', quoteChar: '"' }
    const enqueue = sinon.spy()
    const chunk = '"a","b,b","c"\r\n"1","2,2","3"\r\n'
    const parser = parse(options)
    parser[method](chunk, { enqueue })
    deepEqual(enqueue.firstCall.args, [
      { data: { a: '1', 'b,b': '2,2', c: '3' }, idx: 2 }
    ])
  })
}

// *** Option: errorOnEmptyLines *** //
for (const method of allMethods) {
  test(`${method}: Should parse with { errorOnEmptyLine: false }`, async (t) => {
    const options = { errorOnEmptyLine: false }
    const enqueue = sinon.spy()
    const chunk = '\r\na,b,c\r\n\r\n1,2,3\r\n'
    const parser = parse(options)
    parser[method](chunk, { enqueue })
    equal(enqueue.callCount, 1)
    deepEqual(enqueue.firstCall.args, [
      { data: { a: '1', b: '2', c: '3' }, idx: 4 }
    ])
  })

  test(`${method}: Should parse with { errorOnEmptyLine: true }`, async (t) => {
    const options = { errorOnEmptyLine: true }
    const enqueue = sinon.spy()
    const chunk = '\r\na,b,c\r\n\r\n1,2,3\r\n'
    const parser = parse(options)
    parser[method](chunk, { enqueue })
    equal(enqueue.callCount, 3)
    deepEqual(enqueue.firstCall.args, [
      {
        err: { code: 'EmptyLineExists', message: 'Empty line detected.' },
        idx: 1
      }
    ])
    deepEqual(enqueue.secondCall.args, [
      {
        err: { code: 'EmptyLineExists', message: 'Empty line detected.' },
        idx: 3
      }
    ])
    deepEqual(enqueue.thirdCall.args, [
      { data: { a: '1', b: '2', c: '3' }, idx: 4 }
    ])
  })
}

// *** Option: commentPrefixValue && errorOnComment *** //
for (const method of allMethods) {
  test(`${method}: Should parse with { commentPrefixValue: "//", errorOnComment: false }`, async (t) => {
    const options = { commentPrefixValue: '//', errorOnComment: false }
    const enqueue = sinon.spy()
    const chunk = '// header\r\na,b,c\r\n// data\r\n1,2,3\r\n'
    const parser = parse(options)
    parser[method](chunk, { enqueue })
    equal(enqueue.callCount, 1)
    deepEqual(enqueue.firstCall.args, [
      { data: { a: '1', b: '2', c: '3' }, idx: 4 }
    ])
  })

  test(`${method}: Should parse with { commentPrefixValue: "//", errorOnComment: true }`, async (t) => {
    const options = { commentPrefixValue: '//', errorOnComment: true }
    const enqueue = sinon.spy()
    const chunk = '// header\r\na,b,c\r\n// data\r\n1,2,3\r\n'
    const parser = parse(options)
    parser[method](chunk, { enqueue })
    equal(enqueue.callCount, 3)
    deepEqual(enqueue.firstCall.args, [
      { err: { code: 'CommentExists', message: 'Comment detected.' }, idx: 1 }
    ])
    deepEqual(enqueue.secondCall.args, [
      { err: { code: 'CommentExists', message: 'Comment detected.' }, idx: 3 }
    ])
    deepEqual(enqueue.thirdCall.args, [
      { data: { a: '1', b: '2', c: '3' }, idx: 4 }
    ])
  })
}

// *** Option: errorOnFieldsMismatch *** //
for (const method of allMethods) {
  test(`${method}: Should parse with { errorOnFieldsMismatch: false }`, async (t) => {
    const options = { errorOnFieldsMismatch: false }
    const enqueue = sinon.spy()
    const chunk = 'a,b,c\r\n1,2\r\n1,2,3,4\r\n1,2,3\r\n'
    const parser = parse(options)
    parser[method](chunk, { enqueue })
    deepEqual(enqueue.firstCall.args, [
      { data: { a: '1', b: '2', c: '3' }, idx: 4 }
    ])
    equal(enqueue.callCount, 1)
  })

  test(`${method}: Should parse with { errorOnFieldsMismatch: true }`, async (t) => {
    const options = { errorOnFieldsMismatch: true }
    const enqueue = sinon.spy()
    const chunk = 'a,b,c\r\n1,2\r\n1,2,3,4\r\n1,2,3\r\n'
    const parser = parse(options)
    parser[method](chunk, { enqueue })
    deepEqual(enqueue.firstCall.args, [
      {
        err: {
          code: 'FieldsMismatchTooFew',
          message: 'Too few fields were parsed, expected 3.'
        },
        idx: 2
      }
    ])
    deepEqual(enqueue.secondCall.args, [
      {
        err: {
          code: 'FieldsMismatchTooMany',
          message: 'Too many fields were parsed, expected 3.'
        },
        idx: 3
      }
    ])
    deepEqual(enqueue.thirdCall.args, [
      { data: { a: '1', b: '2', c: '3' }, idx: 4 }
    ])
    equal(enqueue.callCount, 3)
  })
}

// *** Option: errorOnFieldMalformed *** //
for (const method of quoteMethods) {
  test(`${method}: Should parse with { errorOnFieldMalformed }`, async (t) => {
    const options = { errorOnFieldMalformed: true }
    const enqueue = sinon.spy()
    const chunk = 'a,b,c\r\n"1","2","3"\r\n"4'
    const parser = parse(options)
    try {
      parser[method](chunk, { enqueue })
      parser[method](parser.previousChunk(), { enqueue }, true)
    } catch (e) {
      console.log('catch')
      equal(e.message, 'QuotedFieldMalformed')
    }
    deepEqual(enqueue.firstCall.args, [
      { data: { a: '1', b: '2', c: '3' }, idx: 2 }
    ])
    equal(enqueue.callCount, 1)
  })
}

// *** extra spaces *** //
/* test(`${method}: Should parse with space padding`, async (t) => {
const options = { }
const enqueue = sinon.spy()
let chunk = 'a,b,c\r\n"1" ,"2" ,"3" \r\n'
const parser = parse(options)
parser[method](chunk, { enqueue })
equal(enqueue.callCount, 1)
deepEqual(enqueue.firstCall.args, [{data:{ a: '1', b: '2', c: '3' },idx:2}])
}) */
