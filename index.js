/* eslint-disable global-require */
const Rollbar = require('rollbar');
require('json-circular-stringify');

let eventId = 0; // First will be 1
let logId = 0; // First will be 1
const libId = Symbol('RollbarGrouping');
const logTimeouts = {};
const eventObj = {};
const impacts = { log: 0, debug: 1, info: 2, warn: 3, error: 4, critical: 5 };
/**
 * @param {object} Config - Defines the configuration
 * @param {object} [Config.rollbar] - Rollbar configuration
 * @param {Boolean} [Config.mock=false] - true for simulating rollbar messages. Default to false
 * @param {Number} [Config.eventTimeout=15000] - Time (in milliseconds) to wait for a .finishEvent() calling. Default to 15000
 * @param {Boolean} [Config.moduleErrorLogging=true] - true for making console.error on unexpected error. Default to true
 * @param {Function} [Config.secondLogging] - Function for logging if rollbar is not present. Default to console.log
 */
const lib = Config => {
  const config = {
    mock: false,
    eventTimeout: 15000,
    moduleErrorLogging: true,
    secondLogging: console.log,
    ...Config
  }
  let logToRollbar = !!config.rollbar && !config.mock;

  if (!config.mock && !config.rollbar) {
    logToRollbar = false;
    console.warn('RollbarGrouping: no rollbar configuration was provided. If you want to skip this warn set Config.mock to true');
  }

  const rollbar = config.rollbar && new Rollbar(config.rollbar) || null;

  const finishEvent = id => {
    if (eventObj[id]) {
      if (eventObj[id].message) {
        if (logToRollbar) {
          rollbar[eventObj[id].currLevel](eventObj[id].message);
        } else {
          config.secondLogging(eventObj[id].message);
        }
      }
      clearTimeout(eventObj[id].timeoutId);
      delete eventObj[id];
      return true;
    } else {
      return false;
    }
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
      /** 
       * Adds a message to an event
       * 
       * Returns true if the message was added
       * 
       * Returns false if the event id does not exist
       * @param {Number} id - The sequential id of the event, obtained from .startEvent()
       * @returns {Boolean}
      */
      useEvent: id => {
        if (!eventObj[id]) {
          const errorToLog = `\n${new Error(`Rollbar event id ${id} does not exist!`).stack.split('\n').slice(0, 4).join('\n')}`;
          config.moduleErrorLogging && console.error(errorToLog);
          rollbar.error(errorToLog);
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
        return true;
      },
      /** 
       * Finishes a previously started event by id
       * 
       * Returns true if the event exists and was deleted
       * 
       * Returns false if the event does not exist
       * @param {Number} id - The sequential id of the event, obtained from .startEvent()
       * @returns {Boolean}
      */
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
  /** @type {import('rollbar')} */
  return {
    /** Rollbar error handler middlware */
    errorHandler: rollbar.errorHandler,
    /** Rollbar critical level! */
    critical: logBase('critical'),
    /** Rollbar error level */
    error: logBase('error'),
    /** Rollbar warn level */
    warn: logBase('warn'),
    /** Rollbar info level */
    info: logBase('info'),
    /** Rollbar debug level */
    debug: logBase('debug'),
    /** Rollbar log level */
    log: logBase('log'),
    /** 
     * Starts an event and returns the id
     * @returns {Number}
    */
    startEvent: () => {
      eventId += 1;
      const currEventId = eventId;
      eventObj[currEventId] = {
        message: '',
        currLevel: 'log',
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
    /** 
     * Finishes a previously started event by id
     * 
     * Returns true if the event exists and was deleted
     * 
     * Returns false if the event does not exist
     * @param {Number} id - The sequential id of the event, obtained from .startEvent()
     * @returns {Boolean}
    */
    finishEvent: id => finishEvent(id),
    /**Id of this library.
     * 
     * It's util for comparing if an object is a rollbarGrouping object
     */
    libId
  };
};

/**
 * Compares if an object is a rollbarGroupingObject using it's id
 * @param {object} obj - Object to compare
 * @param {Symbol} [obj.libId] - Id of rollbar-grouping, its defined
*/
lib.isRollbarGroupingObject = obj => obj && obj.libId === libId || false

module.exports = lib;
