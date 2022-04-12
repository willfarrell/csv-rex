<div align="center">
<br/><br/><br/><br/><br/><br/><br/>
🦖
<br/><br/><br/><br/><br/><br/><br/>
<h1>CSV-Rex</h1>
<p>A tiny and fast CSV parser for JavaScript.</p>
<p>Don't let it's small hands fool you ...</p>
</div>


## Features
- Comma-Separated Values (CSV) Files specification compliant ([RFC-4180](https://tools.ietf.org/html/rfc4180))
- Supports: ESM, <TODO more>
- Zero dependencies
- Small bundle size (<?KB)


## Why not use `papaparse` or `csv-parse`?
Both are great libraries, we've use them both in many projects. 

- [`csv-parse`](https://csv.js.org/parse/): Built on to of NodeJS native APIs giving it great stream support. If you wan to run it in the browser however, you've going to have to ship a very large polyfill.
- [`papaparse`](https://www.papaparse.com/): Built to be more friendly for browser with an option to run in node as well. Faster than `csv-parse`, but, it's dadbod and lack of native stream support leaves room for improvement.

The goal with `csv-rex` was to have a csv parser that is as fast as others, reduce bundle size, and have full stream support. We think we've achieved our goal with up to **??% faster** benchmarks, **<?KB** compressed bundle, with an options for manual chunking, Web Stream API, and `node:stream`.


## Setup

```bash
npm install csv-rex
```


```javascript
import parse from 'csv-rex'

const options = {
  onRow = ({data, idx, err) => {
  	// ...
  }
}

await parseStream(input, options)
```

## Options
### Source
- `chunkSize` (`10MB`): Size of chunks to process at once. Should be greater than the size of the 3 largest lines.
- encoding (`utf-8`): `input` charset encoding

### CSV Parse
- `fastMode` (`true`): Option to allow a faster parsing strategy when `quoteChar` is not present in a chunk.
- `header` (`true`): Keys to be used in JSON object for the parsed row
  - `true`: First row of the `input` is the headers and will need to be pulled out
  - `[...]`: Pre-assign headers because `input` contains no headers.
  - `false`: Don't map to JSON, return array of values instead.
- `newlineValue` (`undefined`): What `newline` characters to be used
  - `\n`: Most common value to be used in CSV
  - `\r\n`: Common in Windows generated CSV files
- `delimiterValue` (`,`): Characters used to separate fields
- `quoteChar` (`"`): Character used to wrap fields that need to have special characters within them
- `escapeChar` (`"`): Character used to escape the `quoteChar`.
- `commentPrefixValue` (false): Lines starting with this value will be ignored (i.e. `#`, `//`). Can be set to `false` if files will never have comments.
- `emptyFieldValue` (`<empty string>`): Value to be used instead of an empty string. Can be set to `undefined` to have empty fields not be included.
- `coerceField` (`(field) => field`): Function to apply type/value coercion.
- `onRowParse` (`({data, idx, err}) => {}`): Function to run on parsed row data.

### TODO

- `errorOnEmptyLine` (`false`): When an empty line is encountered. Push row with error when occurs, row ignored otherwise.
- `errorOnComment` (`false`): When a comment is encountered. Push row with error when occurs, row ignored otherwise.
- `errorOnFieldMalformed` (`false`): When no closing `quoteChar` is found. Push row with error when occurs, row ignored otherwise.
- `errorOnFieldsMismatch` (`false`): When number of headers does not match the number of fields in a row. Push row with error when occurs, row ignored otherwise.

## Examples
### Basic parsing of a string
```javascript
import parse from 'csv-rex'

const onRowParse = ({data, idx, err}) => {
  if (err) {
    // handler err
    return
  }
  // handle data
}

export default async (csvString) => {
  const blob = new Blob([csvString], { type: 'text/plain' })
  const options = {onRowParse}
  await parse(blob, options)
}

  
```

## WebWorker using a file
To prevent blocking of the main thread it is recommended that csv parsing is done in a WebWorker, SharedWebWorker, or ServiceWorker instead of the main thread.

```javascript
/* eslint-env worker */
import parse from 'csv-rex'

const onRowParse = ({data, idx, err}) => {
  if (err) {
    // handler err
    return
  }
  // handle data
}

onmessage = async (event) => {
  const { file } = event.data
  const options = {onRowParse}
  await parse(file, options)
  
  postMessageEncode({percent:100})
}

const postMessageEncode = (str) => {
  if (typeof str !== 'string') str = JSON.stringify(str)
  const buffer = new TextEncoder().encode(str).buffer
  postMessage(buffer, [buffer])
}
```


### Browser Web Stream API
Requires: Chrome v71 , Edge v79, Firefox ([not supported yet](https://bugzilla.mozilla.org/show_bug.cgi?id=1493537)), Safari v14.5

```javascript
import { parser } from 'csv-rex'

export default async (blob, opts = {}) => {
  const textDecodeStream = new TextDecoderStream(opts.encoding)
  const writeStream = new WritableStream({
    async write ({data, idx, err}) {
      if (err) {
        // handler err
        return
      }   
      // handle data
    }
  })
  
  return blob.stream()
    .pipeThrough(textDecodeStream)
    .pipeThrough(csvParseStream(opts))
    .pipeTo(writeStream)
    
}

const csvParseStream = (opts) => {
  const { canUseFastMode, fastParse, slowParse, previousChunk } = parser(opts)

  return new TransformStream({
    transform (chunk, controller) {
      chunk = previousChunk() + chunk

      if (canUseFastMode(chunk)) {
        fastParse(chunk, controller)
      } else {
        slowParse(chunk, controller)
      }
    },
    flush (controller) {
      const chunk = previousChunk()
      if (canUseFastMode(chunk)) {
        fastParse(chunk, controller)
      } else {
        slowParse(chunk, controller)
      }
    }
  })
}

```


### NodeJS Web Stream API
Requires: v16.6
```javascript
import { TextDecoderStream, TransformStream, WritableStream } from 'node:stream/web'
import { parser } from 'csv-rex'

export default async (blob, opts = {}) => {
  const textDecodeStream = new TextDecoderStream(opts.encoding)
  const writeStream = new WritableStream({
    async write ({data, idx, err}) {
      if (err) {
        // handler err
        return
      }   
      // handle data
    }
  })
  
  return blob.stream()
    .pipeThrough(textDecodeStream)
    .pipeThrough(csvParseStream(opts))
    .pipeTo(writeStream)
    
}

const csvParseStream = (opts) => {
  const { canUseFastMode, fastParse, slowParse, previousChunk } = parser(opts)

  return new TransformStream({
    transform (chunk, controller) {
      chunk = previousChunk() + chunk

      if (canUseFastMode(chunk)) {
        fastParse(chunk, controller)
      } else {
        slowParse(chunk, controller)
      }
    },
    flush (controller) {
      const chunk = previousChunk()
      if (canUseFastMode(chunk)) {
        fastParse(chunk, controller)
      } else {
        slowParse(chunk, controller)
      }
    }
  })
}
```


### NodeJS Stream
```javascript
import { createReadStream } from 'node:fs'
import { Transform, Writable } from 'node:stream'
import { parser } from 'csv-rex'

export default async (filePath, opts = {}) => {
  const readStream = createReadStream(filePath)
  
  const writeStream = new Writable({
    async write ({data, idx, err}) {
      if (err) {
        // handler err
        return
      }   
      // handle data
    }
  })
  
  return readStream
    //.pipe(textDecodeStream) // TODO
    .pipe(csvParseStream(opts))
    .pipe(writeStream)
    
}

const csvParseStream = (opts) => {
  const { canUseFastMode, fastParse, slowParse, previousChunk } = parser(opts)

  return new Transform({
    transform (chunk, controller) {
      chunk = previousChunk() + chunk

      if (canUseFastMode(chunk)) {
        fastParse(chunk, controller)
      } else {
        slowParse(chunk, controller)
      }
    },
    flush (controller) {
      const chunk = previousChunk()
      if (canUseFastMode(chunk)) {
        fastParse(chunk, controller)
      } else {
        slowParse(chunk, controller)
      }
    }
  })
}

```

### Example coerceField
```javascript


```

## Benchmarks


