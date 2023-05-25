// chunkSize >> largest expected row
const defaultOptions = {
  header: true, // false: return array; true: detect headers and return json; [...]: use defined headers and return json
  newlineChar: '', // '': detect newline from chunk; '\r\n': Windows; '\n': Linux/Mac
  delimiterChar: '', // '': detect delimiter from chunk
  quoteChar: '"',
  // escapeChar: '"', // default: `quoteChar`
  detectCharLength: 1024,

  // Parse
  emptyFieldValue: '',
  // TODO option to remove empty fields from object
  coerceField: (field) => field, // TODO tests
  commentPrefixValue: false, // falsy: disable, '//': enabled
  errorOnComment: true,
  errorOnEmptyLine: true,
  errorOnFieldsMismatch: true
  // errorOnFieldMalformed: true
}

const length = (value) => value.length
const escapeRegExp = (string) => string.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&') // https://github.com/tc39/proposal-regex-escaping

export const parse = (opts = {}) => {
  const options = { ...defaultOptions, ...opts }
  options.escapeChar ??= options.quoteChar

  let { header, newlineChar, delimiterChar } = options
  const {
    detectCharLength,
    quoteChar,
    escapeChar,
    commentPrefixValue,
    emptyFieldValue,
    coerceField,
    errorOnEmptyLine,
    errorOnComment,
    errorOnFieldsMismatch
    // errorOnFieldMalformed
  } = options
  let headerLength = length(header)
  const detectDelimiterCharRegExp = /,|\t|\||;|\x1E|\x1F/g // eslint-disable-line no-control-regex
  const detectNewlineCharRegExp = /\r\n|\n|\r/g

  const escapedQuoteChar = escapeChar + quoteChar
  const escapedQuoteCharRegExp = new RegExp(
    `${escapeRegExp(escapedQuoteChar)}`,
    'g'
  )

  const escapedQuoteEqual = escapeChar === quoteChar
  const escapedQuoteNotEqual = escapeChar !== quoteChar

  let newlineCharLength = length(newlineChar)
  const delimiterCharLength = 1 // length(delimiterChar)
  const quoteCharLength = 1 // length(quoteChar)
  const escapeCharLength = 1 // length(escapeChar)
  const escapedQuoteCharLength = 2 // length(escapedQuoteChar)
  // const commentPrefixValueLength = length(commentPrefixValue)

  let chunk, chunkLength, cursor, row, enqueue
  let partialLine = ''
  let idx = 0
  const enqueueRow = (row) => {
    idx += 1
    if (header === true) {
      header = row
      headerLength = length(header)
      return
    }
    let data = row
    if (headerLength) {
      const rowLength = length(row)

      if (headerLength !== rowLength) {
        if (errorOnFieldsMismatch) {
          // enqueueError('FieldsMismatch', `Parsed ${rowLength} fields, expected ${headerLength}.`)
          if (headerLength < rowLength) {
            enqueueError(
              'FieldsMismatchTooMany',
              `Too many fields were parsed, expected ${headerLength}.`
            )
          } else if (rowLength < headerLength) {
            enqueueError(
              'FieldsMismatchTooFew',
              `Too few fields were parsed, expected ${headerLength}.`
            )
          }
        }
        return
      } else {
        data = {}
        for (let i = 0; i < rowLength; i++) {
          data[header[i]] = row[i]
        }
      }
    }
    enqueue({ idx, data })
  }

  const enqueueError = (code, message) => {
    enqueue({ idx, err: { code, message } })
  }

  const findNext = (searchValue, start = cursor) => {
    return chunk.indexOf(searchValue, start)
  }

  const parseField = (end) => {
    return chunk.substring(cursor, end)
  }
  const transformField = (field, idx) => {
    return coerceField(field || emptyFieldValue, idx)
  }

  // TODO idea: when header == true/array using a different addFieldToRow function to allow faster key:value mapping
  // const resetRow = () => {
  //   row = []
  // }
  const addFieldToRow = (field, idx) => {
    row.push(transformField(field, idx))
  }

  const checkForEmptyLine = () => {
    if (findNext(newlineChar) === cursor) {
      idx += 1
      cursor += newlineCharLength
      if (errorOnEmptyLine) {
        enqueueError('EmptyLineExists', 'Empty line detected.')
      }
      return checkForEmptyLine()
    } else if (commentPrefixValue && findNext(commentPrefixValue) === cursor) {
      idx += 1
      cursor = findNext(newlineChar) + newlineCharLength
      if (errorOnComment) {
        enqueueError('CommentExists', 'Comment detected.')
      }
      return checkForEmptyLine()
    }
  }

  const chunkParse = (string, controller, flush = false) => {
    chunk = string
    chunkLength = length(chunk)
    enqueue = controller.enqueue
    partialLine = ''
    cursor = 0
    row = [] // resetRow()

    // auto-detect
    if (!newlineChar) {
      newlineChar = detectChar(
        chunk.substring(0, detectCharLength),
        detectNewlineCharRegExp
      )
      newlineCharLength = length(newlineChar)
    }
    delimiterChar ||= detectChar(
      chunk.substring(0, detectCharLength),
      detectDelimiterCharRegExp
    )

    checkForEmptyLine()
    let lineStart = 0
    for (;;) {
      let quoted
      let nextCursor = cursor
      let nextCursorLength
      let atNewline
      if (chunk[cursor] === quoteChar) {
        cursor += quoteCharLength
        quoted = true
        nextCursor = cursor
        for (;;) {
          nextCursor = findNext(quoteChar, nextCursor)
          if (nextCursor < 0) {
            partialLine = chunk.substring(lineStart, chunkLength) + partialLine
            if (flush) {
              throw new Error('QuotedFieldMalformed', { cause: idx })
            }
            return
          }
          if (
            escapedQuoteEqual &&
            chunk[nextCursor + quoteCharLength] === quoteChar
          ) {
            nextCursor += escapedQuoteCharLength
            continue
          }
          if (
            escapedQuoteNotEqual &&
            chunk[nextCursor - escapeCharLength] === escapeChar
          ) {
            nextCursor += quoteCharLength
            continue
          }
          break
        }
      }

      // fallback
      const nextDelimiterChar = findNext(delimiterChar, nextCursor)
      let nextNewlineChar = findNext(newlineChar, nextCursor)
      if (nextNewlineChar < 0) {
        if (!flush) {
          partialLine = chunk.substring(lineStart, chunkLength) + partialLine
          return
        }
        nextNewlineChar = chunkLength
      }
      if (nextDelimiterChar > -1 && nextDelimiterChar < nextNewlineChar) {
        nextCursor = nextDelimiterChar
        nextCursorLength = delimiterCharLength
      } else {
        nextCursor = nextNewlineChar
        nextCursorLength = newlineCharLength
        atNewline = true
      }

      if (nextCursor < 0 || !nextCursor) {
        break
      }

      let field
      if (quoted) {
        field = parseField(nextCursor - 1).replace(
          escapedQuoteCharRegExp,
          quoteChar
        )
      } else {
        field = parseField(nextCursor)
      }
      addFieldToRow(field, row.length)

      cursor = nextCursor + nextCursorLength

      if (atNewline) {
        enqueueRow(row)
        row = [] // resetRow()
        checkForEmptyLine()
        lineStart = cursor
      }
      // `row.length === 0` required for when a csv ends with just `,` and no newline
      if (chunkLength <= cursor && row.length === 0) {
        break
      }
    }
  }

  return {
    chunkParse,
    header: () => header,
    previousChunk: () => partialLine
  }
}

export const detectChar = (chunk, pattern) => {
  let match
  const chars = {}
  while ((match = pattern.exec(chunk))) {
    const char = match[0]
    chars[char] ??= 0
    chars[char] += 1
    if (chars[char] > 5) return char
  }
  // pattern.lastIndex = 0 // not reused again
  const { key } =
    Object.keys(chars)
      .map((key) => ({ key, value: chars[key] }))
      .sort((a, b) => a.value - b.value)?.[0] ?? {}
  if (!key) {
    throw new Error('UnknownDetectChar', {
      cause: {
        pattern,
        chunk
      }
    })
  }
  return key
}

export const coerceTo = {
  string: (field) => field,
  boolean: (field) => {
    const boolean = coerceTo.true(field)
    return typeof boolean === 'boolean' ? boolean : coerceTo.false(field)
  },
  true: (field) => (field.toLowerCase() === 'true' ? true : field),
  false: (field) => (field.toLowerCase() === 'false' ? false : field),
  number: (field) => {
    const decimal = coerceTo.decimal(field)
    return Number.isInteger(decimal) ? coerceTo.integer(field) : decimal
  },
  integer: (field) => Number.parseInt(field, 10) || field,
  decimal: (field) => Number.parseFloat(field) || field,
  json: (field) => {
    try {
      return JSON.parse(field)
    } catch (e) {
      return field
    }
  },
  timestamp: (field) => {
    const date = new Date(field)
    return date.toString() !== 'Invalid Date' ? date : field
  },
  null: (field) => (field.toLowerCase() === 'null' ? null : field),
  any: (field) => {
    const types = ['boolean', 'number', 'null', 'json']
    for (let i = 0, l = types.length; i < l; i++) {
      field = coerceTo[types[i]](field)

      if (typeof field !== 'string') {
        break
      }
    }

    return field
  }
}

export default (input, opts) => {
  const options = {
    ...defaultOptions,
    ...{
      enableReturn: true,
      chunkSize: 64 * 1024 * 1024,
      enqueue: () => {}
    },
    ...opts
  }
  const { chunkSize, enableReturn, enqueue } = options
  const { chunkParse, previousChunk } = parse(options)

  const res = []
  const controller = { enqueue }

  if (enableReturn) {
    controller.enqueue = (row) => {
      enqueue(row)
      res.push(row.data)
    }
  }

  let position = 0
  while (position < input.length) {
    const chunk =
      previousChunk() + input.substring(position, position + chunkSize)

    // Checking if you can use fastParse slows it down more than checking for quoteChar on ever field.
    chunkParse(chunk, controller)
    position += chunkSize
  }
  // flush
  const chunk = previousChunk()
  chunkParse(chunk, controller, true)

  return enableReturn && res
}
