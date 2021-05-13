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

const { Gio, Gtk, Gdk, GLib } = imports.gi;
const ByteArray = imports.byteArray;

const GETTEXT_DOMAIN = 'kitchen-timer-blackjackshellac';
const Gettext = imports.gettext.domain(GETTEXT_DOMAIN);
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Settings = Me.imports.settings.Settings;
const Utils = Me.imports.utils;
const Logger = Me.imports.logger.Logger;
const HMS = Me.imports.hms.HMS;
const AlarmTimer = Me.imports.alarm_timer.AlarmTimer;

const Model = {
  NAME: 0,
  ID: 1,
  DURATION: 2,
  ENABLED: 3,
  QUICK: 4,
  HMS: 5,
  TRASH: 6
}

class PreferencesBuilder {
  constructor() {
    this._settings = new Settings();
    this._builder = new Gtk.Builder();
    this.logger = new Logger('kt prefs', this._settings);

    if (Utils.isGnome40()) {
      let iconPath = Me.dir.get_child("icons").get_path();
      let iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
      iconTheme.add_search_path(iconPath);
    }
  }

  show() {
    if (Utils.isGnome3x()) {
      this._widget.show_all();
    } else {
      let window = this._widget.get_root();
      if (window) {
        // why is this null?
        window.default_width = 700;
        window.default_height = 900;
      }
      // window.resize(700, 900);
    }
    this._bo('timer_box').hide();
    this.tv_timers.hide();
  }

  build() {
    this._viewport = new Gtk.Viewport();
    this._widget = new Gtk.ScrolledWindow();

    if (Utils.isGnome3x()) {
      this._builder.add_from_file( GLib.build_filenamev( [Me.path, 'settings.ui']) );
      this._kitchenTimer_settings = this._builder.get_object('kitchenTimer_settings');
      this._viewport.add(this._kitchenTimer_settings);
      this._widget.add(this._viewport);
    } else {
      this._builder.add_from_file( GLib.build_filenamev( [Me.path, 'settings40.ui']) );
      this._kitchenTimer_settings = this._builder.get_object('kitchenTimer_settings');
      this._viewport.set_child(this._kitchenTimer_settings);
      this._widget.set_child(this._viewport);
    }

    this._bo('version').set_text("Version "+Me.metadata.version);
    this._bo('description').set_text(Me.metadata.description.split(/\n/)[0]);

    // Timers

    this.timers_liststore = this._bo('timers_liststore');
    this.timers_combo = this._bo('timers_combo');

    //let entry_name = this._bo('entry_name');
    this.spin_hours = this._bo('spin_hours');
    this.spin_mins = this._bo('spin_mins');
    this.spin_secs = this._bo('spin_secs');

    this.quick_radio = this._bo('quick_radio');
    this.timers_add = this._bo('timers_add');
    this.timers_remove = this._bo('timers_remove');
    this.timer_enabled = this._bo('timer_enabled');

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

    this.quick_radio.connect('toggled', (quick_radio) => {
      this._populate_liststore();
    });

    this.timers_remove.connect('clicked', () => {
      var [ ok, iter ] = this.timers_combo.get_active_iter();
      if (ok) {
        var model = this.timers_combo.get_model();
        // set disabled
        model.set_value(iter, Model.ENABLED, false);
        var id=model.get_value(iter, Model.ID);
        this.logger.debug('Disabling active entry %s:%s', model.get_value(iter, Model.NAME), id);
        this.allow_updates=false;
        ok = model.remove(iter);
        if (ok) {
          // iter points to the next entry in the model
          this.timers_combo.set_active_iter(iter);
          this._iter = iter;
        } else {
          [ok, iter] = model.get_iter_first();
          if (ok) {
            //var name = model.get_value(iter,Model.NAME);
            this.logger.debug('Set combo to first item '+model.get_value(iter, Model.NAME));
            this.timers_combo.set_active(0);
            this._iter = iter;
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

      this.timers_liststore.set_value(iter, Model.NAME, _('New timer')); // name
      this.timers_liststore.set_value(iter, Model.ID, Utils.uuid());   // id
      this.timers_liststore.set_value(iter, Model.DURATION, 0);           // duration
      this.timers_liststore.set_value(iter, Model.ENABLED, true);        // enabled
      this.timers_liststore.set_value(iter, Model.QUICK, false);

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

    if (Utils.isGnome3x()) {

      this.timers_combo_entry = this._bo('timers_combo_entry');

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

    } else {

      this.timers_combo_entry = this.timers_combo.get_child(); // this._bo('timers_combo_entry');

      this.timers_combo.connect('changed', (combo) => {
        let model = combo.get_model();
        let entry = combo.get_child().get_text();

        var [ ok, iter ] = combo.get_active_iter();
        if (ok) {
          this._iter = iter;

          var name = model.get_value(iter, Model.NAME);
          this.logger.debug('combo changed active: %s %s', name, entry);
          this._update_timers_tab_from_model(combo, entry);
        } else if (this._iter) {
          // editing entry when get_active_iter is not 'ok'?
          this.logger.debug('combo changed entry: %s %s',  entry, this._iter);
          this._update_combo_model_entry(combo, this._iter, entry);
        } else {
          this.logger.debug("combo changed: active iter unknown");
        }
      });

      // use to capture Enter
      this.timers_combo_entry.connect('activate', (combo_entry) => {
        var [ ok, iter ] = this.timers_combo.get_active_iter();
        this.logger.debug(`Got activate ${ok}`);
      });
    }

    this.allow_updates = true;
    this._populate_liststore();

    this.tv_timers = this._bo('tv_timers');
    // this.tvs_timers = this._bo('tvs_timers');

    // this.tvs_timers.connect('changed', (select) => {
    //   let [ ok, model, iter ] = select.get_selected();
    //   if (ok) {
    //     this.logger.debug("tree view select changed");
    //     this.timers_combo.set_active_iter(iter);
    //   }
    // });

    // this.tvcr_enabled = this._bo('tvcr_enabled');
    // this.tvcr_enabled.set_activatable(true);
    // this.tvcr_enabled.connect('toggled', (toggle, path) => {
    //   var active = toggle.get_active();
    //   this.logger.debug("toggled=%s path=%s", active, path);
      //toggle.set_active(!toggle.get_active());
    //   var model = this.tv_timers.get_model();
    //   var [ ok, iter ] = model.get_iter_from_string(path);
    //   if (ok) {
    //     model.set_value(iter, Model.ENABLED, !active);
    //     this._save_liststore();
    //     this._update_timers_tab_from_model(this.timers_combo);
    //   }

    // });

    // this.tvcr_trash = this._bo('tvcr_trash');
    // this.tvcr_trash.connect('toggled', (toggle, path) => {

    // });

    // this.tvcr_name = this._bo('tvcr_name');
    // this.tvcr_name.editable = true;
    // this.tvcr_name.connect('edited', (text, path, new_text) => {
    //   this.logger.debug("path=%s new_text=%s", path, new_text);
    //   var model = this.tv_timers.get_model();
    //   var [ ok, iter ] = model.get_iter_from_string(path);
    //   if (ok) {
    //     model.set_value(iter, Model.NAME, new_text);
    //     var alarm_timer = AlarmTimer.matchRegex(new_text);
    //     if (alarm_timer) {
    //       var hms = alarm_timer.hms();
    //       model.set_value(iter, Model.DURATION, hms.toSeconds());
    //       model.set_value(iter, Model.HMS, hms.toString());
    //     }
    //     this._save_liststore();
    //     this._update_timers_tab_from_model(this.timers_combo);
    //   }
    // });

    // this.tvcr_hms = this._bo('tvcr_hms');
    // this.tvcr_hms.editable = true;
    // this.tvcr_hms.connect('edited', (text, path, new_text) => {
    //   this.logger.debug("path=%s new_text=%s", path, new_text);
    //   var model = this.tv_timers.get_model();
    //   var [ ok, iter ] = model.get_iter_from_string(path);
    //   if (ok) {
    //     var duration = model.get_value(iter, Model.DURATION);
    //     var hms_text = model.get_value(iter, Model.HMS);
    //     this.logger.debug("duration=%d hms=%s new=%s", duration, hms_text, new_text);
    //     var hms = HMS.fromString(new_text);
    //     if (hms) {
    //       model.set_value(iter, Model.DURATION, hms.toSeconds());
    //       model.set_value(iter, Model.HMS, hms.toString());
    //       this._save_liststore();
    //       this._update_timers_tab_from_model(this.timers_combo);
    //     }

    //   }
    // });

    // this.tvcr_duration = this._bo('tvcr_duration');
    // this.tvcr_duration.editable = true;
    // this.tvcr_duration.connect('edited', (text, path, new_text) => {
    //   this.logger.debug("path=%s new_text=%s", path, new_text);
    //   var model = this.tv_timers.get_model();
    //   var [ ok, iter ] = model.get_iter_from_string(path);
    //   if (ok) {
    //     var duration = model.get_value(iter, Model.DURATION);
    //     var hms_text = model.get_value(iter, Model.HMS);
    //     this.logger.debug("duration=%d hms=%s new=%s", duration, hms_text, new_text);
    //     var hms = new HMS(new_text);
    //     if (hms) {
    //       model.set_value(iter, Model.DURATION, hms.toSeconds());
    //       model.set_value(iter, Model.HMS, hms.toString());
    //       this._save_liststore();
    //       this._update_timers_tab_from_model(this.timers_combo);
    //     }

    //   }
    // });

    // Options
    if (Utils.isGnome3x()) {
      this._json_file_chooser_button = this._bo('json_file_chooser_button');
      this._json_file_chooser_button.connect('clicked', (button) => {
        if (this._bo('export_settings_radio').get_active()) {
          this.export_settings();
        } else {
          this.import_settings();
        }
      });
    } else {
      this._bo('export_settings').connect('clicked', (button) => {
        this.export_settings();
      });

      this._bo('import_settings').connect('clicked', (button) => {
        this.import_settings();
      });
    }

    this.inhibit = this._bo('inhibit');
    this.inhibit.connect('toggled', (check) => {
      let val=0;
      if (check.get_active()) {
        val = 12;
      }
      this._settings.inhibit = val;
    });
    this.inhibit.set_active(this._settings.inhibit > 0);

    // Sound
    if (Utils.isGnome3x()) {
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
    } else {
      this._bo('sound_path').connect('clicked', (btn) => {
        this.sound_file_chooser();
      });

      this._bo('label_sound_file').set_label(GLib.basename(this._settings.sound_file));
    }

    // About box
    this._about_clicks = 0;
    if (Utils.isGnome3x()) {

      this.timer_icon = this._bo('timer_icon');

      this.timer_icon.connect('button-press-event', () => {
        this._about_clicks = this._spawn_dconf_config(this._about_clicks);
      });
    } else {
      this.timer_icon_button = this._bo('timer_icon_button');

      this.timer_icon_button.connect('clicked', (btn) => {
        this._about_clicks = this._spawn_dconf_config(this._about_clicks);
      });

      let bmac = Gtk.Picture.new_for_filename(Me.dir.get_path()+'/icons/bmc_logo_wordmark.svg');
      this._bo('link_bmac').set_child(bmac);
    }

    // bind all checkboxes to settings
    this._bind();

    return this._widget;
  }

  _spawn_dconf_config(clicks) {
    if (clicks === 2) {
      var cmd = Me.path+"/bin/dconf-editor.sh";
      this.logger.debug("spawn %s", cmd);
      Utils.spawn(cmd, undefined);
      clicks = 0;
    } else {
      clicks++;
    }
    return clicks;
  }

  _populate_liststore() {
    var quick = this.quick_radio.get_active();

    var timer_settings = quick ? this._settings.unpack_quick_timers() : this._settings.unpack_preset_timers();
    timer_settings.sort( (a,b) => {
      return (a.duration-b.duration);
    });

    this._iter = undefined;
    this.timers_liststore.clear();
    timer_settings.forEach( (timer) => {
      var iter = this.timers_liststore.append();
      this.timers_liststore.set_value(iter, Model.NAME, timer.name);
      this.timers_liststore.set_value(iter, Model.ID, timer.id);
      this.timers_liststore.set_value(iter, Model.DURATION, timer.duration);
      this.timers_liststore.set_value(iter, Model.ENABLED, timer.enabled);
      this.timers_liststore.set_value(iter, Model.QUICK, timer.quick);
      this.timers_liststore.set_value(iter, Model.HMS, new HMS(timer.duration).toString());
      this.timers_liststore.set_value(iter, Model.TRASH, false);
    });

    this.timers_combo.set_active(0);
    let [ ok, iter ] = this.timers_combo.get_active_iter();
    if (ok) {
      this.logger.debug("Populate active iter %s", iter);
      this._iter = iter;
    }
    this._update_timers_tab_from_model(this.timers_combo);
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
      timer.quick = model.get_value(iter, Model.QUICK);

      if (timer.duration <= 0) {
        this.logger.warn(`Refusing to save zero length timer ${timer.name} ${timer.duration}`);
      } else {
        this.logger.debug(`Updating ${timer.name} ${timer.duration} ${timer.enabled}`);
        timers.push(timer);
      }

      ok = model.iter_next(iter);
    }
    if (pack) {
      var quick = this.quick_radio.get_active();
      this.logger.debug('Saving updated %s timers to settings', quick ? "quick" : "preset");
      if (quick) {
        this._settings.pack_quick_timers(timers);
      } else {
        this._settings.pack_preset_timers(timers);
      }
    }

  }

  // gnome40
  sound_file_chooser() {
    // import/export settings
    var file_dialog = new Gtk.FileChooserDialog( {
      action: Gtk.FileChooserAction.OPEN,
      //local_only: false,
      create_folders: true
    });

    if (file_dialog.current_folder == undefined) {
       file_dialog.current_folder = Me.path;
    }

    let sound_file = this._settings.sound_file;
    if (GLib.basename(sound_file) == sound_file) {
      sound_file = GLib.build_filenamev([ Me.path, sound_file ]);
    }
    this.logger.debug("sound_file="+sound_file);

    file_dialog.set_filter(this._bo('audio_files_filter'));
    file_dialog.set_current_folder(Gio.File.new_for_path(Me.path));
    file_dialog.set_current_name(sound_file);
    file_dialog.title = _("Sound file");
    //file_dialog.set_do_overwrite_confirmation(true);
    file_dialog.add_button('Cancel', Gtk.ResponseType.CANCEL);
    file_dialog.add_button('Open', Gtk.ResponseType.OK);
    this.logger.debug("action=%s", ""+file_dialog.get_action());

    file_dialog.connect('response', (dialog, response_id) => {
      if (response_id === Gtk.ResponseType.OK) {
        // outputs "-5"
        this.logger.debug("response_id=%d", response_id);

        var sound_file = dialog.get_file().get_path();

        this.logger.debug("Selected sound file %s", sound_file);

        this._settings.sound_file = sound_file;
        this._bo('label_sound_file').set_label(GLib.basename(sound_file));
      }

      // destroy the dialog regardless of the response when we're done.
      dialog.destroy();
    });

    file_dialog.show();
  }

  // https://stackoverflow.com/questions/54487052/how-do-i-add-a-save-button-to-the-gtk-filechooser-dialog
  export_settings() {
    // import/export settings
    var file_dialog = new Gtk.FileChooserDialog( {
      title: _("Export"),
      action: Gtk.FileChooserAction.SAVE,
      create_folders: true
    });

    if (file_dialog.current_folder == undefined) {
       file_dialog.current_folder = Me.path;
    }

    let settings_json = 'kitchen_timer_settings.json';

    this.logger.debug("json file=%s", settings_json);
    file_dialog.set_filter(this._bo('json_files_filter'));
    file_dialog.set_current_name(settings_json);
    file_dialog.title = _("Export");
    file_dialog.add_button('Cancel', Gtk.ResponseType.CANCEL);
    file_dialog.add_button('Export', Gtk.ResponseType.OK);
    this.logger.debug("action=%s", ""+file_dialog.get_action());

    if (Utils.isGnome3x()) {
      file_dialog.set_current_folder(Me.path);
      file_dialog.set_do_overwrite_confirmation(true);
      file_dialog.set_local_only(true);
    } else {
      file_dialog.set_current_folder(Gio.File.new_for_path(Me.path));
    }

    file_dialog.connect('response', (dialog, response_id) => {
      if (response_id === Gtk.ResponseType.OK) {
       // outputs "-5"
        this.logger.debug("response_id=%d", response_id);

        var file = dialog.get_file();

        this.logger.debug(file.get_path());

        var json = this._settings.export_json();
        //this.logger.debug("json=%s", json);

        file.replace_contents_bytes_async(
          new GLib.Bytes(json),
          null,
          false,
          Gio.FileCreateFlags.REPLACE_DESTINATION,
          null,
          // "shadowing" variable with the same name is another way
          // to prevent cyclic references in callbacks.
          (file, res) => {
            try {
              file.replace_contents_finish(res);
              this._bo('import_export_msg').set_text(_("Exported settings to %s".format(file.get_path())));
            } catch (e) {
              this.logger.debug("Failed to export settings to %s: %s", file.get_path(), e);
            }
          }
        );
      } else {
        this.logger.debug("response_id not handled: %d", response_id);
      }

      // destroy the dialog regardless of the response when we're done.
      dialog.destroy();
    });

    file_dialog.show();
  }

  import_settings() {
    // import/export settings
    var file_dialog = new Gtk.FileChooserDialog( {
      action: Gtk.FileChooserAction.OPEN,
      create_folders: true
    });

    if (file_dialog.current_folder == undefined) {
       file_dialog.current_folder = Me.path;
    }

    let settings_json = 'kitchen_timer_settings.json' ;

    this.logger.debug("json file=%s", settings_json);
    file_dialog.set_filter(this._bo('json_files_filter'));
    file_dialog.set_current_name(settings_json);
    file_dialog.title = _("Import");
    file_dialog.add_button('Cancel', Gtk.ResponseType.CANCEL);
    file_dialog.add_button('Import', Gtk.ResponseType.OK);
    this.logger.debug("action=%s", ""+file_dialog.get_action());

    if (Utils.isGnome3x()) {
      file_dialog.set_current_folder(Me.path);
      file_dialog.set_local_only(true);
    } else {
      file_dialog.set_current_folder(Gio.File.new_for_path(Me.path));
    }

    file_dialog.connect('response', (dialog, response_id) => {
      if (response_id === Gtk.ResponseType.OK) {
        // outputs "-5"
        this.logger.debug("response_id=%d", response_id);

        var file = dialog.get_file();

        this.logger.debug(file.get_path());

        file.read_async(GLib.PRIORITY_DEFAULT, null, (file, res) => {
          try {
            var stream = file.read_finish(res);
            var size = file.query_info("standard::size", Gio.FileQueryInfoFlags.NONE, null).get_size();
            var data = stream.read_bytes(size, null).get_data();
            var json = ByteArray.toString(data);
            //this.logger.debug("json=%s", json);
            this._settings.import_json(json);
            this._bo('import_export_msg').set_text(_("Imported settings from %s".format(file.get_path())));
          } catch(e) {
            logError(e, "Failed to read kitchen timer settings import file");
          }
        });
      }

      // destroy the dialog regardless of the response when we're done.
      dialog.destroy();
    });

    file_dialog.show();
  }

  _update_combo_model_entry(combo, iter, entry) {
    if (!this.allow_updates) {
      this.logger.debug('Updates not allowed entry=%s', entry);
      return;
    }
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
      this.logger.debug('Updates not allowed');
      return false;
    }
    var [ ok, iter ] = this.timers_combo.get_active_iter();
    if (!ok && this._iter) {
      iter = this._iter;
      ok = true;
    }
    if (ok) {
      this.allow_updates = false;
      var model = this.timers_combo.get_model();

      var hms = new HMS();
      hms.hours = this.spin_hours.get_value_as_int();
      hms.minutes = this.spin_mins.get_value_as_int();
      hms.seconds = this.spin_secs.get_value_as_int();

      var name = this.timers_combo_entry.get_text();
      var id = model.get_value(iter, Model.ID);
      id = Utils.uuid(id);
      var enabled = this.timer_enabled.get_active();
      var quick = this.quick_radio.get_active();
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
      if (curdur !== duration) {
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
      if (model.get_value(iter, Model.QUICK) !== quick) {
        this.logger.debug(`quick changed to ${quick}`);
        ok = true;
        model.set_value(iter, Model.QUICK, quick);
      }
      if (model.get_value(iter, Model.HMS) !== hms.toString()) {
        this.logger.debug("HMS changed to %s", hms.toString());
        ok = true;
        model.set_value(iter, Model.HMS, hms.toString());
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


  _update_active_listore_entry(timer) {
    var [ ok, iter ] = this.timers_combo.get_active_iter();
    if (ok) {
      this.timers_liststore.set_value(iter, Model.NAME, timer.name);
      this.timers_liststore.set_value(iter, Model.ID, timer.id);
      this.timers_liststore.set_value(iter, Model.DURATION, timer.duration);
      this.timers_liststore.set_value(iter, Model.ENABLED, timer.enabled);
      this.timers_liststore.set_value(iter, Model.QUICK, timer.quick);
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
      timer.quick = model.get_value(iter, Model.QUICK);
    } else {
      this.logger.debug('cannot get active liststore entry, combo has no active iter');
    }
    return timer;
  }

  _update_timers_tab_from_model(timers_combo, entry=undefined) {
    if (!this.allow_updates) {
      return false;
    }
    var model = timers_combo.get_model();
    var [ ok, iter ] = model.get_iter_first();
    if (!ok) {
      // model is empty
      return true;
    }
    [ ok, iter ] = timers_combo.get_active_iter();
    if (ok) {
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
      var hms = new HMS(duration);
      this._update_spinners(hms);
      this.timer_enabled.set_active(enabled);
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

  _bo_ssb(id, property, flags=Gio.SettingsBindFlags.DEFAULT) {
    let object = this._bo(id);
    let key=id.replace(/_/g, '-');
    this._ssb(key, object, property, flags);
  }

  _bind() {
    this._bo_ssb('accel_enable', 'active');

    this._bo_ssb('notification', 'active');
    this._bo_ssb('notification_sticky', 'active');

    let show_time = this._bo('show_time');
    this._ssb('show-time', show_time, 'active');

    let show_progress = this._bo('show_progress');
    this._ssb('show-progress', show_progress, 'active');

    let show_label = this._bo('show_label');
    this._ssb('show-label', show_label, 'active');

    let play_sound = this._bo('play_sound');
    this._ssb('play-sound', play_sound, 'active');
    this._ssb('play-sound', this._bo('play_sound2'), 'active');

    let sound_loops = this._bo('sound_loops');
    this._ssb('sound-loops', sound_loops, 'value');

    let sort_by_duration = this._bo('sort_by_duration');
    this._ssb('sort-by-duration', sort_by_duration, 'active');

    let sort_descending = this._bo('sort_descending');
    this._ssb('sort-descending', sort_descending, 'active');

    let save_quick_timers = this._bo('save_quick_timers')
    this._ssb('save-quick-timers', save_quick_timers, 'active');

    let detect_dupes = this._bo('detect_dupes');
    this._ssb('detect-dupes', detect_dupes, 'active');

    let volume_level_warn = this._bo('volume_level_warn');
    this._ssb('volume-level-warn', volume_level_warn, 'active');

    let volume_threshold = this._bo('volume_threshold');
    this._ssb('volume-threshold', volume_threshold, 'value');

  }
}

function init() {
}

function buildPrefsWidget() {
  ExtensionUtils.initTranslations(GETTEXT_DOMAIN);

  var preferencesBuilder = new PreferencesBuilder();
  var widget = preferencesBuilder.build();
  preferencesBuilder.show();

  widget.connect('realize', () => {
    let window = Utils.isGnome3x() ? widget.get_toplevel() : widget.get_root();
    preferencesBuilder.logger.debug('window=%s', window);
    //window.default_width = 700;
    //window.default_height = 900;
    //window.set_default_icon_name('view-paged-symbolic');
    //window.resize(700, 900);
  });

  return widget;
}
