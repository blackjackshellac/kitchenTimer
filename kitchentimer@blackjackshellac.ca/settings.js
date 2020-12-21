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

// adapted from Bluetooth-quick-connect extension by Bartosz Jaroszewski
class Settings {
    constructor() {
        this.settings = this._loadSettings();

        var timers = this.settings.get_value('timers').deep_unpack();
        log("timers");
        timers.forEach(function (timer) {
          log("timer="+timer);
          for (const [key, value] of Object.entries(timer)) {
            var val=value.unpack();
            var type=value.get_type();
            switch(key) {
              case 'id':
                //val=value.get_string();
                break;
              case 'name':
                //val=value.get_string();
                break;
              case 'duration':
                //val=value.get_int16();
                break;
            }

            log(`${key}: value=${val}`);
          }
        });
    }

    get play_sound_loops() {
      return this.settings.get_int('play-sound-loop');
    }

    set play_sound_loops(loops) {
      this.settings.set_int('play-sound-loop', loops);
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
