/* eslint-disable global-require */
const Rollbar = require('rollbar');

let eventId = 0; // First will be 1
let logId = 0; // First will be 1
const logTimeouts = {};
const eventObj = {};
const impacts = { info: 0, warn: 1, error: 2 };

module.exports = config => {
  config.moduleErrorLogging = config.moduleErrorLogging || true;

  const rollbar = new Rollbar(config.rollbar);

  const finishEvent = id => {
    if (eventObj[id] && eventObj[id].message) {
      rollbar[eventObj[id].currLevel](eventObj[id].message);
    }
    clearTimeout(eventObj[id].timeoutId);
    delete eventObj[id];
  };
  const logBase = level => (...messages) => {
    logId += 1;
    const currLogId = logId;
    const parsedMsgs = [];
    for (let k = 0; k < messages.length; k += 1) {
      parsedMsgs.push(messages[k] instanceof Object ? JSON.stringify(messages[k], null, 2) : messages[k]);
    }
    const rollbarMessages = parsedMsgs.join(', ');
    logTimeouts[currLogId] = setTimeout(() => {
      rollbar[level](rollbarMessages);
      delete logTimeouts[currLogId];
    }, 50);
    const dotFunctions = {
      useEvent: id => {
        if (!eventObj[id]) {
          config.moduleErrorLogging && console.error(`Rollbar event id ${id} does not exist!`);
          rollbar.error(`Rollbar event id ${id} does not exist!`);
          return false;
        }
        clearTimeout(logTimeouts[currLogId]);
        if (eventObj[id].message !== '') {
          eventObj[id].message += '\n\n';
        }
        eventObj[id].message += parsedMsgs.join(', ');
        if (impacts[level] > impacts[eventObj[id].currLevel]) {
          eventObj[id].currLevel = level;
        }
        finishEvent(id);
        return true;
      },
      finishEvent: id => id // Its a reference for highlighting
    };
    dotFunctions.finishEvent = id => {
      if (!eventObj[id]) {
        return false;
      }
      clearTimeout(logTimeouts[currLogId]);
      if (eventObj[id].message !== '') {
        eventObj[id].message += '\n\n';
      }
      eventObj[id].message += parsedMsgs.join(', ');
      if (impacts[level] > impacts[eventObj[id].currLevel]) {
        eventObj[id].currLevel = level;
      }
      finishEvent(id);
    };
    return dotFunctions;
  };
  return {
    errorHandler: rollbar.errorHandler,
    error: logBase('error', 'red'),
    warn: logBase('warn', 'yellow'),
    info: logBase('info', 'blue'),
    startEvent: () => {
      eventId += 1;
      const currEventId = eventId;
      eventObj[currEventId] = {
        message: '',
        currLevel: 'info',
        finish: () => finishEvent(currEventId)
      };
      const timeout = config.eventTimeout;
      eventObj[currEventId].timeoutId = setTimeout(() => {
        eventObj[currEventId].message += `\n\nFinished event ${currEventId} after a timeout of ${timeout /
          1000} seconds.`;

        eventObj[currEventId].finish();
      }, timeout);
      return eventId;
    },
    finishEvent: id => finishEvent(id)
  };
};

/* 
  External Usage Examples:

  1)
  const eventId = rollbar.startEvent();
  rollbar.info('Hello!').useEvent(eventId);
  rollbar.warn('Warn..').useEvent(eventId);
  rollbar.info('Finish').finishEvent(eventId);

  2)
  const eventId = rollbar.startEvent();
  rollbar.info('Hello!').useEvent(eventId);
  rollbar.warn('Warn..').useEvent(eventId);
  rollbar.info('Finish').useEvent(eventId);
  rollbar.finishEvent(eventId);

  Rollbar Result (warn level (maximum detected)):
  Hello!

  Warn..

  Finish
*/
