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

        this._settings = new Settings();
        this.logger = new Logger('kt_prefs', this._settings);
    }
    
    _onButtonClicked(button) {
        button.set_label('Clicked!');
    }
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


