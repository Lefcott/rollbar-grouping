# rollbar-grouping
Group multiple messages of one event


### Installation:
```
npm install --save rollbar-grouping
```

### Initialization:
```
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
  eventTimeout: 10000, // Default to 15000 milliseconds
  moduleErrorLogging: true // Default to false
});
```

### Usage Example:

  1)
  ```
  const eventId = rollbar.startEvent();
  rollbar.info('Some info message!').useEvent(eventId);
  rollbar.warn('Some warn message..').useEvent(eventId);
  rollbar.info('Last message').finishEvent(eventId);
  ```
  2)
  ```
  const eventId = rollbar.startEvent();
  rollbar.info('Some info message!').useEvent(eventId);
  rollbar.warn('Some warn message..').useEvent(eventId);
  rollbar.info('Last message').useEvent(eventId);
  rollbar.finishEvent(eventId);
  ```

  // Rollbar Result (warn level (maximum detected)):
  /*
    Hello!
  
    Warn..
  
    Finish
  */
