// chunkSize >> largest expected row
const defaultOptions = {
  header: true, // false: return array; true: detect headers and return json; [...]: use defined headers and return json
  newlineChar: '\n', // undefined: detect newline from file; '\r\n': Windows; '\n': Linux/Mac
  delimiterChar: ',',
  quoteChar: '"',
  // escapeChar: '"', // default: `quoteChar`

  // Parse
  // fastMode: true,
  emptyFieldValue: '',
  coerceField: (field) => field, // TODO tests
  commentPrefixValue: false, // falsy: disable, '//': enabled
  errorOnComment: true,
  errorOnEmptyLine: true,
  errorOnFieldsMismatch: true
  // errorOnFieldMalformed: true
}

const length = (value) => value.length

export const parse = (opts = {}) => {
  const options = { ...defaultOptions, ...opts }
  options.escapeChar ??= options.quoteChar

  let { header } = options
  let headerLength = length(header)
  let headerShortLength = headerLength - 1

  const {
    newlineChar,
    delimiterChar,
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
  // const escapedQuoteChar = escapeChar + quoteChar

  const escapedQuoteEqual = escapeChar === quoteChar
  const escapedQuoteNotEqual = escapeChar !== quoteChar

  const newlineCharLength = length(newlineChar)
  const delimiterCharLength = length(delimiterChar)
  const quoteCharLength = 1 // length(quoteChar)
  const escapeCharLength = 1 // length(escapeChar)
  const escapedQuoteCharLength = 2 // length(escapedQuoteChar)
  const commentPrefixValueLength = length(commentPrefixValue)

  let chunk, chunkLength, cursor, row, enqueue
  let partialLine = ''
  let idx = 0
  const enqueueRow = (row) => {
    idx += 1
    if (header === true) {
      header = row
      headerLength = length(header)
      headerShortLength = headerLength - 1
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
              `Too many fields were parsed, ${rowLength}, expected ${headerLength}.`
            )
          } else if (rowLength < headerLength) {
            enqueueError(
              'FieldsMismatchTooFew',
              `Too few fields were parsed, ${rowLength}, expected ${headerLength}.`
            )
          }
        }
        return
      } else {
        // slow compared to returning just row
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
  const transformField = (field) => {
    return coerceField(field || emptyFieldValue)
  }
  const addFieldToRow = (field) => {
    row.push(transformField(field))
  }

  // Fast Parse
  const fastParse = (string, controller) => {
    chunk = string
    chunkLength = length(chunk)
    enqueue = controller.enqueue
    const lines = chunk.split(newlineChar)
    let linesLength = length(lines)
    if (linesLength > 1) {
      partialLine = lines.pop()
      linesLength -= 1
    }
    for (const line of lines) {
      if (commentPrefixValue && line.indexOf(commentPrefixValue) === 0) {
        idx += 1
        if (errorOnComment) {
          enqueueError('CommentExists', 'Comment detected.')
        }
        continue
      }
      if (!line) {
        idx += 1
        // `linesLength > 1` to ignore end of file `\n`
        if (errorOnEmptyLine && linesLength > 1) {
          enqueueError('EmptyLineExists', 'Empty line detected.')
        }
        continue
      }
      enqueueRow(line.split(delimiterChar).map(transformField))
    }
  }

  // Slow Parse
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

  const slowParse = (string, controller) => {
    chunk = string
    chunkLength = length(chunk)
    enqueue = controller.enqueue
    cursor = 0
    row = []

    // flush
    const lastNewlineChar = chunk.lastIndexOf(newlineChar)
    if (chunkLength !== lastNewlineChar && lastNewlineChar > -1) {
      partialLine = chunk.substring(lastNewlineChar + newlineCharLength)
      chunk = parseField(lastNewlineChar + newlineCharLength)
    }

    checkForEmptyLine()

    for (;;) {
      let quoted, nextCursor, nextCursorLength, atNewline
      if (chunk[cursor] === quoteChar) {
        cursor += quoteCharLength
        quoted = true
        nextCursor = cursor
        for (;;) {
          nextCursor = findNext(quoteChar, nextCursor)
          if (nextCursor < 0) {
            throw new Error('QuotedFieldMalformed', { cause: idx })
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

      const rowLength = length(row)
      if (rowLength < headerShortLength) {
        nextCursor = findNext(delimiterChar)
        nextCursorLength = delimiterCharLength
      } else if (rowLength < headerLength) {
        nextCursor = findNext(newlineChar)
        nextCursorLength = newlineCharLength
        if (nextCursor < 0) nextCursor = chunkLength
        atNewline = true
      } else {
        // fallback
        const nextDelimiterChar = findNext(delimiterChar)
        let nextNewlineChar = findNext(newlineChar)
        if (nextNewlineChar < 0) nextNewlineChar = chunkLength
        if (nextDelimiterChar > -1 && nextDelimiterChar < nextNewlineChar) {
          nextCursor = nextDelimiterChar
          nextCursorLength = delimiterCharLength
        } else {
          nextCursor = nextNewlineChar
          nextCursorLength = newlineCharLength
          atNewline = true
        }
      }
      if (nextCursor < 0) {
        break
      }

      const endOfField = quoted ? nextCursor - 1 : nextCursor
      addFieldToRow(parseField(endOfField))

      cursor = nextCursor + nextCursorLength

      if (atNewline) {
        enqueueRow(row)
        row = []
        checkForEmptyLine()
      }
      if (chunkLength <= cursor) {
        break
      }
    }
  }

  // Test Parse
  let nextDelimiterChar, nextNewlineChar

  const endOfLine = () => {
    enqueueRow(row)
    row = []
    cursor = nextNewlineChar + newlineCharLength
    checkForEmptyLine()
    nextNewlineChar = findNext(newlineChar)
  }

  const testParse = (string, controller) => {
    chunk = string
    chunkLength = length(chunk)
    enqueue = controller.enqueue
    cursor = 0
    row = []

    nextDelimiterChar = findNext(delimiterChar)
    nextNewlineChar = findNext(newlineChar)

    // flush
    const lastNewlineChar = chunk.lastIndexOf(newlineChar)
    if (chunkLength !== lastNewlineChar && lastNewlineChar > -1) {
      partialLine = chunk.slice(lastNewlineChar + newlineCharLength)
      chunk = chunk.slice(0, lastNewlineChar + newlineCharLength)
    }

    const endOfFile = nextNewlineChar < 0
    if (endOfFile) {
      nextNewlineChar = chunkLength
    }

    checkForEmptyLine()
    for (;;) {
      /* if (chunk[cursor] === quoteChar) {
      let nextQuoteChar = cursor

      cursor += quoteCharLength
      for (;;) {
      nextQuoteChar = findNext(quoteChar, nextQuoteChar + quoteCharLength)

      if (nextQuoteChar < 0) {
      if (endOfFile && errorOnFieldMalformed) {
      throw new Error('QuotedFieldMalformed', { cause: idx })
      }
      // If there is an open quote that spans multiple chunks, should we catch it?
      // performance.memory.usedJSHeapSize / window?.performance.memory.jsHeapSizeLimit
      // process.memoryUsage()
      break
      }

      if (
      quoteChar === escapeChar &&
      chunk[nextQuoteChar + quoteCharLength] === quoteChar
      ) {
      // quoteCharLength must be 1
      nextQuoteChar += quoteCharLength
      continue
      }
      if (
      quoteChar !== escapeChar &&
      chunk[nextQuoteChar - escapeCharLength] === escapeChar
      ) {
      // escapeCharLength must be 1
      continue
      }

      addFieldToRow(
      parseField(nextQuoteChar).replaceAll(escapedQuoteChar, quoteChar)
      )

      cursor = nextQuoteChar + quoteCharLength
      nextDelimiterChar = findNext(delimiterChar)
      nextNewlineChar = findNext(newlineChar)

      if (cursor === nextDelimiterChar) {
      cursor += delimiterCharLength
      nextDelimiterChar = findNext(delimiterChar)
      } else if (cursor === nextNewlineChar) {
      endOfLine()
      }
      //     else if (chunk[cursor] === ' ') {
      //          err = ['QuotedFieldMalformed', 'Quoted field contains excess space between closing quote and delimiter/newline']
      //          const nextStop = Math.min(...[nextDelimiterChar, nextNewlineChar].filter(v => (-1 < v)))
      //          const spaceText = parseField(nextStop)
      //          cursor += (spaceText.trim() === '') ? spaceText.length + delimiterCharLength : 0
      //          nextDelimiterChar = findNext(delimiterChar)
      //        }
      break
      }
      continue
      } */

      // ...,...\n
      if (nextDelimiterChar > -1 && nextDelimiterChar < nextNewlineChar) {
        addFieldToRow(parseField(nextDelimiterChar))
        cursor = nextDelimiterChar + delimiterCharLength
        nextDelimiterChar = findNext(delimiterChar)
        continue
      }

      if (nextNewlineChar < 0) {
        break
      }

      if (
        commentPrefixValue &&
        parseField(cursor + commentPrefixValueLength) === commentPrefixValue
      ) {
        idx += 1
        if (errorOnComment) {
          enqueueError('CommentExists', 'Comment detected.')
        }
        cursor = nextNewlineChar + newlineCharLength
        nextDelimiterChar = findNext(delimiterChar)
        nextNewlineChar = findNext(newlineChar)
        continue
      }

      addFieldToRow(parseField(nextNewlineChar))
      endOfLine()
    }

    if (endOfFile && length(row)) {
      nextNewlineChar = chunkLength
      endOfLine()
    }
  }

  return {
    fastParse,
    slowParse,
    testParse,
    header: () => header,
    previousChunk: () => partialLine
  }
}

export default (input, opts) => {
  const options = {
    ...defaultOptions,
    enableReturn: true,
    chunkSize: 64 * 1024 * 1024,
    enqueue: () => {},
    ...opts
  }
  const { chunkSize, enableReturn, enqueue } = options
  const { slowParse, previousChunk } = parse(options)

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
    const chunk = previousChunk() + input.slice(position, position + chunkSize)

    // Checking if you can use fastParse slows it down more than checking for quoteChar on ever field.
    slowParse(chunk, controller)
    position += chunkSize
  }
  // flush
  const chunk = previousChunk()
  slowParse(chunk, controller)

  return enableReturn && res
}
