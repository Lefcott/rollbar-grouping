# rollbar-grouping
Group multiple messages of one event

Feel free to open new issues [here](https://github.com/lefcott19/rollbar-grouping/issues)!


### Installation:
```
npm install --save rollbar-grouping
```

### Initialization with all available options:
```js
const rollbar = require('rollbar-grouping')({
  rollbar: {
    accessToken: process.env.ROLLBAR_ACCESS_TOKEN,
    captureUncaught: true,
    captureUnhandledRejections: true,
    environment: process.env.NODE_ENV,
    verbose: true,
    itemsPerMinute: 500,
    maxItems: 500000
  },
  mock: false, // true for simulating rollbar messages. Default to false
  eventTimeout: 15000, // Time (in milliseconds) to wait for a .finishEvent() calling. Default to 15000
  moduleErrorLogging: true // true for making console.error on unexpected error. Default to true
  secondLogging: console.log // Function for logging if rollbar is not present. Default to console.log
});
```

### Usage Example:

  1
  ```js
  const eventId = rollbar.startEvent();
  rollbar.info('Some info message!').useEvent(eventId);
  rollbar.warn('Some warn message..').useEvent(eventId);
  rollbar.info('Last message').finishEvent(eventId);
  ```
  2
  ```js
  const eventId = rollbar.startEvent();
  rollbar.info('Some info message!').useEvent(eventId);
  rollbar.warn('Some warn message..').useEvent(eventId);
  rollbar.info('Last message').useEvent(eventId);
  rollbar.finishEvent(eventId);
  ```

#### Rollbar Result (warn level (maximum detected)):
  ```
    Some info message!
  
    Some warn message..
  
    Last message
  ```
