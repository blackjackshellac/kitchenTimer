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

const { Clutter, GObject, St } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Timer = Me.imports.timers.Timer;
const Utils = Me.imports.utils;
const Logger = Me.imports.logger.Logger;

var KitchenTimerDeleteButton = GObject.registerClass(
class KitchenTimerDeleteButton extends St.Button {
    _init(timer) {
        super._init();

        var icon = new St.Icon({
            icon_name: 'edit-delete-symbolic',
            style_class: 'kitchentimer-menu-delete-icon'
        });
        icon.set_icon_size(20);

        this.child = icon;

        this._timer = timer;

        this.connect('clicked', this._onClick.bind(this));
    }

    get icon() {
      return this.child;
    }

    _onClick() {
        log('Clicked delete button for '+this._timer.name)
        //this._timer.delete();
        return Clutter.EVENT_STOP;
    }
});

var KitchenTimerStopButton = GObject.registerClass(
class KitchenTimerStopButton extends St.Button {
    _init(timer) {
        super._init();

        var icon = new St.Icon({
            icon_name: 'process-stop-symbolic',
            style_class: 'kitchentimer-menu-delete-icon'
        });
        icon.set_icon_size(20);

        this.child = icon;

        this._timer = timer;

        this.connect('clicked', this._onClick.bind(this));
    }

    get icon() {
      return this.child;
    }

    _onClick() {
        log('Clicked stop button for '+this._timer.name)
        //this._timer.delete();
        return Clutter.EVENT_STOP;
    }
});

// var KitchenTimerDeleteBin = GObject.registerClass(
// class KitchenTimerDeleteBin extends St.Bin {
//     _init(timer) {
//         super._init({ x_expand: false, x_align: St.Align.END });
//         this._deleteButton = new KitchenTimerDeleteButton(timer);
//         this.child = this._deleteButton;
//     }

//     get button() {
//       return this._deleteButton;
//     }
// });

