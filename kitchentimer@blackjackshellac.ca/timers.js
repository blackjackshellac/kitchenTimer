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

const {GLib, St, Clutter} = imports.gi;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;

const Utils = Me.imports.utils;
const Notifier = Me.imports.notifier;
const Logger = Me.imports.utils.Logger;

class Timers extends Array {
  constructor(...args) {
    super(...args);

    this.logger = new Logger('timers');
  }

  static attach(indicator) {
    timersInstance._indicator = indicator;
    timersInstance._settings = indicator._settings;
    timersInstance.logger = new Logger('timers', timersInstance.settings.debug);
    timersInstance._notifier = new Notifier.Annoyer(timersInstance.settings);

    timersInstance.refresh();

    return timersInstance;
  }

  get settings() {
    return this._indicator._settings;
  }

  get box() {
    return this._indicator._box;
  }

  get panel_label() {
    return this._indicator._panel_label;
  }

  get pie() {
    return this._indicator._pie;
  }

  refresh() {
    var settings_timers = this._settings.unpack_timers();
    settings_timers.forEach( (settings_timer) => {
      var found = false;
      for (var i = 0; i < this.length; i++) {
        timer=this[i];
        found = timer.refresh_with(settings_timer);
        if (found) {
          var running = timer.is_running() ? "running" : "not running";
          this.logger.debug(`Found timer ${timer.name} ${running}`);
          break;
        }
      }
      if (!found) {
        this.logger.debug(`Timer ${settings_timer.name} not found`);
        var timer = new Timer(settings_timer.name, settings_timer.duration, settings_timer.id);
        this.add(timer);
      }
    });
    for (var i = 0; i < this.length; i++) {
      var timer=this[i];
      if (timer.is_in_settings(settings_timers)) {
        continue;
      }
      this.logger.debug(`timer ${timer.name} has been disabled`);
      timer.disable();
      // remove from timers
      this.splice(i, 1);
    }
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
      this.logger.debug('sort by duration');
      var direction= this.sort_descending ? -1 : 1;
      timers_array.sort( (a,b) => {
        return (a.duration-b.duration)*direction;
      });
    }
    return timers_array.filter(timer => timer.enabled);
  }

  sort_by_remaining() {
    var running_timers = [...this].filter(timer => timer.is_running());

    //log(`running timers length=${running_timers.length}`);
    var now=Date.now();
    return running_timers.sort( (a,b) => {
      //log(`${ben}-${aen}=${diff}`);
      return a._end-b._end;
    });
  }

  timer_by_id(id) {
    var tbid = this.filter(timer => timer.id == id);
    return tbid.length == 0 ? null : tbid[0];
  }

  add(timer) {

    this.logger.info(`Adding timer ${timer.name} of duration ${timer.duration} seconds label=${this._panel_label}`);
    this.push(timer);

    this._settings.pack_timers(this);
  }
}

// timers is a singleton class
const timersInstance = new Timers();
//Object.freeze(timersInstance);

const TimerState = {
  RESET: 0,
  RUNNING: 1,
  EXPIRED: 2
}

class Timer {

  constructor(name, duration_secs, id=undefined) {
    this.logger = new Logger(`kitchen timer: ${name}`);
    this.logger.info(`Create timer [${name}] duration=[${duration_secs}]`);
    this._enabled = true;
    this._interval_ms = 250;
    this._name = name;
    this._duration_secs = duration_secs;
    this._state = TimerState.RESET;
    this._id = Utils.uuid(id);

    this._notifier = timersInstance._notifier;
    this._panel_label = timersInstance.panel_label;
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

  set name(name) {
    this._name = name;
  }

  // Timer.new('foo', 50).duration is 50000
  get duration() {
    return this._duration_secs;
  }

  set duration(duration) {
    this._duration_secs = duration;
  }

  duration_ms() {
    return this.duration * 1000;
  }

  get label() {
    return this._label;

  }

  set label(label) {
    this.logger.debug(`Timer label set to ${label}`);
    this._label = label;
  }

  timer_callback(timer) {
    var now = Date.now();
    var end = timer._end;

    //log(`test end=${end} at ${now}`);
    if (now > end || !timer.is_running()) {
      return timer.stop_callback();
    }

    var delta = Math.ceil((end-now) / 1000);
    //log(`Timer [${timer._name}] has not ended: ${delta}`);
    var hms = new Utils.HMS(delta);

    try {
      timer._label.set_text(hms.toString());
      var running_timers = timersInstance.sort_by_remaining();
      if (running_timers.length > 0 && running_timers[0] == timer) {
        if (timersInstance._settings.show_time) {
          timersInstance.panel_label.set_text(hms.toString(true));
        }
        timersInstance._active_timer = timer;
        if (timersInstance._settings.show_pie) {
          //timersInstance._pie.queue_repaint();
        }
      }
    } catch(err) {
      this.logger.error("Error setting label: "+err.toString());
      this._state = TimerState.EXPIRED;
    }
    return true;
  }

  is_running() {
    return (this._state == TimerState.RUNNING);
  }

  stop_callback() {
    this._state = TimerState.EXPIRED;
    this.logger.info('Timer has ended');
    Utils.clearInterval(this._interval_id);
    this._interval_id = undefined;

    // TODO Notifications and play sounds
    this._notifier.annoy(_(`Timer [${this._name}] completed`));
    var hms = new Utils.HMS(this.duration);
    this._label.set_text(hms.toString());
    timersInstance.panel_label.set_text("");

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
      log(`Timer is disabled`);
      return false;
    }
    if (this._state == TimerState.RUNNING) {
      this.logger.info(`Timer is already running, resetting`);
      // TODO prompt to reset
      this.reset();
      return false;
    }
    this._state = TimerState.RUNNING;
    this._start = Date.now();
    this._end = this._start + this.duration_ms();

    this.logger.info(`Starting timer at ${this._start}`);
    this._interval_id = Utils.setInterval(this.timer_callback, this._interval_ms, this);
    return true;
  }

  refresh_with(timer_settings) {
    if (timer_settings.id == this.id) {
      this._name = timer_settings.name;
      this._duration_secs = timer_settings.duration;
      this._enabled = timer_settings.enabled;
      return true;
    }
    return false;
  }

  is_in_settings(settings_timers) {
    for (var i=0; i < settings_timers.length; i++) {
      var timer_settings = settings_timers[i];
      if (this._id == timer_settings.id) {
        return true;
      }
    }
    this.logger.debug(`Timer ${this.name} is no longer in settings`);
    return false;
  }
}
