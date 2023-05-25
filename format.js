export const defaultOptions = {
  header: true, // false: don't log out header; true: log out header
  newlineChar: '\r\n', // undefined: detect newline from file; '\r\n': Windows; '\n': Linux/Mac
  delimiterChar: ',', // TODO add in auto detect or function
  quoteChar: '"'
  // escapeChar: '"'

  // quoteColumn: undefined
}

export const format = (input, opts = {}) => {
  const options = { ...defaultOptions, enqueue: () => {}, ...opts }
  options.escapeChar ??= options.quoteChar
  const { enableReturn, enqueue } = options

  const isArrayData = Array.isArray(input[0])
  const format = isArrayData ? formatArray : formatObject
  if (!isArrayData && options.header === true) {
    options.header = Object.keys(input[0])
  }

  let res = options.header !== false ? formatArray(options.header, options) : ''

  for (let i = 0, l = input.length; i < l; i++) {
    const data = format(input[i], options)
    enqueue(data)
    if (enableReturn) {
      res += data
    }
  }

  return enableReturn && res
}

export const formatArray = (arr, options) => {
  let csv = ''
  for (let i = 0, l = arr.length; i < l; i++) {
    csv += (i ? options.delimiterChar : '') + formatField(arr[i], null, options)
  }
  return csv + options.newlineChar
}

export const formatObject = (data, options) => {
  let csv = ''
  const columns = options.header || Object.keys(data)
  for (let i = 0, l = columns.length; i < l; i++) {
    csv +=
      (i ? options.delimiterChar : '') +
      formatField(data[columns[i]], options.quoteColumn?.[i], options)
  }
  return csv + options.newlineChar
}

export const formatField = (
  field,
  needsQuotes,
  { quoteChar, escapeChar, delimiterChar, newlineChar }
) => {
  if (field === undefined || field === null || field === '') {
    return ''
  }

  if (field.constructor === Date) {
    return field.toISOString() // JSON.stringify(str).slice(1, 25) faster??
  }

  field = field.toString()

  // Developer override using options.quotes
  if (needsQuotes === false) {
    return field
  }

  // Test if needs quote
  needsQuotes =
    needsQuotes ||
    hasAnyDelimiters(field, [
      delimiterChar,
      newlineChar,
      quoteChar,
      '\ufeff'
    ]) ||
    field[0] === ' ' ||
    field[field.length - 1] === ' '

  return needsQuotes
    ? quoteChar +
        field.replaceAll(quoteChar, escapeChar + quoteChar) +
        quoteChar
    : field
}

const hasAnyDelimiters = (field, delimiters) => {
  for (const delimiter of delimiters) {
    if (field.indexOf(delimiter) > -1) {
      return true
    }
  }
}

export default format
