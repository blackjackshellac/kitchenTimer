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

const { Gio, Gtk, GLib } = imports.gi;

const Gettext = imports.gettext.domain('gnome-shell-extensions');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Settings = Me.imports.settings.Settings;
const Utils = Me.imports.utils;

class PreferencesBuilder {
    constructor() {
        this._settings = new Settings();
        this._builder = new Gtk.Builder();
    }

    build() {
        this._builder.add_from_file(Me.path + '/settings.ui');
        this._settingsBox = this._builder.get_object('kitchenTimer_settings');

        this._viewport = new Gtk.Viewport();
        this._viewport.add(this._settingsBox);
        this._widget = new Gtk.ScrolledWindow();
        this._widget.add(this._viewport);

        let file_chooser = this._bo('sound_path');

        if (file_chooser.current_folder == undefined) {
          file_chooser.current_folder = Me.path;
        }
        log("file chooser dir="+file_chooser.current_folder);
        let sound_file = this._settings.sound_file;
        if (GLib.basename(sound_file) == sound_file) {
          sound_file = GLib.build_filenamev([ Me.path, sound_file ]);
        }
        log("sound_file="+sound_file);
        file_chooser.set_filename(sound_file);

        file_chooser.connect('file-set', (user_data) => {
          log("file-set happened: "+user_data.get_filename());
          log(Object.getOwnPropertyNames(user_data));
          this._settings.sound_file = user_data.get_filename();
        });

        let timers_liststore = this._bo('timers_liststore');
        let timers_combo_entry = this._bo('timers_combo_entry');
        let entry_name = this._bo('entry_name');
        let spin_hours = this._bo('spin_hours');
        let spin_mins = this._bo('spin_mins');
        let spin_secs = this._bo('spin_secs');

        // TODO update with initial value
        this._hms = new Utils.HMS(0);

        spin_hours.connect('value-changed', (spin) => {
          this._hms.hours = spin.get_value_as_int();
          log(`duration=${this._hms.toSeconds()}`)
        });

        spin_mins.connect('value-changed', (spin) => {
          this._hms.minutes = spin.get_value_as_int();
          log(`duration=${this._hms.toSeconds()}`)
        });

        spin_secs.connect('value-changed', (spin) => {
          this._hms.seconds = spin.get_value_as_int();
          log(`duration=${this._hms.toSeconds()}`)
        });

        // this._builder.get_object('auto_power_off_settings_button').connect('clicked', () => {
        //     let dialog = new Gtk.Dialog({
        //         title: 'Auto power off settings',
        //         transient_for: this._widget.get_toplevel(),
        //         use_header_bar: true,
        //         modal: true
        //     });


        //     let box = this._builder.get_object('auto_power_off_settings');
        //     dialog.get_content_area().add(box);

        //     dialog.connect('response', (dialog) => {
        //         dialog.get_content_area().remove(box);
        //         dialog.destroy();
        //     });

        //     dialog.show_all();
        // });


        this._bind();

        return this._widget;
    }

    /**
     * Get Gtk Builder object by id
     */
    _bo(id) {
      return this._builder.get_object(id);
    }

    /**
     * Bind setting to builder object
     */
    _ssb(key, object, property, flags) {
      this._settings.settings.bind(key, object, property, flags);
    }

    _bind() {
      let notification = this._bo('notification');
      this._ssb('notification', notification, 'active', Gio.SettingsBindFlags.DEFAULT);

      let sound_loops = this._bo('sound_loops');
      this._ssb('sound-loops', sound_loops, 'value', Gio.SettingsBindFlags.DEFAULT);

      let sound_path = this._bo('sound_path');
      this._ssb('sound-file', sound_path, 'value', Gio.SettingsBindFlags.DEFAULT);

      let sort_by_duration = this._bo('sort_by_duration');
      this._ssb('sort-by-duration', sort_by_duration, 'active', Gio.SettingsBindFlags.DEFAULT);

      let sort_descending = this._bo('sort_descending');
      this._ssb('sort-descending', sort_descending, 'active', Gio.SettingsBindFlags.DEFAULT);

    }
}

function init() {
}

function buildPrefsWidget() {
  log("Create preferences widget and show it");
  let preferencesBuilder = new PreferencesBuilder();
  let widget = preferencesBuilder.build();
  widget.show_all();

  return widget;
}
