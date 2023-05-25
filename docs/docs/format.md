# format

## Options

- `header` (`true`): Keys to be used in JSON object for the parsed row
  - `true`: Will include header, will use `Object.keys()` for columns
  - `[...]`: What columns to included and in what order
  - `false`: Will exclude a header line.
- `newlineChar` (`\r\n`): What `newline` character(s) to be used.
- `delimiterChar` (`,`): Characters used to separate fields.
- `quoteChar` (`"`): Character used to wrap fields that need to have special characters within them.
- `escapeChar` (`${quoteChar}`): Character used to escape the `quoteChar`.
- `quoteColumn`: (`undefined`): Array that maps to the headers to indicate what columns need to have quotes. Used to improve performance.
  - `true`: Always quote column
  - `false`: Never quote column
  - `undefined`/`null`/``: Detect if quotes are needed based on contents
- `enqueue` (`(string) => {}`): Function to run on formatted row data.
- `enableReturn` (`true`): Will concat rows into a single string. Set to `false` if handing data within enqueue for performance improvements.

### Array chunk
- `header:[...]` required

### Object chunk



## Examples

### Formatting an array of objects to CSV string

```javascript
import { format } from 'csv-rex'

export default (arrayOfObjects) => parse(arrayOfObjects, { newlineChar: '\n' })
```

### NodeJS Stream

```javascript
import { createReadStream } from 'node:fs'
import { pipeline, createReadableStream } from '@datastream/core'
import { csvFormatStream } from '@datastream/csv'

export default async (filePath, opts = {}) => {
  const streams = [
    createReadableStream([
      /*...*/
    ]),
    csvFormatStream(opts)
    // ...
  ]

  const result = await pipeline(streams)
  console.log(result.csvErrors)
}
```

### Web Stream API

Requires: Chrome v71 , Edge v79, Firefox v102, Safari v14.5, NodeJS v18 (v16 with import). If you want to use WebStreams with node you need to pass `--conditions=webstream` in the cli to force its use.

```javascript
import { pipeline } from '@datastream/core'
import { stringReadableStream } from '@datastream/string'
import { csvParseStream } from '@datastream/csv'

export default async (blob, opts = {}) => {
  const streams = [
    stringReadableStream(blob),
    csvParseStream()
    // ...
  ]

  const result = await pipeline(streams)
  console.log(result.csvErrors)
}
```

### WebWorker using a file

To prevent blocking the main thread it is recommended that CSV parsing is done in a WebWorker, SharedWebWorker, or ServiceWorker instead of the main thread. This example doesn't use streams due to the lack of Firefox stream support mentioned above.

```javascript
/* eslint-env worker */
import format from 'csv-rex/format'

const enqueue = ({ data, idx, err }) => {
  if (err) {
    // handler err
    return
  }
  // handle data
}

onmessage = async (event) => {
  const { file } = event.data
  const options = { enqueue }
  file.length = file.size // polyfill length
  await parse(file, options)
  // ...
  postMessageEncode()
}

const postMessageEncode = (str) => {
  if (typeof str !== 'string') str = JSON.stringify(str)
  const buffer = new TextEncoder().encode(str).buffer
  postMessage(buffer, [buffer])
}
```
