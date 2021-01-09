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

const { Clutter, GObject, St, Gio } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Timer = Me.imports.timers.Timer;
const Utils = Me.imports.utils;
const Logger = Me.imports.logger.Logger;

var KTTypes = {
  "stop": 'media-playback-stop-symbolic',
  "delete" : 'edit-delete-symbolic'
}
var KitchenTimerControlButton = GObject.registerClass(
class KitchenTimerControlButton extends St.Button {
    _init(timer, type) {
        super._init();

        // 'media-playback-stop-symbolic'
        // 'edit-delete-symbolic'
        var icon = new St.Icon({
            icon_name: KTTypes[type],
            style_class: 'kitchentimer-menu-delete-icon'
        });
        icon.set_icon_size(20);

        this.child = icon;

        this._timer = timer;
    }

    delete() {
      this._timer.delete();
    }

    get icon() {
      return this.child;
    }

    stop() {
      this._timer.stop();
    }
});

