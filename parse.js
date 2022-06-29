// chunkSize >> largest expected row
const defaultOptions = {
  header: true, // false: return array; true: detect headers and return json; [...]: use defined headers and return json
  newlineChar: '\n', // undefined: detect newline from file; '\r\n': Windows; '\n': Linux/Mac
  delimiterChar: ',',
  quoteChar: '"',
  // escapeChar: '"', // default: `quoteChar`

  // Parse
  fastMode: true,
  emptyFieldValue: '', // undefined: do not attach parameter; null: same as default; ''
  coerceField: (field) => field, // TODO tests
  commentPrefixValue: '', // falsy: disable, '//': enabled
  errorOnComment: true,
  errorOnEmptyLine: true,
  errorOnFieldsMismatch: true,
  errorOnFieldMalformed: true
}

const length = (value) => value.length

export const parse = (opts = {}) => {
  const options = { ...defaultOptions, ...opts }
  options.escapeChar ??= options.quoteChar

  let { header } = options
  let headerLength = length(header)

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
    errorOnFieldsMismatch,
    errorOnFieldMalformed
  } = options
  const escapedQuoteChar = escapeChar + quoteChar
  const newlineCharLength = length(newlineChar)
  const delimiterCharLength = length(delimiterChar)
  const quoteCharLength = 1 // length(quoteChar)
  const escapeCharLength = 1 // length(escapeChar)
  const commentPrefixValueLength = length(commentPrefixValue)

  let partialLine = ''
  let enqueue
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

  const fastParse = (string, controller) => {
    chunk = string
    chunkLength = length(chunk)
    // chunk = partialLine + string
    // partialLine = ''
    enqueue = controller.enqueue
    const lines = chunk.split(newlineChar)
    let linesLength = length(lines)
    if (linesLength > 1) {
      partialLine = lines.pop()
      linesLength--
    }
    for (const line of lines) {
      if (
        commentPrefixValue &&
        line.substring(0, commentPrefixValueLength) === commentPrefixValue
      ) {
        idx += 1
        if (errorOnComment) {
          enqueueError('CommentExists', 'Comment detected.')
        }
        continue
      } else if (!line) {
        idx += 1
        // `linesLength > 1` to ignore end of file `\n`
        if (errorOnEmptyLine && linesLength > 1) {
          enqueueError('EmptyLineExists', 'Empty line detected.')
        }
        continue
      }
      const row = line.split(delimiterChar).map(transformField)
      enqueueRow(row)
    }
  }

  // Slow Parse
  let chunk, chunkLength, cursor, nextDelimiterChar, nextNewlineChar, row

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
  const endOfLine = () => {
    enqueueRow(row)
    row = []
    cursor = nextNewlineChar + newlineCharLength
    nextNewlineChar = findNext(newlineChar)
    checkForEmptyLine()
  }
  const checkForEmptyLine = () => {
    if (cursor === nextNewlineChar) {
      idx += 1
      cursor += newlineCharLength
      if (errorOnEmptyLine) {
        enqueueError('EmptyLineExists', 'Empty line detected.')
      }
      nextNewlineChar = findNext(newlineChar)
      return checkForEmptyLine()
    }
  }

  const slowParse = (string, controller) => {
    chunk = string
    // chunk = partialLine + string
    // partialLine = ''
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
      if (chunk[cursor] === quoteChar) {
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
      }

      // ...,...\n
      if (nextDelimiterChar > -1 && nextDelimiterChar < nextNewlineChar) {
        addFieldToRow(parseField(nextDelimiterChar))
        cursor = nextDelimiterChar + delimiterCharLength
        nextDelimiterChar = findNext(delimiterChar)
        continue
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

      if (nextNewlineChar < 0) {
        break
      }
      addFieldToRow(parseField(nextNewlineChar))
      endOfLine()
    }

    if (endOfFile && length(row)) {
      nextNewlineChar = chunkLength
      endOfLine()
    }
  }

  const canUseFastMode = (chunk) =>
    options.fastMode && chunk.indexOf(quoteChar) < 0

  return {
    canUseFastMode,
    fastParse,
    slowParse,
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
  const { canUseFastMode, fastParse, slowParse, previousChunk } = parse(options)

  const res = []
  const controller = {
    enqueue: (row) => {
      enqueue(row)
      if (enableReturn) {
        res.push(row.data)
      }
    }
  }

  let position = 0
  while (position < input.length) {
    const chunk = previousChunk() + input.slice(position, position + chunkSize)

    if (canUseFastMode(chunk)) {
      fastParse(chunk, controller)
    } else {
      slowParse(chunk, controller)
    }
    position += chunkSize
  }
  // flush
  const chunk = previousChunk()
  if (canUseFastMode(chunk)) {
    fastParse(chunk, controller)
  } else {
    slowParse(chunk, controller)
  }

  return enableReturn && res
}
