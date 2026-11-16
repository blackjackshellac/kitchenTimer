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

import GLib from 'gi://GLib';

if (!String.prototype.format) {
  String.prototype.format = imports.format.format;
}

export function logObjectPretty(obj) {
  log(JSON.stringify(obj, null, 2));
}

export const clearTimeout = GLib.Source.remove;
export const clearInterval = GLib.Source.remove;

export function setTimeout(func, delay, ...args) {
  const wrappedFunc = () => {
    func.apply(this, args);
    // never continue timeout
    return false;
  };
  return GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, wrappedFunc);
}

export function setInterval(func, delay, ...args) {
  const wrappedFunc = () => {
    // continue timeout until func returns false
    return func.apply(this, args);
  };
  return GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, wrappedFunc);
}

export function spawn(command, callback) {
  var [status, pid] = GLib.spawn_async(
      null,
      ['/usr/bin/env', 'bash', '-c', command],
      null,
      GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
      null
  );

  if (callback) {
    GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, callback);
  }
}

/**
 * execute the given cmdargs [ cmd, arg0, arg1, ... ] synchronously
 *
 * Return [ exit_value, output ]
 *
 * - if it fails return [ -1, undefined, undefined ]
 * - otherwise return [ exit_status, stdout, stderr ]
 *
 * Normally if exit_status is 0 stderr will be empty
 *
 */
export function execute(cmdargs, params={ wdir: null, envp: null, flags: GLib.SpawnFlags.SEARCH_PATH }) {
  var [ok, stdout, stderr, exit_status] = GLib.spawn_sync(
    params.wdir, // working directory
    cmdargs,  // string array
    params.envp,     // envp
    params.flags,
    null    // child setup function
  );

  if (ok) {
    const decoder = new TextDecoder();
    stdout = decoder.decode(stdout);
    stderr = decoder.decode(stderr);
    //log(`ok=${ok} exit_status=${exit_status} stdout=${stdout} stderr=${stderr}`);
    return [ exit_status, stdout, stderr ];
  }
  // fatal
  return [ -1, undefined, "execute failed: %s".format(cmdargs.join(" ")) ];
}

export function uuid(id=undefined) {
  return id === undefined || id.length === 0 ? GLib.uuid_string_random() : id;
}

export function addSignalsHelperMethods(prototype) {
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


