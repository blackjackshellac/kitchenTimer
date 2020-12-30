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
const Logger = Me.imports.utils.Logger;

class PreferencesBuilder {
    constructor() {
        this._settings = new Settings();
        this._builder = new Gtk.Builder();
        this.logger = new Logger('kitchen-timer-prefs', this._settings.debug);
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
        this.logger.debug("file chooser dir="+file_chooser.current_folder);
        let sound_file = this._settings.sound_file;
        if (GLib.basename(sound_file) == sound_file) {
          sound_file = GLib.build_filenamev([ Me.path, sound_file ]);
        }
        this.logger.debug("sound_file="+sound_file);
        file_chooser.set_filename(sound_file);

        file_chooser.connect('file-set', (user_data) => {
          this.logger.debug("file-set happened: "+user_data.get_filename());
          this.logger.debug(Object.getOwnPropertyNames(user_data));
          this._settings.sound_file = user_data.get_filename();
        });

        this.timers_liststore = this._bo('timers_liststore');
        this.timers_combo = this._bo('timers_combo');
        this.timers_combo_entry = this._bo('timers_combo_entry');
        //let entry_name = this._bo('entry_name');
        this.spin_hours = this._bo('spin_hours');
        this.spin_mins = this._bo('spin_mins');
        this.spin_secs = this._bo('spin_secs');

        //this.timers_apply = this._bo('timers_apply');
        this.timers_add = this._bo('timers_add');
        this.timers_remove = this._bo('timers_remove');
        this.timer_enabled = this._bo('timer_enabled');

        // TODO update with initial value
        this._hms = new Utils.HMS(0);

        var timer_settings = this._settings.unpack_timers();
        timer_settings.forEach( (timer) => {
          var iter = this.timers_liststore.append();
          //log(`Timer ${Object.keys(timer)}`);
          this.timers_liststore.set_value(iter, 0, timer.name);
          this.timers_liststore.set_value(iter, 1, timer.id);
          this.timers_liststore.set_value(iter, 2, timer.duration);
          this.timers_liststore.set_value(iter, 3, timer.enabled);
        });

        this.timers_combo.set_active(0);
        this.timers_combo.connect('changed', (combo) => {
          var [ ok, iter ] = combo.get_active_iter();
          var entry = this.timers_combo_entry.get_text();
          this.logger.debug(`combo changed: ${entry} ${ok} ${iter}`);

          this._update_timers_tab_from_model(combo, entry);
          //log('timers combo changed');
        });

        this._update_timers_tab_from_model(this.timers_combo);

        this.spin_hours.connect('value-changed', (spin) => {
          if (this._update_active_liststore_from_tab()) {
            this._save_liststore();
          }
         });

        this.spin_mins.connect('value-changed', (spin) => {
          if (this._update_active_liststore_from_tab()) {
            this._save_liststore();
          }
        });

        this.spin_secs.connect('value-changed', (spin) => {
          if (this._update_active_liststore_from_tab()) {
            this._save_liststore();
          }
        });

        this.timer_enabled.connect('toggled', () => {
          if (this._update_active_liststore_from_tab()) {
            this._save_liststore();
          }
        });

        // this.timers_combo.connect('editing-done', (combo) => {
        //   var [ ok, iter ] = combo.get_active_iter();
        //   log(`editing done: ${ok} ${iter}`);
        // });

        this.timers_combo.connect('set-focus-child', (combo) => {
          var [ ok, iter ] = combo.get_active_iter();
          var child = combo.get_focus_child();
          this.logger.debug(`current child focus=${child}, ok=${ok}`);
          if (child == null) {
            var entry = this.timers_combo_entry.get_text();
            this.logger.debug(`child lost focus, entry=${entry}`);
            this._update_combo_entry(combo, this._iter, entry);
            combo.set_active_iter(this._iter);
            this.timers_liststore.set_value(this._iter, 0, this.timers_combo_entry.get_text());
            if (this._update_active_liststore_from_tab()) {
              this._save_liststore();
            }
          } else if (ok) {
            this.logger.debug('combox box iter saved');
            this._iter = iter;
          } else {
            this.logger.debug('combo box does not have an active iter: current='+this._iter);
          }

        });

        this.timers_remove.connect('clicked', () => {
          var [ ok, iter ] = this.timers_combo.get_active_iter();
          if (ok) {
            var model = this.timers_combo.get_model();
            this.logger.debug('Removing active entry');
            this._iter = null;
            if (!model.remove(iter)) {
              var [ok, iter] = model.get_iter_first();
              if (ok) {
                this.logger.debug('Set combo to first item');
                this.timers_combo.set_active(0);
              }
            }
            if (this._update_active_liststore_from_tab()) {
              this._save_liststore();
            }
          }
        });

        this.timers_add.connect('clicked', () => {
          this.logger.debug('Add new timer');
          var iter = this.timers_liststore.append();

          //log(`Timer ${Object.keys(timer)}`);
          this.timers_liststore.set_value(iter, 0, ""); // name
          this.timers_liststore.set_value(iter, 1, Utils.uuid());   // id
          this.timers_liststore.set_value(iter, 2, 0);           // duration
          this.timers_liststore.set_value(iter, 3, true);        // enabled

          var index = this.timers_liststore.iter_n_children(null);

          //iter = this.timers_liststore.iter_nth_child(null, index-1);
          var model = this.timers_combo.get_model();
          iter = model.iter_nth_child(null, index-1);
          this.logger.debug(`liststore rows=${index} 0=${iter[0]} 1=${iter[1]}`);
          this._iter = iter[1];
          this.timers_combo.set_active_iter(this._iter);
          this._update_timers_tab_from_model(this.timers_combo);
        });

        this._bind();

        return this._widget;
    }

    _update_combo_entry(combo, iter, entry) {
      var model = combo.get_model();
      var name = model.get_value(iter, 0);
      this.logger.debug(`Update model entry from ${name} to ${entry}`);
      model.set_value(iter, 0, entry);
    }

    // restore true if the liststore was updated
    _update_active_liststore_from_tab() {
      var [ ok, iter ] = this.timers_combo.get_active_iter();
      if (ok) {
          var model = this.timers_combo.get_model();

          var hms = new Utils.HMS();
          hms.hours = this.spin_hours.get_value_as_int();
          hms.minutes = this.spin_mins.get_value_as_int();
          hms.seconds = this.spin_secs.get_value_as_int();

          var name = this.timers_combo_entry.get_text();
          var id = model.get_value(iter, 1);
          id = Utils.uuid(id);
          var enabled = this.timer_enabled.get_active();
          var duration = hms.toSeconds();

          ok = false;
          if (model.get_value(iter, 0) !== name) {
            this.logger.debug(`name change to ${name}`);
            ok = true;
            model.set_value(iter, 0, name);
          }
          if (model.get_value(iter, 1) !== id) {
            this.logger.debug(`id changed to ${id}`);
            ok = true;
            model.set_value(iter, 1, id);
          }
          if (model.get_value(iter, 2) !== duration) {
            this.logger.debug(`duation changed to ${duration}`);
            ok = true;
            model.set_value(iter, 2, duration);
          }
          if (model.get_value(iter, 3) !== enabled) {
            this.logger.debug(`enabled changed to ${enabled}`);
            ok = true;
            model.set_value(iter, 3, enabled);
          }
          if (ok) {
            this.logger.debug(`Updating liststore for current entry`);
          }
      } else {
        this.logger.debug('cannot update liststore entry, combo has no active iter');
      }
      return ok;
    }

    _save_liststore(pack=true) {
      var model = this.timers_combo.get_model();
      var [ok, iter] = model.get_iter_first();

      var timers = [];
      while (ok) {

        var timer={};
        timer.name = model.get_value(iter, 0);
        timer.id = model.get_value(iter, 1);
        timer.duration = model.get_value(iter, 2);
        timer.enabled = model.get_value(iter, 3);

        this.logger.debug(`Updating ${timer.name} ${timer.duration} ${timer.enabled}`);

        timers.push(timer);

        ok = model.iter_next(iter);
      }

      if (pack) {
        this.logger.debug('Saving updated timers to settings');
        this._settings.pack_timers(timers);
      }
    }

    _update_active_listore_entry(timer) {
      var iter = this.timers_combo.get_active_iter();
      iter = iter[0] ? iter[1] : this._iter;
      if (iter) {
          this.timers_liststore.set_value(iter, 0, timer.name);
          this.timers_liststore.set_value(iter, 1, timer.id);
          this.timers_liststore.set_value(iter, 2, timer.duration);
          this.timers_liststore.set_value(iter, 3, timer.enabled);
      } else {
        this.logger.debug('cannot update liststore entry, combo has no active iter');
      }
    }

    _get_active_liststore_entry() {
      var model = this.timers_combo.get_model();
      var iter = this.timers_combo.get_active_iter();
      iter = iter[0] ? iter[1] : this._iter;
      var timer = {}
      if (iter) {
        timer.name = model.get_value(iter, 0);
        timer.id = model.get_value(iter, 1);
        timer.duration = model.get_value(iter, 2);
        timer.enabled = model.get_value(iter, 3);
      } else {
        this.logger.debug('cannot get active liststore entry, combo has no active iter');
      }
      return timer;
    }

    _update_timers_tab_from_model(timers_combo, entry=undefined) {
      // TODO fix this duplication
      var model = timers_combo.get_model();
      var [ ok, iter ] = timers_combo.get_active_iter();
      iter = ok ? iter : this._iter;
      if (iter) {
        var name = model.get_value(iter, 0);
        if (entry !== undefined && entry !== name) {
          name = entry;
          model.set_value(iter, 0, name);
          this._save_liststore(true);
        }
        var id = model.get_value(iter, 1);
        var duration = model.get_value(iter, 2);
        var enabled = model.get_value(iter, 3);
        var hms = new Utils.HMS(duration);
        this._update_spinners(hms);
      } else {
        this.logger.debug("cannot update combo from liststore, combo has non active iter");
      }
    }

    _update_spinners(hms) {
      this.spin_hours.set_value(hms.hours);
      this.spin_mins.set_value(hms.minutes);
      this.spin_secs.set_value(hms.seconds);
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
    _ssb(key, object, property, flags=Gio.SettingsBindFlags.DEFAULT) {
      if (object) {
        this._settings.settings.bind(key, object, property, flags);
      } else {
        this.logger.error(`object is null for key=${key}`);
      }
    }

    _bind() {
      let notification = this._bo('notification');
      this._ssb('notification', notification, 'active');

      let show_time = this._bo('show_time');
      this._ssb('show-time', show_time, 'active');

      let show_pie = this._bo('show-pie');
      this._ssb('show-pie', show_pie, 'active');

      let play_sound = this._bo('play_sound');
      this._ssb('play-sound', play_sound, 'active');

      let sound_loops = this._bo('sound_loops');
      this._ssb('sound-loops', sound_loops, 'value');

      let sound_path = this._bo('sound_path');
      this._ssb('sound-file', sound_path, 'value');

      let sort_by_duration = this._bo('sort_by_duration');
      this._ssb('sort-by-duration', sort_by_duration, 'active');

      let sort_descending = this._bo('sort_descending');
      this._ssb('sort-descending', sort_descending, 'active');
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
