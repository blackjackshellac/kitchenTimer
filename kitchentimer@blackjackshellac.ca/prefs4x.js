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

const { GObject, Gio, Gtk, GLib } = imports.gi;
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

const KitchenTimerPrefs = GObject.registerClass({
    GTypeName: 'KitchenTimerPrefs',
    Template: Me.dir.get_child('settings.ui').get_uri(),
}, class KitchenTimerPrefs extends Gtk.Box {

    _init(params = {}) {
        super._init(params);

        this.settings = new Settings();
        this.logger = new Logger('kt_prefs', this._settings);
    }

    _onButtonClicked(button) {
      let msg=this.logger.debug('Clicked at %s', new Date().toLocaleTimeString());
      button.set_label(msg);
    }

    get settings() {
      return this._settings;
    }

    set settings(val) {
      this._settings = val;
    }

    // /**
    //  * Get Gtk Builder object by id
    //  */
    // _bo(id) {
    //   return this._builder.get_object(id);
    // }

    // /**
    //  * Bind setting to builder object
    //  */
    // _ssb(key, object, property, flags=Gio.SettingsBindFlags.DEFAULT) {
    //   if (object) {
    //     this.settings.bind(key, object, property, flags);
    //   } else {
    //     this.logger.error("object is null for key=%s", key);
    //   }
    // }

    // _bo_ssb(id, property, flags=Gio.SettingsBindFlags.DEFAULT) {
    //   let object = this._bo(id);
    //   let key=id.replace(/_/g, '-');
    //   this._ssb(key, object, property, flags);
    // }

    // _bind() {
    //   this._bo_ssb('accel_enable', 'active');

    //   this._bo_ssb('notification', 'active');
    //   this._bo_ssb('notification_sticky', 'active');

    //   let show_time = this._bo('show_time');
    //   this._ssb('show-time', show_time, 'active');

    //   let show_progress = this._bo('show_progress');
    //   this._ssb('show-progress', show_progress, 'active');

    //   let show_label = this._bo('show_label');
    //   this._ssb('show-label', show_label, 'active');

    //   let play_sound = this._bo('play_sound');
    //   this._ssb('play-sound', play_sound, 'active');
    //   this._ssb('play-sound', this._bo('play_sound2'), 'active');

    //   let sound_loops = this._bo('sound_loops');
    //   this._ssb('sound-loops', sound_loops, 'value');

    //   let sort_by_duration = this._bo('sort_by_duration');
    //   this._ssb('sort-by-duration', sort_by_duration, 'active');

    //   let sort_descending = this._bo('sort_descending');
    //   this._ssb('sort-descending', sort_descending, 'active');

    //   let save_quick_timers = this._bo('save_quick_timers')
    //   this._ssb('save-quick-timers', save_quick_timers, 'active');

    //   let detect_dupes = this._bo('detect_dupes');
    //   this._ssb('detect-dupes', detect_dupes, 'active');

    //   let volume_level_warn = this._bo('volume_level_warn');
    //   this._ssb('volume-level-warn', volume_level_warn, 'active');

    //   let volume_threshold = this._bo('volume_threshold');
    //   this._ssb('volume-threshold', volume_threshold, 'value');

    // }
});

function init() {
  log(`Initialize translations for ${GETTEXT_DOMAIN}`);
  ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
}

function buildPrefsWidget() {
  var kitchenTimerPrefs = new KitchenTimerPrefs();
  return kitchenTimerPrefs;

  // var widget = kitchenTimerPrefs.build();
  // var window = widget.get_parent_window();
  // if (window) {
  //   window.set_default_icon_from_file(Me.path+'/icons/kitchen-timer-blackjackshellac-full.svg');
  // }

  // kitchenTimerPrefs.show();

  return widget;
}

