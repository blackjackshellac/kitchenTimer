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

const {GLib} = imports.gi;
const Main = imports.ui.main;

const Utils = Me.imports.utils;
const Notifier = Me.imports.notifier;

class Timers extends Array {
  constructor(settings, ...args) {
    super(...args);

    this._settings = settings;
    this._notifier = new Notifier.Annoyer(settings);

    var timers = this._settings.unpack_timers();
    timers.forEach( (h) => {
      var timer = new Timer(h.name, h.duration, h.id);
      this.add(timer);
    });

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
      log('sort by duration');
      var direction= this.sort_descending ? -1 : 1;
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
    timer._settings = this._settings;
    timer._notifier = this._notifier;

    log(`Adding timer ${timer.name} of duration ${timer.duration} seconds`);
    this.push(timer);

    this._settings.pack_timers(this);
  }
}

const TimerState = {
  RESET: 0,
  RUNNING: 1,
  EXPIRED: 2
}

class Timer {

  constructor(name, duration_secs, id=undefined) {
    log(`Create timer [${name}] duration=[${duration_secs}]`);
    this._enabled = true;
    this._interval_ms = 100;
    this._name = name;
    this._duration_ms = duration_secs * 1000;
    this._duration_secs = duration_secs;
    this._state = TimerState.RESET;
    this._id = id == undefined ? GLib.uuid_string_random() : id;
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
    return this._duration_secs;
  }

  get label() {
    return this._label;
  }

  set label(label) {
    log(`Timer label set to ${label}`);
    this._label = label;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  timer_callback(timer) {
    var now = Date.now();
    var end = timer._end;

    //log(`test end=${end} at ${now}`);
    if (now > end || !timer.is_running()) {
      return timer.stop_callback();
    }
    //log(`Timer [${timer._name}] has not ended: ${delta}`);
    var delta = Math.ceil((end-now) / 1000);
    var hms = new Utils.HMS(delta);
    timer._label.set_text(hms.toString());
    return true;
  }

  is_running() {
    return (this._state == TimerState.RUNNING);
  }

  stop_callback() {
    this._state = TimerState.EXPIRED;
    log(`Timer [${this._name}] has ended`);
    Utils.clearInterval(this._interval_id);
    this._interval_id = undefined;

    // TODO Notifications and play sounds
    this._notifier.annoy(_(`Timer [${this._name}] completed`));
    var hms = new Utils.HMS(this.duration);
    this._label.set_text(hms.toString());

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
      log(`Timer [${this._name}] is already running, resetting`);
      // TODO prompt to reset
      this.reset();
      return false;
    }
    this._state = TimerState.RUNNING;
    this._start = Date.now();
    this._end = this._start + this._duration_ms;

    log(`Starting timer [${this._name}] at ${this._start}`);
    this._interval_id = Utils.setInterval(this.timer_callback, this._interval_ms, this);
    return true;
  }
}
