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

const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

class PanelMenuBuilder {
  constructor(menu, settings, timers) {
    log("");
    this._menu = menu;
    this._settings = settings;
    this._timers = timers;
  }

  build() {

    this._addItem(_('Test Timer')).connect('activate', () => {
      this._timers[0].start();
    });

    this._addSwitch(_("Run Timer")).connect("toggled", () => {
      // this._stopTimer = !(this._stopTimer);
      // this.remove_actor(this._logo);
      // this.add_actor(this._box);
      this._refresh_timer();
    });

    this._timers_menu = this._addSubMenu(_("Timers"), this._menu);
    //this._timers.forEach(timer => {
    this._timer = this._timers[0];
    var timer_item = this._addItem(this._timer.name);
    timer_item._timer = this._timers[0];
    timer_item.connect('activate', (ti) => {
      ti._timer.start();
    });
    //   this._addItem(timer.name, this._timers_menu).connect("activate", (timer) => {
    //     timer.start();
    //   })
    //});

    this._addItem(_('Show Notification')).connect('activate', () => {
      Main.notify(_('Notification test'))
    });

    this._addItem(_('Reset timer …')).connect('activate', () => {
      this._reset_timer();
    });
  }

  _addSubMenu(text, parent) {
    let popup = new PopupMenu.PopupSubMenuMenuItem(text);
    parent.addMenuItem(popup);
    return popup;
  }

  _addItem(text, menu=undefined) {
    if (menu === undefined) {
      menu = this._menu;
    }
    log("adding text="+text);
    let item = new PopupMenu.PopupMenuItem(text)
    menu.addMenuItem(item);
    return item;
  }

  _addSwitch(text, on=false, menu=undefined) {
    if (menu === undefined) {
      menu = this._menu;
    }
    let item = new PopupMenu.PopupSwitchMenuItem(text, on);
    menu.addMenuItem(item);
    return item;
  }

  _reset_timer() {
    log("_reset_timer");
  }

  _run_timer() {
    log("_run_timer");
  }

}
