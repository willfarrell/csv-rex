// chunkSize >> largest expected row
const defaultOptions = {
  header: true, // false: return array; true: detect headers and return json; [...]: use defined headers and return json
  newlineChar: '\r\n', // '': detect newline from chunk; '\r\n': Windows; '\n': Linux/Mac
  delimiterChar: ',', // '': detect delimiter from chunk
  // quoteChar: '"',
  // escapeChar: '"', // default: `quoteChar`

  // Parse
  emptyFieldValue: '',
  coerceField: (field) => field, // TODO tests
  // commentPrefixValue: false, // falsy: disable, '//': enabled
  // errorOnComment: true,
  // errorOnEmptyLine: true,
  errorOnFieldsMismatch: true
  // errorOnFieldMalformed: true
}

const length = (value) => value.length

export const parse = (opts = {}) => {
  const options = { ...defaultOptions, ...opts }
  options.escapeChar ??= options.quoteChar

  let { header, newlineChar, delimiterChar } = options
  let headerLength = length(header)
  const {
    // quoteChar,
    // escapeChar,
    // commentPrefixValue,
    emptyFieldValue,
    coerceField,
    // errorOnEmptyLine,
    // errorOnComment,
    errorOnFieldsMismatch
    // errorOnFieldMalformed
  } = options

  let chunk, enqueue
  let partialLine = ''
  let idx = 0
  const enqueueRow = (row) => {
    let data = row
    idx += 1
    if (headerLength) {
      const rowLength = length(row)

      if (headerLength !== rowLength) {
        if (errorOnFieldsMismatch) {
          enqueueError(
            'FieldsMismatch',
            `Incorrect number of fields parsed, expected ${headerLength}.`
          )
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

  const transformField = (field, idx) => {
    return coerceField(field || emptyFieldValue, idx)
  }

  const chunkParse = (string, controller) => {
    chunk = string
    enqueue = controller.enqueue
    const lines = chunk.split(newlineChar) // TODO use cursor pattern
    let linesLength = length(lines)
    if (linesLength > 1) {
      partialLine = lines.pop()
      linesLength -= 1
    }

    let i = 0
    if (header === true) {
      header = lines[i].split(delimiterChar)
      headerLength = length(header)
      i += 1
    }

    for (; i < linesLength; i++) {
      const line = lines[i]
      const row = []
      let cursor = 0
      while (cursor < line.length) {
        const delimiterIndex = line.indexOf(delimiterChar, cursor)
        if (delimiterIndex === -1) {
          row.push(transformField(line.substring(cursor), row.length))
          break
        }
        row.push(
          transformField(line.substring(cursor, delimiterIndex), row.length)
        )
        cursor = delimiterIndex + 1
      }
      enqueueRow(row)
    }
  }

  return {
    chunkParse,
    header: () => header,
    previousChunk: () => partialLine
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
