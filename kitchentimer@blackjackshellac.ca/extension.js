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

/* exported init */

const GETTEXT_DOMAIN = 'kitchen-timer-blackjackshellac';

const { GObject, St } = imports.gi;

const Gettext = imports.gettext.domain(GETTEXT_DOMAIN);
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const Settings = Me.imports.settings.Settings;
const Menus = Me.imports.menus;
const Timers = Me.imports.timers.Timers;
const Timer = Me.imports.timers.Timer;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const KitchenTimerIndicator = GObject.registerClass(
class KitchenTimerIndicator extends PanelMenu.Button {
    _init() {
        this._settings = new Settings();
        this._timers = new Timers(this._settings);
        this._logger = new Utils.Logger(this._settings);
        this._logger.info('Initializing extension');

        super._init(0.0, _('Kitchen Timer'));

        //let box = new St.BoxLayout({ style_class: 'panel-status-menu-box' });
        this.box = new St.BoxLayout({ name: 'panelStatusMenu' });
        this.box.add_child(new St.Icon({
            icon_name: 'kitchen-timer-blackjackshellac-symbolic',
            style_class: 'system-status-icon',
        }));
        this.box.add_child(PopupMenu.arrowIcon(St.Side.BOTTOM));

        this.box.add(this._timers._pie);
        this.box.add(this._timers.panel_label);

        this.add_child(this.box);

        // var test_timer = new Timer("test 5 seconds", 5);
        // var id = test_timer.id
        // test_timer.start();

        // this._timers.add(test_timer);
        // test_timer = this._timers.timer_by_id(id);
        // if (test_timer.start()) {
        //   log(`Timer ${test_timer.name} running`);
        // }

        this._pmbuilder = new Menus.PanelMenuBuilder(this.menu, this._settings, this._timers);
        this._pmbuilder.build();
    }
});

class Extension {
    constructor(uuid) {
      this._uuid = uuid;

      ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        this._indicator = new KitchenTimerIndicator();
        Main.panel.addToStatusArea(this._uuid, this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}

function init(meta) {
  return new Extension(meta.uuid);
}
