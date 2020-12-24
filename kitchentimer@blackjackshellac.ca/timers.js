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

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Timeout = Me.imports.timeout;
const {GLib} = imports.gi;

class Timers extends Array {
  constructor(settings, ...args) {
    super(...args);

    this._settings = settings;
  }

  isEmpty() {
    this.length === 0;
  }

  get sort_by_duration() {
    return this._settings.sort_by_duration;
  }

  get sort_descending() {
    return this._settings.sort_descending;
  }

  // list of enabled timers sorted according to the sort properties
  sorted() {
    // const cloneSheepsES6 = [...sheeps];
    var timers_array = [...this];
    if (this.sort_by_duration) {
      var direction= this.sort_descending ? 1 : -1;
      timers_array.sort( (a,b) => {
        return (a.duration-b.duration)*direction;
      });
    }
    return timers_array.filter(timer => timer.enabled);
  }

  timer_by_id(id) {
    var tbid = this.filter(timer => timer.id == id);
    return tbid.length == 0 ? null : tbid[0];
  }

  add(timer) {
    this.push(timer);
  }
}

const TimerState = {
  RESET: 0,
  RUNNING: 1,
  EXPIRED: 2
}

class Timer {

  constructor(name, duration_secs, id=undefined) {
    this._enabled = true;
    this._interval_ms = 100;
    this._name = name;
    this._duration_ms = duration_secs * 1000;
    this._state = TimerState.RESET;
    this._id = id == undefined ? GLib.uuid_string_random : id;
  }

  get id() {
    return this._id;
  }

  get enabled() {
    return this._enabled;
  }

  disable() {
    this._enabled = false;
  }

  // Timer.new('foo', 50).name is 'foo'
  get name() {
    return this._name;
  }

  // Timer.new('foo', 50).duration is 50000
  get duration() {
    return this._duration_ms / 1000;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  timer_callback(timer) {
    var now = Date.now();
    var end = timer._end;
    var delta = end-now;
    //log(`test end=${end} at ${now}`);
    if (now > end || !timer.is_running()) {
      return timer.stop_callback();
    }
    //log(`Timer [${timer._name}] has not ended: ${delta}`);
    return true;
  }

  is_running() {
    return (this._state == TimerState.RUNNING);
  }

  stop_callback() {
    this._state = TimerState.EXPIRED;
    log(`Timer [${this._name}] has ended`);
    Timeout.clearInterval(this._interval_id);
    this._interval_id = undefined;
    // return with false to stop interval callback loop
    return false;
  }

  expired() {
    return (this._state == TimerState.EXPIRED);
  }

  reset() {
    this._state = Timer.RESET;
  }

  start() {
    if (!this._enabled) {
      log(`Timer [${this._name}] is disabled`);
      return false;
    }
    if (this._state == TimerState.RUNNING) {
      log(`Timer [${this._name}] is already running`);
      return false;
    }
    this._state = TimerState.RUNNING;
    this._start = Date.now();
    this._end = this._start + this._duration_ms;

    log(`Starting timer [${this._name}] at ${this._start}`);
    this._interval_id = Timeout.setInterval(this.timer_callback, this._interval_ms, this);
    return true;
  }
}
