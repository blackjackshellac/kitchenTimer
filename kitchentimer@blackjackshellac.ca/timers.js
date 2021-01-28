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

const {GLib, St, Clutter, Gio} = imports.gi;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;

const Utils = Me.imports.utils;
const Settings = Me.imports.settings.Settings;
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

    this._settings = new Settings();
    this.logger = new Logger('kt timers', this.settings.debug);

    this._fullIcon = Gio.icon_new_for_string(Me.path+'/icons/kitchen-timer-blackjackshellac-full.svg');
    this._progressIconsDegrees = {};
    for (var deg = 0; deg <= 345; deg += 15) {
      // load icon as a gicon and store in the hash
      var icon_name="/icons/kitchen-timer-"+deg+".svg";
      var gicon = Gio.icon_new_for_string(Me.path+icon_name);
      this._progressIconsDegrees[deg] = gicon;
      this.logger.debug(`Loaded progress icon ${icon_name} for ${deg} degrees`);
    }

    // requires this._settings
    this._notifier = new Notifier.Annoyer(this);
  }

  static attach(indicator) {

    timersInstance.logger.info("Attaching indicator");

    timersInstance.indicator = indicator;
    timersInstance.logger = new Logger('kt timers', timersInstance.settings.debug);
    //timersInstance._notifier = new Notifier.Annoyer(timersInstance);

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

  progress_gicon(degrees) {
    var icon = this._progressIconsDegrees[degrees];
    if (icon === undefined) {
      this.logger.error(`Failed to get icon for degrees=${degrees}`);
      icon=this._progressIconsDegrees[0];
    }
    return icon;
  }

  get fullIcon() {
    return this._fullIcon;
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

  refresh() {
    this.logger.debug("Timers refresh");
    var settings_timers = this.settings.unpack_timers();
    settings_timers.forEach( (settings_timer) => {
      var id=settings_timer.id;
      var timer = this.lookup(id);
      if (timer) {
        timer.refresh_with(settings_timer);
        this.logger.debug("Found %s timer [%s]: %s",
            (timer.quick ? "quick" : "preset"),
            timer.name,
            (timer.running ? "running" : "not running"));
      } else {
        this.logger.debug("Timer [%s] not found, id=%s", settings_timer.name, settings_timer.id);
        timer = Timer.fromSettingsTimer(settings_timer);
        settings_timer.id = timer.id;
        this.add(timer);
      }
    });
    for (var i = 0; i < this.length; i++) {
      var timer=this[i];
      if (timer.still_valid(settings_timers)) {
        continue;
      }
      if (this.remove(timer, i)) {
        i--;
      }
    }
  }

  saveRunningTimers() {
    var running=[];
    this.sort_by_running().forEach( (timer) => {
      if (timer.running) {
        this.logger.debug("Saving running timer state id=%s start=%d", timer.id, timer._start);
        var run_state = {
          id: timer.id,
          start: timer._start
        }
        running.push(run_state);
      }
    });
    this.settings.running = JSON.stringify(running);
  }

  restoreRunningTimers() {
    var json = this.settings.running;
    var running = JSON.parse(json);
    running.forEach( (run_state) => {
      var timer = this.lookup(run_state.id);
      if (timer && !timer.running) {
        this.logger.debug("restore %s", timer.toString());
        timer.go(run_state.start);
      }
    });
  }

  lookup(id) {
    if (id === undefined || id.length === 0) {
      // new timer, not in lookup yet
      return undefined;
    }
    if (this._lookup[id] !== undefined) {
      return this._lookup[id];
    }
    this.logger.debug("timer %s not found in lookup table - shouldn't happen", id);

    // this shouldn't happen

    for (var i=0; i < this.length; i++) {
      var t=this[i];
      if (t.id == id) {
        this.logger.debug("adding timer to lookup hash %s:%s", t.name, t.id);
        this._lookup[id] = t;
        return t;
      }
    }
    this.logger.error("Timer id=[%s] not found", id);
    return undefined;
  }

  isEmpty() {
    this.length === 0;
  }

  get sort_by_duration() {
    return this.settings.sort_by_duration;
  }

  get sort_descending() {
    return this.settings.sort_descending;
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
        tdupe.notify(_("Duplicate timer is already running"));
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

    //this.logger.info(`Adding timer ${timer.name} of duration ${timer.duration} seconds quick=${timer.quick}`);
    this.logger.info("Adding timer [%s] of duration %d seconds [%s], quick=%s", timer.name, timer.duration, timer.id, timer.quick);
    this.push(timer);
    this._lookup[timer.id] = timer;

    this.settings.pack_timers(this);
    return true;
  }

  remove(timer, i=undefined) {
    if (i === undefined) {
      // we don't know index of timer
      i = this.indexOf(timer);
      if (i == -1) {
        return false;
      }
    }
    timer.disable();
    // remove from timers
    this.splice(i, 1);
    this.logger.debug("timer %s has been purged", timer.name);
    this.settings.pack_timers(this);
    delete this._lookup[timer.id];
    return true;
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
    this.logger = new Logger(`kt timer: ${this.name}`, debug);
    this.logger.info(`Create timer [${this.name}] duration=[${duration_secs}]`);

  }

  toString() {
    return "[%s:%s] state=%d start=%d end=%d dur=%d iid=%d".format(
      this._name, this._id,
      this._state,
      this._start,
      this._end,
      this._duration_secs,
      this._interval_id
    );
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

  end_time() {
    return new Date(this._end).toLocaleTimeString();
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
      var hms = this.alarm_timer.hms();
      return hms.toSeconds();
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
      // 360/15 = 24
      var chunks = Math.floor(360 / chunk);
      var delta = Date.now() - this._start;
      var progress = Math.floor(delta / this.duration_ms() * chunks);
      if (progress >= chunks) {
        progress = chunks-1;
      }
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
    var gicon = timersInstance.progress_gicon(key);
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
      //if (timer.expired) timer.logger.debug("timer expired stop_callback now=%d end=%d expired=%s", now, end);
      //if (timer.reset) timer.logger.debug("timer reset stop_callback")
      return timer.stop_callback(now);
    }

    var delta = Math.ceil((end-now) / 1000);
    //log(`Timer [${timer._name}] has not ended: ${delta}`);
    var hms = new HMS(delta);

    // if (timer.alarm_timer) {
    //   timersInstance.logger.debug("Timer %s has not ended: end=%d now=%d delta=%d hms=%s", timer.name, end, now, delta, hms.toString());
    // }
    timer.label_progress(hms, now);

    var running_timers = timersInstance.sort_by_running();
    if (running_timers.length > 0 && running_timers[0] == timer) {
      timer.icon_progress();

      timersInstance.set_panel_name(timer.name, timer.has_name);
      timersInstance.set_panel_label(hms.toString(true));
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
    var tdiff = now - this._end;
    var early = tdiff < 0;
    var late = tdiff > 2000;

    // shouldn't be necessary, but we'll make sure
    if (early) {
      this.reset = true;
      tdiff = -tdiff;
    } else {
      this.expired = true;
    }

    this.logger.info('Timer has ended %s: state=%d', early ? "early" : (late ? "late" : "on time"), this._state);
    Utils.clearInterval(this._interval_id);
    this._interval_id = undefined;

    var stdiff = early || late ? new HMS(tdiff/1000).toString(true) : "";
    var reason;
    var text = "%s due at %s".format(this.name, this.end_time())
    if (early) {
      reason = _("Timer stopped %s early at").format(stdiff);
    } else if (late) {
      reason = _("Timer completed %s late at").format(stdiff);
    } else {
      text = this.name;
      reason = _("Timer completed on time at");
    }

    var time=new Date(now).toLocaleTimeString();

    timersInstance.notifier.notify(this, text, "%s %s", reason, time);
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
        this.reset = true;
        return false;
      }
      return this.go();
    }
    this.logger.info(`Timer is disabled`);
    return false;
  }

  go(start=undefined) {
    var action;
    if (start === undefined) {
      this._start = Date.now();
      action="Starting";
    } else {
      this._start = start;
      action="Restarting";
    }
    // if (this.alarm_timer) {
    //   this.logger.debug("%s Timer is alarm timer: %s", action, this.alarm_timer.toString());
    //   this.logger.debug("Alarm timer %s", this.toString());
    // }
    this._end = this._start + this.duration_ms();
    this._state = TimerState.RUNNING;

    timersInstance.saveRunningTimers();

    var quick=this._quick ? ' quick ' : ' ';
    this.logger.info("%s%stimer at %d", action, quick, this._start);
    this._interval_id = Utils.setInterval(this.timer_callback, this._interval_ms, this);

    if (timersInstance.settings.play_sound || timersInstance.settings.volume_level_warn) {
      // array of { channel, level, percent, on }
      var msg="";
      var volume_threshold = timersInstance.settings.volume_threshold;
      var channel_volumes = timersInstance.notifier.check_volume(volume_threshold);
      if (channel_volumes) {
        channel_volumes.forEach( (channel_volume) => {
          msg += "<b>%s</b> channel volume low <i>%d%s</i>\r\n".format(channel_volume.channel, channel_volume.percent, "%%");
        });
        timersInstance.notifier.warning(this, this.name, msg);
      }
    }
    return true;
  }

  static fromSettingsTimer(settings_timer) {
    var timer = new Timer(settings_timer.name, settings_timer.duration, settings_timer.id);
    timer.quick = settings_timer.quick;
    settings_timer.id = timer.id;
    return timer;
  }

  refresh_with(settings_timer) {
    if (settings_timer.id == this.id) {
      this._name = settings_timer.name;
      this._duration_secs = settings_timer.duration;
      this._enabled = settings_timer.enabled;
      this._quick = settings_timer.quick;

      this._alarm_timer = AlarmTimer.matchRegex(this._name);
      if (this._alarm_timer && this.running) {
        this._end = Date.now() + this.duration_ms();
        //this.logger.debug("Alarm timer (%s) running for another %d seconds: end=%d", timer.alarm_timer.toString(), timer.duration, timer._end);
      }
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
    timersInstance.notifier.notify(this, this.name, msg, ...args);
  }

  delete() {
    this.timers.remove(this);
  }
}

