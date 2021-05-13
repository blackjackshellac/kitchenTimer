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
const Gio = imports.gi.Gio;
const GioSSS = Gio.SettingsSchemaSource;
const GLib = imports.gi.GLib;

const Me = ExtensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const Logger = Me.imports.logger.Logger;

// adapted from Bluetooth-quick-connect extension by Bartosz Jaroszewski
var Settings = class Settings {
  constructor() {
    // try to recompile the schema
    let compile_schemas = [ Me.path+"/bin/compile_schemas.sh" ];
    let [ exit_status, stdout, stderr ] = Utils.execute(compile_schemas);

    this.settings = ExtensionUtils.getSettings();
    this.logger = new Logger('kt settings', this.settings);

    if (exit_status !== 0) {
      this.logger.warn("Failed to compile schemas: %s\n%s", stdout, stderr);
    } else {
      this.logger.debug("compile_schemas: %s", stdout);
    }

    this._timer_defaults = {
      name: "",
      id: "",
      duration: 120,
      enabled: true,
      quick: false
    }
  }

  unpack_preset_timers(settings_timers=[]) {
    var timers = this.settings.get_value('timers').deep_unpack();
    timers.forEach( (timer) => {
      var timer_h = this.unpack_timer(timer, false);
      settings_timers.push(timer_h);
    });
    return settings_timers;
  }

  unpack_quick_timers(settings_timers=[]) {
    var timers = this.settings.get_value('quick-timers').deep_unpack();
    timers.forEach( (timer) => {
      var timer_h = this.unpack_timer(timer, true);
      settings_timers.push(timer_h);
    });
    return settings_timers;
  }

  unpack_timers() {
    var settings_timers = this.unpack_preset_timers([]);
    if (this.save_quick_timers) {
      this.unpack_quick_timers(settings_timers);
    }
    //Utils.logObjectPretty(settings_timers);
    return settings_timers;
  }

  unpack_timer(timer_settings, quick) {
    var h={};
    for (const [key, value] of Object.entries(timer_settings)) {
      h[key]=value.unpack();
    }
    h.quick = quick;

    for (const [key, value] of Object.entries(this._timer_defaults)) {
      if (h[key] === undefined) {
        h[key] = value;
      }
    }

    return h;
  }

  pack_preset_timers(timers) {
    var atimers = [];
    timers.forEach( (timer) => {
      if (!timer.quick && timer.duration > 0) {
        this.logger.debug(`Saving preset timer ${timer.name}}`);
        var atimer = GLib.Variant.new('a{sv}', this.pack_timer(timer, false));
        atimers.push(atimer);
      }
    });
    var glvtype = atimers.length == 0 ? GLib.Variant.new('a{sv}').get_type() : atimers[0].get_type();
    var pack = GLib.Variant.new_array(glvtype, atimers);
    this.settings.set_value('timers', pack);
  }

  pack_quick_timers(timers) {
    this.logger.debug(`Saving quick timers`);
    var atimers = [];
    timers.forEach( (timer) => {
      if (timer.quick && timer.duration > 0) {
        this.logger.debug(`Saving quick timer ${timer.name}`);
        var atimer = GLib.Variant.new('a{sv}', this.pack_timer(timer, true));
        atimers.push(atimer);
      }
    });
    var glvtype = atimers.length == 0 ? GLib.Variant.new('a{sv}').get_type() : atimers[0].get_type();
    var pack = GLib.Variant.new_array(glvtype, atimers);
    this.settings.set_value('quick-timers', pack);
  }

  // aa{sv}
  pack_timers(timers) {
    // create and array of GLib.Variant dicts with string key and GVariant values
    var atimers = [];
    timers.forEach( (timer) => {
      if (!timer.quick && timer.duration > 0) {
        this.logger.debug("Saving preset timer %s:%s", timer.name, timer.id);
        var atimer = GLib.Variant.new('a{sv}', this.pack_timer(timer, false));
        atimers.push(atimer);
      }
    });
    var glvtype = atimers.length == 0 ? GLib.Variant.new('a{sv}').get_type() : atimers[0].get_type();
    var pack = GLib.Variant.new_array(glvtype, atimers);
    this.settings.set_value('timers', pack);

    if (this.save_quick_timers) {
      this.logger.debug(`Saving quick timers`);
      var atimers = [];
      timers.forEach( (timer) => {
        if (timer.quick && timer.duration > 0) {
          this.logger.debug(`Saving quick timer ${timer.name}`);
          var atimer = GLib.Variant.new('a{sv}', this.pack_timer(timer, true));
          atimers.push(atimer);
        }
      });
      var glvtype = atimers.length == 0 ? GLib.Variant.new('a{sv}').get_type() : atimers[0].get_type();
      var pack = GLib.Variant.new_array(glvtype, atimers);
      this.settings.set_value('quick-timers', pack);
    }
  }

  pack_timer(timer, quick) {
    if (timer.quick != quick) {
      this.logger.debug(`Don't pack timer ${timer.name} ${timer.quick}`);
      return undefined;
    }
    var dict = {};
    dict.id = GLib.Variant.new_string(timer.id);
    dict.name = GLib.Variant.new_string(timer.name);
    dict.duration = GLib.Variant.new_int64(timer.duration);
    dict.enabled = GLib.Variant.new_boolean(timer.enabled);
    return dict;
  }

  export_json() {
    this.logger.info("Export settings to json");
    var h={
      accel_enable: this.accel_enable,
      accel_show_endtime: this.accel_show_endtime,
      accel_stop_next: this.accel_stop_next,
      debug: this.debug,
      detect_dupes: this.detect_dupes,
      inhibit: this.inhibit,
      inhibit_max: this.inhibit_max,
      notification_sticky: this.notification_sticky,
      notification: this.notification,
      notification_longtimeout: this.notification_longtimeout,
      play_sound: this.play_sound,
      prefer_presets: this.prefer_presets,
      save_quick_timers: this.save_quick_timers,
      show_endtime: this.show_endtime,
      show_label: this.show_label,
      show_progress: this.show_progress,
      show_time: this.show_time,
      sort_by_duration: this.sort_by_duration,
      sort_descending: this.sort_descending,
      sound_file: this.sound_file,
      sound_loops: this.sound_loops,
      volume_level_warn: this.volume_level_warn,
      volume_threshold: this.volume_threshold,
      quick_timers: this.unpack_quick_timers([]),
      timers: this.unpack_preset_timers([])
    }
    return JSON.stringify(h, null, 2);
  }

  import_json(json) {
    this.logger.info("Import json to settings");
    var obj = JSON.parse(json.replace( /[\r\n]+/gm, " "));
    for (let [key, value] of Object.entries(obj)) {
      key=key.replace(/_/g, '-');
      this.logger.info("Import setting %s=%s (%s)", key, value, value.constructor.name);
      switch(key) {
        case 'timers':
          this.pack_preset_timers(value);
          break;
        case 'quick-timers':
          this.pack_quick_timers(value);
          break;
        case 'accel-show-endtime':
        case 'accel-stop-next':
        case 'sound-file':
          this.settings.set_string(key, value);
          break;
        case 'sound-loops':
        case 'notification-longtimeout':
        case 'prefer-presets':
        case 'inhibit':
        case 'inhibit-max':
          this.settings.set_int(key, value);
          break;
        default:
          this.settings.set_boolean(key, value);
          break;
      }

    }
  }

  get_default(key) {
    return this.settings.get_default_value(key);
  }

  get accel_enable() {
    return this.settings.get_boolean('accel-enable');
  }

  set accel_enable(bool) {
    this.settings.set_boolean('accel-enable', bool);
  }

  get accel_show_endtime() {
    return this.settings.get_string('accel-show-endtime');
  }

  set accel_show_endtime(val) {
    this.settings.set_string('accel-show-endtime', val);
  }

  get accel_stop_next() {
    return this.settings.get_string('accel-stop-next');
  }

  set accel_stop_next(val) {
    this.settings.set_string('accel-stop-next', val);
  }

  get inhibit() {
    return this.settings.get_int('inhibit');
  }

  set inhibit(val) {
    this.settings.set_int('inhibit', val);
  }

  get inhibit_max() {
    return this.settings.get_int('inhibit-max');
  }

  set inhibit_max(val) {
    this.settings.set_int('inhibit-max', val);
  }

  get notification() {
    return this.settings.get_boolean('notification');
  }

  set notification(bool) {
    this.settings.set_boolean(bool);
  }

  get notification_sticky() {
    return this.settings.get_boolean('notification-sticky');
  }

  set notification_sticky(bool) {
    this.settings.set_boolean(bool);
  }

  get notification_longtimeout() {
    return this.settings.get_int('notification-longtimeout');
  }

  set notification_longtimeout(val) {
    this.settings.set_int('notification-longtimeout', val);
  }

  get show_time() {
    return this.settings.get_boolean('show-time');
  }

  set show_time(bool) {
    this.settings.set_boolean('show-time', bool);
  }

  get show_endtime() {
    return this.settings.get_boolean('show-endtime');
  }

  set show_endtime(bool) {
    this.settings.set_boolean('show-endtime', bool);
  }

  get show_label() {
    return this.settings.get_boolean('show-label');
  }

  set show_label(bool) {
    return this.settings.set_boolean('show-label', bool);
  }

  get show_progress() {
    return this.settings.get_boolean('show-progress');
  }

  set show_progress(bool) {
    this.settings.set_boolean('show-progress', bool);
  }

  get play_sound() {
    return this.settings.get_boolean('play-sound');
  }

  set play_sound(bool) {
    this.settings.set_boolean('play-sound', bool);
  }

  get sound_loops() {
    return this.settings.get_int('sound-loops');
  }

  set sound_loops(loops) {
    this.settings.set_int('sound-loops', loops);
  }

  get sound_file() {
    return this.settings.get_string('sound-file');
  }

  set sound_file(path) {
    this.settings.set_string('sound-file', path);
  }

  get timers() {
    this.settings.get_value('timers').deep_unpack();
  }

  get default_timer() {
    return this.settings.get_int('default-timer');
  }

  set default_timer(val) {
    this.settings.set_int('default-timer', val);
  }

  get sort_by_duration() {
    return this.settings.get_boolean('sort-by-duration');
  }

  set sort_by_duration(bool) {
    this.settings.set_boolean('sort-by-duration', bool);
  }

  get sort_descending() {
    return this.settings.get_boolean('sort-descending');
  }

  set sort_descending(bool) {
    this.settings.set_boolean('sort-descending', bool);
  }

  get save_quick_timers() {
    return this.settings.get_boolean('save-quick-timers');
  }

  set save_quick_timers(bool) {
    this.settings.set_boolean('save-quick-timers', bool);
  }

  get detect_dupes() {
    return this.settings.get_boolean('detect-dupes');
  }

  set detect_dupes(bool) {
    this.settings.set_boolean('detect-dupes', bool);
  }

  get running() {
    return this.settings.get_string('running');
  }

  set running(json) {
    this.settings.set_string('running', json);
  }

  get volume_level_warn() {
    return this.settings.get_boolean('volume-level-warn');
  }

  set volume_level_warn(bool) {
    this.settings.set_boolean('volume-level-warn', bool);
  }

  get volume_threshold() {
    return this.settings.get_int('volume-threshold');
  }

  set volume_threshold(val) {
    this.settings.set_int('volume-threshold', val);
  }

  get prefer_presets() {
    return this.settings.get_int('prefer-presets');
  }

  set prefer_presets(val) {
    if (val > 10) { val = 10; }
    else if (val < -10) { val = -10; }
    this.settings.set_int('prefer-presets', val);
  }

  get debug() {
    return this.settings.get_boolean('debug');
  }

  set debug(bool) {
    this.settings.set_boolean('debug', bool);
  }

};
