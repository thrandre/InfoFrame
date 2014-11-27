/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2011-2012 */

if (typeof ICAL === 'undefined') {
  if (typeof exports === 'object') {
    // CommonJS
    ICAL = exports;
  } else if (typeof window !== 'undefined') {
    // Browser globals
    this.ICAL = {};
  } else {
    // ...?
    ICAL = {};
  }
}

ICAL.foldLength = 75;
ICAL.newLineChar = '\r\n';

/**
 * Helper functions used in various places within ical.js
 */
ICAL.helpers = {
  initState: function initState(aLine, aLineNr) {
    return {
      buffer: aLine,
      line: aLine,
      lineNr: aLineNr,
      character: 0,
      currentData: null,
      parentData: []
    };
  },

  initComponentData: function initComponentData(aName) {
    return {
      name: aName,
      type: "COMPONENT",
      value: []
    };
  },

  /**
   * Checks if the given number is NaN
   */
  isStrictlyNaN: function(number) {
    return typeof(number) === 'number' && isNaN(number);
  },

  /**
   * Parses a string value that is expected to be an
   * integer, when the valid is not an integer throws
   * a decoration error.
   *
   * @param {String} string raw input.
   * @return {Number} integer.
   */
  strictParseInt: function(string) {
    var result = parseInt(string, 10);

    if (ICAL.helpers.isStrictlyNaN(result)) {
      throw new Error(
        'Could not extract integer from "' + string + '"'
      );
    }

    return result;
  },

  /**
   * Creates or returns a class instance
   * of a given type with the initialization
   * data if the data is not already an instance
   * of the given type.
   *
   *
   * Example:
   *
   *    var time = new ICAL.Time(...);
   *    var result = ICAL.helpers.formatClassType(time, ICAL.Time);
   *
   *    (result instanceof ICAL.Time)
   *    // => true
   *
   *    result = ICAL.helpers.formatClassType({}, ICAL.Time);
   *    (result isntanceof ICAL.Time)
   *    // => true
   *
   *
   * @param {Object} data object initialization data.
   * @param {Object} type object type (like ICAL.Time).
   */
  formatClassType: function formatClassType(data, type) {
    if (typeof(data) === 'undefined')
      return undefined;

    if (data instanceof type) {
      return data;
    }
    return new type(data);
  },

  /**
   * Identical to index of but will only match values
   * when they are not preceded by a backslash char \\\
   *
   * @param {String} buffer string value.
   * @param {String} search value.
   * @param {Numeric} pos start position.
   */
  unescapedIndexOf: function(buffer, search, pos) {
    while ((pos = buffer.indexOf(search, pos)) !== -1) {
      if (pos > 0 && buffer[pos - 1] === '\\') {
        pos += 1;
      } else {
        return pos;
      }
    }
    return -1;
  },

  binsearchInsert: function(list, seekVal, cmpfunc) {
    if (!list.length)
      return 0;

    var low = 0, high = list.length - 1,
        mid, cmpval;

    while (low <= high) {
      mid = low + Math.floor((high - low) / 2);
      cmpval = cmpfunc(seekVal, list[mid]);

      if (cmpval < 0)
        high = mid - 1;
      else if (cmpval > 0)
        low = mid + 1;
      else
        break;
    }

    if (cmpval < 0)
      return mid; // insertion is displacing, so use mid outright.
    else if (cmpval > 0)
      return mid + 1;
    else
      return mid;
  },

  dumpn: function() {
    if (!ICAL.debug) {
      return null;
    }

    if (typeof (console) !== 'undefined' && 'log' in console) {
      ICAL.helpers.dumpn = function consoleDumpn(input) {
        return console.log(input);
      }
    } else {
      ICAL.helpers.dumpn = function geckoDumpn(input) {
        dump(input + '\n');
      }
    }

    return ICAL.helpers.dumpn(arguments[0]);
  },

  mixin: function(obj, data) {
    if (data) {
      for (var k in data) {
        obj[k] = data[k];
      }
    }
    return obj;
  },

  isArray: function(o) {
    return o && (o instanceof Array || typeof o == "array");
  },

  clone: function(aSrc, aDeep) {
    if (!aSrc || typeof aSrc != "object") {
      return aSrc;
    } else if (aSrc instanceof Date) {
      return new Date(aSrc.getTime());
    } else if ("clone" in aSrc) {
      return aSrc.clone();
    } else if (ICAL.helpers.isArray(aSrc)) {
      var result = [];
      for (var i = 0; i < aSrc.length; i++) {
        result.push(aDeep ? ICAL.helpers.clone(aSrc[i], true) : aSrc[i]);
      }
      return result;
    } else {
      var result = {};
      for (var name in aSrc) {
        // uses prototype method to allow use of Object.create(null);
        if (Object.prototype.hasOwnProperty.call(aSrc, name)) {
          if (aDeep) {
            result[name] = ICAL.helpers.clone(aSrc[name], true);
          } else {
            result[name] = aSrc[name];
          }
        }
      }
      return result;
    }
  },

  unfoldline: function unfoldline(aState) {
    // Section 3.1
    // if the line ends with a CRLF
    // and the next line starts with a LINEAR WHITESPACE (space, htab, ...)

    // then remove the CRLF and the whitespace to unsplit the line
    var moreLines = true;
    var line = "";

    while (moreLines) {
      moreLines = false;
      var pos = aState.buffer.search(/\r?\n/);
      if (pos > -1) {
        var len = (aState.buffer[pos] == "\r" ? 2 : 1);
        var nextChar = aState.buffer.substr(pos + len, 1);
        if (nextChar.match(/^[ \t]$/)) {
          moreLines = true;
          line += aState.buffer.substr(0, pos);
          aState.buffer = aState.buffer.substr(pos + len + 1);
        } else {
          // We're at the end of the line, copy the found chunk
          line += aState.buffer.substr(0, pos);
          aState.buffer = aState.buffer.substr(pos + len);
        }
      } else {
        line += aState.buffer;
        aState.buffer = "";
      }
    }
    return line;
  },

  foldline: function foldline(aLine) {
    var result = "";
    var line = aLine || "";

    while (line.length) {
      result += ICAL.newLineChar + " " + line.substr(0, ICAL.foldLength);
      line = line.substr(ICAL.foldLength);
    }
    return result.substr(ICAL.newLineChar.length + 1);
  },

  ensureKeyExists: function(obj, key, defvalue) {
    if (!(key in obj)) {
      obj[key] = defvalue;
    }
  },

  hasKey: function(obj, key) {
    return (obj && key in obj && obj[key]);
  },

  pad2: function pad(data) {
    if (typeof(data) !== 'string') {
      // handle fractions.
      if (typeof(data) === 'number') {
        data = parseInt(data);
      }
      data = String(data);
    }

    var len = data.length;

    switch (len) {
      case 0:
        return '00';
      case 1:
        return '0' + data;
      default:
        return data;
    }
  },

  trunc: function trunc(number) {
    return (number < 0 ? Math.ceil(number) : Math.floor(number));
  }
};
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2011-2012 */

(typeof(ICAL) === 'undefined')? ICAL = {} : '';

ICAL.design = (function() {
  'use strict';

  var ICAL_NEWLINE = /\\\\|\\;|\\,|\\[Nn]/g;

  function DecorationError() {
    Error.apply(this, arguments);
  }

  DecorationError.prototype = {
    __proto__: Error.prototype
  };

  function replaceNewlineReplace(string) {
    switch (string) {
      case "\\\\":
        return "\\";
      case "\\;":
        return ";";
      case "\\,":
        return ",";
      case "\\n":
      case "\\N":
        return "\n";
      default:
        return string;
    }
  }

  function replaceNewline(value) {
    // avoid regex when possible.
    if (value.indexOf('\\') === -1) {
      return value;
    }

    return value.replace(ICAL_NEWLINE, replaceNewlineReplace);
  }

  /**
   * Changes the format of the UNTIl part in the RECUR
   * value type. When no UNTIL part is found the original
   * is returned untouched.
   *
   * @param {String} type toICAL or fromICAL.
   * @param {String} aValue the value to check.
   * @return {String} upgraded/original value.
   */
  function recurReplaceUntil(aType, aValue) {
    var idx = aValue.indexOf('UNTIL=');
    if (idx === -1) {
      return aValue;
    }

    idx += 6;

    // everything before the value
    var begin = aValue.substr(0, idx);

    // everything after the value
    var end;

    // current until value
    var until;

    // end of value could be -1 meaning this is the last param.
    var endValueIdx = aValue.indexOf(';', idx);

    if (endValueIdx === -1) {
      end = '';
      until = aValue.substr(idx);
    } else {
      end = aValue.substr(endValueIdx);
      until = aValue.substr(idx, endValueIdx - idx);
    }

    if (until.length > 10) {
      until = design.value['date-time'][aType](until);
    } else {
      until = design.value.date[aType](until);
    }

    return begin + until + end;
  }
  /**
   * Design data used by the parser to decide if data is semantically correct
   */
  var design = {
    DecorationError: DecorationError,

    defaultType: 'text',

    param: {
      // Although the syntax is DQUOTE uri DQUOTE, I don't think we should
      // enfoce anything aside from it being a valid content line.
      // "ALTREP": { ... },

      // CN just wants a param-value
      // "CN": { ... }

      "cutype": {
        values: ["INDIVIDUAL", "GROUP", "RESOURCE", "ROOM", "UNKNOWN"],
        allowXName: true,
        allowIanaToken: true
      },

      "delegated-from": {
        valueType: "cal-address",
        multiValue: ","
      },
      "delegated-to": {
        valueType: "cal-address",
        multiValue: ","
      },
      // "DIR": { ... }, // See ALTREP
      "encoding": {
        values: ["8BIT", "BASE64"]
      },
      // "FMTTYPE": { ... }, // See ALTREP
      "fbtype": {
        values: ["FREE", "BUSY", "BUSY-UNAVAILABLE", "BUSY-TENTATIVE"],
        allowXName: true,
        allowIanaToken: true
      },
      // "LANGUAGE": { ... }, // See ALTREP
      "member": {
        valueType: "cal-address",
        multiValue: ","
      },
      "partstat": {
        // TODO These values are actually different per-component
        values: ["NEEDS-ACTION", "ACCEPTED", "DECLINED", "TENTATIVE",
                 "DELEGATED", "COMPLETED", "IN-PROCESS"],
        allowXName: true,
        allowIanaToken: true
      },
      "range": {
        values: ["THISLANDFUTURE"]
      },
      "related": {
        values: ["START", "END"]
      },
      "reltype": {
        values: ["PARENT", "CHILD", "SIBLING"],
        allowXName: true,
        allowIanaToken: true
      },
      "role": {
        values: ["REQ-PARTICIPANT", "CHAIR",
                 "OPT-PARTICIPANT", "NON-PARTICIPANT"],
        allowXName: true,
        allowIanaToken: true
      },
      "rsvp": {
        valueType: "boolean"
      },
      "sent-by": {
        valueType: "cal-address"
      },
      "tzid": {
        matches: /^\//
      },
      "value": {
        // since the value here is a 'type' lowercase is used.
        values: ["binary", "boolean", "cal-address", "date", "date-time",
                 "duration", "float", "integer", "period", "recur", "text",
                 "time", "uri", "utc-offset"],
        allowXName: true,
        allowIanaToken: true
      }
    },

    // When adding a value here, be sure to add it to the parameter types!
    value: {

      "binary": {
        decorate: function(aString) {
          return ICAL.Binary.fromString(aString);
        },

        undecorate: function(aBinary) {
          return aBinary.toString();
        }
      },
      "boolean": {
        values: ["TRUE", "FALSE"],

        fromICAL: function(aValue) {
          switch(aValue) {
            case 'TRUE':
              return true;
            case 'FALSE':
              return false;
            default:
              //TODO: parser warning
              return false;
          }
        },

        toICAL: function(aValue) {
          if (aValue) {
            return 'TRUE';
          }
          return 'FALSE';
        }

      },
      "cal-address": {
        // needs to be an uri
      },
      "date": {
        decorate: function(aValue, aProp) {
          return ICAL.Time.fromDateString(aValue, aProp);
        },

        /**
         * undecorates a time object.
         */
        undecorate: function(aValue) {
          return aValue.toString();
        },

        fromICAL: function(aValue) {
          // from: 20120901
          // to: 2012-09-01
          var result = aValue.substr(0, 4) + '-' +
                       aValue.substr(4, 2) + '-' +
                       aValue.substr(6, 2);

          if (aValue[8] === 'Z') {
            result += 'Z';
          }

          return result;
        },

        toICAL: function(aValue) {
          // from: 2012-09-01
          // to: 20120901

          if (aValue.length > 11) {
            //TODO: serialize warning?
            return aValue;
          }

          var result = aValue.substr(0, 4) +
                       aValue.substr(5, 2) +
                       aValue.substr(8, 2);

          if (aValue[10] === 'Z') {
            result += 'Z';
          }

          return result;
        }
      },
      "date-time": {
        fromICAL: function(aValue) {
          // from: 20120901T130000
          // to: 2012-09-01T13:00:00
          var result = aValue.substr(0, 4) + '-' +
                       aValue.substr(4, 2) + '-' +
                       aValue.substr(6, 2) + 'T' +
                       aValue.substr(9, 2) + ':' +
                       aValue.substr(11, 2) + ':' +
                       aValue.substr(13, 2);

          if (aValue[15] === 'Z') {
            result += 'Z'
          }

          return result;
        },

        toICAL: function(aValue) {
          // from: 2012-09-01T13:00:00
          // to: 20120901T130000

          if (aValue.length < 19) {
            // TODO: error
            return aValue;
          }

          var result = aValue.substr(0, 4) +
                       aValue.substr(5, 2) +
                       // grab the (DDTHH) segment
                       aValue.substr(8, 5) +
                       // MM
                       aValue.substr(14, 2) +
                       // SS
                       aValue.substr(17, 2);

          if (aValue[19] === 'Z') {
            result += 'Z';
          }

          return result;
        },

        decorate: function(aValue, aProp) {
          return ICAL.Time.fromDateTimeString(aValue, aProp);
        },

        undecorate: function(aValue) {
          return aValue.toString();
        }
      },
      duration: {
        decorate: function(aValue) {
          return ICAL.Duration.fromString(aValue);
        },
        undecorate: function(aValue) {
          return aValue.toString();
        }
      },
      float: {
        matches: /^[+-]?\d+\.\d+$/,
        decorate: function(aValue) {
          return ICAL.Value.fromString(aValue, "float");
        },

        fromICAL: function(aValue) {
          var parsed = parseFloat(aValue);
          if (ICAL.helpers.isStrictlyNaN(parsed)) {
            // TODO: parser warning
            return 0.0;
          }
          return parsed;
        },

        toICAL: function(aValue) {
          return String(aValue);
        }
      },
      integer: {
        fromICAL: function(aValue) {
          var parsed = parseInt(aValue);
          if (ICAL.helpers.isStrictlyNaN(parsed)) {
            return 0;
          }
          return parsed;
        },

        toICAL: function(aValue) {
          return String(aValue);
        }
      },
      period: {

        fromICAL: function(string) {
          var parts = string.split('/');
          var result = design.value['date-time'].fromICAL(parts[0]) + '/';

          if (ICAL.Duration.isValueString(parts[1])) {
            result += parts[1];
          } else {
            result += design.value['date-time'].fromICAL(parts[1]);
          }

          return result;
        },

        toICAL: function(string) {
          var parts = string.split('/');
          var result = design.value['date-time'].toICAL(parts[0]) + '/';

          if (ICAL.Duration.isValueString(parts[1])) {
            result += parts[1];
          } else {
            result += design.value['date-time'].toICAL(parts[1]);
          }

          return result;
        },

        decorate: function(aValue, aProp) {
          return ICAL.Period.fromString(aValue, aProp);
        },

        undecorate: function(aValue) {
          return aValue.toString();
        }
      },
      recur: {
        fromICAL: recurReplaceUntil.bind(this, 'fromICAL'),
        toICAL: recurReplaceUntil.bind(this, 'toICAL'),

        decorate: function decorate(aValue) {
          return ICAL.Recur.fromString(aValue);
        },

        undecorate: function(aRecur) {
          return aRecur.toString();
        }
      },

      text: {
        matches: /.*/,

        fromICAL: function(aValue, aName) {
          return replaceNewline(aValue);
        },

        toICAL: function escape(aValue, aName) {
          return aValue.replace(/\\|;|,|\n/g, function(str) {
            switch (str) {
            case "\\":
              return "\\\\";
            case ";":
              return "\\;";
            case ",":
              return "\\,";
            case "\n":
              return "\\n";
            default:
              return str;
            }
          });
        }
      },

      time: {
        fromICAL: function(aValue) {
          // from: MMHHSS(Z)?
          // to: HH:MM:SS(Z)?
          if (aValue.length < 6) {
            // TODO: parser exception?
            return aValue;
          }

          // HH::MM::SSZ?
          var result = aValue.substr(0, 2) + ':' +
                       aValue.substr(2, 2) + ':' +
                       aValue.substr(4, 2);

          if (aValue[6] === 'Z') {
            result += 'Z';
          }

          return result;
        },

        toICAL: function(aValue) {
          // from: HH:MM:SS(Z)?
          // to: MMHHSS(Z)?
          if (aValue.length < 8) {
            //TODO: error
            return aValue;
          }

          var result = aValue.substr(0, 2) +
                       aValue.substr(3, 2) +
                       aValue.substr(6, 2);

          if (aValue[8] === 'Z') {
            result += 'Z';
          }

          return result;
        }
      },

      uri: {
        // TODO
        /* ... */
      },

      "utc-offset": {
        toICAL: function(aValue) {
          if (aValue.length < 7) {
            // no seconds
            // -0500
            return aValue.substr(0, 3) +
                   aValue.substr(4, 2);
          } else {
            // seconds
            // -050000
            return aValue.substr(0, 3) +
                   aValue.substr(4, 2) +
                   aValue.substr(7, 2);
          }
        },

        fromICAL: function(aValue) {
          if (aValue.length < 6) {
            // no seconds
            // -05:00
            return aValue.substr(0, 3) + ':' +
                   aValue.substr(3, 2);
          } else {
            // seconds
            // -05:00:00
            return aValue.substr(0, 3) + ':' +
                   aValue.substr(3, 2) + ':' +
                   aValue.substr(5, 2);
          }
        },

        decorate: function(aValue) {
          return ICAL.UtcOffset.fromString(aValue);
        },

        undecorate: function(aValue) {
          return aValue.toString();
        }
      }
    },

    property: {
      decorate: function decorate(aData, aParent) {
        return new ICAL.Property(aData, aParent);
      },
      "attach": {
        defaultType: "uri"
      },
      "attendee": {
        defaultType: "cal-address"
      },
      "categories": {
        defaultType: "text",
        multiValue: ","
      },
      "completed": {
        defaultType: "date-time"
      },
      "created": {
        defaultType: "date-time"
      },
      "dtend": {
        defaultType: "date-time",
        allowedTypes: ["date-time", "date"]
      },
      "dtstamp": {
        defaultType: "date-time"
      },
      "dtstart": {
        defaultType: "date-time",
        allowedTypes: ["date-time", "date"]
      },
      "due": {
        defaultType: "date-time",
        allowedTypes: ["date-time", "date"]
      },
      "duration": {
        defaultType: "duration"
      },
      "exdate": {
        defaultType: "date-time",
        allowedTypes: ["date-time", "date"],
        multiValue: ','
      },
      "exrule": {
        defaultType: "recur"
      },
      "freebusy": {
        defaultType: "period",
        multiValue: ","
      },
      "geo": {
        defaultType: "float",
        multiValue: ";"
      },
      /* TODO exactly 2 values */"last-modified": {
        defaultType: "date-time"
      },
      "organizer": {
        defaultType: "cal-address"
      },
      "percent-complete": {
        defaultType: "integer"
      },
      "repeat": {
        defaultType: "integer"
      },
      "rdate": {
        defaultType: "date-time",
        allowedTypes: ["date-time", "date", "period"],
        multiValue: ',',
        detectType: function(string) {
          if (string.indexOf('/') !== -1) {
            return 'period';
          }
          return (string.indexOf('T') === -1) ? 'date' : 'date-time';
        }
      },
      "recurrence-id": {
        defaultType: "date-time",
        allowedTypes: ["date-time", "date"]
      },
      "resources": {
        defaultType: "text",
        multiValue: ","
      },
      "request-status": {
        defaultType: "text",
        multiValue: ";"
      },
      "priority": {
        defaultType: "integer"
      },
      "rrule": {
        defaultType: "recur"
      },
      "sequence": {
        defaultType: "integer"
      },
      "trigger": {
        defaultType: "duration",
        allowedTypes: ["duration", "date-time"]
      },
      "tzoffsetfrom": {
        defaultType: "utc-offset"
      },
      "tzoffsetto": {
        defaultType: "utc-offset"
      },
      "tzurl": {
        defaultType: "uri"
      },
      "url": {
        defaultType: "uri"
      }
    },

    component: {
      decorate: function decorate(aData, aParent) {
        return new ICAL.Component(aData, aParent);
      },
      "vevent": {}
    }

  };

  return design;
}());
ICAL.stringify = (function() {
  'use strict';

  var LINE_ENDING = '\r\n';
  var DEFAULT_TYPE = 'text';

  var design = ICAL.design;
  var helpers = ICAL.helpers;

  /**
   * Convert a full jCal Array into a ical document.
   *
   * @param {Array} jCal document.
   * @return {String} ical document.
   */
  function stringify(jCal) {
    if (!jCal[0] || jCal[0] !== 'icalendar') {
      throw new Error('must provide full jCal document');
    }

    // 1 because we skip the initial element.
    var i = 1;
    var len = jCal.length;
    var result = '';

    for (; i < len; i++) {
      result += stringify.component(jCal[i]) + LINE_ENDING;
    }

    return result;
  }

  /**
   * Converts an jCal component array into a ICAL string.
   * Recursive will resolve sub-components.
   *
   * Exact component/property order is not saved all
   * properties will come before subcomponents.
   *
   * @param {Array} component jCal fragment of a component.
   */
  stringify.component = function(component) {
    var name = component[0].toUpperCase();
    var result = 'BEGIN:' + name + LINE_ENDING;

    var props = component[1];
    var propIdx = 0;
    var propLen = props.length;

    for (; propIdx < propLen; propIdx++) {
      result += stringify.property(props[propIdx]) + LINE_ENDING;
    }

    var comps = component[2];
    var compIdx = 0;
    var compLen = comps.length;

    for (; compIdx < compLen; compIdx++) {
      result += stringify.component(comps[compIdx]) + LINE_ENDING;
    }

    result += 'END:' + name;
    return result;
  }

  /**
   * Converts a single property to a ICAL string.
   *
   * @param {Array} property jCal property.
   */
  stringify.property = function(property) {
    var name = property[0].toUpperCase();
    var jsName = property[0];
    var params = property[1];

    var line = name;

    var paramName;
    for (paramName in params) {
      if (params.hasOwnProperty(paramName)) {
        line += ';' + paramName.toUpperCase();
        line += '=' + stringify.propertyValue(params[paramName]);
      }
    }

    // there is no value so return.
    if (property.length === 3) {
      // if no params where inserted and no value
      // we given we must add a blank value.
      if (!paramName) {
        line += ':';
      }
      return line;
    }

    var valueType = property[2];

    var propDetails;
    var multiValue = false;
    var isDefault = false;

    if (jsName in design.property) {
      propDetails = design.property[jsName];

      if ('multiValue' in propDetails) {
        multiValue = propDetails.multiValue;
      }

      if ('defaultType' in propDetails) {
        if (valueType === propDetails.defaultType) {
          isDefault = true;
        }
      } else {
        if (valueType === DEFAULT_TYPE) {
          isDefault = true;
        }
      }
    } else {
      if (valueType === DEFAULT_TYPE) {
        isDefault = true;
      }
    }

    // push the VALUE property if type is not the default
    // for the current property.
    if (!isDefault) {
      // value will never contain ;/:/, so we don't escape it here.
      line += ';VALUE=' + valueType.toUpperCase();
    }

    line += ':';

    if (multiValue) {
      line += stringify.multiValue(
        property.slice(3), multiValue, valueType
      );
    } else {
      line += stringify.value(property[3], valueType);
    }

    return ICAL.helpers.foldline(line);
  }

  /**
   * Handles escaping of property values that may contain:
   *
   *    COLON (:), SEMICOLON (;), or COMMA (,)
   *
   * If any of the above are present the result is wrapped
   * in double quotes.
   *
   * @param {String} value raw value.
   * @return {String} given or escaped value when needed.
   */
  stringify.propertyValue = function(value) {

    if ((helpers.unescapedIndexOf(value, ',') === -1) &&
        (helpers.unescapedIndexOf(value, ':') === -1) &&
        (helpers.unescapedIndexOf(value, ';') === -1)) {

      return value;
    }

    return '"' + value + '"';
  }

  /**
   * Converts an array of ical values into a single
   * string based on a type and a delimiter value (like ",").
   *
   * @param {Array} values list of values to convert.
   * @param {String} delim used to join the values usually (",", ";", ":").
   * @param {String} type lowecase ical value type
   *  (like boolean, date-time, etc..).
   *
   * @return {String} ical string for value.
   */
  stringify.multiValue = function(values, delim, type) {
    var result = '';
    var len = values.length;
    var i = 0;

    for (; i < len; i++) {
      result += stringify.value(values[i], type);
      if (i !== (len - 1)) {
        result += delim;
      }
    }

    return result;
  }

  /**
   * Processes a single ical value runs the associated "toICAL"
   * method from the design value type if available to convert
   * the value.
   *
   * @param {String|Numeric} value some formatted value.
   * @param {String} type lowecase ical value type
   *  (like boolean, date-time, etc..).
   * @return {String} ical value for single value.
   */
  stringify.value = function(value, type) {
    if (type in design.value && 'toICAL' in design.value[type]) {
      return design.value[type].toICAL(value);
    }
    return value;
  }

  return stringify;

}());

ICAL.parse = (function() {
  'use strict';

  var CHAR = /[^ \t]/;
  var MULTIVALUE_DELIMITER = ',';
  var VALUE_DELIMITER = ':';
  var PARAM_DELIMITER = ';';
  var PARAM_NAME_DELIMITER = '=';
  var DEFAULT_TYPE = 'text';

  var design = ICAL.design;
  var helpers = ICAL.helpers;

  function ParserError(message) {
    this.message = message;

    try {
      throw new Error();
    } catch (e) {
      var split = e.stack.split('\n');
      split.shift();
      this.stack = split.join('\n');
    }
  }

  ParserError.prototype = {
    __proto__: Error.prototype
  };

  function parser(input) {
    var state = {};
    var root = state.component = [
      'icalendar'
    ];

    state.stack = [root];

    parser._eachLine(input, function(err, line) {
      parser._handleContentLine(line, state);
    });


    // when there are still items on the stack
    // throw a fatal error, a component was not closed
    // correctly in that case.
    if (state.stack.length > 1) {
      throw new ParserError(
        'invalid ical body. component began but did not end'
      );
    }

    state = null;

    return root;
  }

  // classes & constants
  parser.ParserError = ParserError;

  parser._formatName = function(name) {
    return name.toLowerCase();
  }

  parser._handleContentLine = function(line, state) {
    // break up the parts of the line
    var valuePos = line.indexOf(VALUE_DELIMITER);
    var paramPos = line.indexOf(PARAM_DELIMITER);

    var lastParamIndex;
    var lastValuePos;

    // name of property or begin/end
    var name;
    var value;
    // params is only overridden if paramPos !== -1.
    // we can't do params = params || {} later on
    // because it sacrifices ops.
    var params = {};

    /**
     * Different property cases
     *
     *
     * 1. RRULE:FREQ=foo
     *    // FREQ= is not a param but the value
     *
     * 2. ATTENDEE;ROLE=REQ-PARTICIPANT;
     *    // ROLE= is a param because : has not happened yet
     */
      // when the parameter delimiter is after the
      // value delimiter then its not a parameter.

    if ((paramPos !== -1 && valuePos !== -1)) {
      // when the parameter delimiter is after the
      // value delimiter then its not a parameter.
      if (paramPos > valuePos) {
        paramPos = -1;
      }
    }

    var parsedParams;
    if (paramPos !== -1) {
      name = line.substring(0, paramPos).toLowerCase();
      parsedParams = parser._parseParameters(line.substring(paramPos), 0);
      params = parsedParams[0];
      lastParamIndex = parsedParams[1].length + parsedParams[2] + paramPos;
      if ((lastValuePos =
        line.substring(lastParamIndex).indexOf(VALUE_DELIMITER)) !== -1) {
        value = line.substring(lastParamIndex + lastValuePos + 1);
      }
    } else if (valuePos !== -1) {
      // without parmeters (BEGIN:VCAENDAR, CLASS:PUBLIC)
      name = line.substring(0, valuePos).toLowerCase();
      value = line.substring(valuePos + 1);

      if (name === 'begin') {
        var newComponent = [value.toLowerCase(), [], []];
        if (state.stack.length === 1) {
          state.component.push(newComponent);
        } else {
          state.component[2].push(newComponent);
        }
        state.stack.push(state.component);
        state.component = newComponent;
        return;
      } else if (name === 'end') {
        state.component = state.stack.pop();
        return;
      }
    } else {
      /**
       * Invalid line.
       * The rational to throw an error is we will
       * never be certain that the rest of the file
       * is sane and its unlikely that we can serialize
       * the result correctly either.
       */
      throw new ParserError(
        'invalid line (no token ";" or ":") "' + line + '"'
      );
    }

    var valueType;
    var multiValue = false;
    var propertyDetails;

    if (name in design.property) {
      propertyDetails = design.property[name];

      if ('multiValue' in propertyDetails) {
        multiValue = propertyDetails.multiValue;
      }

      if (value && 'detectType' in propertyDetails) {
        valueType = propertyDetails.detectType(value);
      }
    }

    // attempt to determine value
    if (!valueType) {
      if (!('value' in params)) {
        if (propertyDetails) {
          valueType = propertyDetails.defaultType;
        } else {
          valueType = DEFAULT_TYPE;
        }
      } else {
        // possible to avoid this?
        valueType = params.value.toLowerCase();
      }
    }

    delete params.value;

    /**
     * Note on `var result` juggling:
     *
     * I observed that building the array in pieces has adverse
     * effects on performance, so where possible we inline the creation.
     * Its a little ugly but resulted in ~2000 additional ops/sec.
     */

    if (value) {
      if (multiValue) {
        var result = [name, params, valueType];
        parser._parseMultiValue(value, multiValue, valueType, result);
      } else {
        value = parser._parseValue(value, valueType);
        var result = [name, params, valueType, value];
      }
    } else {
      var result = [name, params, valueType];
    }

    state.component[1].push(result);
  };

  /**
   * @param {String} value original value.
   * @param {String} type type of value.
   * @return {Object} varies on type.
   */
  parser._parseValue = function(value, type) {
    if (type in design.value && 'fromICAL' in design.value[type]) {
      return design.value[type].fromICAL(value);
    }
    return value;
  };

  /**
   * Parse parameters from a string to object.
   *
   * @param {String} line a single unfolded line.
   * @param {Numeric} start position to start looking for properties.
   * @param {Numeric} maxPos position at which values start.
   * @return {Object} key/value pairs.
   */
  parser._parseParameters = function(line, start) {
    var lastParam = start;
    var pos = 0;
    var delim = PARAM_NAME_DELIMITER;
    var result = {};
    var name;
    var value;
    var type;

    // find the next '=' sign
    // use lastParam and pos to find name
    // check if " is used if so get value from "->"
    // then increment pos to find next ;

    while ((pos !== false) &&
           (pos = helpers.unescapedIndexOf(line, delim, pos + 1)) !== -1) {

      name = line.substr(lastParam + 1, pos - lastParam - 1);

      var nextChar = line[pos + 1];
      if (nextChar === '"') {
        var valuePos = pos + 2;
        pos = helpers.unescapedIndexOf(line, '"', valuePos);
        value = line.substr(valuePos, pos - valuePos);
        lastParam = helpers.unescapedIndexOf(line, PARAM_DELIMITER, pos);
      } else {
        var valuePos = pos + 1;

        // move to next ";"
        var nextPos = helpers.unescapedIndexOf(line, PARAM_DELIMITER, valuePos);
        if (nextPos === -1) {
          // when there is no ";" attempt to locate ":"
          nextPos = helpers.unescapedIndexOf(line, VALUE_DELIMITER, valuePos);

          if (nextPos === -1) {
            nextPos = line.length;
          }
          pos = false;
        } else {
          lastParam = nextPos;
        }

        value = line.substr(valuePos, nextPos - valuePos);
      }

      if (name in design.param && design.param[name].valueType) {
        type = design.param[name].valueType;
      } else {
        type = DEFAULT_TYPE;
      }

      result[name.toLowerCase()] = parser._parseValue(value, type);
    }
    return [result, value, valuePos];
  }

  /**
   * Parse a multi value string
   */
  parser._parseMultiValue = function(buffer, delim, type, result) {
    var pos = 0;
    var lastPos = 0;

    // split each piece
    while ((pos = helpers.unescapedIndexOf(buffer, delim, lastPos)) !== -1) {
      var value = buffer.substr(lastPos, pos - lastPos);
      result.push(parser._parseValue(value, type));
      lastPos = pos + 1;
    }

    // on the last piece take the rest of string
    result.push(
      parser._parseValue(buffer.substr(lastPos), type)
    );

    return result;
  }

  parser._eachLine = function(buffer, callback) {
    var len = buffer.length;
    var lastPos = buffer.search(CHAR);
    var pos = lastPos;
    var line;
    var firstChar;

    var newlineOffset;

    do {
      pos = buffer.indexOf('\n', lastPos) + 1;

      if (buffer[pos - 2] === '\r') {
        newlineOffset = 2;
      } else {
        newlineOffset = 1;
      }

      if (pos === 0) {
        pos = len;
        newlineOffset = 0;
      }

      firstChar = buffer[lastPos];

      if (firstChar === ' ' || firstChar === '\t') {
        // add to line
        line += buffer.substr(
          lastPos + 1,
          pos - lastPos - (newlineOffset + 1)
        );
      } else {
        if (line)
          callback(null, line);
        // push line
        line = buffer.substr(
          lastPos,
          pos - lastPos - newlineOffset
        );
      }

      lastPos = pos;
    } while (pos !== len);

    // extra ending line
    line = line.trim();

    if (line.length)
      callback(null, line);
  }

  return parser;

}());
ICAL.Component = (function() {
  'use strict';

  var PROPERTY_INDEX = 1;
  var COMPONENT_INDEX = 2;
  var NAME_INDEX = 0;

  /**
   * Create a wrapper for a jCal component.
   *
   * @param {Array|String} jCal
   *  raw jCal component data OR name of new component.
   * @param {ICAL.Component} parent parent component to associate.
   */
  function Component(jCal, parent) {
    if (typeof(jCal) === 'string') {
      // jCal spec (name, properties, components)
      jCal = [jCal, [], []];
    }

    // mostly for legacy reasons.
    this.jCal = jCal;

    this.parent = parent || null;
  }

  Component.prototype = {
    /**
     * Hydrated properties are inserted into the _properties array at the same
     * position as in the jCal array, so its possible the array contains
     * undefined values for unhydrdated properties. To avoid iterating the
     * array when checking if all properties have been hydrated, we save the
     * count here.
     */
    _hydratedPropertyCount: 0,

    /**
     * The same count as for _hydratedPropertyCount, but for subcomponents
     */
    _hydratedComponentCount: 0,

    get name() {
      return this.jCal[NAME_INDEX];
    },

    _hydrateComponent: function(index) {
      if (!this._components) {
        this._components = [];
        this._hydratedComponentCount = 0;
      }

      if (this._components[index]) {
        return this._components[index];
      }

      var comp = new Component(
        this.jCal[COMPONENT_INDEX][index],
        this
      );

      this._hydratedComponentCount++;
      return this._components[index] = comp;
    },

    _hydrateProperty: function(index) {
      if (!this._properties) {
        this._properties = [];
        this._hydratedPropertyCount = 0;
      }

      if (this._properties[index]) {
        return this._properties[index];
      }

      var prop = new ICAL.Property(
        this.jCal[PROPERTY_INDEX][index],
        this
      );

      this._hydratedPropertyCount++;
      return this._properties[index] = prop;
    },

    /**
     * Finds first sub component, optionally filtered by name.
     *
     * @method getFirstSubcomponent
     * @param {String} [name] optional name to filter by.
     */
    getFirstSubcomponent: function(name) {
      if (name) {
        var i = 0;
        var comps = this.jCal[COMPONENT_INDEX];
        var len = comps.length;

        for (; i < len; i++) {
          if (comps[i][NAME_INDEX] === name) {
            var result = this._hydrateComponent(i);
            return result;
          }
        }
      } else {
        if (this.jCal[COMPONENT_INDEX].length) {
          return this._hydrateComponent(0);
        }
      }

      // ensure we return a value (strict mode)
      return null;
    },

    /**
     * Finds all sub components, optionally filtering by name.
     *
     * @method getAllSubcomponents
     * @param {String} [name] optional name to filter by.
     */
    getAllSubcomponents: function(name) {
      var jCalLen = this.jCal[COMPONENT_INDEX].length;

      if (name) {
        var comps = this.jCal[COMPONENT_INDEX];
        var result = [];
        var i = 0;

        for (; i < jCalLen; i++) {
          if (name === comps[i][NAME_INDEX]) {
            result.push(
              this._hydrateComponent(i)
            );
          }
        }
        return result;
      } else {
        if (!this._components ||
            (this._hydratedComponentCount !== jCalLen)) {
          var i = 0;
          for (; i < jCalLen; i++) {
            this._hydrateComponent(i);
          }
        }

        return this._components;
      }
    },

    /**
     * Returns true when a named property exists.
     *
     * @param {String} name property name.
     * @return {Boolean} true when property is found.
     */
    hasProperty: function(name) {
      var props = this.jCal[PROPERTY_INDEX];
      var len = props.length;

      var i = 0;
      for (; i < len; i++) {
        // 0 is property name
        if (props[i][NAME_INDEX] === name) {
          return true;
        }
      }

      return false;
    },

    /**
     * Finds first property.
     *
     * @param {String} [name] lowercase name of property.
     * @return {ICAL.Property} found property.
     */
    getFirstProperty: function(name) {
      if (name) {
        var i = 0;
        var props = this.jCal[PROPERTY_INDEX];
        var len = props.length;

        for (; i < len; i++) {
          if (props[i][NAME_INDEX] === name) {
            var result = this._hydrateProperty(i);
            return result;
          }
        }
      } else {
        if (this.jCal[PROPERTY_INDEX].length) {
          return this._hydrateProperty(0);
        }
      }

      return null;
    },

    /**
     * Returns first properties value if available.
     *
     * @param {String} [name] (lowecase) property name.
     * @return {String} property value.
     */
    getFirstPropertyValue: function(name) {
      var prop = this.getFirstProperty(name);
      if (prop) {
        return prop.getFirstValue();
      }

      return null;
    },

    /**
     * get all properties in the component.
     *
     * @param {String} [name] (lowercase) property name.
     * @return {Array[ICAL.Property]} list of properties.
     */
    getAllProperties: function(name) {
      var jCalLen = this.jCal[PROPERTY_INDEX].length;

      if (name) {
        var props = this.jCal[PROPERTY_INDEX];
        var result = [];
        var i = 0;

        for (; i < jCalLen; i++) {
          if (name === props[i][NAME_INDEX]) {
            result.push(
              this._hydrateProperty(i)
            );
          }
        }
        return result;
      } else {
        if (!this._properties ||
            (this._hydratedPropertyCount !== jCalLen)) {
          var i = 0;
          for (; i < jCalLen; i++) {
            this._hydrateProperty(i);
          }
        }

        return this._properties;
      }

      return null;
    },

    _removeObjectByIndex: function(jCalIndex, cache, index) {
      // remove cached version
      if (cache && cache[index]) {
        var obj = cache[index];
        if ("parent" in obj) {
            obj.parent = null;
        }
        cache.splice(index, 1);
      }

      // remove it from the jCal
      this.jCal[jCalIndex].splice(index, 1);
    },

    _removeObject: function(jCalIndex, cache, nameOrObject) {
      var i = 0;
      var objects = this.jCal[jCalIndex];
      var len = objects.length;
      var cached = this[cache];

      if (typeof(nameOrObject) === 'string') {
        for (; i < len; i++) {
          if (objects[i][NAME_INDEX] === nameOrObject) {
            this._removeObjectByIndex(jCalIndex, cached, i);
            return true;
          }
        }
      } else if (cached) {
        for (; i < len; i++) {
          if (cached[i] && cached[i] === nameOrObject) {
            this._removeObjectByIndex(jCalIndex, cached, i);
            return true;
          }
        }
      }

      return false;
    },

    _removeAllObjects: function(jCalIndex, cache, name) {
      var cached = this[cache];

      // Unfortunately we have to run through all children to reset their
      // parent property.
      var objects = this.jCal[jCalIndex];
      var i = objects.length - 1;

      // descending search required because splice
      // is used and will effect the indices.
      for (; i >= 0; i--) {
        if (!name || objects[i][NAME_INDEX] === name) {
          this._removeObjectByIndex(jCalIndex, cached, i);
        }
      }
    },

    /**
     * Adds a single sub component.
     *
     * @param {ICAL.Component} component to add.
     */
    addSubcomponent: function(component) {
      if (!this._components) {
        this._components = [];
        this._hydratedComponentCount = 0;
      }

      if (component.parent) {
        component.parent.removeSubcomponent(component);
      }

      var idx = this.jCal[COMPONENT_INDEX].push(component.jCal);
      this._components[idx - 1] = component;
      this._hydratedComponentCount++;
      component.parent = this;
    },

    /**
     * Removes a single component by name or
     * the instance of a specific component.
     *
     * @param {ICAL.Component|String} nameOrComp comp type.
     * @return {Boolean} true when comp is removed.
     */
    removeSubcomponent: function(nameOrComp) {
      var removed = this._removeObject(COMPONENT_INDEX, '_components', nameOrComp);
      if (removed) {
        this._hydratedComponentCount--;
      }
      return removed;
    },

    /**
     * Removes all components or (if given) all
     * components by a particular name.
     *
     * @param {String} [name] (lowercase) component name.
     */
    removeAllSubcomponents: function(name) {
      var removed = this._removeAllObjects(COMPONENT_INDEX, '_components', name);
      this._hydratedComponentCount = 0;
      return removed;
    },

    /**
     * Adds a property to the component.
     *
     * @param {ICAL.Property} property object.
     */
    addProperty: function(property) {
      if (!(property instanceof ICAL.Property)) {
        throw new TypeError('must instance of ICAL.Property');
      }

      if (!this._properties) {
        this._properties = [];
        this._hydratedPropertyCount = 0;
      }


      if (property.parent) {
        property.parent.removeProperty(property);
      }

      var idx = this.jCal[PROPERTY_INDEX].push(property.jCal);
      this._properties[idx - 1] = property;
      this._hydratedPropertyCount++;
      property.parent = this;
    },

    /**
     * Helper method to add a property with a value to the component.
     *
     * @param {String} name property name to add.
     * @param {Object} value property value.
     */
    addPropertyWithValue: function(name, value) {
      var prop = new ICAL.Property(name);
      prop.setValue(value);

      this.addProperty(prop);

      return prop;
    },

    /**
     * Helper method that will update or create a property
     * of the given name and sets its value.
     *
     * @param {String} name property name.
     * @param {Object} value property value.
     * @return {ICAL.Property} property.
     */
    updatePropertyWithValue: function(name, value) {
      var prop = this.getFirstProperty(name);

      if (prop) {
        prop.setValue(value);
      } else {
        prop = this.addPropertyWithValue(name, value);
      }

      return prop;
    },

    /**
     * Removes a single property by name or
     * the instance of the specific property.
     *
     * @param {String|ICAL.Property} nameOrProp to remove.
     * @return {Boolean} true when deleted.
     */
    removeProperty: function(nameOrProp) {
      var removed = this._removeObject(PROPERTY_INDEX, '_properties', nameOrProp);
      if (removed) {
        this._hydratedPropertyCount--;
      }
      return removed;
    },

    /**
     * Removes all properties associated with this component.
     *
     * @param {String} [name] (lowecase) optional property name.
     */
    removeAllProperties: function(name) {
      var removed = this._removeAllObjects(PROPERTY_INDEX, '_properties', name);
      this._hydratedPropertyCount = 0;
      return removed;
    },

    toJSON: function() {
      return this.jCal;
    },

    toString: function() {
      return ICAL.stringify.component(
        this.jCal
      );
    }

  };

  return Component;

}());
ICAL.Property = (function() {
  'use strict';

  var NAME_INDEX = 0;
  var PROP_INDEX = 1;
  var TYPE_INDEX = 2;
  var VALUE_INDEX = 3;

  var design = ICAL.design;

  /**
   * Provides a nicer interface to any kind of property.
   * Its important to note that mutations done in the wrapper
   * directly effect (mutate) the jCal object used to initialize.
   *
   * Can also be used to create new properties by passing
   * the name of the property (as a String).
   *
   *
   * @param {Array|String} jCal raw jCal representation OR
   *  the new name of the property (when creating).
   *
   * @param {ICAL.Component} [parent] parent component.
   */
  function Property(jCal, parent) {
    if (typeof(jCal) === 'string') {
      // because we a creating by name we need
      // to find the type when creating the property.
      var name = jCal;

      if (name in design.property) {
        var prop = design.property[name];
        if ('defaultType' in prop) {
          var type = prop.defaultType;
        } else {
          var type = design.defaultType;
        }
      } else {
        var type = design.defaultType;
      }

      jCal = [name, {}, type];
    }

    this.jCal = jCal;
    this.parent = parent || null;
    this._updateType();
  }

  Property.prototype = {
    get type() {
      return this.jCal[TYPE_INDEX];
    },

    get name() {
      return this.jCal[NAME_INDEX];
    },

    _updateType: function() {
      if (this.type in design.value) {
        var designType = design.value[this.type];

        if ('decorate' in design.value[this.type]) {
          this.isDecorated = true;
        } else {
          this.isDecorated = false;
        }

        if (this.name in design.property) {
          if ('multiValue' in design.property[this.name]) {
            this.isMultiValue = true;
          } else {
            this.isMultiValue = false;
          }
        }
      }
    },

    /**
     * Hydrate a single value.
     */
    _hydrateValue: function(index) {
      if (this._values && this._values[index]) {
        return this._values[index];
      }

      // for the case where there is no value.
      if (this.jCal.length <= (VALUE_INDEX + index)) {
        return null;
      }

      if (this.isDecorated) {
        if (!this._values) {
          this._values = [];
        }
        return this._values[index] = this._decorate(
          this.jCal[VALUE_INDEX + index]
        );
      } else {
        return this.jCal[VALUE_INDEX + index];
      }
    },

    _decorate: function(value) {
      return design.value[this.type].decorate(value, this);
    },

    _undecorate: function(value) {
      return design.value[this.type].undecorate(value, this);
    },

    _setDecoratedValue: function(value, index) {
      if (!this._values) {
        this._values = [];
      }

      if (typeof(value) === 'object' && 'icaltype' in value) {
        // decorated value
        this.jCal[VALUE_INDEX + index] = this._undecorate(value);
        this._values[index] = value;
      } else {
        // undecorated value
        this.jCal[VALUE_INDEX + index] = value;
        this._values[index] = this._decorate(value);
      }
    },

    /**
     * Gets a param on the property.
     *
     * @param {String} name prop name (lowercase).
     * @return {String} prop value.
     */
    getParameter: function(name) {
      return this.jCal[PROP_INDEX][name];
    },

    /**
     * Sets a param on the property.
     *
     * @param {String} value property value.
     */
    setParameter: function(name, value) {
      this.jCal[PROP_INDEX][name] = value;
    },

    /**
     * Removes a parameter
     *
     * @param {String} name prop name (lowercase).
     */
    removeParameter: function(name) {
      return delete this.jCal[PROP_INDEX][name];
    },

    /**
     * Get the default type based on this property's name.
     *
     * @return {String} the default type for this property.
     */
    getDefaultType: function() {
      var name = this.name
      if (name in design.property) {
        var details = design.property[name];
        if ('defaultType' in details) {
          return details.defaultType;
        }
      }
      return null;
    },

    /**
     * Sets type of property and clears out any
     * existing values of the current type.
     *
     * @param {String} type new iCAL type (see design.values).
     */
    resetType: function(type) {
      this.removeAllValues();
      this.jCal[TYPE_INDEX] = type;
      this._updateType();
    },

    /**
     * Finds first property value.
     *
     * @return {String} first property value.
     */
    getFirstValue: function() {
      return this._hydrateValue(0);
    },

    /**
     * Gets all values on the property.
     *
     * NOTE: this creates an array during each call.
     *
     * @return {Array} list of values.
     */
    getValues: function() {
      var len = this.jCal.length - VALUE_INDEX;

      if (len < 1) {
        // its possible for a property to have no value.
        return [];
      }

      var i = 0;
      var result = [];

      for (; i < len; i++) {
        result[i] = this._hydrateValue(i);
      }

      return result;
    },

    removeAllValues: function() {
      if (this._values) {
        this._values.length = 0;
      }
      this.jCal.length = 3;
    },

    /**
     * Sets the values of the property.
     * Will overwrite the existing values.
     *
     * @param {Array} values an array of values.
     */
    setValues: function(values) {
      if (!this.isMultiValue) {
        throw new Error(
          this.name + ': does not not support mulitValue.\n' +
          'override isMultiValue'
        );
      }

      var len = values.length;
      var i = 0;
      this.removeAllValues();

      if (len > 0 &&
          typeof(values[0]) === 'object' &&
          'icaltype' in values[0]) {
        this.resetType(values[0].icaltype);
      }

      if (this.isDecorated) {
        for (; i < len; i++) {
          this._setDecoratedValue(values[i], i);
        }
      } else {
        for (; i < len; i++) {
          this.jCal[VALUE_INDEX + i] = values[i];
        }
      }
    },

    /**
     * Sets the current value of the property. If this is a multi-value
     * property, all other values will be removed.
     *
     * @param {String|Object} value new prop value.
     */
    setValue: function(value) {
      this.removeAllValues();
      if (typeof(value) === 'object' && 'icaltype' in value) {
        this.resetType(value.icaltype);
      }

      if (this.isDecorated) {
        this._setDecoratedValue(value, 0);
      } else {
        this.jCal[VALUE_INDEX] = value;
      }
    },

    /**
     * Returns the jCal representation of this property.
     *
     * @return {Object} jCal.
     */
    toJSON: function() {
      return this.jCal;
    },

    toICAL: function() {
      return ICAL.stringify.property(
        this.jCal
      );
    }

  };

  return Property;

}());
ICAL.UtcOffset = (function() {

  function UtcOffset(aData) {
    this.hours = aData.hours;
    this.minutes = aData.minutes;
    this.factor = aData.factor;
  };

  UtcOffset.prototype = {

    hours: null,
    minutes: null,
    factor: null,

    icaltype: "utc-offset",

    toString: function toString() {
      return (this.factor == 1 ? "+" : "-") +
              ICAL.helpers.pad2(this.hours) + ':' +
              ICAL.helpers.pad2(this.minutes);
    }
  };

  UtcOffset.fromString = function(aString) {
    // -05:00
    var options = {};
    //TODO: support seconds per rfc5545 ?
    options.factor = (aString[0] === '+') ? 1 : -1;
    options.hours = ICAL.helpers.strictParseInt(aString.substr(1, 2));
    options.minutes = ICAL.helpers.strictParseInt(aString.substr(4, 2));

    return new ICAL.UtcOffset(options);
  };


  return UtcOffset;

}());
ICAL.Binary = (function() {

  function Binary(aValue) {
    this.value = aValue;
  };

  Binary.prototype = {
    icaltype: "binary",

    decodeValue: function decodeValue() {
      return this._b64_decode(this.value);
    },

    setEncodedValue: function setEncodedValue(val) {
      this.value = this._b64_encode(val);
    },

    _b64_encode: function base64_encode(data) {
      // http://kevin.vanzonneveld.net
      // +   original by: Tyler Akins (http://rumkin.com)
      // +   improved by: Bayron Guevara
      // +   improved by: Thunder.m
      // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
      // +   bugfixed by: Pellentesque Malesuada
      // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
      // +   improved by: Rafał Kukawski (http://kukawski.pl)
      // *     example 1: base64_encode('Kevin van Zonneveld');
      // *     returns 1: 'S2V2aW4gdmFuIFpvbm5ldmVsZA=='
      // mozilla has this native
      // - but breaks in 2.0.0.12!
      //if (typeof this.window['atob'] == 'function') {
      //    return atob(data);
      //}
      var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
                "abcdefghijklmnopqrstuvwxyz0123456789+/=";
      var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
        ac = 0,
        enc = "",
        tmp_arr = [];

      if (!data) {
        return data;
      }

      do { // pack three octets into four hexets
        o1 = data.charCodeAt(i++);
        o2 = data.charCodeAt(i++);
        o3 = data.charCodeAt(i++);

        bits = o1 << 16 | o2 << 8 | o3;

        h1 = bits >> 18 & 0x3f;
        h2 = bits >> 12 & 0x3f;
        h3 = bits >> 6 & 0x3f;
        h4 = bits & 0x3f;

        // use hexets to index into b64, and append result to encoded string
        tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
      } while (i < data.length);

      enc = tmp_arr.join('');

      var r = data.length % 3;

      return (r ? enc.slice(0, r - 3) : enc) + '==='.slice(r || 3);

    },

    _b64_decode: function base64_decode(data) {
      // http://kevin.vanzonneveld.net
      // +   original by: Tyler Akins (http://rumkin.com)
      // +   improved by: Thunder.m
      // +      input by: Aman Gupta
      // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
      // +   bugfixed by: Onno Marsman
      // +   bugfixed by: Pellentesque Malesuada
      // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
      // +      input by: Brett Zamir (http://brett-zamir.me)
      // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
      // *     example 1: base64_decode('S2V2aW4gdmFuIFpvbm5ldmVsZA==');
      // *     returns 1: 'Kevin van Zonneveld'
      // mozilla has this native
      // - but breaks in 2.0.0.12!
      //if (typeof this.window['btoa'] == 'function') {
      //    return btoa(data);
      //}
      var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
                "abcdefghijklmnopqrstuvwxyz0123456789+/=";
      var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
        ac = 0,
        dec = "",
        tmp_arr = [];

      if (!data) {
        return data;
      }

      data += '';

      do { // unpack four hexets into three octets using index points in b64
        h1 = b64.indexOf(data.charAt(i++));
        h2 = b64.indexOf(data.charAt(i++));
        h3 = b64.indexOf(data.charAt(i++));
        h4 = b64.indexOf(data.charAt(i++));

        bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;

        o1 = bits >> 16 & 0xff;
        o2 = bits >> 8 & 0xff;
        o3 = bits & 0xff;

        if (h3 == 64) {
          tmp_arr[ac++] = String.fromCharCode(o1);
        } else if (h4 == 64) {
          tmp_arr[ac++] = String.fromCharCode(o1, o2);
        } else {
          tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
        }
      } while (i < data.length);

      dec = tmp_arr.join('');

      return dec;
    },

    toString: function() {
      return this.value;
    }
  };

  Binary.fromString = function(aString) {
    return new Binary(aString);
  }

  return Binary;

}());
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2011-2012 */



(typeof(ICAL) === 'undefined')? ICAL = {} : '';
(function() {
  ICAL.Period = function icalperiod(aData) {
    this.wrappedJSObject = this;

    if (aData && 'start' in aData) {
      if (aData.start && !(aData.start instanceof ICAL.Time)) {
        throw new TypeError('.start must be an instance of ICAL.Time');
      }
      this.start = aData.start;
    }

    if (aData && aData.end && aData.duration) {
      throw new Error('cannot accept both end and duration');
    }

    if (aData && 'end' in aData) {
      if (aData.end && !(aData.end instanceof ICAL.Time)) {
        throw new TypeError('.end must be an instance of ICAL.Time');
      }
      this.end = aData.end;
    }

    if (aData && 'duration' in aData) {
      if (aData.duration && !(aData.duration instanceof ICAL.Duration)) {
        throw new TypeError('.duration must be an instance of ICAL.Duration');
      }
      this.duration = aData.duration;
    }
  };

  ICAL.Period.prototype = {

    start: null,
    end: null,
    duration: null,
    icalclass: "icalperiod",
    icaltype: "period",

    clone: function() {
      return ICAL.Period.fromData({
        start: this.start ? this.start.clone() : null,
        end: this.end ? this.end.clone() : null,
        duration: this.duration ? this.duration.clone() : null
      });
    },

    getDuration: function duration() {
      if (this.duration) {
        return this.duration;
      } else {
        return this.end.subtractDate(this.start);
      }
    },

    getEnd: function() {
      if (this.end) {
        return this.end;
      } else {
        var end = this.start.clone();
        end.addDuration(this.duration);
        return end;
      }
    },

    toString: function toString() {
      return this.start + "/" + (this.end || this.duration);
    },

    toICALString: function() {
      return this.start.toICALString() + "/" +
             (this.end || this.duration).toICALString();
    }
  };

  ICAL.Period.fromString = function fromString(str, prop) {
    var parts = str.split('/');

    if (parts.length !== 2) {
      throw new Error(
        'Invalid string value: "' + str + '" must contain a "/" char.'
      );
    }

    var options = {
      start: ICAL.Time.fromDateTimeString(parts[0], prop)
    };

    var end = parts[1];

    if (ICAL.Duration.isValueString(end)) {
      options.duration = ICAL.Duration.fromString(end);
    } else {
      options.end = ICAL.Time.fromDateTimeString(end, prop);
    }

    return new ICAL.Period(options);
  };

  ICAL.Period.fromData = function fromData(aData) {
    return new ICAL.Period(aData);
  };

})();
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2011-2012 */



(typeof(ICAL) === 'undefined')? ICAL = {} : '';
(function() {
  var DURATION_LETTERS = /([PDWHMTS]{1,1})/;

  ICAL.Duration = function icalduration(data) {
    this.wrappedJSObject = this;
    this.fromData(data);
  };

  ICAL.Duration.prototype = {

    weeks: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isNegative: false,
    icalclass: "icalduration",
    icaltype: "duration",

    clone: function clone() {
      return ICAL.Duration.fromData(this);
    },

    toSeconds: function toSeconds() {
      var seconds = this.seconds + 60 * this.minutes + 3600 * this.hours +
                    86400 * this.days + 7 * 86400 * this.weeks;
      return (this.isNegative ? -seconds : seconds);
    },

    fromSeconds: function fromSeconds(aSeconds) {
      var secs = Math.abs(aSeconds);

      this.isNegative = (aSeconds < 0);
      this.days = ICAL.helpers.trunc(secs / 86400);

      // If we have a flat number of weeks, use them.
      if (this.days % 7 == 0) {
        this.weeks = this.days / 7;
        this.days = 0;
      } else {
        this.weeks = 0;
      }

      secs -= (this.days + 7 * this.weeks) * 86400;

      this.hours = ICAL.helpers.trunc(secs / 3600);
      secs -= this.hours * 3600;

      this.minutes = ICAL.helpers.trunc(secs / 60);
      secs -= this.minutes * 60;

      this.seconds = secs;
      return this;
    },

    fromData: function fromData(aData) {
      var propsToCopy = ["weeks", "days", "hours",
                         "minutes", "seconds", "isNegative"];
      for (var key in propsToCopy) {
        var prop = propsToCopy[key];
        if (aData && prop in aData) {
          this[prop] = aData[prop];
        } else {
          this[prop] = 0;
        }
      }
    },

    reset: function reset() {
      this.isNegative = false;
      this.weeks = 0;
      this.days = 0;
      this.hours = 0;
      this.minutes = 0;
      this.seconds = 0;
    },

    compare: function compare(aOther) {
      var thisSeconds = this.toSeconds();
      var otherSeconds = aOther.toSeconds();
      return (thisSeconds > otherSeconds) - (thisSeconds < otherSeconds);
    },

    normalize: function normalize() {
      this.fromSeconds(this.toSeconds());
      return this;
    },

    toString: function toString() {
      if (this.toSeconds() == 0) {
        return "PT0S";
      } else {
        var str = "";
        if (this.isNegative) str += "-";
        str += "P";
        if (this.weeks) str += this.weeks + "W";
        if (this.days) str += this.days + "D";

        if (this.hours || this.minutes || this.seconds) {
          str += "T";
          if (this.hours) str += this.hours + "H";
          if (this.minutes) str += this.minutes + "M";
          if (this.seconds) str += this.seconds + "S";
        }
        return str;
      }
    },

    toICALString: function() {
      return this.toString();
    }
  };

  ICAL.Duration.fromSeconds = function icalduration_from_seconds(aSeconds) {
    return (new ICAL.Duration()).fromSeconds(aSeconds);
  };

  /**
   * Internal helper function to handle a chunk of a duration.
   *
   * @param {String} letter type of duration chunk.
   * @param {String} number numeric value or -/+.
   * @param {Object} dict target to assign values to.
   */
  function parseDurationChunk(letter, number, object) {
    var type;
    switch (letter) {
      case 'P':
        if (number && number === '-') {
          object.isNegative = true;
        } else {
          object.isNegative = false;
        }
        // period
        break;
      case 'D':
        type = 'days';
        break;
      case 'W':
        type = 'weeks';
        break;
      case 'H':
        type = 'hours';
        break;
      case 'M':
        type = 'minutes';
        break;
      case 'S':
        type = 'seconds';
        break;
      default:
        // Not a valid chunk
        return 0;
    }

    if (type) {
      if (!number && number !== 0) {
        throw new Error(
          'invalid duration value: Missing number before "' + letter + '"'
        );
      }
      var num = parseInt(number, 10);
      if (ICAL.helpers.isStrictlyNaN(num)) {
        throw new Error(
          'invalid duration value: Invalid number "' + number + '" before "' + letter + '"'
        );
      }
      object[type] = num;
    }

    return 1;
  }

  /**
   * @param {String} value raw ical value.
   * @return {Boolean}
   *  true when the given value is of the duration ical type.
   */
  ICAL.Duration.isValueString = function(string) {
    return (string[0] === 'P' || string[1] === 'P');
  },

  ICAL.Duration.fromString = function icalduration_from_string(aStr) {
    var pos = 0;
    var dict = Object.create(null);
    var chunks = 0;

    while ((pos = aStr.search(DURATION_LETTERS)) !== -1) {
      var type = aStr[pos];
      var numeric = aStr.substr(0, pos);
      aStr = aStr.substr(pos + 1);

      chunks += parseDurationChunk(type, numeric, dict);
    }

    if (chunks < 2) {
      // There must be at least a chunk with "P" and some unit chunk
      throw new Error(
        'invalid duration value: Not enough duration components in "' + aStr + '"'
      );
    }

    return new ICAL.Duration(dict);
  };

  ICAL.Duration.fromData = function icalduration_from_data(aData) {
    return new ICAL.Duration(aData);
  };
})();
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2011-2012 */



(typeof(ICAL) === 'undefined')? ICAL = {} : '';
(function() {
  var OPTIONS = ["tzid", "location", "tznames",
                 "latitude", "longitude"];

  /**
   * Timezone representation, created by passing in a tzid and component.
   *
   *    var vcalendar;
   *    var timezoneComp = vcalendar.getFirstSubcomponent('vtimezone');
   *    var tzid = timezoneComp.getFirstPropertyValue('tzid');
   *
   *    var timezone = new ICAL.Timezone({
   *      component: timezoneComp,
   *      tzid
   *    });
   *
   *
   * @param {Object} data options for class (see above).
   */
  ICAL.Timezone = function icaltimezone(data) {
    this.wrappedJSObject = this;
    this.fromData(data);
  };

  ICAL.Timezone.prototype = {

    tzid: "",
    location: "",
    tznames: "",

    latitude: 0.0,
    longitude: 0.0,

    component: null,

    expandedUntilYear: 0,

    icalclass: "icaltimezone",

    fromData: function fromData(aData) {
      this.expandedUntilYear = 0;
      this.changes = [];

      if (aData instanceof ICAL.Component) {
        // Either a component is passed directly
        this.component = aData;
      } else {
        // Otherwise the component may be in the data object
        if (aData && "component" in aData) {
          if (typeof aData.component == "string") {
            // If a string was passed, parse it as a component
            var icalendar = ICAL.parse(aData.component);
            this.component = new ICAL.Component(icalendar[1]);
          } else if (aData.component instanceof ICAL.Component) {
            // If it was a component already, then just set it
            this.component = aData.component;
          } else {
            // Otherwise just null out the component
            this.component = null;
          }
        }

        // Copy remaining passed properties
        for (var key in OPTIONS) {
          var prop = OPTIONS[key];
          if (aData && prop in aData) {
            this[prop] = aData[prop];
          }
        }
      }

      // If we have a component but no TZID, attempt to get it from the
      // component's properties.
      if (this.component instanceof ICAL.Component && !this.tzid) {
        this.tzid = this.component.getFirstPropertyValue('tzid');
      }

      return this;
    },

    /**
     * Finds the utcOffset the given time would occur in this timezone.
     *
     * @return {Number} utc offset in seconds.
     */
    utcOffset: function utcOffset(tt) {
      if (this == ICAL.Timezone.utcTimezone || this == ICAL.Timezone.localTimezone) {
        return 0;
      }

      this._ensureCoverage(tt.year);

      if (!this.changes.length) {
        return 0;
      }

      var tt_change = {
        year: tt.year,
        month: tt.month,
        day: tt.day,
        hour: tt.hour,
        minute: tt.minute,
        second: tt.second
      };

      var change_num = this._findNearbyChange(tt_change);
      var change_num_to_use = -1;
      var step = 1;

      // TODO: replace with bin search?
      for (;;) {
        var change = ICAL.helpers.clone(this.changes[change_num], true);
        if (change.utcOffset < change.prevUtcOffset) {
          ICAL.Timezone.adjust_change(change, 0, 0, 0, change.utcOffset);
        } else {
          ICAL.Timezone.adjust_change(change, 0, 0, 0,
                                          change.prevUtcOffset);
        }

        var cmp = ICAL.Timezone._compare_change_fn(tt_change, change);

        if (cmp >= 0) {
          change_num_to_use = change_num;
        } else {
          step = -1;
        }

        if (step == -1 && change_num_to_use != -1) {
          break;
        }

        change_num += step;

        if (change_num < 0) {
          return 0;
        }

        if (change_num >= this.changes.length) {
          break;
        }
      }

      var zone_change = this.changes[change_num_to_use];
      var utcOffset_change = zone_change.utcOffset - zone_change.prevUtcOffset;

      if (utcOffset_change < 0 && change_num_to_use > 0) {
        var tmp_change = ICAL.helpers.clone(zone_change, true);
        ICAL.Timezone.adjust_change(tmp_change, 0, 0, 0,
                                        tmp_change.prevUtcOffset);

        if (ICAL.Timezone._compare_change_fn(tt_change, tmp_change) < 0) {
          var prev_zone_change = this.changes[change_num_to_use - 1];

          var want_daylight = false; // TODO

          if (zone_change.is_daylight != want_daylight &&
              prev_zone_change.is_daylight == want_daylight) {
            zone_change = prev_zone_change;
          }
        }
      }

      // TODO return is_daylight?
      return zone_change.utcOffset;
    },

    _findNearbyChange: function icaltimezone_find_nearby_change(change) {
      // find the closest match
      var idx = ICAL.helpers.binsearchInsert(
        this.changes,
        change,
        ICAL.Timezone._compare_change_fn
      );

      if (idx >= this.changes.length) {
        return this.changes.length - 1;
      }

      return idx;
    },

    _ensureCoverage: function(aYear) {
      if (ICAL.Timezone._minimumExpansionYear == -1) {
        var today = ICAL.Time.now();
        ICAL.Timezone._minimumExpansionYear = today.year;
      }

      var changesEndYear = aYear;
      if (changesEndYear < ICAL.Timezone._minimumExpansionYear) {
        changesEndYear = ICAL.Timezone._minimumExpansionYear;
      }

      changesEndYear += ICAL.Timezone.EXTRA_COVERAGE;

      if (changesEndYear > ICAL.Timezone.MAX_YEAR) {
        changesEndYear = ICAL.Timezone.MAX_YEAR;
      }

      if (!this.changes.length || this.expandedUntilYear < aYear) {
        var subcomps = this.component.getAllSubcomponents();
        var compLen = subcomps.length;
        var compIdx = 0;

        for (; compIdx < compLen; compIdx++) {
          this._expandComponent(
            subcomps[compIdx], changesEndYear, this.changes
          );
        }

        this.changes.sort(ICAL.Timezone._compare_change_fn);
        this.expandedUntilYear = changesEndYear;
      }
    },

    _expandComponent: function(aComponent, aYear, changes) {
      if (!aComponent.hasProperty("dtstart") ||
          !aComponent.hasProperty("tzoffsetto") ||
          !aComponent.hasProperty("tzoffsetfrom")) {
        return null;
      }

      var dtstart = aComponent.getFirstProperty("dtstart").getFirstValue();

      function convert_tzoffset(offset) {
        return offset.factor * (offset.hours * 3600 + offset.minutes * 60);
      }

      function init_changes() {
        var changebase = {};
        changebase.is_daylight = (aComponent.name == "daylight");
        changebase.utcOffset = convert_tzoffset(
          aComponent.getFirstProperty("tzoffsetto").getFirstValue()
        );

        changebase.prevUtcOffset = convert_tzoffset(
          aComponent.getFirstProperty("tzoffsetfrom").getFirstValue()
        );

        return changebase;
      }

      if (!aComponent.hasProperty("rrule") && !aComponent.hasProperty("rdate")) {
        var change = init_changes();
        change.year = dtstart.year;
        change.month = dtstart.month;
        change.day = dtstart.day;
        change.hour = dtstart.hour;
        change.minute = dtstart.minute;
        change.second = dtstart.second;

        ICAL.Timezone.adjust_change(change, 0, 0, 0,
                                        -change.prevUtcOffset);
        changes.push(change);
      } else {
        var props = aComponent.getAllProperties("rdate");
        for (var rdatekey in props) {
          var rdate = props[rdatekey];
          var time = rdate.getFirstValue();
          var change = init_changes();

          change.year = time.year;
          change.month = time.month;
          change.day = time.day;

          if (time.isDate) {
            change.hour = dtstart.hour;
            change.minute = dtstart.minute;
            change.second = dtstart.second;

            if (dtstart.zone != ICAL.Timezone.utcTimezone) {
              ICAL.Timezone.adjust_change(change, 0, 0, 0,
                                              -change.prevUtcOffset);
            }
          } else {
            change.hour = time.hour;
            change.minute = time.minute;
            change.second = time.second;

            if (time.zone != ICAL.Timezone.utcTimezone) {
              ICAL.Timezone.adjust_change(change, 0, 0, 0,
                                              -change.prevUtcOffset);
            }
          }

          changes.push(change);
        }

        var rrule = aComponent.getFirstProperty("rrule");

        if (rrule) {
          rrule = rrule.getFirstValue();
          var change = init_changes();

          if (rrule.until && rrule.until.zone == ICAL.Timezone.utcTimezone) {
            rrule.until.adjust(0, 0, 0, change.prevUtcOffset);
            rrule.until.zone = ICAL.Timezone.localTimezone;
          }

          var iterator = rrule.iterator(dtstart);

          var occ;
          while ((occ = iterator.next())) {
            var change = init_changes();
            if (occ.year > aYear || !occ) {
              break;
            }

            change.year = occ.year;
            change.month = occ.month;
            change.day = occ.day;
            change.hour = occ.hour;
            change.minute = occ.minute;
            change.second = occ.second;
            change.isDate = occ.isDate;

            ICAL.Timezone.adjust_change(change, 0, 0, 0,
                                            -change.prevUtcOffset);
            changes.push(change);
          }
        }
      }

      return changes;
    },

    toString: function toString() {
      return (this.tznames ? this.tznames : this.tzid);
    }

  };

  ICAL.Timezone._compare_change_fn = function icaltimezone_compare_change_fn(a, b) {
    if (a.year < b.year) return -1;
    else if (a.year > b.year) return 1;

    if (a.month < b.month) return -1;
    else if (a.month > b.month) return 1;

    if (a.day < b.day) return -1;
    else if (a.day > b.day) return 1;

    if (a.hour < b.hour) return -1;
    else if (a.hour > b.hour) return 1;

    if (a.minute < b.minute) return -1;
    else if (a.minute > b.minute) return 1;

    if (a.second < b.second) return -1;
    else if (a.second > b.second) return 1;

    return 0;
  };

  ICAL.Timezone.convert_time = function icaltimezone_convert_time(tt, from_zone, to_zone) {
    if (tt.isDate ||
        from_zone.tzid == to_zone.tzid ||
        from_zone == ICAL.Timezone.localTimezone ||
        to_zone == ICAL.Timezone.localTimezone) {
      tt.zone = to_zone;
      return tt;
    }

    var utcOffset = from_zone.utcOffset(tt);
    tt.adjust(0, 0, 0, - utcOffset);

    utcOffset = to_zone.utcOffset(tt);
    tt.adjust(0, 0, 0, utcOffset);

    return null;
  };

  ICAL.Timezone.fromData = function icaltimezone_fromData(aData) {
    var tt = new ICAL.Timezone();
    return tt.fromData(aData);
  };

  ICAL.Timezone.utcTimezone = ICAL.Timezone.fromData({
    tzid: "UTC"
  });

  ICAL.Timezone.localTimezone = ICAL.Timezone.fromData({
    tzid: "floating"
  });

  ICAL.Timezone.adjust_change = function icaltimezone_adjust_change(change, days, hours, minutes, seconds) {
    return ICAL.Time.prototype.adjust.call(
      change,
      days,
      hours,
      minutes,
      seconds,
      change
    );
  };

  ICAL.Timezone._minimumExpansionYear = -1;
  ICAL.Timezone.MAX_YEAR = 2035; // TODO this is because of time_t, which we don't need. Still usefull?
  ICAL.Timezone.EXTRA_COVERAGE = 5;
})();
// singleton class to contain timezones.
// Right now its all manual registry in the
// future we may use this class to download timezone
// information or handle loading pre-expanded timezones.
ICAL.TimezoneService = (function() {
  var zones;

  // Using var rather then return so we don't need to name the functions twice.
  // TimezoneService#get will appear in profiler, etc...
  var TimezoneService = {
    reset: function() {
      zones = Object.create(null);
      var utc = ICAL.Timezone.utcTimezone;

      zones.Z = utc;
      zones.UTC = utc;
      zones.GMT = utc;
    },

    /**
     * Checks if timezone id has been registered.
     *
     * @param {String} tzid (e.g. America/Los_Angeles).
     * @return {Boolean} false when not present.
     */
    has: function(tzid) {
      return !!zones[tzid];
    },

    /**
     * Returns a timezone by its tzid if present.
     *
     * @param {String} tzid name of timezone (e.g. America/Los_Angeles).
     * @return {ICAL.Timezone|Null} zone or null.
     */
    get: function(tzid) {
      return zones[tzid];
    },

    /**
     * Registers a timezone object or component.
     *
     * @param {String} [name] optional uses timezone.tzid by default.
     * @param {ICAL.Component|ICAL.Timezone} zone initialized zone or vtimezone.
     */
    register: function(name, timezone) {
      if (name instanceof ICAL.Component) {
        if (name.name === 'vtimezone') {
          timezone = new ICAL.Timezone(name);
          name = timezone.tzid;
        }
      }

      if (timezone instanceof ICAL.Timezone) {
        zones[name] = timezone;
      } else {
        throw new TypeError('timezone must be ICAL.Timezone or ICAL.Component');
      }
    },

    /**
     * Removes a timezone by its tzid from the list.
     *
     * @param {String} tzid (e.g. America/Los_Angeles).
     */
    remove: function(tzid) {
      return (delete zones[tzid]);
    }
  };

  // initialize defaults
  TimezoneService.reset();

  return TimezoneService;
}());
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2011-2012 */



(typeof(ICAL) === 'undefined')? ICAL = {} : '';
(function() {

  /**
   * Time representation (similar to JS Date object).
   * Fully independent of system (OS) timezone / time.
   * Unlike JS Date month start at 1 (Jan) not zero.
   *
   *
   *    var time = new ICAL.Time({
   *      year: 2012,
   *      month: 10,
   *      day: 11
   *      minute: 0,
   *      second: 0,
   *      isDate: false
   *    });
   *
   *
   * @param {Object} data initialization time.
   * @param {ICAL.Timezone} zone timezone this position occurs in.
   */
  ICAL.Time = function icaltime(data, zone) {
    this.wrappedJSObject = this;
    var time = this._time = Object.create(null);

    /* time defaults */
    time.year = 0;
    time.month = 1;
    time.day = 1;
    time.hour = 0;
    time.minute = 0;
    time.second = 0;
    time.isDate = false;

    this.fromData(data, zone);
  };

  ICAL.Time.prototype = {

    icalclass: "icaltime",

    // is read only strictly defined by isDate
    get icaltype() {
      return this.isDate ? 'date' : 'date-time';
    },

    /**
     * @type ICAL.Timezone
     */
    zone: null,

    /**
     * Internal uses to indicate that a change has been
     * made and the next read operation must attempt to
     * normalize the value (for example changing the day to 33).
     *
     * @type Boolean
     * @private
     */
    _pendingNormalization: false,

    clone: function icaltime_clone() {
      return new ICAL.Time(this._time, this.zone);
    },

    reset: function icaltime_reset() {
      this.fromData(ICAL.Time.epochTime);
      this.zone = ICAL.Timezone.utcTimezone;
    },

    resetTo: function icaltime_resetTo(year, month, day,
                                       hour, minute, second, timezone) {
      this.fromData({
        year: year,
        month: month,
        day: day,
        hour: hour,
        minute: minute,
        second: second,
        zone: timezone
      });
    },

    fromString: function icaltime_fromString(str) {
      var data;
      try {
        data = ICAL.DecorationParser.parseValue(str, "date");
        data.isDate = true;
      } catch (e) {
        data = ICAL.DecorationParser.parseValue(str, "date-time");
        data.isDate = false;
      }
      return this.fromData(data);
    },

    fromJSDate: function icaltime_fromJSDate(aDate, useUTC) {
      if (!aDate) {
        this.reset();
      } else {
        if (useUTC) {
          this.zone = ICAL.Timezone.utcTimezone;
          this.year = aDate.getUTCFullYear();
          this.month = aDate.getUTCMonth() + 1;
          this.day = aDate.getUTCDate();
          this.hour = aDate.getUTCHours();
          this.minute = aDate.getUTCMinutes();
          this.second = aDate.getUTCSeconds();
        } else {
          this.zone = ICAL.Timezone.localTimezone;
          this.year = aDate.getFullYear();
          this.month = aDate.getMonth() + 1;
          this.day = aDate.getDate();
          this.hour = aDate.getHours();
          this.minute = aDate.getMinutes();
          this.second = aDate.getSeconds();
        }
      }
      return this;
    },

    fromData: function fromData(aData, aZone) {
      for (var key in aData) {
        // ical type cannot be set
        if (key === 'icaltype') continue;
        this[key] = aData[key];
      }

      if (aZone) {
        this.zone = aZone;
      }

      if (aData && !("isDate" in aData)) {
        this.isDate = !("hour" in aData);
      } else if (aData && ("isDate" in aData)) {
        this.isDate = aData.isDate;
      }

      if (aData && "timezone" in aData) {
        var zone = ICAL.TimezoneService.get(
          aData.timezone
        );

        this.zone = zone || ICAL.Timezone.localTimezone;
      }

      if (aData && "zone" in aData) {
        this.zone = aData.zone;
      }

      if (!this.zone) {
        this.zone = ICAL.Timezone.localTimezone;
      }

      return this;
    },

    dayOfWeek: function icaltime_dayOfWeek() {
      // Using Zeller's algorithm
      var q = this.day;
      var m = this.month + (this.month < 3 ? 12 : 0);
      var Y = this.year - (this.month < 3 ? 1 : 0);

      var h = (q + Y + ICAL.helpers.trunc(((m + 1) * 26) / 10) + ICAL.helpers.trunc(Y / 4));
      if (true /* gregorian */) {
        h += ICAL.helpers.trunc(Y / 100) * 6 + ICAL.helpers.trunc(Y / 400);
      } else {
        h += 5;
      }

      // Normalize to 1 = sunday
      h = ((h + 6) % 7) + 1;
      return h;
    },

    dayOfYear: function icaltime_dayOfYear() {
      var is_leap = (ICAL.Time.is_leap_year(this.year) ? 1 : 0);
      var diypm = ICAL.Time._days_in_year_passed_month;
      return diypm[is_leap][this.month - 1] + this.day;
    },

    startOfWeek: function startOfWeek() {
      var result = this.clone();
      result.day -= this.dayOfWeek() - 1;
      return result;
    },

    endOfWeek: function endOfWeek() {
      var result = this.clone();
      result.day += 7 - this.dayOfWeek();
      return result;
    },

    startOfMonth: function startOfMonth() {
      var result = this.clone();
      result.day = 1;
      result.isDate = true;
      result.hour = 0;
      result.minute = 0;
      result.second = 0;
      return result;
    },

    endOfMonth: function endOfMonth() {
      var result = this.clone();
      result.day = ICAL.Time.daysInMonth(result.month, result.year);
      result.isDate = true;
      result.hour = 0;
      result.minute = 0;
      result.second = 0;
      return result;
    },

    startOfYear: function startOfYear() {
      var result = this.clone();
      result.day = 1;
      result.month = 1;
      result.isDate = true;
      result.hour = 0;
      result.minute = 0;
      result.second = 0;
      return result;
    },

    endOfYear: function endOfYear() {
      var result = this.clone();
      result.day = 31;
      result.month = 12;
      result.isDate = true;
      result.hour = 0;
      result.minute = 0;
      result.second = 0;
      return result;
    },

    startDoyWeek: function startDoyWeek(aFirstDayOfWeek) {
      var firstDow = aFirstDayOfWeek || ICAL.Time.SUNDAY;
      var delta = this.dayOfWeek() - firstDow;
      if (delta < 0) delta += 7;
      return this.dayOfYear() - delta;
    },

    /**
     * Finds the nthWeekDay relative to the current month (not day).
     * The returned value is a day relative the month that this
     * month belongs to so 1 would indicate the first of the month
     * and 40 would indicate a day in the following month.
     *
     * @param {Numeric} aDayOfWeek day of the week see the day name constants.
     * @param {Numeric} aPos nth occurrence of a given week day
     *                       values of 1 and 0 both indicate the first
     *                       weekday of that type. aPos may be either positive
     *                       or negative.
     *
     * @return {Numeric} numeric value indicating a day relative
     *                   to the current month of this time object.
     */
    nthWeekDay: function icaltime_nthWeekDay(aDayOfWeek, aPos) {
      var daysInMonth = ICAL.Time.daysInMonth(this.month, this.year);
      var weekday;
      var pos = aPos;

      var start = 0;

      var otherDay = this.clone();

      if (pos >= 0) {
        otherDay.day = 1;

        // because 0 means no position has been given
        // 1 and 0 indicate the same day.
        if (pos != 0) {
          // remove the extra numeric value
          pos--;
        }

        // set current start offset to current day.
        start = otherDay.day;

        // find the current day of week
        var startDow = otherDay.dayOfWeek();

        // calculate the difference between current
        // day of the week and desired day of the week
        var offset = aDayOfWeek - startDow;


        // if the offset goes into the past
        // week we add 7 so its goes into the next
        // week. We only want to go forward in time here.
        if (offset < 0)
          // this is really important otherwise we would
          // end up with dates from in the past.
          offset += 7;

        // add offset to start so start is the same
        // day of the week as the desired day of week.
        start += offset;

        // because we are going to add (and multiply)
        // the numeric value of the day we subtract it
        // from the start position so not to add it twice.
        start -= aDayOfWeek;

        // set week day
        weekday = aDayOfWeek;
      } else {

        // then we set it to the last day in the current month
        otherDay.day = daysInMonth;

        // find the ends weekday
        var endDow = otherDay.dayOfWeek();

        pos++;

        weekday = (endDow - aDayOfWeek);

        if (weekday < 0) {
          weekday += 7;
        }

        weekday = daysInMonth - weekday;
      }

      weekday += pos * 7;

      return start + weekday;
    },

    /**
     * Checks if current time is the nthWeekDay.
     * Relative to the current month.
     *
     * Will always return false when rule resolves
     * outside of current month.
     *
     * @param {Numeric} aDayOfWeek day of week.
     * @param {Numeric} aPos position.
     * @param {Numeric} aMax maximum valid day.
     */
    isNthWeekDay: function(aDayOfWeek, aPos) {
      var dow = this.dayOfWeek();

      if (aPos === 0 && dow === aDayOfWeek) {
        return true;
      }

      // get pos
      var day = this.nthWeekDay(aDayOfWeek, aPos);

      if (day === this.day) {
        return true;
      }

      return false;
    },

    weekNumber: function weekNumber(aWeekStart) {
      // This function courtesty of Julian Bucknall, published under the MIT license
      // http://www.boyet.com/articles/publishedarticles/calculatingtheisoweeknumb.html
      var doy = this.dayOfYear();
      var dow = this.dayOfWeek();
      var year = this.year;
      var week1;

      var dt = this.clone();
      dt.isDate = true;
      var first_dow = dt.dayOfWeek();
      var isoyear = this.year;

      if (dt.month == 12 && dt.day > 28) {
        week1 = ICAL.Time.weekOneStarts(isoyear + 1, aWeekStart);
        if (dt.compare(week1) < 0) {
          week1 = ICAL.Time.weekOneStarts(isoyear, aWeekStart);
        } else {
          isoyear++;
        }
      } else {
        week1 = ICAL.Time.weekOneStarts(isoyear, aWeekStart);
        if (dt.compare(week1) < 0) {
          week1 = ICAL.Time.weekOneStarts(--isoyear, aWeekStart);
        }
      }

      var daysBetween = (dt.subtractDate(week1).toSeconds() / 86400);
      return ICAL.helpers.trunc(daysBetween / 7) + 1;
    },

    addDuration: function icaltime_add(aDuration) {
      var mult = (aDuration.isNegative ? -1 : 1);

      // because of the duration optimizations it is much
      // more efficient to grab all the values up front
      // then set them directly (which will avoid a normalization call).
      // So we don't actually normalize until we need it.
      var second = this.second;
      var minute = this.minute;
      var hour = this.hour;
      var day = this.day;

      second += mult * aDuration.seconds;
      minute += mult * aDuration.minutes;
      hour += mult * aDuration.hours;
      day += mult * aDuration.days;
      day += mult * 7 * aDuration.weeks;

      this.second = second;
      this.minute = minute;
      this.hour = hour;
      this.day = day;
    },

    /**
     * Subtract the date details (_excluding_ timezone).
     * Useful for finding the relative difference between
     * two time objects excluding their timezone differences.
     *
     * @return {ICAL.Duration} difference in duration.
     */
    subtractDate: function icaltime_subtract(aDate) {
      var unixTime = this.toUnixTime() + this.utcOffset();
      var other = aDate.toUnixTime() + aDate.utcOffset();
      return ICAL.Duration.fromSeconds(unixTime - other);
    },

    /**
     * Subtract the date details, taking timezones into account.
     *
     * @param {ICAL.Time}  The date to subtract.
     * @return {ICAL.Duration}  The difference in duration.
     */
    subtractDateTz: function icaltime_subtract_abs(aDate) {
      var unixTime = this.toUnixTime();
      var other = aDate.toUnixTime();
      return ICAL.Duration.fromSeconds(unixTime - other);
    },

    compare: function icaltime_compare(other) {
      var a = this.toUnixTime();
      var b = other.toUnixTime();

      if (a > b) return 1;
      if (b > a) return -1;
      return 0;
    },

    compareDateOnlyTz: function icaltime_compareDateOnlyTz(other, tz) {
      function cmp(attr) {
        return ICAL.Time._cmp_attr(a, b, attr);
      }
      var a = this.convertToZone(tz);
      var b = other.convertToZone(tz);
      var rc = 0;

      if ((rc = cmp("year")) != 0) return rc;
      if ((rc = cmp("month")) != 0) return rc;
      if ((rc = cmp("day")) != 0) return rc;

      return rc;
    },

    convertToZone: function convertToZone(zone) {
      var copy = this.clone();
      var zone_equals = (this.zone.tzid == zone.tzid);

      if (!this.isDate && !zone_equals) {
        ICAL.Timezone.convert_time(copy, this.zone, zone);
      }

      copy.zone = zone;
      return copy;
    },

    utcOffset: function utc_offset() {
      if (this.zone == ICAL.Timezone.localTimezone ||
          this.zone == ICAL.Timezone.utcTimezone) {
        return 0;
      } else {
        return this.zone.utcOffset(this);
      }
    },

    /**
     * Returns an RFC 5455 compliant ical representation of this object.
     *
     * @return {String} ical date/date-time.
     */
    toICALString: function() {
      var string = this.toString();

      if (string.length > 10) {
        return ICAL.design.value['date-time'].toICAL(string);
      } else {
        return ICAL.design.value.date.toICAL(string);
      }
    },

    toString: function toString() {
      var result = this.year + '-' +
                   ICAL.helpers.pad2(this.month) + '-' +
                   ICAL.helpers.pad2(this.day);

      if (!this.isDate) {
          result += 'T' + ICAL.helpers.pad2(this.hour) + ':' +
                    ICAL.helpers.pad2(this.minute) + ':' +
                    ICAL.helpers.pad2(this.second);

        if (this.zone === ICAL.Timezone.utcTimezone) {
          result += 'Z';
        }
      }

      return result;
    },

    toJSDate: function toJSDate() {
      if (this.zone == ICAL.Timezone.localTimezone) {
        if (this.isDate) {
          return new Date(this.year, this.month - 1, this.day);
        } else {
          return new Date(this.year, this.month - 1, this.day,
                          this.hour, this.minute, this.second, 0);
        }
      } else {
        return new Date(this.toUnixTime() * 1000);
      }
    },

    _normalize: function icaltime_normalize() {
      var isDate = this._time.isDate;
      if (this._time.isDate) {
        this._time.hour = 0;
        this._time.minute = 0;
        this._time.second = 0;
      }
      this.adjust(0, 0, 0, 0);

      return this;
    },

    adjust: function icaltime_adjust(aExtraDays, aExtraHours,
                                     aExtraMinutes, aExtraSeconds, aTime) {

      var minutesOverflow, hoursOverflow,
          daysOverflow = 0, yearsOverflow = 0;

      var second, minute, hour, day;
      var daysInMonth;

      var time = aTime || this._time;

      if (!time.isDate) {
        second = time.second + aExtraSeconds;
        time.second = second % 60;
        minutesOverflow = ICAL.helpers.trunc(second / 60);
        if (time.second < 0) {
          time.second += 60;
          minutesOverflow--;
        }

        minute = time.minute + aExtraMinutes + minutesOverflow;
        time.minute = minute % 60;
        hoursOverflow = ICAL.helpers.trunc(minute / 60);
        if (time.minute < 0) {
          time.minute += 60;
          hoursOverflow--;
        }

        hour = time.hour + aExtraHours + hoursOverflow;

        time.hour = hour % 24;
        daysOverflow = ICAL.helpers.trunc(hour / 24);
        if (time.hour < 0) {
          time.hour += 24;
          daysOverflow--;
        }
      }


      // Adjust month and year first, because we need to know what month the day
      // is in before adjusting it.
      if (time.month > 12) {
        yearsOverflow = ICAL.helpers.trunc((time.month - 1) / 12);
      } else if (time.month < 1) {
        yearsOverflow = ICAL.helpers.trunc(time.month / 12) - 1;
      }

      time.year += yearsOverflow;
      time.month -= 12 * yearsOverflow;

      // Now take care of the days (and adjust month if needed)
      day = time.day + aExtraDays + daysOverflow;

      if (day > 0) {
        for (;;) {
          var daysInMonth = ICAL.Time.daysInMonth(time.month, time.year);
          if (day <= daysInMonth) {
            break;
          }

          time.month++;
          if (time.month > 12) {
            time.year++;
            time.month = 1;
          }

          day -= daysInMonth;
        }
      } else {
        while (day <= 0) {
          if (time.month == 1) {
            time.year--;
            time.month = 12;
          } else {
            time.month--;
          }

          day += ICAL.Time.daysInMonth(time.month, time.year);
        }
      }

      time.day = day;
      return this;
    },

    fromUnixTime: function fromUnixTime(seconds) {
      this.zone = ICAL.Timezone.utcTimezone;
      var epoch = ICAL.Time.epochTime.clone();
      epoch.adjust(0, 0, 0, seconds);

      this.year = epoch.year;
      this.month = epoch.month;
      this.day = epoch.day;
      this.hour = epoch.hour;
      this.minute = epoch.minute;
      this.second = epoch.second;
    },

    toUnixTime: function toUnixTime() {
      var offset = this.utcOffset();

      // we use the offset trick to ensure
      // that we are getting the actual UTC time
      var ms = Date.UTC(
        this.year,
        this.month - 1,
        this.day,
        this.hour,
        this.minute,
        this.second - offset
      );

      // seconds
      return ms / 1000;
    },

    /**
     * Converts time to into Object
     * which can be serialized then re-created
     * using the constructor.
     *
     * Example:
     *
     *    // toJSON will automatically be called
     *    var json = JSON.stringify(mytime);
     *
     *    var deserialized = JSON.parse(json);
     *
     *    var time = new ICAL.Time(deserialized);
     *
     */
    toJSON: function() {
      var copy = [
        'year',
        'month',
        'day',
        'hour',
        'minute',
        'second',
        'isDate'
      ];

      var result = Object.create(null);

      var i = 0;
      var len = copy.length;
      var prop;

      for (; i < len; i++) {
        prop = copy[i];
        result[prop] = this[prop];
      }

      if (this.zone) {
        result.timezone = this.zone.tzid;
      }

      return result;
    }

  };

  (function setupNormalizeAttributes() {
    // This needs to run before any instances are created!
    function defineAttr(attr) {
      Object.defineProperty(ICAL.Time.prototype, attr, {
        get: function getTimeAttr() {
          if (this._pendingNormalization) {
            this._normalize();
            this._pendingNormalization = false;
          }

          return this._time[attr];
        },
        set: function setTimeAttr(val) {
          this._pendingNormalization = true;
          this._time[attr] = val;

          return val;
        }
      });

    }

    if ("defineProperty" in Object) {
      defineAttr("year");
      defineAttr("month");
      defineAttr("day");
      defineAttr("hour");
      defineAttr("minute");
      defineAttr("second");
      defineAttr("isDate");
    }
  })();

  ICAL.Time.daysInMonth = function icaltime_daysInMonth(month, year) {
    var _daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var days = 30;

    if (month < 1 || month > 12) return days;

    days = _daysInMonth[month];

    if (month == 2) {
      days += ICAL.Time.is_leap_year(year);
    }

    return days;
  };

  ICAL.Time.is_leap_year = function icaltime_is_leap_year(year) {
    if (year <= 1752) {
      return ((year % 4) == 0);
    } else {
      return (((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0));
    }
  };

  ICAL.Time.fromDayOfYear = function icaltime_fromDayOfYear(aDayOfYear, aYear) {
    var year = aYear;
    var doy = aDayOfYear;
    var tt = new ICAL.Time();
    tt.auto_normalize = false;
    var is_leap = (ICAL.Time.is_leap_year(year) ? 1 : 0);

    if (doy < 1) {
      year--;
      is_leap = (ICAL.Time.is_leap_year(year) ? 1 : 0);
      doy += ICAL.Time._days_in_year_passed_month[is_leap][12];
    } else if (doy > ICAL.Time._days_in_year_passed_month[is_leap][12]) {
      is_leap = (ICAL.Time.is_leap_year(year) ? 1 : 0);
      doy -= ICAL.Time._days_in_year_passed_month[is_leap][12];
      year++;
    }

    tt.year = year;
    tt.isDate = true;

    for (var month = 11; month >= 0; month--) {
      if (doy > ICAL.Time._days_in_year_passed_month[is_leap][month]) {
        tt.month = month + 1;
        tt.day = doy - ICAL.Time._days_in_year_passed_month[is_leap][month];
        break;
      }
    }

    tt.auto_normalize = true;
    return tt;
  };

  ICAL.Time.fromStringv2 = function fromString(str) {
    return new ICAL.Time({
      year: parseInt(str.substr(0, 4), 10),
      month: parseInt(str.substr(5, 2), 10),
      day: parseInt(str.substr(8, 2), 10),
      isDate: true
    });
  };

  ICAL.Time.fromDateString = function(aValue, aProp) {
    // Dates should have no timezone.
    // Google likes to sometimes specify Z on dates
    // we specifically ignore that to avoid issues.

    // YYYY-MM-DD
    // 2012-10-10
    return new ICAL.Time({
      year: ICAL.helpers.strictParseInt(aValue.substr(0, 4)),
      month: ICAL.helpers.strictParseInt(aValue.substr(5, 2)),
      day: ICAL.helpers.strictParseInt(aValue.substr(8, 2)),
      isDate: true
    });
  };

  ICAL.Time.fromDateTimeString = function(aValue, prop) {
    if (aValue.length < 19) {
      throw new Error(
        'invalid date-time value: "' + aValue + '"'
      );
    }

    var zone;

    if (aValue[19] === 'Z') {
      zone = 'Z';
    } else if (prop) {
      zone = prop.getParameter('tzid');
    }

    // 2012-10-10T10:10:10(Z)?
    var time = new ICAL.Time({
      year: ICAL.helpers.strictParseInt(aValue.substr(0, 4)),
      month: ICAL.helpers.strictParseInt(aValue.substr(5, 2)),
      day: ICAL.helpers.strictParseInt(aValue.substr(8, 2)),
      hour: ICAL.helpers.strictParseInt(aValue.substr(11, 2)),
      minute: ICAL.helpers.strictParseInt(aValue.substr(14, 2)),
      second: ICAL.helpers.strictParseInt(aValue.substr(17, 2)),
      timezone: zone
    });

    return time;
  };

  ICAL.Time.fromString = function fromString(aValue) {
    if (aValue.length > 10) {
      return ICAL.Time.fromDateTimeString(aValue);
    } else {
      return ICAL.Time.fromDateString(aValue);
    }
  };

  ICAL.Time.fromJSDate = function fromJSDate(aDate, useUTC) {
    var tt = new ICAL.Time();
    return tt.fromJSDate(aDate, useUTC);
  };

  ICAL.Time.fromData = function fromData(aData) {
    var t = new ICAL.Time();
    return t.fromData(aData);
  };

  ICAL.Time.now = function icaltime_now() {
    return ICAL.Time.fromJSDate(new Date(), false);
  };

  ICAL.Time.weekOneStarts = function weekOneStarts(aYear, aWeekStart) {
    var t = ICAL.Time.fromData({
      year: aYear,
      month: 1,
      day: 4,
      isDate: true
    });

    var fourth_dow = t.dayOfWeek();
    t.day += (1 - fourth_dow) + ((aWeekStart || ICAL.Time.SUNDAY) - 1);
    return t;
  };

  ICAL.Time.epochTime = ICAL.Time.fromData({
    year: 1970,
    month: 1,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0,
    isDate: false,
    timezone: "Z"
  });

  ICAL.Time._cmp_attr = function _cmp_attr(a, b, attr) {
    if (a[attr] > b[attr]) return 1;
    if (a[attr] < b[attr]) return -1;
    return 0;
  };

  ICAL.Time._days_in_year_passed_month = [
    [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365],
    [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335, 366]
  ];


  ICAL.Time.SUNDAY = 1;
  ICAL.Time.MONDAY = 2;
  ICAL.Time.TUESDAY = 3;
  ICAL.Time.WEDNESDAY = 4;
  ICAL.Time.THURSDAY = 5;
  ICAL.Time.FRIDAY = 6;
  ICAL.Time.SATURDAY = 7;

  ICAL.Time.DEFAULT_WEEK_START = ICAL.Time.MONDAY;
})();
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2011-2012 */



(typeof(ICAL) === 'undefined')? ICAL = {} : '';
(function() {

  var DOW_MAP = {
    SU: ICAL.Time.SUNDAY,
    MO: ICAL.Time.MONDAY,
    TU: ICAL.Time.TUESDAY,
    WE: ICAL.Time.WEDNESDAY,
    TH: ICAL.Time.THURSDAY,
    FR: ICAL.Time.FRIDAY,
    SA: ICAL.Time.SATURDAY
  };

  var REVERSE_DOW_MAP = {};
  for (var key in DOW_MAP) {
    REVERSE_DOW_MAP[DOW_MAP[key]] = key;
  }

  var COPY_PARTS = ["BYSECOND", "BYMINUTE", "BYHOUR", "BYDAY",
                    "BYMONTHDAY", "BYYEARDAY", "BYWEEKNO",
                    "BYMONTH", "BYSETPOS"];

  ICAL.Recur = function icalrecur(data) {
    this.wrappedJSObject = this;
    this.parts = {};

    if (typeof(data) === 'object') {
      for (var key in data) {
        this[key] = data[key];
      }

      if (this.until && !(this.until instanceof ICAL.Time)) {
        this.until = new ICAL.Time(this.until);
      }
    }

    if (!this.parts) {
      this.parts = {};
    }
  };

  ICAL.Recur.prototype = {

    parts: null,

    interval: 1,
    wkst: ICAL.Time.MONDAY,
    until: null,
    count: null,
    freq: null,
    icalclass: "icalrecur",
    icaltype: "recur",

    iterator: function(aStart) {
      return new ICAL.RecurIterator({
        rule: this,
        dtstart: aStart
      });
    },

    clone: function clone() {
      return new ICAL.Recur(this.toJSON());
    },

    isFinite: function isfinite() {
      return !!(this.count || this.until);
    },

    isByCount: function isbycount() {
      return !!(this.count && !this.until);
    },

    addComponent: function addPart(aType, aValue) {
      if (!(aType in this.parts)) {
        this.parts[aType] = [aValue];
      } else {
        this.parts[aType].push(aValue);
      }
    },

    setComponent: function setComponent(aType, aValues) {
      this.parts[aType] = aValues;
    },

    getComponent: function getComponent(aType, aCount) {
      var ucName = aType.toUpperCase();
      var components = (ucName in this.parts ? this.parts[ucName] : []);

      if (aCount) aCount.value = components.length;
      return components;
    },

    getNextOccurrence: function getNextOccurrence(aStartTime, aRecurrenceId) {
      var iter = this.iterator(aStartTime);
      var next, cdt;

      do {
        next = iter.next();
      } while (next && next.compare(aRecurrenceId) <= 0);

      if (next && aRecurrenceId.zone) {
        next.zone = aRecurrenceId.zone;
      }

      return next;
    },

    toJSON: function() {
      //XXX: extract this list up to proto?
      var propsToCopy = [
        "freq",
        "count",
        "until",
        "wkst",
        "interval",
        "parts"
      ];

      var result = Object.create(null);

      var i = 0;
      var len = propsToCopy.length;
      var prop;

      for (; i < len; i++) {
        var prop = propsToCopy[i];
        result[prop] = this[prop];
      }

      if (result.until instanceof ICAL.Time) {
        result.until = result.until.toJSON();
      }

      return result;
    },

    toString: function icalrecur_toString() {
      // TODO retain order
      var str = "FREQ=" + this.freq;
      if (this.count) {
        str += ";COUNT=" + this.count;
      }
      if (this.interval > 1) {
        str += ";INTERVAL=" + this.interval;
      }
      for (var k in this.parts) {
        str += ";" + k + "=" + this.parts[k];
      }
      if (this.until ){
        str += ';UNTIL=' + this.until.toString();
      }
      if ('wkst' in this && this.wkst !== ICAL.Time.DEFAULT_WEEK_START) {
        str += ';WKST=' + ICAL.Recur.numericDayToIcalDay(this.wkst);
      }
      return str;
    }
  };

  function parseNumericValue(type, min, max, value) {
    var result = value;

    if (value[0] === '+') {
      result = value.substr(1);
    }

    result = ICAL.helpers.strictParseInt(result);

    if (min !== undefined && value < min) {
      throw new Error(
        type + ': invalid value "' + value + '" must be > ' + min
      );
    }

    if (max !== undefined && value > max) {
      throw new Error(
        type + ': invalid value "' + value + '" must be < ' + min
      );
    }

    return result;
  }

  /**
   * Convert an ical representation of a day (SU, MO, etc..)
   * into a numeric value of that day.
   *
   * @param {String} day ical day.
   * @return {Numeric} numeric value of given day.
   */
  ICAL.Recur.icalDayToNumericDay = function toNumericDay(string) {
    //XXX: this is here so we can deal
    //     with possibly invalid string values.

    return DOW_MAP[string];
  };

  /**
   * Convert a numeric day value into its ical representation (SU, MO, etc..)
   *
   * @param {Numeric} numeric value of given day.
   * @return {String} day ical day.
   */
  ICAL.Recur.numericDayToIcalDay = function toIcalDay(num) {
    //XXX: this is here so we can deal with possibly invalid number values.
    //     Also, this allows consistent mapping between day numbers and day
    //     names for external users.
    return REVERSE_DOW_MAP[num];
  };

  var VALID_DAY_NAMES = /^(SU|MO|TU|WE|TH|FR|SA)$/;
  var VALID_BYDAY_PART = /^([+-])?(5[0-3]|[1-4][0-9]|[1-9])?(SU|MO|TU|WE|TH|FR|SA)$/
  var ALLOWED_FREQ = ['SECONDLY', 'MINUTELY', 'HOURLY',
                      'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];

  var optionDesign = {
    FREQ: function(value, dict) {
      // yes this is actually equal or faster then regex.
      // upside here is we can enumerate the valid values.
      if (ALLOWED_FREQ.indexOf(value) !== -1) {
        dict.freq = value;
      } else {
        throw new Error(
          'invalid frequency "' + value + '" expected: "' +
          ALLOWED_FREQ.join(', ') + '"'
        );
      }
    },

    COUNT: function(value, dict) {
      dict.count = ICAL.helpers.strictParseInt(value);
    },

    INTERVAL: function(value, dict) {
      dict.interval = ICAL.helpers.strictParseInt(value);
      if (dict.interval < 1) {
        // 0 or negative values are not allowed, some engines seem to generate
        // it though. Assume 1 instead.
        dict.interval = 1;
      }
    },

    UNTIL: function(value, dict) {
      dict.until = ICAL.Time.fromString(value);
    },

    WKST: function(value, dict) {
      if (VALID_DAY_NAMES.test(value)) {
        dict.wkst = ICAL.Recur.icalDayToNumericDay(value);
      } else {
        throw new Error('invalid WKST value "' + value + '"');
      }
    }
  };

  var partDesign = {
    BYSECOND: parseNumericValue.bind(this, 'BYSECOND', 0, 60),
    BYMINUTE: parseNumericValue.bind(this, 'BYMINUTE', 0, 59),
    BYHOUR: parseNumericValue.bind(this, 'BYHOUR', 0, 23),
    BYDAY: function(value) {
      if (VALID_BYDAY_PART.test(value)) {
        return value;
      } else {
        throw new Error('invalid BYDAY value "' + value + '"');
      }
    },
    BYMONTHDAY: parseNumericValue.bind(this, 'BYMONTHDAY', -31, 31),
    BYYEARDAY: parseNumericValue.bind(this, 'BYYEARDAY', -366, 366),
    BYWEEKNO: parseNumericValue.bind(this, 'BYWEEKNO', -53, 53),
    BYMONTH: parseNumericValue.bind(this, 'BYMONTH', 0, 12),
    BYSETPOS: parseNumericValue.bind(this, 'BYSETPOS', -366, 366)
  };

  ICAL.Recur.fromString = function(string) {
    var dict = Object.create(null);
    var dictParts = dict.parts = Object.create(null);

    // split is slower in FF but fast enough.
    // v8 however this is faster then manual split?
    var values = string.split(';');
    var len = values.length;

    for (var i = 0; i < len; i++) {
      var parts = values[i].split('=');
      var name = parts[0];
      var value = parts[1];

      if (name in partDesign) {
        var partArr = value.split(',');
        var partArrIdx = 0;
        var partArrLen = partArr.length;

        for (; partArrIdx < partArrLen; partArrIdx++) {
          partArr[partArrIdx] = partDesign[name](partArr[partArrIdx]);
        }
        dictParts[name] = partArr;
      } else if (name in optionDesign) {
        optionDesign[name](value, dict);
      }
    }

    return new ICAL.Recur(dict);
  };

})();
ICAL.RecurIterator = (function() {

  /**
   * Options:
   *  - rule: (ICAL.Recur) instance
   *  - dtstart: (ICAL.Time) start date of recurrence rule
   *  - initialized: (Boolean) when true will assume options
   *                           are from previously constructed
   *                           iterator and will not re-initialize
   *                           iterator but resume its state from given data.
   *
   *  - by_data: (for iterator de-serialization)
   *  - days: "
   *  - last: "
   *  - by_indices: "
   */
  function icalrecur_iterator(options) {
    this.fromData(options);
  }

  icalrecur_iterator.prototype = {

    /**
     * True when iteration is finished.
     */
    completed: false,

    rule: null,
    dtstart: null,
    last: null,
    occurrence_number: 0,
    by_indices: null,
    initialized: false,
    by_data: null,

    days: null,
    days_index: 0,

    fromData: function(options) {
      this.rule = ICAL.helpers.formatClassType(options.rule, ICAL.Recur);

      if (!this.rule) {
        throw new Error('iterator requires a (ICAL.Recur) rule');
      }

      this.dtstart = ICAL.helpers.formatClassType(options.dtstart, ICAL.Time);

      if (!this.dtstart) {
        throw new Error('iterator requires a (ICAL.Time) dtstart');
      }

      if (options.by_data) {
        this.by_data = options.by_data;
      } else {
        this.by_data = ICAL.helpers.clone(this.rule.parts, true);
      }

      if (options.occurrence_number)
        this.occurrence_number = options.occurrence_number;

      this.days = options.days || [];
      this.last = ICAL.helpers.formatClassType(options.last, ICAL.Time);

      this.by_indices = options.by_indices;

      if (!this.by_indices) {
        this.by_indices = {
          "BYSECOND": 0,
          "BYMINUTE": 0,
          "BYHOUR": 0,
          "BYDAY": 0,
          "BYMONTH": 0,
          "BYWEEKNO": 0,
          "BYMONTHDAY": 0
        };
      }

      this.initialized = options.initialized || false;

      if (!this.initialized) {
        this.init();
      }
    },

    init: function icalrecur_iterator_init() {
      this.initialized = true;
      this.last = this.dtstart.clone();
      var parts = this.by_data;

      if ("BYDAY" in parts) {
        // libical does this earlier when the rule is loaded, but we postpone to
        // now so we can preserve the original order.
        this.sort_byday_rules(parts.BYDAY, this.rule.wkst);
      }

      // If the BYYEARDAY appares, no other date rule part may appear
      if ("BYYEARDAY" in parts) {
        if ("BYMONTH" in parts || "BYWEEKNO" in parts ||
            "BYMONTHDAY" in parts || "BYDAY" in parts) {
          throw new Error("Invalid BYYEARDAY rule");
        }
      }

      // BYWEEKNO and BYMONTHDAY rule parts may not both appear
      if ("BYWEEKNO" in parts && "BYMONTHDAY" in parts) {
        throw new Error("BYWEEKNO does not fit to BYMONTHDAY");
      }

      // For MONTHLY recurrences (FREQ=MONTHLY) neither BYYEARDAY nor
      // BYWEEKNO may appear.
      if (this.rule.freq == "MONTHLY" &&
          ("BYYEARDAY" in parts || "BYWEEKNO" in parts)) {
        throw new Error("For MONTHLY recurrences neither BYYEARDAY nor BYWEEKNO may appear");
      }

      // For WEEKLY recurrences (FREQ=WEEKLY) neither BYMONTHDAY nor
      // BYYEARDAY may appear.
      if (this.rule.freq == "WEEKLY" &&
          ("BYYEARDAY" in parts || "BYMONTHDAY" in parts)) {
        throw new Error("For WEEKLY recurrences neither BYMONTHDAY nor BYYEARDAY may appear");
      }

      // BYYEARDAY may only appear in YEARLY rules
      if (this.rule.freq != "YEARLY" && "BYYEARDAY" in parts) {
        throw new Error("BYYEARDAY may only appear in YEARLY rules");
      }

      this.last.second = this.setup_defaults("BYSECOND", "SECONDLY", this.dtstart.second);
      this.last.minute = this.setup_defaults("BYMINUTE", "MINUTELY", this.dtstart.minute);
      this.last.hour = this.setup_defaults("BYHOUR", "HOURLY", this.dtstart.hour);
      this.last.day = this.setup_defaults("BYMONTHDAY", "DAILY", this.dtstart.day);
      this.last.month = this.setup_defaults("BYMONTH", "MONTHLY", this.dtstart.month);

      if (this.rule.freq == "WEEKLY") {
        if ("BYDAY" in parts) {
          var parts = this.ruleDayOfWeek(parts.BYDAY[0]);
          var pos = parts[0];
          var rule_dow = parts[1];
          var dow = rule_dow - this.last.dayOfWeek();
          if ((this.last.dayOfWeek() < rule_dow && dow >= 0) || dow < 0) {
            // Initial time is after first day of BYDAY data
            this.last.day += dow;
          }
        } else {
          var dayName = ICAL.Recur.numericDayToIcalDay(this.dtstart.dayOfWeek());
          parts.BYDAY = [dayName];
        }
      }

      if (this.rule.freq == "YEARLY") {
        for (;;) {
          this.expand_year_days(this.last.year);
          if (this.days.length > 0) {
            break;
          }
          this.increment_year(this.rule.interval);
        }

        var next = ICAL.Time.fromDayOfYear(this.days[0], this.last.year);

        this.last.day = next.day;
        this.last.month = next.month;
      }

      if (this.rule.freq == "MONTHLY" && this.has_by_data("BYDAY")) {

        var coded_day = this.by_data.BYDAY[this.by_indices.BYDAY];
        var parts = this.ruleDayOfWeek(coded_day);
        var pos = parts[0];
        var dow = parts[1];

        var daysInMonth = ICAL.Time.daysInMonth(this.last.month, this.last.year);
        var poscount = 0;

        if (pos >= 0) {
          for (this.last.day = 1; this.last.day <= daysInMonth; this.last.day++) {
            if (this.last.dayOfWeek() == dow) {
              if (++poscount == pos || pos == 0) {
                break;
              }
            }
          }
        } else {
          pos = -pos;
          for (this.last.day = daysInMonth; this.last.day != 0; this.last.day--) {
            if (this.last.dayOfWeek() == dow) {
              if (++poscount == pos) {
                break;
              }
            }
          }
        }

        //XXX: This feels like a hack, but we need to initialize
        //     the BYMONTHDAY case correctly and byDayAndMonthDay handles
        //     this case. It accepts a special flag which will avoid incrementing
        //     the initial value without the flag days that match the start time
        //     would be missed.
        if (this.has_by_data('BYMONTHDAY')) {
          this._byDayAndMonthDay(true);
        }

        if (this.last.day > daysInMonth || this.last.day == 0) {
          throw new Error("Malformed values in BYDAY part");
        }

      } else if (this.has_by_data("BYMONTHDAY")) {
        if (this.last.day < 0) {
          var daysInMonth = ICAL.Time.daysInMonth(this.last.month, this.last.year);
          this.last.day = daysInMonth + this.last.day + 1;
        }
      }

    },

    next: function icalrecur_iterator_next() {
      var before = (this.last ? this.last.clone() : null);

      if ((this.rule.count && this.occurrence_number >= this.rule.count) ||
          (this.rule.until && this.last.compare(this.rule.until) > 0)) {

        //XXX: right now this is just a flag and has no impact
        //     we can simplify the above case to check for completed later.
        this.completed = true;

        return null;
      }

      if (this.occurrence_number == 0 && this.last.compare(this.dtstart) >= 0) {
        // First of all, give the instance that was initialized
        this.occurrence_number++;
        return this.last;
      }

      do {
        var valid = 1;

        switch (this.rule.freq) {
        case "SECONDLY":
          this.next_second();
          break;
        case "MINUTELY":
          this.next_minute();
          break;
        case "HOURLY":
          this.next_hour();
          break;
        case "DAILY":
          this.next_day();
          break;
        case "WEEKLY":
          this.next_week();
          break;
        case "MONTHLY":
          valid = this.next_month();
          break;
        case "YEARLY":
          this.next_year();
          break;

        default:
          return null;
        }
      } while (!this.check_contracting_rules() ||
               this.last.compare(this.dtstart) < 0 ||
               !valid);

      // TODO is this valid?
      if (this.last.compare(before) == 0) {
        throw new Error("Same occurrence found twice, protecting " +
                        "you from death by recursion");
      }

      if (this.rule.until && this.last.compare(this.rule.until) > 0) {
        this.completed = true;
        return null;
      } else {
        this.occurrence_number++;
        return this.last;
      }
    },

    next_second: function next_second() {
      return this.next_generic("BYSECOND", "SECONDLY", "second", "minute");
    },

    increment_second: function increment_second(inc) {
      return this.increment_generic(inc, "second", 60, "minute");
    },

    next_minute: function next_minute() {
      return this.next_generic("BYMINUTE", "MINUTELY",
                               "minute", "hour", "next_second");
    },

    increment_minute: function increment_minute(inc) {
      return this.increment_generic(inc, "minute", 60, "hour");
    },

    next_hour: function next_hour() {
      return this.next_generic("BYHOUR", "HOURLY", "hour",
                               "monthday", "next_minute");
    },

    increment_hour: function increment_hour(inc) {
      this.increment_generic(inc, "hour", 24, "monthday");
    },

    next_day: function next_day() {
      var has_by_day = ("BYDAY" in this.by_data);
      var this_freq = (this.rule.freq == "DAILY");

      if (this.next_hour() == 0) {
        return 0;
      }

      if (this_freq) {
        this.increment_monthday(this.rule.interval);
      } else {
        this.increment_monthday(1);
      }

      return 0;
    },

    next_week: function next_week() {
      var end_of_data = 0;

      if (this.next_weekday_by_week() == 0) {
        return end_of_data;
      }

      if (this.has_by_data("BYWEEKNO")) {
        var idx = ++this.by_indices.BYWEEKNO;

        if (this.by_indices.BYWEEKNO == this.by_data.BYWEEKNO.length) {
          this.by_indices.BYWEEKNO = 0;
          end_of_data = 1;
        }

        // HACK should be first month of the year
        this.last.month = 1;
        this.last.day = 1;

        var week_no = this.by_data.BYWEEKNO[this.by_indices.BYWEEKNO];

        this.last.day += 7 * week_no;

        if (end_of_data) {
          this.increment_year(1);
        }
      } else {
        // Jump to the next week
        this.increment_monthday(7 * this.rule.interval);
      }

      return end_of_data;
    },

    /**
     * normalize each by day rule for a given year/month.
     * Takes into account ordering and negative rules
     *
     * @param {Numeric} year current year.
     * @param {Numeric} month current month.
     * @param {Array} rules array of rules.
     *
     * @return {Array} sorted and normalized rules.
     *                 Negative rules will be expanded to their
     *                 correct positive values for easier processing.
     */
    normalizeByMonthDayRules: function(year, month, rules) {
      var daysInMonth = ICAL.Time.daysInMonth(month, year);

      // XXX: This is probably bad for performance to allocate
      //      a new array for each month we scan, if possible
      //      we should try to optimize this...
      var newRules = [];

      var ruleIdx = 0;
      var len = rules.length;
      var rule;

      for (; ruleIdx < len; ruleIdx++) {
        rule = rules[ruleIdx];

        // if this rule falls outside of given
        // month discard it.
        if (Math.abs(rule) > daysInMonth) {
          continue;
        }

        // negative case
        if (rule < 0) {
          // we add (not subtract its a negative number)
          // one from the rule because 1 === last day of month
          rule = daysInMonth + (rule + 1);
        } else if (rule === 0) {
          // skip zero its invalid.
          continue;
        }

        // only add unique items...
        if (newRules.indexOf(rule) === -1) {
          newRules.push(rule);
        }

      }

      // unique and sort
      return newRules.sort(function(a,b){return a - b});
    },

    /**
     * NOTES:
     * We are given a list of dates in the month (BYMONTHDAY) (23, etc..)
     * Also we are given a list of days (BYDAY) (MO, 2SU, etc..) when
     * both conditions match a given date (this.last.day) iteration stops.
     *
     * @param {Boolean} [isInit] when given true will not
     *                           increment the current day (this.last).
     */
    _byDayAndMonthDay: function(isInit) {
      var byMonthDay; // setup in initMonth
      var byDay = this.by_data.BYDAY;

      var date;
      var dateIdx = 0;
      var dateLen; // setup in initMonth
      var dayLen = byDay.length;

      // we are not valid by default
      var dataIsValid = 0;

      var daysInMonth;
      var self = this;
      // we need a copy of this, because a DateTime gets normalized
      // automatically if the day is out of range. At some points we 
      // set the last day to 0 to start counting.
      var lastDay = this.last.day;

      function initMonth() {
        daysInMonth = ICAL.Time.daysInMonth(
          self.last.month, self.last.year
        );

        byMonthDay = self.normalizeByMonthDayRules(
          self.last.year,
          self.last.month,
          self.by_data.BYMONTHDAY
        );

        dateLen = byMonthDay.length;

        // For the case of more than one occurrence in one month
        // we have to be sure to start searching after the last
        // found date or at the last BYMONTHDAY.
        while (byMonthDay[dateIdx] <= lastDay && dateIdx < dateLen - 1) {
          dateIdx++;
        }
      }

      function nextMonth() {
        // since the day is incremented at the start
        // of the loop below, we need to start at 0
        lastDay = 0;
        self.increment_month();
        dateIdx = 0;
        initMonth();
      }

      initMonth();

      // should come after initMonth
      if (isInit) {
        lastDay -= 1;
      }

      while (!dataIsValid) {
        // increment the current date. This is really
        // important otherwise we may fall into the infinite
        // loop trap. The initial date takes care of the case
        // where the current date is the date we are looking
        // for.
        date = lastDay + 1;

        if (date > daysInMonth) {
          nextMonth();
          continue;
        }

        // find next date
        var next = byMonthDay[dateIdx++];

        // this logic is dependant on the BYMONTHDAYS
        // being in order (which is done by #normalizeByMonthDayRules)
        if (next >= date) {
          // if the next month day is in the future jump to it.
          lastDay = next;
        } else {
          // in this case the 'next' monthday has past
          // we must move to the month.
          nextMonth();
          continue;
        }

        // Now we can loop through the day rules to see
        // if one matches the current month date.
        for (var dayIdx = 0; dayIdx < dayLen; dayIdx++) {
          var parts = this.ruleDayOfWeek(byDay[dayIdx]);
          var pos = parts[0];
          var dow = parts[1];

          this.last.day = lastDay;
          if (this.last.isNthWeekDay(dow, pos)) {
            // when we find the valid one we can mark
            // the conditions as met and break the loop.
            // (Because we have this condition above
            //  it will also break the parent loop).
            dataIsValid = 1;
            break;
          }
        }

        // Its completely possible that the combination
        // cannot be matched in the current month.
        // When we reach the end of possible combinations
        // in the current month we iterate to the next one.
        // since dateIdx is incremented right after getting
        // "next", we don't need dateLen -1 here.
        if (!dataIsValid && dateIdx === dateLen) {
          nextMonth();
          continue;
        }
      }

      return dataIsValid;
    },

    next_month: function next_month() {
      var this_freq = (this.rule.freq == "MONTHLY");
      var data_valid = 1;

      if (this.next_hour() == 0) {
        return data_valid;
      }

      if (this.has_by_data("BYDAY") && this.has_by_data("BYMONTHDAY")) {
        data_valid = this._byDayAndMonthDay();
      } else if (this.has_by_data("BYDAY")) {
        var daysInMonth = ICAL.Time.daysInMonth(this.last.month, this.last.year);
        var setpos = 0;

        if (this.has_by_data("BYSETPOS")) {
          var last_day = this.last.day;
          for (var day = 1; day <= daysInMonth; day++) {
            this.last.day = day;
            if (this.is_day_in_byday(this.last) && day <= last_day) {
              setpos++;
            }
          }
          this.last.day = last_day;
        }

        for (var day = this.last.day + 1; day <= daysInMonth; day++) {
          this.last.day = day;

          if (this.is_day_in_byday(this.last)) {
            if (!this.has_by_data("BYSETPOS") ||
                this.check_set_position(++setpos) ||
                this.check_set_position(setpos - this.by_data.BYSETPOS.length - 1)) {

              data_valid = 1;
              break;
            }
          }
        }

        if (day > daysInMonth) {
          this.last.day = 1;
          this.increment_month();

          if (this.is_day_in_byday(this.last)) {
            if (!this.has_by_data("BYSETPOS") || this.check_set_position(1)) {
              data_valid = 1;
            }
          } else {
            data_valid = 0;
          }
        }
      } else if (this.has_by_data("BYMONTHDAY")) {
        this.by_indices.BYMONTHDAY++;

        if (this.by_indices.BYMONTHDAY >= this.by_data.BYMONTHDAY.length) {
          this.by_indices.BYMONTHDAY = 0;
          this.increment_month();
        }

        var daysInMonth = ICAL.Time.daysInMonth(this.last.month, this.last.year);

        var day = this.by_data.BYMONTHDAY[this.by_indices.BYMONTHDAY];

        if (day < 0) {
          day = daysInMonth + day + 1;
        }

        if (day > daysInMonth) {
          this.last.day = 1;
          data_valid = this.is_day_in_byday(this.last);
        } else {
          this.last.day = day;
        }

      } else {
        this.last.day = this.by_data.BYMONTHDAY[0];
        this.increment_month();
        var daysInMonth = ICAL.Time.daysInMonth(this.last.month, this.last.year);
        this.last.day = Math.min(this.last.day, daysInMonth);
      }

      return data_valid;
    },

    next_weekday_by_week: function next_weekday_by_week() {
      var end_of_data = 0;

      if (this.next_hour() == 0) {
        return end_of_data;
      }

      if (!this.has_by_data("BYDAY")) {
        return 1;
      }

      for (;;) {
        var tt = new ICAL.Time();
        this.by_indices.BYDAY++;

        if (this.by_indices.BYDAY == Object.keys(this.by_data.BYDAY).length) {
          this.by_indices.BYDAY = 0;
          end_of_data = 1;
        }

        var coded_day = this.by_data.BYDAY[this.by_indices.BYDAY];
        var parts = this.ruleDayOfWeek(coded_day);
        var dow = parts[1];

        dow -= this.rule.wkst;

        if (dow < 0) {
          dow += 7;
        }

        tt.year = this.last.year;
        tt.month = this.last.month;
        tt.day = this.last.day;

        var startOfWeek = tt.startDoyWeek(this.rule.wkst);

        if (dow + startOfWeek < 1) {
          // The selected date is in the previous year
          if (!end_of_data) {
            continue;
          }
        }

        var next = ICAL.Time.fromDayOfYear(startOfWeek + dow,
                                                  this.last.year);

        /**
         * The normalization horrors below are due to
         * the fact that when the year/month/day changes
         * it can effect the other operations that come after.
         */
        this.last.year = next.year;
        this.last.month = next.month;
        this.last.day = next.day;

        return end_of_data;
      }
    },

    next_year: function next_year() {

      if (this.next_hour() == 0) {
        return 0;
      }

      if (++this.days_index == this.days.length) {
        this.days_index = 0;
        do {
          this.increment_year(this.rule.interval);
          this.expand_year_days(this.last.year);
        } while (this.days.length == 0);
      }

      var next = ICAL.Time.fromDayOfYear(this.days[this.days_index],
                                                this.last.year);

      this.last.day = next.day;
      this.last.month = next.month;

      return 1;
    },

    ruleDayOfWeek: function ruleDayOfWeek(dow) {
      var matches = dow.match(/([+-]?[0-9])?(MO|TU|WE|TH|FR|SA|SU)/);
      if (matches) {
        var pos = parseInt(matches[1] || 0, 10);
        dow = ICAL.Recur.icalDayToNumericDay(matches[2]);
        return [pos, dow];
      } else {
        return [0, 0];
      }
    },

    next_generic: function next_generic(aRuleType, aInterval, aDateAttr,
                                        aFollowingAttr, aPreviousIncr) {
      var has_by_rule = (aRuleType in this.by_data);
      var this_freq = (this.rule.freq == aInterval);
      var end_of_data = 0;

      if (aPreviousIncr && this[aPreviousIncr]() == 0) {
        return end_of_data;
      }

      if (has_by_rule) {
        this.by_indices[aRuleType]++;
        var idx = this.by_indices[aRuleType];
        var dta = this.by_data[aRuleType];

        if (this.by_indices[aRuleType] == dta.length) {
          this.by_indices[aRuleType] = 0;
          end_of_data = 1;
        }
        this.last[aDateAttr] = dta[this.by_indices[aRuleType]];
      } else if (this_freq) {
        this["increment_" + aDateAttr](this.rule.interval);
      }

      if (has_by_rule && end_of_data && this_freq) {
        this["increment_" + aFollowingAttr](1);
      }

      return end_of_data;
    },

    increment_monthday: function increment_monthday(inc) {
      for (var i = 0; i < inc; i++) {
        var daysInMonth = ICAL.Time.daysInMonth(this.last.month, this.last.year);
        this.last.day++;

        if (this.last.day > daysInMonth) {
          this.last.day -= daysInMonth;
          this.increment_month();
        }
      }
    },

    increment_month: function increment_month() {
      this.last.day = 1;
      if (this.has_by_data("BYMONTH")) {
        this.by_indices.BYMONTH++;

        if (this.by_indices.BYMONTH == this.by_data.BYMONTH.length) {
          this.by_indices.BYMONTH = 0;
          this.increment_year(1);
        }

        this.last.month = this.by_data.BYMONTH[this.by_indices.BYMONTH];
      } else {
        if (this.rule.freq == "MONTHLY") {
          this.last.month += this.rule.interval;
        } else {
          this.last.month++;
        }

        this.last.month--;
        var years = ICAL.helpers.trunc(this.last.month / 12);
        this.last.month %= 12;
        this.last.month++;

        if (years != 0) {
          this.increment_year(years);
        }
      }
    },

    increment_year: function increment_year(inc) {
      this.last.year += inc;
    },

    increment_generic: function increment_generic(inc, aDateAttr,
                                                  aFactor, aNextIncrement) {
      this.last[aDateAttr] += inc;
      var nextunit = ICAL.helpers.trunc(this.last[aDateAttr] / aFactor);
      this.last[aDateAttr] %= aFactor;
      if (nextunit != 0) {
        this["increment_" + aNextIncrement](nextunit);
      }
    },

    has_by_data: function has_by_data(aRuleType) {
      return (aRuleType in this.rule.parts);
    },

    expand_year_days: function expand_year_days(aYear) {
      var t = new ICAL.Time();
      this.days = [];

      // We need our own copy with a few keys set
      var parts = {};
      var rules = ["BYDAY", "BYWEEKNO", "BYMONTHDAY", "BYMONTH", "BYYEARDAY"];
      for (var p in rules) {
        var part = rules[p];
        if (part in this.rule.parts) {
          parts[part] = this.rule.parts[part];
        }
      }

      if ("BYMONTH" in parts && "BYWEEKNO" in parts) {
        var valid = 1;
        var validWeeks = {};
        t.year = aYear;
        t.isDate = true;

        for (var monthIdx = 0; monthIdx < this.by_data.BYMONTH.length; monthIdx++) {
          var month = this.by_data.BYMONTH[monthIdx];
          t.month = month;
          t.day = 1;
          var first_week = t.weekNumber(this.rule.wkst);
          t.day = ICAL.Time.daysInMonth(month, aYear);
          var last_week = t.weekNumber(this.rule.wkst);
          for (monthIdx = first_week; monthIdx < last_week; monthIdx++) {
            validWeeks[monthIdx] = 1;
          }
        }

        for (var weekIdx = 0; weekIdx < this.by_data.BYWEEKNO.length && valid; weekIdx++) {
          var weekno = this.by_data.BYWEEKNO[weekIdx];
          if (weekno < 52) {
            valid &= validWeeks[weekIdx];
          } else {
            valid = 0;
          }
        }

        if (valid) {
          delete parts.BYMONTH;
        } else {
          delete parts.BYWEEKNO;
        }
      }

      var partCount = Object.keys(parts).length;

      if (partCount == 0) {
        var t = this.dtstart.clone();
        t.year = this.last.year;
        this.days.push(t.dayOfYear());
      } else if (partCount == 1 && "BYMONTH" in parts) {
        for (var monthkey in this.by_data.BYMONTH) {
          var t2 = this.dtstart.clone();
          t2.year = aYear;
          t2.month = this.by_data.BYMONTH[monthkey];
          t2.isDate = true;
          this.days.push(t2.dayOfYear());
        }
      } else if (partCount == 1 && "BYMONTHDAY" in parts) {
        for (var monthdaykey in this.by_data.BYMONTHDAY) {
          var t2 = this.dtstart.clone();
          t2.day = this.by_data.BYMONTHDAY[monthdaykey];
          t2.year = aYear;
          t2.isDate = true;
          this.days.push(t2.dayOfYear());
        }
      } else if (partCount == 2 &&
                 "BYMONTHDAY" in parts &&
                 "BYMONTH" in parts) {
        for (var monthkey in this.by_data.BYMONTH) {
          for (var monthdaykey in this.by_data.BYMONTHDAY) {
            t.day = this.by_data.BYMONTHDAY[monthdaykey];
            t.month = this.by_data.BYMONTH[monthkey];
            t.year = aYear;
            t.isDate = true;

            this.days.push(t.dayOfYear());
          }
        }
      } else if (partCount == 1 && "BYWEEKNO" in parts) {
        // TODO unimplemented in libical
      } else if (partCount == 2 &&
                 "BYWEEKNO" in parts &&
                 "BYMONTHDAY" in parts) {
        // TODO unimplemented in libical
      } else if (partCount == 1 && "BYDAY" in parts) {
        this.days = this.days.concat(this.expand_by_day(aYear));
      } else if (partCount == 2 && "BYDAY" in parts && "BYMONTH" in parts) {
        for (var monthkey in this.by_data.BYMONTH) {
          month = this.by_data.BYMONTH[monthkey];
          var daysInMonth = ICAL.Time.daysInMonth(month, aYear);

          t.year = aYear;
          t.month = this.by_data.BYMONTH[monthkey];
          t.day = 1;
          t.isDate = true;

          var first_dow = t.dayOfWeek();
          var doy_offset = t.dayOfYear() - 1;

          t.day = daysInMonth;
          var last_dow = t.dayOfWeek();

          if (this.has_by_data("BYSETPOS")) {
            var set_pos_counter = 0;
            var by_month_day = [];
            for (var day = 1; day <= daysInMonth; day++) {
              t.day = day;
              if (this.is_day_in_byday(t)) {
                by_month_day.push(day);
              }
            }

            for (var spIndex = 0; spIndex < by_month_day.length; spIndex++) {
              if (this.check_set_position(spIndex + 1) ||
                  this.check_set_position(spIndex - by_month_day.length)) {
                this.days.push(doy_offset + by_month_day[spIndex]);
              }
            }
          } else {
            for (var daycodedkey in this.by_data.BYDAY) {
              //TODO: This should return dates in order of occurrence
              //      (1,2,3, etc...) instead of by weekday (su, mo, etc..)
              var coded_day = this.by_data.BYDAY[daycodedkey];
              var parts = this.ruleDayOfWeek(coded_day);
              var pos = parts[0];
              var dow = parts[1];
              var month_day;

              var first_matching_day = ((dow + 7 - first_dow) % 7) + 1;
              var last_matching_day = daysInMonth - ((last_dow + 7 - dow) % 7);

              if (pos == 0) {
                for (var day = first_matching_day; day <= daysInMonth; day += 7) {
                  this.days.push(doy_offset + day);
                }
              } else if (pos > 0) {
                month_day = first_matching_day + (pos - 1) * 7;

                if (month_day <= daysInMonth) {
                  this.days.push(doy_offset + month_day);
                }
              } else {
                month_day = last_matching_day + (pos + 1) * 7;

                if (month_day > 0) {
                  this.days.push(doy_offset + month_day);
                }
              }
            }
          }
        }
      } else if (partCount == 2 && "BYDAY" in parts && "BYMONTHDAY" in parts) {
        var expandedDays = this.expand_by_day(aYear);

        for (var daykey in expandedDays) {
          var day = expandedDays[daykey];
          var tt = ICAL.Time.fromDayOfYear(day, aYear);
          if (this.by_data.BYMONTHDAY.indexOf(tt.day) >= 0) {
            this.days.push(day);
          }
        }
      } else if (partCount == 3 &&
                 "BYDAY" in parts &&
                 "BYMONTHDAY" in parts &&
                 "BYMONTH" in parts) {
        var expandedDays = this.expand_by_day(aYear);

        for (var daykey in expandedDays) {
          var day = expandedDays[daykey];
          var tt = ICAL.Time.fromDayOfYear(day, aYear);

          if (this.by_data.BYMONTH.indexOf(tt.month) >= 0 &&
              this.by_data.BYMONTHDAY.indexOf(tt.day) >= 0) {
            this.days.push(day);
          }
        }
      } else if (partCount == 2 && "BYDAY" in parts && "BYWEEKNO" in parts) {
        var expandedDays = this.expand_by_day(aYear);

        for (var daykey in expandedDays) {
          var day = expandedDays[daykey];
          var tt = ICAL.Time.fromDayOfYear(day, aYear);
          var weekno = tt.weekNumber(this.rule.wkst);

          if (this.by_data.BYWEEKNO.indexOf(weekno)) {
            this.days.push(day);
          }
        }
      } else if (partCount == 3 &&
                 "BYDAY" in parts &&
                 "BYWEEKNO" in parts &&
                 "BYMONTHDAY" in parts) {
        // TODO unimplemted in libical
      } else if (partCount == 1 && "BYYEARDAY" in parts) {
        this.days = this.days.concat(this.by_data.BYYEARDAY);
      } else {
        this.days = [];
      }
      return 0;
    },

    expand_by_day: function expand_by_day(aYear) {

      var days_list = [];
      var tmp = this.last.clone();

      tmp.year = aYear;
      tmp.month = 1;
      tmp.day = 1;
      tmp.isDate = true;

      var start_dow = tmp.dayOfWeek();

      tmp.month = 12;
      tmp.day = 31;
      tmp.isDate = true;

      var end_dow = tmp.dayOfWeek();
      var end_year_day = tmp.dayOfYear();

      for (var daykey in this.by_data.BYDAY) {
        var day = this.by_data.BYDAY[daykey];
        var parts = this.ruleDayOfWeek(day);
        var pos = parts[0];
        var dow = parts[1];

        if (pos == 0) {
          var tmp_start_doy = ((dow + 7 - start_dow) % 7) + 1;

          for (var doy = tmp_start_doy; doy <= end_year_day; doy += 7) {
            days_list.push(doy);
          }

        } else if (pos > 0) {
          var first;
          if (dow >= start_dow) {
            first = dow - start_dow + 1;
          } else {
            first = dow - start_dow + 8;
          }

          days_list.push(first + (pos - 1) * 7);
        } else {
          var last;
          pos = -pos;

          if (dow <= end_dow) {
            last = end_year_day - end_dow + dow;
          } else {
            last = end_year_day - end_dow + dow - 7;
          }

          days_list.push(last - (pos - 1) * 7);
        }
      }
      return days_list;
    },

    is_day_in_byday: function is_day_in_byday(tt) {
      for (var daykey in this.by_data.BYDAY) {
        var day = this.by_data.BYDAY[daykey];
        var parts = this.ruleDayOfWeek(day);
        var pos = parts[0];
        var dow = parts[1];
        var this_dow = tt.dayOfWeek();

        if ((pos == 0 && dow == this_dow) ||
            (tt.nthWeekDay(dow, pos) == tt.day)) {
          return 1;
        }
      }

      return 0;
    },

    /**
     * Checks if given value is in BYSETPOS.
     *
     * @param {Numeric} aPos position to check for.
     * @return {Boolean} false unless BYSETPOS rules exist
     *                   and the given value is present in rules.
     */
    check_set_position: function check_set_position(aPos) {
      if (this.has_by_data('BYSETPOS')) {
        var idx = this.by_data.BYSETPOS.indexOf(aPos);
        // negative numbers are not false-y
        return idx !== -1;
      }
      return false;
    },

    sort_byday_rules: function icalrecur_sort_byday_rules(aRules, aWeekStart) {
      for (var i = 0; i < aRules.length; i++) {
        for (var j = 0; j < i; j++) {
          var one = this.ruleDayOfWeek(aRules[j])[1];
          var two = this.ruleDayOfWeek(aRules[i])[1];
          one -= aWeekStart;
          two -= aWeekStart;
          if (one < 0) one += 7;
          if (two < 0) two += 7;

          if (one > two) {
            var tmp = aRules[i];
            aRules[i] = aRules[j];
            aRules[j] = tmp;
          }
        }
      }
    },

    check_contract_restriction: function check_contract_restriction(aRuleType, v) {
      var indexMapValue = icalrecur_iterator._indexMap[aRuleType];
      var ruleMapValue = icalrecur_iterator._expandMap[this.rule.freq][indexMapValue];
      var pass = false;

      if (aRuleType in this.by_data &&
          ruleMapValue == icalrecur_iterator.CONTRACT) {

        var ruleType = this.by_data[aRuleType];

        for (var bydatakey in ruleType) {
          if (ruleType[bydatakey] == v) {
            pass = true;
            break;
          }
        }
      } else {
        // Not a contracting byrule or has no data, test passes
        pass = true;
      }
      return pass;
    },

    check_contracting_rules: function check_contracting_rules() {
      var dow = this.last.dayOfWeek();
      var weekNo = this.last.weekNumber(this.rule.wkst);
      var doy = this.last.dayOfYear();

      return (this.check_contract_restriction("BYSECOND", this.last.second) &&
              this.check_contract_restriction("BYMINUTE", this.last.minute) &&
              this.check_contract_restriction("BYHOUR", this.last.hour) &&
              this.check_contract_restriction("BYDAY", ICAL.Recur.numericDayToIcalDay(dow)) &&
              this.check_contract_restriction("BYWEEKNO", weekNo) &&
              this.check_contract_restriction("BYMONTHDAY", this.last.day) &&
              this.check_contract_restriction("BYMONTH", this.last.month) &&
              this.check_contract_restriction("BYYEARDAY", doy));
    },

    setup_defaults: function setup_defaults(aRuleType, req, deftime) {
      var indexMapValue = icalrecur_iterator._indexMap[aRuleType];
      var ruleMapValue = icalrecur_iterator._expandMap[this.rule.freq][indexMapValue];

      if (ruleMapValue != icalrecur_iterator.CONTRACT) {
        if (!(aRuleType in this.by_data)) {
          this.by_data[aRuleType] = [deftime];
        }
        if (this.rule.freq != req) {
          return this.by_data[aRuleType][0];
        }
      }
      return deftime;
    },

    /**
     * Convert iterator into a serialize-able object.
     * Will preserve current iteration sequence to ensure
     * the seamless continuation of the recurrence rule.
     */
    toJSON: function() {
      var result = Object.create(null);

      result.initialized = this.initialized;
      result.rule = this.rule.toJSON();
      result.dtstart = this.dtstart.toJSON();
      result.by_data = this.by_data;
      result.days = this.days;
      result.last = this.last.toJSON();
      result.by_indices = this.by_indices;
      result.occurrence_number = this.occurrence_number;

      return result;
    }

  };

  icalrecur_iterator._indexMap = {
    "BYSECOND": 0,
    "BYMINUTE": 1,
    "BYHOUR": 2,
    "BYDAY": 3,
    "BYMONTHDAY": 4,
    "BYYEARDAY": 5,
    "BYWEEKNO": 6,
    "BYMONTH": 7,
    "BYSETPOS": 8
  };

  icalrecur_iterator._expandMap = {
    "SECONDLY": [1, 1, 1, 1, 1, 1, 1, 1],
    "MINUTELY": [2, 1, 1, 1, 1, 1, 1, 1],
    "HOURLY": [2, 2, 1, 1, 1, 1, 1, 1],
    "DAILY": [2, 2, 2, 1, 1, 1, 1, 1],
    "WEEKLY": [2, 2, 2, 2, 3, 3, 1, 1],
    "MONTHLY": [2, 2, 2, 2, 2, 3, 3, 1],
    "YEARLY": [2, 2, 2, 2, 2, 2, 2, 2]
  };
  icalrecur_iterator.UNKNOWN = 0;
  icalrecur_iterator.CONTRACT = 1;
  icalrecur_iterator.EXPAND = 2;
  icalrecur_iterator.ILLEGAL = 3;

  return icalrecur_iterator;

}());
ICAL.RecurExpansion = (function() {
  function formatTime(item) {
    return ICAL.helpers.formatClassType(item, ICAL.Time);
  }

  function compareTime(a, b) {
    return a.compare(b);
  }

  function isRecurringComponent(comp) {
    return comp.hasProperty('rdate') ||
           comp.hasProperty('rrule') ||
           comp.hasProperty('recurrence-id');
  }

  /**
   * Primary class for expanding recurring rules.
   * Can take multiple rrules, rdates, exdate(s)
   * and iterate (in order) over each next occurrence.
   *
   * Once initialized this class can also be serialized
   * saved and continue iteration from the last point.
   *
   * NOTE: it is intended that this class is to be used
   *       with ICAL.Event which handles recurrence exceptions.
   *
   * Options:
   *  - dtstart: (ICAL.Time) start time of event (required)
   *  - component: (ICAL.Component) component (required unless resuming)
   *
   * Examples:
   *
   *    // assuming event is a parsed ical component
   *    var event;
   *
   *    var expand = new ICAL.RecurExpansion({
   *      component: event,
   *      start: event.getFirstPropertyValue('DTSTART')
   *    });
   *
   *    // remember there are infinite rules
   *    // so its a good idea to limit the scope
   *    // of the iterations then resume later on.
   *
   *    // next is always an ICAL.Time or null
   *    var next;
   *
   *    while(someCondition && (next = expand.next())) {
   *      // do something with next
   *    }
   *
   *    // save instance for later
   *    var json = JSON.stringify(expand);
   *
   *    //...
   *
   *    // NOTE: if the component's properties have
   *    //       changed you will need to rebuild the
   *    //       class and start over. This only works
   *    //       when the component's recurrence info is the same.
   *    var expand = new ICAL.RecurExpansion(JSON.parse(json));
   *
   *
   * @param {Object} options see options block.
   */
  function RecurExpansion(options) {
    this.ruleDates = [];
    this.exDates = [];
    this.fromData(options);
  }

  RecurExpansion.prototype = {

    /**
     * True when iteration is fully completed.
     */
    complete: false,

    /**
     * Array of rrule iterators.
     *
     * @type Array[ICAL.RecurIterator]
     * @private
     */
    ruleIterators: null,

    /**
     * Array of rdate instances.
     *
     * @type Array[ICAL.Time]
     * @private
     */
    ruleDates: null,

    /**
     * Array of exdate instances.
     *
     * @type Array[ICAL.Time]
     * @private
     */
    exDates: null,

    /**
     * Current position in ruleDates array.
     * @type Numeric
     * @private
     */
    ruleDateInc: 0,

    /**
     * Current position in exDates array
     * @type Numeric
     * @private
     */
    exDateInc: 0,

    /**
     * Current negative date.
     *
     * @type ICAL.Time
     * @private
     */
    exDate: null,

    /**
     * Current additional date.
     *
     * @type ICAL.Time
     * @private
     */
    ruleDate: null,

    /**
     * Start date of recurring rules.
     *
     * @type ICAL.Time
     */
    dtstart: null,

    /**
     * Last expanded time
     *
     * @type ICAL.Time
     */
    last: null,

    fromData: function(options) {
      var start = ICAL.helpers.formatClassType(options.dtstart, ICAL.Time);

      if (!start) {
        throw new Error('.dtstart (ICAL.Time) must be given');
      } else {
        this.dtstart = start;
      }

      if (options.component) {
        this._init(options.component);
      } else {
        this.last = formatTime(options.last);

        this.ruleIterators = options.ruleIterators.map(function(item) {
          return ICAL.helpers.formatClassType(item, ICAL.RecurIterator);
        });

        this.ruleDateInc = options.ruleDateInc;
        this.exDateInc = options.exDateInc;

        if (options.ruleDates) {
          this.ruleDates = options.ruleDates.map(formatTime);
          this.ruleDate = this.ruleDates[this.ruleDateInc];
        }

        if (options.exDates) {
          this.exDates = options.exDates.map(formatTime);
          this.exDate = this.exDates[this.exDateInc];
        }

        if (typeof(options.complete) !== 'undefined') {
          this.complete = options.complete;
        }
      }
    },

    next: function() {
      var iter;
      var ruleOfDay;
      var next;
      var compare;

      var maxTries = 500;
      var currentTry = 0;

      while (true) {
        if (currentTry++ > maxTries) {
          throw new Error(
            'max tries have occured, rule may be impossible to forfill.'
          );
        }

        next = this.ruleDate;
        iter = this._nextRecurrenceIter(this.last);

        // no more matches
        // because we increment the rule day or rule
        // _after_ we choose a value this should be
        // the only spot where we need to worry about the
        // end of events.
        if (!next && !iter) {
          // there are no more iterators or rdates
          this.complete = true;
          break;
        }

        // no next rule day or recurrence rule is first.
        if (!next || (iter && next.compare(iter.last) > 0)) {
          // must be cloned, recur will reuse the time element.
          next = iter.last.clone();
          // move to next so we can continue
          iter.next();
        }

        // if the ruleDate is still next increment it.
        if (this.ruleDate === next) {
          this._nextRuleDay();
        }

        this.last = next;

        // check the negative rules
        if (this.exDate) {
          compare = this.exDate.compare(this.last);

          if (compare < 0) {
            this._nextExDay();
          }

          // if the current rule is excluded skip it.
          if (compare === 0) {
            this._nextExDay();
            continue;
          }
        }

        //XXX: The spec states that after we resolve the final
        //     list of dates we execute exdate this seems somewhat counter
        //     intuitive to what I have seen most servers do so for now
        //     I exclude based on the original date not the one that may
        //     have been modified by the exception.
        return this.last;
      }
    },

    /**
     * Converts object into a serialize-able format.
     */
    toJSON: function() {
      function toJSON(item) {
        return item.toJSON();
      }

      var result = Object.create(null);
      result.ruleIterators = this.ruleIterators.map(toJSON);

      if (this.ruleDates) {
        result.ruleDates = this.ruleDates.map(toJSON);
      }

      if (this.exDates) {
        result.exDates = this.exDates.map(toJSON);
      }

      result.ruleDateInc = this.ruleDateInc;
      result.exDateInc = this.exDateInc;
      result.last = this.last.toJSON();
      result.dtstart = this.dtstart.toJSON();
      result.complete = this.complete;

      return result;
    },


    _extractDates: function(component, property) {
      var result = [];
      var props = component.getAllProperties(property);
      var len = props.length;
      var i = 0;
      var prop;

      var idx;

      for (; i < len; i++) {
        props[i].getValues().forEach(function(prop) {
          idx = ICAL.helpers.binsearchInsert(
            result,
            prop,
            compareTime
          );

          // ordered insert
          result.splice(idx, 0, prop);
        });
      }

      return result;
    },

    _init: function(component) {
      this.ruleIterators = [];

      this.last = this.dtstart.clone();

      // to provide api consistency non-recurring
      // events can also use the iterator though it will
      // only return a single time.
      if (!isRecurringComponent(component)) {
        this.ruleDate = this.last.clone();
        this.complete = true;
        return;
      }

      if (component.hasProperty('rdate')) {
        this.ruleDates = this._extractDates(component, 'rdate');

        // special hack for cases where first rdate is prior
        // to the start date. We only check for the first rdate.
        // This is mostly for google's crazy recurring date logic
        // (contacts birthdays).
        if ((this.ruleDates[0]) &&
            (this.ruleDates[0].compare(this.dtstart) < 0)) {

          this.ruleDateInc = 0;
          this.last = this.ruleDates[0].clone();
        } else {
          this.ruleDateInc = ICAL.helpers.binsearchInsert(
            this.ruleDates,
            this.last,
            compareTime
          );
        }

        this.ruleDate = this.ruleDates[this.ruleDateInc];
      }

      if (component.hasProperty('rrule')) {
        var rules = component.getAllProperties('rrule');
        var i = 0;
        var len = rules.length;

        var rule;
        var iter;

        for (; i < len; i++) {
          rule = rules[i].getFirstValue();
          iter = rule.iterator(this.dtstart);
          this.ruleIterators.push(iter);

          // increment to the next occurrence so future
          // calls to next return times beyond the initial iteration.
          // XXX: I find this suspicious might be a bug?
          iter.next();
        }
      }

      if (component.hasProperty('exdate')) {
        this.exDates = this._extractDates(component, 'exdate');
        // if we have a .last day we increment the index to beyond it.
        this.exDateInc = ICAL.helpers.binsearchInsert(
          this.exDates,
          this.last,
          compareTime
        );

        this.exDate = this.exDates[this.exDateInc];
      }
    },

    _nextExDay: function() {
      this.exDate = this.exDates[++this.exDateInc];
    },

    _nextRuleDay: function() {
      this.ruleDate = this.ruleDates[++this.ruleDateInc];
    },

    /**
     * Find and return the recurrence rule with the most
     * recent event and return it.
     *
     * @return {Object} iterator.
     */
    _nextRecurrenceIter: function() {
      var iters = this.ruleIterators;

      if (iters.length === 0) {
        return null;
      }

      var len = iters.length;
      var iter;
      var iterTime;
      var iterIdx = 0;
      var chosenIter;

      // loop through each iterator
      for (; iterIdx < len; iterIdx++) {
        iter = iters[iterIdx];
        iterTime = iter.last;

        // if iteration is complete
        // then we must exclude it from
        // the search and remove it.
        if (iter.completed) {
          len--;
          if (iterIdx !== 0) {
            iterIdx--;
          }
          iters.splice(iterIdx, 1);
          continue;
        }

        // find the most recent possible choice
        if (!chosenIter || chosenIter.last.compare(iterTime) > 0) {
          // that iterator is saved
          chosenIter = iter;
        }
      }

      // the chosen iterator is returned but not mutated
      // this iterator contains the most recent event.
      return chosenIter;
    }

  };

  return RecurExpansion;

}());
ICAL.Event = (function() {

  function compareRangeException(a, b) {
    if (a[0] > b[0]) return 1;
    if (b[0] > a[0]) return -1;
    return 0;
  }

  function Event(component, options) {
    if (!(component instanceof ICAL.Component)) {
      options = component;
      component = null;
    }

    if (component) {
      this.component = component;
    } else {
      this.component = new ICAL.Component('vevent');
    }

    this._rangeExceptionCache = Object.create(null);
    this.exceptions = Object.create(null);
    this.rangeExceptions = [];

    if (options && options.strictExceptions) {
      this.strictExceptions = options.strictExceptions;
    }

    if (options && options.exceptions) {
      options.exceptions.forEach(this.relateException, this);
    }
  }

  Event.prototype = {

    THISANDFUTURE: 'THISANDFUTURE',

    /**
     * List of related event exceptions.
     *
     * @type Array[ICAL.Event]
     */
    exceptions: null,

    /**
     * When true will verify exceptions are related by their UUID.
     *
     * @type {Boolean}
     */
    strictExceptions: false,

    /**
     * Relates a given event exception to this object.
     * If the given component does not share the UID of
     * this event it cannot be related and will throw an
     * exception.
     *
     * If this component is an exception it cannot have other
     * exceptions related to it.
     *
     * @param {ICAL.Component|ICAL.Event} obj component or event.
     */
    relateException: function(obj) {
      if (this.isRecurrenceException()) {
        throw new Error('cannot relate exception to exceptions');
      }

      if (obj instanceof ICAL.Component) {
        obj = new ICAL.Event(obj);
      }

      if (this.strictExceptions && obj.uid !== this.uid) {
        throw new Error('attempted to relate unrelated exception');
      }

      var id = obj.recurrenceId.toString();

      // we don't sort or manage exceptions directly
      // here the recurrence expander handles that.
      this.exceptions[id] = obj;

      // index RANGE=THISANDFUTURE exceptions so we can
      // look them up later in getOccurrenceDetails.
      if (obj.modifiesFuture()) {
        var item = [
          obj.recurrenceId.toUnixTime(), id
        ];

        // we keep them sorted so we can find the nearest
        // value later on...
        var idx = ICAL.helpers.binsearchInsert(
          this.rangeExceptions,
          item,
          compareRangeException
        );

        this.rangeExceptions.splice(idx, 0, item);
      }
    },

    /**
     * If this record is an exception and has the RANGE=THISANDFUTURE value.
     *
     * @return {Boolean} true when is exception with range.
     */
    modifiesFuture: function() {
      var range = this.component.getFirstPropertyValue('range');
      return range === this.THISANDFUTURE;
    },

    /**
     * Finds the range exception nearest to the given date.
     *
     * @param {ICAL.Time} time usually an occurrence time of an event.
     * @return {ICAL.Event|Null} the related event/exception or null.
     */
    findRangeException: function(time) {
      if (!this.rangeExceptions.length) {
        return null;
      }

      var utc = time.toUnixTime();
      var idx = ICAL.helpers.binsearchInsert(
        this.rangeExceptions,
        [utc],
        compareRangeException
      );

      idx -= 1;

      // occurs before
      if (idx < 0) {
        return null;
      }

      var rangeItem = this.rangeExceptions[idx];

      // sanity check
      if (utc < rangeItem[0]) {
        return null;
      }

      return rangeItem[1];
    },

    /**
     * Returns the occurrence details based on its start time.
     * If the occurrence has an exception will return the details
     * for that exception.
     *
     * NOTE: this method is intend to be used in conjunction
     *       with the #iterator method.
     *
     * @param {ICAL.Time} occurrence time occurrence.
     */
    getOccurrenceDetails: function(occurrence) {
      var id = occurrence.toString();
      var utcId = occurrence.convertToZone(ICAL.Timezone.utcTimezone).toString();
      var result = {
        //XXX: Clone?
        recurrenceId: occurrence
      };

      if (id in this.exceptions) {
        var item = result.item = this.exceptions[id];
        result.startDate = item.startDate;
        result.endDate = item.endDate;
        result.item = item;
      } else if (utcId in this.exceptions) {
        var item = this.exceptions[utcId];
        result.startDate = item.startDate;
        result.endDate = item.endDate;
        result.item = item;
      } else {
        // range exceptions (RANGE=THISANDFUTURE) have a
        // lower priority then direct exceptions but
        // must be accounted for first. Their item is
        // always the first exception with the range prop.
        var rangeExceptionId = this.findRangeException(
          occurrence
        );

        if (rangeExceptionId) {
          var exception = this.exceptions[rangeExceptionId];

          // range exception must modify standard time
          // by the difference (if any) in start/end times.
          result.item = exception;

          var startDiff = this._rangeExceptionCache[rangeExceptionId];

          if (!startDiff) {
            var original = exception.recurrenceId.clone();
            var newStart = exception.startDate.clone();

            // zones must be same otherwise subtract may be incorrect.
            original.zone = newStart.zone;
            var startDiff = newStart.subtractDate(original);

            this._rangeExceptionCache[rangeExceptionId] = startDiff;
          }

          var start = occurrence.clone();
          start.zone = exception.startDate.zone;
          start.addDuration(startDiff);

          var end = start.clone();
          end.addDuration(exception.duration);

          result.startDate = start;
          result.endDate = end;
        } else {
          // no range exception standard expansion
          var end = occurrence.clone();
          end.addDuration(this.duration);

          result.endDate = end;
          result.startDate = occurrence;
          result.item = this;
        }
      }

      return result;
    },

    /**
     * Builds a recur expansion instance for a specific
     * point in time (defaults to startDate).
     *
     * @return {ICAL.RecurExpansion} expander object.
     */
    iterator: function(startTime) {
      return new ICAL.RecurExpansion({
        component: this.component,
        dtstart: startTime || this.startDate
      });
    },

    isRecurring: function() {
      var comp = this.component;
      return comp.hasProperty('rrule') || comp.hasProperty('rdate');
    },

    isRecurrenceException: function() {
      return this.component.hasProperty('recurrence-id');
    },

    /**
     * Returns the types of recurrences this event may have.
     *
     * Returned as an object with the following possible keys:
     *
     *    - YEARLY
     *    - MONTHLY
     *    - WEEKLY
     *    - DAILY
     *    - MINUTELY
     *    - SECONDLY
     *
     * @return {Object} object of recurrence flags.
     */
    getRecurrenceTypes: function() {
      var rules = this.component.getAllProperties('rrule');
      var i = 0;
      var len = rules.length;
      var result = Object.create(null);

      for (; i < len; i++) {
        var value = rules[i].getFirstValue();
        result[value.freq] = true;
      }

      return result;
    },

    get uid() {
      return this._firstProp('uid');
    },

    set uid(value) {
      this._setProp('uid', value);
    },

    get startDate() {
      return this._firstProp('dtstart');
    },

    set startDate(value) {
      this._setTime('dtstart', value);
    },

    get endDate() {
      return this._firstProp('dtend');
    },

    set endDate(value) {
      this._setTime('dtend', value);
    },

    get duration() {
      return this.endDate.subtractDate(this.startDate);
    },

    get location() {
      return this._firstProp('location');
    },

    set location(value) {
      return this._setProp('location', value);
    },

    get attendees() {
      //XXX: This is way lame we should have a better
      //     data structure for this later.
      return this.component.getAllProperties('attendee');
    },

    get summary() {
      return this._firstProp('summary');
    },

    set summary(value) {
      this._setProp('summary', value);
    },

    get description() {
      return this._firstProp('description');
    },

    set description(value) {
      this._setProp('description', value);
    },

    get organizer() {
      return this._firstProp('organizer');
    },

    set organizer(value) {
      this._setProp('organizer', value);
    },

    get sequence() {
      return this._firstProp('sequence');
    },

    set sequence(value) {
      this._setProp('sequence', value);
    },

    get recurrenceId() {
      return this._firstProp('recurrence-id');
    },

    set recurrenceId(value) {
      this._setProp('recurrence-id', value);
    },

    /**
     * set/update a time property's value.
     * This will also update the TZID of the property.
     *
     * TODO: this method handles the case where we are switching
     * from a known timezone to an implied timezone (one without TZID).
     * This does _not_ handle the case of moving between a known
     *  (by TimezoneService) timezone to an unknown timezone...
     *
     * We will not add/remove/update the VTIMEZONE subcomponents
     *  leading to invalid ICAL data...
     */
    _setTime: function(propName, time) {
      var prop = this.component.getFirstProperty(propName);

      if (!prop) {
        prop = new ICAL.Property(propName);
        this.component.addProperty(prop);
      }

      // utc and local don't get a tzid
      if (
        time.zone === ICAL.Timezone.localTimezone ||
        time.zone === ICAL.Timezone.utcTimezone
      ) {
        // remove the tzid
        prop.removeParameter('tzid');
      } else {
        prop.setParameter('tzid', time.zone.tzid);
      }

      prop.setValue(time);
    },

    _setProp: function(name, value) {
      this.component.updatePropertyWithValue(name, value);
    },

    _firstProp: function(name) {
      return this.component.getFirstPropertyValue(name);
    },

    toString: function() {
      return this.component.toString();
    }

  };

  return Event;

}());
ICAL.ComponentParser = (function() {

  /**
   * Component parser initializer.
   *
   * Usage:
   *
   *    var options = {
   *      // when false no events will be emitted for type
   *      parseEvent: true,
   *      parseTimezone: true
   *    };
   *
   *    var parser = new ICAL.ComponentParser(options);
   *
   *    parser.onevent() {
   *      //...
   *    }
   *
   *    // ontimezone, etc...
   *
   *    parser.oncomplete = function() {
   *
   *    };
   *
   *    parser.process(string | component);
   *
   *
   * @param {Object} options component parser options.
   */
  function ComponentParser(options) {
    if (typeof(options) === 'undefined') {
      options = {};
    }

    var key;
    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }
  }

  ComponentParser.prototype = {

    /**
     * When true parse events
     *
     * @type Boolean
     */
    parseEvent: true,

    /**
     * when true parse timezones
     *
     * @type Boolean
     */
    parseTimezone: true,


    /* SAX like events here for reference */

    /**
     * Fired when parsing is complete
     */
    oncomplete: function() {},

    /**
     * Fired if an error occurs during parsing.
     *
     * @param {Error} err details of error.
     */
    onerror: function(err) {},

    /**
     * Fired when a top level component (vtimezone) is found
     *
     * @param {ICAL.Timezone} timezone object.
     */
    ontimezone: function(component) {},

    /*
     * Fired when a top level component (VEVENT) is found.
     * @param {ICAL.Event} component top level component.
     */
    onevent: function(component) {},

    /**
     * Process a string or parse ical object.
     * This function itself will return nothing but
     * will start the parsing process.
     *
     * Events must be registered prior to calling this method.
     *
     * @param {String|Object} ical string or parsed ical object.
     */
    process: function(ical) {
      //TODO: this is sync now in the future we will have a incremental parser.
      if (typeof(ical) === 'string') {
        ical = ICAL.parse(ical)[1];
      }

      if (!(ical instanceof ICAL.Component)) {
        ical = new ICAL.Component(ical);
      }

      var components = ical.getAllSubcomponents();
      var i = 0;
      var len = components.length;
      var component;

      for (; i < len; i++) {
        component = components[i];

        switch (component.name) {
          case 'vtimezone':
            if (this.parseTimezone) {
              var tzid = component.getFirstPropertyValue('tzid');
              if (tzid) {
                this.ontimezone(new ICAL.Timezone({
                  tzid: tzid,
                  component: component
                }));
              }
            }
            break;
          case 'vevent':
            if (this.parseEvent) {
              this.onevent(new ICAL.Event(component));
            }
            break;
          default:
            continue;
        }
      }

      //XXX: ideally we should do a "nextTick" here
      //     so in all cases this is actually async.
      this.oncomplete();
    }
  };

  return ComponentParser;

}());

/*! jQuery v2.1.1 | (c) 2005, 2014 jQuery Foundation, Inc. | jquery.org/license */
!function (a, b) { "object" == typeof module && "object" == typeof module.exports ? module.exports = a.document ? b(a, !0) : function (a) { if (!a.document) throw new Error("jQuery requires a window with a document"); return b(a) } : b(a) }("undefined" != typeof window ? window : this, function (a, b) {
	var c = [], d = c.slice, e = c.concat, f = c.push, g = c.indexOf, h = {}, i = h.toString, j = h.hasOwnProperty, k = {}, l = a.document, m = "2.1.1", n = function (a, b) { return new n.fn.init(a, b) }, o = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, p = /^-ms-/, q = /-([\da-z])/gi, r = function (a, b) { return b.toUpperCase() }; n.fn = n.prototype = { jquery: m, constructor: n, selector: "", length: 0, toArray: function () { return d.call(this) }, get: function (a) { return null != a ? 0 > a ? this[a + this.length] : this[a] : d.call(this) }, pushStack: function (a) { var b = n.merge(this.constructor(), a); return b.prevObject = this, b.context = this.context, b }, each: function (a, b) { return n.each(this, a, b) }, map: function (a) { return this.pushStack(n.map(this, function (b, c) { return a.call(b, c, b) })) }, slice: function () { return this.pushStack(d.apply(this, arguments)) }, first: function () { return this.eq(0) }, last: function () { return this.eq(-1) }, eq: function (a) { var b = this.length, c = +a + (0 > a ? b : 0); return this.pushStack(c >= 0 && b > c ? [this[c]] : []) }, end: function () { return this.prevObject || this.constructor(null) }, push: f, sort: c.sort, splice: c.splice }, n.extend = n.fn.extend = function () { var a, b, c, d, e, f, g = arguments[0] || {}, h = 1, i = arguments.length, j = !1; for ("boolean" == typeof g && (j = g, g = arguments[h] || {}, h++), "object" == typeof g || n.isFunction(g) || (g = {}), h === i && (g = this, h--) ; i > h; h++) if (null != (a = arguments[h])) for (b in a) c = g[b], d = a[b], g !== d && (j && d && (n.isPlainObject(d) || (e = n.isArray(d))) ? (e ? (e = !1, f = c && n.isArray(c) ? c : []) : f = c && n.isPlainObject(c) ? c : {}, g[b] = n.extend(j, f, d)) : void 0 !== d && (g[b] = d)); return g }, n.extend({ expando: "jQuery" + (m + Math.random()).replace(/\D/g, ""), isReady: !0, error: function (a) { throw new Error(a) }, noop: function () { }, isFunction: function (a) { return "function" === n.type(a) }, isArray: Array.isArray, isWindow: function (a) { return null != a && a === a.window }, isNumeric: function (a) { return !n.isArray(a) && a - parseFloat(a) >= 0 }, isPlainObject: function (a) { return "object" !== n.type(a) || a.nodeType || n.isWindow(a) ? !1 : a.constructor && !j.call(a.constructor.prototype, "isPrototypeOf") ? !1 : !0 }, isEmptyObject: function (a) { var b; for (b in a) return !1; return !0 }, type: function (a) { return null == a ? a + "" : "object" == typeof a || "function" == typeof a ? h[i.call(a)] || "object" : typeof a }, globalEval: function (a) { var b, c = eval; a = n.trim(a), a && (1 === a.indexOf("use strict") ? (b = l.createElement("script"), b.text = a, l.head.appendChild(b).parentNode.removeChild(b)) : c(a)) }, camelCase: function (a) { return a.replace(p, "ms-").replace(q, r) }, nodeName: function (a, b) { return a.nodeName && a.nodeName.toLowerCase() === b.toLowerCase() }, each: function (a, b, c) { var d, e = 0, f = a.length, g = s(a); if (c) { if (g) { for (; f > e; e++) if (d = b.apply(a[e], c), d === !1) break } else for (e in a) if (d = b.apply(a[e], c), d === !1) break } else if (g) { for (; f > e; e++) if (d = b.call(a[e], e, a[e]), d === !1) break } else for (e in a) if (d = b.call(a[e], e, a[e]), d === !1) break; return a }, trim: function (a) { return null == a ? "" : (a + "").replace(o, "") }, makeArray: function (a, b) { var c = b || []; return null != a && (s(Object(a)) ? n.merge(c, "string" == typeof a ? [a] : a) : f.call(c, a)), c }, inArray: function (a, b, c) { return null == b ? -1 : g.call(b, a, c) }, merge: function (a, b) { for (var c = +b.length, d = 0, e = a.length; c > d; d++) a[e++] = b[d]; return a.length = e, a }, grep: function (a, b, c) { for (var d, e = [], f = 0, g = a.length, h = !c; g > f; f++) d = !b(a[f], f), d !== h && e.push(a[f]); return e }, map: function (a, b, c) { var d, f = 0, g = a.length, h = s(a), i = []; if (h) for (; g > f; f++) d = b(a[f], f, c), null != d && i.push(d); else for (f in a) d = b(a[f], f, c), null != d && i.push(d); return e.apply([], i) }, guid: 1, proxy: function (a, b) { var c, e, f; return "string" == typeof b && (c = a[b], b = a, a = c), n.isFunction(a) ? (e = d.call(arguments, 2), f = function () { return a.apply(b || this, e.concat(d.call(arguments))) }, f.guid = a.guid = a.guid || n.guid++, f) : void 0 }, now: Date.now, support: k }), n.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function (a, b) { h["[object " + b + "]"] = b.toLowerCase() }); function s(a) { var b = a.length, c = n.type(a); return "function" === c || n.isWindow(a) ? !1 : 1 === a.nodeType && b ? !0 : "array" === c || 0 === b || "number" == typeof b && b > 0 && b - 1 in a } var t = function (a) { var b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s, t, u = "sizzle" + -new Date, v = a.document, w = 0, x = 0, y = gb(), z = gb(), A = gb(), B = function (a, b) { return a === b && (l = !0), 0 }, C = "undefined", D = 1 << 31, E = {}.hasOwnProperty, F = [], G = F.pop, H = F.push, I = F.push, J = F.slice, K = F.indexOf || function (a) { for (var b = 0, c = this.length; c > b; b++) if (this[b] === a) return b; return -1 }, L = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped", M = "[\\x20\\t\\r\\n\\f]", N = "(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+", O = N.replace("w", "w#"), P = "\\[" + M + "*(" + N + ")(?:" + M + "*([*^$|!~]?=)" + M + "*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + O + "))|)" + M + "*\\]", Q = ":(" + N + ")(?:\\((('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|((?:\\\\.|[^\\\\()[\\]]|" + P + ")*)|.*)\\)|)", R = new RegExp("^" + M + "+|((?:^|[^\\\\])(?:\\\\.)*)" + M + "+$", "g"), S = new RegExp("^" + M + "*," + M + "*"), T = new RegExp("^" + M + "*([>+~]|" + M + ")" + M + "*"), U = new RegExp("=" + M + "*([^\\]'\"]*?)" + M + "*\\]", "g"), V = new RegExp(Q), W = new RegExp("^" + O + "$"), X = { ID: new RegExp("^#(" + N + ")"), CLASS: new RegExp("^\\.(" + N + ")"), TAG: new RegExp("^(" + N.replace("w", "w*") + ")"), ATTR: new RegExp("^" + P), PSEUDO: new RegExp("^" + Q), CHILD: new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + M + "*(even|odd|(([+-]|)(\\d*)n|)" + M + "*(?:([+-]|)" + M + "*(\\d+)|))" + M + "*\\)|)", "i"), bool: new RegExp("^(?:" + L + ")$", "i"), needsContext: new RegExp("^" + M + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" + M + "*((?:-\\d)?\\d*)" + M + "*\\)|)(?=[^-]|$)", "i") }, Y = /^(?:input|select|textarea|button)$/i, Z = /^h\d$/i, $ = /^[^{]+\{\s*\[native \w/, _ = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/, ab = /[+~]/, bb = /'|\\/g, cb = new RegExp("\\\\([\\da-f]{1,6}" + M + "?|(" + M + ")|.)", "ig"), db = function (a, b, c) { var d = "0x" + b - 65536; return d !== d || c ? b : 0 > d ? String.fromCharCode(d + 65536) : String.fromCharCode(d >> 10 | 55296, 1023 & d | 56320) }; try { I.apply(F = J.call(v.childNodes), v.childNodes), F[v.childNodes.length].nodeType } catch (eb) { I = { apply: F.length ? function (a, b) { H.apply(a, J.call(b)) } : function (a, b) { var c = a.length, d = 0; while (a[c++] = b[d++]); a.length = c - 1 } } } function fb(a, b, d, e) { var f, h, j, k, l, o, r, s, w, x; if ((b ? b.ownerDocument || b : v) !== n && m(b), b = b || n, d = d || [], !a || "string" != typeof a) return d; if (1 !== (k = b.nodeType) && 9 !== k) return []; if (p && !e) { if (f = _.exec(a)) if (j = f[1]) { if (9 === k) { if (h = b.getElementById(j), !h || !h.parentNode) return d; if (h.id === j) return d.push(h), d } else if (b.ownerDocument && (h = b.ownerDocument.getElementById(j)) && t(b, h) && h.id === j) return d.push(h), d } else { if (f[2]) return I.apply(d, b.getElementsByTagName(a)), d; if ((j = f[3]) && c.getElementsByClassName && b.getElementsByClassName) return I.apply(d, b.getElementsByClassName(j)), d } if (c.qsa && (!q || !q.test(a))) { if (s = r = u, w = b, x = 9 === k && a, 1 === k && "object" !== b.nodeName.toLowerCase()) { o = g(a), (r = b.getAttribute("id")) ? s = r.replace(bb, "\\$&") : b.setAttribute("id", s), s = "[id='" + s + "'] ", l = o.length; while (l--) o[l] = s + qb(o[l]); w = ab.test(a) && ob(b.parentNode) || b, x = o.join(",") } if (x) try { return I.apply(d, w.querySelectorAll(x)), d } catch (y) { } finally { r || b.removeAttribute("id") } } } return i(a.replace(R, "$1"), b, d, e) } function gb() { var a = []; function b(c, e) { return a.push(c + " ") > d.cacheLength && delete b[a.shift()], b[c + " "] = e } return b } function hb(a) { return a[u] = !0, a } function ib(a) { var b = n.createElement("div"); try { return !!a(b) } catch (c) { return !1 } finally { b.parentNode && b.parentNode.removeChild(b), b = null } } function jb(a, b) { var c = a.split("|"), e = a.length; while (e--) d.attrHandle[c[e]] = b } function kb(a, b) { var c = b && a, d = c && 1 === a.nodeType && 1 === b.nodeType && (~b.sourceIndex || D) - (~a.sourceIndex || D); if (d) return d; if (c) while (c = c.nextSibling) if (c === b) return -1; return a ? 1 : -1 } function lb(a) { return function (b) { var c = b.nodeName.toLowerCase(); return "input" === c && b.type === a } } function mb(a) { return function (b) { var c = b.nodeName.toLowerCase(); return ("input" === c || "button" === c) && b.type === a } } function nb(a) { return hb(function (b) { return b = +b, hb(function (c, d) { var e, f = a([], c.length, b), g = f.length; while (g--) c[e = f[g]] && (c[e] = !(d[e] = c[e])) }) }) } function ob(a) { return a && typeof a.getElementsByTagName !== C && a } c = fb.support = {}, f = fb.isXML = function (a) { var b = a && (a.ownerDocument || a).documentElement; return b ? "HTML" !== b.nodeName : !1 }, m = fb.setDocument = function (a) { var b, e = a ? a.ownerDocument || a : v, g = e.defaultView; return e !== n && 9 === e.nodeType && e.documentElement ? (n = e, o = e.documentElement, p = !f(e), g && g !== g.top && (g.addEventListener ? g.addEventListener("unload", function () { m() }, !1) : g.attachEvent && g.attachEvent("onunload", function () { m() })), c.attributes = ib(function (a) { return a.className = "i", !a.getAttribute("className") }), c.getElementsByTagName = ib(function (a) { return a.appendChild(e.createComment("")), !a.getElementsByTagName("*").length }), c.getElementsByClassName = $.test(e.getElementsByClassName) && ib(function (a) { return a.innerHTML = "<div class='a'></div><div class='a i'></div>", a.firstChild.className = "i", 2 === a.getElementsByClassName("i").length }), c.getById = ib(function (a) { return o.appendChild(a).id = u, !e.getElementsByName || !e.getElementsByName(u).length }), c.getById ? (d.find.ID = function (a, b) { if (typeof b.getElementById !== C && p) { var c = b.getElementById(a); return c && c.parentNode ? [c] : [] } }, d.filter.ID = function (a) { var b = a.replace(cb, db); return function (a) { return a.getAttribute("id") === b } }) : (delete d.find.ID, d.filter.ID = function (a) { var b = a.replace(cb, db); return function (a) { var c = typeof a.getAttributeNode !== C && a.getAttributeNode("id"); return c && c.value === b } }), d.find.TAG = c.getElementsByTagName ? function (a, b) { return typeof b.getElementsByTagName !== C ? b.getElementsByTagName(a) : void 0 } : function (a, b) { var c, d = [], e = 0, f = b.getElementsByTagName(a); if ("*" === a) { while (c = f[e++]) 1 === c.nodeType && d.push(c); return d } return f }, d.find.CLASS = c.getElementsByClassName && function (a, b) { return typeof b.getElementsByClassName !== C && p ? b.getElementsByClassName(a) : void 0 }, r = [], q = [], (c.qsa = $.test(e.querySelectorAll)) && (ib(function (a) { a.innerHTML = "<select msallowclip=''><option selected=''></option></select>", a.querySelectorAll("[msallowclip^='']").length && q.push("[*^$]=" + M + "*(?:''|\"\")"), a.querySelectorAll("[selected]").length || q.push("\\[" + M + "*(?:value|" + L + ")"), a.querySelectorAll(":checked").length || q.push(":checked") }), ib(function (a) { var b = e.createElement("input"); b.setAttribute("type", "hidden"), a.appendChild(b).setAttribute("name", "D"), a.querySelectorAll("[name=d]").length && q.push("name" + M + "*[*^$|!~]?="), a.querySelectorAll(":enabled").length || q.push(":enabled", ":disabled"), a.querySelectorAll("*,:x"), q.push(",.*:") })), (c.matchesSelector = $.test(s = o.matches || o.webkitMatchesSelector || o.mozMatchesSelector || o.oMatchesSelector || o.msMatchesSelector)) && ib(function (a) { c.disconnectedMatch = s.call(a, "div"), s.call(a, "[s!='']:x"), r.push("!=", Q) }), q = q.length && new RegExp(q.join("|")), r = r.length && new RegExp(r.join("|")), b = $.test(o.compareDocumentPosition), t = b || $.test(o.contains) ? function (a, b) { var c = 9 === a.nodeType ? a.documentElement : a, d = b && b.parentNode; return a === d || !(!d || 1 !== d.nodeType || !(c.contains ? c.contains(d) : a.compareDocumentPosition && 16 & a.compareDocumentPosition(d))) } : function (a, b) { if (b) while (b = b.parentNode) if (b === a) return !0; return !1 }, B = b ? function (a, b) { if (a === b) return l = !0, 0; var d = !a.compareDocumentPosition - !b.compareDocumentPosition; return d ? d : (d = (a.ownerDocument || a) === (b.ownerDocument || b) ? a.compareDocumentPosition(b) : 1, 1 & d || !c.sortDetached && b.compareDocumentPosition(a) === d ? a === e || a.ownerDocument === v && t(v, a) ? -1 : b === e || b.ownerDocument === v && t(v, b) ? 1 : k ? K.call(k, a) - K.call(k, b) : 0 : 4 & d ? -1 : 1) } : function (a, b) { if (a === b) return l = !0, 0; var c, d = 0, f = a.parentNode, g = b.parentNode, h = [a], i = [b]; if (!f || !g) return a === e ? -1 : b === e ? 1 : f ? -1 : g ? 1 : k ? K.call(k, a) - K.call(k, b) : 0; if (f === g) return kb(a, b); c = a; while (c = c.parentNode) h.unshift(c); c = b; while (c = c.parentNode) i.unshift(c); while (h[d] === i[d]) d++; return d ? kb(h[d], i[d]) : h[d] === v ? -1 : i[d] === v ? 1 : 0 }, e) : n }, fb.matches = function (a, b) { return fb(a, null, null, b) }, fb.matchesSelector = function (a, b) { if ((a.ownerDocument || a) !== n && m(a), b = b.replace(U, "='$1']"), !(!c.matchesSelector || !p || r && r.test(b) || q && q.test(b))) try { var d = s.call(a, b); if (d || c.disconnectedMatch || a.document && 11 !== a.document.nodeType) return d } catch (e) { } return fb(b, n, null, [a]).length > 0 }, fb.contains = function (a, b) { return (a.ownerDocument || a) !== n && m(a), t(a, b) }, fb.attr = function (a, b) { (a.ownerDocument || a) !== n && m(a); var e = d.attrHandle[b.toLowerCase()], f = e && E.call(d.attrHandle, b.toLowerCase()) ? e(a, b, !p) : void 0; return void 0 !== f ? f : c.attributes || !p ? a.getAttribute(b) : (f = a.getAttributeNode(b)) && f.specified ? f.value : null }, fb.error = function (a) { throw new Error("Syntax error, unrecognized expression: " + a) }, fb.uniqueSort = function (a) { var b, d = [], e = 0, f = 0; if (l = !c.detectDuplicates, k = !c.sortStable && a.slice(0), a.sort(B), l) { while (b = a[f++]) b === a[f] && (e = d.push(f)); while (e--) a.splice(d[e], 1) } return k = null, a }, e = fb.getText = function (a) { var b, c = "", d = 0, f = a.nodeType; if (f) { if (1 === f || 9 === f || 11 === f) { if ("string" == typeof a.textContent) return a.textContent; for (a = a.firstChild; a; a = a.nextSibling) c += e(a) } else if (3 === f || 4 === f) return a.nodeValue } else while (b = a[d++]) c += e(b); return c }, d = fb.selectors = { cacheLength: 50, createPseudo: hb, match: X, attrHandle: {}, find: {}, relative: { ">": { dir: "parentNode", first: !0 }, " ": { dir: "parentNode" }, "+": { dir: "previousSibling", first: !0 }, "~": { dir: "previousSibling" } }, preFilter: { ATTR: function (a) { return a[1] = a[1].replace(cb, db), a[3] = (a[3] || a[4] || a[5] || "").replace(cb, db), "~=" === a[2] && (a[3] = " " + a[3] + " "), a.slice(0, 4) }, CHILD: function (a) { return a[1] = a[1].toLowerCase(), "nth" === a[1].slice(0, 3) ? (a[3] || fb.error(a[0]), a[4] = +(a[4] ? a[5] + (a[6] || 1) : 2 * ("even" === a[3] || "odd" === a[3])), a[5] = +(a[7] + a[8] || "odd" === a[3])) : a[3] && fb.error(a[0]), a }, PSEUDO: function (a) { var b, c = !a[6] && a[2]; return X.CHILD.test(a[0]) ? null : (a[3] ? a[2] = a[4] || a[5] || "" : c && V.test(c) && (b = g(c, !0)) && (b = c.indexOf(")", c.length - b) - c.length) && (a[0] = a[0].slice(0, b), a[2] = c.slice(0, b)), a.slice(0, 3)) } }, filter: { TAG: function (a) { var b = a.replace(cb, db).toLowerCase(); return "*" === a ? function () { return !0 } : function (a) { return a.nodeName && a.nodeName.toLowerCase() === b } }, CLASS: function (a) { var b = y[a + " "]; return b || (b = new RegExp("(^|" + M + ")" + a + "(" + M + "|$)")) && y(a, function (a) { return b.test("string" == typeof a.className && a.className || typeof a.getAttribute !== C && a.getAttribute("class") || "") }) }, ATTR: function (a, b, c) { return function (d) { var e = fb.attr(d, a); return null == e ? "!=" === b : b ? (e += "", "=" === b ? e === c : "!=" === b ? e !== c : "^=" === b ? c && 0 === e.indexOf(c) : "*=" === b ? c && e.indexOf(c) > -1 : "$=" === b ? c && e.slice(-c.length) === c : "~=" === b ? (" " + e + " ").indexOf(c) > -1 : "|=" === b ? e === c || e.slice(0, c.length + 1) === c + "-" : !1) : !0 } }, CHILD: function (a, b, c, d, e) { var f = "nth" !== a.slice(0, 3), g = "last" !== a.slice(-4), h = "of-type" === b; return 1 === d && 0 === e ? function (a) { return !!a.parentNode } : function (b, c, i) { var j, k, l, m, n, o, p = f !== g ? "nextSibling" : "previousSibling", q = b.parentNode, r = h && b.nodeName.toLowerCase(), s = !i && !h; if (q) { if (f) { while (p) { l = b; while (l = l[p]) if (h ? l.nodeName.toLowerCase() === r : 1 === l.nodeType) return !1; o = p = "only" === a && !o && "nextSibling" } return !0 } if (o = [g ? q.firstChild : q.lastChild], g && s) { k = q[u] || (q[u] = {}), j = k[a] || [], n = j[0] === w && j[1], m = j[0] === w && j[2], l = n && q.childNodes[n]; while (l = ++n && l && l[p] || (m = n = 0) || o.pop()) if (1 === l.nodeType && ++m && l === b) { k[a] = [w, n, m]; break } } else if (s && (j = (b[u] || (b[u] = {}))[a]) && j[0] === w) m = j[1]; else while (l = ++n && l && l[p] || (m = n = 0) || o.pop()) if ((h ? l.nodeName.toLowerCase() === r : 1 === l.nodeType) && ++m && (s && ((l[u] || (l[u] = {}))[a] = [w, m]), l === b)) break; return m -= e, m === d || m % d === 0 && m / d >= 0 } } }, PSEUDO: function (a, b) { var c, e = d.pseudos[a] || d.setFilters[a.toLowerCase()] || fb.error("unsupported pseudo: " + a); return e[u] ? e(b) : e.length > 1 ? (c = [a, a, "", b], d.setFilters.hasOwnProperty(a.toLowerCase()) ? hb(function (a, c) { var d, f = e(a, b), g = f.length; while (g--) d = K.call(a, f[g]), a[d] = !(c[d] = f[g]) }) : function (a) { return e(a, 0, c) }) : e } }, pseudos: { not: hb(function (a) { var b = [], c = [], d = h(a.replace(R, "$1")); return d[u] ? hb(function (a, b, c, e) { var f, g = d(a, null, e, []), h = a.length; while (h--) (f = g[h]) && (a[h] = !(b[h] = f)) }) : function (a, e, f) { return b[0] = a, d(b, null, f, c), !c.pop() } }), has: hb(function (a) { return function (b) { return fb(a, b).length > 0 } }), contains: hb(function (a) { return function (b) { return (b.textContent || b.innerText || e(b)).indexOf(a) > -1 } }), lang: hb(function (a) { return W.test(a || "") || fb.error("unsupported lang: " + a), a = a.replace(cb, db).toLowerCase(), function (b) { var c; do if (c = p ? b.lang : b.getAttribute("xml:lang") || b.getAttribute("lang")) return c = c.toLowerCase(), c === a || 0 === c.indexOf(a + "-"); while ((b = b.parentNode) && 1 === b.nodeType); return !1 } }), target: function (b) { var c = a.location && a.location.hash; return c && c.slice(1) === b.id }, root: function (a) { return a === o }, focus: function (a) { return a === n.activeElement && (!n.hasFocus || n.hasFocus()) && !!(a.type || a.href || ~a.tabIndex) }, enabled: function (a) { return a.disabled === !1 }, disabled: function (a) { return a.disabled === !0 }, checked: function (a) { var b = a.nodeName.toLowerCase(); return "input" === b && !!a.checked || "option" === b && !!a.selected }, selected: function (a) { return a.parentNode && a.parentNode.selectedIndex, a.selected === !0 }, empty: function (a) { for (a = a.firstChild; a; a = a.nextSibling) if (a.nodeType < 6) return !1; return !0 }, parent: function (a) { return !d.pseudos.empty(a) }, header: function (a) { return Z.test(a.nodeName) }, input: function (a) { return Y.test(a.nodeName) }, button: function (a) { var b = a.nodeName.toLowerCase(); return "input" === b && "button" === a.type || "button" === b }, text: function (a) { var b; return "input" === a.nodeName.toLowerCase() && "text" === a.type && (null == (b = a.getAttribute("type")) || "text" === b.toLowerCase()) }, first: nb(function () { return [0] }), last: nb(function (a, b) { return [b - 1] }), eq: nb(function (a, b, c) { return [0 > c ? c + b : c] }), even: nb(function (a, b) { for (var c = 0; b > c; c += 2) a.push(c); return a }), odd: nb(function (a, b) { for (var c = 1; b > c; c += 2) a.push(c); return a }), lt: nb(function (a, b, c) { for (var d = 0 > c ? c + b : c; --d >= 0;) a.push(d); return a }), gt: nb(function (a, b, c) { for (var d = 0 > c ? c + b : c; ++d < b;) a.push(d); return a }) } }, d.pseudos.nth = d.pseudos.eq; for (b in { radio: !0, checkbox: !0, file: !0, password: !0, image: !0 }) d.pseudos[b] = lb(b); for (b in { submit: !0, reset: !0 }) d.pseudos[b] = mb(b); function pb() { } pb.prototype = d.filters = d.pseudos, d.setFilters = new pb, g = fb.tokenize = function (a, b) { var c, e, f, g, h, i, j, k = z[a + " "]; if (k) return b ? 0 : k.slice(0); h = a, i = [], j = d.preFilter; while (h) { (!c || (e = S.exec(h))) && (e && (h = h.slice(e[0].length) || h), i.push(f = [])), c = !1, (e = T.exec(h)) && (c = e.shift(), f.push({ value: c, type: e[0].replace(R, " ") }), h = h.slice(c.length)); for (g in d.filter) !(e = X[g].exec(h)) || j[g] && !(e = j[g](e)) || (c = e.shift(), f.push({ value: c, type: g, matches: e }), h = h.slice(c.length)); if (!c) break } return b ? h.length : h ? fb.error(a) : z(a, i).slice(0) }; function qb(a) { for (var b = 0, c = a.length, d = ""; c > b; b++) d += a[b].value; return d } function rb(a, b, c) { var d = b.dir, e = c && "parentNode" === d, f = x++; return b.first ? function (b, c, f) { while (b = b[d]) if (1 === b.nodeType || e) return a(b, c, f) } : function (b, c, g) { var h, i, j = [w, f]; if (g) { while (b = b[d]) if ((1 === b.nodeType || e) && a(b, c, g)) return !0 } else while (b = b[d]) if (1 === b.nodeType || e) { if (i = b[u] || (b[u] = {}), (h = i[d]) && h[0] === w && h[1] === f) return j[2] = h[2]; if (i[d] = j, j[2] = a(b, c, g)) return !0 } } } function sb(a) { return a.length > 1 ? function (b, c, d) { var e = a.length; while (e--) if (!a[e](b, c, d)) return !1; return !0 } : a[0] } function tb(a, b, c) { for (var d = 0, e = b.length; e > d; d++) fb(a, b[d], c); return c } function ub(a, b, c, d, e) { for (var f, g = [], h = 0, i = a.length, j = null != b; i > h; h++) (f = a[h]) && (!c || c(f, d, e)) && (g.push(f), j && b.push(h)); return g } function vb(a, b, c, d, e, f) { return d && !d[u] && (d = vb(d)), e && !e[u] && (e = vb(e, f)), hb(function (f, g, h, i) { var j, k, l, m = [], n = [], o = g.length, p = f || tb(b || "*", h.nodeType ? [h] : h, []), q = !a || !f && b ? p : ub(p, m, a, h, i), r = c ? e || (f ? a : o || d) ? [] : g : q; if (c && c(q, r, h, i), d) { j = ub(r, n), d(j, [], h, i), k = j.length; while (k--) (l = j[k]) && (r[n[k]] = !(q[n[k]] = l)) } if (f) { if (e || a) { if (e) { j = [], k = r.length; while (k--) (l = r[k]) && j.push(q[k] = l); e(null, r = [], j, i) } k = r.length; while (k--) (l = r[k]) && (j = e ? K.call(f, l) : m[k]) > -1 && (f[j] = !(g[j] = l)) } } else r = ub(r === g ? r.splice(o, r.length) : r), e ? e(null, g, r, i) : I.apply(g, r) }) } function wb(a) { for (var b, c, e, f = a.length, g = d.relative[a[0].type], h = g || d.relative[" "], i = g ? 1 : 0, k = rb(function (a) { return a === b }, h, !0), l = rb(function (a) { return K.call(b, a) > -1 }, h, !0), m = [function (a, c, d) { return !g && (d || c !== j) || ((b = c).nodeType ? k(a, c, d) : l(a, c, d)) }]; f > i; i++) if (c = d.relative[a[i].type]) m = [rb(sb(m), c)]; else { if (c = d.filter[a[i].type].apply(null, a[i].matches), c[u]) { for (e = ++i; f > e; e++) if (d.relative[a[e].type]) break; return vb(i > 1 && sb(m), i > 1 && qb(a.slice(0, i - 1).concat({ value: " " === a[i - 2].type ? "*" : "" })).replace(R, "$1"), c, e > i && wb(a.slice(i, e)), f > e && wb(a = a.slice(e)), f > e && qb(a)) } m.push(c) } return sb(m) } function xb(a, b) { var c = b.length > 0, e = a.length > 0, f = function (f, g, h, i, k) { var l, m, o, p = 0, q = "0", r = f && [], s = [], t = j, u = f || e && d.find.TAG("*", k), v = w += null == t ? 1 : Math.random() || .1, x = u.length; for (k && (j = g !== n && g) ; q !== x && null != (l = u[q]) ; q++) { if (e && l) { m = 0; while (o = a[m++]) if (o(l, g, h)) { i.push(l); break } k && (w = v) } c && ((l = !o && l) && p--, f && r.push(l)) } if (p += q, c && q !== p) { m = 0; while (o = b[m++]) o(r, s, g, h); if (f) { if (p > 0) while (q--) r[q] || s[q] || (s[q] = G.call(i)); s = ub(s) } I.apply(i, s), k && !f && s.length > 0 && p + b.length > 1 && fb.uniqueSort(i) } return k && (w = v, j = t), r }; return c ? hb(f) : f } return h = fb.compile = function (a, b) { var c, d = [], e = [], f = A[a + " "]; if (!f) { b || (b = g(a)), c = b.length; while (c--) f = wb(b[c]), f[u] ? d.push(f) : e.push(f); f = A(a, xb(e, d)), f.selector = a } return f }, i = fb.select = function (a, b, e, f) { var i, j, k, l, m, n = "function" == typeof a && a, o = !f && g(a = n.selector || a); if (e = e || [], 1 === o.length) { if (j = o[0] = o[0].slice(0), j.length > 2 && "ID" === (k = j[0]).type && c.getById && 9 === b.nodeType && p && d.relative[j[1].type]) { if (b = (d.find.ID(k.matches[0].replace(cb, db), b) || [])[0], !b) return e; n && (b = b.parentNode), a = a.slice(j.shift().value.length) } i = X.needsContext.test(a) ? 0 : j.length; while (i--) { if (k = j[i], d.relative[l = k.type]) break; if ((m = d.find[l]) && (f = m(k.matches[0].replace(cb, db), ab.test(j[0].type) && ob(b.parentNode) || b))) { if (j.splice(i, 1), a = f.length && qb(j), !a) return I.apply(e, f), e; break } } } return (n || h(a, o))(f, b, !p, e, ab.test(a) && ob(b.parentNode) || b), e }, c.sortStable = u.split("").sort(B).join("") === u, c.detectDuplicates = !!l, m(), c.sortDetached = ib(function (a) { return 1 & a.compareDocumentPosition(n.createElement("div")) }), ib(function (a) { return a.innerHTML = "<a href='#'></a>", "#" === a.firstChild.getAttribute("href") }) || jb("type|href|height|width", function (a, b, c) { return c ? void 0 : a.getAttribute(b, "type" === b.toLowerCase() ? 1 : 2) }), c.attributes && ib(function (a) { return a.innerHTML = "<input/>", a.firstChild.setAttribute("value", ""), "" === a.firstChild.getAttribute("value") }) || jb("value", function (a, b, c) { return c || "input" !== a.nodeName.toLowerCase() ? void 0 : a.defaultValue }), ib(function (a) { return null == a.getAttribute("disabled") }) || jb(L, function (a, b, c) { var d; return c ? void 0 : a[b] === !0 ? b.toLowerCase() : (d = a.getAttributeNode(b)) && d.specified ? d.value : null }), fb }(a); n.find = t, n.expr = t.selectors, n.expr[":"] = n.expr.pseudos, n.unique = t.uniqueSort, n.text = t.getText, n.isXMLDoc = t.isXML, n.contains = t.contains; var u = n.expr.match.needsContext, v = /^<(\w+)\s*\/?>(?:<\/\1>|)$/, w = /^.[^:#\[\.,]*$/; function x(a, b, c) { if (n.isFunction(b)) return n.grep(a, function (a, d) { return !!b.call(a, d, a) !== c }); if (b.nodeType) return n.grep(a, function (a) { return a === b !== c }); if ("string" == typeof b) { if (w.test(b)) return n.filter(b, a, c); b = n.filter(b, a) } return n.grep(a, function (a) { return g.call(b, a) >= 0 !== c }) } n.filter = function (a, b, c) { var d = b[0]; return c && (a = ":not(" + a + ")"), 1 === b.length && 1 === d.nodeType ? n.find.matchesSelector(d, a) ? [d] : [] : n.find.matches(a, n.grep(b, function (a) { return 1 === a.nodeType })) }, n.fn.extend({ find: function (a) { var b, c = this.length, d = [], e = this; if ("string" != typeof a) return this.pushStack(n(a).filter(function () { for (b = 0; c > b; b++) if (n.contains(e[b], this)) return !0 })); for (b = 0; c > b; b++) n.find(a, e[b], d); return d = this.pushStack(c > 1 ? n.unique(d) : d), d.selector = this.selector ? this.selector + " " + a : a, d }, filter: function (a) { return this.pushStack(x(this, a || [], !1)) }, not: function (a) { return this.pushStack(x(this, a || [], !0)) }, is: function (a) { return !!x(this, "string" == typeof a && u.test(a) ? n(a) : a || [], !1).length } }); var y, z = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/, A = n.fn.init = function (a, b) { var c, d; if (!a) return this; if ("string" == typeof a) { if (c = "<" === a[0] && ">" === a[a.length - 1] && a.length >= 3 ? [null, a, null] : z.exec(a), !c || !c[1] && b) return !b || b.jquery ? (b || y).find(a) : this.constructor(b).find(a); if (c[1]) { if (b = b instanceof n ? b[0] : b, n.merge(this, n.parseHTML(c[1], b && b.nodeType ? b.ownerDocument || b : l, !0)), v.test(c[1]) && n.isPlainObject(b)) for (c in b) n.isFunction(this[c]) ? this[c](b[c]) : this.attr(c, b[c]); return this } return d = l.getElementById(c[2]), d && d.parentNode && (this.length = 1, this[0] = d), this.context = l, this.selector = a, this } return a.nodeType ? (this.context = this[0] = a, this.length = 1, this) : n.isFunction(a) ? "undefined" != typeof y.ready ? y.ready(a) : a(n) : (void 0 !== a.selector && (this.selector = a.selector, this.context = a.context), n.makeArray(a, this)) }; A.prototype = n.fn, y = n(l); var B = /^(?:parents|prev(?:Until|All))/, C = { children: !0, contents: !0, next: !0, prev: !0 }; n.extend({ dir: function (a, b, c) { var d = [], e = void 0 !== c; while ((a = a[b]) && 9 !== a.nodeType) if (1 === a.nodeType) { if (e && n(a).is(c)) break; d.push(a) } return d }, sibling: function (a, b) { for (var c = []; a; a = a.nextSibling) 1 === a.nodeType && a !== b && c.push(a); return c } }), n.fn.extend({ has: function (a) { var b = n(a, this), c = b.length; return this.filter(function () { for (var a = 0; c > a; a++) if (n.contains(this, b[a])) return !0 }) }, closest: function (a, b) { for (var c, d = 0, e = this.length, f = [], g = u.test(a) || "string" != typeof a ? n(a, b || this.context) : 0; e > d; d++) for (c = this[d]; c && c !== b; c = c.parentNode) if (c.nodeType < 11 && (g ? g.index(c) > -1 : 1 === c.nodeType && n.find.matchesSelector(c, a))) { f.push(c); break } return this.pushStack(f.length > 1 ? n.unique(f) : f) }, index: function (a) { return a ? "string" == typeof a ? g.call(n(a), this[0]) : g.call(this, a.jquery ? a[0] : a) : this[0] && this[0].parentNode ? this.first().prevAll().length : -1 }, add: function (a, b) { return this.pushStack(n.unique(n.merge(this.get(), n(a, b)))) }, addBack: function (a) { return this.add(null == a ? this.prevObject : this.prevObject.filter(a)) } }); function D(a, b) { while ((a = a[b]) && 1 !== a.nodeType); return a } n.each({ parent: function (a) { var b = a.parentNode; return b && 11 !== b.nodeType ? b : null }, parents: function (a) { return n.dir(a, "parentNode") }, parentsUntil: function (a, b, c) { return n.dir(a, "parentNode", c) }, next: function (a) { return D(a, "nextSibling") }, prev: function (a) { return D(a, "previousSibling") }, nextAll: function (a) { return n.dir(a, "nextSibling") }, prevAll: function (a) { return n.dir(a, "previousSibling") }, nextUntil: function (a, b, c) { return n.dir(a, "nextSibling", c) }, prevUntil: function (a, b, c) { return n.dir(a, "previousSibling", c) }, siblings: function (a) { return n.sibling((a.parentNode || {}).firstChild, a) }, children: function (a) { return n.sibling(a.firstChild) }, contents: function (a) { return a.contentDocument || n.merge([], a.childNodes) } }, function (a, b) { n.fn[a] = function (c, d) { var e = n.map(this, b, c); return "Until" !== a.slice(-5) && (d = c), d && "string" == typeof d && (e = n.filter(d, e)), this.length > 1 && (C[a] || n.unique(e), B.test(a) && e.reverse()), this.pushStack(e) } }); var E = /\S+/g, F = {}; function G(a) { var b = F[a] = {}; return n.each(a.match(E) || [], function (a, c) { b[c] = !0 }), b } n.Callbacks = function (a) { a = "string" == typeof a ? F[a] || G(a) : n.extend({}, a); var b, c, d, e, f, g, h = [], i = !a.once && [], j = function (l) { for (b = a.memory && l, c = !0, g = e || 0, e = 0, f = h.length, d = !0; h && f > g; g++) if (h[g].apply(l[0], l[1]) === !1 && a.stopOnFalse) { b = !1; break } d = !1, h && (i ? i.length && j(i.shift()) : b ? h = [] : k.disable()) }, k = { add: function () { if (h) { var c = h.length; !function g(b) { n.each(b, function (b, c) { var d = n.type(c); "function" === d ? a.unique && k.has(c) || h.push(c) : c && c.length && "string" !== d && g(c) }) }(arguments), d ? f = h.length : b && (e = c, j(b)) } return this }, remove: function () { return h && n.each(arguments, function (a, b) { var c; while ((c = n.inArray(b, h, c)) > -1) h.splice(c, 1), d && (f >= c && f--, g >= c && g--) }), this }, has: function (a) { return a ? n.inArray(a, h) > -1 : !(!h || !h.length) }, empty: function () { return h = [], f = 0, this }, disable: function () { return h = i = b = void 0, this }, disabled: function () { return !h }, lock: function () { return i = void 0, b || k.disable(), this }, locked: function () { return !i }, fireWith: function (a, b) { return !h || c && !i || (b = b || [], b = [a, b.slice ? b.slice() : b], d ? i.push(b) : j(b)), this }, fire: function () { return k.fireWith(this, arguments), this }, fired: function () { return !!c } }; return k }, n.extend({ Deferred: function (a) { var b = [["resolve", "done", n.Callbacks("once memory"), "resolved"], ["reject", "fail", n.Callbacks("once memory"), "rejected"], ["notify", "progress", n.Callbacks("memory")]], c = "pending", d = { state: function () { return c }, always: function () { return e.done(arguments).fail(arguments), this }, then: function () { var a = arguments; return n.Deferred(function (c) { n.each(b, function (b, f) { var g = n.isFunction(a[b]) && a[b]; e[f[1]](function () { var a = g && g.apply(this, arguments); a && n.isFunction(a.promise) ? a.promise().done(c.resolve).fail(c.reject).progress(c.notify) : c[f[0] + "With"](this === d ? c.promise() : this, g ? [a] : arguments) }) }), a = null }).promise() }, promise: function (a) { return null != a ? n.extend(a, d) : d } }, e = {}; return d.pipe = d.then, n.each(b, function (a, f) { var g = f[2], h = f[3]; d[f[1]] = g.add, h && g.add(function () { c = h }, b[1 ^ a][2].disable, b[2][2].lock), e[f[0]] = function () { return e[f[0] + "With"](this === e ? d : this, arguments), this }, e[f[0] + "With"] = g.fireWith }), d.promise(e), a && a.call(e, e), e }, when: function (a) { var b = 0, c = d.call(arguments), e = c.length, f = 1 !== e || a && n.isFunction(a.promise) ? e : 0, g = 1 === f ? a : n.Deferred(), h = function (a, b, c) { return function (e) { b[a] = this, c[a] = arguments.length > 1 ? d.call(arguments) : e, c === i ? g.notifyWith(b, c) : --f || g.resolveWith(b, c) } }, i, j, k; if (e > 1) for (i = new Array(e), j = new Array(e), k = new Array(e) ; e > b; b++) c[b] && n.isFunction(c[b].promise) ? c[b].promise().done(h(b, k, c)).fail(g.reject).progress(h(b, j, i)) : --f; return f || g.resolveWith(k, c), g.promise() } }); var H; n.fn.ready = function (a) { return n.ready.promise().done(a), this }, n.extend({ isReady: !1, readyWait: 1, holdReady: function (a) { a ? n.readyWait++ : n.ready(!0) }, ready: function (a) { (a === !0 ? --n.readyWait : n.isReady) || (n.isReady = !0, a !== !0 && --n.readyWait > 0 || (H.resolveWith(l, [n]), n.fn.triggerHandler && (n(l).triggerHandler("ready"), n(l).off("ready")))) } }); function I() { l.removeEventListener("DOMContentLoaded", I, !1), a.removeEventListener("load", I, !1), n.ready() } n.ready.promise = function (b) { return H || (H = n.Deferred(), "complete" === l.readyState ? setTimeout(n.ready) : (l.addEventListener("DOMContentLoaded", I, !1), a.addEventListener("load", I, !1))), H.promise(b) }, n.ready.promise(); var J = n.access = function (a, b, c, d, e, f, g) { var h = 0, i = a.length, j = null == c; if ("object" === n.type(c)) { e = !0; for (h in c) n.access(a, b, h, c[h], !0, f, g) } else if (void 0 !== d && (e = !0, n.isFunction(d) || (g = !0), j && (g ? (b.call(a, d), b = null) : (j = b, b = function (a, b, c) { return j.call(n(a), c) })), b)) for (; i > h; h++) b(a[h], c, g ? d : d.call(a[h], h, b(a[h], c))); return e ? a : j ? b.call(a) : i ? b(a[0], c) : f }; n.acceptData = function (a) { return 1 === a.nodeType || 9 === a.nodeType || !+a.nodeType }; function K() { Object.defineProperty(this.cache = {}, 0, { get: function () { return {} } }), this.expando = n.expando + Math.random() } K.uid = 1, K.accepts = n.acceptData, K.prototype = { key: function (a) { if (!K.accepts(a)) return 0; var b = {}, c = a[this.expando]; if (!c) { c = K.uid++; try { b[this.expando] = { value: c }, Object.defineProperties(a, b) } catch (d) { b[this.expando] = c, n.extend(a, b) } } return this.cache[c] || (this.cache[c] = {}), c }, set: function (a, b, c) { var d, e = this.key(a), f = this.cache[e]; if ("string" == typeof b) f[b] = c; else if (n.isEmptyObject(f)) n.extend(this.cache[e], b); else for (d in b) f[d] = b[d]; return f }, get: function (a, b) { var c = this.cache[this.key(a)]; return void 0 === b ? c : c[b] }, access: function (a, b, c) { var d; return void 0 === b || b && "string" == typeof b && void 0 === c ? (d = this.get(a, b), void 0 !== d ? d : this.get(a, n.camelCase(b))) : (this.set(a, b, c), void 0 !== c ? c : b) }, remove: function (a, b) { var c, d, e, f = this.key(a), g = this.cache[f]; if (void 0 === b) this.cache[f] = {}; else { n.isArray(b) ? d = b.concat(b.map(n.camelCase)) : (e = n.camelCase(b), b in g ? d = [b, e] : (d = e, d = d in g ? [d] : d.match(E) || [])), c = d.length; while (c--) delete g[d[c]] } }, hasData: function (a) { return !n.isEmptyObject(this.cache[a[this.expando]] || {}) }, discard: function (a) { a[this.expando] && delete this.cache[a[this.expando]] } }; var L = new K, M = new K, N = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/, O = /([A-Z])/g; function P(a, b, c) { var d; if (void 0 === c && 1 === a.nodeType) if (d = "data-" + b.replace(O, "-$1").toLowerCase(), c = a.getAttribute(d), "string" == typeof c) { try { c = "true" === c ? !0 : "false" === c ? !1 : "null" === c ? null : +c + "" === c ? +c : N.test(c) ? n.parseJSON(c) : c } catch (e) { } M.set(a, b, c) } else c = void 0; return c } n.extend({
		hasData: function (a) { return M.hasData(a) || L.hasData(a) }, data: function (a, b, c) { return M.access(a, b, c) }, removeData: function (a, b) {
			M.remove(a, b)
		}, _data: function (a, b, c) { return L.access(a, b, c) }, _removeData: function (a, b) { L.remove(a, b) }
	}), n.fn.extend({ data: function (a, b) { var c, d, e, f = this[0], g = f && f.attributes; if (void 0 === a) { if (this.length && (e = M.get(f), 1 === f.nodeType && !L.get(f, "hasDataAttrs"))) { c = g.length; while (c--) g[c] && (d = g[c].name, 0 === d.indexOf("data-") && (d = n.camelCase(d.slice(5)), P(f, d, e[d]))); L.set(f, "hasDataAttrs", !0) } return e } return "object" == typeof a ? this.each(function () { M.set(this, a) }) : J(this, function (b) { var c, d = n.camelCase(a); if (f && void 0 === b) { if (c = M.get(f, a), void 0 !== c) return c; if (c = M.get(f, d), void 0 !== c) return c; if (c = P(f, d, void 0), void 0 !== c) return c } else this.each(function () { var c = M.get(this, d); M.set(this, d, b), -1 !== a.indexOf("-") && void 0 !== c && M.set(this, a, b) }) }, null, b, arguments.length > 1, null, !0) }, removeData: function (a) { return this.each(function () { M.remove(this, a) }) } }), n.extend({ queue: function (a, b, c) { var d; return a ? (b = (b || "fx") + "queue", d = L.get(a, b), c && (!d || n.isArray(c) ? d = L.access(a, b, n.makeArray(c)) : d.push(c)), d || []) : void 0 }, dequeue: function (a, b) { b = b || "fx"; var c = n.queue(a, b), d = c.length, e = c.shift(), f = n._queueHooks(a, b), g = function () { n.dequeue(a, b) }; "inprogress" === e && (e = c.shift(), d--), e && ("fx" === b && c.unshift("inprogress"), delete f.stop, e.call(a, g, f)), !d && f && f.empty.fire() }, _queueHooks: function (a, b) { var c = b + "queueHooks"; return L.get(a, c) || L.access(a, c, { empty: n.Callbacks("once memory").add(function () { L.remove(a, [b + "queue", c]) }) }) } }), n.fn.extend({ queue: function (a, b) { var c = 2; return "string" != typeof a && (b = a, a = "fx", c--), arguments.length < c ? n.queue(this[0], a) : void 0 === b ? this : this.each(function () { var c = n.queue(this, a, b); n._queueHooks(this, a), "fx" === a && "inprogress" !== c[0] && n.dequeue(this, a) }) }, dequeue: function (a) { return this.each(function () { n.dequeue(this, a) }) }, clearQueue: function (a) { return this.queue(a || "fx", []) }, promise: function (a, b) { var c, d = 1, e = n.Deferred(), f = this, g = this.length, h = function () { --d || e.resolveWith(f, [f]) }; "string" != typeof a && (b = a, a = void 0), a = a || "fx"; while (g--) c = L.get(f[g], a + "queueHooks"), c && c.empty && (d++, c.empty.add(h)); return h(), e.promise(b) } }); var Q = /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source, R = ["Top", "Right", "Bottom", "Left"], S = function (a, b) { return a = b || a, "none" === n.css(a, "display") || !n.contains(a.ownerDocument, a) }, T = /^(?:checkbox|radio)$/i; !function () { var a = l.createDocumentFragment(), b = a.appendChild(l.createElement("div")), c = l.createElement("input"); c.setAttribute("type", "radio"), c.setAttribute("checked", "checked"), c.setAttribute("name", "t"), b.appendChild(c), k.checkClone = b.cloneNode(!0).cloneNode(!0).lastChild.checked, b.innerHTML = "<textarea>x</textarea>", k.noCloneChecked = !!b.cloneNode(!0).lastChild.defaultValue }(); var U = "undefined"; k.focusinBubbles = "onfocusin" in a; var V = /^key/, W = /^(?:mouse|pointer|contextmenu)|click/, X = /^(?:focusinfocus|focusoutblur)$/, Y = /^([^.]*)(?:\.(.+)|)$/; function Z() { return !0 } function $() { return !1 } function _() { try { return l.activeElement } catch (a) { } } n.event = { global: {}, add: function (a, b, c, d, e) { var f, g, h, i, j, k, l, m, o, p, q, r = L.get(a); if (r) { c.handler && (f = c, c = f.handler, e = f.selector), c.guid || (c.guid = n.guid++), (i = r.events) || (i = r.events = {}), (g = r.handle) || (g = r.handle = function (b) { return typeof n !== U && n.event.triggered !== b.type ? n.event.dispatch.apply(a, arguments) : void 0 }), b = (b || "").match(E) || [""], j = b.length; while (j--) h = Y.exec(b[j]) || [], o = q = h[1], p = (h[2] || "").split(".").sort(), o && (l = n.event.special[o] || {}, o = (e ? l.delegateType : l.bindType) || o, l = n.event.special[o] || {}, k = n.extend({ type: o, origType: q, data: d, handler: c, guid: c.guid, selector: e, needsContext: e && n.expr.match.needsContext.test(e), namespace: p.join(".") }, f), (m = i[o]) || (m = i[o] = [], m.delegateCount = 0, l.setup && l.setup.call(a, d, p, g) !== !1 || a.addEventListener && a.addEventListener(o, g, !1)), l.add && (l.add.call(a, k), k.handler.guid || (k.handler.guid = c.guid)), e ? m.splice(m.delegateCount++, 0, k) : m.push(k), n.event.global[o] = !0) } }, remove: function (a, b, c, d, e) { var f, g, h, i, j, k, l, m, o, p, q, r = L.hasData(a) && L.get(a); if (r && (i = r.events)) { b = (b || "").match(E) || [""], j = b.length; while (j--) if (h = Y.exec(b[j]) || [], o = q = h[1], p = (h[2] || "").split(".").sort(), o) { l = n.event.special[o] || {}, o = (d ? l.delegateType : l.bindType) || o, m = i[o] || [], h = h[2] && new RegExp("(^|\\.)" + p.join("\\.(?:.*\\.|)") + "(\\.|$)"), g = f = m.length; while (f--) k = m[f], !e && q !== k.origType || c && c.guid !== k.guid || h && !h.test(k.namespace) || d && d !== k.selector && ("**" !== d || !k.selector) || (m.splice(f, 1), k.selector && m.delegateCount--, l.remove && l.remove.call(a, k)); g && !m.length && (l.teardown && l.teardown.call(a, p, r.handle) !== !1 || n.removeEvent(a, o, r.handle), delete i[o]) } else for (o in i) n.event.remove(a, o + b[j], c, d, !0); n.isEmptyObject(i) && (delete r.handle, L.remove(a, "events")) } }, trigger: function (b, c, d, e) { var f, g, h, i, k, m, o, p = [d || l], q = j.call(b, "type") ? b.type : b, r = j.call(b, "namespace") ? b.namespace.split(".") : []; if (g = h = d = d || l, 3 !== d.nodeType && 8 !== d.nodeType && !X.test(q + n.event.triggered) && (q.indexOf(".") >= 0 && (r = q.split("."), q = r.shift(), r.sort()), k = q.indexOf(":") < 0 && "on" + q, b = b[n.expando] ? b : new n.Event(q, "object" == typeof b && b), b.isTrigger = e ? 2 : 3, b.namespace = r.join("."), b.namespace_re = b.namespace ? new RegExp("(^|\\.)" + r.join("\\.(?:.*\\.|)") + "(\\.|$)") : null, b.result = void 0, b.target || (b.target = d), c = null == c ? [b] : n.makeArray(c, [b]), o = n.event.special[q] || {}, e || !o.trigger || o.trigger.apply(d, c) !== !1)) { if (!e && !o.noBubble && !n.isWindow(d)) { for (i = o.delegateType || q, X.test(i + q) || (g = g.parentNode) ; g; g = g.parentNode) p.push(g), h = g; h === (d.ownerDocument || l) && p.push(h.defaultView || h.parentWindow || a) } f = 0; while ((g = p[f++]) && !b.isPropagationStopped()) b.type = f > 1 ? i : o.bindType || q, m = (L.get(g, "events") || {})[b.type] && L.get(g, "handle"), m && m.apply(g, c), m = k && g[k], m && m.apply && n.acceptData(g) && (b.result = m.apply(g, c), b.result === !1 && b.preventDefault()); return b.type = q, e || b.isDefaultPrevented() || o._default && o._default.apply(p.pop(), c) !== !1 || !n.acceptData(d) || k && n.isFunction(d[q]) && !n.isWindow(d) && (h = d[k], h && (d[k] = null), n.event.triggered = q, d[q](), n.event.triggered = void 0, h && (d[k] = h)), b.result } }, dispatch: function (a) { a = n.event.fix(a); var b, c, e, f, g, h = [], i = d.call(arguments), j = (L.get(this, "events") || {})[a.type] || [], k = n.event.special[a.type] || {}; if (i[0] = a, a.delegateTarget = this, !k.preDispatch || k.preDispatch.call(this, a) !== !1) { h = n.event.handlers.call(this, a, j), b = 0; while ((f = h[b++]) && !a.isPropagationStopped()) { a.currentTarget = f.elem, c = 0; while ((g = f.handlers[c++]) && !a.isImmediatePropagationStopped()) (!a.namespace_re || a.namespace_re.test(g.namespace)) && (a.handleObj = g, a.data = g.data, e = ((n.event.special[g.origType] || {}).handle || g.handler).apply(f.elem, i), void 0 !== e && (a.result = e) === !1 && (a.preventDefault(), a.stopPropagation())) } return k.postDispatch && k.postDispatch.call(this, a), a.result } }, handlers: function (a, b) { var c, d, e, f, g = [], h = b.delegateCount, i = a.target; if (h && i.nodeType && (!a.button || "click" !== a.type)) for (; i !== this; i = i.parentNode || this) if (i.disabled !== !0 || "click" !== a.type) { for (d = [], c = 0; h > c; c++) f = b[c], e = f.selector + " ", void 0 === d[e] && (d[e] = f.needsContext ? n(e, this).index(i) >= 0 : n.find(e, this, null, [i]).length), d[e] && d.push(f); d.length && g.push({ elem: i, handlers: d }) } return h < b.length && g.push({ elem: this, handlers: b.slice(h) }), g }, props: "altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "), fixHooks: {}, keyHooks: { props: "char charCode key keyCode".split(" "), filter: function (a, b) { return null == a.which && (a.which = null != b.charCode ? b.charCode : b.keyCode), a } }, mouseHooks: { props: "button buttons clientX clientY offsetX offsetY pageX pageY screenX screenY toElement".split(" "), filter: function (a, b) { var c, d, e, f = b.button; return null == a.pageX && null != b.clientX && (c = a.target.ownerDocument || l, d = c.documentElement, e = c.body, a.pageX = b.clientX + (d && d.scrollLeft || e && e.scrollLeft || 0) - (d && d.clientLeft || e && e.clientLeft || 0), a.pageY = b.clientY + (d && d.scrollTop || e && e.scrollTop || 0) - (d && d.clientTop || e && e.clientTop || 0)), a.which || void 0 === f || (a.which = 1 & f ? 1 : 2 & f ? 3 : 4 & f ? 2 : 0), a } }, fix: function (a) { if (a[n.expando]) return a; var b, c, d, e = a.type, f = a, g = this.fixHooks[e]; g || (this.fixHooks[e] = g = W.test(e) ? this.mouseHooks : V.test(e) ? this.keyHooks : {}), d = g.props ? this.props.concat(g.props) : this.props, a = new n.Event(f), b = d.length; while (b--) c = d[b], a[c] = f[c]; return a.target || (a.target = l), 3 === a.target.nodeType && (a.target = a.target.parentNode), g.filter ? g.filter(a, f) : a }, special: { load: { noBubble: !0 }, focus: { trigger: function () { return this !== _() && this.focus ? (this.focus(), !1) : void 0 }, delegateType: "focusin" }, blur: { trigger: function () { return this === _() && this.blur ? (this.blur(), !1) : void 0 }, delegateType: "focusout" }, click: { trigger: function () { return "checkbox" === this.type && this.click && n.nodeName(this, "input") ? (this.click(), !1) : void 0 }, _default: function (a) { return n.nodeName(a.target, "a") } }, beforeunload: { postDispatch: function (a) { void 0 !== a.result && a.originalEvent && (a.originalEvent.returnValue = a.result) } } }, simulate: function (a, b, c, d) { var e = n.extend(new n.Event, c, { type: a, isSimulated: !0, originalEvent: {} }); d ? n.event.trigger(e, null, b) : n.event.dispatch.call(b, e), e.isDefaultPrevented() && c.preventDefault() } }, n.removeEvent = function (a, b, c) { a.removeEventListener && a.removeEventListener(b, c, !1) }, n.Event = function (a, b) { return this instanceof n.Event ? (a && a.type ? (this.originalEvent = a, this.type = a.type, this.isDefaultPrevented = a.defaultPrevented || void 0 === a.defaultPrevented && a.returnValue === !1 ? Z : $) : this.type = a, b && n.extend(this, b), this.timeStamp = a && a.timeStamp || n.now(), void (this[n.expando] = !0)) : new n.Event(a, b) }, n.Event.prototype = { isDefaultPrevented: $, isPropagationStopped: $, isImmediatePropagationStopped: $, preventDefault: function () { var a = this.originalEvent; this.isDefaultPrevented = Z, a && a.preventDefault && a.preventDefault() }, stopPropagation: function () { var a = this.originalEvent; this.isPropagationStopped = Z, a && a.stopPropagation && a.stopPropagation() }, stopImmediatePropagation: function () { var a = this.originalEvent; this.isImmediatePropagationStopped = Z, a && a.stopImmediatePropagation && a.stopImmediatePropagation(), this.stopPropagation() } }, n.each({ mouseenter: "mouseover", mouseleave: "mouseout", pointerenter: "pointerover", pointerleave: "pointerout" }, function (a, b) { n.event.special[a] = { delegateType: b, bindType: b, handle: function (a) { var c, d = this, e = a.relatedTarget, f = a.handleObj; return (!e || e !== d && !n.contains(d, e)) && (a.type = f.origType, c = f.handler.apply(this, arguments), a.type = b), c } } }), k.focusinBubbles || n.each({ focus: "focusin", blur: "focusout" }, function (a, b) { var c = function (a) { n.event.simulate(b, a.target, n.event.fix(a), !0) }; n.event.special[b] = { setup: function () { var d = this.ownerDocument || this, e = L.access(d, b); e || d.addEventListener(a, c, !0), L.access(d, b, (e || 0) + 1) }, teardown: function () { var d = this.ownerDocument || this, e = L.access(d, b) - 1; e ? L.access(d, b, e) : (d.removeEventListener(a, c, !0), L.remove(d, b)) } } }), n.fn.extend({ on: function (a, b, c, d, e) { var f, g; if ("object" == typeof a) { "string" != typeof b && (c = c || b, b = void 0); for (g in a) this.on(g, b, c, a[g], e); return this } if (null == c && null == d ? (d = b, c = b = void 0) : null == d && ("string" == typeof b ? (d = c, c = void 0) : (d = c, c = b, b = void 0)), d === !1) d = $; else if (!d) return this; return 1 === e && (f = d, d = function (a) { return n().off(a), f.apply(this, arguments) }, d.guid = f.guid || (f.guid = n.guid++)), this.each(function () { n.event.add(this, a, d, c, b) }) }, one: function (a, b, c, d) { return this.on(a, b, c, d, 1) }, off: function (a, b, c) { var d, e; if (a && a.preventDefault && a.handleObj) return d = a.handleObj, n(a.delegateTarget).off(d.namespace ? d.origType + "." + d.namespace : d.origType, d.selector, d.handler), this; if ("object" == typeof a) { for (e in a) this.off(e, b, a[e]); return this } return (b === !1 || "function" == typeof b) && (c = b, b = void 0), c === !1 && (c = $), this.each(function () { n.event.remove(this, a, c, b) }) }, trigger: function (a, b) { return this.each(function () { n.event.trigger(a, b, this) }) }, triggerHandler: function (a, b) { var c = this[0]; return c ? n.event.trigger(a, b, c, !0) : void 0 } }); var ab = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi, bb = /<([\w:]+)/, cb = /<|&#?\w+;/, db = /<(?:script|style|link)/i, eb = /checked\s*(?:[^=]|=\s*.checked.)/i, fb = /^$|\/(?:java|ecma)script/i, gb = /^true\/(.*)/, hb = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g, ib = { option: [1, "<select multiple='multiple'>", "</select>"], thead: [1, "<table>", "</table>"], col: [2, "<table><colgroup>", "</colgroup></table>"], tr: [2, "<table><tbody>", "</tbody></table>"], td: [3, "<table><tbody><tr>", "</tr></tbody></table>"], _default: [0, "", ""] }; ib.optgroup = ib.option, ib.tbody = ib.tfoot = ib.colgroup = ib.caption = ib.thead, ib.th = ib.td; function jb(a, b) { return n.nodeName(a, "table") && n.nodeName(11 !== b.nodeType ? b : b.firstChild, "tr") ? a.getElementsByTagName("tbody")[0] || a.appendChild(a.ownerDocument.createElement("tbody")) : a } function kb(a) { return a.type = (null !== a.getAttribute("type")) + "/" + a.type, a } function lb(a) { var b = gb.exec(a.type); return b ? a.type = b[1] : a.removeAttribute("type"), a } function mb(a, b) { for (var c = 0, d = a.length; d > c; c++) L.set(a[c], "globalEval", !b || L.get(b[c], "globalEval")) } function nb(a, b) { var c, d, e, f, g, h, i, j; if (1 === b.nodeType) { if (L.hasData(a) && (f = L.access(a), g = L.set(b, f), j = f.events)) { delete g.handle, g.events = {}; for (e in j) for (c = 0, d = j[e].length; d > c; c++) n.event.add(b, e, j[e][c]) } M.hasData(a) && (h = M.access(a), i = n.extend({}, h), M.set(b, i)) } } function ob(a, b) { var c = a.getElementsByTagName ? a.getElementsByTagName(b || "*") : a.querySelectorAll ? a.querySelectorAll(b || "*") : []; return void 0 === b || b && n.nodeName(a, b) ? n.merge([a], c) : c } function pb(a, b) { var c = b.nodeName.toLowerCase(); "input" === c && T.test(a.type) ? b.checked = a.checked : ("input" === c || "textarea" === c) && (b.defaultValue = a.defaultValue) } n.extend({ clone: function (a, b, c) { var d, e, f, g, h = a.cloneNode(!0), i = n.contains(a.ownerDocument, a); if (!(k.noCloneChecked || 1 !== a.nodeType && 11 !== a.nodeType || n.isXMLDoc(a))) for (g = ob(h), f = ob(a), d = 0, e = f.length; e > d; d++) pb(f[d], g[d]); if (b) if (c) for (f = f || ob(a), g = g || ob(h), d = 0, e = f.length; e > d; d++) nb(f[d], g[d]); else nb(a, h); return g = ob(h, "script"), g.length > 0 && mb(g, !i && ob(a, "script")), h }, buildFragment: function (a, b, c, d) { for (var e, f, g, h, i, j, k = b.createDocumentFragment(), l = [], m = 0, o = a.length; o > m; m++) if (e = a[m], e || 0 === e) if ("object" === n.type(e)) n.merge(l, e.nodeType ? [e] : e); else if (cb.test(e)) { f = f || k.appendChild(b.createElement("div")), g = (bb.exec(e) || ["", ""])[1].toLowerCase(), h = ib[g] || ib._default, f.innerHTML = h[1] + e.replace(ab, "<$1></$2>") + h[2], j = h[0]; while (j--) f = f.lastChild; n.merge(l, f.childNodes), f = k.firstChild, f.textContent = "" } else l.push(b.createTextNode(e)); k.textContent = "", m = 0; while (e = l[m++]) if ((!d || -1 === n.inArray(e, d)) && (i = n.contains(e.ownerDocument, e), f = ob(k.appendChild(e), "script"), i && mb(f), c)) { j = 0; while (e = f[j++]) fb.test(e.type || "") && c.push(e) } return k }, cleanData: function (a) { for (var b, c, d, e, f = n.event.special, g = 0; void 0 !== (c = a[g]) ; g++) { if (n.acceptData(c) && (e = c[L.expando], e && (b = L.cache[e]))) { if (b.events) for (d in b.events) f[d] ? n.event.remove(c, d) : n.removeEvent(c, d, b.handle); L.cache[e] && delete L.cache[e] } delete M.cache[c[M.expando]] } } }), n.fn.extend({ text: function (a) { return J(this, function (a) { return void 0 === a ? n.text(this) : this.empty().each(function () { (1 === this.nodeType || 11 === this.nodeType || 9 === this.nodeType) && (this.textContent = a) }) }, null, a, arguments.length) }, append: function () { return this.domManip(arguments, function (a) { if (1 === this.nodeType || 11 === this.nodeType || 9 === this.nodeType) { var b = jb(this, a); b.appendChild(a) } }) }, prepend: function () { return this.domManip(arguments, function (a) { if (1 === this.nodeType || 11 === this.nodeType || 9 === this.nodeType) { var b = jb(this, a); b.insertBefore(a, b.firstChild) } }) }, before: function () { return this.domManip(arguments, function (a) { this.parentNode && this.parentNode.insertBefore(a, this) }) }, after: function () { return this.domManip(arguments, function (a) { this.parentNode && this.parentNode.insertBefore(a, this.nextSibling) }) }, remove: function (a, b) { for (var c, d = a ? n.filter(a, this) : this, e = 0; null != (c = d[e]) ; e++) b || 1 !== c.nodeType || n.cleanData(ob(c)), c.parentNode && (b && n.contains(c.ownerDocument, c) && mb(ob(c, "script")), c.parentNode.removeChild(c)); return this }, empty: function () { for (var a, b = 0; null != (a = this[b]) ; b++) 1 === a.nodeType && (n.cleanData(ob(a, !1)), a.textContent = ""); return this }, clone: function (a, b) { return a = null == a ? !1 : a, b = null == b ? a : b, this.map(function () { return n.clone(this, a, b) }) }, html: function (a) { return J(this, function (a) { var b = this[0] || {}, c = 0, d = this.length; if (void 0 === a && 1 === b.nodeType) return b.innerHTML; if ("string" == typeof a && !db.test(a) && !ib[(bb.exec(a) || ["", ""])[1].toLowerCase()]) { a = a.replace(ab, "<$1></$2>"); try { for (; d > c; c++) b = this[c] || {}, 1 === b.nodeType && (n.cleanData(ob(b, !1)), b.innerHTML = a); b = 0 } catch (e) { } } b && this.empty().append(a) }, null, a, arguments.length) }, replaceWith: function () { var a = arguments[0]; return this.domManip(arguments, function (b) { a = this.parentNode, n.cleanData(ob(this)), a && a.replaceChild(b, this) }), a && (a.length || a.nodeType) ? this : this.remove() }, detach: function (a) { return this.remove(a, !0) }, domManip: function (a, b) { a = e.apply([], a); var c, d, f, g, h, i, j = 0, l = this.length, m = this, o = l - 1, p = a[0], q = n.isFunction(p); if (q || l > 1 && "string" == typeof p && !k.checkClone && eb.test(p)) return this.each(function (c) { var d = m.eq(c); q && (a[0] = p.call(this, c, d.html())), d.domManip(a, b) }); if (l && (c = n.buildFragment(a, this[0].ownerDocument, !1, this), d = c.firstChild, 1 === c.childNodes.length && (c = d), d)) { for (f = n.map(ob(c, "script"), kb), g = f.length; l > j; j++) h = c, j !== o && (h = n.clone(h, !0, !0), g && n.merge(f, ob(h, "script"))), b.call(this[j], h, j); if (g) for (i = f[f.length - 1].ownerDocument, n.map(f, lb), j = 0; g > j; j++) h = f[j], fb.test(h.type || "") && !L.access(h, "globalEval") && n.contains(i, h) && (h.src ? n._evalUrl && n._evalUrl(h.src) : n.globalEval(h.textContent.replace(hb, ""))) } return this } }), n.each({ appendTo: "append", prependTo: "prepend", insertBefore: "before", insertAfter: "after", replaceAll: "replaceWith" }, function (a, b) { n.fn[a] = function (a) { for (var c, d = [], e = n(a), g = e.length - 1, h = 0; g >= h; h++) c = h === g ? this : this.clone(!0), n(e[h])[b](c), f.apply(d, c.get()); return this.pushStack(d) } }); var qb, rb = {}; function sb(b, c) { var d, e = n(c.createElement(b)).appendTo(c.body), f = a.getDefaultComputedStyle && (d = a.getDefaultComputedStyle(e[0])) ? d.display : n.css(e[0], "display"); return e.detach(), f } function tb(a) { var b = l, c = rb[a]; return c || (c = sb(a, b), "none" !== c && c || (qb = (qb || n("<iframe frameborder='0' width='0' height='0'/>")).appendTo(b.documentElement), b = qb[0].contentDocument, b.write(), b.close(), c = sb(a, b), qb.detach()), rb[a] = c), c } var ub = /^margin/, vb = new RegExp("^(" + Q + ")(?!px)[a-z%]+$", "i"), wb = function (a) { return a.ownerDocument.defaultView.getComputedStyle(a, null) }; function xb(a, b, c) { var d, e, f, g, h = a.style; return c = c || wb(a), c && (g = c.getPropertyValue(b) || c[b]), c && ("" !== g || n.contains(a.ownerDocument, a) || (g = n.style(a, b)), vb.test(g) && ub.test(b) && (d = h.width, e = h.minWidth, f = h.maxWidth, h.minWidth = h.maxWidth = h.width = g, g = c.width, h.width = d, h.minWidth = e, h.maxWidth = f)), void 0 !== g ? g + "" : g } function yb(a, b) { return { get: function () { return a() ? void delete this.get : (this.get = b).apply(this, arguments) } } } !function () { var b, c, d = l.documentElement, e = l.createElement("div"), f = l.createElement("div"); if (f.style) { f.style.backgroundClip = "content-box", f.cloneNode(!0).style.backgroundClip = "", k.clearCloneStyle = "content-box" === f.style.backgroundClip, e.style.cssText = "border:0;width:0;height:0;top:0;left:-9999px;margin-top:1px;position:absolute", e.appendChild(f); function g() { f.style.cssText = "-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;display:block;margin-top:1%;top:1%;border:1px;padding:1px;width:4px;position:absolute", f.innerHTML = "", d.appendChild(e); var g = a.getComputedStyle(f, null); b = "1%" !== g.top, c = "4px" === g.width, d.removeChild(e) } a.getComputedStyle && n.extend(k, { pixelPosition: function () { return g(), b }, boxSizingReliable: function () { return null == c && g(), c }, reliableMarginRight: function () { var b, c = f.appendChild(l.createElement("div")); return c.style.cssText = f.style.cssText = "-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box;display:block;margin:0;border:0;padding:0", c.style.marginRight = c.style.width = "0", f.style.width = "1px", d.appendChild(e), b = !parseFloat(a.getComputedStyle(c, null).marginRight), d.removeChild(e), b } }) } }(), n.swap = function (a, b, c, d) { var e, f, g = {}; for (f in b) g[f] = a.style[f], a.style[f] = b[f]; e = c.apply(a, d || []); for (f in b) a.style[f] = g[f]; return e }; var zb = /^(none|table(?!-c[ea]).+)/, Ab = new RegExp("^(" + Q + ")(.*)$", "i"), Bb = new RegExp("^([+-])=(" + Q + ")", "i"), Cb = { position: "absolute", visibility: "hidden", display: "block" }, Db = { letterSpacing: "0", fontWeight: "400" }, Eb = ["Webkit", "O", "Moz", "ms"]; function Fb(a, b) { if (b in a) return b; var c = b[0].toUpperCase() + b.slice(1), d = b, e = Eb.length; while (e--) if (b = Eb[e] + c, b in a) return b; return d } function Gb(a, b, c) { var d = Ab.exec(b); return d ? Math.max(0, d[1] - (c || 0)) + (d[2] || "px") : b } function Hb(a, b, c, d, e) { for (var f = c === (d ? "border" : "content") ? 4 : "width" === b ? 1 : 0, g = 0; 4 > f; f += 2) "margin" === c && (g += n.css(a, c + R[f], !0, e)), d ? ("content" === c && (g -= n.css(a, "padding" + R[f], !0, e)), "margin" !== c && (g -= n.css(a, "border" + R[f] + "Width", !0, e))) : (g += n.css(a, "padding" + R[f], !0, e), "padding" !== c && (g += n.css(a, "border" + R[f] + "Width", !0, e))); return g } function Ib(a, b, c) { var d = !0, e = "width" === b ? a.offsetWidth : a.offsetHeight, f = wb(a), g = "border-box" === n.css(a, "boxSizing", !1, f); if (0 >= e || null == e) { if (e = xb(a, b, f), (0 > e || null == e) && (e = a.style[b]), vb.test(e)) return e; d = g && (k.boxSizingReliable() || e === a.style[b]), e = parseFloat(e) || 0 } return e + Hb(a, b, c || (g ? "border" : "content"), d, f) + "px" } function Jb(a, b) { for (var c, d, e, f = [], g = 0, h = a.length; h > g; g++) d = a[g], d.style && (f[g] = L.get(d, "olddisplay"), c = d.style.display, b ? (f[g] || "none" !== c || (d.style.display = ""), "" === d.style.display && S(d) && (f[g] = L.access(d, "olddisplay", tb(d.nodeName)))) : (e = S(d), "none" === c && e || L.set(d, "olddisplay", e ? c : n.css(d, "display")))); for (g = 0; h > g; g++) d = a[g], d.style && (b && "none" !== d.style.display && "" !== d.style.display || (d.style.display = b ? f[g] || "" : "none")); return a } n.extend({ cssHooks: { opacity: { get: function (a, b) { if (b) { var c = xb(a, "opacity"); return "" === c ? "1" : c } } } }, cssNumber: { columnCount: !0, fillOpacity: !0, flexGrow: !0, flexShrink: !0, fontWeight: !0, lineHeight: !0, opacity: !0, order: !0, orphans: !0, widows: !0, zIndex: !0, zoom: !0 }, cssProps: { "float": "cssFloat" }, style: function (a, b, c, d) { if (a && 3 !== a.nodeType && 8 !== a.nodeType && a.style) { var e, f, g, h = n.camelCase(b), i = a.style; return b = n.cssProps[h] || (n.cssProps[h] = Fb(i, h)), g = n.cssHooks[b] || n.cssHooks[h], void 0 === c ? g && "get" in g && void 0 !== (e = g.get(a, !1, d)) ? e : i[b] : (f = typeof c, "string" === f && (e = Bb.exec(c)) && (c = (e[1] + 1) * e[2] + parseFloat(n.css(a, b)), f = "number"), null != c && c === c && ("number" !== f || n.cssNumber[h] || (c += "px"), k.clearCloneStyle || "" !== c || 0 !== b.indexOf("background") || (i[b] = "inherit"), g && "set" in g && void 0 === (c = g.set(a, c, d)) || (i[b] = c)), void 0) } }, css: function (a, b, c, d) { var e, f, g, h = n.camelCase(b); return b = n.cssProps[h] || (n.cssProps[h] = Fb(a.style, h)), g = n.cssHooks[b] || n.cssHooks[h], g && "get" in g && (e = g.get(a, !0, c)), void 0 === e && (e = xb(a, b, d)), "normal" === e && b in Db && (e = Db[b]), "" === c || c ? (f = parseFloat(e), c === !0 || n.isNumeric(f) ? f || 0 : e) : e } }), n.each(["height", "width"], function (a, b) { n.cssHooks[b] = { get: function (a, c, d) { return c ? zb.test(n.css(a, "display")) && 0 === a.offsetWidth ? n.swap(a, Cb, function () { return Ib(a, b, d) }) : Ib(a, b, d) : void 0 }, set: function (a, c, d) { var e = d && wb(a); return Gb(a, c, d ? Hb(a, b, d, "border-box" === n.css(a, "boxSizing", !1, e), e) : 0) } } }), n.cssHooks.marginRight = yb(k.reliableMarginRight, function (a, b) { return b ? n.swap(a, { display: "inline-block" }, xb, [a, "marginRight"]) : void 0 }), n.each({ margin: "", padding: "", border: "Width" }, function (a, b) { n.cssHooks[a + b] = { expand: function (c) { for (var d = 0, e = {}, f = "string" == typeof c ? c.split(" ") : [c]; 4 > d; d++) e[a + R[d] + b] = f[d] || f[d - 2] || f[0]; return e } }, ub.test(a) || (n.cssHooks[a + b].set = Gb) }), n.fn.extend({ css: function (a, b) { return J(this, function (a, b, c) { var d, e, f = {}, g = 0; if (n.isArray(b)) { for (d = wb(a), e = b.length; e > g; g++) f[b[g]] = n.css(a, b[g], !1, d); return f } return void 0 !== c ? n.style(a, b, c) : n.css(a, b) }, a, b, arguments.length > 1) }, show: function () { return Jb(this, !0) }, hide: function () { return Jb(this) }, toggle: function (a) { return "boolean" == typeof a ? a ? this.show() : this.hide() : this.each(function () { S(this) ? n(this).show() : n(this).hide() }) } }); function Kb(a, b, c, d, e) { return new Kb.prototype.init(a, b, c, d, e) } n.Tween = Kb, Kb.prototype = { constructor: Kb, init: function (a, b, c, d, e, f) { this.elem = a, this.prop = c, this.easing = e || "swing", this.options = b, this.start = this.now = this.cur(), this.end = d, this.unit = f || (n.cssNumber[c] ? "" : "px") }, cur: function () { var a = Kb.propHooks[this.prop]; return a && a.get ? a.get(this) : Kb.propHooks._default.get(this) }, run: function (a) { var b, c = Kb.propHooks[this.prop]; return this.pos = b = this.options.duration ? n.easing[this.easing](a, this.options.duration * a, 0, 1, this.options.duration) : a, this.now = (this.end - this.start) * b + this.start, this.options.step && this.options.step.call(this.elem, this.now, this), c && c.set ? c.set(this) : Kb.propHooks._default.set(this), this } }, Kb.prototype.init.prototype = Kb.prototype, Kb.propHooks = { _default: { get: function (a) { var b; return null == a.elem[a.prop] || a.elem.style && null != a.elem.style[a.prop] ? (b = n.css(a.elem, a.prop, ""), b && "auto" !== b ? b : 0) : a.elem[a.prop] }, set: function (a) { n.fx.step[a.prop] ? n.fx.step[a.prop](a) : a.elem.style && (null != a.elem.style[n.cssProps[a.prop]] || n.cssHooks[a.prop]) ? n.style(a.elem, a.prop, a.now + a.unit) : a.elem[a.prop] = a.now } } }, Kb.propHooks.scrollTop = Kb.propHooks.scrollLeft = { set: function (a) { a.elem.nodeType && a.elem.parentNode && (a.elem[a.prop] = a.now) } }, n.easing = { linear: function (a) { return a }, swing: function (a) { return .5 - Math.cos(a * Math.PI) / 2 } }, n.fx = Kb.prototype.init, n.fx.step = {}; var Lb, Mb, Nb = /^(?:toggle|show|hide)$/, Ob = new RegExp("^(?:([+-])=|)(" + Q + ")([a-z%]*)$", "i"), Pb = /queueHooks$/, Qb = [Vb], Rb = { "*": [function (a, b) { var c = this.createTween(a, b), d = c.cur(), e = Ob.exec(b), f = e && e[3] || (n.cssNumber[a] ? "" : "px"), g = (n.cssNumber[a] || "px" !== f && +d) && Ob.exec(n.css(c.elem, a)), h = 1, i = 20; if (g && g[3] !== f) { f = f || g[3], e = e || [], g = +d || 1; do h = h || ".5", g /= h, n.style(c.elem, a, g + f); while (h !== (h = c.cur() / d) && 1 !== h && --i) } return e && (g = c.start = +g || +d || 0, c.unit = f, c.end = e[1] ? g + (e[1] + 1) * e[2] : +e[2]), c }] }; function Sb() { return setTimeout(function () { Lb = void 0 }), Lb = n.now() } function Tb(a, b) { var c, d = 0, e = { height: a }; for (b = b ? 1 : 0; 4 > d; d += 2 - b) c = R[d], e["margin" + c] = e["padding" + c] = a; return b && (e.opacity = e.width = a), e } function Ub(a, b, c) { for (var d, e = (Rb[b] || []).concat(Rb["*"]), f = 0, g = e.length; g > f; f++) if (d = e[f].call(c, b, a)) return d } function Vb(a, b, c) { var d, e, f, g, h, i, j, k, l = this, m = {}, o = a.style, p = a.nodeType && S(a), q = L.get(a, "fxshow"); c.queue || (h = n._queueHooks(a, "fx"), null == h.unqueued && (h.unqueued = 0, i = h.empty.fire, h.empty.fire = function () { h.unqueued || i() }), h.unqueued++, l.always(function () { l.always(function () { h.unqueued--, n.queue(a, "fx").length || h.empty.fire() }) })), 1 === a.nodeType && ("height" in b || "width" in b) && (c.overflow = [o.overflow, o.overflowX, o.overflowY], j = n.css(a, "display"), k = "none" === j ? L.get(a, "olddisplay") || tb(a.nodeName) : j, "inline" === k && "none" === n.css(a, "float") && (o.display = "inline-block")), c.overflow && (o.overflow = "hidden", l.always(function () { o.overflow = c.overflow[0], o.overflowX = c.overflow[1], o.overflowY = c.overflow[2] })); for (d in b) if (e = b[d], Nb.exec(e)) { if (delete b[d], f = f || "toggle" === e, e === (p ? "hide" : "show")) { if ("show" !== e || !q || void 0 === q[d]) continue; p = !0 } m[d] = q && q[d] || n.style(a, d) } else j = void 0; if (n.isEmptyObject(m)) "inline" === ("none" === j ? tb(a.nodeName) : j) && (o.display = j); else { q ? "hidden" in q && (p = q.hidden) : q = L.access(a, "fxshow", {}), f && (q.hidden = !p), p ? n(a).show() : l.done(function () { n(a).hide() }), l.done(function () { var b; L.remove(a, "fxshow"); for (b in m) n.style(a, b, m[b]) }); for (d in m) g = Ub(p ? q[d] : 0, d, l), d in q || (q[d] = g.start, p && (g.end = g.start, g.start = "width" === d || "height" === d ? 1 : 0)) } } function Wb(a, b) { var c, d, e, f, g; for (c in a) if (d = n.camelCase(c), e = b[d], f = a[c], n.isArray(f) && (e = f[1], f = a[c] = f[0]), c !== d && (a[d] = f, delete a[c]), g = n.cssHooks[d], g && "expand" in g) { f = g.expand(f), delete a[d]; for (c in f) c in a || (a[c] = f[c], b[c] = e) } else b[d] = e } function Xb(a, b, c) { var d, e, f = 0, g = Qb.length, h = n.Deferred().always(function () { delete i.elem }), i = function () { if (e) return !1; for (var b = Lb || Sb(), c = Math.max(0, j.startTime + j.duration - b), d = c / j.duration || 0, f = 1 - d, g = 0, i = j.tweens.length; i > g; g++) j.tweens[g].run(f); return h.notifyWith(a, [j, f, c]), 1 > f && i ? c : (h.resolveWith(a, [j]), !1) }, j = h.promise({ elem: a, props: n.extend({}, b), opts: n.extend(!0, { specialEasing: {} }, c), originalProperties: b, originalOptions: c, startTime: Lb || Sb(), duration: c.duration, tweens: [], createTween: function (b, c) { var d = n.Tween(a, j.opts, b, c, j.opts.specialEasing[b] || j.opts.easing); return j.tweens.push(d), d }, stop: function (b) { var c = 0, d = b ? j.tweens.length : 0; if (e) return this; for (e = !0; d > c; c++) j.tweens[c].run(1); return b ? h.resolveWith(a, [j, b]) : h.rejectWith(a, [j, b]), this } }), k = j.props; for (Wb(k, j.opts.specialEasing) ; g > f; f++) if (d = Qb[f].call(j, a, k, j.opts)) return d; return n.map(k, Ub, j), n.isFunction(j.opts.start) && j.opts.start.call(a, j), n.fx.timer(n.extend(i, { elem: a, anim: j, queue: j.opts.queue })), j.progress(j.opts.progress).done(j.opts.done, j.opts.complete).fail(j.opts.fail).always(j.opts.always) } n.Animation = n.extend(Xb, { tweener: function (a, b) { n.isFunction(a) ? (b = a, a = ["*"]) : a = a.split(" "); for (var c, d = 0, e = a.length; e > d; d++) c = a[d], Rb[c] = Rb[c] || [], Rb[c].unshift(b) }, prefilter: function (a, b) { b ? Qb.unshift(a) : Qb.push(a) } }), n.speed = function (a, b, c) { var d = a && "object" == typeof a ? n.extend({}, a) : { complete: c || !c && b || n.isFunction(a) && a, duration: a, easing: c && b || b && !n.isFunction(b) && b }; return d.duration = n.fx.off ? 0 : "number" == typeof d.duration ? d.duration : d.duration in n.fx.speeds ? n.fx.speeds[d.duration] : n.fx.speeds._default, (null == d.queue || d.queue === !0) && (d.queue = "fx"), d.old = d.complete, d.complete = function () { n.isFunction(d.old) && d.old.call(this), d.queue && n.dequeue(this, d.queue) }, d }, n.fn.extend({ fadeTo: function (a, b, c, d) { return this.filter(S).css("opacity", 0).show().end().animate({ opacity: b }, a, c, d) }, animate: function (a, b, c, d) { var e = n.isEmptyObject(a), f = n.speed(b, c, d), g = function () { var b = Xb(this, n.extend({}, a), f); (e || L.get(this, "finish")) && b.stop(!0) }; return g.finish = g, e || f.queue === !1 ? this.each(g) : this.queue(f.queue, g) }, stop: function (a, b, c) { var d = function (a) { var b = a.stop; delete a.stop, b(c) }; return "string" != typeof a && (c = b, b = a, a = void 0), b && a !== !1 && this.queue(a || "fx", []), this.each(function () { var b = !0, e = null != a && a + "queueHooks", f = n.timers, g = L.get(this); if (e) g[e] && g[e].stop && d(g[e]); else for (e in g) g[e] && g[e].stop && Pb.test(e) && d(g[e]); for (e = f.length; e--;) f[e].elem !== this || null != a && f[e].queue !== a || (f[e].anim.stop(c), b = !1, f.splice(e, 1)); (b || !c) && n.dequeue(this, a) }) }, finish: function (a) { return a !== !1 && (a = a || "fx"), this.each(function () { var b, c = L.get(this), d = c[a + "queue"], e = c[a + "queueHooks"], f = n.timers, g = d ? d.length : 0; for (c.finish = !0, n.queue(this, a, []), e && e.stop && e.stop.call(this, !0), b = f.length; b--;) f[b].elem === this && f[b].queue === a && (f[b].anim.stop(!0), f.splice(b, 1)); for (b = 0; g > b; b++) d[b] && d[b].finish && d[b].finish.call(this); delete c.finish }) } }), n.each(["toggle", "show", "hide"], function (a, b) { var c = n.fn[b]; n.fn[b] = function (a, d, e) { return null == a || "boolean" == typeof a ? c.apply(this, arguments) : this.animate(Tb(b, !0), a, d, e) } }), n.each({ slideDown: Tb("show"), slideUp: Tb("hide"), slideToggle: Tb("toggle"), fadeIn: { opacity: "show" }, fadeOut: { opacity: "hide" }, fadeToggle: { opacity: "toggle" } }, function (a, b) { n.fn[a] = function (a, c, d) { return this.animate(b, a, c, d) } }), n.timers = [], n.fx.tick = function () { var a, b = 0, c = n.timers; for (Lb = n.now() ; b < c.length; b++) a = c[b], a() || c[b] !== a || c.splice(b--, 1); c.length || n.fx.stop(), Lb = void 0 }, n.fx.timer = function (a) { n.timers.push(a), a() ? n.fx.start() : n.timers.pop() }, n.fx.interval = 13, n.fx.start = function () { Mb || (Mb = setInterval(n.fx.tick, n.fx.interval)) }, n.fx.stop = function () { clearInterval(Mb), Mb = null }, n.fx.speeds = { slow: 600, fast: 200, _default: 400 }, n.fn.delay = function (a, b) { return a = n.fx ? n.fx.speeds[a] || a : a, b = b || "fx", this.queue(b, function (b, c) { var d = setTimeout(b, a); c.stop = function () { clearTimeout(d) } }) }, function () { var a = l.createElement("input"), b = l.createElement("select"), c = b.appendChild(l.createElement("option")); a.type = "checkbox", k.checkOn = "" !== a.value, k.optSelected = c.selected, b.disabled = !0, k.optDisabled = !c.disabled, a = l.createElement("input"), a.value = "t", a.type = "radio", k.radioValue = "t" === a.value }(); var Yb, Zb, $b = n.expr.attrHandle; n.fn.extend({ attr: function (a, b) { return J(this, n.attr, a, b, arguments.length > 1) }, removeAttr: function (a) { return this.each(function () { n.removeAttr(this, a) }) } }), n.extend({
		attr: function (a, b, c) {
			var d, e, f = a.nodeType; if (a && 3 !== f && 8 !== f && 2 !== f) return typeof a.getAttribute === U ? n.prop(a, b, c) : (1 === f && n.isXMLDoc(a) || (b = b.toLowerCase(), d = n.attrHooks[b] || (n.expr.match.bool.test(b) ? Zb : Yb)), void 0 === c ? d && "get" in d && null !== (e = d.get(a, b)) ? e : (e = n.find.attr(a, b), null == e ? void 0 : e) : null !== c ? d && "set" in d && void 0 !== (e = d.set(a, c, b)) ? e : (a.setAttribute(b, c + ""), c) : void n.removeAttr(a, b))
		}, removeAttr: function (a, b) { var c, d, e = 0, f = b && b.match(E); if (f && 1 === a.nodeType) while (c = f[e++]) d = n.propFix[c] || c, n.expr.match.bool.test(c) && (a[d] = !1), a.removeAttribute(c) }, attrHooks: { type: { set: function (a, b) { if (!k.radioValue && "radio" === b && n.nodeName(a, "input")) { var c = a.value; return a.setAttribute("type", b), c && (a.value = c), b } } } }
	}), Zb = { set: function (a, b, c) { return b === !1 ? n.removeAttr(a, c) : a.setAttribute(c, c), c } }, n.each(n.expr.match.bool.source.match(/\w+/g), function (a, b) { var c = $b[b] || n.find.attr; $b[b] = function (a, b, d) { var e, f; return d || (f = $b[b], $b[b] = e, e = null != c(a, b, d) ? b.toLowerCase() : null, $b[b] = f), e } }); var _b = /^(?:input|select|textarea|button)$/i; n.fn.extend({ prop: function (a, b) { return J(this, n.prop, a, b, arguments.length > 1) }, removeProp: function (a) { return this.each(function () { delete this[n.propFix[a] || a] }) } }), n.extend({ propFix: { "for": "htmlFor", "class": "className" }, prop: function (a, b, c) { var d, e, f, g = a.nodeType; if (a && 3 !== g && 8 !== g && 2 !== g) return f = 1 !== g || !n.isXMLDoc(a), f && (b = n.propFix[b] || b, e = n.propHooks[b]), void 0 !== c ? e && "set" in e && void 0 !== (d = e.set(a, c, b)) ? d : a[b] = c : e && "get" in e && null !== (d = e.get(a, b)) ? d : a[b] }, propHooks: { tabIndex: { get: function (a) { return a.hasAttribute("tabindex") || _b.test(a.nodeName) || a.href ? a.tabIndex : -1 } } } }), k.optSelected || (n.propHooks.selected = { get: function (a) { var b = a.parentNode; return b && b.parentNode && b.parentNode.selectedIndex, null } }), n.each(["tabIndex", "readOnly", "maxLength", "cellSpacing", "cellPadding", "rowSpan", "colSpan", "useMap", "frameBorder", "contentEditable"], function () { n.propFix[this.toLowerCase()] = this }); var ac = /[\t\r\n\f]/g; n.fn.extend({ addClass: function (a) { var b, c, d, e, f, g, h = "string" == typeof a && a, i = 0, j = this.length; if (n.isFunction(a)) return this.each(function (b) { n(this).addClass(a.call(this, b, this.className)) }); if (h) for (b = (a || "").match(E) || []; j > i; i++) if (c = this[i], d = 1 === c.nodeType && (c.className ? (" " + c.className + " ").replace(ac, " ") : " ")) { f = 0; while (e = b[f++]) d.indexOf(" " + e + " ") < 0 && (d += e + " "); g = n.trim(d), c.className !== g && (c.className = g) } return this }, removeClass: function (a) { var b, c, d, e, f, g, h = 0 === arguments.length || "string" == typeof a && a, i = 0, j = this.length; if (n.isFunction(a)) return this.each(function (b) { n(this).removeClass(a.call(this, b, this.className)) }); if (h) for (b = (a || "").match(E) || []; j > i; i++) if (c = this[i], d = 1 === c.nodeType && (c.className ? (" " + c.className + " ").replace(ac, " ") : "")) { f = 0; while (e = b[f++]) while (d.indexOf(" " + e + " ") >= 0) d = d.replace(" " + e + " ", " "); g = a ? n.trim(d) : "", c.className !== g && (c.className = g) } return this }, toggleClass: function (a, b) { var c = typeof a; return "boolean" == typeof b && "string" === c ? b ? this.addClass(a) : this.removeClass(a) : this.each(n.isFunction(a) ? function (c) { n(this).toggleClass(a.call(this, c, this.className, b), b) } : function () { if ("string" === c) { var b, d = 0, e = n(this), f = a.match(E) || []; while (b = f[d++]) e.hasClass(b) ? e.removeClass(b) : e.addClass(b) } else (c === U || "boolean" === c) && (this.className && L.set(this, "__className__", this.className), this.className = this.className || a === !1 ? "" : L.get(this, "__className__") || "") }) }, hasClass: function (a) { for (var b = " " + a + " ", c = 0, d = this.length; d > c; c++) if (1 === this[c].nodeType && (" " + this[c].className + " ").replace(ac, " ").indexOf(b) >= 0) return !0; return !1 } }); var bc = /\r/g; n.fn.extend({ val: function (a) { var b, c, d, e = this[0]; { if (arguments.length) return d = n.isFunction(a), this.each(function (c) { var e; 1 === this.nodeType && (e = d ? a.call(this, c, n(this).val()) : a, null == e ? e = "" : "number" == typeof e ? e += "" : n.isArray(e) && (e = n.map(e, function (a) { return null == a ? "" : a + "" })), b = n.valHooks[this.type] || n.valHooks[this.nodeName.toLowerCase()], b && "set" in b && void 0 !== b.set(this, e, "value") || (this.value = e)) }); if (e) return b = n.valHooks[e.type] || n.valHooks[e.nodeName.toLowerCase()], b && "get" in b && void 0 !== (c = b.get(e, "value")) ? c : (c = e.value, "string" == typeof c ? c.replace(bc, "") : null == c ? "" : c) } } }), n.extend({ valHooks: { option: { get: function (a) { var b = n.find.attr(a, "value"); return null != b ? b : n.trim(n.text(a)) } }, select: { get: function (a) { for (var b, c, d = a.options, e = a.selectedIndex, f = "select-one" === a.type || 0 > e, g = f ? null : [], h = f ? e + 1 : d.length, i = 0 > e ? h : f ? e : 0; h > i; i++) if (c = d[i], !(!c.selected && i !== e || (k.optDisabled ? c.disabled : null !== c.getAttribute("disabled")) || c.parentNode.disabled && n.nodeName(c.parentNode, "optgroup"))) { if (b = n(c).val(), f) return b; g.push(b) } return g }, set: function (a, b) { var c, d, e = a.options, f = n.makeArray(b), g = e.length; while (g--) d = e[g], (d.selected = n.inArray(d.value, f) >= 0) && (c = !0); return c || (a.selectedIndex = -1), f } } } }), n.each(["radio", "checkbox"], function () { n.valHooks[this] = { set: function (a, b) { return n.isArray(b) ? a.checked = n.inArray(n(a).val(), b) >= 0 : void 0 } }, k.checkOn || (n.valHooks[this].get = function (a) { return null === a.getAttribute("value") ? "on" : a.value }) }), n.each("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu".split(" "), function (a, b) { n.fn[b] = function (a, c) { return arguments.length > 0 ? this.on(b, null, a, c) : this.trigger(b) } }), n.fn.extend({ hover: function (a, b) { return this.mouseenter(a).mouseleave(b || a) }, bind: function (a, b, c) { return this.on(a, null, b, c) }, unbind: function (a, b) { return this.off(a, null, b) }, delegate: function (a, b, c, d) { return this.on(b, a, c, d) }, undelegate: function (a, b, c) { return 1 === arguments.length ? this.off(a, "**") : this.off(b, a || "**", c) } }); var cc = n.now(), dc = /\?/; n.parseJSON = function (a) { return JSON.parse(a + "") }, n.parseXML = function (a) { var b, c; if (!a || "string" != typeof a) return null; try { c = new DOMParser, b = c.parseFromString(a, "text/xml") } catch (d) { b = void 0 } return (!b || b.getElementsByTagName("parsererror").length) && n.error("Invalid XML: " + a), b }; var ec, fc, gc = /#.*$/, hc = /([?&])_=[^&]*/, ic = /^(.*?):[ \t]*([^\r\n]*)$/gm, jc = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/, kc = /^(?:GET|HEAD)$/, lc = /^\/\//, mc = /^([\w.+-]+:)(?:\/\/(?:[^\/?#]*@|)([^\/?#:]*)(?::(\d+)|)|)/, nc = {}, oc = {}, pc = "*/".concat("*"); try { fc = location.href } catch (qc) { fc = l.createElement("a"), fc.href = "", fc = fc.href } ec = mc.exec(fc.toLowerCase()) || []; function rc(a) { return function (b, c) { "string" != typeof b && (c = b, b = "*"); var d, e = 0, f = b.toLowerCase().match(E) || []; if (n.isFunction(c)) while (d = f[e++]) "+" === d[0] ? (d = d.slice(1) || "*", (a[d] = a[d] || []).unshift(c)) : (a[d] = a[d] || []).push(c) } } function sc(a, b, c, d) { var e = {}, f = a === oc; function g(h) { var i; return e[h] = !0, n.each(a[h] || [], function (a, h) { var j = h(b, c, d); return "string" != typeof j || f || e[j] ? f ? !(i = j) : void 0 : (b.dataTypes.unshift(j), g(j), !1) }), i } return g(b.dataTypes[0]) || !e["*"] && g("*") } function tc(a, b) { var c, d, e = n.ajaxSettings.flatOptions || {}; for (c in b) void 0 !== b[c] && ((e[c] ? a : d || (d = {}))[c] = b[c]); return d && n.extend(!0, a, d), a } function uc(a, b, c) { var d, e, f, g, h = a.contents, i = a.dataTypes; while ("*" === i[0]) i.shift(), void 0 === d && (d = a.mimeType || b.getResponseHeader("Content-Type")); if (d) for (e in h) if (h[e] && h[e].test(d)) { i.unshift(e); break } if (i[0] in c) f = i[0]; else { for (e in c) { if (!i[0] || a.converters[e + " " + i[0]]) { f = e; break } g || (g = e) } f = f || g } return f ? (f !== i[0] && i.unshift(f), c[f]) : void 0 } function vc(a, b, c, d) { var e, f, g, h, i, j = {}, k = a.dataTypes.slice(); if (k[1]) for (g in a.converters) j[g.toLowerCase()] = a.converters[g]; f = k.shift(); while (f) if (a.responseFields[f] && (c[a.responseFields[f]] = b), !i && d && a.dataFilter && (b = a.dataFilter(b, a.dataType)), i = f, f = k.shift()) if ("*" === f) f = i; else if ("*" !== i && i !== f) { if (g = j[i + " " + f] || j["* " + f], !g) for (e in j) if (h = e.split(" "), h[1] === f && (g = j[i + " " + h[0]] || j["* " + h[0]])) { g === !0 ? g = j[e] : j[e] !== !0 && (f = h[0], k.unshift(h[1])); break } if (g !== !0) if (g && a["throws"]) b = g(b); else try { b = g(b) } catch (l) { return { state: "parsererror", error: g ? l : "No conversion from " + i + " to " + f } } } return { state: "success", data: b } } n.extend({ active: 0, lastModified: {}, etag: {}, ajaxSettings: { url: fc, type: "GET", isLocal: jc.test(ec[1]), global: !0, processData: !0, async: !0, contentType: "application/x-www-form-urlencoded; charset=UTF-8", accepts: { "*": pc, text: "text/plain", html: "text/html", xml: "application/xml, text/xml", json: "application/json, text/javascript" }, contents: { xml: /xml/, html: /html/, json: /json/ }, responseFields: { xml: "responseXML", text: "responseText", json: "responseJSON" }, converters: { "* text": String, "text html": !0, "text json": n.parseJSON, "text xml": n.parseXML }, flatOptions: { url: !0, context: !0 } }, ajaxSetup: function (a, b) { return b ? tc(tc(a, n.ajaxSettings), b) : tc(n.ajaxSettings, a) }, ajaxPrefilter: rc(nc), ajaxTransport: rc(oc), ajax: function (a, b) { "object" == typeof a && (b = a, a = void 0), b = b || {}; var c, d, e, f, g, h, i, j, k = n.ajaxSetup({}, b), l = k.context || k, m = k.context && (l.nodeType || l.jquery) ? n(l) : n.event, o = n.Deferred(), p = n.Callbacks("once memory"), q = k.statusCode || {}, r = {}, s = {}, t = 0, u = "canceled", v = { readyState: 0, getResponseHeader: function (a) { var b; if (2 === t) { if (!f) { f = {}; while (b = ic.exec(e)) f[b[1].toLowerCase()] = b[2] } b = f[a.toLowerCase()] } return null == b ? null : b }, getAllResponseHeaders: function () { return 2 === t ? e : null }, setRequestHeader: function (a, b) { var c = a.toLowerCase(); return t || (a = s[c] = s[c] || a, r[a] = b), this }, overrideMimeType: function (a) { return t || (k.mimeType = a), this }, statusCode: function (a) { var b; if (a) if (2 > t) for (b in a) q[b] = [q[b], a[b]]; else v.always(a[v.status]); return this }, abort: function (a) { var b = a || u; return c && c.abort(b), x(0, b), this } }; if (o.promise(v).complete = p.add, v.success = v.done, v.error = v.fail, k.url = ((a || k.url || fc) + "").replace(gc, "").replace(lc, ec[1] + "//"), k.type = b.method || b.type || k.method || k.type, k.dataTypes = n.trim(k.dataType || "*").toLowerCase().match(E) || [""], null == k.crossDomain && (h = mc.exec(k.url.toLowerCase()), k.crossDomain = !(!h || h[1] === ec[1] && h[2] === ec[2] && (h[3] || ("http:" === h[1] ? "80" : "443")) === (ec[3] || ("http:" === ec[1] ? "80" : "443")))), k.data && k.processData && "string" != typeof k.data && (k.data = n.param(k.data, k.traditional)), sc(nc, k, b, v), 2 === t) return v; i = k.global, i && 0 === n.active++ && n.event.trigger("ajaxStart"), k.type = k.type.toUpperCase(), k.hasContent = !kc.test(k.type), d = k.url, k.hasContent || (k.data && (d = k.url += (dc.test(d) ? "&" : "?") + k.data, delete k.data), k.cache === !1 && (k.url = hc.test(d) ? d.replace(hc, "$1_=" + cc++) : d + (dc.test(d) ? "&" : "?") + "_=" + cc++)), k.ifModified && (n.lastModified[d] && v.setRequestHeader("If-Modified-Since", n.lastModified[d]), n.etag[d] && v.setRequestHeader("If-None-Match", n.etag[d])), (k.data && k.hasContent && k.contentType !== !1 || b.contentType) && v.setRequestHeader("Content-Type", k.contentType), v.setRequestHeader("Accept", k.dataTypes[0] && k.accepts[k.dataTypes[0]] ? k.accepts[k.dataTypes[0]] + ("*" !== k.dataTypes[0] ? ", " + pc + "; q=0.01" : "") : k.accepts["*"]); for (j in k.headers) v.setRequestHeader(j, k.headers[j]); if (k.beforeSend && (k.beforeSend.call(l, v, k) === !1 || 2 === t)) return v.abort(); u = "abort"; for (j in { success: 1, error: 1, complete: 1 }) v[j](k[j]); if (c = sc(oc, k, b, v)) { v.readyState = 1, i && m.trigger("ajaxSend", [v, k]), k.async && k.timeout > 0 && (g = setTimeout(function () { v.abort("timeout") }, k.timeout)); try { t = 1, c.send(r, x) } catch (w) { if (!(2 > t)) throw w; x(-1, w) } } else x(-1, "No Transport"); function x(a, b, f, h) { var j, r, s, u, w, x = b; 2 !== t && (t = 2, g && clearTimeout(g), c = void 0, e = h || "", v.readyState = a > 0 ? 4 : 0, j = a >= 200 && 300 > a || 304 === a, f && (u = uc(k, v, f)), u = vc(k, u, v, j), j ? (k.ifModified && (w = v.getResponseHeader("Last-Modified"), w && (n.lastModified[d] = w), w = v.getResponseHeader("etag"), w && (n.etag[d] = w)), 204 === a || "HEAD" === k.type ? x = "nocontent" : 304 === a ? x = "notmodified" : (x = u.state, r = u.data, s = u.error, j = !s)) : (s = x, (a || !x) && (x = "error", 0 > a && (a = 0))), v.status = a, v.statusText = (b || x) + "", j ? o.resolveWith(l, [r, x, v]) : o.rejectWith(l, [v, x, s]), v.statusCode(q), q = void 0, i && m.trigger(j ? "ajaxSuccess" : "ajaxError", [v, k, j ? r : s]), p.fireWith(l, [v, x]), i && (m.trigger("ajaxComplete", [v, k]), --n.active || n.event.trigger("ajaxStop"))) } return v }, getJSON: function (a, b, c) { return n.get(a, b, c, "json") }, getScript: function (a, b) { return n.get(a, void 0, b, "script") } }), n.each(["get", "post"], function (a, b) { n[b] = function (a, c, d, e) { return n.isFunction(c) && (e = e || d, d = c, c = void 0), n.ajax({ url: a, type: b, dataType: e, data: c, success: d }) } }), n.each(["ajaxStart", "ajaxStop", "ajaxComplete", "ajaxError", "ajaxSuccess", "ajaxSend"], function (a, b) { n.fn[b] = function (a) { return this.on(b, a) } }), n._evalUrl = function (a) { return n.ajax({ url: a, type: "GET", dataType: "script", async: !1, global: !1, "throws": !0 }) }, n.fn.extend({ wrapAll: function (a) { var b; return n.isFunction(a) ? this.each(function (b) { n(this).wrapAll(a.call(this, b)) }) : (this[0] && (b = n(a, this[0].ownerDocument).eq(0).clone(!0), this[0].parentNode && b.insertBefore(this[0]), b.map(function () { var a = this; while (a.firstElementChild) a = a.firstElementChild; return a }).append(this)), this) }, wrapInner: function (a) { return this.each(n.isFunction(a) ? function (b) { n(this).wrapInner(a.call(this, b)) } : function () { var b = n(this), c = b.contents(); c.length ? c.wrapAll(a) : b.append(a) }) }, wrap: function (a) { var b = n.isFunction(a); return this.each(function (c) { n(this).wrapAll(b ? a.call(this, c) : a) }) }, unwrap: function () { return this.parent().each(function () { n.nodeName(this, "body") || n(this).replaceWith(this.childNodes) }).end() } }), n.expr.filters.hidden = function (a) { return a.offsetWidth <= 0 && a.offsetHeight <= 0 }, n.expr.filters.visible = function (a) { return !n.expr.filters.hidden(a) }; var wc = /%20/g, xc = /\[\]$/, yc = /\r?\n/g, zc = /^(?:submit|button|image|reset|file)$/i, Ac = /^(?:input|select|textarea|keygen)/i; function Bc(a, b, c, d) { var e; if (n.isArray(b)) n.each(b, function (b, e) { c || xc.test(a) ? d(a, e) : Bc(a + "[" + ("object" == typeof e ? b : "") + "]", e, c, d) }); else if (c || "object" !== n.type(b)) d(a, b); else for (e in b) Bc(a + "[" + e + "]", b[e], c, d) } n.param = function (a, b) { var c, d = [], e = function (a, b) { b = n.isFunction(b) ? b() : null == b ? "" : b, d[d.length] = encodeURIComponent(a) + "=" + encodeURIComponent(b) }; if (void 0 === b && (b = n.ajaxSettings && n.ajaxSettings.traditional), n.isArray(a) || a.jquery && !n.isPlainObject(a)) n.each(a, function () { e(this.name, this.value) }); else for (c in a) Bc(c, a[c], b, e); return d.join("&").replace(wc, "+") }, n.fn.extend({ serialize: function () { return n.param(this.serializeArray()) }, serializeArray: function () { return this.map(function () { var a = n.prop(this, "elements"); return a ? n.makeArray(a) : this }).filter(function () { var a = this.type; return this.name && !n(this).is(":disabled") && Ac.test(this.nodeName) && !zc.test(a) && (this.checked || !T.test(a)) }).map(function (a, b) { var c = n(this).val(); return null == c ? null : n.isArray(c) ? n.map(c, function (a) { return { name: b.name, value: a.replace(yc, "\r\n") } }) : { name: b.name, value: c.replace(yc, "\r\n") } }).get() } }), n.ajaxSettings.xhr = function () { try { return new XMLHttpRequest } catch (a) { } }; var Cc = 0, Dc = {}, Ec = { 0: 200, 1223: 204 }, Fc = n.ajaxSettings.xhr(); a.ActiveXObject && n(a).on("unload", function () { for (var a in Dc) Dc[a]() }), k.cors = !!Fc && "withCredentials" in Fc, k.ajax = Fc = !!Fc, n.ajaxTransport(function (a) { var b; return k.cors || Fc && !a.crossDomain ? { send: function (c, d) { var e, f = a.xhr(), g = ++Cc; if (f.open(a.type, a.url, a.async, a.username, a.password), a.xhrFields) for (e in a.xhrFields) f[e] = a.xhrFields[e]; a.mimeType && f.overrideMimeType && f.overrideMimeType(a.mimeType), a.crossDomain || c["X-Requested-With"] || (c["X-Requested-With"] = "XMLHttpRequest"); for (e in c) f.setRequestHeader(e, c[e]); b = function (a) { return function () { b && (delete Dc[g], b = f.onload = f.onerror = null, "abort" === a ? f.abort() : "error" === a ? d(f.status, f.statusText) : d(Ec[f.status] || f.status, f.statusText, "string" == typeof f.responseText ? { text: f.responseText } : void 0, f.getAllResponseHeaders())) } }, f.onload = b(), f.onerror = b("error"), b = Dc[g] = b("abort"); try { f.send(a.hasContent && a.data || null) } catch (h) { if (b) throw h } }, abort: function () { b && b() } } : void 0 }), n.ajaxSetup({ accepts: { script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript" }, contents: { script: /(?:java|ecma)script/ }, converters: { "text script": function (a) { return n.globalEval(a), a } } }), n.ajaxPrefilter("script", function (a) { void 0 === a.cache && (a.cache = !1), a.crossDomain && (a.type = "GET") }), n.ajaxTransport("script", function (a) { if (a.crossDomain) { var b, c; return { send: function (d, e) { b = n("<script>").prop({ async: !0, charset: a.scriptCharset, src: a.url }).on("load error", c = function (a) { b.remove(), c = null, a && e("error" === a.type ? 404 : 200, a.type) }), l.head.appendChild(b[0]) }, abort: function () { c && c() } } } }); var Gc = [], Hc = /(=)\?(?=&|$)|\?\?/; n.ajaxSetup({ jsonp: "callback", jsonpCallback: function () { var a = Gc.pop() || n.expando + "_" + cc++; return this[a] = !0, a } }), n.ajaxPrefilter("json jsonp", function (b, c, d) { var e, f, g, h = b.jsonp !== !1 && (Hc.test(b.url) ? "url" : "string" == typeof b.data && !(b.contentType || "").indexOf("application/x-www-form-urlencoded") && Hc.test(b.data) && "data"); return h || "jsonp" === b.dataTypes[0] ? (e = b.jsonpCallback = n.isFunction(b.jsonpCallback) ? b.jsonpCallback() : b.jsonpCallback, h ? b[h] = b[h].replace(Hc, "$1" + e) : b.jsonp !== !1 && (b.url += (dc.test(b.url) ? "&" : "?") + b.jsonp + "=" + e), b.converters["script json"] = function () { return g || n.error(e + " was not called"), g[0] }, b.dataTypes[0] = "json", f = a[e], a[e] = function () { g = arguments }, d.always(function () { a[e] = f, b[e] && (b.jsonpCallback = c.jsonpCallback, Gc.push(e)), g && n.isFunction(f) && f(g[0]), g = f = void 0 }), "script") : void 0 }), n.parseHTML = function (a, b, c) { if (!a || "string" != typeof a) return null; "boolean" == typeof b && (c = b, b = !1), b = b || l; var d = v.exec(a), e = !c && []; return d ? [b.createElement(d[1])] : (d = n.buildFragment([a], b, e), e && e.length && n(e).remove(), n.merge([], d.childNodes)) }; var Ic = n.fn.load; n.fn.load = function (a, b, c) { if ("string" != typeof a && Ic) return Ic.apply(this, arguments); var d, e, f, g = this, h = a.indexOf(" "); return h >= 0 && (d = n.trim(a.slice(h)), a = a.slice(0, h)), n.isFunction(b) ? (c = b, b = void 0) : b && "object" == typeof b && (e = "POST"), g.length > 0 && n.ajax({ url: a, type: e, dataType: "html", data: b }).done(function (a) { f = arguments, g.html(d ? n("<div>").append(n.parseHTML(a)).find(d) : a) }).complete(c && function (a, b) { g.each(c, f || [a.responseText, b, a]) }), this }, n.expr.filters.animated = function (a) { return n.grep(n.timers, function (b) { return a === b.elem }).length }; var Jc = a.document.documentElement; function Kc(a) { return n.isWindow(a) ? a : 9 === a.nodeType && a.defaultView } n.offset = { setOffset: function (a, b, c) { var d, e, f, g, h, i, j, k = n.css(a, "position"), l = n(a), m = {}; "static" === k && (a.style.position = "relative"), h = l.offset(), f = n.css(a, "top"), i = n.css(a, "left"), j = ("absolute" === k || "fixed" === k) && (f + i).indexOf("auto") > -1, j ? (d = l.position(), g = d.top, e = d.left) : (g = parseFloat(f) || 0, e = parseFloat(i) || 0), n.isFunction(b) && (b = b.call(a, c, h)), null != b.top && (m.top = b.top - h.top + g), null != b.left && (m.left = b.left - h.left + e), "using" in b ? b.using.call(a, m) : l.css(m) } }, n.fn.extend({ offset: function (a) { if (arguments.length) return void 0 === a ? this : this.each(function (b) { n.offset.setOffset(this, a, b) }); var b, c, d = this[0], e = { top: 0, left: 0 }, f = d && d.ownerDocument; if (f) return b = f.documentElement, n.contains(b, d) ? (typeof d.getBoundingClientRect !== U && (e = d.getBoundingClientRect()), c = Kc(f), { top: e.top + c.pageYOffset - b.clientTop, left: e.left + c.pageXOffset - b.clientLeft }) : e }, position: function () { if (this[0]) { var a, b, c = this[0], d = { top: 0, left: 0 }; return "fixed" === n.css(c, "position") ? b = c.getBoundingClientRect() : (a = this.offsetParent(), b = this.offset(), n.nodeName(a[0], "html") || (d = a.offset()), d.top += n.css(a[0], "borderTopWidth", !0), d.left += n.css(a[0], "borderLeftWidth", !0)), { top: b.top - d.top - n.css(c, "marginTop", !0), left: b.left - d.left - n.css(c, "marginLeft", !0) } } }, offsetParent: function () { return this.map(function () { var a = this.offsetParent || Jc; while (a && !n.nodeName(a, "html") && "static" === n.css(a, "position")) a = a.offsetParent; return a || Jc }) } }), n.each({ scrollLeft: "pageXOffset", scrollTop: "pageYOffset" }, function (b, c) { var d = "pageYOffset" === c; n.fn[b] = function (e) { return J(this, function (b, e, f) { var g = Kc(b); return void 0 === f ? g ? g[c] : b[e] : void (g ? g.scrollTo(d ? a.pageXOffset : f, d ? f : a.pageYOffset) : b[e] = f) }, b, e, arguments.length, null) } }), n.each(["top", "left"], function (a, b) { n.cssHooks[b] = yb(k.pixelPosition, function (a, c) { return c ? (c = xb(a, b), vb.test(c) ? n(a).position()[b] + "px" : c) : void 0 }) }), n.each({ Height: "height", Width: "width" }, function (a, b) { n.each({ padding: "inner" + a, content: b, "": "outer" + a }, function (c, d) { n.fn[d] = function (d, e) { var f = arguments.length && (c || "boolean" != typeof d), g = c || (d === !0 || e === !0 ? "margin" : "border"); return J(this, function (b, c, d) { var e; return n.isWindow(b) ? b.document.documentElement["client" + a] : 9 === b.nodeType ? (e = b.documentElement, Math.max(b.body["scroll" + a], e["scroll" + a], b.body["offset" + a], e["offset" + a], e["client" + a])) : void 0 === d ? n.css(b, c, g) : n.style(b, c, d, g) }, b, f ? d : void 0, f, null) } }) }), n.fn.size = function () { return this.length }, n.fn.andSelf = n.fn.addBack, "function" == typeof define && define.amd && define("jquery", [], function () { return n }); var Lc = a.jQuery, Mc = a.$; return n.noConflict = function (b) { return a.$ === n && (a.$ = Mc), b && a.jQuery === n && (a.jQuery = Lc), n }, typeof b === U && (a.jQuery = a.$ = n), n
});

/*! VelocityJS.org (1.1.0). (C) 2014 Julian Shapiro. MIT @license: en.wikipedia.org/wiki/MIT_License */
/*! VelocityJS.org jQuery Shim (1.0.1). (C) 2014 The jQuery Foundation. MIT @license: en.wikipedia.org/wiki/MIT_License. */
! function(e) {
  function t(e) {
    var t = e.length,
      r = $.type(e);
    return "function" === r || $.isWindow(e) ? !1 : 1 === e.nodeType && t ? !0 : "array" === r || 0 === t || "number" == typeof t && t > 0 && t - 1 in e
  }
  if (!e.jQuery) {
    var $ = function(e, t) {
      return new $.fn.init(e, t)
    };
    $.isWindow = function(e) {
      return null != e && e == e.window
    }, $.type = function(e) {
      return null == e ? e + "" : "object" == typeof e || "function" == typeof e ? a[o.call(e)] || "object" : typeof e
    }, $.isArray = Array.isArray || function(e) {
      return "array" === $.type(e)
    }, $.isPlainObject = function(e) {
      var t;
      if (!e || "object" !== $.type(e) || e.nodeType || $.isWindow(e)) return !1;
      try {
        if (e.constructor && !n.call(e, "constructor") && !n.call(e.constructor.prototype, "isPrototypeOf")) return !1
      } catch (r) {
        return !1
      }
      for (t in e);
      return void 0 === t || n.call(e, t)
    }, $.each = function(e, r, a) {
      var n, o = 0,
        i = e.length,
        s = t(e);
      if (a) {
        if (s)
          for (; i > o && (n = r.apply(e[o], a), n !== !1); o++);
        else
          for (o in e)
            if (n = r.apply(e[o], a), n === !1) break
      } else if (s)
        for (; i > o && (n = r.call(e[o], o, e[o]), n !== !1); o++);
      else
        for (o in e)
          if (n = r.call(e[o], o, e[o]), n === !1) break; return e
    }, $.data = function(e, t, a) {
      if (void 0 === a) {
        var n = e[$.expando],
          o = n && r[n];
        if (void 0 === t) return o;
        if (o && t in o) return o[t]
      } else if (void 0 !== t) {
        var n = e[$.expando] || (e[$.expando] = ++$.uuid);
        return r[n] = r[n] || {}, r[n][t] = a, a
      }
    }, $.removeData = function(e, t) {
      var a = e[$.expando],
        n = a && r[a];
      n && $.each(t, function(e, t) {
        delete n[t]
      })
    }, $.extend = function() {
      var e, t, r, a, n, o, i = arguments[0] || {},
        s = 1,
        l = arguments.length,
        u = !1;
      for ("boolean" == typeof i && (u = i, i = arguments[s] || {}, s++), "object" != typeof i && "function" !== $.type(i) && (i = {}), s === l && (i = this, s--); l > s; s++)
        if (null != (n = arguments[s]))
          for (a in n) e = i[a], r = n[a], i !== r && (u && r && ($.isPlainObject(r) || (t = $.isArray(r))) ? (t ? (t = !1, o = e && $.isArray(e) ? e : []) : o = e && $.isPlainObject(e) ? e : {}, i[a] = $.extend(u, o, r)) : void 0 !== r && (i[a] = r));
      return i
    }, $.queue = function(e, r, a) {
      function n(e, r) {
        var a = r || [];
        return null != e && (t(Object(e)) ? ! function(e, t) {
          for (var r = +t.length, a = 0, n = e.length; r > a;) e[n++] = t[a++];
          if (r !== r)
            for (; void 0 !== t[a];) e[n++] = t[a++];
          return e.length = n, e
        }(a, "string" == typeof e ? [e] : e) : [].push.call(a, e)), a
      }
      if (e) {
        r = (r || "fx") + "queue";
        var o = $.data(e, r);
        return a ? (!o || $.isArray(a) ? o = $.data(e, r, n(a)) : o.push(a), o) : o || []
      }
    }, $.dequeue = function(e, t) {
      $.each(e.nodeType ? [e] : e, function(e, r) {
        t = t || "fx";
        var a = $.queue(r, t),
          n = a.shift();
        "inprogress" === n && (n = a.shift()), n && ("fx" === t && a.unshift("inprogress"), n.call(r, function() {
          $.dequeue(r, t)
        }))
      })
    }, $.fn = $.prototype = {
      init: function(e) {
        if (e.nodeType) return this[0] = e, this;
        throw new Error("Not a DOM node.")
      },
      offset: function() {
        var t = this[0].getBoundingClientRect ? this[0].getBoundingClientRect() : {
          top: 0,
          left: 0
        };
        return {
          top: t.top + (e.pageYOffset || document.scrollTop || 0) - (document.clientTop || 0),
          left: t.left + (e.pageXOffset || document.scrollLeft || 0) - (document.clientLeft || 0)
        }
      },
      position: function() {
        function e() {
          for (var e = this.offsetParent || document; e && "html" === !e.nodeType.toLowerCase && "static" === e.style.position;) e = e.offsetParent;
          return e || document
        }
        var t = this[0],
          e = e.apply(t),
          r = this.offset(),
          a = /^(?:body|html)$/i.test(e.nodeName) ? {
            top: 0,
            left: 0
          } : $(e).offset();
        return r.top -= parseFloat(t.style.marginTop) || 0, r.left -= parseFloat(t.style.marginLeft) || 0, e.style && (a.top += parseFloat(e.style.borderTopWidth) || 0, a.left += parseFloat(e.style.borderLeftWidth) || 0), {
          top: r.top - a.top,
          left: r.left - a.left
        }
      }
    };
    var r = {};
    $.expando = "velocity" + (new Date).getTime(), $.uuid = 0;
    for (var a = {}, n = a.hasOwnProperty, o = a.toString, i = "Boolean Number String Function Array Date RegExp Object Error".split(" "), s = 0; s < i.length; s++) a["[object " + i[s] + "]"] = i[s].toLowerCase();
    $.fn.init.prototype = $.fn, e.Velocity = {
      Utilities: $
    }
  }
}(window),
function(e) {
  "object" == typeof module && "object" == typeof module.exports ? module.exports = e() : "function" == typeof define && define.amd ? define(e) : e()
}(function() {
  return function(e, t, r, a) {
    function n(e) {
      for (var t = -1, r = e ? e.length : 0, a = []; ++t < r;) {
        var n = e[t];
        n && a.push(n)
      }
      return a
    }

    function o(e) {
      return g.isWrapped(e) ? e = [].slice.call(e) : g.isNode(e) && (e = [e]), e
    }

    function i(e) {
      var t = $.data(e, "velocity");
      return null === t ? a : t
    }

    function s(e) {
      return function(t) {
        return Math.round(t * e) * (1 / e)
      }
    }

    function l(e, r, a, n) {
      function o(e, t) {
        return 1 - 3 * t + 3 * e
      }

      function i(e, t) {
        return 3 * t - 6 * e
      }

      function s(e) {
        return 3 * e
      }

      function l(e, t, r) {
        return ((o(t, r) * e + i(t, r)) * e + s(t)) * e
      }

      function u(e, t, r) {
        return 3 * o(t, r) * e * e + 2 * i(t, r) * e + s(t)
      }

      function c(t, r) {
        for (var n = 0; m > n; ++n) {
          var o = u(r, e, a);
          if (0 === o) return r;
          var i = l(r, e, a) - t;
          r -= i / o
        }
        return r
      }

      function p() {
        for (var t = 0; b > t; ++t) w[t] = l(t * x, e, a)
      }

      function f(t, r, n) {
        var o, i, s = 0;
        do i = r + (n - r) / 2, o = l(i, e, a) - t, o > 0 ? n = i : r = i; while (Math.abs(o) > h && ++s < v);
        return i
      }

      function d(t) {
        for (var r = 0, n = 1, o = b - 1; n != o && w[n] <= t; ++n) r += x;
        --n;
        var i = (t - w[n]) / (w[n + 1] - w[n]),
          s = r + i * x,
          l = u(s, e, a);
        return l >= y ? c(t, s) : 0 == l ? s : f(t, r, r + x)
      }

      function g() {
        V = !0, (e != r || a != n) && p()
      }
      var m = 4,
        y = .001,
        h = 1e-7,
        v = 10,
        b = 11,
        x = 1 / (b - 1),
        S = "Float32Array" in t;
      if (4 !== arguments.length) return !1;
      for (var P = 0; 4 > P; ++P)
        if ("number" != typeof arguments[P] || isNaN(arguments[P]) || !isFinite(arguments[P])) return !1;
      e = Math.min(e, 1), a = Math.min(a, 1), e = Math.max(e, 0), a = Math.max(a, 0);
      var w = S ? new Float32Array(b) : new Array(b),
        V = !1,
        C = function(t) {
          return V || g(), e === r && a === n ? t : 0 === t ? 0 : 1 === t ? 1 : l(d(t), r, n)
        };
      C.getControlPoints = function() {
        return [{
          x: e,
          y: r
        }, {
          x: a,
          y: n
        }]
      };
      var T = "generateBezier(" + [e, r, a, n] + ")";
      return C.toString = function() {
        return T
      }, C
    }

    function u(e, t) {
      var r = e;
      return g.isString(e) ? v.Easings[e] || (r = !1) : r = g.isArray(e) && 1 === e.length ? s.apply(null, e) : g.isArray(e) && 2 === e.length ? b.apply(null, e.concat([t])) : g.isArray(e) && 4 === e.length ? l.apply(null, e) : !1, r === !1 && (r = v.Easings[v.defaults.easing] ? v.defaults.easing : h), r
    }

    function c(e) {
      if (e)
        for (var t = (new Date).getTime(), r = 0, n = v.State.calls.length; n > r; r++)
          if (v.State.calls[r]) {
            var o = v.State.calls[r],
              s = o[0],
              l = o[2],
              u = o[3],
              f = !!u;
            u || (u = v.State.calls[r][3] = t - 16);
            for (var d = Math.min((t - u) / l.duration, 1), m = 0, y = s.length; y > m; m++) {
              var h = s[m],
                b = h.element;
              if (i(b)) {
                var S = !1;
                if (l.display !== a && null !== l.display && "none" !== l.display) {
                  if ("flex" === l.display) {
                    var w = ["-webkit-box", "-moz-box", "-ms-flexbox", "-webkit-flex"];
                    $.each(w, function(e, t) {
                      x.setPropertyValue(b, "display", t)
                    })
                  }
                  x.setPropertyValue(b, "display", l.display)
                }
                l.visibility !== a && "hidden" !== l.visibility && x.setPropertyValue(b, "visibility", l.visibility);
                for (var V in h)
                  if ("element" !== V) {
                    var C = h[V],
                      T, k = g.isString(C.easing) ? v.Easings[C.easing] : C.easing;
                    if (1 === d) T = C.endValue;
                    else if (T = C.startValue + (C.endValue - C.startValue) * k(d), !f && T === C.currentValue) continue;
                    if (C.currentValue = T, x.Hooks.registered[V]) {
                      var A = x.Hooks.getRoot(V),
                        F = i(b).rootPropertyValueCache[A];
                      F && (C.rootPropertyValue = F)
                    }
                    var E = x.setPropertyValue(b, V, C.currentValue + (0 === parseFloat(T) ? "" : C.unitType), C.rootPropertyValue, C.scrollData);
                    x.Hooks.registered[V] && (i(b).rootPropertyValueCache[A] = x.Normalizations.registered[A] ? x.Normalizations.registered[A]("extract", null, E[1]) : E[1]), "transform" === E[0] && (S = !0)
                  }
                l.mobileHA && i(b).transformCache.translate3d === a && (i(b).transformCache.translate3d = "(0px, 0px, 0px)", S = !0), S && x.flushTransformCache(b)
              }
            }
            l.display !== a && "none" !== l.display && (v.State.calls[r][2].display = !1), l.visibility !== a && "hidden" !== l.visibility && (v.State.calls[r][2].visibility = !1), l.progress && l.progress.call(o[1], o[1], d, Math.max(0, u + l.duration - t), u), 1 === d && p(r)
          }
      v.State.isTicking && P(c)
    }

    function p(e, t) {
      if (!v.State.calls[e]) return !1;
      for (var r = v.State.calls[e][0], n = v.State.calls[e][1], o = v.State.calls[e][2], s = v.State.calls[e][4], l = !1, u = 0, c = r.length; c > u; u++) {
        var p = r[u].element;
        if (t || o.loop || ("none" === o.display && x.setPropertyValue(p, "display", o.display), "hidden" === o.visibility && x.setPropertyValue(p, "visibility", o.visibility)), o.loop !== !0 && ($.queue(p)[1] === a || !/\.velocityQueueEntryFlag/i.test($.queue(p)[1])) && i(p)) {
          i(p).isAnimating = !1, i(p).rootPropertyValueCache = {};
          var f = !1;
          $.each(x.Lists.transforms3D, function(e, t) {
            var r = /^scale/.test(t) ? 1 : 0,
              n = i(p).transformCache[t];
            i(p).transformCache[t] !== a && new RegExp("^\\(" + r + "[^.]").test(n) && (f = !0, delete i(p).transformCache[t])
          }), o.mobileHA && (f = !0, delete i(p).transformCache.translate3d), f && x.flushTransformCache(p), x.Values.removeClass(p, "velocity-animating")
        }
        if (!t && o.complete && !o.loop && u === c - 1) try {
          o.complete.call(n, n)
        } catch (d) {
          setTimeout(function() {
            throw d
          }, 1)
        }
        s && o.loop !== !0 && s(n), o.loop !== !0 || t || ($.each(i(p).tweensContainer, function(e, t) {
          /^rotate/.test(e) && 360 === parseFloat(t.endValue) && (t.endValue = 0, t.startValue = 360)
        }), v(p, "reverse", {
          loop: !0,
          delay: o.delay
        })), o.queue !== !1 && $.dequeue(p, o.queue)
      }
      v.State.calls[e] = !1;
      for (var g = 0, m = v.State.calls.length; m > g; g++)
        if (v.State.calls[g] !== !1) {
          l = !0;
          break
        }
      l === !1 && (v.State.isTicking = !1, delete v.State.calls, v.State.calls = [])
    }
    var f = function() {
        if (r.documentMode) return r.documentMode;
        for (var e = 7; e > 4; e--) {
          var t = r.createElement("div");
          if (t.innerHTML = "<!--[if IE " + e + "]><span></span><![endif]-->", t.getElementsByTagName("span").length) return t = null, e
        }
        return a
      }(),
      d = function() {
        var e = 0;
        return t.webkitRequestAnimationFrame || t.mozRequestAnimationFrame || function(t) {
          var r = (new Date).getTime(),
            a;
          return a = Math.max(0, 16 - (r - e)), e = r + a, setTimeout(function() {
            t(r + a)
          }, a)
        }
      }(),
      g = {
        isString: function(e) {
          return "string" == typeof e
        },
        isArray: Array.isArray || function(e) {
          return "[object Array]" === Object.prototype.toString.call(e)
        },
        isFunction: function(e) {
          return "[object Function]" === Object.prototype.toString.call(e)
        },
        isNode: function(e) {
          return e && e.nodeType
        },
        isNodeList: function(e) {
          return "object" == typeof e && /^\[object (HTMLCollection|NodeList|Object)\]$/.test(Object.prototype.toString.call(e)) && e.length !== a && (0 === e.length || "object" == typeof e[0] && e[0].nodeType > 0)
        },
        isWrapped: function(e) {
          return e && (e.jquery || t.Zepto && t.Zepto.zepto.isZ(e))
        },
        isSVG: function(e) {
          return t.SVGElement && e instanceof t.SVGElement
        },
        isEmptyObject: function(e) {
          for (var t in e) return !1;
          return !0
        }
      },
      $, m = !1;
    if (e.fn && e.fn.jquery ? ($ = e, m = !0) : $ = t.Velocity.Utilities, 8 >= f && !m) throw new Error("Velocity: IE8 and below require jQuery to be loaded before Velocity.");
    if (7 >= f) return void(jQuery.fn.velocity = jQuery.fn.animate);
    var y = 400,
      h = "swing",
      v = {
        State: {
          isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
          isAndroid: /Android/i.test(navigator.userAgent),
          isGingerbread: /Android 2\.3\.[3-7]/i.test(navigator.userAgent),
          isChrome: t.chrome,
          isFirefox: /Firefox/i.test(navigator.userAgent),
          prefixElement: r.createElement("div"),
          prefixMatches: {},
          scrollAnchor: null,
          scrollPropertyLeft: null,
          scrollPropertyTop: null,
          isTicking: !1,
          calls: []
        },
        CSS: {},
        Utilities: $,
        Redirects: {},
        Easings: {},
        Promise: t.Promise,
        defaults: {
          queue: "",
          duration: y,
          easing: h,
          begin: a,
          complete: a,
          progress: a,
          display: a,
          visibility: a,
          loop: !1,
          delay: !1,
          mobileHA: !0,
          _cacheValues: !0
        },
        init: function(e) {
          $.data(e, "velocity", {
            isSVG: g.isSVG(e),
            isAnimating: !1,
            computedStyle: null,
            tweensContainer: null,
            rootPropertyValueCache: {},
            transformCache: {}
          })
        },
        hook: null,
        mock: !1,
        version: {
          major: 1,
          minor: 1,
          patch: 0
        },
        debug: !1
      };
    t.pageYOffset !== a ? (v.State.scrollAnchor = t, v.State.scrollPropertyLeft = "pageXOffset", v.State.scrollPropertyTop = "pageYOffset") : (v.State.scrollAnchor = r.documentElement || r.body.parentNode || r.body, v.State.scrollPropertyLeft = "scrollLeft", v.State.scrollPropertyTop = "scrollTop");
    var b = function() {
      function e(e) {
        return -e.tension * e.x - e.friction * e.v
      }

      function t(t, r, a) {
        var n = {
          x: t.x + a.dx * r,
          v: t.v + a.dv * r,
          tension: t.tension,
          friction: t.friction
        };
        return {
          dx: n.v,
          dv: e(n)
        }
      }

      function r(r, a) {
        var n = {
            dx: r.v,
            dv: e(r)
          },
          o = t(r, .5 * a, n),
          i = t(r, .5 * a, o),
          s = t(r, a, i),
          l = 1 / 6 * (n.dx + 2 * (o.dx + i.dx) + s.dx),
          u = 1 / 6 * (n.dv + 2 * (o.dv + i.dv) + s.dv);
        return r.x = r.x + l * a, r.v = r.v + u * a, r
      }
      return function a(e, t, n) {
        var o = {
            x: -1,
            v: 0,
            tension: null,
            friction: null
          },
          i = [0],
          s = 0,
          l = 1e-4,
          u = .016,
          c, p, f;
        for (e = parseFloat(e) || 500, t = parseFloat(t) || 20, n = n || null, o.tension = e, o.friction = t, c = null !== n, c ? (s = a(e, t), p = s / n * u) : p = u;;)
          if (f = r(f || o, p), i.push(1 + f.x), s += 16, !(Math.abs(f.x) > l && Math.abs(f.v) > l)) break;
        return c ? function(e) {
          return i[e * (i.length - 1) | 0]
        } : s
      }
    }();
    v.Easings = {
      linear: function(e) {
        return e
      },
      swing: function(e) {
        return .5 - Math.cos(e * Math.PI) / 2
      },
      spring: function(e) {
        return 1 - Math.cos(4.5 * e * Math.PI) * Math.exp(6 * -e)
      }
    }, $.each([
      ["ease", [.25, .1, .25, 1]],
      ["ease-in", [.42, 0, 1, 1]],
      ["ease-out", [0, 0, .58, 1]],
      ["ease-in-out", [.42, 0, .58, 1]],
      ["easeInSine", [.47, 0, .745, .715]],
      ["easeOutSine", [.39, .575, .565, 1]],
      ["easeInOutSine", [.445, .05, .55, .95]],
      ["easeInQuad", [.55, .085, .68, .53]],
      ["easeOutQuad", [.25, .46, .45, .94]],
      ["easeInOutQuad", [.455, .03, .515, .955]],
      ["easeInCubic", [.55, .055, .675, .19]],
      ["easeOutCubic", [.215, .61, .355, 1]],
      ["easeInOutCubic", [.645, .045, .355, 1]],
      ["easeInQuart", [.895, .03, .685, .22]],
      ["easeOutQuart", [.165, .84, .44, 1]],
      ["easeInOutQuart", [.77, 0, .175, 1]],
      ["easeInQuint", [.755, .05, .855, .06]],
      ["easeOutQuint", [.23, 1, .32, 1]],
      ["easeInOutQuint", [.86, 0, .07, 1]],
      ["easeInExpo", [.95, .05, .795, .035]],
      ["easeOutExpo", [.19, 1, .22, 1]],
      ["easeInOutExpo", [1, 0, 0, 1]],
      ["easeInCirc", [.6, .04, .98, .335]],
      ["easeOutCirc", [.075, .82, .165, 1]],
      ["easeInOutCirc", [.785, .135, .15, .86]]
    ], function(e, t) {
      v.Easings[t[0]] = l.apply(null, t[1])
    });
    var x = v.CSS = {
      RegEx: {
        isHex: /^#([A-f\d]{3}){1,2}$/i,
        valueUnwrap: /^[A-z]+\((.*)\)$/i,
        wrappedValueAlreadyExtracted: /[0-9.]+ [0-9.]+ [0-9.]+( [0-9.]+)?/,
        valueSplit: /([A-z]+\(.+\))|(([A-z0-9#-.]+?)(?=\s|$))/gi
      },
      Lists: {
        colors: ["fill", "stroke", "stopColor", "color", "backgroundColor", "borderColor", "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor", "outlineColor"],
        transformsBase: ["translateX", "translateY", "scale", "scaleX", "scaleY", "skewX", "skewY", "rotateZ"],
        transforms3D: ["transformPerspective", "translateZ", "scaleZ", "rotateX", "rotateY"]
      },
      Hooks: {
        templates: {
          textShadow: ["Color X Y Blur", "black 0px 0px 0px"],
          boxShadow: ["Color X Y Blur Spread", "black 0px 0px 0px 0px"],
          clip: ["Top Right Bottom Left", "0px 0px 0px 0px"],
          backgroundPosition: ["X Y", "0% 0%"],
          transformOrigin: ["X Y Z", "50% 50% 0px"],
          perspectiveOrigin: ["X Y", "50% 50%"]
        },
        registered: {},
        register: function() {
          for (var e = 0; e < x.Lists.colors.length; e++) {
            var t = "color" === x.Lists.colors[e] ? "0 0 0 1" : "255 255 255 1";
            x.Hooks.templates[x.Lists.colors[e]] = ["Red Green Blue Alpha", t]
          }
          var r, a, n;
          if (f)
            for (r in x.Hooks.templates) {
              a = x.Hooks.templates[r], n = a[0].split(" ");
              var o = a[1].match(x.RegEx.valueSplit);
              "Color" === n[0] && (n.push(n.shift()), o.push(o.shift()), x.Hooks.templates[r] = [n.join(" "), o.join(" ")])
            }
          for (r in x.Hooks.templates) {
            a = x.Hooks.templates[r], n = a[0].split(" ");
            for (var e in n) {
              var i = r + n[e],
                s = e;
              x.Hooks.registered[i] = [r, s]
            }
          }
        },
        getRoot: function(e) {
          var t = x.Hooks.registered[e];
          return t ? t[0] : e
        },
        cleanRootPropertyValue: function(e, t) {
          return x.RegEx.valueUnwrap.test(t) && (t = t.match(x.RegEx.valueUnwrap)[1]), x.Values.isCSSNullValue(t) && (t = x.Hooks.templates[e][1]), t
        },
        extractValue: function(e, t) {
          var r = x.Hooks.registered[e];
          if (r) {
            var a = r[0],
              n = r[1];
            return t = x.Hooks.cleanRootPropertyValue(a, t), t.toString().match(x.RegEx.valueSplit)[n]
          }
          return t
        },
        injectValue: function(e, t, r) {
          var a = x.Hooks.registered[e];
          if (a) {
            var n = a[0],
              o = a[1],
              i, s;
            return r = x.Hooks.cleanRootPropertyValue(n, r), i = r.toString().match(x.RegEx.valueSplit), i[o] = t, s = i.join(" ")
          }
          return r
        }
      },
      Normalizations: {
        registered: {
          clip: function(e, t, r) {
            switch (e) {
              case "name":
                return "clip";
              case "extract":
                var a;
                return x.RegEx.wrappedValueAlreadyExtracted.test(r) ? a = r : (a = r.toString().match(x.RegEx.valueUnwrap), a = a ? a[1].replace(/,(\s+)?/g, " ") : r), a;
              case "inject":
                return "rect(" + r + ")"
            }
          },
          blur: function(e, t, r) {
            switch (e) {
              case "name":
                return "-webkit-filter";
              case "extract":
                var a = parseFloat(r);
                if (!a && 0 !== a) {
                  var n = r.toString().match(/blur\(([0-9]+[A-z]+)\)/i);
                  a = n ? n[1] : 0
                }
                return a;
              case "inject":
                return parseFloat(r) ? "blur(" + r + ")" : "none"
            }
          },
          opacity: function(e, t, r) {
            if (8 >= f) switch (e) {
              case "name":
                return "filter";
              case "extract":
                var a = r.toString().match(/alpha\(opacity=(.*)\)/i);
                return r = a ? a[1] / 100 : 1;
              case "inject":
                return t.style.zoom = 1, parseFloat(r) >= 1 ? "" : "alpha(opacity=" + parseInt(100 * parseFloat(r), 10) + ")"
            } else switch (e) {
              case "name":
                return "opacity";
              case "extract":
                return r;
              case "inject":
                return r
            }
          }
        },
        register: function() {
          9 >= f || v.State.isGingerbread || (x.Lists.transformsBase = x.Lists.transformsBase.concat(x.Lists.transforms3D));
          for (var e = 0; e < x.Lists.transformsBase.length; e++) ! function() {
            var t = x.Lists.transformsBase[e];
            x.Normalizations.registered[t] = function(e, r, n) {
              switch (e) {
                case "name":
                  return "transform";
                case "extract":
                  return i(r) === a || i(r).transformCache[t] === a ? /^scale/i.test(t) ? 1 : 0 : i(r).transformCache[t].replace(/[()]/g, "");
                case "inject":
                  var o = !1;
                  switch (t.substr(0, t.length - 1)) {
                    case "translate":
                      o = !/(%|px|em|rem|vw|vh|\d)$/i.test(n);
                      break;
                    case "scal":
                    case "scale":
                      v.State.isAndroid && i(r).transformCache[t] === a && 1 > n && (n = 1), o = !/(\d)$/i.test(n);
                      break;
                    case "skew":
                      o = !/(deg|\d)$/i.test(n);
                      break;
                    case "rotate":
                      o = !/(deg|\d)$/i.test(n)
                  }
                  return o || (i(r).transformCache[t] = "(" + n + ")"), i(r).transformCache[t]
              }
            }
          }();
          for (var e = 0; e < x.Lists.colors.length; e++) ! function() {
            var t = x.Lists.colors[e];
            x.Normalizations.registered[t] = function(e, r, n) {
              switch (e) {
                case "name":
                  return t;
                case "extract":
                  var o;
                  if (x.RegEx.wrappedValueAlreadyExtracted.test(n)) o = n;
                  else {
                    var i, s = {
                      black: "rgb(0, 0, 0)",
                      blue: "rgb(0, 0, 255)",
                      gray: "rgb(128, 128, 128)",
                      green: "rgb(0, 128, 0)",
                      red: "rgb(255, 0, 0)",
                      white: "rgb(255, 255, 255)"
                    };
                    /^[A-z]+$/i.test(n) ? i = s[n] !== a ? s[n] : s.black : x.RegEx.isHex.test(n) ? i = "rgb(" + x.Values.hexToRgb(n).join(" ") + ")" : /^rgba?\(/i.test(n) || (i = s.black), o = (i || n).toString().match(x.RegEx.valueUnwrap)[1].replace(/,(\s+)?/g, " ")
                  }
                  return 8 >= f || 3 !== o.split(" ").length || (o += " 1"), o;
                case "inject":
                  return 8 >= f ? 4 === n.split(" ").length && (n = n.split(/\s+/).slice(0, 3).join(" ")) : 3 === n.split(" ").length && (n += " 1"), (8 >= f ? "rgb" : "rgba") + "(" + n.replace(/\s+/g, ",").replace(/\.(\d)+(?=,)/g, "") + ")"
              }
            }
          }()
        }
      },
      Names: {
        camelCase: function(e) {
          return e.replace(/-(\w)/g, function(e, t) {
            return t.toUpperCase()
          })
        },
        SVGAttribute: function(e) {
          var t = "width|height|x|y|cx|cy|r|rx|ry|x1|x2|y1|y2";
          return (f || v.State.isAndroid && !v.State.isChrome) && (t += "|transform"), new RegExp("^(" + t + ")$", "i").test(e)
        },
        prefixCheck: function(e) {
          if (v.State.prefixMatches[e]) return [v.State.prefixMatches[e], !0];
          for (var t = ["", "Webkit", "Moz", "ms", "O"], r = 0, a = t.length; a > r; r++) {
            var n;
            if (n = 0 === r ? e : t[r] + e.replace(/^\w/, function(e) {
                return e.toUpperCase()
              }), g.isString(v.State.prefixElement.style[n])) return v.State.prefixMatches[e] = n, [n, !0]
          }
          return [e, !1]
        }
      },
      Values: {
        hexToRgb: function(e) {
          var t = /^#?([a-f\d])([a-f\d])([a-f\d])$/i,
            r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i,
            a;
          return e = e.replace(t, function(e, t, r, a) {
            return t + t + r + r + a + a
          }), a = r.exec(e), a ? [parseInt(a[1], 16), parseInt(a[2], 16), parseInt(a[3], 16)] : [0, 0, 0]
        },
        isCSSNullValue: function(e) {
          return 0 == e || /^(none|auto|transparent|(rgba\(0, ?0, ?0, ?0\)))$/i.test(e)
        },
        getUnitType: function(e) {
          return /^(rotate|skew)/i.test(e) ? "deg" : /(^(scale|scaleX|scaleY|scaleZ|alpha|flexGrow|flexHeight|zIndex|fontWeight)$)|((opacity|red|green|blue|alpha)$)/i.test(e) ? "" : "px"
        },
        getDisplayType: function(e) {
          var t = e && e.tagName.toString().toLowerCase();
          return /^(b|big|i|small|tt|abbr|acronym|cite|code|dfn|em|kbd|strong|samp|var|a|bdo|br|img|map|object|q|script|span|sub|sup|button|input|label|select|textarea)$/i.test(t) ? "inline" : /^(li)$/i.test(t) ? "list-item" : /^(tr)$/i.test(t) ? "table-row" : "block"
        },
        addClass: function(e, t) {
          e.classList ? e.classList.add(t) : e.className += (e.className.length ? " " : "") + t
        },
        removeClass: function(e, t) {
          e.classList ? e.classList.remove(t) : e.className = e.className.toString().replace(new RegExp("(^|\\s)" + t.split(" ").join("|") + "(\\s|$)", "gi"), " ")
        }
      },
      getPropertyValue: function(e, r, n, o) {
        function s(e, r) {
          function n() {
            u && x.setPropertyValue(e, "display", "none")
          }
          var l = 0;
          if (8 >= f) l = $.css(e, r);
          else {
            var u = !1;
            if (/^(width|height)$/.test(r) && 0 === x.getPropertyValue(e, "display") && (u = !0, x.setPropertyValue(e, "display", x.Values.getDisplayType(e))), !o) {
              if ("height" === r && "border-box" !== x.getPropertyValue(e, "boxSizing").toString().toLowerCase()) {
                var c = e.offsetHeight - (parseFloat(x.getPropertyValue(e, "borderTopWidth")) || 0) - (parseFloat(x.getPropertyValue(e, "borderBottomWidth")) || 0) - (parseFloat(x.getPropertyValue(e, "paddingTop")) || 0) - (parseFloat(x.getPropertyValue(e, "paddingBottom")) || 0);
                return n(), c
              }
              if ("width" === r && "border-box" !== x.getPropertyValue(e, "boxSizing").toString().toLowerCase()) {
                var p = e.offsetWidth - (parseFloat(x.getPropertyValue(e, "borderLeftWidth")) || 0) - (parseFloat(x.getPropertyValue(e, "borderRightWidth")) || 0) - (parseFloat(x.getPropertyValue(e, "paddingLeft")) || 0) - (parseFloat(x.getPropertyValue(e, "paddingRight")) || 0);
                return n(), p
              }
            }
            var d;
            d = i(e) === a ? t.getComputedStyle(e, null) : i(e).computedStyle ? i(e).computedStyle : i(e).computedStyle = t.getComputedStyle(e, null), (f || v.State.isFirefox) && "borderColor" === r && (r = "borderTopColor"), l = 9 === f && "filter" === r ? d.getPropertyValue(r) : d[r], ("" === l || null === l) && (l = e.style[r]), n()
          }
          if ("auto" === l && /^(top|right|bottom|left)$/i.test(r)) {
            var g = s(e, "position");
            ("fixed" === g || "absolute" === g && /top|left/i.test(r)) && (l = $(e).position()[r] + "px")
          }
          return l
        }
        var l;
        if (x.Hooks.registered[r]) {
          var u = r,
            c = x.Hooks.getRoot(u);
          n === a && (n = x.getPropertyValue(e, x.Names.prefixCheck(c)[0])), x.Normalizations.registered[c] && (n = x.Normalizations.registered[c]("extract", e, n)), l = x.Hooks.extractValue(u, n)
        } else if (x.Normalizations.registered[r]) {
          var p, d;
          p = x.Normalizations.registered[r]("name", e), "transform" !== p && (d = s(e, x.Names.prefixCheck(p)[0]), x.Values.isCSSNullValue(d) && x.Hooks.templates[r] && (d = x.Hooks.templates[r][1])), l = x.Normalizations.registered[r]("extract", e, d)
        }
        return /^[\d-]/.test(l) || (l = i(e) && i(e).isSVG && x.Names.SVGAttribute(r) ? /^(height|width)$/i.test(r) ? e.getBBox()[r] : e.getAttribute(r) : s(e, x.Names.prefixCheck(r)[0])), x.Values.isCSSNullValue(l) && (l = 0), v.debug >= 2 && console.log("Get " + r + ": " + l), l
      },
      setPropertyValue: function(e, r, a, n, o) {
        var s = r;
        if ("scroll" === r) o.container ? o.container["scroll" + o.direction] = a : "Left" === o.direction ? t.scrollTo(a, o.alternateValue) : t.scrollTo(o.alternateValue, a);
        else if (x.Normalizations.registered[r] && "transform" === x.Normalizations.registered[r]("name", e)) x.Normalizations.registered[r]("inject", e, a), s = "transform", a = i(e).transformCache[r];
        else {
          if (x.Hooks.registered[r]) {
            var l = r,
              u = x.Hooks.getRoot(r);
            n = n || x.getPropertyValue(e, u), a = x.Hooks.injectValue(l, a, n), r = u
          }
          if (x.Normalizations.registered[r] && (a = x.Normalizations.registered[r]("inject", e, a), r = x.Normalizations.registered[r]("name", e)), s = x.Names.prefixCheck(r)[0], 8 >= f) try {
            e.style[s] = a
          } catch (c) {
            v.debug && console.log("Browser does not support [" + a + "] for [" + s + "]")
          } else i(e) && i(e).isSVG && x.Names.SVGAttribute(r) ? e.setAttribute(r, a) : e.style[s] = a;
          v.debug >= 2 && console.log("Set " + r + " (" + s + "): " + a)
        }
        return [s, a]
      },
      flushTransformCache: function(e) {
        function t(t) {
          return parseFloat(x.getPropertyValue(e, t))
        }
        var r = "";
        if ((f || v.State.isAndroid && !v.State.isChrome) && i(e).isSVG) {
          var a = {
            translate: [t("translateX"), t("translateY")],
            skewX: [t("skewX")],
            skewY: [t("skewY")],
            scale: 1 !== t("scale") ? [t("scale"), t("scale")] : [t("scaleX"), t("scaleY")],
            rotate: [t("rotateZ"), 0, 0]
          };
          $.each(i(e).transformCache, function(e) {
            /^translate/i.test(e) ? e = "translate" : /^scale/i.test(e) ? e = "scale" : /^rotate/i.test(e) && (e = "rotate"), a[e] && (r += e + "(" + a[e].join(" ") + ") ", delete a[e])
          })
        } else {
          var n, o;
          $.each(i(e).transformCache, function(t) {
            return n = i(e).transformCache[t], "transformPerspective" === t ? (o = n, !0) : (9 === f && "rotateZ" === t && (t = "rotate"), void(r += t + n + " "))
          }), o && (r = "perspective" + o + " " + r)
        }
        x.setPropertyValue(e, "transform", r)
      }
    };
    x.Hooks.register(), x.Normalizations.register(), v.hook = function(e, t, r) {
      var n = a;
      return e = o(e), $.each(e, function(e, o) {
        if (i(o) === a && v.init(o), r === a) n === a && (n = v.CSS.getPropertyValue(o, t));
        else {
          var s = v.CSS.setPropertyValue(o, t, r);
          "transform" === s[0] && v.CSS.flushTransformCache(o), n = s
        }
      }), n
    };
    var S = function() {
      function e() {
        return f ? k.promise || null : d
      }

      function s() {
        function e(e) {
          function f(e, t) {
            var r = a,
              n = a,
              i = a;
            return g.isArray(e) ? (r = e[0], !g.isArray(e[1]) && /^[\d-]/.test(e[1]) || g.isFunction(e[1]) || x.RegEx.isHex.test(e[1]) ? i = e[1] : (g.isString(e[1]) && !x.RegEx.isHex.test(e[1]) || g.isArray(e[1])) && (n = t ? e[1] : u(e[1], s.duration), e[2] !== a && (i = e[2]))) : r = e, t || (n = n || s.easing), g.isFunction(r) && (r = r.call(o, V, w)), g.isFunction(i) && (i = i.call(o, V, w)), [r || 0, n, i]
          }

          function d(e, t) {
            var r, a;
            return a = (t || "0").toString().toLowerCase().replace(/[%A-z]+$/, function(e) {
              return r = e, ""
            }), r || (r = x.Values.getUnitType(e)), [a, r]
          }

          function m() {
            var e = {
                myParent: o.parentNode || r.body,
                position: x.getPropertyValue(o, "position"),
                fontSize: x.getPropertyValue(o, "fontSize")
              },
              a = e.position === L.lastPosition && e.myParent === L.lastParent,
              n = e.fontSize === L.lastFontSize;
            L.lastParent = e.myParent, L.lastPosition = e.position, L.lastFontSize = e.fontSize;
            var s = 100,
              l = {};
            if (n && a) l.emToPx = L.lastEmToPx, l.percentToPxWidth = L.lastPercentToPxWidth, l.percentToPxHeight = L.lastPercentToPxHeight;
            else {
              var u = i(o).isSVG ? r.createElementNS("http://www.w3.org/2000/svg", "rect") : r.createElement("div");
              v.init(u), e.myParent.appendChild(u), $.each(["overflow", "overflowX", "overflowY"], function(e, t) {
                v.CSS.setPropertyValue(u, t, "hidden")
              }), v.CSS.setPropertyValue(u, "position", e.position), v.CSS.setPropertyValue(u, "fontSize", e.fontSize), v.CSS.setPropertyValue(u, "boxSizing", "content-box"), $.each(["minWidth", "maxWidth", "width", "minHeight", "maxHeight", "height"], function(e, t) {
                v.CSS.setPropertyValue(u, t, s + "%")
              }), v.CSS.setPropertyValue(u, "paddingLeft", s + "em"), l.percentToPxWidth = L.lastPercentToPxWidth = (parseFloat(x.getPropertyValue(u, "width", null, !0)) || 1) / s, l.percentToPxHeight = L.lastPercentToPxHeight = (parseFloat(x.getPropertyValue(u, "height", null, !0)) || 1) / s, l.emToPx = L.lastEmToPx = (parseFloat(x.getPropertyValue(u, "paddingLeft")) || 1) / s, e.myParent.removeChild(u)
            }
            return null === L.remToPx && (L.remToPx = parseFloat(x.getPropertyValue(r.body, "fontSize")) || 16), null === L.vwToPx && (L.vwToPx = parseFloat(t.innerWidth) / 100, L.vhToPx = parseFloat(t.innerHeight) / 100), l.remToPx = L.remToPx, l.vwToPx = L.vwToPx, l.vhToPx = L.vhToPx, v.debug >= 1 && console.log("Unit ratios: " + JSON.stringify(l), o), l
          }
          if (s.begin && 0 === V) try {
            s.begin.call(h, h)
          } catch (y) {
            setTimeout(function() {
              throw y
            }, 1)
          }
          if ("scroll" === A) {
            var S = /^x$/i.test(s.axis) ? "Left" : "Top",
              C = parseFloat(s.offset) || 0,
              T, F, E;
            s.container ? g.isWrapped(s.container) || g.isNode(s.container) ? (s.container = s.container[0] || s.container, T = s.container["scroll" + S], E = T + $(o).position()[S.toLowerCase()] + C) : s.container = null : (T = v.State.scrollAnchor[v.State["scrollProperty" + S]], F = v.State.scrollAnchor[v.State["scrollProperty" + ("Left" === S ? "Top" : "Left")]], E = $(o).offset()[S.toLowerCase()] + C), l = {
              scroll: {
                rootPropertyValue: !1,
                startValue: T,
                currentValue: T,
                endValue: E,
                unitType: "",
                easing: s.easing,
                scrollData: {
                  container: s.container,
                  direction: S,
                  alternateValue: F
                }
              },
              element: o
            }, v.debug && console.log("tweensContainer (scroll): ", l.scroll, o)
          } else if ("reverse" === A) {
            if (!i(o).tweensContainer) return void $.dequeue(o, s.queue);
            "none" === i(o).opts.display && (i(o).opts.display = "auto"), "hidden" === i(o).opts.visibility && (i(o).opts.visibility = "visible"), i(o).opts.loop = !1, i(o).opts.begin = null, i(o).opts.complete = null, P.easing || delete s.easing, P.duration || delete s.duration, s = $.extend({}, i(o).opts, s);
            var j = $.extend(!0, {}, i(o).tweensContainer);
            for (var H in j)
              if ("element" !== H) {
                var N = j[H].startValue;
                j[H].startValue = j[H].currentValue = j[H].endValue, j[H].endValue = N, g.isEmptyObject(P) || (j[H].easing = s.easing), v.debug && console.log("reverse tweensContainer (" + H + "): " + JSON.stringify(j[H]), o)
              }
            l = j
          } else if ("start" === A) {
            var j;
            i(o).tweensContainer && i(o).isAnimating === !0 && (j = i(o).tweensContainer), $.each(b, function(e, t) {
              if (RegExp("^" + x.Lists.colors.join("$|^") + "$").test(e)) {
                var r = f(t, !0),
                  n = r[0],
                  o = r[1],
                  i = r[2];
                if (x.RegEx.isHex.test(n)) {
                  for (var s = ["Red", "Green", "Blue"], l = x.Values.hexToRgb(n), u = i ? x.Values.hexToRgb(i) : a, c = 0; c < s.length; c++) {
                    var p = [l[c]];
                    o && p.push(o), u !== a && p.push(u[c]), b[e + s[c]] = p
                  }
                  delete b[e]
                }
              }
            });
            for (var O in b) {
              var z = f(b[O]),
                q = z[0],
                M = z[1],
                I = z[2];
              O = x.Names.camelCase(O);
              var B = x.Hooks.getRoot(O),
                W = !1;
              if (i(o).isSVG || x.Names.prefixCheck(B)[1] !== !1 || x.Normalizations.registered[B] !== a) {
                (s.display !== a && null !== s.display && "none" !== s.display || s.visibility !== a && "hidden" !== s.visibility) && /opacity|filter/.test(O) && !I && 0 !== q && (I = 0), s._cacheValues && j && j[O] ? (I === a && (I = j[O].endValue + j[O].unitType), W = i(o).rootPropertyValueCache[B]) : x.Hooks.registered[O] ? I === a ? (W = x.getPropertyValue(o, B), I = x.getPropertyValue(o, O, W)) : W = x.Hooks.templates[B][1] : I === a && (I = x.getPropertyValue(o, O));
                var G, D, X, Y = !1;
                if (G = d(O, I), I = G[0], X = G[1], G = d(O, q), q = G[0].replace(/^([+-\/*])=/, function(e, t) {
                    return Y = t, ""
                  }), D = G[1], I = parseFloat(I) || 0, q = parseFloat(q) || 0, "%" === D && (/^(fontSize|lineHeight)$/.test(O) ? (q /= 100, D = "em") : /^scale/.test(O) ? (q /= 100, D = "") : /(Red|Green|Blue)$/i.test(O) && (q = q / 100 * 255, D = "")), /[\/*]/.test(Y)) D = X;
                else if (X !== D && 0 !== I)
                  if (0 === q) D = X;
                  else {
                    p = p || m();
                    var Q = /margin|padding|left|right|width|text|word|letter/i.test(O) || /X$/.test(O) || "x" === O ? "x" : "y";
                    switch (X) {
                      case "%":
                        I *= "x" === Q ? p.percentToPxWidth : p.percentToPxHeight;
                        break;
                      case "px":
                        break;
                      default:
                        I *= p[X + "ToPx"]
                    }
                    switch (D) {
                      case "%":
                        I *= 1 / ("x" === Q ? p.percentToPxWidth : p.percentToPxHeight);
                        break;
                      case "px":
                        break;
                      default:
                        I *= 1 / p[D + "ToPx"]
                    }
                  }
                switch (Y) {
                  case "+":
                    q = I + q;
                    break;
                  case "-":
                    q = I - q;
                    break;
                  case "*":
                    q = I * q;
                    break;
                  case "/":
                    q = I / q
                }
                l[O] = {
                  rootPropertyValue: W,
                  startValue: I,
                  currentValue: I,
                  endValue: q,
                  unitType: D,
                  easing: M
                }, v.debug && console.log("tweensContainer (" + O + "): " + JSON.stringify(l[O]), o)
              } else v.debug && console.log("Skipping [" + B + "] due to a lack of browser support.")
            }
            l.element = o
          }
          l.element && (x.Values.addClass(o, "velocity-animating"), R.push(l), "" === s.queue && (i(o).tweensContainer = l, i(o).opts = s), i(o).isAnimating = !0, V === w - 1 ? (v.State.calls.length > 1e4 && (v.State.calls = n(v.State.calls)), v.State.calls.push([R, h, s, null, k.resolver]), v.State.isTicking === !1 && (v.State.isTicking = !0, c())) : V++)
        }
        var o = this,
          s = $.extend({}, v.defaults, P),
          l = {},
          p;
        switch (i(o) === a && v.init(o), parseFloat(s.delay) && s.queue !== !1 && $.queue(o, s.queue, function(e) {
          v.velocityQueueEntryFlag = !0, i(o).delayTimer = {
            setTimeout: setTimeout(e, parseFloat(s.delay)),
            next: e
          }
        }), s.duration.toString().toLowerCase()) {
          case "fast":
            s.duration = 200;
            break;
          case "normal":
            s.duration = y;
            break;
          case "slow":
            s.duration = 600;
            break;
          default:
            s.duration = parseFloat(s.duration) || 1
        }
        v.mock !== !1 && (v.mock === !0 ? s.duration = s.delay = 1 : (s.duration *= parseFloat(v.mock) || 1, s.delay *= parseFloat(v.mock) || 1)), s.easing = u(s.easing, s.duration), s.begin && !g.isFunction(s.begin) && (s.begin = null), s.progress && !g.isFunction(s.progress) && (s.progress = null), s.complete && !g.isFunction(s.complete) && (s.complete = null), s.display !== a && null !== s.display && (s.display = s.display.toString().toLowerCase(), "auto" === s.display && (s.display = v.CSS.Values.getDisplayType(o))), s.visibility !== a && null !== s.visibility && (s.visibility = s.visibility.toString().toLowerCase()), s.mobileHA = s.mobileHA && v.State.isMobile && !v.State.isGingerbread, s.queue === !1 ? s.delay ? setTimeout(e, s.delay) : e() : $.queue(o, s.queue, function(t, r) {
          return r === !0 ? (k.promise && k.resolver(h), !0) : (v.velocityQueueEntryFlag = !0, void e(t))
        }), "" !== s.queue && "fx" !== s.queue || "inprogress" === $.queue(o)[0] || $.dequeue(o)
      }
      var l = arguments[0] && ($.isPlainObject(arguments[0].properties) && !arguments[0].properties.names || g.isString(arguments[0].properties)),
        f, d, m, h, b, P;
      if (g.isWrapped(this) ? (f = !1, m = 0, h = this, d = this) : (f = !0, m = 1, h = l ? arguments[0].elements : arguments[0]), h = o(h)) {
        l ? (b = arguments[0].properties, P = arguments[0].options) : (b = arguments[m], P = arguments[m + 1]);
        var w = h.length,
          V = 0;
        if ("stop" !== b && !$.isPlainObject(P)) {
          var C = m + 1;
          P = {};
          for (var T = C; T < arguments.length; T++) g.isArray(arguments[T]) || !/^(fast|normal|slow)$/i.test(arguments[T]) && !/^\d/.test(arguments[T]) ? g.isString(arguments[T]) || g.isArray(arguments[T]) ? P.easing = arguments[T] : g.isFunction(arguments[T]) && (P.complete = arguments[T]) : P.duration = arguments[T]
        }
        var k = {
          promise: null,
          resolver: null,
          rejecter: null
        };
        f && v.Promise && (k.promise = new v.Promise(function(e, t) {
          k.resolver = e, k.rejecter = t
        }));
        var A;
        switch (b) {
          case "scroll":
            A = "scroll";
            break;
          case "reverse":
            A = "reverse";
            break;
          case "stop":
            $.each(h, function(e, t) {
              i(t) && i(t).delayTimer && (clearTimeout(i(t).delayTimer.setTimeout), i(t).delayTimer.next && i(t).delayTimer.next(), delete i(t).delayTimer)
            });
            var F = [];
            return $.each(v.State.calls, function(e, t) {
              t && $.each(t[1], function(r, n) {
                var o = g.isString(P) ? P : "";
                return P !== a && t[2].queue !== o ? !0 : void $.each(h, function(t, r) {
                  r === n && (P !== a && ($.each($.queue(r, o), function(e, t) {
                    g.isFunction(t) && t(null, !0)
                  }), $.queue(r, o, [])), i(r) && "" === o && $.each(i(r).tweensContainer, function(e, t) {
                    t.endValue = t.currentValue
                  }), F.push(e))
                })
              })
            }), $.each(F, function(e, t) {
              p(t, !0)
            }), k.promise && k.resolver(h), e();
          default:
            if (!$.isPlainObject(b) || g.isEmptyObject(b)) {
              if (g.isString(b) && v.Redirects[b]) {
                var E = $.extend({}, P),
                  j = E.duration,
                  H = E.delay || 0;
                return E.backwards === !0 && (h = $.extend(!0, [], h).reverse()), $.each(h, function(e, t) {
                  parseFloat(E.stagger) ? E.delay = H + parseFloat(E.stagger) * e : g.isFunction(E.stagger) && (E.delay = H + E.stagger.call(t, e, w)), E.drag && (E.duration = parseFloat(j) || (/^(callout|transition)/.test(b) ? 1e3 : y), E.duration = Math.max(E.duration * (E.backwards ? 1 - e / w : (e + 1) / w), .75 * E.duration, 200)), v.Redirects[b].call(t, t, E || {}, e, w, h, k.promise ? k : a)
                }), e()
              }
              var N = "Velocity: First argument (" + b + ") was not a property map, a known action, or a registered redirect. Aborting.";
              return k.promise ? k.rejecter(new Error(N)) : console.log(N), e()
            }
            A = "start"
        }
        var L = {
            lastParent: null,
            lastPosition: null,
            lastFontSize: null,
            lastPercentToPxWidth: null,
            lastPercentToPxHeight: null,
            lastEmToPx: null,
            remToPx: null,
            vwToPx: null,
            vhToPx: null
          },
          R = [];
        $.each(h, function(e, t) {
          g.isNode(t) && s.call(t)
        });
        var E = $.extend({}, v.defaults, P),
          O;
        if (E.loop = parseInt(E.loop), O = 2 * E.loop - 1, E.loop)
          for (var z = 0; O > z; z++) {
            var q = {
              delay: E.delay,
              progress: E.progress
            };
            z === O - 1 && (q.display = E.display, q.visibility = E.visibility, q.complete = E.complete), S(h, "reverse", q)
          }
        return e()
      }
    };
    v = $.extend(S, v), v.animate = S;
    var P = t.requestAnimationFrame || d;
    return v.State.isMobile || r.hidden === a || r.addEventListener("visibilitychange", function() {
      r.hidden ? (P = function(e) {
        return setTimeout(function() {
          e(!0)
        }, 16)
      }, c()) : P = t.requestAnimationFrame || d
    }), e.Velocity = v, e !== t && (e.fn.velocity = S, e.fn.velocity.defaults = v.defaults), $.each(["Down", "Up"], function(e, t) {
      v.Redirects["slide" + t] = function(e, r, n, o, i, s) {
        var l = $.extend({}, r),
          u = l.begin,
          c = l.complete,
          p = {
            height: "",
            marginTop: "",
            marginBottom: "",
            paddingTop: "",
            paddingBottom: ""
          },
          f = {};
        l.display === a && (l.display = "Down" === t ? "inline" === v.CSS.Values.getDisplayType(e) ? "inline-block" : "block" : "none"), l.begin = function() {
          u && u.call(i, i);
          for (var r in p) {
            f[r] = e.style[r];
            var a = v.CSS.getPropertyValue(e, r);
            p[r] = "Down" === t ? [a, 0] : [0, a]
          }
          f.overflow = e.style.overflow, e.style.overflow = "hidden"
        }, l.complete = function() {
          for (var t in f) e.style[t] = f[t];
          c && c.call(i, i), s && s.resolver(i)
        }, v(e, p, l)
      }
    }), $.each(["In", "Out"], function(e, t) {
      v.Redirects["fade" + t] = function(e, r, n, o, i, s) {
        var l = $.extend({}, r),
          u = {
            opacity: "In" === t ? 1 : 0
          },
          c = l.complete;
        l.complete = n !== o - 1 ? l.begin = null : function() {
          c && c.call(i, i), s && s.resolver(i)
        }, l.display === a && (l.display = "In" === t ? "auto" : "none"), v(this, u, l)
      }
    }), v
  }(window.jQuery || window.Zepto || window, window, document)
});
/* JSONPath 0.8.0 - XPath for JSON
 *
 * Copyright (c) 2007 Stefan Goessner (goessner.net)
 * Licensed under the MIT (MIT-LICENSE.txt) licence.
 */
function jsonPath(obj, expr, arg) {
	var P = {
		resultType: arg && arg.resultType || "VALUE",
		result: [],
		normalize: function (expr) {
			var subx = [];
			return expr.replace(/[\['](\??\(.*?\))[\]']/g, function ($0, $1) { return "[#" + (subx.push($1) - 1) + "]"; })
					   .replace(/'?\.'?|\['?/g, ";")
					   .replace(/;;;|;;/g, ";..;")
					   .replace(/;$|'?\]|'$/g, "")
					   .replace(/#([0-9]+)/g, function ($0, $1) { return subx[$1]; });
		},
		asPath: function (path) {
			var x = path.split(";"), p = "$";
			for (var i = 1, n = x.length; i < n; i++)
				p += /^[0-9*]+$/.test(x[i]) ? ("[" + x[i] + "]") : ("['" + x[i] + "']");
			return p;
		},
		store: function (p, v) {
			if (p) P.result[P.result.length] = P.resultType == "PATH" ? P.asPath(p) : v;
			return !!p;
		},
		trace: function (expr, val, path) {
			if (expr) {
				var x = expr.split(";"), loc = x.shift();
				x = x.join(";");
				if (val && val.hasOwnProperty(loc))
					P.trace(x, val[loc], path + ";" + loc);
				else if (loc === "*")
					P.walk(loc, x, val, path, function (m, l, x, v, p) { P.trace(m + ";" + x, v, p); });
				else if (loc === "..") {
					P.trace(x, val, path);
					P.walk(loc, x, val, path, function (m, l, x, v, p) { typeof v[m] === "object" && P.trace("..;" + x, v[m], p + ";" + m); });
				}
				else if (/,/.test(loc)) { // [name1,name2,...]
					for (var s = loc.split(/'?,'?/), i = 0, n = s.length; i < n; i++)
						P.trace(s[i] + ";" + x, val, path);
				}
				else if (/^\(.*?\)$/.test(loc)) // [(expr)]
					P.trace(P.eval(loc, val, path.substr(path.lastIndexOf(";") + 1)) + ";" + x, val, path);
				else if (/^\?\(.*?\)$/.test(loc)) // [?(expr)]
					P.walk(loc, x, val, path, function (m, l, x, v, p) { if (P.eval(l.replace(/^\?\((.*?)\)$/, "$1"), v[m], m)) P.trace(m + ";" + x, v, p); });
				else if (/^(-?[0-9]*):(-?[0-9]*):?([0-9]*)$/.test(loc)) // [start:end:step]  phyton slice syntax
					P.slice(loc, x, val, path);
			}
			else
				P.store(path, val);
		},
		walk: function (loc, expr, val, path, f) {
			if (val instanceof Array) {
				for (var i = 0, n = val.length; i < n; i++)
					if (i in val)
						f(i, loc, expr, val, path);
			}
			else if (typeof val === "object") {
				for (var m in val)
					if (val.hasOwnProperty(m))
						f(m, loc, expr, val, path);
			}
		},
		slice: function (loc, expr, val, path) {
			if (val instanceof Array) {
				var len = val.length, start = 0, end = len, step = 1;
				loc.replace(/^(-?[0-9]*):(-?[0-9]*):?(-?[0-9]*)$/g, function ($0, $1, $2, $3) { start = parseInt($1 || start); end = parseInt($2 || end); step = parseInt($3 || step); });
				start = (start < 0) ? Math.max(0, start + len) : Math.min(len, start);
				end = (end < 0) ? Math.max(0, end + len) : Math.min(len, end);
				for (var i = start; i < end; i += step)
					P.trace(i + ";" + expr, val, path);
			}
		},
		eval: function (x, _v, _vname) {
			try { return $ && _v && eval(x.replace(/@/g, "_v")); }
			catch (e) { throw new SyntaxError("jsonPath: " + e.message + ": " + x.replace(/@/g, "_v").replace(/\^/g, "_a")); }
		}
	};

	var $ = obj;
	if (expr && obj && (P.resultType == "VALUE" || P.resultType == "PATH")) {
		P.trace(P.normalize(expr).replace(/^\$;/, ""), obj, "$");
		return P.result.length ? P.result : false;
	}
}

//! moment.js
//! version : 2.7.0
//! authors : Tim Wood, Iskren Chernev, Moment.js contributors
//! license : MIT
//! momentjs.com

(function (undefined) {

	/************************************
		Constants
	************************************/

	var moment,
		VERSION = "2.7.0",
		// the global-scope this is NOT the global object in Node.js
		globalScope = typeof global !== 'undefined' ? global : this,
		oldGlobalMoment,
		round = Math.round,
		i,

		YEAR = 0,
		MONTH = 1,
		DATE = 2,
		HOUR = 3,
		MINUTE = 4,
		SECOND = 5,
		MILLISECOND = 6,

		// internal storage for language config files
		languages = {},

		// moment internal properties
		momentProperties = {
			_isAMomentObject: null,
			_i: null,
			_f: null,
			_l: null,
			_strict: null,
			_tzm: null,
			_isUTC: null,
			_offset: null,  // optional. Combine with _isUTC
			_pf: null,
			_lang: null  // optional
		},

		// check for nodeJS
		hasModule = (typeof module !== 'undefined' && module.exports),

		// ASP.NET json date format regex
		aspNetJsonRegex = /^\/?Date\((\-?\d+)/i,
		aspNetTimeSpanJsonRegex = /(\-)?(?:(\d*)\.)?(\d+)\:(\d+)(?:\:(\d+)\.?(\d{3})?)?/,

		// from http://docs.closure-library.googlecode.com/git/closure_goog_date_date.js.source.html
		// somewhat more in line with 4.4.3.2 2004 spec, but allows decimal anywhere
		isoDurationRegex = /^(-)?P(?:(?:([0-9,.]*)Y)?(?:([0-9,.]*)M)?(?:([0-9,.]*)D)?(?:T(?:([0-9,.]*)H)?(?:([0-9,.]*)M)?(?:([0-9,.]*)S)?)?|([0-9,.]*)W)$/,

		// format tokens
		formattingTokens = /(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Q|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|mm?|ss?|S{1,4}|X|zz?|ZZ?|.)/g,
		localFormattingTokens = /(\[[^\[]*\])|(\\)?(LT|LL?L?L?|l{1,4})/g,

		// parsing token regexes
		parseTokenOneOrTwoDigits = /\d\d?/, // 0 - 99
		parseTokenOneToThreeDigits = /\d{1,3}/, // 0 - 999
		parseTokenOneToFourDigits = /\d{1,4}/, // 0 - 9999
		parseTokenOneToSixDigits = /[+\-]?\d{1,6}/, // -999,999 - 999,999
		parseTokenDigits = /\d+/, // nonzero number of digits
		parseTokenWord = /[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i, // any word (or two) characters or numbers including two/three word month in arabic.
		parseTokenTimezone = /Z|[\+\-]\d\d:?\d\d/gi, // +00:00 -00:00 +0000 -0000 or Z
		parseTokenT = /T/i, // T (ISO separator)
		parseTokenTimestampMs = /[\+\-]?\d+(\.\d{1,3})?/, // 123456789 123456789.123
		parseTokenOrdinal = /\d{1,2}/,

		//strict parsing regexes
		parseTokenOneDigit = /\d/, // 0 - 9
		parseTokenTwoDigits = /\d\d/, // 00 - 99
		parseTokenThreeDigits = /\d{3}/, // 000 - 999
		parseTokenFourDigits = /\d{4}/, // 0000 - 9999
		parseTokenSixDigits = /[+-]?\d{6}/, // -999,999 - 999,999
		parseTokenSignedNumber = /[+-]?\d+/, // -inf - inf

		// iso 8601 regex
		// 0000-00-00 0000-W00 or 0000-W00-0 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000 or +00)
		isoRegex = /^\s*(?:[+-]\d{6}|\d{4})-(?:(\d\d-\d\d)|(W\d\d$)|(W\d\d-\d)|(\d\d\d))((T| )(\d\d(:\d\d(:\d\d(\.\d+)?)?)?)?([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/,

		isoFormat = 'YYYY-MM-DDTHH:mm:ssZ',

		isoDates = [
			['YYYYYY-MM-DD', /[+-]\d{6}-\d{2}-\d{2}/],
			['YYYY-MM-DD', /\d{4}-\d{2}-\d{2}/],
			['GGGG-[W]WW-E', /\d{4}-W\d{2}-\d/],
			['GGGG-[W]WW', /\d{4}-W\d{2}/],
			['YYYY-DDD', /\d{4}-\d{3}/]
		],

		// iso time formats and regexes
		isoTimes = [
			['HH:mm:ss.SSSS', /(T| )\d\d:\d\d:\d\d\.\d+/],
			['HH:mm:ss', /(T| )\d\d:\d\d:\d\d/],
			['HH:mm', /(T| )\d\d:\d\d/],
			['HH', /(T| )\d\d/]
		],

		// timezone chunker "+10:00" > ["10", "00"] or "-1530" > ["-15", "30"]
		parseTimezoneChunker = /([\+\-]|\d\d)/gi,

		// getter and setter names
		proxyGettersAndSetters = 'Date|Hours|Minutes|Seconds|Milliseconds'.split('|'),
		unitMillisecondFactors = {
			'Milliseconds': 1,
			'Seconds': 1e3,
			'Minutes': 6e4,
			'Hours': 36e5,
			'Days': 864e5,
			'Months': 2592e6,
			'Years': 31536e6
		},

		unitAliases = {
			ms: 'millisecond',
			s: 'second',
			m: 'minute',
			h: 'hour',
			d: 'day',
			D: 'date',
			w: 'week',
			W: 'isoWeek',
			M: 'month',
			Q: 'quarter',
			y: 'year',
			DDD: 'dayOfYear',
			e: 'weekday',
			E: 'isoWeekday',
			gg: 'weekYear',
			GG: 'isoWeekYear'
		},

		camelFunctions = {
			dayofyear: 'dayOfYear',
			isoweekday: 'isoWeekday',
			isoweek: 'isoWeek',
			weekyear: 'weekYear',
			isoweekyear: 'isoWeekYear'
		},

		// format function strings
		formatFunctions = {},

		// default relative time thresholds
		relativeTimeThresholds = {
			s: 45,   //seconds to minutes
			m: 45,   //minutes to hours
			h: 22,   //hours to days
			dd: 25,  //days to month (month == 1)
			dm: 45,  //days to months (months > 1)
			dy: 345  //days to year
		},

		// tokens to ordinalize and pad
		ordinalizeTokens = 'DDD w W M D d'.split(' '),
		paddedTokens = 'M D H h m s w W'.split(' '),

		formatTokenFunctions = {
			M: function () {
				return this.month() + 1;
			},
			MMM: function (format) {
				return this.lang().monthsShort(this, format);
			},
			MMMM: function (format) {
				return this.lang().months(this, format);
			},
			D: function () {
				return this.date();
			},
			DDD: function () {
				return this.dayOfYear();
			},
			d: function () {
				return this.day();
			},
			dd: function (format) {
				return this.lang().weekdaysMin(this, format);
			},
			ddd: function (format) {
				return this.lang().weekdaysShort(this, format);
			},
			dddd: function (format) {
				return this.lang().weekdays(this, format);
			},
			w: function () {
				return this.week();
			},
			W: function () {
				return this.isoWeek();
			},
			YY: function () {
				return leftZeroFill(this.year() % 100, 2);
			},
			YYYY: function () {
				return leftZeroFill(this.year(), 4);
			},
			YYYYY: function () {
				return leftZeroFill(this.year(), 5);
			},
			YYYYYY: function () {
				var y = this.year(), sign = y >= 0 ? '+' : '-';
				return sign + leftZeroFill(Math.abs(y), 6);
			},
			gg: function () {
				return leftZeroFill(this.weekYear() % 100, 2);
			},
			gggg: function () {
				return leftZeroFill(this.weekYear(), 4);
			},
			ggggg: function () {
				return leftZeroFill(this.weekYear(), 5);
			},
			GG: function () {
				return leftZeroFill(this.isoWeekYear() % 100, 2);
			},
			GGGG: function () {
				return leftZeroFill(this.isoWeekYear(), 4);
			},
			GGGGG: function () {
				return leftZeroFill(this.isoWeekYear(), 5);
			},
			e: function () {
				return this.weekday();
			},
			E: function () {
				return this.isoWeekday();
			},
			a: function () {
				return this.lang().meridiem(this.hours(), this.minutes(), true);
			},
			A: function () {
				return this.lang().meridiem(this.hours(), this.minutes(), false);
			},
			H: function () {
				return this.hours();
			},
			h: function () {
				return this.hours() % 12 || 12;
			},
			m: function () {
				return this.minutes();
			},
			s: function () {
				return this.seconds();
			},
			S: function () {
				return toInt(this.milliseconds() / 100);
			},
			SS: function () {
				return leftZeroFill(toInt(this.milliseconds() / 10), 2);
			},
			SSS: function () {
				return leftZeroFill(this.milliseconds(), 3);
			},
			SSSS: function () {
				return leftZeroFill(this.milliseconds(), 3);
			},
			Z: function () {
				var a = -this.zone(),
					b = "+";
				if (a < 0) {
					a = -a;
					b = "-";
				}
				return b + leftZeroFill(toInt(a / 60), 2) + ":" + leftZeroFill(toInt(a) % 60, 2);
			},
			ZZ: function () {
				var a = -this.zone(),
					b = "+";
				if (a < 0) {
					a = -a;
					b = "-";
				}
				return b + leftZeroFill(toInt(a / 60), 2) + leftZeroFill(toInt(a) % 60, 2);
			},
			z: function () {
				return this.zoneAbbr();
			},
			zz: function () {
				return this.zoneName();
			},
			X: function () {
				return this.unix();
			},
			Q: function () {
				return this.quarter();
			}
		},

		lists = ['months', 'monthsShort', 'weekdays', 'weekdaysShort', 'weekdaysMin'];

	// Pick the first defined of two or three arguments. dfl comes from
	// default.
	function dfl(a, b, c) {
		switch (arguments.length) {
			case 2: return a != null ? a : b;
			case 3: return a != null ? a : b != null ? b : c;
			default: throw new Error("Implement me");
		}
	}

	function defaultParsingFlags() {
		// We need to deep clone this object, and es5 standard is not very
		// helpful.
		return {
			empty: false,
			unusedTokens: [],
			unusedInput: [],
			overflow: -2,
			charsLeftOver: 0,
			nullInput: false,
			invalidMonth: null,
			invalidFormat: false,
			userInvalidated: false,
			iso: false
		};
	}

	function deprecate(msg, fn) {
		var firstTime = true;
		function printMsg() {
			if (moment.suppressDeprecationWarnings === false &&
					typeof console !== 'undefined' && console.warn) {
				console.warn("Deprecation warning: " + msg);
			}
		}
		return extend(function () {
			if (firstTime) {
				printMsg();
				firstTime = false;
			}
			return fn.apply(this, arguments);
		}, fn);
	}

	function padToken(func, count) {
		return function (a) {
			return leftZeroFill(func.call(this, a), count);
		};
	}
	function ordinalizeToken(func, period) {
		return function (a) {
			return this.lang().ordinal(func.call(this, a), period);
		};
	}

	while (ordinalizeTokens.length) {
		i = ordinalizeTokens.pop();
		formatTokenFunctions[i + 'o'] = ordinalizeToken(formatTokenFunctions[i], i);
	}
	while (paddedTokens.length) {
		i = paddedTokens.pop();
		formatTokenFunctions[i + i] = padToken(formatTokenFunctions[i], 2);
	}
	formatTokenFunctions.DDDD = padToken(formatTokenFunctions.DDD, 3);


	/************************************
		Constructors
	************************************/

	function Language() {

	}

	// Moment prototype object
	function Moment(config) {
		checkOverflow(config);
		extend(this, config);
	}

	// Duration Constructor
	function Duration(duration) {
		var normalizedInput = normalizeObjectUnits(duration),
			years = normalizedInput.year || 0,
			quarters = normalizedInput.quarter || 0,
			months = normalizedInput.month || 0,
			weeks = normalizedInput.week || 0,
			days = normalizedInput.day || 0,
			hours = normalizedInput.hour || 0,
			minutes = normalizedInput.minute || 0,
			seconds = normalizedInput.second || 0,
			milliseconds = normalizedInput.millisecond || 0;

		// representation for dateAddRemove
		this._milliseconds = +milliseconds +
			seconds * 1e3 + // 1000
			minutes * 6e4 + // 1000 * 60
			hours * 36e5; // 1000 * 60 * 60
		// Because of dateAddRemove treats 24 hours as different from a
		// day when working around DST, we need to store them separately
		this._days = +days +
			weeks * 7;
		// It is impossible translate months into days without knowing
		// which months you are are talking about, so we have to store
		// it separately.
		this._months = +months +
			quarters * 3 +
			years * 12;

		this._data = {};

		this._bubble();
	}

	/************************************
		Helpers
	************************************/


	function extend(a, b) {
		for (var i in b) {
			if (b.hasOwnProperty(i)) {
				a[i] = b[i];
			}
		}

		if (b.hasOwnProperty("toString")) {
			a.toString = b.toString;
		}

		if (b.hasOwnProperty("valueOf")) {
			a.valueOf = b.valueOf;
		}

		return a;
	}

	function cloneMoment(m) {
		var result = {}, i;
		for (i in m) {
			if (m.hasOwnProperty(i) && momentProperties.hasOwnProperty(i)) {
				result[i] = m[i];
			}
		}

		return result;
	}

	function absRound(number) {
		if (number < 0) {
			return Math.ceil(number);
		} else {
			return Math.floor(number);
		}
	}

	// left zero fill a number
	// see http://jsperf.com/left-zero-filling for performance comparison
	function leftZeroFill(number, targetLength, forceSign) {
		var output = '' + Math.abs(number),
			sign = number >= 0;

		while (output.length < targetLength) {
			output = '0' + output;
		}
		return (sign ? (forceSign ? '+' : '') : '-') + output;
	}

	// helper function for _.addTime and _.subtractTime
	function addOrSubtractDurationFromMoment(mom, duration, isAdding, updateOffset) {
		var milliseconds = duration._milliseconds,
			days = duration._days,
			months = duration._months;
		updateOffset = updateOffset == null ? true : updateOffset;

		if (milliseconds) {
			mom._d.setTime(+mom._d + milliseconds * isAdding);
		}
		if (days) {
			rawSetter(mom, 'Date', rawGetter(mom, 'Date') + days * isAdding);
		}
		if (months) {
			rawMonthSetter(mom, rawGetter(mom, 'Month') + months * isAdding);
		}
		if (updateOffset) {
			moment.updateOffset(mom, days || months);
		}
	}

	// check if is an array
	function isArray(input) {
		return Object.prototype.toString.call(input) === '[object Array]';
	}

	function isDate(input) {
		return Object.prototype.toString.call(input) === '[object Date]' ||
				input instanceof Date;
	}

	// compare two arrays, return the number of differences
	function compareArrays(array1, array2, dontConvert) {
		var len = Math.min(array1.length, array2.length),
			lengthDiff = Math.abs(array1.length - array2.length),
			diffs = 0,
			i;
		for (i = 0; i < len; i++) {
			if ((dontConvert && array1[i] !== array2[i]) ||
				(!dontConvert && toInt(array1[i]) !== toInt(array2[i]))) {
				diffs++;
			}
		}
		return diffs + lengthDiff;
	}

	function normalizeUnits(units) {
		if (units) {
			var lowered = units.toLowerCase().replace(/(.)s$/, '$1');
			units = unitAliases[units] || camelFunctions[lowered] || lowered;
		}
		return units;
	}

	function normalizeObjectUnits(inputObject) {
		var normalizedInput = {},
			normalizedProp,
			prop;

		for (prop in inputObject) {
			if (inputObject.hasOwnProperty(prop)) {
				normalizedProp = normalizeUnits(prop);
				if (normalizedProp) {
					normalizedInput[normalizedProp] = inputObject[prop];
				}
			}
		}

		return normalizedInput;
	}

	function makeList(field) {
		var count, setter;

		if (field.indexOf('week') === 0) {
			count = 7;
			setter = 'day';
		}
		else if (field.indexOf('month') === 0) {
			count = 12;
			setter = 'month';
		}
		else {
			return;
		}

		moment[field] = function (format, index) {
			var i, getter,
				method = moment.fn._lang[field],
				results = [];

			if (typeof format === 'number') {
				index = format;
				format = undefined;
			}

			getter = function (i) {
				var m = moment().utc().set(setter, i);
				return method.call(moment.fn._lang, m, format || '');
			};

			if (index != null) {
				return getter(index);
			}
			else {
				for (i = 0; i < count; i++) {
					results.push(getter(i));
				}
				return results;
			}
		};
	}

	function toInt(argumentForCoercion) {
		var coercedNumber = +argumentForCoercion,
			value = 0;

		if (coercedNumber !== 0 && isFinite(coercedNumber)) {
			if (coercedNumber >= 0) {
				value = Math.floor(coercedNumber);
			} else {
				value = Math.ceil(coercedNumber);
			}
		}

		return value;
	}

	function daysInMonth(year, month) {
		return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
	}

	function weeksInYear(year, dow, doy) {
		return weekOfYear(moment([year, 11, 31 + dow - doy]), dow, doy).week;
	}

	function daysInYear(year) {
		return isLeapYear(year) ? 366 : 365;
	}

	function isLeapYear(year) {
		return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
	}

	function checkOverflow(m) {
		var overflow;
		if (m._a && m._pf.overflow === -2) {
			overflow =
				m._a[MONTH] < 0 || m._a[MONTH] > 11 ? MONTH :
				m._a[DATE] < 1 || m._a[DATE] > daysInMonth(m._a[YEAR], m._a[MONTH]) ? DATE :
				m._a[HOUR] < 0 || m._a[HOUR] > 23 ? HOUR :
				m._a[MINUTE] < 0 || m._a[MINUTE] > 59 ? MINUTE :
				m._a[SECOND] < 0 || m._a[SECOND] > 59 ? SECOND :
				m._a[MILLISECOND] < 0 || m._a[MILLISECOND] > 999 ? MILLISECOND :
				-1;

			if (m._pf._overflowDayOfYear && (overflow < YEAR || overflow > DATE)) {
				overflow = DATE;
			}

			m._pf.overflow = overflow;
		}
	}

	function isValid(m) {
		if (m._isValid == null) {
			m._isValid = !isNaN(m._d.getTime()) &&
				m._pf.overflow < 0 &&
				!m._pf.empty &&
				!m._pf.invalidMonth &&
				!m._pf.nullInput &&
				!m._pf.invalidFormat &&
				!m._pf.userInvalidated;

			if (m._strict) {
				m._isValid = m._isValid &&
					m._pf.charsLeftOver === 0 &&
					m._pf.unusedTokens.length === 0;
			}
		}
		return m._isValid;
	}

	function normalizeLanguage(key) {
		return key ? key.toLowerCase().replace('_', '-') : key;
	}

	// Return a moment from input, that is local/utc/zone equivalent to model.
	function makeAs(input, model) {
		return model._isUTC ? moment(input).zone(model._offset || 0) :
			moment(input).local();
	}

	/************************************
		Languages
	************************************/


	extend(Language.prototype, {

		set: function (config) {
			var prop, i;
			for (i in config) {
				prop = config[i];
				if (typeof prop === 'function') {
					this[i] = prop;
				} else {
					this['_' + i] = prop;
				}
			}
		},

		_months: "January_February_March_April_May_June_July_August_September_October_November_December".split("_"),
		months: function (m) {
			return this._months[m.month()];
		},

		_monthsShort: "Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_"),
		monthsShort: function (m) {
			return this._monthsShort[m.month()];
		},

		monthsParse: function (monthName) {
			var i, mom, regex;

			if (!this._monthsParse) {
				this._monthsParse = [];
			}

			for (i = 0; i < 12; i++) {
				// make the regex if we don't have it already
				if (!this._monthsParse[i]) {
					mom = moment.utc([2000, i]);
					regex = '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
					this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
				}
				// test the regex
				if (this._monthsParse[i].test(monthName)) {
					return i;
				}
			}
		},

		_weekdays: "Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),
		weekdays: function (m) {
			return this._weekdays[m.day()];
		},

		_weekdaysShort: "Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_"),
		weekdaysShort: function (m) {
			return this._weekdaysShort[m.day()];
		},

		_weekdaysMin: "Su_Mo_Tu_We_Th_Fr_Sa".split("_"),
		weekdaysMin: function (m) {
			return this._weekdaysMin[m.day()];
		},

		weekdaysParse: function (weekdayName) {
			var i, mom, regex;

			if (!this._weekdaysParse) {
				this._weekdaysParse = [];
			}

			for (i = 0; i < 7; i++) {
				// make the regex if we don't have it already
				if (!this._weekdaysParse[i]) {
					mom = moment([2000, 1]).day(i);
					regex = '^' + this.weekdays(mom, '') + '|^' + this.weekdaysShort(mom, '') + '|^' + this.weekdaysMin(mom, '');
					this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
				}
				// test the regex
				if (this._weekdaysParse[i].test(weekdayName)) {
					return i;
				}
			}
		},

		_longDateFormat: {
			LT: "h:mm A",
			L: "MM/DD/YYYY",
			LL: "MMMM D YYYY",
			LLL: "MMMM D YYYY LT",
			LLLL: "dddd, MMMM D YYYY LT"
		},
		longDateFormat: function (key) {
			var output = this._longDateFormat[key];
			if (!output && this._longDateFormat[key.toUpperCase()]) {
				output = this._longDateFormat[key.toUpperCase()].replace(/MMMM|MM|DD|dddd/g, function (val) {
					return val.slice(1);
				});
				this._longDateFormat[key] = output;
			}
			return output;
		},

		isPM: function (input) {
			// IE8 Quirks Mode & IE7 Standards Mode do not allow accessing strings like arrays
			// Using charAt should be more compatible.
			return ((input + '').toLowerCase().charAt(0) === 'p');
		},

		_meridiemParse: /[ap]\.?m?\.?/i,
		meridiem: function (hours, minutes, isLower) {
			if (hours > 11) {
				return isLower ? 'pm' : 'PM';
			} else {
				return isLower ? 'am' : 'AM';
			}
		},

		_calendar: {
			sameDay: '[Today at] LT',
			nextDay: '[Tomorrow at] LT',
			nextWeek: 'dddd [at] LT',
			lastDay: '[Yesterday at] LT',
			lastWeek: '[Last] dddd [at] LT',
			sameElse: 'L'
		},
		calendar: function (key, mom) {
			var output = this._calendar[key];
			return typeof output === 'function' ? output.apply(mom) : output;
		},

		_relativeTime: {
			future: "in %s",
			past: "%s ago",
			s: "a few seconds",
			m: "a minute",
			mm: "%d minutes",
			h: "an hour",
			hh: "%d hours",
			d: "a day",
			dd: "%d days",
			M: "a month",
			MM: "%d months",
			y: "a year",
			yy: "%d years"
		},
		relativeTime: function (number, withoutSuffix, string, isFuture) {
			var output = this._relativeTime[string];
			return (typeof output === 'function') ?
				output(number, withoutSuffix, string, isFuture) :
				output.replace(/%d/i, number);
		},
		pastFuture: function (diff, output) {
			var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
			return typeof format === 'function' ? format(output) : format.replace(/%s/i, output);
		},

		ordinal: function (number) {
			return this._ordinal.replace("%d", number);
		},
		_ordinal: "%d",

		preparse: function (string) {
			return string;
		},

		postformat: function (string) {
			return string;
		},

		week: function (mom) {
			return weekOfYear(mom, this._week.dow, this._week.doy).week;
		},

		_week: {
			dow: 0, // Sunday is the first day of the week.
			doy: 6  // The week that contains Jan 1st is the first week of the year.
		},

		_invalidDate: 'Invalid date',
		invalidDate: function () {
			return this._invalidDate;
		}
	});

	// Loads a language definition into the `languages` cache.  The function
	// takes a key and optionally values.  If not in the browser and no values
	// are provided, it will load the language file module.  As a convenience,
	// this function also returns the language values.
	function loadLang(key, values) {
		values.abbr = key;
		if (!languages[key]) {
			languages[key] = new Language();
		}
		languages[key].set(values);
		return languages[key];
	}

	// Remove a language from the `languages` cache. Mostly useful in tests.
	function unloadLang(key) {
		delete languages[key];
	}

	// Determines which language definition to use and returns it.
	//
	// With no parameters, it will return the global language.  If you
	// pass in a language key, such as 'en', it will return the
	// definition for 'en', so long as 'en' has already been loaded using
	// moment.lang.
	function getLangDefinition(key) {
		var i = 0, j, lang, next, split,
			get = function (k) {
				if (!languages[k] && hasModule) {
					try {
						require('./lang/' + k);
					} catch (e) { }
				}
				return languages[k];
			};

		if (!key) {
			return moment.fn._lang;
		}

		if (!isArray(key)) {
			//short-circuit everything else
			lang = get(key);
			if (lang) {
				return lang;
			}
			key = [key];
		}

		//pick the language from the array
		//try ['en-au', 'en-gb'] as 'en-au', 'en-gb', 'en', as in move through the list trying each
		//substring from most specific to least, but move to the next array item if it's a more specific variant than the current root
		while (i < key.length) {
			split = normalizeLanguage(key[i]).split('-');
			j = split.length;
			next = normalizeLanguage(key[i + 1]);
			next = next ? next.split('-') : null;
			while (j > 0) {
				lang = get(split.slice(0, j).join('-'));
				if (lang) {
					return lang;
				}
				if (next && next.length >= j && compareArrays(split, next, true) >= j - 1) {
					//the next array item is better than a shallower substring of this one
					break;
				}
				j--;
			}
			i++;
		}
		return moment.fn._lang;
	}

	/************************************
		Formatting
	************************************/


	function removeFormattingTokens(input) {
		if (input.match(/\[[\s\S]/)) {
			return input.replace(/^\[|\]$/g, "");
		}
		return input.replace(/\\/g, "");
	}

	function makeFormatFunction(format) {
		var array = format.match(formattingTokens), i, length;

		for (i = 0, length = array.length; i < length; i++) {
			if (formatTokenFunctions[array[i]]) {
				array[i] = formatTokenFunctions[array[i]];
			} else {
				array[i] = removeFormattingTokens(array[i]);
			}
		}

		return function (mom) {
			var output = "";
			for (i = 0; i < length; i++) {
				output += array[i] instanceof Function ? array[i].call(mom, format) : array[i];
			}
			return output;
		};
	}

	// format date using native date object
	function formatMoment(m, format) {

		if (!m.isValid()) {
			return m.lang().invalidDate();
		}

		format = expandFormat(format, m.lang());

		if (!formatFunctions[format]) {
			formatFunctions[format] = makeFormatFunction(format);
		}

		return formatFunctions[format](m);
	}

	function expandFormat(format, lang) {
		var i = 5;

		function replaceLongDateFormatTokens(input) {
			return lang.longDateFormat(input) || input;
		}

		localFormattingTokens.lastIndex = 0;
		while (i >= 0 && localFormattingTokens.test(format)) {
			format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
			localFormattingTokens.lastIndex = 0;
			i -= 1;
		}

		return format;
	}


	/************************************
		Parsing
	************************************/


	// get the regex to find the next token
	function getParseRegexForToken(token, config) {
		var a, strict = config._strict;
		switch (token) {
			case 'Q':
				return parseTokenOneDigit;
			case 'DDDD':
				return parseTokenThreeDigits;
			case 'YYYY':
			case 'GGGG':
			case 'gggg':
				return strict ? parseTokenFourDigits : parseTokenOneToFourDigits;
			case 'Y':
			case 'G':
			case 'g':
				return parseTokenSignedNumber;
			case 'YYYYYY':
			case 'YYYYY':
			case 'GGGGG':
			case 'ggggg':
				return strict ? parseTokenSixDigits : parseTokenOneToSixDigits;
			case 'S':
				if (strict) { return parseTokenOneDigit; }
				/* falls through */
			case 'SS':
				if (strict) { return parseTokenTwoDigits; }
				/* falls through */
			case 'SSS':
				if (strict) { return parseTokenThreeDigits; }
				/* falls through */
			case 'DDD':
				return parseTokenOneToThreeDigits;
			case 'MMM':
			case 'MMMM':
			case 'dd':
			case 'ddd':
			case 'dddd':
				return parseTokenWord;
			case 'a':
			case 'A':
				return getLangDefinition(config._l)._meridiemParse;
			case 'X':
				return parseTokenTimestampMs;
			case 'Z':
			case 'ZZ':
				return parseTokenTimezone;
			case 'T':
				return parseTokenT;
			case 'SSSS':
				return parseTokenDigits;
			case 'MM':
			case 'DD':
			case 'YY':
			case 'GG':
			case 'gg':
			case 'HH':
			case 'hh':
			case 'mm':
			case 'ss':
			case 'ww':
			case 'WW':
				return strict ? parseTokenTwoDigits : parseTokenOneOrTwoDigits;
			case 'M':
			case 'D':
			case 'd':
			case 'H':
			case 'h':
			case 'm':
			case 's':
			case 'w':
			case 'W':
			case 'e':
			case 'E':
				return parseTokenOneOrTwoDigits;
			case 'Do':
				return parseTokenOrdinal;
			default:
				a = new RegExp(regexpEscape(unescapeFormat(token.replace('\\', '')), "i"));
				return a;
		}
	}

	function timezoneMinutesFromString(string) {
		string = string || "";
		var possibleTzMatches = (string.match(parseTokenTimezone) || []),
			tzChunk = possibleTzMatches[possibleTzMatches.length - 1] || [],
			parts = (tzChunk + '').match(parseTimezoneChunker) || ['-', 0, 0],
			minutes = +(parts[1] * 60) + toInt(parts[2]);

		return parts[0] === '+' ? -minutes : minutes;
	}

	// function to convert string input to date
	function addTimeToArrayFromToken(token, input, config) {
		var a, datePartArray = config._a;

		switch (token) {
			// QUARTER
			case 'Q':
				if (input != null) {
					datePartArray[MONTH] = (toInt(input) - 1) * 3;
				}
				break;
				// MONTH
			case 'M': // fall through to MM
			case 'MM':
				if (input != null) {
					datePartArray[MONTH] = toInt(input) - 1;
				}
				break;
			case 'MMM': // fall through to MMMM
			case 'MMMM':
				a = getLangDefinition(config._l).monthsParse(input);
				// if we didn't find a month name, mark the date as invalid.
				if (a != null) {
					datePartArray[MONTH] = a;
				} else {
					config._pf.invalidMonth = input;
				}
				break;
				// DAY OF MONTH
			case 'D': // fall through to DD
			case 'DD':
				if (input != null) {
					datePartArray[DATE] = toInt(input);
				}
				break;
			case 'Do':
				if (input != null) {
					datePartArray[DATE] = toInt(parseInt(input, 10));
				}
				break;
				// DAY OF YEAR
			case 'DDD': // fall through to DDDD
			case 'DDDD':
				if (input != null) {
					config._dayOfYear = toInt(input);
				}

				break;
				// YEAR
			case 'YY':
				datePartArray[YEAR] = moment.parseTwoDigitYear(input);
				break;
			case 'YYYY':
			case 'YYYYY':
			case 'YYYYYY':
				datePartArray[YEAR] = toInt(input);
				break;
				// AM / PM
			case 'a': // fall through to A
			case 'A':
				config._isPm = getLangDefinition(config._l).isPM(input);
				break;
				// 24 HOUR
			case 'H': // fall through to hh
			case 'HH': // fall through to hh
			case 'h': // fall through to hh
			case 'hh':
				datePartArray[HOUR] = toInt(input);
				break;
				// MINUTE
			case 'm': // fall through to mm
			case 'mm':
				datePartArray[MINUTE] = toInt(input);
				break;
				// SECOND
			case 's': // fall through to ss
			case 'ss':
				datePartArray[SECOND] = toInt(input);
				break;
				// MILLISECOND
			case 'S':
			case 'SS':
			case 'SSS':
			case 'SSSS':
				datePartArray[MILLISECOND] = toInt(('0.' + input) * 1000);
				break;
				// UNIX TIMESTAMP WITH MS
			case 'X':
				config._d = new Date(parseFloat(input) * 1000);
				break;
				// TIMEZONE
			case 'Z': // fall through to ZZ
			case 'ZZ':
				config._useUTC = true;
				config._tzm = timezoneMinutesFromString(input);
				break;
				// WEEKDAY - human
			case 'dd':
			case 'ddd':
			case 'dddd':
				a = getLangDefinition(config._l).weekdaysParse(input);
				// if we didn't get a weekday name, mark the date as invalid
				if (a != null) {
					config._w = config._w || {};
					config._w['d'] = a;
				} else {
					config._pf.invalidWeekday = input;
				}
				break;
				// WEEK, WEEK DAY - numeric
			case 'w':
			case 'ww':
			case 'W':
			case 'WW':
			case 'd':
			case 'e':
			case 'E':
				token = token.substr(0, 1);
				/* falls through */
			case 'gggg':
			case 'GGGG':
			case 'GGGGG':
				token = token.substr(0, 2);
				if (input) {
					config._w = config._w || {};
					config._w[token] = toInt(input);
				}
				break;
			case 'gg':
			case 'GG':
				config._w = config._w || {};
				config._w[token] = moment.parseTwoDigitYear(input);
		}
	}

	function dayOfYearFromWeekInfo(config) {
		var w, weekYear, week, weekday, dow, doy, temp, lang;

		w = config._w;
		if (w.GG != null || w.W != null || w.E != null) {
			dow = 1;
			doy = 4;

			// TODO: We need to take the current isoWeekYear, but that depends on
			// how we interpret now (local, utc, fixed offset). So create
			// a now version of current config (take local/utc/offset flags, and
			// create now).
			weekYear = dfl(w.GG, config._a[YEAR], weekOfYear(moment(), 1, 4).year);
			week = dfl(w.W, 1);
			weekday = dfl(w.E, 1);
		} else {
			lang = getLangDefinition(config._l);
			dow = lang._week.dow;
			doy = lang._week.doy;

			weekYear = dfl(w.gg, config._a[YEAR], weekOfYear(moment(), dow, doy).year);
			week = dfl(w.w, 1);

			if (w.d != null) {
				// weekday -- low day numbers are considered next week
				weekday = w.d;
				if (weekday < dow) {
					++week;
				}
			} else if (w.e != null) {
				// local weekday -- counting starts from begining of week
				weekday = w.e + dow;
			} else {
				// default to begining of week
				weekday = dow;
			}
		}
		temp = dayOfYearFromWeeks(weekYear, week, weekday, doy, dow);

		config._a[YEAR] = temp.year;
		config._dayOfYear = temp.dayOfYear;
	}

	// convert an array to a date.
	// the array should mirror the parameters below
	// note: all values past the year are optional and will default to the lowest possible value.
	// [year, month, day , hour, minute, second, millisecond]
	function dateFromConfig(config) {
		var i, date, input = [], currentDate, yearToUse;

		if (config._d) {
			return;
		}

		currentDate = currentDateArray(config);

		//compute day of the year from weeks and weekdays
		if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
			dayOfYearFromWeekInfo(config);
		}

		//if the day of the year is set, figure out what it is
		if (config._dayOfYear) {
			yearToUse = dfl(config._a[YEAR], currentDate[YEAR]);

			if (config._dayOfYear > daysInYear(yearToUse)) {
				config._pf._overflowDayOfYear = true;
			}

			date = makeUTCDate(yearToUse, 0, config._dayOfYear);
			config._a[MONTH] = date.getUTCMonth();
			config._a[DATE] = date.getUTCDate();
		}

		// Default to current date.
		// * if no year, month, day of month are given, default to today
		// * if day of month is given, default month and year
		// * if month is given, default only year
		// * if year is given, don't default anything
		for (i = 0; i < 3 && config._a[i] == null; ++i) {
			config._a[i] = input[i] = currentDate[i];
		}

		// Zero out whatever was not defaulted, including time
		for (; i < 7; i++) {
			config._a[i] = input[i] = (config._a[i] == null) ? (i === 2 ? 1 : 0) : config._a[i];
		}

		config._d = (config._useUTC ? makeUTCDate : makeDate).apply(null, input);
		// Apply timezone offset from input. The actual zone can be changed
		// with parseZone.
		if (config._tzm != null) {
			config._d.setUTCMinutes(config._d.getUTCMinutes() + config._tzm);
		}
	}

	function dateFromObject(config) {
		var normalizedInput;

		if (config._d) {
			return;
		}

		normalizedInput = normalizeObjectUnits(config._i);
		config._a = [
			normalizedInput.year,
			normalizedInput.month,
			normalizedInput.day,
			normalizedInput.hour,
			normalizedInput.minute,
			normalizedInput.second,
			normalizedInput.millisecond
		];

		dateFromConfig(config);
	}

	function currentDateArray(config) {
		var now = new Date();
		if (config._useUTC) {
			return [
				now.getUTCFullYear(),
				now.getUTCMonth(),
				now.getUTCDate()
			];
		} else {
			return [now.getFullYear(), now.getMonth(), now.getDate()];
		}
	}

	// date from string and format string
	function makeDateFromStringAndFormat(config) {

		if (config._f === moment.ISO_8601) {
			parseISO(config);
			return;
		}

		config._a = [];
		config._pf.empty = true;

		// This array is used to make a Date, either with `new Date` or `Date.UTC`
		var lang = getLangDefinition(config._l),
			string = '' + config._i,
			i, parsedInput, tokens, token, skipped,
			stringLength = string.length,
			totalParsedInputLength = 0;

		tokens = expandFormat(config._f, lang).match(formattingTokens) || [];

		for (i = 0; i < tokens.length; i++) {
			token = tokens[i];
			parsedInput = (string.match(getParseRegexForToken(token, config)) || [])[0];
			if (parsedInput) {
				skipped = string.substr(0, string.indexOf(parsedInput));
				if (skipped.length > 0) {
					config._pf.unusedInput.push(skipped);
				}
				string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
				totalParsedInputLength += parsedInput.length;
			}
			// don't parse if it's not a known token
			if (formatTokenFunctions[token]) {
				if (parsedInput) {
					config._pf.empty = false;
				}
				else {
					config._pf.unusedTokens.push(token);
				}
				addTimeToArrayFromToken(token, parsedInput, config);
			}
			else if (config._strict && !parsedInput) {
				config._pf.unusedTokens.push(token);
			}
		}

		// add remaining unparsed input length to the string
		config._pf.charsLeftOver = stringLength - totalParsedInputLength;
		if (string.length > 0) {
			config._pf.unusedInput.push(string);
		}

		// handle am pm
		if (config._isPm && config._a[HOUR] < 12) {
			config._a[HOUR] += 12;
		}
		// if is 12 am, change hours to 0
		if (config._isPm === false && config._a[HOUR] === 12) {
			config._a[HOUR] = 0;
		}

		dateFromConfig(config);
		checkOverflow(config);
	}

	function unescapeFormat(s) {
		return s.replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function (matched, p1, p2, p3, p4) {
			return p1 || p2 || p3 || p4;
		});
	}

	// Code from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
	function regexpEscape(s) {
		return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
	}

	// date from string and array of format strings
	function makeDateFromStringAndArray(config) {
		var tempConfig,
			bestMoment,

			scoreToBeat,
			i,
			currentScore;

		if (config._f.length === 0) {
			config._pf.invalidFormat = true;
			config._d = new Date(NaN);
			return;
		}

		for (i = 0; i < config._f.length; i++) {
			currentScore = 0;
			tempConfig = extend({}, config);
			tempConfig._pf = defaultParsingFlags();
			tempConfig._f = config._f[i];
			makeDateFromStringAndFormat(tempConfig);

			if (!isValid(tempConfig)) {
				continue;
			}

			// if there is any input that was not parsed add a penalty for that format
			currentScore += tempConfig._pf.charsLeftOver;

			//or tokens
			currentScore += tempConfig._pf.unusedTokens.length * 10;

			tempConfig._pf.score = currentScore;

			if (scoreToBeat == null || currentScore < scoreToBeat) {
				scoreToBeat = currentScore;
				bestMoment = tempConfig;
			}
		}

		extend(config, bestMoment || tempConfig);
	}

	// date from iso format
	function parseISO(config) {
		var i, l,
			string = config._i,
			match = isoRegex.exec(string);

		if (match) {
			config._pf.iso = true;
			for (i = 0, l = isoDates.length; i < l; i++) {
				if (isoDates[i][1].exec(string)) {
					// match[5] should be "T" or undefined
					config._f = isoDates[i][0] + (match[6] || " ");
					break;
				}
			}
			for (i = 0, l = isoTimes.length; i < l; i++) {
				if (isoTimes[i][1].exec(string)) {
					config._f += isoTimes[i][0];
					break;
				}
			}
			if (string.match(parseTokenTimezone)) {
				config._f += "Z";
			}
			makeDateFromStringAndFormat(config);
		} else {
			config._isValid = false;
		}
	}

	// date from iso format or fallback
	function makeDateFromString(config) {
		parseISO(config);
		if (config._isValid === false) {
			delete config._isValid;
			moment.createFromInputFallback(config);
		}
	}

	function makeDateFromInput(config) {
		var input = config._i,
			matched = aspNetJsonRegex.exec(input);

		if (input === undefined) {
			config._d = new Date();
		} else if (matched) {
			config._d = new Date(+matched[1]);
		} else if (typeof input === 'string') {
			makeDateFromString(config);
		} else if (isArray(input)) {
			config._a = input.slice(0);
			dateFromConfig(config);
		} else if (isDate(input)) {
			config._d = new Date(+input);
		} else if (typeof (input) === 'object') {
			dateFromObject(config);
		} else if (typeof (input) === 'number') {
			// from milliseconds
			config._d = new Date(input);
		} else {
			moment.createFromInputFallback(config);
		}
	}

	function makeDate(y, m, d, h, M, s, ms) {
		//can't just apply() to create a date:
		//http://stackoverflow.com/questions/181348/instantiating-a-javascript-object-by-calling-prototype-constructor-apply
		var date = new Date(y, m, d, h, M, s, ms);

		//the date constructor doesn't accept years < 1970
		if (y < 1970) {
			date.setFullYear(y);
		}
		return date;
	}

	function makeUTCDate(y) {
		var date = new Date(Date.UTC.apply(null, arguments));
		if (y < 1970) {
			date.setUTCFullYear(y);
		}
		return date;
	}

	function parseWeekday(input, language) {
		if (typeof input === 'string') {
			if (!isNaN(input)) {
				input = parseInt(input, 10);
			}
			else {
				input = language.weekdaysParse(input);
				if (typeof input !== 'number') {
					return null;
				}
			}
		}
		return input;
	}

	/************************************
		Relative Time
	************************************/


	// helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
	function substituteTimeAgo(string, number, withoutSuffix, isFuture, lang) {
		return lang.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
	}

	function relativeTime(milliseconds, withoutSuffix, lang) {
		var seconds = round(Math.abs(milliseconds) / 1000),
			minutes = round(seconds / 60),
			hours = round(minutes / 60),
			days = round(hours / 24),
			years = round(days / 365),
			args = seconds < relativeTimeThresholds.s && ['s', seconds] ||
				minutes === 1 && ['m'] ||
				minutes < relativeTimeThresholds.m && ['mm', minutes] ||
				hours === 1 && ['h'] ||
				hours < relativeTimeThresholds.h && ['hh', hours] ||
				days === 1 && ['d'] ||
				days <= relativeTimeThresholds.dd && ['dd', days] ||
				days <= relativeTimeThresholds.dm && ['M'] ||
				days < relativeTimeThresholds.dy && ['MM', round(days / 30)] ||
				years === 1 && ['y'] || ['yy', years];
		args[2] = withoutSuffix;
		args[3] = milliseconds > 0;
		args[4] = lang;
		return substituteTimeAgo.apply({}, args);
	}


	/************************************
		Week of Year
	************************************/


	// firstDayOfWeek       0 = sun, 6 = sat
	//                      the day of the week that starts the week
	//                      (usually sunday or monday)
	// firstDayOfWeekOfYear 0 = sun, 6 = sat
	//                      the first week is the week that contains the first
	//                      of this day of the week
	//                      (eg. ISO weeks use thursday (4))
	function weekOfYear(mom, firstDayOfWeek, firstDayOfWeekOfYear) {
		var end = firstDayOfWeekOfYear - firstDayOfWeek,
			daysToDayOfWeek = firstDayOfWeekOfYear - mom.day(),
			adjustedMoment;


		if (daysToDayOfWeek > end) {
			daysToDayOfWeek -= 7;
		}

		if (daysToDayOfWeek < end - 7) {
			daysToDayOfWeek += 7;
		}

		adjustedMoment = moment(mom).add('d', daysToDayOfWeek);
		return {
			week: Math.ceil(adjustedMoment.dayOfYear() / 7),
			year: adjustedMoment.year()
		};
	}

	//http://en.wikipedia.org/wiki/ISO_week_date#Calculating_a_date_given_the_year.2C_week_number_and_weekday
	function dayOfYearFromWeeks(year, week, weekday, firstDayOfWeekOfYear, firstDayOfWeek) {
		var d = makeUTCDate(year, 0, 1).getUTCDay(), daysToAdd, dayOfYear;

		d = d === 0 ? 7 : d;
		weekday = weekday != null ? weekday : firstDayOfWeek;
		daysToAdd = firstDayOfWeek - d + (d > firstDayOfWeekOfYear ? 7 : 0) - (d < firstDayOfWeek ? 7 : 0);
		dayOfYear = 7 * (week - 1) + (weekday - firstDayOfWeek) + daysToAdd + 1;

		return {
			year: dayOfYear > 0 ? year : year - 1,
			dayOfYear: dayOfYear > 0 ? dayOfYear : daysInYear(year - 1) + dayOfYear
		};
	}

	/************************************
		Top Level Functions
	************************************/

	function makeMoment(config) {
		var input = config._i,
			format = config._f;

		if (input === null || (format === undefined && input === '')) {
			return moment.invalid({ nullInput: true });
		}

		if (typeof input === 'string') {
			config._i = input = getLangDefinition().preparse(input);
		}

		if (moment.isMoment(input)) {
			config = cloneMoment(input);

			config._d = new Date(+input._d);
		} else if (format) {
			if (isArray(format)) {
				makeDateFromStringAndArray(config);
			} else {
				makeDateFromStringAndFormat(config);
			}
		} else {
			makeDateFromInput(config);
		}

		return new Moment(config);
	}

	moment = function (input, format, lang, strict) {
		var c;

		if (typeof (lang) === "boolean") {
			strict = lang;
			lang = undefined;
		}
		// object construction must be done this way.
		// https://github.com/moment/moment/issues/1423
		c = {};
		c._isAMomentObject = true;
		c._i = input;
		c._f = format;
		c._l = lang;
		c._strict = strict;
		c._isUTC = false;
		c._pf = defaultParsingFlags();

		return makeMoment(c);
	};

	moment.suppressDeprecationWarnings = false;

	moment.createFromInputFallback = deprecate(
			"moment construction falls back to js Date. This is " +
			"discouraged and will be removed in upcoming major " +
			"release. Please refer to " +
			"https://github.com/moment/moment/issues/1407 for more info.",
			function (config) {
				config._d = new Date(config._i);
			});

	// Pick a moment m from moments so that m[fn](other) is true for all
	// other. This relies on the function fn to be transitive.
	//
	// moments should either be an array of moment objects or an array, whose
	// first element is an array of moment objects.
	function pickBy(fn, moments) {
		var res, i;
		if (moments.length === 1 && isArray(moments[0])) {
			moments = moments[0];
		}
		if (!moments.length) {
			return moment();
		}
		res = moments[0];
		for (i = 1; i < moments.length; ++i) {
			if (moments[i][fn](res)) {
				res = moments[i];
			}
		}
		return res;
	}

	moment.min = function () {
		var args = [].slice.call(arguments, 0);

		return pickBy('isBefore', args);
	};

	moment.max = function () {
		var args = [].slice.call(arguments, 0);

		return pickBy('isAfter', args);
	};

	// creating with utc
	moment.utc = function (input, format, lang, strict) {
		var c;

		if (typeof (lang) === "boolean") {
			strict = lang;
			lang = undefined;
		}
		// object construction must be done this way.
		// https://github.com/moment/moment/issues/1423
		c = {};
		c._isAMomentObject = true;
		c._useUTC = true;
		c._isUTC = true;
		c._l = lang;
		c._i = input;
		c._f = format;
		c._strict = strict;
		c._pf = defaultParsingFlags();

		return makeMoment(c).utc();
	};

	// creating with unix timestamp (in seconds)
	moment.unix = function (input) {
		return moment(input * 1000);
	};

	// duration
	moment.duration = function (input, key) {
		var duration = input,
			// matching against regexp is expensive, do it on demand
			match = null,
			sign,
			ret,
			parseIso;

		if (moment.isDuration(input)) {
			duration = {
				ms: input._milliseconds,
				d: input._days,
				M: input._months
			};
		} else if (typeof input === 'number') {
			duration = {};
			if (key) {
				duration[key] = input;
			} else {
				duration.milliseconds = input;
			}
		} else if (!!(match = aspNetTimeSpanJsonRegex.exec(input))) {
			sign = (match[1] === "-") ? -1 : 1;
			duration = {
				y: 0,
				d: toInt(match[DATE]) * sign,
				h: toInt(match[HOUR]) * sign,
				m: toInt(match[MINUTE]) * sign,
				s: toInt(match[SECOND]) * sign,
				ms: toInt(match[MILLISECOND]) * sign
			};
		} else if (!!(match = isoDurationRegex.exec(input))) {
			sign = (match[1] === "-") ? -1 : 1;
			parseIso = function (inp) {
				// We'd normally use ~~inp for this, but unfortunately it also
				// converts floats to ints.
				// inp may be undefined, so careful calling replace on it.
				var res = inp && parseFloat(inp.replace(',', '.'));
				// apply sign while we're at it
				return (isNaN(res) ? 0 : res) * sign;
			};
			duration = {
				y: parseIso(match[2]),
				M: parseIso(match[3]),
				d: parseIso(match[4]),
				h: parseIso(match[5]),
				m: parseIso(match[6]),
				s: parseIso(match[7]),
				w: parseIso(match[8])
			};
		}

		ret = new Duration(duration);

		if (moment.isDuration(input) && input.hasOwnProperty('_lang')) {
			ret._lang = input._lang;
		}

		return ret;
	};

	// version number
	moment.version = VERSION;

	// default format
	moment.defaultFormat = isoFormat;

	// constant that refers to the ISO standard
	moment.ISO_8601 = function () { };

	// Plugins that add properties should also add the key here (null value),
	// so we can properly clone ourselves.
	moment.momentProperties = momentProperties;

	// This function will be called whenever a moment is mutated.
	// It is intended to keep the offset in sync with the timezone.
	moment.updateOffset = function () { };

	// This function allows you to set a threshold for relative time strings
	moment.relativeTimeThreshold = function (threshold, limit) {
		if (relativeTimeThresholds[threshold] === undefined) {
			return false;
		}
		relativeTimeThresholds[threshold] = limit;
		return true;
	};

	// This function will load languages and then set the global language.  If
	// no arguments are passed in, it will simply return the current global
	// language key.
	moment.lang = function (key, values) {
		var r;
		if (!key) {
			return moment.fn._lang._abbr;
		}
		if (values) {
			loadLang(normalizeLanguage(key), values);
		} else if (values === null) {
			unloadLang(key);
			key = 'en';
		} else if (!languages[key]) {
			getLangDefinition(key);
		}
		r = moment.duration.fn._lang = moment.fn._lang = getLangDefinition(key);
		return r._abbr;
	};

	// returns language data
	moment.langData = function (key) {
		if (key && key._lang && key._lang._abbr) {
			key = key._lang._abbr;
		}
		return getLangDefinition(key);
	};

	// compare moment object
	moment.isMoment = function (obj) {
		return obj instanceof Moment ||
			(obj != null && obj.hasOwnProperty('_isAMomentObject'));
	};

	// for typechecking Duration objects
	moment.isDuration = function (obj) {
		return obj instanceof Duration;
	};

	for (i = lists.length - 1; i >= 0; --i) {
		makeList(lists[i]);
	}

	moment.normalizeUnits = function (units) {
		return normalizeUnits(units);
	};

	moment.invalid = function (flags) {
		var m = moment.utc(NaN);
		if (flags != null) {
			extend(m._pf, flags);
		}
		else {
			m._pf.userInvalidated = true;
		}

		return m;
	};

	moment.parseZone = function () {
		return moment.apply(null, arguments).parseZone();
	};

	moment.parseTwoDigitYear = function (input) {
		return toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
	};

	/************************************
		Moment Prototype
	************************************/


	extend(moment.fn = Moment.prototype, {

		clone: function () {
			return moment(this);
		},

		valueOf: function () {
			return +this._d + ((this._offset || 0) * 60000);
		},

		unix: function () {
			return Math.floor(+this / 1000);
		},

		toString: function () {
			return this.clone().lang('en').format("ddd MMM DD YYYY HH:mm:ss [GMT]ZZ");
		},

		toDate: function () {
			return this._offset ? new Date(+this) : this._d;
		},

		toISOString: function () {
			var m = moment(this).utc();
			if (0 < m.year() && m.year() <= 9999) {
				return formatMoment(m, 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
			} else {
				return formatMoment(m, 'YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
			}
		},

		toArray: function () {
			var m = this;
			return [
				m.year(),
				m.month(),
				m.date(),
				m.hours(),
				m.minutes(),
				m.seconds(),
				m.milliseconds()
			];
		},

		isValid: function () {
			return isValid(this);
		},

		isDSTShifted: function () {

			if (this._a) {
				return this.isValid() && compareArrays(this._a, (this._isUTC ? moment.utc(this._a) : moment(this._a)).toArray()) > 0;
			}

			return false;
		},

		parsingFlags: function () {
			return extend({}, this._pf);
		},

		invalidAt: function () {
			return this._pf.overflow;
		},

		utc: function () {
			return this.zone(0);
		},

		local: function () {
			this.zone(0);
			this._isUTC = false;
			return this;
		},

		format: function (inputString) {
			var output = formatMoment(this, inputString || moment.defaultFormat);
			return this.lang().postformat(output);
		},

		add: function (input, val) {
			var dur;
			// switch args to support add('s', 1) and add(1, 's')
			if (typeof input === 'string' && typeof val === 'string') {
				dur = moment.duration(isNaN(+val) ? +input : +val, isNaN(+val) ? val : input);
			} else if (typeof input === 'string') {
				dur = moment.duration(+val, input);
			} else {
				dur = moment.duration(input, val);
			}
			addOrSubtractDurationFromMoment(this, dur, 1);
			return this;
		},

		subtract: function (input, val) {
			var dur;
			// switch args to support subtract('s', 1) and subtract(1, 's')
			if (typeof input === 'string' && typeof val === 'string') {
				dur = moment.duration(isNaN(+val) ? +input : +val, isNaN(+val) ? val : input);
			} else if (typeof input === 'string') {
				dur = moment.duration(+val, input);
			} else {
				dur = moment.duration(input, val);
			}
			addOrSubtractDurationFromMoment(this, dur, -1);
			return this;
		},

		diff: function (input, units, asFloat) {
			var that = makeAs(input, this),
				zoneDiff = (this.zone() - that.zone()) * 6e4,
				diff, output;

			units = normalizeUnits(units);

			if (units === 'year' || units === 'month') {
				// average number of days in the months in the given dates
				diff = (this.daysInMonth() + that.daysInMonth()) * 432e5; // 24 * 60 * 60 * 1000 / 2
				// difference in months
				output = ((this.year() - that.year()) * 12) + (this.month() - that.month());
				// adjust by taking difference in days, average number of days
				// and dst in the given months.
				output += ((this - moment(this).startOf('month')) -
						(that - moment(that).startOf('month'))) / diff;
				// same as above but with zones, to negate all dst
				output -= ((this.zone() - moment(this).startOf('month').zone()) -
						(that.zone() - moment(that).startOf('month').zone())) * 6e4 / diff;
				if (units === 'year') {
					output = output / 12;
				}
			} else {
				diff = (this - that);
				output = units === 'second' ? diff / 1e3 : // 1000
					units === 'minute' ? diff / 6e4 : // 1000 * 60
					units === 'hour' ? diff / 36e5 : // 1000 * 60 * 60
					units === 'day' ? (diff - zoneDiff) / 864e5 : // 1000 * 60 * 60 * 24, negate dst
					units === 'week' ? (diff - zoneDiff) / 6048e5 : // 1000 * 60 * 60 * 24 * 7, negate dst
					diff;
			}
			return asFloat ? output : absRound(output);
		},

		from: function (time, withoutSuffix) {
			return moment.duration(this.diff(time)).lang(this.lang()._abbr).humanize(!withoutSuffix);
		},

		fromNow: function (withoutSuffix) {
			return this.from(moment(), withoutSuffix);
		},

		calendar: function (time) {
			// We want to compare the start of today, vs this.
			// Getting start-of-today depends on whether we're zone'd or not.
			var now = time || moment(),
				sod = makeAs(now, this).startOf('day'),
				diff = this.diff(sod, 'days', true),
				format = diff < -6 ? 'sameElse' :
					diff < -1 ? 'lastWeek' :
					diff < 0 ? 'lastDay' :
					diff < 1 ? 'sameDay' :
					diff < 2 ? 'nextDay' :
					diff < 7 ? 'nextWeek' : 'sameElse';
			return this.format(this.lang().calendar(format, this));
		},

		isLeapYear: function () {
			return isLeapYear(this.year());
		},

		isDST: function () {
			return (this.zone() < this.clone().month(0).zone() ||
				this.zone() < this.clone().month(5).zone());
		},

		day: function (input) {
			var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
			if (input != null) {
				input = parseWeekday(input, this.lang());
				return this.add({ d: input - day });
			} else {
				return day;
			}
		},

		month: makeAccessor('Month', true),

		startOf: function (units) {
			units = normalizeUnits(units);
			// the following switch intentionally omits break keywords
			// to utilize falling through the cases.
			switch (units) {
				case 'year':
					this.month(0);
					/* falls through */
				case 'quarter':
				case 'month':
					this.date(1);
					/* falls through */
				case 'week':
				case 'isoWeek':
				case 'day':
					this.hours(0);
					/* falls through */
				case 'hour':
					this.minutes(0);
					/* falls through */
				case 'minute':
					this.seconds(0);
					/* falls through */
				case 'second':
					this.milliseconds(0);
					/* falls through */
			}

			// weeks are a special case
			if (units === 'week') {
				this.weekday(0);
			} else if (units === 'isoWeek') {
				this.isoWeekday(1);
			}

			// quarters are also special
			if (units === 'quarter') {
				this.month(Math.floor(this.month() / 3) * 3);
			}

			return this;
		},

		endOf: function (units) {
			units = normalizeUnits(units);
			return this.startOf(units).add((units === 'isoWeek' ? 'week' : units), 1).subtract('ms', 1);
		},

		isAfter: function (input, units) {
			units = typeof units !== 'undefined' ? units : 'millisecond';
			return +this.clone().startOf(units) > +moment(input).startOf(units);
		},

		isBefore: function (input, units) {
			units = typeof units !== 'undefined' ? units : 'millisecond';
			return +this.clone().startOf(units) < +moment(input).startOf(units);
		},

		isSame: function (input, units) {
			units = units || 'ms';
			return +this.clone().startOf(units) === +makeAs(input, this).startOf(units);
		},

		min: deprecate(
				 "moment().min is deprecated, use moment.min instead. https://github.com/moment/moment/issues/1548",
				 function (other) {
					other = moment.apply(null, arguments);
					return other < this ? this : other;
				 }
		 ),

		max: deprecate(
				"moment().max is deprecated, use moment.max instead. https://github.com/moment/moment/issues/1548",
				function (other) {
					other = moment.apply(null, arguments);
					return other > this ? this : other;
				}
		),

		// keepTime = true means only change the timezone, without affecting
		// the local hour. So 5:31:26 +0300 --[zone(2, true)]--> 5:31:26 +0200
		// It is possible that 5:31:26 doesn't exist int zone +0200, so we
		// adjust the time as needed, to be valid.
		//
		// Keeping the time actually adds/subtracts (one hour)
		// from the actual represented time. That is why we call updateOffset
		// a second time. In case it wants us to change the offset again
		// _changeInProgress == true case, then we have to adjust, because
		// there is no such time in the given timezone.
		zone: function (input, keepTime) {
			var offset = this._offset || 0;
			if (input != null) {
				if (typeof input === "string") {
					input = timezoneMinutesFromString(input);
				}
				if (Math.abs(input) < 16) {
					input = input * 60;
				}
				this._offset = input;
				this._isUTC = true;
				if (offset !== input) {
					if (!keepTime || this._changeInProgress) {
						addOrSubtractDurationFromMoment(this,
								moment.duration(offset - input, 'm'), 1, false);
					} else if (!this._changeInProgress) {
						this._changeInProgress = true;
						moment.updateOffset(this, true);
						this._changeInProgress = null;
					}
				}
			} else {
				return this._isUTC ? offset : this._d.getTimezoneOffset();
			}
			return this;
		},

		zoneAbbr: function () {
			return this._isUTC ? "UTC" : "";
		},

		zoneName: function () {
			return this._isUTC ? "Coordinated Universal Time" : "";
		},

		parseZone: function () {
			if (this._tzm) {
				this.zone(this._tzm);
			} else if (typeof this._i === 'string') {
				this.zone(this._i);
			}
			return this;
		},

		hasAlignedHourOffset: function (input) {
			if (!input) {
				input = 0;
			}
			else {
				input = moment(input).zone();
			}

			return (this.zone() - input) % 60 === 0;
		},

		daysInMonth: function () {
			return daysInMonth(this.year(), this.month());
		},

		dayOfYear: function (input) {
			var dayOfYear = round((moment(this).startOf('day') - moment(this).startOf('year')) / 864e5) + 1;
			return input == null ? dayOfYear : this.add("d", (input - dayOfYear));
		},

		quarter: function (input) {
			return input == null ? Math.ceil((this.month() + 1) / 3) : this.month((input - 1) * 3 + this.month() % 3);
		},

		weekYear: function (input) {
			var year = weekOfYear(this, this.lang()._week.dow, this.lang()._week.doy).year;
			return input == null ? year : this.add("y", (input - year));
		},

		isoWeekYear: function (input) {
			var year = weekOfYear(this, 1, 4).year;
			return input == null ? year : this.add("y", (input - year));
		},

		week: function (input) {
			var week = this.lang().week(this);
			return input == null ? week : this.add("d", (input - week) * 7);
		},

		isoWeek: function (input) {
			var week = weekOfYear(this, 1, 4).week;
			return input == null ? week : this.add("d", (input - week) * 7);
		},

		weekday: function (input) {
			var weekday = (this.day() + 7 - this.lang()._week.dow) % 7;
			return input == null ? weekday : this.add("d", input - weekday);
		},

		isoWeekday: function (input) {
			// behaves the same as moment#day except
			// as a getter, returns 7 instead of 0 (1-7 range instead of 0-6)
			// as a setter, sunday should belong to the previous week.
			return input == null ? this.day() || 7 : this.day(this.day() % 7 ? input : input - 7);
		},

		isoWeeksInYear: function () {
			return weeksInYear(this.year(), 1, 4);
		},

		weeksInYear: function () {
			var weekInfo = this._lang._week;
			return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
		},

		get: function (units) {
			units = normalizeUnits(units);
			return this[units]();
		},

		set: function (units, value) {
			units = normalizeUnits(units);
			if (typeof this[units] === 'function') {
				this[units](value);
			}
			return this;
		},

		// If passed a language key, it will set the language for this
		// instance.  Otherwise, it will return the language configuration
		// variables for this instance.
		lang: function (key) {
			if (key === undefined) {
				return this._lang;
			} else {
				this._lang = getLangDefinition(key);
				return this;
			}
		}
	});

	function rawMonthSetter(mom, value) {
		var dayOfMonth;

		// TODO: Move this out of here!
		if (typeof value === 'string') {
			value = mom.lang().monthsParse(value);
			// TODO: Another silent failure?
			if (typeof value !== 'number') {
				return mom;
			}
		}

		dayOfMonth = Math.min(mom.date(),
				daysInMonth(mom.year(), value));
		mom._d['set' + (mom._isUTC ? 'UTC' : '') + 'Month'](value, dayOfMonth);
		return mom;
	}

	function rawGetter(mom, unit) {
		return mom._d['get' + (mom._isUTC ? 'UTC' : '') + unit]();
	}

	function rawSetter(mom, unit, value) {
		if (unit === 'Month') {
			return rawMonthSetter(mom, value);
		} else {
			return mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value);
		}
	}

	function makeAccessor(unit, keepTime) {
		return function (value) {
			if (value != null) {
				rawSetter(this, unit, value);
				moment.updateOffset(this, keepTime);
				return this;
			} else {
				return rawGetter(this, unit);
			}
		};
	}

	moment.fn.millisecond = moment.fn.milliseconds = makeAccessor('Milliseconds', false);
	moment.fn.second = moment.fn.seconds = makeAccessor('Seconds', false);
	moment.fn.minute = moment.fn.minutes = makeAccessor('Minutes', false);
	// Setting the hour should keep the time, because the user explicitly
	// specified which hour he wants. So trying to maintain the same hour (in
	// a new timezone) makes sense. Adding/subtracting hours does not follow
	// this rule.
	moment.fn.hour = moment.fn.hours = makeAccessor('Hours', true);
	// moment.fn.month is defined separately
	moment.fn.date = makeAccessor('Date', true);
	moment.fn.dates = deprecate("dates accessor is deprecated. Use date instead.", makeAccessor('Date', true));
	moment.fn.year = makeAccessor('FullYear', true);
	moment.fn.years = deprecate("years accessor is deprecated. Use year instead.", makeAccessor('FullYear', true));

	// add plural methods
	moment.fn.days = moment.fn.day;
	moment.fn.months = moment.fn.month;
	moment.fn.weeks = moment.fn.week;
	moment.fn.isoWeeks = moment.fn.isoWeek;
	moment.fn.quarters = moment.fn.quarter;

	// add aliased format methods
	moment.fn.toJSON = moment.fn.toISOString;

	/************************************
		Duration Prototype
	************************************/


	extend(moment.duration.fn = Duration.prototype, {

		_bubble: function () {
			var milliseconds = this._milliseconds,
				days = this._days,
				months = this._months,
				data = this._data,
				seconds, minutes, hours, years;

			// The following code bubbles up values, see the tests for
			// examples of what that means.
			data.milliseconds = milliseconds % 1000;

			seconds = absRound(milliseconds / 1000);
			data.seconds = seconds % 60;

			minutes = absRound(seconds / 60);
			data.minutes = minutes % 60;

			hours = absRound(minutes / 60);
			data.hours = hours % 24;

			days += absRound(hours / 24);
			data.days = days % 30;

			months += absRound(days / 30);
			data.months = months % 12;

			years = absRound(months / 12);
			data.years = years;
		},

		weeks: function () {
			return absRound(this.days() / 7);
		},

		valueOf: function () {
			return this._milliseconds +
			  this._days * 864e5 +
			  (this._months % 12) * 2592e6 +
			  toInt(this._months / 12) * 31536e6;
		},

		humanize: function (withSuffix) {
			var difference = +this,
				output = relativeTime(difference, !withSuffix, this.lang());

			if (withSuffix) {
				output = this.lang().pastFuture(difference, output);
			}

			return this.lang().postformat(output);
		},

		add: function (input, val) {
			// supports only 2.0-style add(1, 's') or add(moment)
			var dur = moment.duration(input, val);

			this._milliseconds += dur._milliseconds;
			this._days += dur._days;
			this._months += dur._months;

			this._bubble();

			return this;
		},

		subtract: function (input, val) {
			var dur = moment.duration(input, val);

			this._milliseconds -= dur._milliseconds;
			this._days -= dur._days;
			this._months -= dur._months;

			this._bubble();

			return this;
		},

		get: function (units) {
			units = normalizeUnits(units);
			return this[units.toLowerCase() + 's']();
		},

		as: function (units) {
			units = normalizeUnits(units);
			return this['as' + units.charAt(0).toUpperCase() + units.slice(1) + 's']();
		},

		lang: moment.fn.lang,

		toIsoString: function () {
			// inspired by https://github.com/dordille/moment-isoduration/blob/master/moment.isoduration.js
			var years = Math.abs(this.years()),
				months = Math.abs(this.months()),
				days = Math.abs(this.days()),
				hours = Math.abs(this.hours()),
				minutes = Math.abs(this.minutes()),
				seconds = Math.abs(this.seconds() + this.milliseconds() / 1000);

			if (!this.asSeconds()) {
				// this is the same as C#'s (Noda) and python (isodate)...
				// but not other JS (goog.date)
				return 'P0D';
			}

			return (this.asSeconds() < 0 ? '-' : '') +
				'P' +
				(years ? years + 'Y' : '') +
				(months ? months + 'M' : '') +
				(days ? days + 'D' : '') +
				((hours || minutes || seconds) ? 'T' : '') +
				(hours ? hours + 'H' : '') +
				(minutes ? minutes + 'M' : '') +
				(seconds ? seconds + 'S' : '');
		}
	});

	function makeDurationGetter(name) {
		moment.duration.fn[name] = function () {
			return this._data[name];
		};
	}

	function makeDurationAsGetter(name, factor) {
		moment.duration.fn['as' + name] = function () {
			return +this / factor;
		};
	}

	for (i in unitMillisecondFactors) {
		if (unitMillisecondFactors.hasOwnProperty(i)) {
			makeDurationAsGetter(i, unitMillisecondFactors[i]);
			makeDurationGetter(i.toLowerCase());
		}
	}

	makeDurationAsGetter('Weeks', 6048e5);
	moment.duration.fn.asMonths = function () {
		return (+this - this.years() * 31536e6) / 2592e6 + this.years() * 12;
	};


	/************************************
		Default Lang
	************************************/


	// Set default language, other languages will inherit from English.
	moment.lang('en', {
		ordinal: function (number) {
			var b = number % 10,
				output = (toInt(number % 100 / 10) === 1) ? 'th' :
				(b === 1) ? 'st' :
				(b === 2) ? 'nd' :
				(b === 3) ? 'rd' : 'th';
			return number + output;
		}
	});

	/* EMBED_LANGUAGES */

	/************************************
		Exposing Moment
	************************************/

	function makeGlobal(shouldDeprecate) {
		/*global ender:false */
		if (typeof ender !== 'undefined') {
			return;
		}
		oldGlobalMoment = globalScope.moment;
		if (shouldDeprecate) {
			globalScope.moment = deprecate(
					"Accessing Moment through the global scope is " +
					"deprecated, and will be removed in an upcoming " +
					"release.",
					moment);
		} else {
			globalScope.moment = moment;
		}
	}

	// CommonJS module is defined
	if (hasModule) {
		module.exports = moment;
	} else if (typeof define === "function" && define.amd) {
		define("moment", function (require, exports, module) {
			if (module.config && module.config() && module.config().noGlobal === true) {
				// release the global variable
				globalScope.moment = oldGlobalMoment;
			}

			return moment;
		});
		makeGlobal(true);
	} else {
		makeGlobal();
	}
}).call(this);
/*!
 * rrule.js - Library for working with recurrence rules for calendar dates.
 * https://github.com/jakubroztocil/rrule
 *
 * Copyright 2010, Jakub Roztocil and Lars Schoning
 * Licenced under the BSD licence.
 * https://github.com/jakubroztocil/rrule/blob/master/LICENCE
 *
 * Based on:
 * python-dateutil - Extensions to the standard Python datetime module.
 * Copyright (c) 2003-2011 - Gustavo Niemeyer <gustavo@niemeyer.net>
 * Copyright (c) 2012 - Tomi Pieviläinen <tomi.pievilainen@iki.fi>
 * https://github.com/jakubroztocil/rrule/blob/master/LICENCE
 *
 */
(function (root) {

	var serverSide = typeof module !== 'undefined' && module.exports;


	var getnlp = function () {
		if (!getnlp._nlp) {
			if (serverSide) {
				// Lazy, runtime import to avoid circular refs.
				getnlp._nlp = require('./nlp')
			} else if (!(getnlp._nlp = root._RRuleNLP)) {
				throw new Error(
					'You need to include rrule/nlp.js for fromText/toText to work.'
				)
			}
		}
		return getnlp._nlp;
	};


	//=============================================================================
	// Date utilities
	//=============================================================================

	/**
	 * General date-related utilities.
	 * Also handles several incompatibilities between JavaScript and Python
	 *
	 */
	var dateutil = {

		MONTH_DAYS: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],

		/**
		 * Number of milliseconds of one day
		 */
		ONE_DAY: 1000 * 60 * 60 * 24,

		/**
		 * @see: <http://docs.python.org/library/datetime.html#datetime.MAXYEAR>
		 */
		MAXYEAR: 9999,

		/**
		 * Python uses 1-Jan-1 as the base for calculating ordinals but we don't
		 * want to confuse the JS engine with milliseconds > Number.MAX_NUMBER,
		 * therefore we use 1-Jan-1970 instead
		 */
		ORDINAL_BASE: new Date(1970, 0, 1),

		/**
		 * Python: MO-SU: 0 - 6
		 * JS: SU-SAT 0 - 6
		 */
		PY_WEEKDAYS: [6, 0, 1, 2, 3, 4, 5],

		/**
		 * py_date.timetuple()[7]
		 */
		getYearDay: function (date) {
			var dateNoTime = new Date(
				date.getFullYear(), date.getMonth(), date.getDate());
			return Math.ceil(
				(dateNoTime - new Date(date.getFullYear(), 0, 1))
				/ dateutil.ONE_DAY) + 1;
		},

		isLeapYear: function (year) {
			if (year instanceof Date) {
				year = year.getFullYear();
			}
			return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
		},

		/**
		 * @return {Number} the date's timezone offset in ms
		 */
		tzOffset: function (date) {
			return date.getTimezoneOffset() * 60 * 1000
		},

		/**
		 * @see: <http://www.mcfedries.com/JavaScript/DaysBetween.asp>
		 */
		daysBetween: function (date1, date2) {
			// The number of milliseconds in one day
			// Convert both dates to milliseconds
			var date1_ms = date1.getTime() - dateutil.tzOffset(date1);
			var date2_ms = date2.getTime() - dateutil.tzOffset(date2);
			// Calculate the difference in milliseconds
			var difference_ms = Math.abs(date1_ms - date2_ms);
			// Convert back to days and return
			return Math.round(difference_ms / dateutil.ONE_DAY);
		},

		/**
		 * @see: <http://docs.python.org/library/datetime.html#datetime.date.toordinal>
		 */
		toOrdinal: function (date) {
			return dateutil.daysBetween(date, dateutil.ORDINAL_BASE);
		},

		/**
		 * @see - <http://docs.python.org/library/datetime.html#datetime.date.fromordinal>
		 */
		fromOrdinal: function (ordinal) {
			var millisecsFromBase = ordinal * dateutil.ONE_DAY;
			return new Date(dateutil.ORDINAL_BASE.getTime()
							- dateutil.tzOffset(dateutil.ORDINAL_BASE)
							+ millisecsFromBase
							+ dateutil.tzOffset(new Date(millisecsFromBase)));
		},

		/**
		 * @see: <http://docs.python.org/library/calendar.html#calendar.monthrange>
		 */
		monthRange: function (year, month) {
			var date = new Date(year, month, 1);
			return [dateutil.getWeekday(date), dateutil.getMonthDays(date)];
		},

		getMonthDays: function (date) {
			var month = date.getMonth();
			return month == 1 && dateutil.isLeapYear(date)
				? 29
				: dateutil.MONTH_DAYS[month];
		},

		/**
		 * @return {Number} python-like weekday
		 */
		getWeekday: function (date) {
			return dateutil.PY_WEEKDAYS[date.getDay()];
		},

		/**
		 * @see: <http://docs.python.org/library/datetime.html#datetime.datetime.combine>
		 */
		combine: function (date, time) {
			time = time || date;
			return new Date(
				date.getFullYear(), date.getMonth(), date.getDate(),
				time.getHours(), time.getMinutes(), time.getSeconds()
			);
		},

		clone: function (date) {
			var dolly = new Date(date.getTime());
			dolly.setMilliseconds(0);
			return dolly;
		},

		cloneDates: function (dates) {
			var clones = [];
			for (var i = 0; i < dates.length; i++) {
				clones.push(dateutil.clone(dates[i]));
			}
			return clones;
		},

		/**
		 * Sorts an array of Date or dateutil.Time objects
		 */
		sort: function (dates) {
			dates.sort(function (a, b) {
				return a.getTime() - b.getTime();
			});
		},

		timeToUntilString: function (time) {
			var date = new Date(time);
			var comp, comps = [
				date.getUTCFullYear(),
				date.getUTCMonth() + 1,
				date.getUTCDate(),
				'T',
				date.getUTCHours(),
				date.getUTCMinutes(),
				date.getUTCSeconds(),
				'Z'
			];
			for (var i = 0; i < comps.length; i++) {
				comp = comps[i];
				if (!/[TZ]/.test(comp) && comp < 10) {
					comps[i] = '0' + String(comp);
				}
			}
			return comps.join('');
		},

		untilStringToDate: function (until) {
			var re = /^(\d{4})(\d{2})(\d{2})(T(\d{2})(\d{2})(\d{2})Z)?$/;
			var bits = re.exec(until);
			if (!bits) {
				throw new Error('Invalid UNTIL value: ' + until)
			}
			return new Date(
				Date.UTC(bits[1],
				bits[2] - 1,
				bits[3],
				bits[5] || 0,
				bits[6] || 0,
				bits[7] || 0
			));
		}

	};

	dateutil.Time = function (hour, minute, second) {
		this.hour = hour;
		this.minute = minute;
		this.second = second;
	};

	dateutil.Time.prototype = {
		getHours: function () {
			return this.hour;
		},
		getMinutes: function () {
			return this.minute;
		},
		getSeconds: function () {
			return this.second;
		},
		getTime: function () {
			return ((this.hour * 60 * 60)
					 + (this.minute * 60)
					 + this.second)
				   * 1000;
		}
	};


	//=============================================================================
	// Helper functions
	//=============================================================================


	/**
	 * Simplified version of python's range()
	 */
	var range = function (start, end) {
		if (arguments.length === 1) {
			end = start;
			start = 0;
		}
		var rang = [];
		for (var i = start; i < end; i++) {
			rang.push(i);
		}
		return rang;
	};
	var repeat = function (value, times) {
		var i = 0, array = [];
		if (value instanceof Array) {
			for (; i < times; i++) {
				array[i] = [].concat(value);
			}
		} else {
			for (; i < times; i++) {
				array[i] = value;
			}
		}
		return array;
	};


	/**
	 * closure/goog/math/math.js:modulo
	 * Copyright 2006 The Closure Library Authors.
	 * The % operator in JavaScript returns the remainder of a / b, but differs from
	 * some other languages in that the result will have the same sign as the
	 * dividend. For example, -1 % 8 == -1, whereas in some other languages
	 * (such as Python) the result would be 7. This function emulates the more
	 * correct modulo behavior, which is useful for certain applications such as
	 * calculating an offset index in a circular list.
	 *
	 * @param {number} a The dividend.
	 * @param {number} b The divisor.
	 * @return {number} a % b where the result is between 0 and b (either 0 <= x < b
	 *     or b < x <= 0, depending on the sign of b).
	 */
	var pymod = function (a, b) {
		var r = a % b;
		// If r and b differ in sign, add b to wrap the result to the correct sign.
		return (r * b < 0) ? r + b : r;
	};


	/**
	 * @see: <http://docs.python.org/library/functions.html#divmod>
	 */
	var divmod = function (a, b) {
		return { div: Math.floor(a / b), mod: pymod(a, b) };
	};


	/**
	 * Python-like boolean
	 * @return {Boolean} value of an object/primitive, taking into account
	 * the fact that in Python an empty list's/tuple's
	 * boolean value is False, whereas in JS it's true
	 */
	var plb = function (obj) {
		return (obj instanceof Array && obj.length == 0)
			? false
			: Boolean(obj);
	};


	/**
	 * Return true if a value is in an array
	 */
	var contains = function (arr, val) {
		return arr.indexOf(val) != -1;
	};


	//=============================================================================
	// Date masks
	//=============================================================================

	// Every mask is 7 days longer to handle cross-year weekly periods.

	var M365MASK = [].concat(
		repeat(1, 31), repeat(2, 28), repeat(3, 31),
		repeat(4, 30), repeat(5, 31), repeat(6, 30),
		repeat(7, 31), repeat(8, 31), repeat(9, 30),
		repeat(10, 31), repeat(11, 30), repeat(12, 31),
		repeat(1, 7)
	);
	var M366MASK = [].concat(
		repeat(1, 31), repeat(2, 29), repeat(3, 31),
		repeat(4, 30), repeat(5, 31), repeat(6, 30),
		repeat(7, 31), repeat(8, 31), repeat(9, 30),
		repeat(10, 31), repeat(11, 30), repeat(12, 31),
		repeat(1, 7)
	);

	var
		M28 = range(1, 29),
		M29 = range(1, 30),
		M30 = range(1, 31),
		M31 = range(1, 32);
	var MDAY366MASK = [].concat(
		M31, M29, M31,
		M30, M31, M30,
		M31, M31, M30,
		M31, M30, M31,
		M31.slice(0, 7)
	);
	var MDAY365MASK = [].concat(
		M31, M28, M31,
		M30, M31, M30,
		M31, M31, M30,
		M31, M30, M31,
		M31.slice(0, 7)
	);

	M28 = range(-28, 0);
	M29 = range(-29, 0);
	M30 = range(-30, 0);
	M31 = range(-31, 0);
	var NMDAY366MASK = [].concat(
		M31, M29, M31,
		M30, M31, M30,
		M31, M31, M30,
		M31, M30, M31,
		M31.slice(0, 7)
	);
	var NMDAY365MASK = [].concat(
		M31, M28, M31,
		M30, M31, M30,
		M31, M31, M30,
		M31, M30, M31,
		M31.slice(0, 7)
	);

	var M366RANGE = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335, 366];
	var M365RANGE = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];

	var WDAYMASK = (function () {
		for (var wdaymask = [], i = 0; i < 55; i++) {
			wdaymask = wdaymask.concat(range(7));
		}
		return wdaymask;
	}());


	//=============================================================================
	// Weekday
	//=============================================================================

	var Weekday = function (weekday, n) {
		if (n === 0) {
			throw new Error('Can\'t create weekday with n == 0');
		}
		this.weekday = weekday;
		this.n = n;
	};

	Weekday.prototype = {

		// __call__ - Cannot call the object directly, do it through
		// e.g. RRule.TH.nth(-1) instead,
		nth: function (n) {
			return this.n == n ? this : new Weekday(this.weekday, n);
		},

		// __eq__
		equals: function (other) {
			return this.weekday == other.weekday && this.n == other.n;
		},

		// __repr__
		toString: function () {
			var s = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'][this.weekday];
			if (this.n) {
				s = (this.n > 0 ? '+' : '') + String(this.n) + s;
			}
			return s;
		},

		getJsWeekday: function () {
			return this.weekday == 6 ? 0 : this.weekday + 1;
		}

	};


	//=============================================================================
	// RRule
	//=============================================================================

	/**
	 *
	 * @param {Object?} options - see <http://labix.org/python-dateutil/#head-cf004ee9a75592797e076752b2a889c10f445418>
	 *        The only required option is `freq`, one of RRule.YEARLY, RRule.MONTHLY, ...
	 * @constructor
	 */
	var RRule = function (options, noCache) {

		// RFC string
		this._string = null;

		options = options || {};

		this._cache = noCache ? null : {
			all: false,
			before: [],
			after: [],
			between: []
		};

		// used by toString()
		this.origOptions = {};

		var invalid = [],
			keys = Object.keys(options),
			defaultKeys = Object.keys(RRule.DEFAULT_OPTIONS);

		// Shallow copy for origOptions and check for invalid
		keys.forEach(function (key) {
			this.origOptions[key] = options[key];
			if (!contains(defaultKeys, key)) invalid.push(key);
		}, this);

		if (invalid.length) {
			//throw new Error('Invalid options: ' + invalid.join(', '))
		}

		if (!RRule.FREQUENCIES[options.freq] && options.byeaster === null) {
			throw new Error('Invalid frequency: ' + String(options.freq))
		}

		// Merge in default options
		defaultKeys.forEach(function (key) {
			if (!contains(keys, key)) options[key] = RRule.DEFAULT_OPTIONS[key];
		});

		var opts = this.options = options;

		if (opts.byeaster !== null) {
			opts.freq = RRule.YEARLY;
		}

		if (!opts.dtstart) {
			opts.dtstart = new Date();
			opts.dtstart.setMilliseconds(0);
		}

		if (opts.wkst === null) {
			opts.wkst = RRule.MO.weekday;
		} else if (typeof opts.wkst == 'number') {
			// cool, just keep it like that
		} else {
			opts.wkst = opts.wkst.weekday;
		}

		if (opts.bysetpos !== null) {
			if (typeof opts.bysetpos == 'number') {
				opts.bysetpos = [opts.bysetpos];
			}
			for (var i = 0; i < opts.bysetpos.length; i++) {
				var v = opts.bysetpos[i];
				if (v == 0 || !(-366 <= v && v <= 366)) {
					throw new Error(
						'bysetpos must be between 1 and 366,' +
							' or between -366 and -1'
					);
				}
			}
		}

		if (!(plb(opts.byweekno) || plb(opts.byyearday)
			|| plb(opts.bymonthday) || opts.byweekday !== null
			|| opts.byeaster !== null)) {
			switch (opts.freq) {
				case RRule.YEARLY:
					if (!opts.bymonth) {
						opts.bymonth = opts.dtstart.getMonth() + 1;
					}
					opts.bymonthday = opts.dtstart.getDate();
					break;
				case RRule.MONTHLY:
					opts.bymonthday = opts.dtstart.getDate();
					break;
				case RRule.WEEKLY:
					opts.byweekday = dateutil.getWeekday(
												opts.dtstart);
					break;
			}
		}

		// bymonth
		if (opts.bymonth !== null
			&& !(opts.bymonth instanceof Array)) {
			opts.bymonth = [opts.bymonth];
		}

		// byyearday
		if (opts.byyearday !== null
			&& !(opts.byyearday instanceof Array)) {
			opts.byyearday = [opts.byyearday];
		}

		// bymonthday
		if (opts.bymonthday === null) {
			opts.bymonthday = [];
			opts.bynmonthday = [];
		} else if (opts.bymonthday instanceof Array) {
			var bymonthday = [], bynmonthday = [];

			for (i = 0; i < opts.bymonthday.length; i++) {
				var v = opts.bymonthday[i];
				if (v > 0) {
					bymonthday.push(v);
				} else if (v < 0) {
					bynmonthday.push(v);
				}
			}
			opts.bymonthday = bymonthday;
			opts.bynmonthday = bynmonthday;
		} else {
			if (opts.bymonthday < 0) {
				opts.bynmonthday = [opts.bymonthday];
				opts.bymonthday = [];
			} else {
				opts.bynmonthday = [];
				opts.bymonthday = [opts.bymonthday];
			}
		}

		// byweekno
		if (opts.byweekno !== null
			&& !(opts.byweekno instanceof Array)) {
			opts.byweekno = [opts.byweekno];
		}

		// byweekday / bynweekday
		if (opts.byweekday === null) {
			opts.bynweekday = null;
		} else if (typeof opts.byweekday == 'number') {
			opts.byweekday = [opts.byweekday];
			opts.bynweekday = null;

		} else if (opts.byweekday instanceof Weekday) {

			if (!opts.byweekday.n || opts.freq > RRule.MONTHLY) {
				opts.byweekday = [opts.byweekday.weekday];
				opts.bynweekday = null;
			} else {
				opts.bynweekday = [
					[opts.byweekday.weekday,
					 opts.byweekday.n]
				];
				opts.byweekday = null;
			}

		} else {
			var byweekday = [], bynweekday = [];

			for (i = 0; i < opts.byweekday.length; i++) {
				var wday = opts.byweekday[i];

				if (typeof wday == 'number') {
					byweekday.push(wday);
				} else if (!wday.n || opts.freq > RRule.MONTHLY) {
					byweekday.push(wday.weekday);
				} else {
					bynweekday.push([wday.weekday, wday.n]);
				}
			}
			opts.byweekday = plb(byweekday) ? byweekday : null;
			opts.bynweekday = plb(bynweekday) ? bynweekday : null;
		}

		// byhour
		if (opts.byhour === null) {
			opts.byhour = (opts.freq < RRule.HOURLY)
				? [opts.dtstart.getHours()]
				: null;
		} else if (typeof opts.byhour == 'number') {
			opts.byhour = [opts.byhour];
		}

		// byminute
		if (opts.byminute === null) {
			opts.byminute = (opts.freq < RRule.MINUTELY)
				? [opts.dtstart.getMinutes()]
				: null;
		} else if (typeof opts.byminute == 'number') {
			opts.byminute = [opts.byminute];
		}

		// bysecond
		if (opts.bysecond === null) {
			opts.bysecond = (opts.freq < RRule.SECONDLY)
				? [opts.dtstart.getSeconds()]
				: null;
		} else if (typeof opts.bysecond == 'number') {
			opts.bysecond = [opts.bysecond];
		}

		if (opts.freq >= RRule.HOURLY) {
			this.timeset = null;
		} else {
			this.timeset = [];
			for (i = 0; i < opts.byhour.length; i++) {
				var hour = opts.byhour[i];
				for (var j = 0; j < opts.byminute.length; j++) {
					var minute = opts.byminute[j];
					for (var k = 0; k < opts.bysecond.length; k++) {
						var second = opts.bysecond[k];
						// python:
						// datetime.time(hour, minute, second,
						// tzinfo=self._tzinfo))
						this.timeset.push(new dateutil.Time(hour, minute, second));
					}
				}
			}
			dateutil.sort(this.timeset);
		}

	};
	//}}}

	// RRule class 'constants'

	RRule.FREQUENCIES = [
		'YEARLY', 'MONTHLY', 'WEEKLY', 'DAILY',
		'HOURLY', 'MINUTELY', 'SECONDLY'
	];

	RRule.YEARLY = 0;
	RRule.MONTHLY = 1;
	RRule.WEEKLY = 2;
	RRule.DAILY = 3;
	RRule.HOURLY = 4;
	RRule.MINUTELY = 5;
	RRule.SECONDLY = 6;

	RRule.MO = new Weekday(0);
	RRule.TU = new Weekday(1);
	RRule.WE = new Weekday(2);
	RRule.TH = new Weekday(3);
	RRule.FR = new Weekday(4);
	RRule.SA = new Weekday(5);
	RRule.SU = new Weekday(6);

	RRule.DEFAULT_OPTIONS = {
		freq: null,
		dtstart: null,
		interval: 1,
		wkst: RRule.MO,
		count: null,
		until: null,
		bysetpos: null,
		bymonth: null,
		bymonthday: null,
		byyearday: null,
		byweekno: null,
		byweekday: null,
		byhour: null,
		byminute: null,
		bysecond: null,
		byeaster: null
	};



	RRule.parseText = function (text, language) {
		return getnlp().parseText(text, language)
	};

	RRule.fromText = function (text, language) {
		return getnlp().fromText(text, language)
	};

	RRule.optionsToString = function (options) {
		var key, keys, defaultKeys, value, strValues, pairs = [];

		keys = Object.keys(options);
		defaultKeys = Object.keys(RRule.DEFAULT_OPTIONS);

		for (var i = 0; i < keys.length; i++) {

			if (!contains(defaultKeys, keys[i])) continue;

			key = keys[i].toUpperCase();
			value = options[keys[i]];
			strValues = [];

			if (value === null || value instanceof Array && !value.length) {
				continue;
			}

			switch (key) {
				case 'FREQ':
					value = RRule.FREQUENCIES[options.freq];
					break;
				case 'WKST':
					value = value.toString();
					break;
				case 'BYWEEKDAY':
					/*
					NOTE: BYWEEKDAY is a special case.
					RRule() deconstructs the rule.options.byweekday array
					into an array of Weekday arguments.
					On the other hand, rule.origOptions is an array of Weekdays.
					We need to handle both cases here.
					It might be worth change RRule to keep the Weekdays.
	
					Also, BYWEEKDAY (used by RRule) vs. BYDAY (RFC)
	
					*/
					key = 'BYDAY';
					if (!(value instanceof Array)) {
						value = [value];
					}
					for (var wday, j = 0; j < value.length; j++) {
						wday = value[j];
						if (wday instanceof Weekday) {
							// good
						} else if (wday instanceof Array) {
							wday = new Weekday(wday[0], wday[1]);
						} else {
							wday = new Weekday(wday);
						}
						strValues[j] = wday.toString();
					}
					value = strValues;
					break;
				case 'DTSTART':
				case 'UNTIL':
					value = dateutil.timeToUntilString(value);
					break;
				default:
					if (value instanceof Array) {
						for (var j = 0; j < value.length; j++) {
							strValues[j] = String(value[j]);
						}
						value = strValues;
					} else {
						value = String(value);
					}

			}
			pairs.push([key, value]);
		}

		var strings = [];
		for (var i = 0; i < pairs.length; i++) {
			var attr = pairs[i];
			strings.push(attr[0] + '=' + attr[1].toString());
		}
		return strings.join(';');

	};

	RRule.prototype = {

		/**
		 * @param {Function} iterator - optional function that will be called
		 *                   on each date that is added. It can return false
		 *                   to stop the iteration.
		 * @return Array containing all recurrences.
		 */
		all: function (iterator) {
			if (iterator) {
				return this._iter(new CallbackIterResult('all', {}, iterator));
			} else {
				var result = this._cacheGet('all');
				if (result === false) {
					result = this._iter(new IterResult('all', {}));
					this._cacheAdd('all', result);
				}
				return result;
			}
		},

		/**
		 * Returns all the occurrences of the rrule between after and before.
		 * The inc keyword defines what happens if after and/or before are
		 * themselves occurrences. With inc == True, they will be included in the
		 * list, if they are found in the recurrence set.
		 * @return Array
		 */
		between: function (after, before, inc, iterator) {
			var args = {
				before: before,
				after: after,
				inc: inc
			}

			if (iterator) {
				return this._iter(
					new CallbackIterResult('between', args, iterator));
			} else {
				var result = this._cacheGet('between', args);
				if (result === false) {
					result = this._iter(new IterResult('between', args));
					this._cacheAdd('between', result, args);
				}
				return result;
			}
		},

		/**
		 * Returns the last recurrence before the given datetime instance.
		 * The inc keyword defines what happens if dt is an occurrence.
		 * With inc == True, if dt itself is an occurrence, it will be returned.
		 * @return Date or null
		 */
		before: function (dt, inc) {
			var args = {
				dt: dt,
				inc: inc
			},
				result = this._cacheGet('before', args);
			if (result === false) {
				result = this._iter(new IterResult('before', args));
				this._cacheAdd('before', result, args);
			}
			return result;
		},

		/**
		 * Returns the first recurrence after the given datetime instance.
		 * The inc keyword defines what happens if dt is an occurrence.
		 * With inc == True, if dt itself is an occurrence, it will be returned.
		 * @return Date or null
		 */
		after: function (dt, inc) {
			var args = {
				dt: dt,
				inc: inc
			},
				result = this._cacheGet('after', args);
			if (result === false) {
				result = this._iter(new IterResult('after', args));
				this._cacheAdd('after', result, args);
			}
			return result;
		},

		/**
		 * Returns the number of recurrences in this set. It will have go trough
		 * the whole recurrence, if this hasn't been done before.
		 */
		count: function () {
			return this.all().length;
		},

		/**
		 * Converts the rrule into its string representation
		 * @see <http://www.ietf.org/rfc/rfc2445.txt>
		 * @return String
		 */
		toString: function () {
			return RRule.optionsToString(this.origOptions);
		},

		/**
		* Will convert all rules described in nlp:ToText
		* to text.
		*/
		toText: function (gettext, language) {
			return getnlp().toText(this, gettext, language);
		},

		isFullyConvertibleToText: function () {
			return getnlp().isFullyConvertible(this)
		},

		/**
		 * @param {String} what - all/before/after/between
		 * @param {Array,Date} value - an array of dates, one date, or null
		 * @param {Object?} args - _iter arguments
		 */
		_cacheAdd: function (what, value, args) {

			if (!this._cache) return;

			if (value) {
				value = (value instanceof Date)
							? dateutil.clone(value)
							: dateutil.cloneDates(value);
			}

			if (what == 'all') {
				this._cache.all = value;
			} else {
				args._value = value;
				this._cache[what].push(args);
			}

		},

		/**
		 * @return false - not in the cache
		 *         null  - cached, but zero occurrences (before/after)
		 *         Date  - cached (before/after)
		 *         []    - cached, but zero occurrences (all/between)
		 *         [Date1, DateN] - cached (all/between)
		 */
		_cacheGet: function (what, args) {

			if (!this._cache) {
				return false;
			}

			var cached = false;

			if (what == 'all') {
				cached = this._cache.all;
			} else {
				// Let's see whether we've already called the
				// 'what' method with the same 'args'
				loopItems:
					for (var item, i = 0; i < this._cache[what].length; i++) {
						item = this._cache[what][i];
						for (var k in args) {
							if (args.hasOwnProperty(k)
								&& String(args[k]) != String(item[k])) {
								continue loopItems;
							}
						}
						cached = item._value;
						break;
					}
			}

			if (!cached && this._cache.all) {
				// Not in the cache, but we already know all the occurrences,
				// so we can find the correct dates from the cached ones.
				var iterResult = new IterResult(what, args);
				for (var i = 0; i < this._cache.all.length; i++) {
					if (!iterResult.accept(this._cache.all[i])) {
						break;
					}
				}
				cached = iterResult.getValue();
				this._cacheAdd(what, cached, args);
			}

			return cached instanceof Array
				? dateutil.cloneDates(cached)
				: (cached instanceof Date
					? dateutil.clone(cached)
					: cached);
		},

		/**
		 * @return a RRule instance with the same freq and options
		 *          as this one (cache is not cloned)
		 */
		clone: function () {
			return new RRule(this.origOptions);
		},

		_iter: function (iterResult) {

			/* Since JavaScript doesn't have the python's yield operator (<1.7),
			   we use the IterResult object that tells us when to stop iterating.
	
			*/

			var dtstart = this.options.dtstart;

			var
				year = dtstart.getFullYear(),
				month = dtstart.getMonth() + 1,
				day = dtstart.getDate(),
				hour = dtstart.getHours(),
				minute = dtstart.getMinutes(),
				second = dtstart.getSeconds(),
				weekday = dateutil.getWeekday(dtstart),
				yearday = dateutil.getYearDay(dtstart);

			// Some local variables to speed things up a bit
			var
				freq = this.options.freq,
				interval = this.options.interval,
				wkst = this.options.wkst,
				until = this.options.until,
				bymonth = this.options.bymonth,
				byweekno = this.options.byweekno,
				byyearday = this.options.byyearday,
				byweekday = this.options.byweekday,
				byeaster = this.options.byeaster,
				bymonthday = this.options.bymonthday,
				bynmonthday = this.options.bynmonthday,
				bysetpos = this.options.bysetpos,
				byhour = this.options.byhour,
				byminute = this.options.byminute,
				bysecond = this.options.bysecond;

			var ii = new Iterinfo(this);
			ii.rebuild(year, month);

			var getdayset = {};
			getdayset[RRule.YEARLY] = ii.ydayset;
			getdayset[RRule.MONTHLY] = ii.mdayset;
			getdayset[RRule.WEEKLY] = ii.wdayset;
			getdayset[RRule.DAILY] = ii.ddayset;
			getdayset[RRule.HOURLY] = ii.ddayset;
			getdayset[RRule.MINUTELY] = ii.ddayset;
			getdayset[RRule.SECONDLY] = ii.ddayset;

			getdayset = getdayset[freq];

			var timeset;
			if (freq < RRule.HOURLY) {
				timeset = this.timeset;
			} else {
				var gettimeset = {};
				gettimeset[RRule.HOURLY] = ii.htimeset;
				gettimeset[RRule.MINUTELY] = ii.mtimeset;
				gettimeset[RRule.SECONDLY] = ii.stimeset;
				gettimeset = gettimeset[freq];
				if ((freq >= RRule.HOURLY && plb(byhour) && !contains(byhour, hour)) ||
					(freq >= RRule.MINUTELY && plb(byminute) && !contains(byminute, minute)) ||
					(freq >= RRule.SECONDLY && plb(bysecond) && !contains(bysecond, minute))) {
					timeset = [];
				} else {
					timeset = gettimeset.call(ii, hour, minute, second);
				}
			}

			var filtered, total = 0, count = this.options.count;

			var iterNo = 0;

			var i, j, k, dm, div, mod, tmp, pos, dayset, start, end, fixday;

			while (true) {

				// Get dayset with the right frequency
				tmp = getdayset.call(ii, year, month, day);
				dayset = tmp[0]; start = tmp[1]; end = tmp[2];

				// Do the "hard" work ;-)
				filtered = false;
				for (j = start; j < end; j++) {

					i = dayset[j];

					if ((plb(bymonth) && !contains(bymonth, ii.mmask[i])) ||
						(plb(byweekno) && !ii.wnomask[i]) ||
						(plb(byweekday) && !contains(byweekday, ii.wdaymask[i])) ||
						(plb(ii.nwdaymask) && !ii.nwdaymask[i]) ||
						(byeaster !== null && !contains(ii.eastermask, i)) ||
						(
							(plb(bymonthday) || plb(bynmonthday)) &&
							!contains(bymonthday, ii.mdaymask[i]) &&
							!contains(bynmonthday, ii.nmdaymask[i])
						)
						||
						(
							plb(byyearday)
							&&
							(
								(
									i < ii.yearlen &&
									!contains(byyearday, i + 1) &&
									!contains(byyearday, -ii.yearlen + i)
								)
								||
								(
									i >= ii.yearlen &&
									!contains(byyearday, i + 1 - ii.yearlen) &&
									!contains(byyearday, -ii.nextyearlen + i - ii.yearlen)
								)
							)
						)
					) {
						dayset[i] = null;
						filtered = true;
					}
				}

				// Output results
				if (plb(bysetpos) && plb(timeset)) {

					var daypos, timepos, poslist = [];

					for (i, j = 0; j < bysetpos.length; j++) {
						var pos = bysetpos[j];
						if (pos < 0) {
							daypos = Math.floor(pos / timeset.length);
							timepos = pymod(pos, timeset.length);
						} else {
							daypos = Math.floor((pos - 1) / timeset.length);
							timepos = pymod((pos - 1), timeset.length);
						}

						try {
							tmp = [];
							for (k = start; k < end; k++) {
								var val = dayset[k];
								if (val === null) {
									continue;
								}
								tmp.push(val);
							}
							if (daypos < 0) {
								// we're trying to emulate python's aList[-n]
								i = tmp.slice(daypos)[0];
							} else {
								i = tmp[daypos];
							}

							var time = timeset[timepos];

							var date = dateutil.fromOrdinal(ii.yearordinal + i);
							var res = dateutil.combine(date, time);
							// XXX: can this ever be in the array?
							// - compare the actual date instead?
							if (!contains(poslist, res)) {
								poslist.push(res);
							}
						} catch (e) { }
					}

					dateutil.sort(poslist);

					for (j = 0; j < poslist.length; j++) {
						var res = poslist[j];
						if (until && res > until) {
							this._len = total;
							return iterResult.getValue();
						} else if (res >= dtstart) {
							++total;
							if (!iterResult.accept(res)) {
								return iterResult.getValue();
							}
							if (count) {
								--count;
								if (!count) {
									this._len = total;
									return iterResult.getValue();
								}
							}
						}
					}

				} else {
					for (j = start; j < end; j++) {
						i = dayset[j];
						if (i !== null) {
							var date = dateutil.fromOrdinal(ii.yearordinal + i);
							for (k = 0; k < timeset.length; k++) {
								var time = timeset[k];
								var res = dateutil.combine(date, time);
								if (until && res > until) {
									this._len = total;
									return iterResult.getValue();
								} else if (res >= dtstart) {
									++total;
									if (!iterResult.accept(res)) {
										return iterResult.getValue();
									}
									if (count) {
										--count;
										if (!count) {
											this._len = total;
											return iterResult.getValue();
										}
									}
								}
							}
						}
					}
				}

				// Handle frequency and interval
				fixday = false;
				if (freq == RRule.YEARLY) {
					year += interval;
					if (year > dateutil.MAXYEAR) {
						this._len = total;
						return iterResult.getValue();
					}
					ii.rebuild(year, month);
				} else if (freq == RRule.MONTHLY) {
					month += interval;
					if (month > 12) {
						div = Math.floor(month / 12);
						mod = pymod(month, 12);
						month = mod;
						year += div;
						if (month == 0) {
							month = 12;
							--year;
						}
						if (year > dateutil.MAXYEAR) {
							this._len = total;
							return iterResult.getValue();
						}
					}
					ii.rebuild(year, month);
				} else if (freq == RRule.WEEKLY) {
					if (wkst > weekday) {
						day += -(weekday + 1 + (6 - wkst)) + interval * 7;
					} else {
						day += -(weekday - wkst) + interval * 7;
					}
					weekday = wkst;
					fixday = true;
				} else if (freq == RRule.DAILY) {
					day += interval;
					fixday = true;
				} else if (freq == RRule.HOURLY) {
					if (filtered) {
						// Jump to one iteration before next day
						hour += Math.floor((23 - hour) / interval) * interval;
					}
					while (true) {
						hour += interval;
						dm = divmod(hour, 24);
						div = dm.div;
						mod = dm.mod;
						if (div) {
							hour = mod;
							day += div;
							fixday = true;
						}
						if (!plb(byhour) || contains(byhour, hour)) {
							break;
						}
					}
					timeset = gettimeset.call(ii, hour, minute, second);
				} else if (freq == RRule.MINUTELY) {
					if (filtered) {
						// Jump to one iteration before next day
						minute += Math.floor(
							(1439 - (hour * 60 + minute)) / interval) * interval;
					}
					while (true) {
						minute += interval;
						dm = divmod(minute, 60);
						div = dm.div;
						mod = dm.mod;
						if (div) {
							minute = mod;
							hour += div;
							dm = divmod(hour, 24);
							div = dm.div;
							mod = dm.mod;
							if (div) {
								hour = mod;
								day += div;
								fixday = true;
								filtered = false;
							}
						}
						if ((!plb(byhour) || contains(byhour, hour)) &&
							(!plb(byminute) || contains(byminute, minute))) {
							break;
						}
					}
					timeset = gettimeset.call(ii, hour, minute, second);
				} else if (freq == RRule.SECONDLY) {
					if (filtered) {
						// Jump to one iteration before next day
						second += Math.floor(
							(86399 - (hour * 3600 + minute * 60 + second))
							/ interval) * interval;
					}
					while (true) {
						second += interval;
						dm = divmod(second, 60);
						div = dm.div;
						mod = dm.mod;
						if (div) {
							second = mod;
							minute += div;
							dm = divmod(minute, 60);
							div = dm.div;
							mod = dm.mod;
							if (div) {
								minute = mod;
								hour += div;
								dm = divmod(hour, 24);
								div = dm.div;
								mod = dm.mod;
								if (div) {
									hour = mod;
									day += div;
									fixday = true;
								}
							}
						}
						if ((!plb(byhour) || contains(byhour, hour)) &&
							(!plb(byminute) || contains(byminute, minute)) &&
							(!plb(bysecond) || contains(bysecond, second))) {
							break;
						}
					}
					timeset = gettimeset.call(ii, hour, minute, second);
				}

				if (fixday && day > 28) {
					var daysinmonth = dateutil.monthRange(year, month - 1)[1];
					if (day > daysinmonth) {
						while (day > daysinmonth) {
							day -= daysinmonth;
							++month;
							if (month == 13) {
								month = 1;
								++year;
								if (year > dateutil.MAXYEAR) {
									this._len = total;
									return iterResult.getValue();
								}
							}
							daysinmonth = dateutil.monthRange(year, month - 1)[1];
						}
						ii.rebuild(year, month);
					}
				}
			}
		}

	};


	RRule.parseString = function (rfcString) {
		rfcString = rfcString.replace(/^\s+|\s+$/, '');
		if (!rfcString.length) {
			return null;
		}

		var i, j, key, value, attr,
			attrs = rfcString.split(';'),
			options = {};

		for (i = 0; i < attrs.length; i++) {
			attr = attrs[i].split('=');
			key = attr[0];
			value = attr[1];
			switch (key) {
				case 'FREQ':
					options.freq = RRule[value];
					break;
				case 'WKST':
					options.wkst = RRule[value];
					break;
				case 'COUNT':
				case 'INTERVAL':
				case 'BYSETPOS':
				case 'BYMONTH':
				case 'BYMONTHDAY':
				case 'BYYEARDAY':
				case 'BYWEEKNO':
				case 'BYHOUR':
				case 'BYMINUTE':
				case 'BYSECOND':
					if (value.indexOf(',') != -1) {
						value = value.split(',');
						for (j = 0; j < value.length; j++) {
							if (/^[+-]?\d+$/.test(value[j])) {
								value[j] = Number(value[j]);
							}
						}
					} else if (/^[+-]?\d+$/.test(value)) {
						value = Number(value);
					}
					key = key.toLowerCase();
					options[key] = value;
					break;
				case 'BYDAY': // => byweekday
					var n, wday, day, days = value.split(',');
					options.byweekday = [];
					for (j = 0; j < days.length; j++) {
						day = days[j];
						if (day.length == 2) { // MO, TU, ...
							wday = RRule[day]; // wday instanceof Weekday
							options.byweekday.push(wday);
						} else { // -1MO, +3FR, 1SO, ...
							day = day.match(/^([+-]?\d)([A-Z]{2})$/);
							n = Number(day[1]);
							wday = day[2];
							wday = RRule[wday].weekday;
							options.byweekday.push(new Weekday(wday, n));
						}
					}
					break;
				case 'DTSTART':
					options.dtstart = dateutil.untilStringToDate(value);
					break;
				case 'UNTIL':
					options.until = dateutil.untilStringToDate(value);
					break;
				case 'BYEASTER':
					options.byeaster = Number(value);
					break;
				default:
					throw new Error("Unknown RRULE property '" + key + "'");
			}
		}
		return options;
	};


	RRule.fromString = function (string) {
		return new RRule(RRule.parseString(string));
	};


	//=============================================================================
	// Iterinfo
	//=============================================================================

	var Iterinfo = function (rrule) {
		this.rrule = rrule;
		this.lastyear = null;
		this.lastmonth = null;
		this.yearlen = null;
		this.nextyearlen = null;
		this.yearordinal = null;
		this.yearweekday = null;
		this.mmask = null;
		this.mrange = null;
		this.mdaymask = null;
		this.nmdaymask = null;
		this.wdaymask = null;
		this.wnomask = null;
		this.nwdaymask = null;
		this.eastermask = null;
	};

	Iterinfo.prototype.easter = function (y, offset) {
		offset = offset || 0;

		var a = y % 19,
			b = Math.floor(y / 100),
			c = y % 100,
			d = Math.floor(b / 4),
			e = b % 4,
			f = Math.floor((b + 8) / 25),
			g = Math.floor((b - f + 1) / 3),
			h = Math.floor(19 * a + b - d - g + 15) % 30,
			i = Math.floor(c / 4),
			k = c % 4,
			l = Math.floor(32 + 2 * e + 2 * i - h - k) % 7,
			m = Math.floor((a + 11 * h + 22 * l) / 451),
			month = Math.floor((h + l - 7 * m + 114) / 31),
			day = (h + l - 7 * m + 114) % 31 + 1,
			date = Date.UTC(y, month - 1, day + offset),
			yearStart = Date.UTC(y, 0, 1);

		return [Math.ceil((date - yearStart) / (1000 * 60 * 60 * 24))];
	}

	Iterinfo.prototype.rebuild = function (year, month) {

		var rr = this.rrule;

		if (year != this.lastyear) {

			this.yearlen = dateutil.isLeapYear(year) ? 366 : 365;
			this.nextyearlen = dateutil.isLeapYear(year + 1) ? 366 : 365;
			var firstyday = new Date(year, 0, 1);

			this.yearordinal = dateutil.toOrdinal(firstyday);
			this.yearweekday = dateutil.getWeekday(firstyday);

			var wday = dateutil.getWeekday(new Date(year, 0, 1));

			if (this.yearlen == 365) {
				this.mmask = [].concat(M365MASK);
				this.mdaymask = [].concat(MDAY365MASK);
				this.nmdaymask = [].concat(NMDAY365MASK);
				this.wdaymask = WDAYMASK.slice(wday);
				this.mrange = [].concat(M365RANGE);
			} else {
				this.mmask = [].concat(M366MASK);
				this.mdaymask = [].concat(MDAY366MASK);
				this.nmdaymask = [].concat(NMDAY366MASK);
				this.wdaymask = WDAYMASK.slice(wday);
				this.mrange = [].concat(M366RANGE);
			}

			if (!plb(rr.options.byweekno)) {
				this.wnomask = null;
			} else {
				this.wnomask = repeat(0, this.yearlen + 7);
				var no1wkst, firstwkst, wyearlen;
				no1wkst = firstwkst = pymod(
					7 - this.yearweekday + rr.options.wkst, 7);
				if (no1wkst >= 4) {
					no1wkst = 0;
					// Number of days in the year, plus the days we got
					// from last year.
					wyearlen = this.yearlen + pymod(
						this.yearweekday - rr.options.wkst, 7);
				} else {
					// Number of days in the year, minus the days we
					// left in last year.
					wyearlen = this.yearlen - no1wkst;
				}
				var div = Math.floor(wyearlen / 7);
				var mod = pymod(wyearlen, 7);
				var numweeks = Math.floor(div + (mod / 4));
				for (var n, i, j = 0; j < rr.options.byweekno.length; j++) {
					n = rr.options.byweekno[j];
					if (n < 0) {
						n += numweeks + 1;
					} if (!(0 < n && n <= numweeks)) {
						continue;
					} if (n > 1) {
						i = no1wkst + (n - 1) * 7;
						if (no1wkst != firstwkst) {
							i -= 7 - firstwkst;
						}
					} else {
						i = no1wkst;
					}
					for (var k = 0; k < 7; k++) {
						this.wnomask[i] = 1;
						i++;
						if (this.wdaymask[i] == rr.options.wkst) {
							break;
						}
					}
				}

				if (contains(rr.options.byweekno, 1)) {
					// Check week number 1 of next year as well
					// orig-TODO : Check -numweeks for next year.
					var i = no1wkst + numweeks * 7;
					if (no1wkst != firstwkst) {
						i -= 7 - firstwkst;
					}
					if (i < this.yearlen) {
						// If week starts in next year, we
						// don't care about it.
						for (var j = 0; j < 7; j++) {
							this.wnomask[i] = 1;
							i += 1;
							if (this.wdaymask[i] == rr.options.wkst) {
								break;
							}
						}
					}
				}

				if (no1wkst) {
					// Check last week number of last year as
					// well. If no1wkst is 0, either the year
					// started on week start, or week number 1
					// got days from last year, so there are no
					// days from last year's last week number in
					// this year.
					var lnumweeks;
					if (!contains(rr.options.byweekno, -1)) {
						var lyearweekday = dateutil.getWeekday(
							new Date(year - 1, 0, 1));
						var lno1wkst = pymod(
							7 - lyearweekday + rr.options.wkst, 7);
						var lyearlen = dateutil.isLeapYear(year - 1) ? 366 : 365;
						if (lno1wkst >= 4) {
							lno1wkst = 0;
							lnumweeks = Math.floor(
								52
								+ pymod(
									lyearlen + pymod(
										lyearweekday - rr.options.wkst, 7), 7)
								/ 4);
						} else {
							lnumweeks = Math.floor(
								52 + pymod(this.yearlen - no1wkst, 7) / 4);
						}
					} else {
						lnumweeks = -1;
					}
					if (contains(rr.options.byweekno, lnumweeks)) {
						for (var i = 0; i < no1wkst; i++) {
							this.wnomask[i] = 1;
						}
					}
				}
			}
		}

		if (plb(rr.options.bynweekday)
			&& (month != this.lastmonth || year != this.lastyear)) {
			var ranges = [];
			if (rr.options.freq == RRule.YEARLY) {
				if (plb(rr.options.bymonth)) {
					for (j = 0; j < rr.options.bymonth.length; j++) {
						month = rr.options.bymonth[j];
						ranges.push(this.mrange.slice(month - 1, month + 1));
					}
				} else {
					ranges = [[0, this.yearlen]];
				}
			} else if (rr.options.freq == RRule.MONTHLY) {
				ranges = [this.mrange.slice(month - 1, month + 1)];
			}
			if (plb(ranges)) {
				// Weekly frequency won't get here, so we may not
				// care about cross-year weekly periods.
				this.nwdaymask = repeat(0, this.yearlen);

				for (var j = 0; j < ranges.length; j++) {
					var rang = ranges[j];
					var first = rang[0], last = rang[1];
					last -= 1;
					for (var k = 0; k < rr.options.bynweekday.length; k++) {
						var wday = rr.options.bynweekday[k][0],
							n = rr.options.bynweekday[k][1];
						if (n < 0) {
							i = last + (n + 1) * 7;
							i -= pymod(this.wdaymask[i] - wday, 7);
						} else {
							i = first + (n - 1) * 7;
							i += pymod(7 - this.wdaymask[i] + wday, 7);
						}
						if (first <= i && i <= last) {
							this.nwdaymask[i] = 1;
						}
					}
				}

			}

			this.lastyear = year;
			this.lastmonth = month;
		}

		if (rr.options.byeaster !== null) {
			this.eastermask = this.easter(year, rr.options.byeaster);
		}
	};

	Iterinfo.prototype.ydayset = function (year, month, day) {
		return [range(this.yearlen), 0, this.yearlen];
	};

	Iterinfo.prototype.mdayset = function (year, month, day) {
		var set = repeat(null, this.yearlen);
		var start = this.mrange[month - 1];
		var end = this.mrange[month];
		for (var i = start; i < end; i++) {
			set[i] = i;
		}
		return [set, start, end];
	};

	Iterinfo.prototype.wdayset = function (year, month, day) {

		// We need to handle cross-year weeks here.
		var set = repeat(null, this.yearlen + 7);
		var i = dateutil.toOrdinal(
			new Date(year, month - 1, day)) - this.yearordinal;
		var start = i;
		for (var j = 0; j < 7; j++) {
			set[i] = i;
			++i;
			if (this.wdaymask[i] == this.rrule.options.wkst) {
				break;
			}
		}
		return [set, start, i];
	};

	Iterinfo.prototype.ddayset = function (year, month, day) {
		var set = repeat(null, this.yearlen);
		var i = dateutil.toOrdinal(
			new Date(year, month - 1, day)) - this.yearordinal;
		set[i] = i;
		return [set, i, i + 1];
	};

	Iterinfo.prototype.htimeset = function (hour, minute, second) {
		var set = [], rr = this.rrule;
		for (var i = 0; i < rr.options.byminute.length; i++) {
			minute = rr.options.byminute[i];
			for (var j = 0; j < rr.options.bysecond.length; j++) {
				second = rr.options.bysecond[j];
				set.push(new dateutil.Time(hour, minute, second));
			}
		}
		dateutil.sort(set);
		return set;
	};

	Iterinfo.prototype.mtimeset = function (hour, minute, second) {
		var set = [], rr = this.rrule;
		for (var j = 0; j < rr.options.bysecond.length; j++) {
			second = rr.options.bysecond[j];
			set.push(new dateutil.Time(hour, minute, second));
		}
		dateutil.sort(set);
		return set;
	};

	Iterinfo.prototype.stimeset = function (hour, minute, second) {
		return [new dateutil.Time(hour, minute, second)];
	};


	//=============================================================================
	// Results
	//=============================================================================

	/**
	 * This class helps us to emulate python's generators, sorta.
	 */
	var IterResult = function (method, args) {
		this.init(method, args)
	};

	IterResult.prototype = {

		init: function (method, args) {
			this.method = method;
			this.args = args;

			this._result = [];

			this.minDate = null;
			this.maxDate = null;

			if (method == 'between') {
				this.maxDate = args.inc
					? args.before
					: new Date(args.before.getTime() - 1);
				this.minDate = args.inc
					? args.after
					: new Date(args.after.getTime() + 1);
			} else if (method == 'before') {
				this.maxDate = args.inc ? args.dt : new Date(args.dt.getTime() - 1);
			} else if (method == 'after') {
				this.minDate = args.inc ? args.dt : new Date(args.dt.getTime() + 1);
			}
		},

		/**
		 * Possibly adds a date into the result.
		 *
		 * @param {Date} date - the date isn't necessarly added to the result
		 *                      list (if it is too late/too early)
		 * @return {Boolean} true if it makes sense to continue the iteration;
		 *                   false if we're done.
		 */
		accept: function (date) {
			var tooEarly = this.minDate && date < this.minDate,
				tooLate = this.maxDate && date > this.maxDate;

			if (this.method == 'between') {
				if (tooEarly)
					return true;
				if (tooLate)
					return false;
			} else if (this.method == 'before') {
				if (tooLate)
					return false;
			} else if (this.method == 'after') {
				if (tooEarly)
					return true;
				this.add(date);
				return false;
			}

			return this.add(date);

		},

		/**
		 *
		 * @param {Date} date that is part of the result.
		 * @return {Boolean} whether we are interested in more values.
		 */
		add: function (date) {
			this._result.push(date);
			return true;
		},

		/**
		 * 'before' and 'after' return only one date, whereas 'all'
		 * and 'between' an array.
		 * @return {Date,Array?}
		 */
		getValue: function () {
			switch (this.method) {
				case 'all':
				case 'between':
					return this._result;
				case 'before':
				case 'after':
					return this._result.length
						? this._result[this._result.length - 1]
						: null;
			}
		}

	};


	/**
	 * IterResult subclass that calls a callback function on each add,
	 * and stops iterating when the callback returns false.
	 */
	var CallbackIterResult = function (method, args, iterator) {
		var allowedMethods = ['all', 'between'];
		if (!contains(allowedMethods, method)) {
			throw new Error('Invalid method "' + method
				+ '". Only all and between works with iterator.');
		}
		this.add = function (date) {
			if (iterator(date, this._result.length)) {
				this._result.push(date);
				return true;
			}
			return false;

		};

		this.init(method, args);

	};
	CallbackIterResult.prototype = IterResult.prototype;


	//=============================================================================
	// Export
	//=============================================================================

	if (serverSide) {
		module.exports = {
			RRule: RRule
			// rruleset: rruleset
		}
	}
	if (typeof ender === 'undefined') {
		root['RRule'] = RRule;
		// root['rruleset'] = rruleset;
	}

	if (typeof define === "function" && define.amd) {
		/*global define:false */
		define("rrule", [], function () {
			return RRule;
		});
	}

}(this));
(function () {
	function t(t) { return t.toLowerCase().replace(/-(.)/g, function (t, e) { return e.toUpperCase() }) } function e(t) { return 4 == t.length ? ["#", t.substring(1, 2), t.substring(1, 2), t.substring(2, 3), t.substring(2, 3), t.substring(3, 4), t.substring(3, 4)].join("") : t } function i(t) { var e = t.toString(16); return 1 == e.length ? "0" + e : e } function n(t, e, i) { return (null == e || null == i) && (null == i ? i = t.height / t.width * e : null == e && (e = t.width / t.height * i)), { width: e, height: i } } function r(t, e) { return "number" == typeof t.from ? t.from + (t.to - t.from) * e : t instanceof u.Color || t instanceof u.Number ? t.at(e) : 1 > e ? t.from : t.to } function s(t) { for (var e = 0, i = t.length, n = ""; i > e; e++) n += t[e][0], null != t[e][1] && (n += t[e][1], null != t[e][2] && (n += " ", n += t[e][2], null != t[e][3] && (n += " ", n += t[e][3], n += " ", n += t[e][4], null != t[e][5] && (n += " ", n += t[e][5], n += " ", n += t[e][6], null != t[e][7] && (n += " ", n += t[e][7]))))); return n + " " } function h(t) { t.x2 = t.x + t.width, t.y2 = t.y + t.height, t.cx = t.x + t.width / 2, t.cy = t.y + t.height / 2 } function o(t) { if (t.matrix) { var e = t.matrix.replace(/\s/g, "").split(","); 6 == e.length && (t.a = parseFloat(e[0]), t.b = parseFloat(e[1]), t.c = parseFloat(e[2]), t.d = parseFloat(e[3]), t.e = parseFloat(e[4]), t.f = parseFloat(e[5])) } return t } function a(t) { var e = t.toString().match(u.regex.reference); return e ? e[1] : void 0 } var u = this.SVG = function (t) { return u.supported ? (t = new u.Doc(t), u.parser || u.prepare(t), t) : void 0 }; if (u.ns = "http://www.w3.org/2000/svg", u.xmlns = "http://www.w3.org/2000/xmlns/", u.xlink = "http://www.w3.org/1999/xlink", u.did = 1e3, u.eid = function (t) { return "Svgjs" + t.charAt(0).toUpperCase() + t.slice(1) + u.did++ }, u.create = function (t) { var e = document.createElementNS(this.ns, t); return e.setAttribute("id", this.eid(t)), e }, u.extend = function () { var t, e, i, n; for (t = [].slice.call(arguments), e = t.pop(), n = t.length - 1; n >= 0; n--) if (t[n]) for (i in e) t[n].prototype[i] = e[i]; u.Set && u.Set.inherit && u.Set.inherit() }, u.prepare = function (t) { var e = document.getElementsByTagName("body")[0], i = (e ? new u.Doc(e) : t.nested()).size(2, 0), n = u.create("path"); i.node.appendChild(n), u.parser = { body: e || t.parent, draw: i.style("opacity:0;position:fixed;left:100%;top:100%;overflow:hidden"), poly: i.polyline().node, path: n } }, u.supported = function () { return !!document.createElementNS && !!document.createElementNS(u.ns, "svg").createSVGRect }(), !u.supported) return !1; u.get = function (t) { var e = document.getElementById(a(t) || t); return e ? e.instance : void 0 }, u.invent = function (t) { var e = "function" == typeof t.create ? t.create : function () { this.constructor.call(this, u.create(t.create)) }; return t.inherit && (e.prototype = new t.inherit), t.extend && u.extend(e, t.extend), t.construct && u.extend(t.parent || u.Container, t.construct), e }, u.regex = { unit: /^(-?[\d\.]+)([a-z%]{0,2})$/, hex: /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i, rgb: /rgb\((\d+),(\d+),(\d+)\)/, reference: /#([a-z0-9\-_]+)/i, isHex: /^#[a-f0-9]{3,6}$/i, isRgb: /^rgb\(/, isCss: /[^:]+:[^;]+;?/, isBlank: /^(\s+)?$/, isNumber: /^-?[\d\.]+$/, isPercent: /^-?[\d\.]+%$/, isImage: /\.(jpg|jpeg|png|gif)(\?[^=]+.*)?/i, isEvent: /^[\w]+:[\w]+$/ }, u.defaults = { matrix: "1 0 0 1 0 0", attrs: { "fill-opacity": 1, "stroke-opacity": 1, "stroke-width": 0, "stroke-linejoin": "miter", "stroke-linecap": "butt", fill: "#000000", stroke: "#000000", opacity: 1, x: 0, y: 0, cx: 0, cy: 0, width: 0, height: 0, r: 0, rx: 0, ry: 0, offset: 0, "stop-opacity": 1, "stop-color": "#000000", "font-size": 16, "font-family": "Helvetica, Arial, sans-serif", "text-anchor": "start" }, trans: function () { return { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0, matrix: this.matrix, a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } } }, u.Color = function (t) { var i; this.r = 0, this.g = 0, this.b = 0, "string" == typeof t ? u.regex.isRgb.test(t) ? (i = u.regex.rgb.exec(t.replace(/\s/g, "")), this.r = parseInt(i[1]), this.g = parseInt(i[2]), this.b = parseInt(i[3])) : u.regex.isHex.test(t) && (i = u.regex.hex.exec(e(t)), this.r = parseInt(i[1], 16), this.g = parseInt(i[2], 16), this.b = parseInt(i[3], 16)) : "object" == typeof t && (this.r = t.r, this.g = t.g, this.b = t.b) }, u.extend(u.Color, { toString: function () { return this.toHex() }, toHex: function () { return "#" + i(this.r) + i(this.g) + i(this.b) }, toRgb: function () { return "rgb(" + [this.r, this.g, this.b].join() + ")" }, brightness: function () { return this.r / 255 * .3 + this.g / 255 * .59 + this.b / 255 * .11 }, morph: function (t) { return this.destination = new u.Color(t), this }, at: function (t) { return this.destination ? (t = 0 > t ? 0 : t > 1 ? 1 : t, new u.Color({ r: ~~(this.r + (this.destination.r - this.r) * t), g: ~~(this.g + (this.destination.g - this.g) * t), b: ~~(this.b + (this.destination.b - this.b) * t) })) : this } }), u.Color.test = function (t) { return t += "", u.regex.isHex.test(t) || u.regex.isRgb.test(t) }, u.Color.isRgb = function (t) { return t && "number" == typeof t.r && "number" == typeof t.g && "number" == typeof t.b }, u.Color.isColor = function (t) { return u.Color.isRgb(t) || u.Color.test(t) }, u.Array = function (t, e) { t = (t || []).valueOf(), 0 == t.length && e && (t = e.valueOf()), this.value = this.parse(t) }, u.extend(u.Array, { morph: function (t) { if (this.destination = this.parse(t), this.value.length != this.destination.length) { for (var e = this.value[this.value.length - 1], i = this.destination[this.destination.length - 1]; this.value.length > this.destination.length;) this.destination.push(i); for (; this.value.length < this.destination.length;) this.value.push(e) } return this }, settle: function () { for (var t = 0, e = this.value.length, i = []; e > t; t++) -1 == i.indexOf(this.value[t]) && i.push(this.value[t]); return this.value = i }, at: function (t) { if (!this.destination) return this; for (var e = 0, i = this.value.length, n = []; i > e; e++) n.push(this.value[e] + (this.destination[e] - this.value[e]) * t); return new u.Array(n) }, toString: function () { return this.value.join(" ") }, valueOf: function () { return this.value }, parse: function (t) { return t = t.valueOf(), Array.isArray(t) ? t : this.split(t) }, split: function (t) { return t.replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "").split(" ") }, reverse: function () { return this.value.reverse(), this } }), u.PointArray = function () { this.constructor.apply(this, arguments) }, u.PointArray.prototype = new u.Array, u.extend(u.PointArray, { toString: function () { for (var t = 0, e = this.value.length, i = []; e > t; t++) i.push(this.value[t].join(",")); return i.join(" ") }, at: function (t) { if (!this.destination) return this; for (var e = 0, i = this.value.length, n = []; i > e; e++) n.push([this.value[e][0] + (this.destination[e][0] - this.value[e][0]) * t, this.value[e][1] + (this.destination[e][1] - this.value[e][1]) * t]); return new u.PointArray(n) }, parse: function (t) { if (t = t.valueOf(), Array.isArray(t)) return t; t = this.split(t); for (var e, i = 0, n = t.length, r = []; n > i; i++) e = t[i].split(","), r.push([parseFloat(e[0]), parseFloat(e[1])]); return r }, move: function (t, e) { var i = this.bbox(); if (t -= i.x, e -= i.y, !isNaN(t) && !isNaN(e)) for (var n = this.value.length - 1; n >= 0; n--) this.value[n] = [this.value[n][0] + t, this.value[n][1] + e]; return this }, size: function (t, e) { var i, n = this.bbox(); for (i = this.value.length - 1; i >= 0; i--) this.value[i][0] = (this.value[i][0] - n.x) * t / n.width + n.x, this.value[i][1] = (this.value[i][1] - n.y) * e / n.height + n.y; return this }, bbox: function () { return u.parser.poly.setAttribute("points", this.toString()), u.parser.poly.getBBox() } }), u.PathArray = function (t, e) { this.constructor.call(this, t, e) }, u.PathArray.prototype = new u.Array, u.extend(u.PathArray, { toString: function () { return s(this.value) }, move: function (t, e) { var i = this.bbox(); if (t -= i.x, e -= i.y, !isNaN(t) && !isNaN(e)) for (var n, r = this.value.length - 1; r >= 0; r--) n = this.value[r][0], "M" == n || "L" == n || "T" == n ? (this.value[r][1] += t, this.value[r][2] += e) : "H" == n ? this.value[r][1] += t : "V" == n ? this.value[r][1] += e : "C" == n || "S" == n || "Q" == n ? (this.value[r][1] += t, this.value[r][2] += e, this.value[r][3] += t, this.value[r][4] += e, "C" == n && (this.value[r][5] += t, this.value[r][6] += e)) : "A" == n && (this.value[r][6] += t, this.value[r][7] += e); return this }, size: function (t, e) { var i, n, r = this.bbox(); for (i = this.value.length - 1; i >= 0; i--) n = this.value[i][0], "M" == n || "L" == n || "T" == n ? (this.value[i][1] = (this.value[i][1] - r.x) * t / r.width + r.x, this.value[i][2] = (this.value[i][2] - r.y) * e / r.height + r.y) : "H" == n ? this.value[i][1] = (this.value[i][1] - r.x) * t / r.width + r.x : "V" == n ? this.value[i][1] = (this.value[i][1] - r.y) * e / r.height + r.y : "C" == n || "S" == n || "Q" == n ? (this.value[i][1] = (this.value[i][1] - r.x) * t / r.width + r.x, this.value[i][2] = (this.value[i][2] - r.y) * e / r.height + r.y, this.value[i][3] = (this.value[i][3] - r.x) * t / r.width + r.x, this.value[i][4] = (this.value[i][4] - r.y) * e / r.height + r.y, "C" == n && (this.value[i][5] = (this.value[i][5] - r.x) * t / r.width + r.x, this.value[i][6] = (this.value[i][6] - r.y) * e / r.height + r.y)) : "A" == n && (this.value[i][1] = this.value[i][1] * t / r.width, this.value[i][2] = this.value[i][2] * e / r.height, this.value[i][6] = (this.value[i][6] - r.x) * t / r.width + r.x, this.value[i][7] = (this.value[i][7] - r.y) * e / r.height + r.y); return this }, parse: function (t) { if (t instanceof u.PathArray) return t.valueOf(); var e, i, n, r, h, o, a, l, c, f, d, p = 0, x = 0; for (u.parser.path.setAttribute("d", "string" == typeof t ? t : s(t)), d = u.parser.path.pathSegList, e = 0, i = d.numberOfItems; i > e; ++e) f = d.getItem(e), c = f.pathSegTypeAsLetter, "M" == c || "L" == c || "H" == c || "V" == c || "C" == c || "S" == c || "Q" == c || "T" == c || "A" == c ? ("x" in f && (p = f.x), "y" in f && (x = f.y)) : ("x1" in f && (h = p + f.x1), "x2" in f && (a = p + f.x2), "y1" in f && (o = x + f.y1), "y2" in f && (l = x + f.y2), "x" in f && (p += f.x), "y" in f && (x += f.y), "m" == c ? d.replaceItem(u.parser.path.createSVGPathSegMovetoAbs(p, x), e) : "l" == c ? d.replaceItem(u.parser.path.createSVGPathSegLinetoAbs(p, x), e) : "h" == c ? d.replaceItem(u.parser.path.createSVGPathSegLinetoHorizontalAbs(p), e) : "v" == c ? d.replaceItem(u.parser.path.createSVGPathSegLinetoVerticalAbs(x), e) : "c" == c ? d.replaceItem(u.parser.path.createSVGPathSegCurvetoCubicAbs(p, x, h, o, a, l), e) : "s" == c ? d.replaceItem(u.parser.path.createSVGPathSegCurvetoCubicSmoothAbs(p, x, a, l), e) : "q" == c ? d.replaceItem(u.parser.path.createSVGPathSegCurvetoQuadraticAbs(p, x, h, o), e) : "t" == c ? d.replaceItem(u.parser.path.createSVGPathSegCurvetoQuadraticSmoothAbs(p, x), e) : "a" == c ? d.replaceItem(u.parser.path.createSVGPathSegArcAbs(p, x, f.r1, f.r2, f.angle, f.largeArcFlag, f.sweepFlag), e) : ("z" == c || "Z" == c) && (p = n, x = r)), ("M" == c || "m" == c) && (n = p, r = x); for (t = [], d = u.parser.path.pathSegList, e = 0, i = d.numberOfItems; i > e; ++e) f = d.getItem(e), c = f.pathSegTypeAsLetter, p = [c], "M" == c || "L" == c || "T" == c ? p.push(f.x, f.y) : "H" == c ? p.push(f.x) : "V" == c ? p.push(f.y) : "C" == c ? p.push(f.x1, f.y1, f.x2, f.y2, f.x, f.y) : "S" == c ? p.push(f.x2, f.y2, f.x, f.y) : "Q" == c ? p.push(f.x1, f.y1, f.x, f.y) : "A" == c && p.push(f.r1, f.r2, f.angle, 0 | f.largeArcFlag, 0 | f.sweepFlag, f.x, f.y), t.push(p); return t }, bbox: function () { return u.parser.path.setAttribute("d", this.toString()), u.parser.path.getBBox() } }), u.Number = function (t) { if (this.value = 0, this.unit = "", "number" == typeof t) this.value = isNaN(t) ? 0 : isFinite(t) ? t : 0 > t ? -3.4e38 : 3.4e38; else if ("string" == typeof t) { var e = t.match(u.regex.unit); e && (this.value = parseFloat(e[1]), "%" == e[2] ? this.value /= 100 : "s" == e[2] && (this.value *= 1e3), this.unit = e[2]) } else t instanceof u.Number && (this.value = t.value, this.unit = t.unit) }, u.extend(u.Number, { toString: function () { return ("%" == this.unit ? ~~(1e8 * this.value) / 1e6 : "s" == this.unit ? this.value / 1e3 : this.value) + this.unit }, valueOf: function () { return this.value }, plus: function (t) { return this.value = this + new u.Number(t), this }, minus: function (t) { return this.plus(-new u.Number(t)) }, times: function (t) { return this.value = this * new u.Number(t), this }, divide: function (t) { return this.value = this / new u.Number(t), this }, to: function (t) { return "string" == typeof t && (this.unit = t), this }, morph: function (t) { return this.destination = new u.Number(t), this }, at: function (t) { return this.destination ? new u.Number(this.destination).minus(this).times(t).plus(this) : this } }), u.ViewBox = function (t) { var e, i, n, r, s = 1, h = 1, o = t.bbox(), a = (t.attr("viewBox") || "").match(/-?[\d\.]+/g), l = t, c = t; for (n = new u.Number(t.width()), r = new u.Number(t.height()) ; "%" == n.unit;) s *= n.value, n = new u.Number(l instanceof u.Doc ? l.parent.offsetWidth : l.parent.width()), l = l.parent; for (; "%" == r.unit;) h *= r.value, r = new u.Number(c instanceof u.Doc ? c.parent.offsetHeight : c.parent.height()), c = c.parent; this.x = o.x, this.y = o.y, this.width = n * s, this.height = r * h, this.zoom = 1, a && (e = parseFloat(a[0]), i = parseFloat(a[1]), n = parseFloat(a[2]), r = parseFloat(a[3]), this.zoom = this.width / this.height > n / r ? this.height / r : this.width / n, this.x = e, this.y = i, this.width = n, this.height = r) }, u.extend(u.ViewBox, { toString: function () { return this.x + " " + this.y + " " + this.width + " " + this.height } }), u.BBox = function (t) { var e; if (this.x = 0, this.y = 0, this.width = 0, this.height = 0, t) { try { e = t.node.getBBox() } catch (i) { e = { x: t.node.clientLeft, y: t.node.clientTop, width: t.node.clientWidth, height: t.node.clientHeight } } this.x = e.x + t.trans.x, this.y = e.y + t.trans.y, this.width = e.width * t.trans.scaleX, this.height = e.height * t.trans.scaleY } h(this) }, u.extend(u.BBox, { merge: function (t) { var e = new u.BBox; return e.x = Math.min(this.x, t.x), e.y = Math.min(this.y, t.y), e.width = Math.max(this.x + this.width, t.x + t.width) - e.x, e.height = Math.max(this.y + this.height, t.y + t.height) - e.y, h(e), e } }), u.RBox = function (t) { var e, i, n = {}; if (this.x = 0, this.y = 0, this.width = 0, this.height = 0, t) { for (e = t.doc().parent, i = t.doc().viewbox().zoom, n = t.node.getBoundingClientRect(), this.x = n.left, this.y = n.top, this.x -= e.offsetLeft, this.y -= e.offsetTop; e = e.offsetParent;) this.x -= e.offsetLeft, this.y -= e.offsetTop; for (e = t; e = e.parent;) "svg" == e.type && e.viewbox && (i *= e.viewbox().zoom, this.x -= e.x() || 0, this.y -= e.y() || 0) } this.x /= i, this.y /= i, this.width = n.width /= i, this.height = n.height /= i, this.x += window.scrollX, this.y += window.scrollY, h(this) }, u.extend(u.RBox, { merge: function (t) { var e = new u.RBox; return e.x = Math.min(this.x, t.x), e.y = Math.min(this.y, t.y), e.width = Math.max(this.x + this.width, t.x + t.width) - e.x, e.height = Math.max(this.y + this.height, t.y + t.height) - e.y, h(e), e } }), u.Element = u.invent({ create: function (t) { this._stroke = u.defaults.attrs.stroke, this.trans = u.defaults.trans(), (this.node = t) && (this.type = t.nodeName, this.node.instance = this) }, extend: { x: function (t) { return null != t && (t = new u.Number(t), t.value /= this.trans.scaleX), this.attr("x", t) }, y: function (t) { return null != t && (t = new u.Number(t), t.value /= this.trans.scaleY), this.attr("y", t) }, cx: function (t) { return null == t ? this.x() + this.width() / 2 : this.x(t - this.width() / 2) }, cy: function (t) { return null == t ? this.y() + this.height() / 2 : this.y(t - this.height() / 2) }, move: function (t, e) { return this.x(t).y(e) }, center: function (t, e) { return this.cx(t).cy(e) }, width: function (t) { return this.attr("width", t) }, height: function (t) { return this.attr("height", t) }, size: function (t, e) { var i = n(this.bbox(), t, e); return this.width(new u.Number(i.width)).height(new u.Number(i.height)) }, clone: function () { var t, e, i = this.type; return t = "rect" == i || "ellipse" == i ? this.parent[i](0, 0) : "line" == i ? this.parent[i](0, 0, 0, 0) : "image" == i ? this.parent[i](this.src) : "text" == i ? this.parent[i](this.content) : "path" == i ? this.parent[i](this.attr("d")) : "polyline" == i || "polygon" == i ? this.parent[i](this.attr("points")) : "g" == i ? this.parent.group() : this.parent[i](), e = this.attr(), delete e.id, t.attr(e), t.trans = this.trans, t.transform({}) }, remove: function () { return this.parent && this.parent.removeElement(this), this }, replace: function (t) { return this.after(t).remove(), t }, addTo: function (t) { return t.put(this) }, putIn: function (t) { return t.add(this) }, doc: function (t) { return this._parent(t || u.Doc) }, attr: function (t, e, i) { if (null == t) { for (t = {}, e = this.node.attributes, i = e.length - 1; i >= 0; i--) t[e[i].nodeName] = u.regex.isNumber.test(e[i].nodeValue) ? parseFloat(e[i].nodeValue) : e[i].nodeValue; return t } if ("object" == typeof t) for (e in t) this.attr(e, t[e]); else if (null === e) this.node.removeAttribute(t); else { if (null == e) return e = this.node.getAttribute(t), null == e ? u.defaults.attrs[t] : u.regex.isNumber.test(e) ? parseFloat(e) : e; if ("style" == t) return this.style(e); "stroke-width" == t ? this.attr("stroke", parseFloat(e) > 0 ? this._stroke : null) : "stroke" == t && (this._stroke = e), ("fill" == t || "stroke" == t) && (u.regex.isImage.test(e) && (e = this.doc().defs().image(e, 0, 0)), e instanceof u.Image && (e = this.doc().defs().pattern(0, 0, function () { this.add(e) }))), "number" == typeof e ? e = new u.Number(e) : u.Color.isColor(e) ? e = new u.Color(e) : Array.isArray(e) && (e = new u.Array(e)), "leading" == t ? this.leading && this.leading(e) : "string" == typeof i ? this.node.setAttributeNS(i, t, e.toString()) : this.node.setAttribute(t, e.toString()), !this.rebuild || "font-size" != t && "x" != t || this.rebuild(t, e) } return this }, transform: function (t, e) { if (0 == arguments.length) return this.trans; if ("string" == typeof t) { if (arguments.length < 2) return this.trans[t]; var i = {}; return i[t] = e, this.transform(i) } var i = []; t = o(t); for (e in t) null != t[e] && (this.trans[e] = t[e]); return this.trans.matrix = this.trans.a + " " + this.trans.b + " " + this.trans.c + " " + this.trans.d + " " + this.trans.e + " " + this.trans.f, t = this.trans, t.matrix != u.defaults.matrix && i.push("matrix(" + t.matrix + ")"), 0 != t.rotation && i.push("rotate(" + t.rotation + " " + (null == t.cx ? this.bbox().cx : t.cx) + " " + (null == t.cy ? this.bbox().cy : t.cy) + ")"), (1 != t.scaleX || 1 != t.scaleY) && i.push("scale(" + t.scaleX + " " + t.scaleY + ")"), 0 != t.skewX && i.push("skewX(" + t.skewX + ")"), 0 != t.skewY && i.push("skewY(" + t.skewY + ")"), (0 != t.x || 0 != t.y) && i.push("translate(" + new u.Number(t.x / t.scaleX) + " " + new u.Number(t.y / t.scaleY) + ")"), 0 == i.length ? this.node.removeAttribute("transform") : this.node.setAttribute("transform", i.join(" ")), this }, style: function (e, i) { if (0 == arguments.length) return this.node.style.cssText || ""; if (arguments.length < 2) if ("object" == typeof e) for (i in e) this.style(i, e[i]); else { if (!u.regex.isCss.test(e)) return this.node.style[t(e)]; e = e.split(";"); for (var n = 0; n < e.length; n++) i = e[n].split(":"), this.style(i[0].replace(/\s+/g, ""), i[1]) } else this.node.style[t(e)] = null === i || u.regex.isBlank.test(i) ? "" : i; return this }, id: function (t) { return this.attr("id", t) }, bbox: function () { return new u.BBox(this) }, rbox: function () { return new u.RBox(this) }, inside: function (t, e) { var i = this.bbox(); return t > i.x && e > i.y && t < i.x + i.width && e < i.y + i.height }, show: function () { return this.style("display", "") }, hide: function () { return this.style("display", "none") }, visible: function () { return "none" != this.style("display") }, toString: function () { return this.attr("id") }, classes: function () { var t = this.node.getAttribute("class"); return null === t ? [] : t.trim().split(/\s+/) }, hasClass: function (t) { return -1 != this.classes().indexOf(t) }, addClass: function (t) { var e; return this.hasClass(t) || (e = this.classes(), e.push(t), this.node.setAttribute("class", e.join(" "))), this }, removeClass: function (t) { var e; return this.hasClass(t) && (e = this.classes().filter(function (e) { return e != t }), this.node.setAttribute("class", e.join(" "))), this }, toggleClass: function (t) { return this.hasClass(t) ? this.removeClass(t) : this.addClass(t), this }, reference: function (t) { return u.get(this.attr(t)) }, _parent: function (t) { for (var e = this; null != e && !(e instanceof t) ;) e = e.parent; return e } } }), u.Parent = u.invent({ create: function (t) { this.constructor.call(this, t) }, inherit: u.Element, extend: { children: function () { return this._children || (this._children = []) }, add: function (t, e) { return this.has(t) || (e = null == e ? this.children().length : e, t.parent && t.parent.children().splice(t.parent.index(t), 1), this.children().splice(e, 0, t), this.node.insertBefore(t.node, this.node.childNodes[e] || null), t.parent = this), this._defs && (this.node.removeChild(this._defs.node), this.node.appendChild(this._defs.node)), this }, put: function (t, e) { return this.add(t, e), t }, has: function (t) { return this.index(t) >= 0 }, index: function (t) { return this.children().indexOf(t) }, get: function (t) { return this.children()[t] }, first: function () { return this.children()[0] }, last: function () { return this.children()[this.children().length - 1] }, each: function (t, e) { var i, n, r = this.children(); for (i = 0, n = r.length; n > i; i++) r[i] instanceof u.Element && t.apply(r[i], [i, r]), e && r[i] instanceof u.Container && r[i].each(t, e); return this }, removeElement: function (t) { return this.children().splice(this.index(t), 1), this.node.removeChild(t.node), t.parent = null, this }, clear: function () { for (var t = this.children().length - 1; t >= 0; t--) this.removeElement(this.children()[t]); return this._defs && this._defs.clear(), this }, defs: function () { return this.doc().defs() } } }), u.Container = u.invent({ create: function (t) { this.constructor.call(this, t) }, inherit: u.Parent, extend: { viewbox: function (t) { return 0 == arguments.length ? new u.ViewBox(this) : (t = 1 == arguments.length ? [t.x, t.y, t.width, t.height] : [].slice.call(arguments), this.attr("viewBox", t)) } } }), u.FX = u.invent({ create: function (t) { this.target = t }, extend: { animate: function (t, e, i) { var n, s, h, o, a = this.target, l = this; return "object" == typeof t && (i = t.delay, e = t.ease, t = t.duration), t = "=" == t ? t : null == t ? 1e3 : new u.Number(t).valueOf(), e = e || "<>", l.to = function (t) { var i; if (t = 0 > t ? 0 : t > 1 ? 1 : t, null == n) { n = []; for (o in l.attrs) n.push(o); if (a.morphArray && (l._plot || n.indexOf("points") > -1)) { var u, c = new a.morphArray(l._plot || l.attrs.points || a.array); l._size && c.size(l._size.width.to, l._size.height.to), u = c.bbox(), l._x ? c.move(l._x.to, u.y) : l._cx && c.move(l._cx.to - u.width / 2, u.y), u = c.bbox(), l._y ? c.move(u.x, l._y.to) : l._cy && c.move(u.x, l._cy.to - u.height / 2), delete l._x, delete l._y, delete l._cx, delete l._cy, delete l._size, l._plot = a.array.morph(c) } } if (null == s) { s = []; for (o in l.trans) s.push(o) } if (null == h) { h = []; for (o in l.styles) h.push(o) } for (t = "<>" == e ? -Math.cos(t * Math.PI) / 2 + .5 : ">" == e ? Math.sin(t * Math.PI / 2) : "<" == e ? -Math.cos(t * Math.PI / 2) + 1 : "-" == e ? t : "function" == typeof e ? e(t) : t, l._plot ? a.plot(l._plot.at(t)) : (l._x ? a.x(l._x.at(t)) : l._cx && a.cx(l._cx.at(t)), l._y ? a.y(l._y.at(t)) : l._cy && a.cy(l._cy.at(t)), l._size && a.size(l._size.width.at(t), l._size.height.at(t))), l._viewbox && a.viewbox(l._viewbox.x.at(t), l._viewbox.y.at(t), l._viewbox.width.at(t), l._viewbox.height.at(t)), l._leading && a.leading(l._leading.at(t)), i = n.length - 1; i >= 0; i--) a.attr(n[i], r(l.attrs[n[i]], t)); for (i = s.length - 1; i >= 0; i--) a.transform(s[i], r(l.trans[s[i]], t)); for (i = h.length - 1; i >= 0; i--) a.style(h[i], r(l.styles[h[i]], t)); l._during && l._during.call(a, t, function (e, i) { return r({ from: e, to: i }, t) }) }, "number" == typeof t && (this.timeout = setTimeout(function () { var n = (new Date).getTime(); l.situation = { interval: 1e3 / 60, start: n, play: !0, finish: n + t, duration: t }, l.render = function () { if (l.situation.play === !0) { var n = (new Date).getTime(), r = n > l.situation.finish ? 1 : (n - l.situation.start) / t; l.to(r), n > l.situation.finish ? (l._plot && a.plot(new u.PointArray(l._plot.destination).settle()), l._loop === !0 || "number" == typeof l._loop && l._loop > 1 ? ("number" == typeof l._loop && --l._loop, l.animate(t, e, i)) : l._after ? l._after.apply(a, [l]) : l.stop()) : requestAnimFrame(l.render) } else requestAnimFrame(l.render) }, l.render() }, new u.Number(i).valueOf())), this }, bbox: function () { return this.target.bbox() }, attr: function (t, e) { if ("object" == typeof t) for (var i in t) this.attr(i, t[i]); else { var n = this.target.attr(t); this.attrs[t] = u.Color.isColor(n) ? new u.Color(n).morph(e) : u.regex.unit.test(n) ? new u.Number(n).morph(e) : { from: n, to: e } } return this }, transform: function (t, e) { if (1 == arguments.length) { t = o(t), delete t.matrix; for (e in t) this.trans[e] = { from: this.target.trans[e], to: t[e] } } else { var i = {}; i[t] = e, this.transform(i) } return this }, style: function (t, e) { if ("object" == typeof t) for (var i in t) this.style(i, t[i]); else this.styles[t] = { from: this.target.style(t), to: e }; return this }, x: function (t) { return this._x = new u.Number(this.target.x()).morph(t), this }, y: function (t) { return this._y = new u.Number(this.target.y()).morph(t), this }, cx: function (t) { return this._cx = new u.Number(this.target.cx()).morph(t), this }, cy: function (t) { return this._cy = new u.Number(this.target.cy()).morph(t), this }, move: function (t, e) { return this.x(t).y(e) }, center: function (t, e) { return this.cx(t).cy(e) }, size: function (t, e) { if (this.target instanceof u.Text) this.attr("font-size", t); else { var i = this.target.bbox(); this._size = { width: new u.Number(i.width).morph(t), height: new u.Number(i.height).morph(e) } } return this }, plot: function (t) { return this._plot = t, this }, leading: function (t) { return this.target._leading && (this._leading = new u.Number(this.target._leading).morph(t)), this }, viewbox: function (t, e, i, n) { if (this.target instanceof u.Container) { var r = this.target.viewbox(); this._viewbox = { x: new u.Number(r.x).morph(t), y: new u.Number(r.y).morph(e), width: new u.Number(r.width).morph(i), height: new u.Number(r.height).morph(n) } } return this }, environmentUpdate: function (t) { return this.target instanceof u.Stop && (null != t.opacity && this.attr("stop-opacity", t.opacity), null != t.color && this.attr("stop-color", t.color), null != t.offset && this.attr("offset", new u.Number(t.offset))), this }, during: function (t) { return this._during = t, this }, after: function (t) { return this._after = t, this }, loop: function (t) { return this._loop = t || !0, this }, stop: function (t) { return t === !0 ? (this.animate(0), this._after && this._after.apply(this.target, [this])) : (clearTimeout(this.timeout), this.attrs = {}, this.trans = {}, this.styles = {}, this.situation = {}, delete this._x, delete this._y, delete this._cx, delete this._cy, delete this._size, delete this._plot, delete this._loop, delete this._after, delete this._during, delete this._leading, delete this._viewbox), this }, pause: function () { return this.situation.play === !0 && (this.situation.play = !1, this.situation.pause = (new Date).getTime()), this }, play: function () { if (this.situation.play === !1) { var t = (new Date).getTime() - this.situation.pause; this.situation.finish += t, this.situation.start += t, this.situation.play = !0 } return this } }, parent: u.Element, construct: { animate: function (t, e, i) { return (this.fx || (this.fx = new u.FX(this))).stop().animate(t, e, i) }, stop: function (t) { return this.fx && this.fx.stop(t), this }, pause: function () { return this.fx && this.fx.pause(), this }, play: function () { return this.fx && this.fx.play(), this } } }), u.extend(u.Element, u.FX, { dx: function (t) { return this.x((this.target || this).x() + t) }, dy: function (t) { return this.y((this.target || this).y() + t) }, dmove: function (t, e) { return this.dx(t).dy(e) } }), ["click", "dblclick", "mousedown", "mouseup", "mouseover", "mouseout", "mousemove", "mouseenter", "mouseleave", "touchstart", "touchmove", "touchleave", "touchend", "touchcancel"].forEach(function (t) { u.Element.prototype[t] = function (e) { var i = this; return this.node["on" + t] = "function" == typeof e ? function () { return e.apply(i, arguments) } : null, this } }), u.events = {}, u.listeners = {}, u.registerEvent = function (t) { u.events[t] || (u.events[t] = new Event(t)) }, u.on = function (t, e, i) { var n = i.bind(t.instance || t); u.listeners[i] = n, t.addEventListener(e, n, !1) }, u.off = function (t, e, i) { t.removeEventListener(e, u.listeners[i], !1), delete u.listeners[i] }, u.extend(u.Element, { on: function (t, e) { return u.on(this.node, t, e), this }, off: function (t, e) { return u.off(this.node, t, e), this }, fire: function (t) { return this.node.dispatchEvent(u.events[t]), this } }), u.Defs = u.invent({ create: "defs", inherit: u.Container }), u.G = u.invent({ create: "g", inherit: u.Container, extend: { x: function (t) { return null == t ? this.trans.x : this.transform("x", t) }, y: function (t) { return null == t ? this.trans.y : this.transform("y", t) }, cx: function (t) { return null == t ? this.bbox().cx : this.x(t - this.bbox().width / 2) }, cy: function (t) { return null == t ? this.bbox().cy : this.y(t - this.bbox().height / 2) } }, construct: { group: function () { return this.put(new u.G) } } }), u.extend(u.Element, { siblings: function () { return this.parent.children() }, position: function () { return this.parent.index(this) }, next: function () { return this.siblings()[this.position() + 1] }, previous: function () { return this.siblings()[this.position() - 1] }, forward: function () { var t = this.position(); return this.parent.removeElement(this).put(this, t + 1) }, backward: function () { var t = this.position(); return t > 0 && this.parent.removeElement(this).add(this, t - 1), this }, front: function () { return this.parent.removeElement(this).put(this) }, back: function () { return this.position() > 0 && this.parent.removeElement(this).add(this, 0), this }, before: function (t) { t.remove(); var e = this.position(); return this.parent.add(t, e), this }, after: function (t) { t.remove(); var e = this.position(); return this.parent.add(t, e + 1), this } }), u.Mask = u.invent({ create: function () { this.constructor.call(this, u.create("mask")), this.targets = [] }, inherit: u.Container, extend: { remove: function () { for (var t = this.targets.length - 1; t >= 0; t--) this.targets[t] && this.targets[t].unmask(); return delete this.targets, this.parent.removeElement(this), this } }, construct: { mask: function () { return this.defs().put(new u.Mask) } } }), u.extend(u.Element, { maskWith: function (t) { return this.masker = t instanceof u.Mask ? t : this.parent.mask().add(t), this.masker.targets.push(this), this.attr("mask", 'url("#' + this.masker.attr("id") + '")') }, unmask: function () { return delete this.masker, this.attr("mask", null) } }), u.Clip = u.invent({ create: function () { this.constructor.call(this, u.create("clipPath")), this.targets = [] }, inherit: u.Container, extend: { remove: function () { for (var t = this.targets.length - 1; t >= 0; t--) this.targets[t] && this.targets[t].unclip(); return delete this.targets, this.parent.removeElement(this), this } }, construct: { clip: function () { return this.defs().put(new u.Clip) } } }), u.extend(u.Element, { clipWith: function (t) { return this.clipper = t instanceof u.Clip ? t : this.parent.clip().add(t), this.clipper.targets.push(this), this.attr("clip-path", 'url("#' + this.clipper.attr("id") + '")') }, unclip: function () { return delete this.clipper, this.attr("clip-path", null) } }), u.Gradient = u.invent({ create: function (t) { this.constructor.call(this, u.create(t + "Gradient")), this.type = t }, inherit: u.Container, extend: { from: function (t, e) { return "radial" == this.type ? this.attr({ fx: new u.Number(t), fy: new u.Number(e) }) : this.attr({ x1: new u.Number(t), y1: new u.Number(e) }) }, to: function (t, e) { return "radial" == this.type ? this.attr({ cx: new u.Number(t), cy: new u.Number(e) }) : this.attr({ x2: new u.Number(t), y2: new u.Number(e) }) }, radius: function (t) { return "radial" == this.type ? this.attr({ r: new u.Number(t) }) : this }, at: function (t, e, i) { return this.put(new u.Stop).environmentUpdate(t, e, i) }, environmentUpdate: function (t) { return this.clear(), "function" == typeof t && t.call(this, this), this }, fill: function () { return "url(#" + this.id() + ")" }, toString: function () { return this.fill() } }, construct: { gradient: function (t, e) { return this.defs().gradient(t, e) } } }), u.extend(u.Defs, { gradient: function (t, e) { return this.put(new u.Gradient(t)).environmentUpdate(e) } }), u.Stop = u.invent({ create: "stop", inherit: u.Element, extend: { environmentUpdate: function (t) { return ("number" == typeof t || t instanceof u.Number) && (t = { offset: arguments[0], color: arguments[1], opacity: arguments[2] }), null != t.opacity && this.attr("stop-opacity", t.opacity), null != t.color && this.attr("stop-color", t.color), null != t.offset && this.attr("offset", new u.Number(t.offset)), this } } }), u.Pattern = u.invent({ create: "pattern", inherit: u.Container, extend: { fill: function () { return "url(#" + this.id() + ")" }, environmentUpdate: function (t) { return this.clear(), "function" == typeof t && t.call(this, this), this }, toString: function () { return this.fill() } }, construct: { pattern: function (t, e, i) { return this.defs().pattern(t, e, i) } } }), u.extend(u.Defs, { pattern: function (t, e, i) { return this.put(new u.Pattern).environmentUpdate(i).attr({ x: 0, y: 0, width: t, height: e, patternUnits: "userSpaceOnUse" }) } }), u.Doc = u.invent({ create: function (t) { this.parent = "string" == typeof t ? document.getElementById(t) : t, this.constructor.call(this, "svg" == this.parent.nodeName ? this.parent : u.create("svg")), this.attr({ xmlns: u.ns, version: "1.1", width: "100%", height: "100%" }).attr("xmlns:xlink", u.xlink, u.xmlns), this._defs = new u.Defs, this._defs.parent = this, this.node.appendChild(this._defs.node), this.doSpof = !1, this.parent != this.node && this.stage() }, inherit: u.Container, extend: { stage: function () { var t = this; return this.parent.appendChild(this.node), t.spof(), u.on(window, "resize", function () { t.spof() }), this }, defs: function () { return this._defs }, spof: function () { if (this.doSpof) { var t = this.node.getScreenCTM(); t && this.style("left", -t.e % 1 + "px").style("top", -t.f % 1 + "px") } return this }, fixSubPixelOffset: function () { return this.doSpof = !0, this } } }), u.Shape = u.invent({ create: function (t) { this.constructor.call(this, t) }, inherit: u.Element }), u.Symbol = u.invent({ create: "symbol", inherit: u.Container, construct: { symbol: function () { return this.defs().put(new u.Symbol) } } }), u.Use = u.invent({ create: "use", inherit: u.Shape, extend: { element: function (t) { return this.target = t, this.attr("href", "#" + t, u.xlink) } }, construct: { use: function (t) { return this.put(new u.Use).element(t) } } }), u.Rect = u.invent({ create: "rect", inherit: u.Shape, construct: { rect: function (t, e) { return this.put((new u.Rect).size(t, e)) } } }), u.Ellipse = u.invent({ create: "ellipse", inherit: u.Shape, extend: { x: function (t) { return null == t ? this.cx() - this.attr("rx") : this.cx(t + this.attr("rx")) }, y: function (t) { return null == t ? this.cy() - this.attr("ry") : this.cy(t + this.attr("ry")) }, cx: function (t) { return null == t ? this.attr("cx") : this.attr("cx", new u.Number(t).divide(this.trans.scaleX)) }, cy: function (t) { return null == t ? this.attr("cy") : this.attr("cy", new u.Number(t).divide(this.trans.scaleY)) }, width: function (t) { return null == t ? 2 * this.attr("rx") : this.attr("rx", new u.Number(t).divide(2)) }, height: function (t) { return null == t ? 2 * this.attr("ry") : this.attr("ry", new u.Number(t).divide(2)) }, size: function (t, e) { var i = n(this.bbox(), t, e); return this.attr({ rx: new u.Number(i.width).divide(2), ry: new u.Number(i.height).divide(2) }) } }, construct: { circle: function (t) { return this.ellipse(t, t) }, ellipse: function (t, e) { return this.put(new u.Ellipse).size(t, e).move(0, 0) } } }), u.Line = u.invent({
		create: "line", inherit: u.Shape, extend: {
			x: function (t) { var e = this.bbox(); return null == t ? e.x : this.attr({ x1: this.attr("x1") - e.x + t, x2: this.attr("x2") - e.x + t }) }, y: function (t) { var e = this.bbox(); return null == t ? e.y : this.attr({ y1: this.attr("y1") - e.y + t, y2: this.attr("y2") - e.y + t }) }, cx: function (t) { var e = this.bbox().width / 2; return null == t ? this.x() + e : this.x(t - e) }, cy: function (t) { var e = this.bbox().height / 2; return null == t ? this.y() + e : this.y(t - e) }, width: function (t) { var e = this.bbox(); return null == t ? e.width : this.attr(this.attr("x1") < this.attr("x2") ? "x2" : "x1", e.x + t) }, height: function (t) {
				var e = this.bbox();
				return null == t ? e.height : this.attr(this.attr("y1") < this.attr("y2") ? "y2" : "y1", e.y + t)
			}, size: function (t, e) { var i = n(this.bbox(), t, e); return this.width(i.width).height(i.height) }, plot: function (t, e, i, n) { return this.attr({ x1: t, y1: e, x2: i, y2: n }) }
		}, construct: { line: function (t, e, i, n) { return this.put((new u.Line).plot(t, e, i, n)) } }
	}), u.Polyline = u.invent({ create: "polyline", inherit: u.Shape, construct: { polyline: function (t) { return this.put(new u.Polyline).plot(t) } } }), u.Polygon = u.invent({ create: "polygon", inherit: u.Shape, construct: { polygon: function (t) { return this.put(new u.Polygon).plot(t) } } }), u.extend(u.Polyline, u.Polygon, { morphArray: u.PointArray, plot: function (t) { return this.attr("points", this.array = new u.PointArray(t, [[0, 0]])) }, move: function (t, e) { return this.attr("points", this.array.move(t, e)) }, x: function (t) { return null == t ? this.bbox().x : this.move(t, this.bbox().y) }, y: function (t) { return null == t ? this.bbox().y : this.move(this.bbox().x, t) }, width: function (t) { var e = this.bbox(); return null == t ? e.width : this.size(t, e.height) }, height: function (t) { var e = this.bbox(); return null == t ? e.height : this.size(e.width, t) }, size: function (t, e) { var i = n(this.bbox(), t, e); return this.attr("points", this.array.size(i.width, i.height)) } }), u.Path = u.invent({ create: "path", inherit: u.Shape, extend: { plot: function (t) { return this.attr("d", this.array = new u.PathArray(t, [["M", 0, 0]])) }, move: function (t, e) { return this.attr("d", this.array.move(t, e)) }, x: function (t) { return null == t ? this.bbox().x : this.move(t, this.bbox().y) }, y: function (t) { return null == t ? this.bbox().y : this.move(this.bbox().x, t) }, size: function (t, e) { var i = n(this.bbox(), t, e); return this.attr("d", this.array.size(i.width, i.height)) }, width: function (t) { return null == t ? this.bbox().width : this.size(t, this.bbox().height) }, height: function (t) { return null == t ? this.bbox().height : this.size(this.bbox().width, t) } }, construct: { path: function (t) { return this.put(new u.Path).plot(t) } } }), u.Image = u.invent({ create: "image", inherit: u.Shape, extend: { load: function (t) { if (!t) return this; var e = this, i = document.createElement("img"); return i.onload = function () { var n = e.doc(u.Pattern); 0 == e.width() && 0 == e.height() && e.size(i.width, i.height), n && 0 == n.width() && 0 == n.height() && n.size(e.width(), e.height()), "function" == typeof e._loaded && e._loaded.call(e, { width: i.width, height: i.height, ratio: i.width / i.height, url: t }) }, this.attr("href", i.src = this.src = t, u.xlink) }, loaded: function (t) { return this._loaded = t, this } }, construct: { image: function (t, e, i) { return this.put(new u.Image).load(t).size(e || 0, i || e || 0) } } }), u.Text = u.invent({ create: function () { this.constructor.call(this, u.create("text")), this._leading = new u.Number(1.3), this._rebuild = !0, this._build = !1, this.attr("font-family", u.defaults.attrs["font-family"]) }, inherit: u.Shape, extend: { x: function (t) { return null == t ? this.attr("x") : (this.textPath || this.lines.each(function () { this.newLined && this.x(t) }), this.attr("x", t)) }, y: function (t) { var e = this.attr("y"), i = "number" == typeof e ? e - this.bbox().y : 0; return null == t ? "number" == typeof e ? e - i : e : this.attr("y", "number" == typeof t ? t + i : t) }, cx: function (t) { return null == t ? this.bbox().cx : this.x(t - this.bbox().width / 2) }, cy: function (t) { return null == t ? this.bbox().cy : this.y(t - this.bbox().height / 2) }, text: function (t) { if ("undefined" == typeof t) return this.content; if (this.clear().build(!0), "function" == typeof t) t.call(this, this); else { t = (this.content = t).split("\n"); for (var e = 0, i = t.length; i > e; e++) this.tspan(t[e]).newLine() } return this.build(!1).rebuild() }, size: function (t) { return this.attr("font-size", t).rebuild() }, leading: function (t) { return null == t ? this._leading : (this._leading = new u.Number(t), this.rebuild()) }, rebuild: function (t) { if ("boolean" == typeof t && (this._rebuild = t), this._rebuild) { var e = this; this.lines.each(function () { this.newLined && (this.textPath || this.attr("x", e.attr("x")), this.attr("dy", e._leading * new u.Number(e.attr("font-size")))) }), this.fire("rebuild") } return this }, build: function (t) { return this._build = !!t, this } }, construct: { text: function (t) { return this.put(new u.Text).text(t) }, plain: function (t) { return this.put(new u.Text).plain(t) } } }), u.TSpan = u.invent({ create: "tspan", inherit: u.Shape, extend: { text: function (t) { return "function" == typeof t ? t.call(this, this) : this.plain(t), this }, dx: function (t) { return this.attr("dx", t) }, dy: function (t) { return this.attr("dy", t) }, newLine: function () { var t = this.doc(u.Text); return this.newLined = !0, this.dy(t._leading * t.attr("font-size")).attr("x", t.x()) } } }), u.extend(u.Text, u.TSpan, { plain: function (t) { return this._build === !1 && this.clear(), this.node.appendChild(document.createTextNode(this.content = t)), this }, tspan: function (t) { var e = (this.textPath || this).node, i = new u.TSpan; return this._build === !1 && this.clear(), e.appendChild(i.node), i.parent = this, this instanceof u.Text && this.lines.add(i), i.text(t) }, clear: function () { for (var t = (this.textPath || this).node; t.hasChildNodes() ;) t.removeChild(t.lastChild); return this instanceof u.Text && (delete this.lines, this.lines = new u.Set, this.content = ""), this }, length: function () { return this.node.getComputedTextLength() } }), u.registerEvent("rebuild"), u.TextPath = u.invent({ create: "textPath", inherit: u.Element, parent: u.Text, construct: { path: function (t) { for (this.textPath = new u.TextPath; this.node.hasChildNodes() ;) this.textPath.node.appendChild(this.node.firstChild); return this.node.appendChild(this.textPath.node), this.track = this.doc().defs().path(t), this.textPath.parent = this, this.textPath.attr("href", "#" + this.track, u.xlink), this }, plot: function (t) { return this.track && this.track.plot(t), this } } }), u.Nested = u.invent({ create: function () { this.constructor.call(this, u.create("svg")), this.style("overflow", "visible") }, inherit: u.Container, construct: { nested: function () { return this.put(new u.Nested) } } }), u.A = u.invent({ create: "a", inherit: u.Container, extend: { to: function (t) { return this.attr("href", t, u.xlink) }, show: function (t) { return this.attr("show", t, u.xlink) }, target: function (t) { return this.attr("target", t) } }, construct: { link: function (t) { return this.put(new u.A).to(t) } } }), u.extend(u.Element, { linkTo: function (t) { var e = new u.A; return "function" == typeof t ? t.call(e, e) : e.to(t), this.parent.put(e).put(this) } }), u.Marker = u.invent({ create: "marker", inherit: u.Container, extend: { width: function (t) { return this.attr("markerWidth", t) }, height: function (t) { return this.attr("markerHeight", t) }, ref: function (t, e) { return this.attr("refX", t).attr("refY", e) }, environmentUpdate: function (t) { return this.clear(), "function" == typeof t && t.call(this, this), this }, toString: function () { return "url(#" + this.id() + ")" } }, construct: { marker: function (t, e, i) { return this.defs().marker(t, e, i) } } }), u.extend(u.Defs, { marker: function (t, e, i) { return this.put(new u.Marker).size(t, e).ref(t / 2, e / 2).viewbox(0, 0, t, e).attr("orient", "auto").environmentUpdate(i) } }), u.extend(u.Line, u.Polyline, u.Polygon, u.Path, { marker: function (t, e, i, n) { var r = ["marker"]; return "all" != t && r.push(t), r = r.join("-"), t = arguments[1] instanceof u.Marker ? arguments[1] : this.doc().marker(e, i, n), this.attr(r, t) } }); var l = { stroke: ["color", "width", "opacity", "linecap", "linejoin", "miterlimit", "dasharray", "dashoffset"], fill: ["color", "opacity", "rule"], prefix: function (t, e) { return "color" == e ? t : t + "-" + e } };["fill", "stroke"].forEach(function (t) { var e, i = {}; i[t] = function (i) { if ("string" == typeof i || u.Color.isRgb(i) || i && "function" == typeof i.fill) this.attr(t, i); else for (e = l[t].length - 1; e >= 0; e--) null != i[l[t][e]] && this.attr(l.prefix(t, l[t][e]), i[l[t][e]]); return this }, u.extend(u.Element, u.FX, i) }), u.extend(u.Element, u.FX, { rotate: function (t, e, i) { return this.transform({ rotation: t || 0, cx: e, cy: i }) }, skew: function (t, e) { return this.transform({ skewX: t || 0, skewY: e || 0 }) }, scale: function (t, e) { return this.transform({ scaleX: t, scaleY: null == e ? t : e }) }, translate: function (t, e) { return this.transform({ x: t, y: e }) }, matrix: function (t) { return this.transform({ matrix: t }) }, opacity: function (t) { return this.attr("opacity", t) } }), u.extend(u.Rect, u.Ellipse, u.FX, { radius: function (t, e) { return this.attr({ rx: t, ry: e || t }) } }), u.extend(u.Path, { length: function () { return this.node.getTotalLength() }, pointAt: function (t) { return this.node.getPointAtLength(t) } }), u.extend(u.Parent, u.Text, u.FX, { font: function (t) { for (var e in t) "leading" == e ? this.leading(t[e]) : "anchor" == e ? this.attr("text-anchor", t[e]) : "size" == e || "family" == e || "weight" == e || "stretch" == e || "variant" == e || "style" == e ? this.attr("font-" + e, t[e]) : this.attr(e, t[e]); return this } }), u.Set = u.invent({ create: function () { this.clear() }, extend: { add: function () { var t, e, i = [].slice.call(arguments); for (t = 0, e = i.length; e > t; t++) this.members.push(i[t]); return this }, remove: function (t) { var e = this.index(t); return e > -1 && this.members.splice(e, 1), this }, each: function (t) { for (var e = 0, i = this.members.length; i > e; e++) t.apply(this.members[e], [e, this.members]); return this }, clear: function () { return this.members = [], this }, has: function (t) { return this.index(t) >= 0 }, index: function (t) { return this.members.indexOf(t) }, get: function (t) { return this.members[t] }, first: function () { return this.get(0) }, last: function () { return this.get(this.members.length - 1) }, valueOf: function () { return this.members }, bbox: function () { var t = new u.BBox; if (0 == this.members.length) return t; var e = this.members[0].rbox(); return t.x = e.x, t.y = e.y, t.width = e.width, t.height = e.height, this.each(function () { t = t.merge(this.rbox()) }), t } }, construct: { set: function () { return new u.Set } } }), u.SetFX = u.invent({ create: function (t) { this.set = t } }), u.Set.inherit = function () { var t, e = []; for (var t in u.Shape.prototype) "function" == typeof u.Shape.prototype[t] && "function" != typeof u.Set.prototype[t] && e.push(t); e.forEach(function (t) { u.Set.prototype[t] = function () { for (var e = 0, i = this.members.length; i > e; e++) this.members[e] && "function" == typeof this.members[e][t] && this.members[e][t].apply(this.members[e], arguments); return "animate" == t ? this.fx || (this.fx = new u.SetFX(this)) : this } }), e = []; for (var t in u.FX.prototype) "function" == typeof u.FX.prototype[t] && "function" != typeof u.SetFX.prototype[t] && e.push(t); e.forEach(function (t) { u.SetFX.prototype[t] = function () { for (var e = 0, i = this.set.members.length; i > e; e++) this.set.members[e].fx[t].apply(this.set.members[e].fx, arguments); return this } }) }, u.extend(u.Element, { data: function (t, e, i) { if ("object" == typeof t) for (e in t) this.data(e, t[e]); else if (arguments.length < 2) try { return JSON.parse(this.attr("data-" + t)) } catch (n) { return this.attr("data-" + t) } else this.attr("data-" + t, null === e ? null : i === !0 || "string" == typeof e || "number" == typeof e ? e : JSON.stringify(e)); return this } }), u.extend(u.Element, { remember: function (t, e) { if ("object" == typeof arguments[0]) for (var e in t) this.remember(e, t[e]); else { if (1 == arguments.length) return this.memory()[t]; this.memory()[t] = e } return this }, forget: function () { if (0 == arguments.length) this._memory = {}; else for (var t = arguments.length - 1; t >= 0; t--) delete this.memory()[arguments[t]]; return this }, memory: function () { return this._memory || (this._memory = {}) } }), "function" == typeof define && define.amd ? define(function () { return u }) : "undefined" != typeof exports && (exports.SVG = u), window.requestAnimFrame = function () { return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame || function (t) { window.setTimeout(t, 1e3 / 60) } }()
}).call(this);
(function() {
    SVG.Clock = function (size) {
        this.full = {
            hours: 0,
            minutes: 0,
            seconds: 0
        };

        this.time = {
            hours: 0,
            minutes: 0,
            seconds: 0
        };

        this.constructor.call(this, SVG.create("svg"));
        this.viewbox(0, 0, 100, 100);
        this.size(size, size);

        this.plate = this.circle(77)
            .stroke({ width: 10, color: "#fff" })
            .fill({ opacity: 0 })
            .move(10.5, 10.5);

        this.hours = this.rect(7, 20)
            .move(45.5, 29)
            .fill({ color: "#fff" });

        this.dot = this.circle(7)
            .move(45.5, 45.5)
            .fill({ color: "#fff" });

        this.minutes = this.rect(5, 25)
            .move(46.5, 24)
            .fill({ color: "#fff" });

        this.seconds = this.path()
            .stroke({ width: 3, color: "#fff" })
            .fill({ opacity: 0 });

        this.update(0);
    }

    SVG.Clock.prototype = new SVG.Container;

    SVG.extend(SVG.Clock, {
        start: function() {
            var self = this;

            setInterval(function() {
                self.update();
            }, 1000);

            return this;
        },
        update: function(duration) {
            var time = new Date();
            if (duration == null)
                duration = 300;

            this
                .setHours(time.getHours(), time.getMinutes())
                .setMinutes(time.getMinutes(), duration)
                .setSeconds(time.getSeconds() + time.getMilliseconds() / 1000, duration);

            return this;
        },
        setHours: function(hours, minutes) {
            this.time.hours = hours;

            this.hours
                .rotate((360 / 12 * ((hours + minutes / 60) % 12)), 49, 49);

            return this;
        },
        setMinutes: function(minutes, duration) {
            if (minutes == this.time.minutes)
                return this;

            this.time.minutes = minutes;

            if (minutes == 0)
                this.full.minutes++;

            var deg = this.full.minutes * 360 + 360 / 60 * minutes;

            if (duration)
                this.minutes
                    .animate(duration)
                    .rotate(deg, 49, 49);
            else
                this.minutes
                    .rotate(deg, 49, 49);

            return this;
        },
        setSeconds: function(seconds, duration) {
            var r = (seconds / 60) * 2 * Math.PI,
                x = 49 + Math.sin(r) * 48,
                y = 49 + Math.cos(r) * -48,
                mid = (r > Math.PI) ? 1 : 0,
                anim = 'M 49,1 A 48,48 0 ' + mid + ',1 ' + x + ',' + y;

            this.seconds.plot(anim);
            return this;
        }

    });

    SVG.extend(SVG.Container, {
        clock: function(size) {
            return this.put(new SVG.Clock(size));
        }
    });
})();