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
const Logger = Me.imports.utils.Logger;

const date_options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };

class Timers extends Array {
  constructor(...args) {
    super(...args);

    this.logger = new Logger('kt timers', true);
  }

  static attach(indicator) {

    timersInstance.indicator = indicator;
    timersInstance._settings = indicator._settings;
    timersInstance.logger = new Logger('kt timers', timersInstance.settings.debug);
    timersInstance._notifier = new Notifier.Annoyer(timersInstance.settings);

    //timersInstance.logger.info("Attaching indicator "+indicator);

    timersInstance.refresh();

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

  get settings() {
    return this._settings;
  }

  get box() {
    return this.indicator === undefined ? undefined : this.indicator._box;
  }

  get panel_label() {
    return this.indicator === undefined ? undefined : this.indicator._panel_label;
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
          this.logger.debug(`Found timer [${timer.name}]: ${running}`);
          if (timer.is_running()) {
            this.logger.debug(timer.toString());
          }
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
    return timers_array.filter(timer => (timer.enabled || timer.quick));
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
    if (timer.name.length == 0) {
      this.logger.warn(`Refusing to create unnamed timer`);
      return false;
    }
    if (timer.duration <= 0) {
      this.logger.warn(`Refusing to create zero length timer ${timer.name}`);
      return false;
    }
    this.logger.info(`Adding timer ${timer.name} of duration ${timer.duration} seconds quick=${timer.quick}`);
    this.push(timer);

    this._settings.pack_timers(this);
    return true;
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
    var debug = timersInstance.settings.debug;
    this.logger = new Logger(`kt timer: ${name}`, debug);
    this.logger.info(`Create timer [${name}] duration=[${duration_secs}]`);
    this._enabled = true;
    this._quick = false;
    this._interval_ms = debug ? 500 : 250;
    this._name = name;
    this._duration_secs = duration_secs;
    this._state = TimerState.RESET;
    this._id = Utils.uuid(id);
    this._label = null;
    this._gicon = null;
    this._start = 0;
    this._end = 0;

    this._notifier = timersInstance._notifier;
  }

  toString() {
    return `name=${this._name} state=${this._state} start=${this._start} end=${this._end} duration=${this._duration_secs} iid=${this._interval_id}`;
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

  set name(name) {
    this._name = name;
  }

  get duration() {
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

  // get moon() {
  //   this._moon.set_text('🌑');
  //   return this._moon;
  // }

  // set moon(label) {
  //   this._moon = label;
  // }

  label_progress(hms, now=0) {
    if (!this.label) {
      return;
    }

    // ⏳⌛⏰
		// 🌑  🌒  🌓  🌔  🌕  🌖  🌗  🌘
		// 8/8 1/8 2/8 3/8 4/8 5/8 6/8 7/8
    // (now-this._start) / this.duration_ms

    // const moons = [ '🌖', '🌗', '🌘', '🌑', '🌒', '🌓', '🌔', '🌕' ];
    //const moons = [ '⏳', '⌛' ];
    // const mlen = moons.length;

    // var moon;
    // if (now === 0) {
    //   moon = '🌑';
    // } else {
    //   var idx = Math.floor((now-this._start) / this.duration_ms() * mlen);
    //   if (idx > mlen) {
    //     idx = mlen;
    //   }
    //   moon = moons[idx];
    // }
    //this.logger.info(`moons index=${idx} now=${now} start=${this._start} duration=${this.duration_ms()}`);
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
    if (this.is_running()) {
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
		  if (timersInstance.box) {
        var current = timersInstance.box.get_child_at_index(0);
        if (current !== icon) {
          timersInstance.box.replace_child(current, icon);
        }
      }
    }
  }

  timer_callback(timer) {
    var now = Date.now();
    var end = timer._end;

    //timer.logger.debug(`test end=${end} at ${now}`);
    if (now > end || !timer.is_running()) {
      return timer.stop_callback(now);
    }

    var delta = Math.ceil((end-now) / 1000);
    //log(`Timer [${timer._name}] has not ended: ${delta}`);
    var hms = new Utils.HMS(delta);
      timer.label_progress(hms, now);

      var running_timers = timersInstance.sort_by_remaining();
      if (running_timers.length > 0 && running_timers[0] == timer) {
        timer.icon_progress();
        var panel_label = timersInstance.panel_label;
        if (panel_label && (timersInstance._settings.show_time || timersInstance._settings.show_label)) {
          var text = "";
          if (timersInstance._settings.show_label) {
            text=timer.name+" ";
          }
          if (timersInstance._settings.show_time) {
            text += hms.toString(true);
          }
          panel_label.set_text(text);
        }
        timersInstance._active_timer = timer;
      }
    return true;
  }

  is_running() {
    return (this._state == TimerState.RUNNING);
  }

  stop_callback(now) {
    this._state = TimerState.EXPIRED;
    this.logger.info('Timer has ended');
    Utils.clearInterval(this._interval_id);
    this._interval_id = undefined;

    // TODO Notifications and play sounds
    var reason = now < this._end ? _("stopped early at") : "completed at"
    var timer_string = _('Timer');

    now = new Date(now);
    var time=now.toLocaleTimeString();

    this._notifier.annoy(`${timer_string} [${this._name}] ${reason} ${time}`);
    var hms = new Utils.HMS(this.duration);

    this.label_progress(hms);
    this.icon_progress();

    var panel_label = timersInstance.panel_label
    if (panel_label) {
      panel_label.set_text("");
    }

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
    if (this._enabled || this._quick) {
      if (this._state == TimerState.RUNNING) {
        this.logger.info(`Timer is already running, resetting`);
        // TODO prompt to reset
        this.reset();
        return false;
      }
      return this.go();
    }
    this.logger.info(`Timer is disabled`);
    return false;
  }

  go() {
    this._start = Date.now();
    this._end = this._start + this.duration_ms();
    this._state = TimerState.RUNNING;

    var quick=this._quick ? ' quick ' : ' ';
    this.logger.info(`Starting${quick}timer at ${this._start}`);
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
