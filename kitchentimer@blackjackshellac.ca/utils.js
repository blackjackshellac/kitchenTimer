/*
 * Kitchen Timer: Gnome Shell Kitchen Timer Extension
 * Copyright (C) 2021 Steeve McCauley
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

const GETTEXT_DOMAIN = 'kitchen-timer-blackjackshellac';
const Gettext = imports.gettext.domain(GETTEXT_DOMAIN);
const _ = Gettext.gettext;

const GLib = imports.gi.GLib;
var clearTimeout, clearInterval;
clearTimeout = clearInterval = GLib.Source.remove;

function setTimeout(func, delay, ...args) {
    const wrappedFunc = () => {
        return func.apply(this, args);
    };
    return GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, wrappedFunc);
}

function setInterval(func, delay, ...args) {
    const wrappedFunc = () => {
        return func.apply(this, args);
    };
    return GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, wrappedFunc);
}

function spawn(command, callback) {
    var [status, pid] = GLib.spawn_async(
        null,
        ['/usr/bin/env', 'bash', '-c', command],
        null,
        GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
        null
    );

    if (callback)
        GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, callback);
}

function uuid(id=undefined) {
  return id == undefined ? GLib.uuid_string_random() : id;
}

function isDebugModeEnabled() {
    return new Settings().debug();
}

const LOGID = 'kitchen-timer';

class Logger {
    constructor(logid=undefined, debug=false) {
        this._logid = logid === undefined ? LOGID : logid;
        this._debug_enabled = debug;
    }

    _log(level,message) {
      log(`${level}: [${this._logid}] ${message}`);
    }

    debug(message) {
      if (!this._debug_enabled) return;
      this._log("DEBUG", message);
    }

    warn(message) {
      this._log("WARNING", message);
    }

    info(message) {
      this._log("INFO", message);
    }

    error(message) {
      this._log("ERROR", message);
    }
}

function addSignalsHelperMethods(prototype) {
    prototype._connectSignal = function (subject, signal_name, method) {
        if (!this._signals) this._signals = [];

        var signal_id = subject.connect(signal_name, method);
        this._signals.push({
            subject: subject,
            signal_id: signal_id
        });
    }

    prototype._disconnectSignals = function () {
        if (!this._signals) return;

        this._signals.forEach((signal) => {
            signal.subject.disconnect(signal.signal_id);
        });
        this._signals = [];
    };
}

class HMS {
  constructor(secs=0) {
    this._secs = Number(secs);
    this._hours = Math.floor(secs / 3600);
    this._minutes = Math.floor(secs % 3600 / 60);
    this._seconds = Math.floor(secs % 3600 % 60);
  }

  static create(h,m,s) {
    return new HMS(h*3600+m*60+s);
  }

  get hours() {
    return this._hours;
  }

  set hours(hours) {
    this._hours = hours;
  }

  get minutes() {
    return this._minutes;
  }

  set minutes(minutes) {
    this._minutes = minutes;
  }

  get seconds() {
    return this._seconds;
  }

  set seconds(seconds) {
    this._seconds = seconds;
  }

  toSeconds() {
    return this._hours*3600 + this._minutes*60 + this._seconds;
  }

  pretty() {
    return `${this.toString()} is ${this.toSeconds()}`;
  }

  toString(compact) {
    var ws=" ";
    if (compact) {
      var time="";
      if (this._hours == 0 && this._minutes == 0) {
        return `${this._seconds}s`;
      } else if (this._hours == 0) {
        return `${this._minutes}m${this._seconds}s`;
      }
      ws="";
    }
    return `${this._hours}h${ws}${this._minutes}m${ws}${this._seconds}s`;
  }
}

