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


const { GObject, St, Clutter } = imports.gi;

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
// const ExtensionUtils = imports.misc.extensionUtils;
// const Me = ExtensionUtils.getCurrentExtension();

const GETTEXT_DOMAIN = 'kitchen-timer-blackjackshellac';
const Gettext = imports.gettext.domain(GETTEXT_DOMAIN);
const _ = Gettext.gettext;

import * as Utils from "./utils.js";
import * as Settings from "./settings.js";
import * as Menus from "./menus.js";
import * as {Timers, Timer} from "./timers.js";
import * as Indicator from "./indicator.js";

// const Main = imports.ui.main;
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

class Extension {
    constructor(uuid) {
      this._uuid = uuid;

      ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        this._indicator = new Indicator.KitchenTimerIndicator();
        Main.panel.addToStatusArea(this._uuid, this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}

export default class initExtension extends Extension {
    enable() {
        return new Extension(this.uuid);
    }

    disable() {
        console.log(_('%s is now disabled.').format(this.uuid));
    }
}
