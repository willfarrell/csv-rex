import defaultOptions from './options.js'

export const validateOptions = (opts) => {
  const {newlineValue, delimiterValue, quoteChar, escapeChar} = { ...defaultOptions, ...opts }
  if (!newlineValue) throw new Error('newlineValue option not set')
  if (quoteChar.length > 1) throw new Error('quoteChar can be only 1 char')
  if (escapeChar.length > 1) throw new Error('escapeChar can be only 1 char')
  if ([newlineValue,quoteChar,escapeChar].includes(delimiterValue)) throw new Error('delimiterValue assigned to invalid value')
  return opts
}

export const parser = (opts = {}) => {
  const options = { ...defaultOptions, ...opts }
  const { fastMode,
    newlineValue, delimiterValue, quoteChar, escapeChar, commentPrefixValue, emptyFieldValue,coerceField,
    errorOnEmptyLine,errorOnComment, errorOnFieldsMismatch
  } = options
  let { header } = options

  const canUseFastMode = (chunk) => fastMode && chunk.indexOf(quoteChar) < 0
  const length = (string) => string.length
  
  let headerLength = header.length
  const newlineValueLength = length(newlineValue)
  const delimiterValueLength = length(delimiterValue)
  const quoteCharLength = 1 // length(quoteChar)
  const escapeCharLength = 1 // length(escapeChar)
  const commentPrefixValueLength = length(commentPrefixValue)
  
  let enqueue
  let idx = 0
  const enqueueRow = (row) => {
    idx += 1
    if (!header) {
      return { data: row, idx }
    }
    const rowLength = length(row)
    
    if (!errorOnFieldsMismatch && headerLength !== rowLength) {
      return
    }
    if (headerLength < rowLength) {
      enqueueError('FieldsMismatch', 'FieldsMismatchTooMany', `Too many fields were parsed, ${rowLength}, expected ${headerLength}.`)
    } else if (rowLength < headerLength) {
      enqueueError('FieldsMismatch', 'FieldsMismatchTooFew', `Too few fields were parsed, ${rowLength}, expected ${headerLength}.`)
    } else {
      const data = {}
      for (let i = 0; i < rowLength; i++) {
        if (emptyFieldValue !== undefined) {
          data[header[i]] = row[i]
        }
      }
      enqueue({data, idx})
    }
  }
  
  const enqueueError = (code, message) => {
    enqueue({ idx, err: { code, message } })
  }
  
  let fastParse
  if (fastMode) {
    fastParse = (chunk, controller) => {
      enqueue = controller.enqueue
      const lines = chunk.split(newlineValue)
      
      // Allow flush
      
      if (1 < length(lines)) {
        partialLine = lines.pop()
      }
      for (let line of lines) {
        const { delimiterValue, commentPrefixValue } = options
        if (commentPrefixValue && line.substring(0, commentPrefixValueLength) === commentPrefixValue) {
          idx += 1
          if (errorOnComment) {
            enqueueError('CommentExists', 'Comment detected.') // comment = line
          }
          continue
        } else if (!length(line)) {
          idx += 1
          if (errorOnEmptyLine) {
            enqueueError('EmptyLineExists', 'Empty line detected.')
          }
          continue
        }
        const row = line.split(delimiterValue).map(transformField)
        if (header === true) {
          idx += 1
          header = row
          headerLength = length(header)
        } else {
          enqueueRow(row)
        }
      }
    }
  }

  // Slow Parse
  let chunk, cursor, nextDelimiterValue, nextNewlineValue, row
  const findNext = (searchvalue, start = cursor) => {
    return chunk.indexOf(searchvalue, start)
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
    cursor = nextNewlineValue + newlineValueLength
    nextNewlineValue = findNext(newlineValue)
    
    if (header === true) {
      idx += 1
      header = row
      headerLength = header.length
    } else {
      enqueueRow(row)
    }
    row = []
    checkForEmptyLine()
  }
  const checkForEmptyLine = () => {
    if (cursor === nextNewlineValue) {
      idx += 1
      if (errorOnEmptyLine) {
        enqueueError('EmptyLineExists', 'Empty line detected.')
      }
      cursor += newlineValueLength
      nextNewlineValue = findNext(newlineValue)
      return checkForEmptyLine()
    }
  }
  
  const slowParse = (blob, controller) => {
    enqueue = controller.enqueue
    chunk = blob
    cursor = 0
    row = []
    
    nextDelimiterValue = findNext(delimiterValue)
    nextNewlineValue = findNext(newlineValue)
    // flush
    if (nextNewlineValue < 0) nextNewlineValue = chunk.length
    
    checkForEmptyLine()
    while (true) {
      //console.log({ rowCount, cursor, nextDelimiterValue, nextNewlineChar, row })

      if (chunk[cursor] === quoteChar) {
        let nextQuoteChar = cursor

        cursor += 1
        while (true) {
          nextQuoteChar = findNext(quoteChar, nextQuoteChar + quoteCharLength)
          
          if (quoteChar === escapeChar && chunk[nextQuoteChar + quoteCharLength] === quoteChar) {
            nextQuoteChar += quoteCharLength
            continue
          }
          if (quoteChar !== escapeChar && chunk[nextQuoteChar - escapeCharLength] === escapeChar) {
            continue
          }

          let err
          if (nextQuoteChar === -1) {
            err = ['QuotedFieldMalformed','Quoted field missing closing quote']
            // TODO have bump to next line
          }

          addFieldToRow(parseField(nextQuoteChar).replaceAll(`${escapeChar}${quoteChar}`, `${quoteChar}`))
          
          cursor = nextQuoteChar + quoteCharLength
          nextDelimiterValue = findNext(delimiterValue)
          nextNewlineValue = findNext(newlineValue)

          // Clear extra space after quote - example why this would happen?
//        const nextStop = Math.min(...[nextDelimiterValue, nextNewlineValue].filter(v => (-1 < v)))
//        const spaceText = parseField(nextStop)
//        cursor += (spaceText.trim() === '') ? spaceText.length : 0

          if (cursor === nextDelimiterValue) {
            cursor += delimiterValueLength
            nextDelimiterValue = findNext(delimiterValue)
          } else if (cursor === nextNewlineValue) {
            endOfLine()
          } else if (chunk[cursor] === ' ') {
            err = ['QuotedFieldMalformed','Quoted field contains excess space between closing quote and delimiter/newline']
          }
          break

        }
        continue
      }

      // ...,...\n
      if (-1 < nextDelimiterValue && nextDelimiterValue < nextNewlineValue) {
        addFieldToRow(parseField(nextDelimiterValue))
        cursor = nextDelimiterValue + delimiterValueLength
        nextDelimiterValue = findNext(delimiterValue)
        continue
      }

      if (commentPrefixValue && parseField(cursor + commentPrefixValueLength) === commentPrefixValue) {
        idx += 1
        if (errorOnComment) {
          enqueueError('CommentExists', 'Comment detected.') // comment = parseField(nextNewlineValue)
        }
        cursor = nextNewlineValue + newlineValueLength
        nextDelimiterValue = findNext(delimiterValue)
        nextNewlineValue = findNext(newlineValue)
        continue
      }

      if (nextNewlineValue < 0) {
        partialLine = parseField() // shorthand for chunk.substring(cursor)
        break
      }

      addFieldToRow(parseField(nextNewlineValue))
      endOfLine()
    }
  }

  

  let partialLine = ''
  const previousChunk = () => partialLine

  return { canUseFastMode, fastParse, slowParse, previousChunk }
}
export default parser
  
  
  