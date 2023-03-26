import test from 'node:test'
import { equal } from 'node:assert'
import { format, formatArray, formatObject, formatField } from './format.js'

const defaultOptions = {
  header: true,
  escapeChar: '"',
  quoteChar: '"',
  delimiterChar: ',',
  newlineChar: '/n',

  enableReturn: true,
  enqueue: () => {}
}

// *** format() *** //

test('Should format array of objects w/ header == true', async (t) => {
  const field = format([{ a: '1', b: '2' }], {
    ...defaultOptions,
    header: true
  })
  equal(field, 'a,b/n1,2/n')
})

test('Should format array of objects w/ header == true & columns == [...]', async (t) => {
  const field = format([{ a: '1', b: '2' }], {
    ...defaultOptions,
    header: true,
    columns: ['b', 'a']
  })
  equal(field, 'b,a/n2,1/n')
})

test('Should format array of objects w/ header === false', async (t) => {
  const field = format([{ a: '1', b: '2' }], {
    ...defaultOptions,
    header: false
  })
  equal(field, '1,2/n')
})

// *** formatHeader() *** //
test('Should format header', async (t) => {
  const field = formatArray(['b', 'a'], {
    ...defaultOptions,
    header: ['b', 'a']
  })
  equal(field, 'b,a/n')
})

// *** formatRow() *** //
test('Should format row', async (t) => {
  const field = formatObject(
    { a: '1', b: '2' },
    { ...defaultOptions, columns: ['b', 'a'] }
  )
  equal(field, '2,1/n')
})
test('Should format row w/ quotes', async (t) => {
  const field = formatObject(
    { a: '1', b: '2' },
    { ...defaultOptions, columns: ['b', 'a'], quoteColumn: [true, true] }
  )
  equal(field, '"2","1"/n')
})
test('Should format row w/o quotes', async (t) => {
  const field = formatObject(
    { a: '1', b: '2' },
    { ...defaultOptions, columns: ['b', 'a'], quoteColumn: [false, false] }
  )
  equal(field, '2,1/n')
})

// *** formatField() *** //
test('Should format undefined', async (t) => {
  const field = formatField(undefined, undefined, defaultOptions)
  equal(field, '')
})
test('Should format null', async (t) => {
  const field = formatField(null, undefined, defaultOptions)
  equal(field, '')
})
test('Should format empty string', async (t) => {
  const field = formatField('', undefined, defaultOptions)
  equal(field, '')
})
test('Should format date', async (t) => {
  const field = formatField(
    new Date('2000-01-01T00:00:00.000Z'),
    undefined,
    defaultOptions
  )
  equal(field, '2000-01-01T00:00:00.000Z')
})
test('Should format number', async (t) => {
  const field = formatField(0, undefined, defaultOptions)
  equal(field, '0')
})
test('Should format string', async (t) => {
  const field = formatField('column', undefined, defaultOptions)
  equal(field, 'column')
})
test('Should format string with delimiter', async (t) => {
  const field = formatField('_"_', undefined, defaultOptions)
  equal(field, '"_""_"')
})
test('Should format string with leading space', async (t) => {
  const field = formatField(' space', undefined, defaultOptions)
  equal(field, '" space"')
})
test('Should format string with trailing space', async (t) => {
  const field = formatField('space ', undefined, defaultOptions)
  equal(field, '"space "')
})
test('Should format w/ quotes', async (t) => {
  const field = formatField('column', true, defaultOptions)
  equal(field, '"column"')
})
test('Should format w/o quotes', async (t) => {
  const field = formatField('column', false, defaultOptions)
  equal(field, 'column')
})
