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

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const {GLib, St, Clutter} = imports.gi;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;

const Utils = Me.imports.utils;
const Notifier = Me.imports.notifier;
const Logger = Me.imports.logger.Logger;
const HMS = Me.imports.hms.HMS;
const AlarmTimer = Me.imports.alarm_timer.AlarmTimer;

const date_options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };

class Timers extends Array {
  constructor(...args) {
    super(...args);

    // id => timer
    this._lookup = {};

    this.logger = new Logger('kt timers', true);
  }

  static attach(indicator) {

    timersInstance.indicator = indicator;
    timersInstance._settings = indicator._settings;
    timersInstance.logger = new Logger('kt timers', timersInstance.settings.debug);
    timersInstance._notifier = new Notifier.Annoyer(timersInstance);

    //timersInstance.logger.info("Attaching indicator "+indicator);

    timersInstance.refresh();

    timersInstance.restoreRunningTimers();

    return timersInstance;
  }

  static detach() {
    timersInstance.logger.info("Detaching indicator from timers");
    timersInstance.indicator = undefined;
  }

  get indicator() {
    return this._indicator;
  }

  set indicator(indicator) {
    this._indicator = indicator;
  }

  get notifier() {
    return this._notifier;
  }

  get settings() {
    return this._settings;
  }

  get box() {
    return this.indicator === undefined ? undefined : this.indicator._box;
  }

  get panel_name() {
    return this.indicator === undefined ? undefined : this.indicator._panel_name;
  }

  get panel_label() {
    return this.indicator === undefined ? undefined : this.indicator._panel_label;
  }

  set_panel_name(text, has_name=true) {
    var label = this.panel_name;
    if (label) {
      label.set_text(this.settings.show_label && has_name && text.length > 0 ? text+"⮚" : "");
    }
  }

  set_panel_label(text) {
    var label = this.panel_label;
    if (label) {
      label.set_text(this.settings.show_time ? text : "");
    }
  }

  remove_by_id(id) {
    this.logger.debug("Removing timer %s", id);
  }

  refresh() {
    var settings_timers = this._settings.unpack_timers();
    settings_timers.forEach( (settings_timer) => {
      var found = false;
      for (var i = 0; i < this.length; i++) {
        timer=this[i];
        found = timer.refresh_with(settings_timer);
        if (found) {
          this.logger.debug("Found %s timer [%s]: %s",
            (timer.quick ? "quick" : "preset"),
            timer.name,
            (timer.running ? "running" : "not running"));
          //if (timer.running) { this.logger.debug(timer.toString()); }
          break;
        }
      }
      if (!found) {
        this.logger.debug(`Timer ${settings_timer.name} not found`);
        var timer = new Timer(settings_timer.name, settings_timer.duration, settings_timer.id);
        if (settings_timer.quick) {
          timer.quick = true;
        }
        this.add(timer);
      }
    });
    for (var i = 0; i < this.length; i++) {
      var timer=this[i];
      if (timer.still_valid(settings_timers)) {
        continue;
      }
      timer.disable();
      // remove from timers
      this.splice(i, 1);
      i--;
      delete this._lookup[timer.id];
      this.logger.debug(`timer ${timer.name} has been purged`);
    }
  }

  saveRunningTimers() {
    var running=[];
    this.sort_by_running().forEach( (timer) => {
      if (timer.running) {
        this.logger.debug("Saving running timer state id=%s start=%d end=%d", timer.id, timer._start, timer._end)
        var rstate = {
          id: timer.id,
          start: timer._start
        }
        running.push(rstate);
      }
    });
    this.settings.running = JSON.stringify(running);
  }

  restoreRunningTimers() {
    var json = this.settings.running;
    var running = JSON.parse(json);
    running.forEach( (rstate) => {
      var timer = this.getTimerById(rstate.id);
      if (timer) {
        timer.go(rstate.start);
      }
    });
  }

  getTimerById(id) {
    if (this._lookup[id] !== undefined) {
      return this._lookup[id];
    }
    this.logger.debug("timer %s not found in lookup table", id);
    for (var i=0; i < this.length; i++) {
      var t=this[i];
      if (t.id == id) {
        return t;
      }
    }
    return undefined;
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
  sorted(params={running:true}) {
    // const cloneSheepsES6 = [...sheeps];
    var timers_array = [...this];
    if (!params.running) {
      timers_array=timers_array.filter(timer => !timer.running);
    }
    if (this.sort_by_duration) {
      this.logger.debug('sort by duration');
      var direction= this.sort_descending ? -1 : 1;
      timers_array.sort( (a,b) => {
        return (a.duration-b.duration)*direction;
      });
    }
    return timers_array.filter(timer => (timer.enabled || timer.quick));
  }

  sort_by_running() {
    var running_timers = [...this].filter(timer => timer.running);

    //log(`running timers length=${running_timers.length}`);
    var now=Date.now();
    return running_timers.sort( (a,b) => {
      return a._end-b._end;
    });
  }

  timer_by_id(id) {
    var tbid = this.filter(timer => timer.id == id);
    return tbid.length == 0 ? null : tbid[0];
  }

  is_dupe(timer) {
    return this.get_dupe(timer) !== undefined;
  }

  get_dupe(timer) {
    if (!this.settings.detect_dupes) {
      return undefined;
    }
    for (var i=0; i < this.length; i++) {
      var t=this[i];
      if (timer.duration == t.duration && timer.quick == t.quick && timer.name == t.name) {
        return t;
      }
    }
    return undefined;
  }

  /**
   * Add the new timer, after checking that it has no dupes
   *
   * timer is the new timer to add to timers
   *
   * @returns the new timer if it is not the original, otherwise the dupe
   *     returns undefined if the timer could not be added
  */
  add_check_dupes(timer) {
    var tdupe = this.get_dupe(timer);
    if (tdupe !== undefined) {
      if (tdupe.running) {
        // original timer is running, notify user
        tdupe.notify(tdupe.name, _("Duplicate timer is already running"));
        return undefined;
      }
      // found a duplicate, just return the dupe
      return tdupe;
    }
    return this.add(timer) ? timer : undefined;
  }

  add(timer) {
    if (!timer.quick && timer.name.length == 0) {
      this.logger.warn('Refusing to create unnamed preset timer');
      return false;
    }
    if (timer.duration <= 0) {
      this.logger.warn(`Refusing to create zero length timer ${timer.name}`);
      return false;
    }

    this.logger.info(`Adding timer ${timer.name} of duration ${timer.duration} seconds quick=${timer.quick}`);
    this.push(timer);

    this._settings.pack_timers(this);
    this._lookup[timer.id] = timer;
    return true;
  }

  remove(timer) {
    for (var i = 0; i < this.length; i++) {
      if (timer.id !== this[i].id) {
        continue;
      }
      timer.disable();
      // remove from timers
      this.splice(i, 1);
      this.logger.debug("timer %s has been purged", timer.name);
      this.settings.pack_timers(this);
      delete this._lookup[timer.id];
      return true;
    }
    return false;
  }
}

// timers is a singleton class
var timersInstance = new Timers();
//Object.freeze(timersInstance);

var TimerState = {
  INIT: 0,
  RESET: 1,
  RUNNING: 2,
  EXPIRED: 3
}

class Timer {

  constructor(name, duration_secs, id=undefined) {
    var debug = timersInstance.settings.debug;
    this.logger = new Logger(`kt timer: ${name}`, debug);
    this.logger.info(`Create timer [${name}] duration=[${duration_secs}]`);
    this._enabled = true;
    this._quick = false;
    this._interval_ms = debug ? 500 : 250;
    this._duration_secs = duration_secs;
    this._state = TimerState.INIT;
    this._id = Utils.uuid(id);
    this._label = null;
    this._gicon = null;
    this._start = 0;
    this._end = 0;

    this._alarm_timer = AlarmTimer.matchRegex(name);

    // this calls the setter
    this.name = name;

    this._notifier = timersInstance._notifier;
  }

  toString() {
    return `name=${this._name} state=${this._state} start=${this._start} end=${this._end} duration=${this._duration_secs} iid=${this._interval_id}`;
  }

  static fromResult(result) {
    var timer = new Timer(result.name, result.hms.toSeconds());
    timer.quick = result.quick;
    timer.alarm_timer = result.alarm_timer;
    return timer;
  }

  get timers() {
    return timersInstance;
  }

  get id() {
    return this._id;
  }

  get enabled() {
    return this._enabled;
  }

  set enabled(bool) {
    this._enabled = false;
  }

  disable() {
    this._enabled = false;
  }

  get quick() {
    return this._quick;
  }

  set quick(bool) {
    this._quick = bool;
  }

  // Timer.new('foo', 50).name is 'foo'
  get name() {
    return this._name;
  }

  automatic_name(hms) {
    return hms.toName();
  }

  set name(name) {
    var hms = new HMS(this.duration);
    this._name = name.length > 0 ? name : this.automatic_name(hms);
    this._has_name = this._name != this.automatic_name(hms);
  }

  get has_name() {
    return this._has_name;
  }

  get duration() {
    if (this.alarm_timer) {
      return this.alarm_timer.hms().toSeconds();
    }
    return this._duration_secs;
  }

  set duration(duration) {
    this._duration_secs = duration;
  }

  duration_ms() {
    return this.duration * 1000;
  }

  // can be null if not initialized or closed
  get label() {
    return this._label;
  }

  // menu label or null if closed
  set label(label) {
    //this.logger.debug(label ? `Timer label set to ${label}`: 'Timer label set to null');
    this._label = label;
  }

  get alarm_timer() {
    return this._alarm_timer;
  }

  set alarm_timer(val) {
    this._alarm_timer = val;
  }

  label_progress(hms, now=0) {
    if (!this.label) {
      return;
    }

    this.label.set_text(hms.toString());
  }

  /*
    0
    1 - 15
    2 - 30
    3 - 45
    ...
    22 - 330
    23 - 345
    24 - 360
  */
  degree_progress(chunk=15) {
    if (this.running) {
      var chunks = Math.floor(360 / chunk);
      var delta = Date.now() - this._start;
      //this.logger.info(`chunk=${chunk} chunks=${chunks} delta=${delta} duration=${this.duration_ms()}`);
      var progress = Math.floor(delta / this.duration_ms() * chunks);
      return (progress)*chunk;
    }
    return 0;
  }

  icon_progress() {
    if (timersInstance.indicator === undefined) {
      return;
    }
    if (!timersInstance.settings.show_progress) {
      return;
    }
    var key = this.degree_progress();
    var gicon = timersInstance.indicator.progress_gicon(key);
    if (gicon !== this._gicon) {
      this._gicon = gicon;
		  var icon = new St.Icon({
        gicon: gicon,
        style_class: 'system-status-icon'
      });
		  //icon.set_icon_size(16);
		  var panel_box = timersInstance.box;
		  if (panel_box) {
        var current = panel_box.get_child_at_index(0);
        panel_box.replace_child(current, icon);
        current.destroy();
      }
    }
  }

  timer_callback(timer) {
    var now = Date.now();
    var end = timer._end;

    //timer.logger.debug(`test end=${end} at ${now}`);
    if (now > end) {
      timer.expired = true;
    }
    if (timer.expired || timer.reset) {
      return timer.stop_callback(now);
    }

    var delta = Math.ceil((end-now) / 1000);
    //log(`Timer [${timer._name}] has not ended: ${delta}`);
    var hms = new HMS(delta);
      timer.label_progress(hms, now);

      var running_timers = timersInstance.sort_by_running();
      if (running_timers.length > 0 && running_timers[0] == timer) {
        timer.icon_progress();

        timersInstance.set_panel_name(timer.name, timer.has_name);
        timersInstance.set_panel_label(hms.toString(true));

        timersInstance._active_timer = timer;
      }
    return true;
  }

  get running() {
    return (this._state === TimerState.RUNNING);
  }

  get expired() {
    return (this._state === TimerState.EXPIRED);
  }

  get reset() {
    return (this._state == TimerState.RESET);
  }

  set running(bool) {
    if (bool) { this._state = TimerState.RUNNING };
  }

  set expired(bool) {
    if (bool) { this._state = TimerState.EXPIRED; }
  }

  set reset(bool) {
    if (bool) { this._state = TimerState.RESET; }
  }

  stop_callback(now) {
    var early = now < this._end;

    // shouldn't be necessary, but we'll make sure
    if (early) {
      this.reset = true;
    } else {
      this.expired = true;
    }

    this.logger.info('Timer has ended state=%d', this._state);
    Utils.clearInterval(this._interval_id);
    this._interval_id = undefined;

    // TODO Notifications and play sounds
    var reason = early ? _("stopped early at") : _("completed at");
    var timer_string = _('Timer');

    var time=new Date(now).toLocaleTimeString();

    this._notifier.notify(this, "%s %s %s", timer_string, reason, time);
    var hms = new HMS(this.duration);

    this.label_progress(hms);
    this.icon_progress();

    timersInstance.set_panel_name("");
    timersInstance.set_panel_label("");
    timersInstance.saveRunningTimers();

    // return with false to stop interval callback loop
    return false;
  }

  stop() {
    this.reset = true;
  }

  start() {
    if (this._enabled || this._quick) {
      if (this.running) {
        this.logger.info(`Timer is already running, resetting`);
        // TODO prompt to reset
        this.reset = true;
        return false;
      }
      return this.go();
    }
    this.logger.info(`Timer is disabled`);
    return false;
  }

  go(start=undefined) {
    var prefix;
    if (start === undefined) {
      this._start = Date.now();
      prefix="Starting";
    } else {
      this._start = start;
      prefix="Restarting";
    }
    this._end = this._start + this.duration_ms();
    this._state = TimerState.RUNNING;

    timersInstance.saveRunningTimers();

    var quick=this._quick ? ' quick ' : ' ';
    this.logger.info("%s%stimer at %d", prefix, quick, start);
    this._interval_id = Utils.setInterval(this.timer_callback, this._interval_ms, this);
    return true;
  }

  refresh_with(settings_timer) {
    if (settings_timer.id == this.id) {
      this._name = settings_timer.name;
      this._duration_secs = settings_timer.duration;
      this._enabled = settings_timer.enabled;
      this._quick = settings_timer.quick;
      return true;
    }
    return false;
  }

  still_valid(settings_timers) {
    if (this.running || this.quick) {
      return true;
    }
    for (var i=0; i < settings_timers.length; i++) {
      var settings_timer = settings_timers[i];
      if (this._id == settings_timer.id) {
        return true;
      }
    }
    this.logger.debug(`Timer ${this.name} is no longer in settings`);
    return false;
  }

  notify(msg, ...args) {
    timersInstance.notifier.notify(this, msg, ...args);
  }

  delete() {
    this.timers.remove(this);
  }
}

