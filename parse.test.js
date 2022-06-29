import test from 'node:test'
import { equal, deepEqual } from 'node:assert'
import sinon from 'sinon'
import csvParse, { parse } from './parse.js'

// *** Default Export *** //
test('Should parse csv string', async (t) => {
  const options = {
    enqueue: sinon.spy(),
    chunkSize: 12
  }
  const input = 'a,b,c\n1,2,3\n4,5,6\n'
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
  const input = 'a,b,c\n1,"2",3\n4,"5",6\n'
  const res = csvParse(input, options)
  deepEqual(res, [
    { a: '1', b: '2', c: '3' },
    { a: '4', b: '5', c: '6' }
  ])
  equal(options.enqueue.callCount, 2)
})

// *** General *** //
test('Fast: Should parse single row with { }', async (t) => {
  const options = {}
  const enqueue = sinon.spy()
  const chunk = 'a,b,c\n1,2,3\n'
  const { fastParse } = parse(options)
  fastParse(chunk, { enqueue })
  equal(enqueue.callCount, 1)
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', b: '2', c: '3' }, idx: 2 }
  ])
})

test('Slow: Should parse single row with { }', async (t) => {
  const options = {}
  const enqueue = sinon.spy()
  const chunk = 'a,b,c\n1,2,3\n'
  const { slowParse } = parse(options)
  slowParse(chunk, { enqueue })
  equal(enqueue.callCount, 1)
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', b: '2', c: '3' }, idx: 2 }
  ])
})

test('Fast: Should parse multiple rows with { }', async (t) => {
  const options = {}
  const enqueue = sinon.spy()

  const chunk = 'a,b,c\n1,2,3\n4,5,6\n7,8,9'
  const { fastParse, previousChunk } = parse(options)
  fastParse(chunk, { enqueue })
  fastParse(previousChunk(), { enqueue })
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

test('Slow: Should parse multiple rows with { }', async (t) => {
  const options = {}
  const enqueue = sinon.spy()

  const chunk = 'a,b,c\n1,2,3\n4,5,6\n7,8,9'
  const { slowParse, previousChunk } = parse(options)
  slowParse(chunk, { enqueue })
  slowParse(previousChunk(), { enqueue })
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

// *** Chunking *** //
test('Fast: Should parse with chunking', async (t) => {
  const options = {}
  const enqueue = sinon.spy()
  let chunk = 'a,b,c\n1,2,'
  const { fastParse, previousChunk } = parse(options)
  fastParse(chunk, { enqueue })
  equal(previousChunk(), '1,2,')
  chunk = previousChunk() + '3\n'
  fastParse(chunk, { enqueue })
  equal(previousChunk(), '')
  chunk = previousChunk() + '4,5,6'
  fastParse(chunk, { enqueue })
  equal(enqueue.callCount, 2)
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', b: '2', c: '3' }, idx: 2 }
  ])
  deepEqual(enqueue.secondCall.args, [
    { data: { a: '4', b: '5', c: '6' }, idx: 3 }
  ])
})

test('Slow: Should parse with chunking', async (t) => {
  const options = {}
  const enqueue = sinon.spy()
  let chunk = 'a,b,c\n1,2,'
  const { slowParse, previousChunk } = parse(options)
  slowParse(chunk, { enqueue })
  equal(previousChunk(), '1,2,')
  chunk = previousChunk() + '3\n'
  slowParse(chunk, { enqueue })
  equal(previousChunk(), '')
  chunk = previousChunk() + '4,5,6'
  slowParse(chunk, { enqueue })
  equal(enqueue.callCount, 2)
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', b: '2', c: '3' }, idx: 2 }
  ])
  deepEqual(enqueue.secondCall.args, [
    { data: { a: '4', b: '5', c: '6' }, idx: 3 }
  ])
})

test('Slow: Should parse with chunking and quotes', async (t) => {
  const options = {}
  const enqueue = sinon.spy()
  let chunk = 'a,b,c\n"1","2","'
  const { slowParse, previousChunk } = parse(options)
  slowParse(chunk, { enqueue })
  equal(previousChunk(), '"1","2","')
  chunk = previousChunk() + '3"\n'
  slowParse(chunk, { enqueue })
  equal(previousChunk(), '')
  chunk = previousChunk() + '"4","5","6"'
  slowParse(chunk, { enqueue })
  equal(enqueue.callCount, 2)
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', b: '2', c: '3' }, idx: 2 }
  ])
  deepEqual(enqueue.secondCall.args, [
    { data: { a: '4', b: '5', c: '6' }, idx: 3 }
  ])
})

// *** Option: fastMode *** //
test('Fast: Should parse with { fastMode: true }', async (t) => {
  const options = { fastMode: true }
  const enqueue = sinon.spy()
  const chunk = 'a,b,c\n1,2,3\n'
  const { canUseFastMode, fastParse, slowParse } = parse(options)
  if (canUseFastMode(chunk)) {
    fastParse(chunk, { enqueue })
    deepEqual(enqueue.firstCall.args, [
      { data: { a: '1', b: '2', c: '3' }, idx: 2 }
    ])
  } else {
    slowParse(chunk, { enqueue })
  }
})

test('Slow: Should parse with { fastMode: true }', async (t) => {
  const options = { fastMode: false }
  const enqueue = sinon.spy()
  const chunk = '"a","b","c"\n"1","2","3"\n'
  const { canUseFastMode, fastParse, slowParse } = parse(options)
  if (canUseFastMode(chunk)) {
    fastParse(chunk, { enqueue })
  } else {
    slowParse(chunk, { enqueue })
    deepEqual(enqueue.firstCall.args, [
      { data: { a: '1', b: '2', c: '3' }, idx: 2 }
    ])
  }
})

test('Slow: Should parse with { fastMode: false }', async (t) => {
  const options = { fastMode: false }
  const enqueue = sinon.spy()
  const chunk = 'a,b,c\n1,2,3\n'
  const { canUseFastMode, fastParse, slowParse } = parse(options)
  if (canUseFastMode(chunk)) {
    fastParse(chunk, { enqueue })
  } else {
    slowParse(chunk, { enqueue })
    deepEqual(enqueue.firstCall.args, [
      { data: { a: '1', b: '2', c: '3' }, idx: 2 }
    ])
  }
})

// *** Option: newline *** //
test('Fast: Should parse with { newlineChar: "\\n" }', async (t) => {
  const options = { newlineChar: '\n' }
  const enqueue = sinon.spy()
  const chunk = 'a,b,c\n1,2,3\n'
  const { fastParse } = parse(options)
  fastParse(chunk, { enqueue })
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', b: '2', c: '3' }, idx: 2 }
  ])
})

test('Slow: Should parse with { newlineChar: "\\n" }', async (t) => {
  const options = { newlineChar: '\n' }
  const enqueue = sinon.spy()
  const chunk = 'a,b,c\n1,2,3\n'
  const { slowParse } = parse(options)
  slowParse(chunk, { enqueue })
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', b: '2', c: '3' }, idx: 2 }
  ])
})

test('Fast: Should parse with { newlineChar: "\\r\\n" }', async (t) => {
  const options = { newlineChar: '\r\n' }
  const enqueue = sinon.spy()
  const chunk = 'a,b,c\r\n1,2,3\r\n'
  const { fastParse } = parse(options)
  fastParse(chunk, { enqueue })
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', b: '2', c: '3' }, idx: 2 }
  ])
})

test('Slow: Should parse with { newlineChar: "\\r\\n" }', async (t) => {
  const options = { newlineChar: '\r\n' }
  const enqueue = sinon.spy()
  const chunk = 'a,b,c\r\n1,2,3\r\n'
  const { slowParse } = parse(options)
  slowParse(chunk, { enqueue })
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', b: '2', c: '3' }, idx: 2 }
  ])
})

// *** Option: header *** //
test('Fast: Should parse with { header: [...] }', async (t) => {
  const options = { header: ['a', 'b', 'c'] }
  const enqueue = sinon.spy()
  const chunk = '1,2,3\n'
  const { fastParse } = parse(options)
  fastParse(chunk, { enqueue })
  equal(enqueue.callCount, 1)
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', b: '2', c: '3' }, idx: 1 }
  ])
})

test('Slow: Should parse with { header: [...] }', async (t) => {
  const options = { header: ['a', 'b', 'c'] }
  const enqueue = sinon.spy()
  const chunk = '1,2,3\n'
  const { slowParse } = parse(options)
  slowParse(chunk, { enqueue })
  equal(enqueue.callCount, 1)
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', b: '2', c: '3' }, idx: 1 }
  ])
})

test('Fast: Should parse with { header: true }', async (t) => {
  const options = { header: true }
  const enqueue = sinon.spy()
  const chunk = 'a,b,c\n1,2,3\n'
  const { fastParse } = parse(options)
  fastParse(chunk, { enqueue })
  equal(enqueue.callCount, 1)
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', b: '2', c: '3' }, idx: 2 }
  ])
})

test('Slow: Should parse with { header: true }', async (t) => {
  const options = { header: true }
  const enqueue = sinon.spy()
  const chunk = 'a,b,c\n1,2,3\n'
  const { slowParse } = parse(options)
  slowParse(chunk, { enqueue })
  equal(enqueue.callCount, 1)
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', b: '2', c: '3' }, idx: 2 }
  ])
})

test('Fast: Should parse with { header: false }', async (t) => {
  const options = { header: false }
  const enqueue = sinon.spy()
  const chunk = '1,2,3\n'
  const { fastParse } = parse(options)
  fastParse(chunk, { enqueue })
  equal(enqueue.callCount, 1)
  deepEqual(enqueue.firstCall.args, [{ data: ['1', '2', '3'], idx: 1 }])
})

test('Slow: Should parse with { header: false }', async (t) => {
  const options = { header: false }
  const enqueue = sinon.spy()
  const chunk = '1,2,3\n'
  const { slowParse } = parse(options)
  slowParse(chunk, { enqueue })
  equal(enqueue.callCount, 1)
  deepEqual(enqueue.firstCall.args, [{ data: ['1', '2', '3'], idx: 1 }])
})

// *** Option: delimiter *** //
test('Fast: Should parse with { delimiterValue: "|" }', async (t) => {
  const options = { delimiterChar: '|' }
  const enqueue = sinon.spy()
  const chunk = 'a|b|c\n1|2|3\n'
  const { fastParse } = parse(options)
  fastParse(chunk, { enqueue })
  equal(enqueue.callCount, 1)
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', b: '2', c: '3' }, idx: 2 }
  ])
})

test('Slow: Should parse with { delimiterValue: "|" }', async (t) => {
  const options = { delimiterChar: '|' }
  const enqueue = sinon.spy()
  const chunk = 'a|b|c\n1|2|3\n'
  const { slowParse } = parse(options)
  slowParse(chunk, { enqueue })
  equal(enqueue.callCount, 1)
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', b: '2', c: '3' }, idx: 2 }
  ])
})

test('Fast: Should parse with { delimiterValue: "\\t" }', async (t) => {
  const options = { delimiterChar: '\t' }
  const enqueue = sinon.spy()
  const chunk = 'a\tb\tc\n1\t2\t3\n'
  const { fastParse } = parse(options)
  fastParse(chunk, { enqueue })
  equal(enqueue.callCount, 1)
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', b: '2', c: '3' }, idx: 2 }
  ])
})

test('Slow: Should parse with { delimiterValue: "\\t" }', async (t) => {
  const options = { delimiterChar: '\t' }
  const enqueue = sinon.spy()
  const chunk = 'a\tb\tc\n1\t2\t3\n'
  const { slowParse } = parse(options)
  slowParse(chunk, { enqueue })
  equal(enqueue.callCount, 1)
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', b: '2', c: '3' }, idx: 2 }
  ])
})

// *** empty fields *** //
test('Fast: Should parse with { emptyFieldValue: "" }', async (t) => {
  const options = { emptyFieldValue: '' }
  const enqueue = sinon.spy()
  const chunk = 'a,b,c\n,,\n'
  const { fastParse } = parse(options)
  fastParse(chunk, { enqueue })
  equal(enqueue.callCount, 1)
  deepEqual(enqueue.firstCall.args, [{ data: { a: '', b: '', c: '' }, idx: 2 }])
})
test('Fast: Should parse with { emptyFieldValue: null }', async (t) => {
  const options = { emptyFieldValue: null }
  const enqueue = sinon.spy()
  const chunk = 'a,b,c\n,,\n'
  const { fastParse } = parse(options)
  fastParse(chunk, { enqueue })
  equal(enqueue.callCount, 1)
  deepEqual(enqueue.firstCall.args, [
    { data: { a: null, b: null, c: null }, idx: 2 }
  ])
})
test('Fast: Should parse with { emptyFieldValue: undefined }', async (t) => {
  const options = { emptyFieldValue: undefined }
  const enqueue = sinon.spy()
  const chunk = 'a,b,c\n,,\n'
  const { fastParse } = parse(options)
  fastParse(chunk, { enqueue })
  equal(enqueue.callCount, 1)
  deepEqual(enqueue.firstCall.args, [
    { data: { a: undefined, b: undefined, c: undefined }, idx: 2 }
  ])
})
test('Slow: Should parse with { emptyFieldValue: "" } and first field', async (t) => {
  const options = { emptyFieldValue: '' }
  const enqueue = sinon.spy()
  const chunk = 'a,b,c\n1,,\n'
  const { slowParse } = parse(options)
  slowParse(chunk, { enqueue })
  equal(enqueue.callCount, 1)
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', b: '', c: '' }, idx: 2 }
  ])
})
test('Slow: Should parse with { emptyFieldValue: "" } and middle field', async (t) => {
  const options = { emptyFieldValue: '' }
  const enqueue = sinon.spy()
  const chunk = 'a,b,c\n,2,\n'
  const { slowParse } = parse(options)
  slowParse(chunk, { enqueue })
  equal(enqueue.callCount, 1)
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '', b: '2', c: '' }, idx: 2 }
  ])
})
test('Slow: Should parse with { emptyFieldValue: "" } and last field', async (t) => {
  const options = { emptyFieldValue: '' }
  const enqueue = sinon.spy()
  const chunk = 'a,b,c\n,,3\n'
  const { slowParse } = parse(options)
  slowParse(chunk, { enqueue })
  equal(enqueue.callCount, 1)
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '', b: '', c: '3' }, idx: 2 }
  ])
})

// *** Option: quoteChar *** //
test("Slow: Should parse with { quoteChar: '\"' }", async (t) => {
  const options = { quoteChar: '"' }
  const enqueue = sinon.spy()
  const chunk = '"a","b","c"\n"1","2","3"\n'
  const { slowParse } = parse(options)
  slowParse(chunk, { enqueue })
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', b: '2', c: '3' }, idx: 2 }
  ])
})

test("Slow: Should parse with { quoteChar: '`' }", async (t) => {
  const options = { quoteChar: '`' }
  const enqueue = sinon.spy()
  const chunk = '`a`,`b`,`c`\n`1`,`2`,`3`\n'
  const { slowParse } = parse(options)
  slowParse(chunk, { enqueue })
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', b: '2', c: '3' }, idx: 2 }
  ])
})

// *** Option: escapeChar *** //
test("Slow: Should parse with { quoteChar: '\"', escapeChar: '\"' }", async (t) => {
  const options = { quoteChar: '"', escapeChar: '"' }
  const enqueue = sinon.spy()
  const chunk = '"a","b""","c"\n"1","2""","3"\n'
  const { slowParse } = parse(options)
  slowParse(chunk, { enqueue })
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', 'b"': '2"', c: '3' }, idx: 2 }
  ])
})

test("Slow: Should parse with { quoteChar: '\"', escapeChar: '\\' }", async (t) => {
  const options = { quoteChar: '"', escapeChar: '\\' }
  const enqueue = sinon.spy()
  const chunk = '"a","b\\"","c"\n"1","2\\"","3"\n'
  const { slowParse } = parse(options)
  slowParse(chunk, { enqueue })
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', 'b"': '2"', c: '3' }, idx: 2 }
  ])
})

test("Slow: Should parse with { quoteChar: '\"' } and field containing newline", async (t) => {
  const options = { quoteChar: '"' }
  const enqueue = sinon.spy()
  const chunk = '"a","b\nb","c"\n"1","2\n2","3"\n'
  const { slowParse } = parse(options)
  slowParse(chunk, { enqueue })
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', 'b\nb': '2\n2', c: '3' }, idx: 2 }
  ])
})

test("Slow: Should parse with { quoteChar: '\"' } and field containing delimiter", async (t) => {
  const options = { delimiterValue: ',', quoteChar: '"' }
  const enqueue = sinon.spy()
  const chunk = '"a","b,b","c"\n"1","2,2","3"\n'
  const { slowParse } = parse(options)
  slowParse(chunk, { enqueue })
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', 'b,b': '2,2', c: '3' }, idx: 2 }
  ])
})

// *** Option: errorOnEmptyLines *** //
test('Fast: Should parse with { errorOnEmptyLine: false }', async (t) => {
  const options = { errorOnEmptyLine: false }
  const enqueue = sinon.spy()
  const chunk = '\na,b,c\n\n1,2,3\n'
  const { fastParse } = parse(options)
  fastParse(chunk, { enqueue })
  equal(enqueue.callCount, 1)
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', b: '2', c: '3' }, idx: 4 }
  ])
})

test('Slow: Should parse with { errorOnEmptyLines: false }', async (t) => {
  const options = { errorOnEmptyLine: false }
  const enqueue = sinon.spy()
  const chunk = '\na,b,c\n\n1,2,3\n'
  const { slowParse } = parse(options)
  slowParse(chunk, { enqueue })
  equal(enqueue.callCount, 1)
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', b: '2', c: '3' }, idx: 4 }
  ])
})

test('Fast: Should parse with { errorOnEmptyLine: true } ', async (t) => {
  const options = { errorOnEmptyLine: true }
  const enqueue = sinon.spy()
  const chunk = '\na,b,c\n\n1,2,3\n'
  const { fastParse } = parse(options)
  fastParse(chunk, { enqueue })
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

test('Slow: Should parse with { errorOnEmptyLine: true }', async (t) => {
  const options = { errorOnEmptyLine: true }
  const enqueue = sinon.spy()
  const chunk = '\na,b,c\n\n1,2,3\n'
  const { slowParse } = parse(options)
  slowParse(chunk, { enqueue })
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

// *** Option: commentPrefixValue && errorOnComment *** //
test('Fast: Should parse with { commentPrefixValue: "//", errorOnComment: false }', async (t) => {
  const options = { commentPrefixValue: '//', errorOnComment: false }
  const enqueue = sinon.spy()
  const chunk = '// header\na,b,c\n// data\n1,2,3\n'
  const { fastParse } = parse(options)
  fastParse(chunk, { enqueue })
  equal(enqueue.callCount, 1)
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', b: '2', c: '3' }, idx: 4 }
  ])
})

test('Slow: Should parse with { commentPrefixValue: "//", errorOnComment: false }', async (t) => {
  const options = { commentPrefixValue: '//', errorOnComment: false }
  const enqueue = sinon.spy()
  const chunk = '// header\na,b,c\n// data\n1,2,3\n'
  const { slowParse } = parse(options)
  slowParse(chunk, { enqueue })
  equal(enqueue.callCount, 1)
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', b: '2', c: '3' }, idx: 4 }
  ])
})

test('Fast: Should parse with { commentPrefixValue: "//", errorOnComment: true }', async (t) => {
  const options = { commentPrefixValue: '//', errorOnComment: true }
  const enqueue = sinon.spy()
  const chunk = '// header\na,b,c\n// data\n1,2,3\n'
  const { fastParse } = parse(options)
  fastParse(chunk, { enqueue })
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

test('Slow: Should parse with { commentPrefixValue: "//", errorOnComment: true }', async (t) => {
  const options = { commentPrefixValue: '//', errorOnComment: true }
  const enqueue = sinon.spy()
  const chunk = '// header\na,b,c\n// data\n1,2,3\n'
  const { slowParse } = parse(options)
  slowParse(chunk, { enqueue })
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

// *** Option: errorOnFieldsMismatch *** //
test('Fast: Should parse with { errorOnFieldsMismatch: false }', async (t) => {
  const options = { errorOnFieldsMismatch: false }
  const enqueue = sinon.spy()
  const chunk = 'a,b,c\n1,2\n1,2,3,4\n1,2,3\n'
  const { fastParse } = parse(options)
  fastParse(chunk, { enqueue })
  equal(enqueue.callCount, 1)
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', b: '2', c: '3' }, idx: 4 }
  ])
})

test('Slow: Should parse with { errorOnFieldsMismatch: false }', async (t) => {
  const options = { errorOnFieldsMismatch: false }
  const enqueue = sinon.spy()
  const chunk = 'a,b,c\n1,2\n1,2,3,4\n1,2,3\n'
  const { slowParse } = parse(options)
  slowParse(chunk, { enqueue })
  equal(enqueue.callCount, 1)
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', b: '2', c: '3' }, idx: 4 }
  ])
})

test('Fast: Should parse with { errorOnFieldsMismatch: true }', async (t) => {
  const options = { errorOnFieldsMismatch: true }
  const enqueue = sinon.spy()
  const chunk = 'a,b,c\n1,2\n1,2,3,4\n1,2,3\n'
  const { fastParse } = parse(options)
  fastParse(chunk, { enqueue })
  equal(enqueue.callCount, 3)
  deepEqual(enqueue.firstCall.args, [
    {
      err: {
        code: 'FieldsMismatchTooFew',
        message: 'Too few fields were parsed, 2, expected 3.'
      },
      idx: 2
    }
  ])
  deepEqual(enqueue.secondCall.args, [
    {
      err: {
        code: 'FieldsMismatchTooMany',
        message: 'Too many fields were parsed, 4, expected 3.'
      },
      idx: 3
    }
  ])
  deepEqual(enqueue.thirdCall.args, [
    { data: { a: '1', b: '2', c: '3' }, idx: 4 }
  ])
})

test('Slow: Should parse with { errorOnFieldsMismatch: true }', async (t) => {
  const options = { errorOnFieldsMismatch: true }
  const enqueue = sinon.spy()
  const chunk = 'a,b,c\n1,2\n1,2,3,4\n1,2,3\n'
  const { slowParse } = parse(options)
  slowParse(chunk, { enqueue })
  equal(enqueue.callCount, 3)
  deepEqual(enqueue.firstCall.args, [
    {
      err: {
        code: 'FieldsMismatchTooFew',
        message: 'Too few fields were parsed, 2, expected 3.'
      },
      idx: 2
    }
  ])
  deepEqual(enqueue.secondCall.args, [
    {
      err: {
        code: 'FieldsMismatchTooMany',
        message: 'Too many fields were parsed, 4, expected 3.'
      },
      idx: 3
    }
  ])
  deepEqual(enqueue.thirdCall.args, [
    { data: { a: '1', b: '2', c: '3' }, idx: 4 }
  ])
})

// *** Option: errorOnFieldMalformed *** //
test('Slow: Should parse with { errorOnFieldMalformed: false }', async (t) => {
  const options = { errorOnFieldMalformed: false }
  const enqueue = sinon.spy()
  const chunk = 'a,b,c\n"1","2","3"\n"4'
  const { slowParse, previousChunk } = parse(options)
  slowParse(chunk, { enqueue })
  slowParse(previousChunk(), { enqueue })
  slowParse('', { enqueue })
  equal(enqueue.callCount, 3)
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', b: '2', c: '3' }, idx: 2 }
  ])
  deepEqual(enqueue.secondCall.args, [
    {
      err: {
        code: 'FieldsMismatchTooFew',
        message: 'Too few fields were parsed, 1, expected 3.'
      },
      idx: 3
    }
  ])
  deepEqual(enqueue.thirdCall.args, [
    {
      err: { code: 'EmptyLineExists', message: 'Empty line detected.' },
      idx: 4
    }
  ])
})
test('Slow: Should parse with { errorOnFieldMalformed: true }', async (t) => {
  const options = { errorOnFieldMalformed: true }
  const enqueue = sinon.spy()
  const chunk = 'a,b,c\n"1","2","3"\n"4'
  const { slowParse, previousChunk } = parse(options)
  try {
    slowParse(chunk, { enqueue })
    slowParse(previousChunk(), { enqueue })
    slowParse('', { enqueue })
  } catch (e) {
    equal(e.message, 'QuotedFieldMalformed')
  }
  equal(enqueue.callCount, 1)
  deepEqual(enqueue.firstCall.args, [
    { data: { a: '1', b: '2', c: '3' }, idx: 2 }
  ])
})

// *** extra spaces *** //
/* test('Slow: Should parse with space padding', async (t) => {
const options = { }
const enqueue = sinon.spy()
let chunk = 'a,b,c\n"1" ,"2" ,"3" \n'
const { slowParse } = parse(options)
slowParse(chunk, { enqueue })
equal(enqueue.callCount, 1)
deepEqual(enqueue.firstCall.args, [{data:{ a: '1', b: '2', c: '3' },idx:2}])
}) */
