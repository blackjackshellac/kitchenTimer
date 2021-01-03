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

const Model = {
  NAME: 0,
  ID: 1,
  DURATION: 2,
  ENABLED: 3
}

class PreferencesBuilder {
    constructor() {
        this._settings = new Settings();
        this._builder = new Gtk.Builder();
        this.logger = new Logger('kt prefs', this._settings.debug);
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
        timer_settings.sort( (a,b) => {
          return (a.duration-b.duration);
        });
        timer_settings.forEach( (timer) => {
          var iter = this.timers_liststore.append();
          //log(`Timer ${Object.keys(timer)}`);
          this.timers_liststore.set_value(iter, Model.NAME, timer.name);
          this.timers_liststore.set_value(iter, Model.ID, timer.id);
          this.timers_liststore.set_value(iter, Model.DURATION, timer.duration);
          this.timers_liststore.set_value(iter, Model.ENABLED, timer.enabled);
        });

        this.allow_updates = true;
        this.timers_combo.set_active(0);
        this.timers_combo.connect('changed', (combo) => {
          var [ ok, iter ] = combo.get_active_iter();
          if (ok) {
            var model = combo.get_model();
            var name = model.get_value(iter, Model.NAME);
            var entry = this.timers_combo_entry.get_text();
            this.logger.debug(`combo changed: ${name}:${entry} ${ok}`);
            if (this.allow_updates) {
              this._update_timers_tab_from_model(combo, entry);
            }
          }
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

        this.timers_combo.connect('set-focus-child', (combo, child) => {
          var [ ok, iter ] = combo.get_active_iter();
          this.logger.debug(`current child focus=${child}, ok=${ok} iter=${iter}`);
          if (child == null) {
            iter = ok ? iter : this._iter;
            this.allow_updates=false;
            var entry = this.timers_combo_entry.get_text();
            this.logger.debug(`child lost focus, entry=${entry}`);
            this._update_combo_model_entry(combo, iter, entry);
            combo.set_active_iter(iter);
            //this.timers_liststore.set_value(iter, Model.NAME, this.timers_combo_entry.get_text());
            this.allow_updates=true;
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

        this.timers_combo_entry.connect('activate', (combo_entry) => {
          var [ ok, iter ] = this.timers_combo.get_active_iter();
          this.logger.debug(`Got activate ${ok}`);
        });

        //this._current_iter = undefined;
        this.timers_combo_entry.connect('focus-in-event', (combo_entry) => {
          var [ ok, iter ] = this.timers_combo.get_active_iter();
          this.logger.debug(`Got focus-in-event ${ok} ${iter}`);
          if (ok) {
            this._current_iter = iter;
          }
        });

        this.timers_combo_entry.connect('focus-out-event', (combo_entry) => {
          var [ ok, iter ] = this.timers_combo.get_active_iter();
          this.logger.debug(`Got focus-out-event ${ok} ${iter} ${this._current_iter}`);
          if (ok) {
          } else if (this._current_iter) {
          }
          this._current_iter = undefined;
        });

        this.timers_remove.connect('clicked', () => {
          var [ ok, iter ] = this.timers_combo.get_active_iter();
          if (ok) {
            var model = this.timers_combo.get_model();
            // set disabled
            model.set_value(iter, Model.ENABLED, false);
            this.logger.debug('Disabling active entry '+model.get_value(iter, Model.NAME));
            //this.iter = null;
            this.allow_updates=false;
            ok = model.remove(iter);
            if (ok) {
              // iter points to the next entry in the model
              this.timers_combo.set_active_iter(iter);
            } else {
              [ok, iter] = model.get_iter_first();
              if (ok) {
                //var name = model.get_value(iter,Model.NAME);
                this.logger.debug('Set combo to first item '+model.get_value(iter, Model.NAME));
                //this.timers_combo_entry.set_text(name);
                this.timers_combo.set_active(0);
                //this._iter = iter;
              }
            }
            this.allow_updates=true;

            if (this._update_timers_tab_from_model(this.timers_combo)) {
              this._save_liststore();
            }
          }
        });

        this.timers_add.connect('clicked', () => {
          this.logger.debug('Add new timer');
          var iter = this.timers_liststore.append();

          //log(`Timer ${Object.keys(timer)}`);
          this.timers_liststore.set_value(iter, Model.NAME, _('New timer')); // name
          this.timers_liststore.set_value(iter, Model.ID, Utils.uuid());   // id
          this.timers_liststore.set_value(iter, Model.DURATION, 0);           // duration
          this.timers_liststore.set_value(iter, Model.ENABLED, true);        // enabled

          var index = this.timers_liststore.iter_n_children(null);

          //iter = this.timers_liststore.iter_nth_child(null, index-1);
          var model = this.timers_combo.get_model();
          var [ ok, iter ] = model.iter_nth_child(null, index-1);
          if (ok) {
            this.logger.debug(`liststore rows=${index} ${ok} ${iter}`);
            //this._iter = iter;
            this.timers_combo.set_active_iter(iter);
            //this._update_timers_tab_from_model(this.timers_combo);
            if (this._update_active_liststore_from_tab()) {
              this._save_liststore();
            }
          }
        });

        this._bind();

        return this._widget;
    }

    _update_combo_model_entry(combo, iter, entry) {
      var model = combo.get_model();
      var name = model.get_value(iter, Model.NAME);
      if (name !== entry) {
        this.logger.debug(`Update model entry from ${name} to ${entry}`);
        model.set_value(iter, Model.NAME, entry);
        this._save_liststore();
      }
    }

    // return true if the liststore was updated
    _update_active_liststore_from_tab() {
      if (!this.allow_updates) {
        return false;
      }
      var [ ok, iter ] = this.timers_combo.get_active_iter();
      if (ok) {
          this.allow_updates = false;
          var model = this.timers_combo.get_model();

          var hms = new Utils.HMS();
          hms.hours = this.spin_hours.get_value_as_int();
          hms.minutes = this.spin_mins.get_value_as_int();
          hms.seconds = this.spin_secs.get_value_as_int();

          var name = this.timers_combo_entry.get_text();
          var id = model.get_value(iter, Model.ID);
          id = Utils.uuid(id);
          var enabled = this.timer_enabled.get_active();
          var duration = hms.toSeconds();

          ok = false;
          if (model.get_value(iter, Model.NAME) !== name) {
            this.logger.debug(`name change to ${name}`);
            ok = true;
            model.set_value(iter, Model.NAME, name);
          }
          if (model.get_value(iter, Model.ID) !== id) {
            this.logger.debug(`id changed to ${id}`);
            ok = true;
            model.set_value(iter, Model.ID, id);
          }
          var curdur=model.get_value(iter, Model.DURATION);
          if (curdur != duration) {
            this.logger.debug(`${name} duration changed from ${curdur} to ${duration}`);
            this.logger.debug(hms.pretty());
            ok = true;
            model.set_value(iter, Model.DURATION, duration);
          }
          if (model.get_value(iter, Model.ENABLED) !== enabled) {
            this.logger.debug(`enabled changed to ${enabled}`);
            ok = true;
            model.set_value(iter, Model.ENABLED, enabled);
          }
          if (ok) {
            this.logger.debug(`Updating liststore for ${name} entry`);
          }
          this.allow_updates = true;
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
        timer.name = model.get_value(iter, Model.NAME);
        timer.id = model.get_value(iter, Model.ID);
        timer.duration = model.get_value(iter, Model.DURATION);
        timer.enabled = model.get_value(iter, Model.ENABLED);

        if (timer.duration <= 0) {
          timer.duration = 1;
          model.set_value(iter, Model.DURATION, 1);
          this._update_timers_tab_from_model(this.timers_combo);
        }

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
      var [ ok, iter ] = this.timers_combo.get_active_iter();
      if (ok) {
          this.timers_liststore.set_value(iter, Model.NAME, timer.name);
          this.timers_liststore.set_value(iter, Model.ID, timer.id);
          this.timers_liststore.set_value(iter, Model.DURATION, timer.duration);
          this.timers_liststore.set_value(iter, Model.ENABLED, timer.enabled);
      } else {
        this.logger.debug('cannot update liststore entry, combo has no active iter');
      }
    }

    _get_active_liststore_entry() {
      var model = this.timers_combo.get_model();
      var [ ok, iter ] = this.timers_combo.get_active_iter();
      var timer = {}
      if (ok) {
        timer.name = model.get_value(iter, Model.NAME);
        timer.id = model.get_value(iter, Model.ID);
        timer.duration = model.get_value(iter, Model.DURATION);
        timer.enabled = model.get_value(iter, Model.ENABLED);
      } else {
        this.logger.debug('cannot get active liststore entry, combo has no active iter');
      }
      return timer;
    }

    _update_timers_tab_from_model(timers_combo, entry=undefined) {
      if (!this.allow_updates) {
        return false;
      }
      // TODO fix this duplication
      var model = timers_combo.get_model();
      var [ ok, iter ] = timers_combo.get_active_iter();
      if (iter) {
        this.allow_updates = false;
        var name = model.get_value(iter, Model.NAME);
        if (entry !== undefined && entry !== name) {
          name = entry;
          model.set_value(iter, Model.NAME, name);
          this._save_liststore(true);
        }
        var id = model.get_value(iter, Model.ID);
        var duration = model.get_value(iter, Model.DURATION);
        var enabled = model.get_value(iter, Model.ENABLED);
        var hms = new Utils.HMS(duration);
        this._update_spinners(hms);
        this.allow_updates = true;
        return true;
      } else {
        this.logger.debug("cannot update combo from liststore, combo has non active iter");
      }
      return false;
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

      let show_progress = this._bo('show_progress');
      this._ssb('show-progress', show_progress, 'active');

      let show_label = this._bo('show_label');
      this._ssb('show-label', show_label, 'active');

      let play_sound = this._bo('play_sound');
      this._ssb('play-sound', play_sound, 'active');

      let sound_loops = this._bo('sound_loops');
      this._ssb('sound-loops', sound_loops, 'value');

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
