// import {TextDecoder} from 'node:util'
import {defaultOptions, optionDetectNewlineValue} from './options.js'
import parser from './parser.js'

export default async (input, opts) => {
  const options = { ...defaultOptions, ...opts }
  
  if (process) {
    const {TextDecoder} = await import('node:util')
  }
  

//if (!options.newlineValue) {
//  options.newlineValue = await optionDetectNewlineValue(input, options)
//}
  // TODO source type - detect

  const controller = {
    enqueue: options.onRowParse
  }

//let timestamp = Date.now() - progressInterval - 1
//const sendProgress = (positionInBytes) => {
//  const now = Date.now()
//  if (timestamp + progressInterval < now) {
//    const percent = positionInBytes / totalInBytes
//    options.onProgress({
//      percent,
//      positionInBytes,
//      totalInBytes
//    })
//  }
//}
//
//let positionInBytes = 0
//const totalInBytes = input.size
  const { canUseFastMode, fastParse, slowParse, previousChunk } = parser(options)
  const textDecoder = new TextDecoder(options.encoding)
  while (position !== input.size) {
    //if (onProgress) sendProgress(positionInBytes)
    const chunk = input.slice(position, position + options.chunkSize)
    const buffer = await chunk.arrayBuffer()
    //positionInBytes += buffer.byteLength

    const chunkText = previousChunk() + textDecoder.decode(buffer)
    if (canUseFastMode(chunkText)) {
      fastParse(chunkText, controller)
    } else {
      slowParse(chunkText, controller)
    }
  }
  const chunkText = previousChunk()
  if (canUseFastMode(chunkText)) {
    fastParse(chunkText, controller)
  } else {
    slowParse(chunkText, controller)
  }
}
