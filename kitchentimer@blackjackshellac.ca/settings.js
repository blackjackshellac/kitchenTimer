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
const Gio = imports.gi.Gio;
const GioSSS = Gio.SettingsSchemaSource;
const GLib = imports.gi.GLib;

// adapted from Bluetooth-quick-connect extension by Bartosz Jaroszewski
class Settings {
    constructor() {
        this.settings = this._loadSettings();
    }

    unpack_timers() {
      var timers_settings = [];
      var timers = this.settings.get_value('timers').deep_unpack();
      timers.forEach( (timer) => {
        timers_settings.push(this.to_h(timer));
      });
      return timers_settings;
    }

    // aa{sv}
    pack_timers(timers) {
      // create and array of GLib.Variant dicts with string key and GVariant values
      var atimers = [];
      timers.forEach( (timer) => {
        if (timer.enabled) {
          // don't save it's been disabled
          var atimer = GLib.Variant.new('a{sv}', this.pack_timer(timer));
          atimers.push(atimer);
        }
      });
      // TODO what if it's empty?
      var glvtype = atimers.length == 0 ? undefined : atimers[0].get_type();
      var pack = GLib.Variant.new_array(glvtype, atimers);
      this.settings.set_value('timers', pack);
    }

    pack_timer(timer) {
      var dict = {};
      dict.id = GLib.Variant.new_string(timer.id);
      dict.name = GLib.Variant.new_string(timer.name);
      dict.duration = GLib.Variant.new_int64(timer.duration);
      return dict;
    }

    to_h(timer_settings) {
      var h={};
      for (const [key, value] of Object.entries(timer_settings)) {
        h[key]=value.unpack();
      }
      return h;
    }

    get notification() {
      return this.settings.get_boolean('notification');
    }

    set notification(bool) {
      this.settings.set_boolean(bool);
    }

    get modal_notification() {
      return this.settings.get_boolean('modal-notification');
    }

    set modal_notification(bool) {
      this.settings.set_boolean(bool);
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

    get debug() {
      return this.settings.get_boolean('debug');
    }

    _loadSettings() {
        var extension = ExtensionUtils.getCurrentExtension();
        var schema = extension.metadata['settings-schema'];

        return new Gio.Settings({schema: schema});
        /*
        let schemaSource = GioSSS.new_from_directory(
            extension.dir.get_child('schemas').get_path(),
            GioSSS.get_default(),
            false
        );

        let schemaObj = schemaSource.lookup(schema, true);

        log("schema loaded");

        return new Gio.Settings({settings_schema: schemaObj});
        */
    }
}
